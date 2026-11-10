import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User } from '../models/User.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { Appointment } from '../models/Appointment.js';
import { Invoice } from '../models/Invoice.js';

describe('SmartQueue Section 2 API & RBAC Integration Tests', () => {
  let app: any;
  let adminToken: string;
  let doctorToken: string;
  let receptionistToken: string;
  let patientToken: string;
  let testDoctor: any;
  let testAppointment: any;
  let testInvoice: any;

  beforeAll(async () => {
    await connectDatabase();
    app = createApp();

    // 1. Authenticate Admin
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@smartqueue.test',
      password: 'Admin@123',
    });
    adminToken = adminRes.body.data?.accessToken;

    // 2. Authenticate Doctor
    const doctorRes = await request(app).post('/api/auth/login').send({
      email: 'doctor1@smartqueue.test',
      password: 'Doctor@123',
    });
    doctorToken = doctorRes.body.data?.accessToken;

    // 3. Authenticate Receptionist
    const receptRes = await request(app).post('/api/auth/login').send({
      email: 'receptionist1@smartqueue.test',
      password: 'Receptionist@123',
    });
    receptionistToken = receptRes.body.data?.accessToken;

    // 4. Authenticate Patient
    const patientRes = await request(app).post('/api/auth/login').send({
      email: 'patient1@smartqueue.test',
      password: 'Patient@123',
    });
    patientToken = patientRes.body.data?.accessToken;

    // Fetch a sample doctor and active appointment
    testDoctor = await DoctorProfile.findOne().populate('userId');
    testAppointment = await Appointment.findOne({ status: { $in: ['booked', 'checked_in', 'in_consultation'] } });
    testInvoice = await Invoice.findOne();
  }, 30000);

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('1. RBAC Route Guards', () => {
    it('Doctor cannot access admin analytics (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(403);
    });

    it('Patient cannot access receptionist billing desk summary (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/invoices/daily-summary')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
    });

    it('Receptionist cannot record clinical consultation (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/consultations')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          appointmentId: testAppointment?._id,
          diagnosis: 'Unauthorized diagnosis',
        });

      expect(res.status).toBe(403);
    });

    it('Admin can access staff directory (200 OK)', async () => {
      const res = await request(app)
        .get('/api/admin/staff')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('doctors');
      expect(res.body.data).toHaveProperty('staff');
    });
  });

  describe('2. Clinical Consultation & Prescription Generation', () => {
    let consultationId: string;

    it('Doctor records consultation with vitals and prescription items', async () => {
      // Find appointment specifically assigned to doctor1
      const doctorUser = await User.findOne({ email: 'doctor1@smartqueue.test' });
      const doctorProfile = await DoctorProfile.findOne({ userId: doctorUser?._id });

      let apt = await Appointment.findOne({ doctorId: doctorProfile?._id });
      if (!apt) {
        // Book one if none exists
        const patientUser = await User.findOne({ email: 'patient1@smartqueue.test' });
        apt = await Appointment.create({
          appointmentNumber: `APT-TEST-${Date.now().toString().slice(-4)}`,
          hospitalId: doctorProfile?.hospitalId,
          departmentId: doctorProfile?.departmentId,
          doctorId: doctorProfile?._id,
          patientId: patientUser?._id,
          date: new Date().toISOString().slice(0, 10),
          startTime: '10:00',
          endTime: '10:15',
          slotTime: new Date(),
          status: 'in_consultation',
          visitType: 'new',
          consultationFee: 500,
        });
      }

      const res = await request(app)
        .post('/api/consultations')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          appointmentId: apt._id.toString(),
          vitals: {
            bloodPressure: '120/80',
            pulse: 74,
            temperature: 98.6,
            weight: 70,
            oxygenLevel: 99,
          },
          symptoms: ['Mild fever', 'Dry cough'],
          diagnosis: 'Acute Viral Pharyngitis',
          notes: 'Adequate hydration and oral antipyretics.',
          prescriptionItems: [
            {
              medicineName: 'Paracetamol',
              dosage: '500mg',
              frequency: '1-0-1',
              duration: '3 days',
              instructions: 'After meals',
            },
            {
              medicineName: 'Cetirizine',
              dosage: '10mg',
              frequency: '0-0-1',
              duration: '5 days',
              instructions: 'At bedtime',
            },
          ],
          followUpDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.diagnosis).toBe('Acute Viral Pharyngitis');
      expect(res.body.data.prescriptionItems.length).toBe(2);

      consultationId = res.body.data._id;

      // Verify appointment is marked completed
      const updatedApt = await Appointment.findById(apt._id);
      expect(updatedApt?.status).toBe('completed');
    });

    it('Generates and streams prescription PDF successfully', async () => {
      const res = await request(app)
        .get(`/api/consultations/${consultationId}/pdf`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.body.length).toBeGreaterThan(500); // Valid PDF binary
    });
  });

  describe('3. Invoicing & Billing Desk', () => {
    it('Receptionist fetches daily summary report (200 OK)', async () => {
      const res = await request(app)
        .get('/api/invoices/daily-summary')
        .set('Authorization', `Bearer ${receptionistToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalBilled');
      expect(res.body.data).toHaveProperty('totalCollected');
    });

    it('Receptionist collects payment and generates invoice PDF', async () => {
      let targetInvoice = await Invoice.findOne({ paymentStatus: 'pending' });
      if (!targetInvoice) {
        targetInvoice = await Invoice.create({
          invoiceNumber: `INV-${Date.now()}`,
          patientId: testAppointment?.patientId || testDoctor?.userId?._id,
          doctorId: testDoctor?._id,
          appointmentId: testAppointment?._id,
          hospitalId: testDoctor?.hospitalId,
          consultationFee: 500,
          totalAmount: 500,
          paymentStatus: 'pending',
        });
      }

      const payRes = await request(app)
        .put(`/api/invoices/${targetInvoice._id}/pay`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send({
          paymentMode: 'upi',
          notes: 'Test UPI collection',
        });

      expect(payRes.status).toBe(200);
      expect(payRes.body.data.paymentStatus).toBe('paid');
      expect(payRes.body.data.paymentMode).toBe('upi');

      // Download invoice PDF
      const pdfRes = await request(app)
        .get(`/api/invoices/${targetInvoice._id}/pdf`)
        .set('Authorization', `Bearer ${receptionistToken}`);

      expect(pdfRes.status).toBe(200);
      expect(pdfRes.headers['content-type']).toBe('application/pdf');
      expect(pdfRes.body.length).toBeGreaterThan(500);
    });
  });

  describe('4. Admin Analytics Aggregations & Reports', () => {
    it('Admin fetches dashboard analytics aggregation (200 OK)', async () => {
      const res = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('todayStats');
      expect(res.body.data).toHaveProperty('queueStats');
      expect(res.body.data).toHaveProperty('appointmentTrend');
      expect(res.body.data).toHaveProperty('departmentLoad');
      expect(res.body.data).toHaveProperty('doctorPerformance');
    });

    it('Exports appointments report as CSV', async () => {
      const res = await request(app)
        .get('/api/reports/appointments/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Appointment Number');
      expect(res.text).toContain('Doctor Name');
    });

    it('Exports revenue report as CSV', async () => {
      const res = await request(app)
        .get('/api/reports/revenue/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Invoice Number');
      expect(res.text).toContain('Total Amount');
    });
  });
});
