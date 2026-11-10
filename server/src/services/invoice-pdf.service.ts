import PDFDocument from 'pdfkit';
import { IInvoice } from '../models/Invoice.js';
import { IHospital } from '../models/Hospital.js';
import { IUser } from '../models/User.js';
import { IDoctorProfile } from '../models/DoctorProfile.js';
import { IAppointment } from '../models/Appointment.js';

export class InvoicePdfService {
  static async generate(data: {
    invoice: IInvoice;
    hospital: IHospital;
    patient: IUser;
    doctor: IDoctorProfile;
    doctorUser: IUser;
    appointment?: IAppointment | null;
  }): Promise<Buffer> {
    const { invoice, hospital, patient, doctor, doctorUser, appointment } = data;

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Header Banner
      doc.fillColor('#0d9488').fontSize(22).font('Helvetica-Bold').text(hospital.name, { align: 'left' });
      doc.fontSize(9).font('Helvetica').fillColor('#64748b').text(
        `${hospital.address.street}, ${hospital.address.city}, ${hospital.address.state} ${hospital.address.zipCode} | Tel: ${hospital.phone}`
      );
      doc.moveDown(0.5);

      // Line
      doc.strokeColor('#0d9488').lineWidth(2).moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
      doc.moveDown(1);

      // Document Title & Metadata
      const startY = doc.y;
      doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('TAX INVOICE & RECEIPT');
      doc.moveDown(0.5);

      doc.fontSize(9).font('Helvetica').fillColor('#475569');
      doc.text(`Invoice Number: `, 40, startY + 28, { continued: true }).font('Helvetica-Bold').text(invoice.invoiceNumber).font('Helvetica');
      doc.text(
        `Invoice Date: ${new Date(invoice.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`,
        40,
        startY + 44
      );
      if (appointment) {
        doc.text(`Appointment Ref: ${appointment.appointmentNumber}`, 40, startY + 60);
      }

      // Payment Status Badge (Top right)
      const badgeY = startY + 10;
      const isPaid = invoice.paymentStatus === 'paid';
      doc.roundedRect(doc.page.width - 160, badgeY, 120, 32, 6)
        .fillColor(isPaid ? '#ecfdf5' : '#fef3c7')
        .fill();
      doc.roundedRect(doc.page.width - 160, badgeY, 120, 32, 6)
        .strokeColor(isPaid ? '#059669' : '#d97706')
        .lineWidth(1.5)
        .stroke();
      doc.fillColor(isPaid ? '#047857' : '#b45309')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(invoice.paymentStatus.toUpperCase(), doc.page.width - 160, badgeY + 9, { width: 120, align: 'center' });

      doc.y = startY + 90;

      // Billing Parties Two-Column Box
      const partyBoxY = doc.y;
      const colWidth = (doc.page.width - 100) / 2;

      // Left: Billed To
      doc.roundedRect(40, partyBoxY, colWidth, 75, 6).fillColor('#f8fafc').fill();
      doc.roundedRect(40, partyBoxY, colWidth, 75, 6).strokeColor('#e2e8f0').lineWidth(1).stroke();
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('BILLED TO (PATIENT)', 55, partyBoxY + 10);
      doc.fontSize(9).font('Helvetica').fillColor('#334155');
      doc.text(`Name: ${patient.name}`, 55, partyBoxY + 28);
      doc.text(`Email: ${patient.email}`, 55, partyBoxY + 42);
      doc.text(`Phone: ${patient.phone || 'N/A'}`, 55, partyBoxY + 56);

      // Right: Service Provider / Doctor
      doc.roundedRect(40 + colWidth + 20, partyBoxY, colWidth, 75, 6).fillColor('#f8fafc').fill();
      doc.roundedRect(40 + colWidth + 20, partyBoxY, colWidth, 75, 6).strokeColor('#e2e8f0').lineWidth(1).stroke();
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('CONSULTING PHYSICIAN', 55 + colWidth + 20, partyBoxY + 10);
      doc.fontSize(9).font('Helvetica').fillColor('#334155');
      doc.text(`Dr. ${doctorUser.name}`, 55 + colWidth + 20, partyBoxY + 28);
      doc.text(`Specialization: ${doctor.specialization}`, 55 + colWidth + 20, partyBoxY + 42);
      doc.text(`Room: ${doctor.roomNumber}`, 55 + colWidth + 20, partyBoxY + 56);

      doc.y = partyBoxY + 95;

      // Line items table
      const tableTop = doc.y;
      doc.rect(40, tableTop, doc.page.width - 80, 22).fillColor('#0f766e').fill();
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
      doc.text('#', 50, tableTop + 6);
      doc.text('Service Description', 80, tableTop + 6);
      doc.text('Department', 280, tableTop + 6);
      doc.text('Rate', 410, tableTop + 6, { width: 50, align: 'right' });
      doc.text('Amount (INR)', 470, tableTop + 6, { width: 70, align: 'right' });

      // Row 1: Doctor Consultation
      const rowY = tableTop + 26;
      doc.font('Helvetica').fontSize(9).fillColor('#1e293b');
      doc.text('1', 50, rowY);
      doc.font('Helvetica-Bold').text(`Outpatient Consultation - Dr. ${doctorUser.name}`, 80, rowY).font('Helvetica');
      doc.text(doctor.specialization, 280, rowY);
      doc.text(`₹${invoice.consultationFee.toFixed(2)}`, 410, rowY, { width: 50, align: 'right' });
      doc.text(`₹${invoice.consultationFee.toFixed(2)}`, 470, rowY, { width: 70, align: 'right' });

      // Table line
      doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(40, rowY + 20).lineTo(doc.page.width - 40, rowY + 20).stroke();

      // Calculation summary (Right aligned)
      const sumTop = rowY + 30;
      doc.fontSize(9).fillColor('#475569');
      doc.text('Subtotal:', 360, sumTop, { width: 100, align: 'right' });
      doc.text(`₹${invoice.consultationFee.toFixed(2)}`, 470, sumTop, { width: 70, align: 'right' });

      doc.text('Tax (GST 0% - Healthcare):', 340, sumTop + 18, { width: 120, align: 'right' });
      doc.text(`₹${invoice.taxAmount.toFixed(2)}`, 470, sumTop + 18, { width: 70, align: 'right' });

      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(360, sumTop + 36).lineTo(doc.page.width - 40, sumTop + 36).stroke();

      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a');
      doc.text('Total Amount:', 340, sumTop + 44, { width: 120, align: 'right' });
      doc.text(`₹${invoice.totalAmount.toFixed(2)}`, 470, sumTop + 44, { width: 70, align: 'right' });

      // Payment Details Box
      const payBoxY = sumTop + 80;
      doc.roundedRect(40, payBoxY, doc.page.width - 80, 50, 6).fillColor('#f0fdfa').fill();
      doc.roundedRect(40, payBoxY, doc.page.width - 80, 50, 6).strokeColor('#99f6e4').lineWidth(1).stroke();

      doc.fillColor('#0f766e').fontSize(9).font('Helvetica-Bold').text('PAYMENT SETTLEMENT DETAILS', 55, payBoxY + 10);
      doc.fontSize(9).font('Helvetica').fillColor('#134e4a');
      doc.text(`Mode: ${invoice.paymentMode.toUpperCase()}`, 55, payBoxY + 26);
      doc.text(
        `Date of Settlement: ${invoice.paymentDate ? new Date(invoice.paymentDate).toLocaleDateString() : 'Pending'}`,
        220,
        payBoxY + 26
      );
      doc.text(`Status: ${invoice.paymentStatus.toUpperCase()}`, 400, payBoxY + 26);

      // Official Stamp / Signature Area
      const footerY = doc.page.height - 110;
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(doc.page.width - 200, footerY).lineTo(doc.page.width - 40, footerY).stroke();
      doc.fillColor('#475569').fontSize(8.5).font('Helvetica').text('Authorized Hospital Cashier', doc.page.width - 200, footerY + 6, {
        width: 160,
        align: 'center',
      });

      // Disclaimer
      doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica').text(
        'Thank you for choosing SmartQueue Healthcare Network. All medical consultations are subject to hospital bylaws and standards of clinical practice.',
        40,
        doc.page.height - 40,
        { width: doc.page.width - 80, align: 'center' }
      );

      doc.end();
    });
  }
}
