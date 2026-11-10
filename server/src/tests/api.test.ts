import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User } from '../models/User.js';
import { Hospital } from '../models/Hospital.js';
import { Department } from '../models/Department.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { Schedule } from '../models/Schedule.js';
import { Appointment } from '../models/Appointment.js';
import { QueueEntry } from '../models/QueueEntry.js';
import { AuthService } from '../services/auth.service.js';

const app = createApp();

describe('SmartQueue Backend Core API Tests', () => {
  let patientToken: string;
  let adminToken: string;
  let doctorToken: string;
  let doctorId: string;
  let hospitalId: string;
  let testPatientId: string;

  beforeAll(async () => {
    await connectDatabase();

    // Fetch existing seeded data
    const patientUser = await User.findOne({ email: 'patient1@smartqueue.test' });
    const adminUser = await User.findOne({ email: 'admin@smartqueue.test' });
    const doctorUser = await User.findOne({ email: 'doctor1@smartqueue.test' });
    const doctorProf = await DoctorProfile.findOne({ userId: doctorUser?._id });
    const hospital = await Hospital.findOne();

    if (patientUser) {
      testPatientId = patientUser._id.toString();
      patientToken = AuthService.generateTokens(patientUser).accessToken;
    }
    if (adminUser) {
      adminToken = AuthService.generateTokens(adminUser).accessToken;
    }
    if (doctorUser && doctorProf) {
      doctorToken = AuthService.generateTokens(doctorUser).accessToken;
      doctorId = doctorProf._id.toString();
    }
    if (hospital) {
      hospitalId = hospital._id.toString();
    }
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('1. Health & Server Check', () => {
    it('GET /api/health should return 200 healthy with database connected', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.database.status).toBe('connected');
    });
  });

  describe('2. Authentication Module & Account Lockout', () => {
    const testEmail = `testuser_${Date.now()}@smartqueue.test`;
    const testPassword = 'Password@123';

    it('POST /api/auth/register should register a new patient', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test Patient',
          email: testEmail,
          password: testPassword,
          phone: '+91 99999 88888',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('POST /api/auth/login should log in successfully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('POST /api/auth/login should enforce account lockout on repeated failed attempts', async () => {
      // 5 consecutive wrong passwords
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ email: testEmail, password: 'WrongPassword!' });
      }

      // 6th attempt should return 423 Locked
      const lockedRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: 'WrongPassword!' });

      expect(lockedRes.status).toBe(423);
      expect(lockedRes.body.error).toContain('Account temporarily locked');
    });
  });

  describe('3. Slot Generation Engine', () => {
    it('GET /api/doctors/:id/slots should generate available slots for a date', async () => {
      const testDate = '2026-11-20'; // A Friday
      const res = await request(app).get(`/api/doctors/${doctorId}/slots?date=${testDate}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.doctorId).toBe(doctorId);
      expect(res.body.data.slots.length).toBeGreaterThan(0);

      const firstSlot = res.body.data.slots[0];
      expect(firstSlot).toHaveProperty('startTime');
      expect(firstSlot).toHaveProperty('endTime');
      expect(firstSlot).toHaveProperty('isAvailable');
    });
  });

  describe('4. Double-Booking Prevention & Race Conditions', () => {
    it('should prevent double-booking using atomic unique index and return 409 for concurrent requests', async () => {
      const raceDate = '2026-11-25';
      const raceTime = '11:00';

      // Clean any existing booking for this slot
      await Appointment.deleteMany({ doctorId, date: raceDate, startTime: raceTime });

      // Run 2 concurrent booking requests for the exact same slot
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${patientToken}`)
          .send({
            doctorId,
            date: raceDate,
            startTime: raceTime,
            visitType: 'new',
            symptoms: 'Racer 1',
          }),
        request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${patientToken}`)
          .send({
            doctorId,
            date: raceDate,
            startTime: raceTime,
            visitType: 'new',
            symptoms: 'Racer 2',
          }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      // Exactly ONE request must succeed with 201, and the other MUST fail with 409 Conflict
      expect(statuses).toEqual([201, 409]);

      const conflictRes = res1.status === 409 ? res1 : res2;
      expect(conflictRes.body.error).toContain('This slot was just taken by another patient');
    });
  });

  describe('5. Appointment Status Transitions & Validation', () => {
    it('should validate allowed status transitions (booked -> checked_in -> cancelled prevention)', async () => {
      const testDate = '2026-11-26';
      const testTime = '14:00';

      await Appointment.deleteMany({ doctorId, date: testDate, startTime: testTime });

      // 1. Book
      const bookRes = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          doctorId,
          date: testDate,
          startTime: testTime,
          visitType: 'new',
          symptoms: 'Transition test',
        });

      expect(bookRes.status).toBe(201);
      const aptId = bookRes.body.data._id;

      // 2. Cancel
      const cancelRes = await request(app)
        .post(`/api/appointments/${aptId}/cancel`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ reason: 'Need to cancel' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.status).toBe('cancelled');

      // 3. Trying to cancel again should fail
      const repeatCancelRes = await request(app)
        .post(`/api/appointments/${aptId}/cancel`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ reason: 'Cancel again' });

      expect(repeatCancelRes.status).toBe(400);
      expect(repeatCancelRes.body.error).toContain('already cancelled');
    });
  });

  describe('6. Queue Module & Priority Ordering', () => {
    it('should strictly prioritize Emergency over Senior over Normal patients', async () => {
      const queueDate = new Date().toISOString().slice(0, 10);

      // Clean up slots for this doctor for test isolation
      await Appointment.deleteMany({ doctorId, date: queueDate, startTime: { $in: ['17:00', '17:15', '17:30'] } });
      await QueueEntry.deleteMany({ doctorId, date: queueDate, tokenNumber: { $regex: /^TEST-/ } });

      // Create 3 appointments for today with test slots
      const aptNorm = await Appointment.create({
        appointmentNumber: `APT-NORM-${Date.now()}`,
        hospitalId,
        departmentId: (await DoctorProfile.findById(doctorId))?.departmentId,
        doctorId,
        patientId: testPatientId,
        date: queueDate,
        startTime: '17:00',
        endTime: '17:15',
        slotTime: new Date(),
        status: 'booked',
        consultationFee: 500,
      });

      const aptSenior = await Appointment.create({
        appointmentNumber: `APT-SENIOR-${Date.now()}`,
        hospitalId,
        departmentId: (await DoctorProfile.findById(doctorId))?.departmentId,
        doctorId,
        patientId: testPatientId,
        date: queueDate,
        startTime: '17:15',
        endTime: '17:30',
        slotTime: new Date(),
        status: 'booked',
        consultationFee: 500,
      });

      const aptEmerg = await Appointment.create({
        appointmentNumber: `APT-EMERG-${Date.now()}`,
        hospitalId,
        departmentId: (await DoctorProfile.findById(doctorId))?.departmentId,
        doctorId,
        patientId: testPatientId,
        date: queueDate,
        startTime: '17:30',
        endTime: '17:45',
        slotTime: new Date(),
        status: 'booked',
        consultationFee: 500,
      });

      // Check-in in reverse order: Normal first, Senior second, Emergency last
      await request(app)
        .post('/api/queue/check-in')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ appointmentId: aptNorm._id, priority: 'normal' });

      await request(app)
        .post('/api/queue/check-in')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ appointmentId: aptSenior._id, priority: 'senior_disabled' });

      await request(app)
        .post('/api/queue/check-in')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ appointmentId: aptEmerg._id, priority: 'emergency' });

      // Doctor calls next patient: MUST BE THE EMERGENCY PATIENT!
      const callRes = await request(app)
        .post(`/api/queue/doctor/${doctorId}/call-next`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(callRes.status).toBe(200);
      expect(callRes.body.data.priority).toBe('emergency');
      expect(callRes.body.data.status).toBe('called');
    });
  });
});
