import { QueueEntry, IQueueEntry } from '../models/QueueEntry.js';
import { Appointment } from '../models/Appointment.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { Department } from '../models/Department.js';
import { Hospital } from '../models/Hospital.js';
import { User } from '../models/User.js';
import { AppError } from '../middlewares/errorHandler.js';
import { socketService } from './socket.service.js';
import { NotificationService } from './notification.service.js';
import { emailService } from './email.service.js';
import { AuditService } from './audit.service.js';
import { PriorityLevel, QueueStatus, SocketDisplayPayload } from '@smartqueue/shared';

// Helper for priority sorting rank
const PRIORITY_RANK: Record<PriorityLevel, number> = {
  emergency: 1,
  senior_disabled: 2,
  normal: 3,
};

export class QueueService {
  /**
   * Generates a daily sequential token number with department code: e.g. "CAR-014"
   */
  private static async generateTokenNumber(
    hospitalId: string,
    departmentId: string,
    dateStr: string
  ): Promise<{ tokenNumber: string; sequenceNumber: number }> {
    const department = await Department.findById(departmentId);
    const code = department?.code || 'GEN';

    // Count existing tokens for this department on this date
    const count = await QueueEntry.countDocuments({
      hospitalId,
      departmentId,
      date: dateStr,
    });

    const sequenceNumber = count + 1;
    const tokenNumber = `${code}-${String(sequenceNumber).padStart(3, '0')}`;
    return { tokenNumber, sequenceNumber };
  }

  /**
   * Check in a patient for an appointment (receptionist or self-service QR)
   */
  static async checkIn(params: {
    appointmentId: string;
    priority?: PriorityLevel;
    actorId?: string;
    ipAddress?: string;
  }): Promise<IQueueEntry> {
    const appointment = await Appointment.findById(params.appointmentId)
      .populate('hospitalId')
      .populate('departmentId')
      .populate({ path: 'doctorId', populate: { path: 'userId' } })
      .populate('patientId');

    if (!appointment) {
      throw new AppError('Appointment not found', 404);
    }

    if (appointment.status === 'cancelled') {
      throw new AppError('Cannot check in a cancelled appointment', 400);
    }

    // Check if already checked in
    const existingEntry = await QueueEntry.findOne({ appointmentId: appointment._id });
    if (existingEntry) {
      return existingEntry;
    }

    const priority: PriorityLevel = params.priority || 'normal';
    const doctor = appointment.doctorId as any;
    const { tokenNumber, sequenceNumber } = await this.generateTokenNumber(
      appointment.hospitalId._id.toString(),
      appointment.departmentId._id.toString(),
      appointment.date
    );

    // Calculate initial estimated wait time
    const waitingAhead = await QueueEntry.countDocuments({
      doctorId: appointment.doctorId._id,
      date: appointment.date,
      status: { $in: ['waiting', 'called'] },
    });
    const avgMins = doctor.avgConsultationMinutes || 15;
    const estimatedWaitMinutes = waitingAhead * avgMins;

    const queueEntry = await QueueEntry.create({
      hospitalId: appointment.hospitalId._id,
      departmentId: appointment.departmentId._id,
      doctorId: appointment.doctorId._id,
      appointmentId: appointment._id,
      patientId: appointment.patientId._id,
      tokenNumber,
      date: appointment.date,
      sequenceNumber,
      priority,
      status: 'waiting',
      checkInTime: new Date(),
      estimatedWaitMinutes,
      roomNumber: doctor.roomNumber || 'Room 1',
      queueHistory: [
        {
          action: 'CHECKED_IN',
          timestamp: new Date(),
          actorId: params.actorId as any,
          note: `Checked in with priority: ${priority}`,
        },
      ],
    });

    // Update appointment status to checked_in
    appointment.status = 'checked_in';
    await appointment.save();

    // Notify patient
    const patient = appointment.patientId as any;
    await NotificationService.create({
      userId: patient._id,
      title: 'Checked In - Token Assigned',
      message: `You are checked in! Your token number is #${tokenNumber}. Estimated wait time: ~${estimatedWaitMinutes} mins.`,
      type: 'queue',
      data: { queueEntryId: queueEntry._id, tokenNumber },
    });

    // Real-time broadcast
    await this.broadcastQueueAndDisplay(doctor._id.toString(), appointment.hospitalId._id.toString(), appointment.date);

    // Audit log
    await AuditService.log({
      actorId: params.actorId || patient._id,
      action: 'PATIENT_CHECKED_IN',
      entity: 'QueueEntry',
      entityId: queueEntry._id.toString(),
      details: { tokenNumber, priority, doctorId: doctor._id },
      ipAddress: params.ipAddress,
    });

    return queueEntry;
  }

