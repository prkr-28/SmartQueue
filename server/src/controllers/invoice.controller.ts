import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice.js';
import { Appointment } from '../models/Appointment.js';
import { Hospital } from '../models/Hospital.js';
import { User } from '../models/User.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { AppError } from '../middlewares/errorHandler.js';
import { AuditService } from '../services/audit.service.js';
import { InvoicePdfService } from '../services/invoice-pdf.service.js';

export class InvoiceController {
  static async getInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 15));
      const skip = (page - 1) * limit;

      const query: any = {};

      if (req.user!.role === 'patient') {
        query.patientId = req.user!.id;
      } else if (req.query.patientId) {
        query.patientId = req.query.patientId;
      }

      if (req.query.status) {
        query.paymentStatus = req.query.status;
      }

      if (req.query.hospitalId) {
        query.hospitalId = req.query.hospitalId;
      }

      if (req.query.startDate || req.query.endDate) {
        query.createdAt = {};
        if (req.query.startDate) {
          query.createdAt.$gte = new Date(req.query.startDate as string);
        }
        if (req.query.endDate) {
          const endDate = new Date(req.query.endDate as string);
          endDate.setHours(23, 59, 59, 999);
          query.createdAt.$lte = endDate;
        }
      }

      const [items, total] = await Promise.all([
        Invoice.find(query)
          .populate('patientId', 'name email phone')
          .populate({
            path: 'doctorId',
            populate: { path: 'userId', select: 'name email' },
          })
          .populate('appointmentId', 'appointmentNumber date startTime')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Invoice.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        data: {
          items,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getInvoiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const invoice = await Invoice.findById(req.params.id)
        .populate('patientId', 'name email phone')
        .populate({
          path: 'doctorId',
          populate: { path: 'userId', select: 'name email' },
        })
        .populate('appointmentId')
        .populate('hospitalId');

      if (!invoice) {
        throw new AppError('Invoice not found', 404);
      }

      // IDOR check
      if (req.user!.role === 'patient' && invoice.patientId._id.toString() !== req.user!.id) {
        throw new AppError('Unauthorized access to invoice', 403);
      }

      res.status(200).json({ success: true, data: invoice });
    } catch (error) {
      next(error);
    }
  }

  static async markPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { paymentMode, notes } = req.body;

      const invoice = await Invoice.findById(id);
      if (!invoice) {
        throw new AppError('Invoice not found', 404);
      }

      if (invoice.paymentStatus === 'paid') {
        res.status(200).json({ success: true, message: 'Invoice is already settled as paid', data: invoice });
        return;
      }

      invoice.paymentStatus = 'paid';
      invoice.paymentMode = paymentMode || 'cash';
      invoice.paymentDate = new Date();
      if (notes) invoice.notes = notes;
      await invoice.save();

      // Synchronize appointment payment status
      await Appointment.findByIdAndUpdate(invoice.appointmentId, {
        paymentStatus: 'paid',
      });

      await AuditService.log({
        actorId: req.user!.id,
        action: 'INVOICE_PAID',
        entity: 'Invoice',
        entityId: invoice._id.toString(),
        details: { invoiceNumber: invoice.invoiceNumber, amount: invoice.totalAmount, paymentMode },
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Payment recorded successfully',
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDailySummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);
      const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

      const [summary] = await Invoice.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfDay, $lte: endOfDay },
          },
        },
        {
          $group: {
            _id: null,
            totalBilled: { $sum: '$totalAmount' },
            totalCollected: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0],
              },
            },
            totalPending: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$totalAmount', 0],
              },
            },
            paidCount: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0],
              },
            },
            pendingCount: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0],
              },
            },
            cashTotal: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$paymentStatus', 'paid'] }, { $eq: ['$paymentMode', 'cash'] }] },
                  '$totalAmount',
                  0,
                ],
              },
            },
            cardTotal: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$paymentStatus', 'paid'] }, { $eq: ['$paymentMode', 'card'] }] },
                  '$totalAmount',
                  0,
                ],
              },
            },
            upiTotal: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$paymentStatus', 'paid'] }, { $eq: ['$paymentMode', 'upi'] }] },
                  '$totalAmount',
                  0,
                ],
              },
            },
          },
        },
      ]);

      const result = summary || {
        totalBilled: 0,
        totalCollected: 0,
        totalPending: 0,
        paidCount: 0,
        pendingCount: 0,
        cashTotal: 0,
        cardTotal: 0,
        upiTotal: 0,
      };

      res.status(200).json({
        success: true,
        data: {
          date: dateStr,
          ...result,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async downloadInvoicePdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const invoice = await Invoice.findById(id);
      if (!invoice) {
        throw new AppError('Invoice not found', 404);
      }

      // IDOR check
      if (req.user!.role === 'patient' && invoice.patientId.toString() !== req.user!.id) {
        throw new AppError('Unauthorized access to invoice document', 403);
      }

      const hospital = await Hospital.findById(invoice.hospitalId);
      const patient = await User.findById(invoice.patientId);
      const doctor = await DoctorProfile.findById(invoice.doctorId);
      const doctorUser = doctor ? await User.findById(doctor.userId) : null;
      const appointment = await Appointment.findById(invoice.appointmentId);

      if (!hospital || !patient || !doctor || !doctorUser) {
        throw new AppError('Associated billing entities missing', 404);
      }

      const pdfBuffer = await InvoicePdfService.generate({
        invoice,
        hospital,
        patient,
        doctor,
        doctorUser,
        appointment,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
}
