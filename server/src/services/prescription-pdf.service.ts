import PDFDocument from 'pdfkit';
import { IConsultation } from '../models/Consultation.js';
import { IAppointment } from '../models/Appointment.js';
import { IDoctorProfile } from '../models/DoctorProfile.js';
import { IHospital } from '../models/Hospital.js';
import { IUser } from '../models/User.js';

export class PrescriptionPdfService {
  static async generate(data: {
    consultation: IConsultation;
    appointment: IAppointment;
    doctor: IDoctorProfile;
    doctorUser: IUser;
    hospital: IHospital;
    patient: IUser;
  }): Promise<Buffer> {
    const { consultation, appointment, doctor, doctorUser, hospital, patient } = data;

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Header Banner
      doc.fillColor('#0d9488').fontSize(22).font('Helvetica-Bold').text(hospital.name, { align: 'left' });
      doc.fontSize(9).font('Helvetica').fillColor('#64748b').text(
        `${hospital.address.street}, ${hospital.address.city}, ${hospital.address.state} ${hospital.address.zipCode} | Tel: ${hospital.phone} | Email: ${hospital.email}`
      );
      doc.moveDown(0.5);

      // Divider line
      doc.strokeColor('#0d9488').lineWidth(2).moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
      doc.moveDown(1);

      // Doctor Info Block & Prescription Metadata
      const startY = doc.y;
      doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text(`Dr. ${doctorUser.name}`);
      doc.fontSize(9).font('Helvetica').fillColor('#475569');
      doc.text(`${doctor.specialization} | Experience: ${doctor.experienceYears} Years`);
      doc.text(`Qualifications: ${doctor.qualifications?.join(', ') || 'MBBS, MD'}`);
      doc.text(`Room: ${doctor.roomNumber}`);

      // Prescription Date & Details (Right aligned)
      doc.fontSize(9).fillColor('#475569');
      const formattedDate = new Date(consultation.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      doc.text(`Date: ${formattedDate}`, doc.page.width - 240, startY, { width: 200, align: 'right' });
      doc.text(`Appt Ref: ${appointment.appointmentNumber}`, doc.page.width - 240, startY + 14, { width: 200, align: 'right' });
      doc.text(`Consultation ID: ${consultation._id.toString().slice(-8).toUpperCase()}`, doc.page.width - 240, startY + 28, { width: 200, align: 'right' });

      doc.moveDown(2);

      // Patient Information Card
      const patientBoxY = doc.y + 10;
      doc.roundedRect(40, patientBoxY, doc.page.width - 80, 52, 6).fillColor('#f8fafc').fill();
      doc.roundedRect(40, patientBoxY, doc.page.width - 80, 52, 6).strokeColor('#e2e8f0').lineWidth(1).stroke();

      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text('PATIENT INFORMATION', 55, patientBoxY + 10);
      doc.fontSize(9).font('Helvetica').fillColor('#334155');
      doc.text(`Name: ${patient.name}`, 55, patientBoxY + 28);
      doc.text(`Email: ${patient.email}`, 220, patientBoxY + 28);
      doc.text(`Phone: ${patient.phone || 'N/A'}`, 400, patientBoxY + 28);

      doc.y = patientBoxY + 68;

      // Vitals Section (if available)
      if (consultation.vitals && Object.values(consultation.vitals).some((v) => v !== undefined && v !== '')) {
        doc.fillColor('#0d9488').fontSize(11).font('Helvetica-Bold').text('PATIENT VITALS');
        doc.moveDown(0.3);
        const vitals = consultation.vitals;
        const vitalsText = [
          vitals.bloodPressure ? `BP: ${vitals.bloodPressure}` : null,
          vitals.pulse ? `Pulse: ${vitals.pulse} bpm` : null,
          vitals.temperature ? `Temp: ${vitals.temperature} °F` : null,
          vitals.weight ? `Weight: ${vitals.weight} kg` : null,
          vitals.oxygenLevel ? `SpO2: ${vitals.oxygenLevel}%` : null,
        ]
          .filter(Boolean)
          .join('   |   ');

        doc.fillColor('#1e293b').fontSize(9).font('Helvetica').text(vitalsText || 'Normal parameters');
        doc.moveDown(1);
      }

      // Symptoms & Diagnosis
      doc.fillColor('#0d9488').fontSize(11).font('Helvetica-Bold').text('CLINICAL DIAGNOSIS');
      doc.moveDown(0.3);
      doc.fillColor('#0f172a').fontSize(10).font('Helvetica').text(`Diagnosis: ${consultation.diagnosis}`);
      if (consultation.symptoms && consultation.symptoms.length > 0) {
        doc.fontSize(9).fillColor('#475569').text(`Symptoms: ${consultation.symptoms.join(', ')}`);
      }
      doc.moveDown(1.2);

      // Rx Symbol & Prescriptions Table
      doc.fillColor('#0d9488').fontSize(16).font('Helvetica-Bold').text('℞ Prescribed Medication');
      doc.moveDown(0.4);

      // Table Header
      const tableTop = doc.y;
      doc.rect(40, tableTop, doc.page.width - 80, 20).fillColor('#0d9488').fill();
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
      doc.text('#', 48, tableTop + 5);
      doc.text('Medicine / Drug Name', 70, tableTop + 5);
      doc.text('Dosage', 240, tableTop + 5);
      doc.text('Frequency', 320, tableTop + 5);
      doc.text('Duration', 410, tableTop + 5);
      doc.text('Instructions', 470, tableTop + 5);

      let rowY = tableTop + 24;
      doc.font('Helvetica').fontSize(8.5);

      if (consultation.prescriptionItems && consultation.prescriptionItems.length > 0) {
        consultation.prescriptionItems.forEach((item, index) => {
          if (index % 2 === 1) {
            doc.rect(40, rowY - 4, doc.page.width - 80, 20).fillColor('#f8fafc').fill();
          }
          doc.fillColor('#1e293b');
          doc.text(String(index + 1), 48, rowY);
          doc.font('Helvetica-Bold').text(item.medicineName, 70, rowY).font('Helvetica');
          doc.text(item.dosage, 240, rowY);
          doc.text(item.frequency, 320, rowY);
          doc.text(item.duration, 410, rowY);
          doc.text(item.instructions || '-', 470, rowY, { width: doc.page.width - 510 });

          rowY += 22;
        });
      } else {
        doc.fillColor('#64748b').text('No prescription medication added.', 48, rowY);
        rowY += 20;
      }

      doc.y = rowY + 15;

      // Additional Notes & Lab Tests
      if (consultation.labTests && consultation.labTests.length > 0) {
        doc.fillColor('#0d9488').fontSize(10).font('Helvetica-Bold').text('RECOMMENDED INVESTIGATIONS / LAB TESTS');
        doc.fillColor('#1e293b').fontSize(9).font('Helvetica').text(consultation.labTests.join(', '));
        doc.moveDown(0.8);
      }

      if (consultation.notes) {
        doc.fillColor('#0d9488').fontSize(10).font('Helvetica-Bold').text('DOCTOR ADVICE & NOTES');
        doc.fillColor('#334155').fontSize(9).font('Helvetica').text(consultation.notes);
        doc.moveDown(0.8);
      }

      if (consultation.followUpDate) {
        const followUp = new Date(consultation.followUpDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        doc.fillColor('#0284c7').fontSize(9).font('Helvetica-Bold').text(`Follow-up Recommended On: ${followUp}`);
        doc.moveDown(1);
      }

      // Doctor Signature Block (Bottom right)
      const sigY = doc.page.height - 120;
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(doc.page.width - 220, sigY).lineTo(doc.page.width - 40, sigY).stroke();
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text(`Dr. ${doctorUser.name}`, doc.page.width - 220, sigY + 5, { width: 180, align: 'center' });
      doc.fontSize(8).font('Helvetica').fillColor('#64748b').text(`Digitally Authenticated`, doc.page.width - 220, sigY + 18, { width: 180, align: 'center' });

      // Disclaimer footer
      doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica').text(
        'This is a computer-generated electronic medical prescription generated through SmartQueue Healthcare SaaS. Valid without physical signature when verified via hospital system.',
        40,
        doc.page.height - 45,
        { width: doc.page.width - 80, align: 'center' }
      );

      doc.end();
    });
  }
}