  /**
   * Doctor Action: Call Next Patient
   * Considers priority: emergency > senior_disabled > normal, then sequence number
   */
  static async callNext(params: {
    doctorId: string;
    actorId: string;
    ipAddress?: string;
  }): Promise<IQueueEntry | null> {
    const todayStr = new Date().toISOString().slice(0, 10);

    // Get all waiting or recalled entries for this doctor today
    const waitingEntries = await QueueEntry.find({
      doctorId: params.doctorId,
      date: todayStr,
      status: { $in: ['waiting', 'recalled'] },
    }).populate('appointmentId').populate('patientId');

    if (waitingEntries.length === 0) {
      return null;
    }

    // Sort by priority rank, then by sequenceNumber
    waitingEntries.sort((a, b) => {
      const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (rankDiff !== 0) return rankDiff;
      return a.sequenceNumber - b.sequenceNumber;
    });

    const nextPatient = waitingEntries[0];
    nextPatient.status = 'called';
    nextPatient.calledTime = new Date();
    nextPatient.queueHistory.push({
      action: 'CALLED',
      timestamp: new Date(),
      actorId: params.actorId as any,
      note: 'Called to consultation room',
    });
    await nextPatient.save();

    // Check if appointment needs status update
    await Appointment.findByIdAndUpdate(nextPatient.appointmentId, { status: 'checked_in' });

    // Broadcast updates
    await this.broadcastQueueAndDisplay(params.doctorId, nextPatient.hospitalId.toString(), todayStr);
    await this.checkAndTriggerTurnNearAlerts(params.doctorId, todayStr);

    return nextPatient;
  }

  /**
   * Doctor Action: Start Consultation
   */
  static async startConsultation(params: {
    queueEntryId: string;
    doctorId: string;
    actorId: string;
    ipAddress?: string;
  }): Promise<IQueueEntry> {
    const entry = await QueueEntry.findOne({ _id: params.queueEntryId, doctorId: params.doctorId });
    if (!entry) throw new AppError('Queue entry not found', 404);

    entry.status = 'in_consultation';
    entry.startTime = new Date();
    entry.queueHistory.push({
      action: 'CONSULTATION_STARTED',
      timestamp: new Date(),
      actorId: params.actorId as any,
    });
    await entry.save();

    await Appointment.findByIdAndUpdate(entry.appointmentId, { status: 'in_consultation' });

    await this.broadcastQueueAndDisplay(params.doctorId, entry.hospitalId.toString(), entry.date);
    await this.checkAndTriggerTurnNearAlerts(params.doctorId, entry.date);

    return entry;
  }

  /**
   * Doctor Action: Complete Consultation
   */
  static async completeConsultation(params: {
    queueEntryId: string;
    doctorId: string;
    actorId: string;
    ipAddress?: string;
  }): Promise<IQueueEntry> {
    const entry = await QueueEntry.findOne({ _id: params.queueEntryId, doctorId: params.doctorId });
    if (!entry) throw new AppError('Queue entry not found', 404);

    entry.status = 'completed';
    entry.endTime = new Date();
    entry.queueHistory.push({
      action: 'CONSULTATION_COMPLETED',
      timestamp: new Date(),
      actorId: params.actorId as any,
    });
    await entry.save();

    await Appointment.findByIdAndUpdate(entry.appointmentId, { status: 'completed' });

    await this.broadcastQueueAndDisplay(params.doctorId, entry.hospitalId.toString(), entry.date);
    await this.checkAndTriggerTurnNearAlerts(params.doctorId, entry.date);

    return entry;
  }

