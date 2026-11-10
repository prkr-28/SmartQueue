import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isMock = true;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT || 587,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
      this.isMock = false;
      logger.info({ host: env.SMTP_HOST }, 'Email transporter initialized');
    } else {
      this.isMock = true;
      logger.info('SMTP not configured; running email service in console/mock mode');
    }
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (this.isMock || !this.transporter) {
      logger.info({ to, subject }, '[MOCK EMAIL DISPATCHED] Subject: ' + subject);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: env.MAIL_FROM,
        to,
        subject,
        html,
      });
    } catch (error) {
      logger.error({ error, to, subject }, 'Failed to send email');
    }
  }

  async sendAppointmentConfirmation(
    to: string,
    data: {
      patientName: string;
      doctorName: string;
      specialization: string;
      date: string;
      time: string;
      appointmentNumber: string;
      hospitalName: string;
    }
  ): Promise<void> {
    const subject = `Appointment Confirmed: ${data.appointmentNumber} - ${data.hospitalName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0d9488;">SmartQueue Appointment Confirmation</h2>
        <p>Dear <strong>${data.patientName}</strong>,</p>
        <p>Your appointment has been successfully confirmed. Here are the details:</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Appointment #:</strong> ${data.appointmentNumber}</p>
          <p style="margin: 5px 0;"><strong>Hospital:</strong> ${data.hospitalName}</p>
          <p style="margin: 5px 0;"><strong>Doctor:</strong> ${data.doctorName} (${data.specialization})</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${data.date}</p>
          <p style="margin: 5px 0;"><strong>Time Slot:</strong> ${data.time}</p>
        </div>
        <p>Please arrive 15 minutes before your scheduled slot. Check in at the reception or using the SmartQueue app to receive your token number.</p>
        <p style="color: #64748b; font-size: 13px;">Need to reschedule or cancel? Log in to your SmartQueue portal at any time.</p>
      </div>
    `;
    await this.send(to, subject, html);
  }

  async sendAppointmentReminder(
    to: string,
    data: {
      patientName: string;
      doctorName: string;
      date: string;
      time: string;
      timeUntil: string; // e.g. "24 hours" or "1 hour"
      hospitalName: string;
    }
  ): Promise<void> {
    const subject = `Reminder: Upcoming Appointment in ${data.timeUntil}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0d9488;">Appointment Reminder</h2>
        <p>Dear <strong>${data.patientName}</strong>,</p>
        <p>This is a reminder that you have an appointment in <strong>${data.timeUntil}</strong> with <strong>${data.doctorName}</strong> at <strong>${data.hospitalName}</strong> on <strong>${data.date}</strong> at <strong>${data.time}</strong>.</p>
        <p>You can check the live queue status directly on your SmartQueue dashboard.</p>
      </div>
    `;
    await this.send(to, subject, html);
  }

  async sendCancellationNotice(
    to: string,
    data: {
      patientName: string;
      appointmentNumber: string;
      doctorName: string;
      date: string;
      reason?: string;
    }
  ): Promise<void> {
    const subject = `Appointment Cancelled: ${data.appointmentNumber}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #e11d48;">Appointment Cancellation Notice</h2>
        <p>Dear <strong>${data.patientName}</strong>,</p>
        <p>Your appointment <strong>${data.appointmentNumber}</strong> with <strong>${data.doctorName}</strong> on <strong>${data.date}</strong> has been cancelled.</p>
        ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
        <p>If you did not request this or would like to book a new appointment, please visit the SmartQueue portal.</p>
      </div>
    `;
    await this.send(to, subject, html);
  }

  async sendQueueTurnNearAlert(
    to: string,
    data: {
      patientName: string;
      tokenNumber: string;
      doctorName: string;
      roomNumber: string;
      peopleAhead: number;
      estimatedWaitMinutes: number;
    }
  ): Promise<void> {
    const subject = `Your Turn is Near! Token #${data.tokenNumber}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #0d9488; border-radius: 8px;">
        <h2 style="color: #0d9488;">Your Turn is Coming Up Soon</h2>
        <p>Dear <strong>${data.patientName}</strong>,</p>
        <p>There are only <strong>${data.peopleAhead}</strong> patient(s) ahead of you in line.</p>
        <div style="background-color: #f0fdfa; padding: 15px; border-radius: 6px; margin: 15px 0;">
          <h1 style="color: #0f766e; margin: 0;">Token #${data.tokenNumber}</h1>
          <p style="margin: 5px 0;"><strong>Doctor:</strong> ${data.doctorName}</p>
          <p style="margin: 5px 0;"><strong>Room:</strong> ${data.roomNumber}</p>
          <p style="margin: 5px 0;"><strong>Est. Wait:</strong> ~${data.estimatedWaitMinutes} minutes</p>
        </div>
        <p>Please wait near Room ${data.roomNumber}.</p>
      </div>
    `;
    await this.send(to, subject, html);
  }

  async sendPasswordResetToken(to: string, resetUrl: string): Promise<void> {
    const subject = 'Password Reset Request - SmartQueue';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0d9488;">Reset Your Password</h2>
        <p>You requested a password reset for your SmartQueue account. Click the button below to set a new password:</p>
        <p style="margin: 25px 0;">
          <a href="${resetUrl}" style="background-color: #0d9488; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
        </p>
        <p style="color: #64748b; font-size: 13px;">This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
      </div>
    `;
    await this.send(to, subject, html);
  }
}

export const emailService = new EmailService();
