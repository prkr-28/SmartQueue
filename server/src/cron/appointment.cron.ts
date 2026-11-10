import cron from 'node-cron';
import { Appointment } from '../models/Appointment.js';
import { QueueEntry } from '../models/QueueEntry.js';
import { emailService } from '../services/email.service.js';
import { logger } from '../config/logger.js';

export const initAppointmentCrons = (): void => {
  // 1. Auto No-Show Marking: Runs every 10 minutes
  // Finds today's appointments that are still 'booked', where slotTime + gracePeriod (30 min) < now
  cron.schedule('*/10 * * * *', async () => {
    try {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const gracePeriodMs = 30 * 60 * 1000; // 30 minutes grace period
      const cutoffTime = new Date(now.getTime() - gracePeriodMs);

      const expiredAppointments = await Appointment.find({
        date: todayStr,
        status: 'booked',
        slotTime: { $lt: cutoffTime },
      });

      for (const apt of expiredAppointments) {
        apt.status = 'no_show';
        await apt.save();

        // Also update queue entry if checked in
        await QueueEntry.updateOne(
          { appointmentId: apt._id, status: 'waiting' },
          { $set: { status: 'no_show' } }
        );

        logger.info({ appointmentNumber: apt.appointmentNumber }, 'Appointment auto-marked as no-show by cron');
      }
    } catch (err) {
      logger.error({ err }, 'Error in auto no-show cron');
    }
  });

  // 2. Appointment Reminders: Runs every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

      const in1h = new Date(now.getTime() + 1 * 60 * 60 * 1000);
      const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      // Find appointments in ~24h
      const apts24h = await Appointment.find({
        status: 'booked',
        slotTime: { $gte: in24h, $lt: in25h },
      })
        .populate('patientId')
        .populate('hospitalId')
        .populate({ path: 'doctorId', populate: { path: 'userId' } });

      for (const apt of apts24h) {
        const patient = apt.patientId as any;
        const doctor = (apt.doctorId as any)?.userId as any;
        const hospital = apt.hospitalId as any;

        if (patient && patient.email) {
          await emailService.sendAppointmentReminder(patient.email, {
            patientName: patient.name,
            doctorName: `Dr. ${doctor?.name || 'Doctor'}`,
            date: apt.date,
            time: apt.startTime,
            timeUntil: '24 hours',
            hospitalName: hospital?.name || 'SmartQueue Medical Center',
          });
        }
      }

      // Find appointments in ~1h
      const apts1h = await Appointment.find({
        status: 'booked',
        slotTime: { $gte: in1h, $lt: in2h },
      })
        .populate('patientId')
        .populate('hospitalId')
        .populate({ path: 'doctorId', populate: { path: 'userId' } });

      for (const apt of apts1h) {
        const patient = apt.patientId as any;
        const doctor = (apt.doctorId as any)?.userId as any;
        const hospital = apt.hospitalId as any;

        if (patient && patient.email) {
          await emailService.sendAppointmentReminder(patient.email, {
            patientName: patient.name,
            doctorName: `Dr. ${doctor?.name || 'Doctor'}`,
            date: apt.date,
            time: apt.startTime,
            timeUntil: '1 hour',
            hospitalName: hospital?.name || 'SmartQueue Medical Center',
          });
        }
      }
    } catch (err) {
      logger.error({ err }, 'Error in appointment reminder cron');
    }
  });

  logger.info('Appointment background crons initialized');
};