  /**
   * Doctor Action: Skip Patient
   */
  static async skipPatient(params: {
    queueEntryId: string;
    doctorId: string;
    actorId: string;
    reason?: string;
    ipAddress?: string;
  }): Promise<IQueueEntry> {
    const entry = await QueueEntry.findOne({ _id: params.queueEntryId, doctorId: params.doctorId });
    if (!entry) throw new AppError('Queue entry not found', 404);

    entry.status = 'skipped';
    entry.queueHistory.push({
      action: 'SKIPPED',
      timestamp: new Date(),
      actorId: params.actorId as any,
      note: params.reason || 'Patient not present when called',
    });
    await entry.save();

    await this.broadcastQueueAndDisplay(params.doctorId, entry.hospitalId.toString(), entry.date);

    return entry;
  }

  /**
   * Doctor Action: Recall Patient (after being skipped)
   */
  static async recallPatient(params: {
    queueEntryId: string;
    doctorId: string;
    actorId: string;
    ipAddress?: string;
  }): Promise<IQueueEntry> {
    const entry = await QueueEntry.findOne({ _id: params.queueEntryId, doctorId: params.doctorId });
    if (!entry) throw new AppError('Queue entry not found', 404);

    entry.status = 'recalled';
    entry.queueHistory.push({
      action: 'RECALLED',
      timestamp: new Date(),
      actorId: params.actorId as any,
    });
    await entry.save();

    await this.broadcastQueueAndDisplay(params.doctorId, entry.hospitalId.toString(), entry.date);

    return entry;
  }

  /**
   * Doctor Action: Mark No-Show
   */
  static async markNoShow(params: {
    queueEntryId: string;
    doctorId: string;
    actorId: string;
    ipAddress?: string;
  }): Promise<IQueueEntry> {
    const entry = await QueueEntry.findOne({ _id: params.queueEntryId, doctorId: params.doctorId });
    if (!entry) throw new AppError('Queue entry not found', 404);

    entry.status = 'no_show';
    entry.queueHistory.push({
      action: 'MARKED_NO_SHOW',
      timestamp: new Date(),
      actorId: params.actorId as any,
    });
    await entry.save();

    await Appointment.findByIdAndUpdate(entry.appointmentId, { status: 'no_show' });

    await this.broadcastQueueAndDisplay(params.doctorId, entry.hospitalId.toString(), entry.date);

    return entry;
  }

  /**
   * Reassign patient to another doctor
   */
  static async reassignDoctor(params: {
    queueEntryId: string;
    newDoctorId: string;
    actorId: string;
    reason?: string;
    ipAddress?: string;
  }): Promise<IQueueEntry> {
    const entry = await QueueEntry.findById(params.queueEntryId);
    if (!entry) throw new AppError('Queue entry not found', 404);

    const oldDoctorId = entry.doctorId.toString();
    const newDoc = await DoctorProfile.findById(params.newDoctorId);
    if (!newDoc) throw new AppError('Target doctor not found', 404);

    entry.doctorId = newDoc._id as any;
    entry.roomNumber = newDoc.roomNumber;
    entry.queueHistory.push({
      action: 'REASSIGNED_DOCTOR',
      timestamp: new Date(),
      actorId: params.actorId as any,
      note: `Reassigned from Dr. ${oldDoctorId} to Dr. ${newDoc._id}. Reason: ${params.reason || 'None'}`,
    });
    await entry.save();

    await Appointment.findByIdAndUpdate(entry.appointmentId, { doctorId: newDoc._id });

    await this.broadcastQueueAndDisplay(oldDoctorId, entry.hospitalId.toString(), entry.date);
    await this.broadcastQueueAndDisplay(newDoc._id.toString(), entry.hospitalId.toString(), entry.date);

    return entry;
  }

  /**
   * Emergency Insertion
   */
  static async emergencyInsert(params: {
    doctorId: string;
    patientId: string;
    symptoms: string;
    actorId: string;
    ipAddress?: string;
  }): Promise<IQueueEntry> {
    const doctor = await DoctorProfile.findById(params.doctorId);
    if (!doctor) throw new AppError('Doctor not found', 404);

    const todayStr = new Date().toISOString().slice(0, 10);
    const nowTimeStr = new Date().toTimeString().slice(0, 5);

    // Create an emergency appointment
    const appointment = await Appointment.create({
      appointmentNumber: `EMG-${Date.now().toString().slice(-6)}`,
      hospitalId: doctor.hospitalId,
      departmentId: doctor.departmentId,
      doctorId: doctor._id,
      patientId: params.patientId,
      date: todayStr,
      startTime: nowTimeStr,
      endTime: nowTimeStr,
      slotTime: new Date(),
      status: 'checked_in',
      visitType: 'emergency',
      symptoms: params.symptoms,
      paymentStatus: 'pending',
      consultationFee: doctor.consultationFee,
      isWalkIn: true,
    });

    const queueEntry = await this.checkIn({
      appointmentId: appointment._id.toString(),
      priority: 'emergency',
      actorId: params.actorId,
      ipAddress: params.ipAddress,
    });

    return queueEntry;
  }

