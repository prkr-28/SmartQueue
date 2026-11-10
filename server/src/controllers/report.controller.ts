import { Request, Response, NextFunction } from 'express';
import { Appointment } from '../models/Appointment.js';
import { Invoice } from '../models/Invoice.js';

export class ReportController {
  static async exportAppointmentsCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate, status } = req.query;
      const query: any = {};

      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = startDate;
        if (endDate) query.date.$lte = endDate;
      }

      if (status) {
        query.status = status;
      }

      const appointments = await Appointment.find(query)
        .populate('patientId', 'name email phone')
        .populate({
          path: 'doctorId',
          populate: { path: 'userId', select: 'name' },
        })
        .populate('departmentId', 'name code')
        .sort({ date: -1, startTime: -1 });

      const headers = [
        'Appointment Number',
        'Date',
        'Time Slot',
        'Patient Name',
        'Patient Phone',
        'Department',
        'Doctor Name',
        'Visit Type',
        'Priority',
        'Status',
        'Fee (INR)',
        'Payment Status',
      ];

      const rows = appointments.map((apt: any) => [
        `"${apt.appointmentNumber}"`,
        `"${apt.date}"`,
        `"${apt.startTime} - ${apt.endTime}"`,
        `"${apt.patientId?.name || 'N/A'}"`,
        `"${apt.patientId?.phone || 'N/A'}"`,
        `"${apt.departmentId?.name || 'General'}"`,
        `"Dr. ${apt.doctorId?.userId?.name || 'Doctor'}"`,
        `"${apt.visitType}"`,
        `"${apt.priority || 'normal'}"`,
        `"${apt.status}"`,
        apt.consultationFee,
        `"${apt.paymentStatus}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="smartqueue-appointments-${Date.now()}.csv"`
      );
      res.send(csvContent);
    } catch (error) {
      next(error);
    }
  }

  static async exportRevenueCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate, status } = req.query;
      const query: any = {};

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate as string);
        if (endDate) {
          const end = new Date(endDate as string);
          end.setHours(23, 59, 59, 999);
          query.createdAt.$lte = end;
        }
      }

      if (status) {
        query.paymentStatus = status;
      }

      const invoices = await Invoice.find(query)
        .populate('patientId', 'name email phone')
        .populate({
          path: 'doctorId',
          populate: { path: 'userId', select: 'name' },
        })
        .sort({ createdAt: -1 });

      const headers = [
        'Invoice Number',
        'Date Created',
        'Patient Name',
        'Patient Email',
        'Doctor Name',
        'Consultation Fee',
        'Tax Amount',
        'Total Amount (INR)',
        'Payment Status',
        'Payment Mode',
        'Settlement Date',
      ];

      const rows = invoices.map((inv: any) => [
        `"${inv.invoiceNumber}"`,
        `"${new Date(inv.createdAt).toISOString().slice(0, 10)}"`,
        `"${inv.patientId?.name || 'N/A'}"`,
        `"${inv.patientId?.email || 'N/A'}"`,
        `"Dr. ${inv.doctorId?.userId?.name || 'Doctor'}"`,
        inv.consultationFee,
        inv.taxAmount,
        inv.totalAmount,
        `"${inv.paymentStatus}"`,
        `"${inv.paymentMode}"`,
        `"${inv.paymentDate ? new Date(inv.paymentDate).toISOString().slice(0, 10) : 'Pending'}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="smartqueue-revenue-${Date.now()}.csv"`
      );
      res.send(csvContent);
    } catch (error) {
      next(error);
    }
  }
}