  /**
   * Patient Live Queue Position and Status
   */
  static async getPatientLiveQueue(patientId: string): Promise<{
    entry: IQueueEntry | null;
    peopleAhead: number;
    estimatedWaitMinutes: number;
    doctorName?: string;
    roomNumber?: string;
  }> {
    const todayStr = new Date().toISOString().slice(0, 10);

    // Find active entry for today for this patient
    const entry = await QueueEntry.findOne({
      patientId,
      date: todayStr,
      status: { $in: ['waiting', 'called', 'in_consultation', 'recalled'] },
    })
      .populate('appointmentId')
      .populate({ path: 'doctorId', populate: { path: 'userId' } });

    if (!entry) {
      return { entry: null, peopleAhead: 0, estimatedWaitMinutes: 0 };
    }

    const doctor = entry.doctorId as any;
    const avgMins = doctor?.avgConsultationMinutes || 15;

    if (entry.status === 'in_consultation') {
      return {
        entry,
        peopleAhead: 0,
        estimatedWaitMinutes: 0,
        doctorName: doctor?.userId?.name,
        roomNumber: entry.roomNumber,
      };
    }

    if (entry.status === 'called') {
      return {
        entry,
        peopleAhead: 0,
        estimatedWaitMinutes: 0,
        doctorName: doctor?.userId?.name,
        roomNumber: entry.roomNumber,
      };
    }

    // Calculate people ahead based on priority and sequence
    const allWaiting = await QueueEntry.find({
      doctorId: entry.doctorId,
      date: todayStr,
      status: { $in: ['waiting', 'called', 'recalled'] },
    });

    allWaiting.sort((a, b) => {
      const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (rankDiff !== 0) return rankDiff;
      return a.sequenceNumber - b.sequenceNumber;
    });

    const myIndex = allWaiting.findIndex((e) => e._id.toString() === entry._id.toString());
    const peopleAhead = myIndex >= 0 ? myIndex : 0;
    const estimatedWaitMinutes = peopleAhead * avgMins;

    return {
      entry,
      peopleAhead,
      estimatedWaitMinutes,
      doctorName: doctor?.userId?.name,
      roomNumber: entry.roomNumber,
    };
  }

  /**
   * Get Active Queue for a Doctor
   */
  static async getDoctorQueue(doctorId: string, dateStr?: string): Promise<{
    activeEntries: IQueueEntry[];
    nowServing: IQueueEntry | null;
  }> {
    const date = dateStr || new Date().toISOString().slice(0, 10);

    const entries = await QueueEntry.find({
      doctorId,
      date,
      status: { $in: ['waiting', 'called', 'in_consultation', 'recalled', 'skipped'] },
    })
      .populate('patientId', 'name email phone avatarUrl')
      .populate('appointmentId');

    const nowServing = entries.find((e) => e.status === 'in_consultation' || e.status === 'called') || null;

    entries.sort((a, b) => {
      const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (rankDiff !== 0) return rankDiff;
      return a.sequenceNumber - b.sequenceNumber;
    });

    return { activeEntries: entries, nowServing };
  }

  /**
   * Public Display Screen Data for Hospital (/display/:hospitalId)
   */
  static async getHospitalDisplayData(hospitalId: string): Promise<SocketDisplayPayload> {
    const todayStr = new Date().toISOString().slice(0, 10);

    const departments = await Department.find({ hospitalId, isActive: true });
    const doctorProfiles = await DoctorProfile.find({ hospitalId, isActive: true })
      .populate('userId', 'name')
      .populate('departmentId', 'name code');

    const deptMap: Record<string, {
      departmentName: string;
      doctors: Array<{
        doctorId: string;
        doctorName: string;
        specialization: string;
        roomNumber: string;
        status: 'active' | 'break' | 'offline';
        nowServingToken?: string;
        nextTokens: string[];
      }>;
    }> = {};

    for (const dept of departments) {
      deptMap[dept._id.toString()] = {
        departmentName: dept.name,
        doctors: [],
      };
    }

    for (const doc of doctorProfiles) {
      const deptId = (doc.departmentId as any)?._id?.toString() || doc.departmentId.toString();
      if (!deptMap[deptId]) continue;

      const { activeEntries, nowServing } = await this.getDoctorQueue(doc._id.toString(), todayStr);
      const nextTokens = activeEntries
        .filter((e) => e.status === 'waiting' || e.status === 'recalled')
        .slice(0, 4)
        .map((e) => e.tokenNumber);

      deptMap[deptId].doctors.push({
        doctorId: doc._id.toString(),
        doctorName: `Dr. ${(doc.userId as any)?.name || 'Doctor'}`,
        specialization: doc.specialization,
        roomNumber: doc.roomNumber || 'Room 1',
        status: 'active',
        nowServingToken: nowServing?.tokenNumber,
        nextTokens,
      });
    }

    return {
      hospitalId,
      departments: Object.values(deptMap),
    };
  }

  /**
   * Helper: Broadcasts queue update to doctor room and hospital display
   */
  private static async broadcastQueueAndDisplay(doctorId: string, hospitalId: string, date: string): Promise<void> {
    try {
      const { activeEntries, nowServing } = await this.getDoctorQueue(doctorId, date);
      socketService.emitQueueUpdate(doctorId, {
        doctorId,
        hospitalId,
        date,
        activeEntries: activeEntries as any,
        nowServing: nowServing as any,
      });

      const displayPayload = await this.getHospitalDisplayData(hospitalId);
      socketService.emitDisplayUpdate(hospitalId, displayPayload);
    } catch (err) {
      // Non-fatal if broadcast fails
    }
  }

  /**
   * Checks and triggers "Your Turn is Near" alerts when <= 3 patients ahead
   */
  private static async checkAndTriggerTurnNearAlerts(doctorId: string, date: string): Promise<void> {
    try {
      const waiting = await QueueEntry.find({
        doctorId,
        date,
        status: { $in: ['waiting', 'recalled'] },
      })
        .populate('patientId')
        .populate({ path: 'doctorId', populate: { path: 'userId' } });

      waiting.sort((a, b) => {
        const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (rankDiff !== 0) return rankDiff;
        return a.sequenceNumber - b.sequenceNumber;
      });

      // Patients in index 0, 1, 2 have <= 3 patients ahead (including self)
      for (let i = 0; i < Math.min(3, waiting.length); i++) {
        const entry = waiting[i];
        const patient = entry.patientId as any;
        const doctor = entry.doctorId as any;
        const avgMins = doctor?.avgConsultationMinutes || 15;
        const peopleAhead = i;
        const estWait = peopleAhead * avgMins;

        // Emit Socket event
        socketService.emitTurnNear(patient._id.toString(), {
          patientId: patient._id.toString(),
          appointmentId: entry.appointmentId.toString(),
          tokenNumber: entry.tokenNumber,
          doctorName: `Dr. ${doctor?.userId?.name || 'Doctor'}`,
          roomNumber: entry.roomNumber || 'Room 1',
          peopleAhead,
          estimatedWaitMinutes: estWait,
        });

        // Create in-app notification if not already sent
        await NotificationService.create({
          userId: patient._id,
          title: 'Your Turn is Near!',
          message: `Only ${peopleAhead} patient(s) ahead of you for Token #${entry.tokenNumber}. Please be ready near ${entry.roomNumber}.`,
          type: 'queue',
          data: { tokenNumber: entry.tokenNumber, peopleAhead },
        });

        // Send alert email
        await emailService.sendQueueTurnNearAlert(patient.email, {
          patientName: patient.name,
          tokenNumber: entry.tokenNumber,
          doctorName: `Dr. ${doctor?.userId?.name || 'Doctor'}`,
          roomNumber: entry.roomNumber || 'Room 1',
          peopleAhead,
          estimatedWaitMinutes: estWait,
        });
      }
    } catch (err) {
      // Non-fatal
    }
  }
}
