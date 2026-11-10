import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Appointment } from '../models/Appointment.js';
import { QueueEntry } from '../models/QueueEntry.js';
import { Invoice } from '../models/Invoice.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { Department } from '../models/Department.js';
import { User } from '../models/User.js';

export class AnalyticsController {
  static async getDashboardAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const startDateStr = (req.query.startDate as string) || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const endDateStr = (req.query.endDate as string) || todayStr;

      // 1. Today's Appointment Counts
      const todayAppointments = await Appointment.aggregate([
        { $match: { date: todayStr } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      const todayStats = {
        total: 0,
        booked: 0,
        checked_in: 0,
        in_consultation: 0,
        completed: 0,
        cancelled: 0,
        no_show: 0,
      };

      todayAppointments.forEach((item) => {
        if (item._id in todayStats) {
          (todayStats as any)[item._id] = item.count;
        }
        todayStats.total += item.count;
      });

      // 2. Queue Wait Times & Active Status
      const [queueStats] = await QueueEntry.aggregate([
        { $match: { date: todayStr } },
        {
          $group: {
            _id: null,
            totalActiveWaiting: {
              $sum: { $cond: [{ $in: ['$status', ['waiting', 'called']] }, 1, 0] },
            },
            totalInConsultation: {
              $sum: { $cond: [{ $eq: ['$status', 'in_consultation'] }, 1, 0] },
            },
            avgWaitMinutes: {
              $avg: {
                $cond: [
                  { $and: ['$startTime', '$checkInTime'] },
                  { $divide: [{ $subtract: ['$startTime', '$checkInTime'] }, 60000] },
                  null,
                ],
              },
            },
          },
        },
      ]);

      // 3. Overall Range Counts & No-Show Rate
      const [rangeStats] = await Appointment.aggregate([
        {
          $match: {
            date: { $gte: startDateStr, $lte: endDateStr },
          },
        },
        {
          $group: {
            _id: null,
            totalAppointments: { $sum: 1 },
            completedAppointments: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
            noShowAppointments: {
              $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] },
            },
            cancelledAppointments: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
            },
          },
        },
      ]);

      const totalApts = rangeStats?.totalAppointments || 0;
      const noShowApts = rangeStats?.noShowAppointments || 0;
      const noShowRate = totalApts > 0 ? Number(((noShowApts / totalApts) * 100).toFixed(1)) : 0;

      // 4. Revenue Aggregation
      const [revenueStats] = await Invoice.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(`${startDateStr}T00:00:00.000Z`),
              $lte: new Date(`${endDateStr}T23:59:59.999Z`),
            },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            collectedRevenue: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] },
            },
            pendingRevenue: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$totalAmount', 0] },
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

      // 5. Daily Appointments Volume Trend
      const appointmentTrend = await Appointment.aggregate([
        {
          $match: {
            date: { $gte: startDateStr, $lte: endDateStr },
          },
        },
        {
          $group: {
            _id: '$date',
            appointments: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            date: '$_id',
            appointments: 1,
            completed: 1,
            cancelled: 1,
            _id: 0,
          },
        },
      ]);

      // 6. Busiest Hours Heatmap
      const busiestHours = await Appointment.aggregate([
        {
          $match: {
            date: { $gte: startDateStr, $lte: endDateStr },
          },
        },
        {
          $group: {
            _id: { $substr: ['$startTime', 0, 2] },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            hour: { $concat: ['$_id', ':00'] },
            appointments: '$count',
            _id: 0,
          },
        },
      ]);

      // 7. Department Load Distribution
      const departmentLoad = await Appointment.aggregate([
        {
          $match: {
            date: { $gte: startDateStr, $lte: endDateStr },
          },
        },
        {
          $group: {
            _id: '$departmentId',
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'departments',
            localField: '_id',
            foreignField: '_id',
            as: 'dept',
          },
        },
        { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            name: { $ifNull: ['$dept.name', 'General'] },
            code: { $ifNull: ['$dept.code', 'GEN'] },
            appointments: '$count',
            _id: 0,
          },
        },
        { $sort: { appointments: -1 } },
      ]);

      // 8. Doctor Performance Metrics
      const doctorPerformance = await DoctorProfile.aggregate([
        { $match: { isActive: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $lookup: {
            from: 'appointments',
            let: { docId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$doctorId', '$$docId'] },
                      { $gte: ['$date', startDateStr] },
                      { $lte: ['$date', endDateStr] },
                    ],
                  },
                },
              },
            ],
            as: 'apts',
          },
        },
        {
          $project: {
            name: '$user.name',
            specialization: 1,
            roomNumber: 1,
            avgConsultationMinutes: 1,
            totalPatients: { $size: '$apts' },
            completedPatients: {
              $size: {
                $filter: {
                  input: '$apts',
                  as: 'a',
                  cond: { $eq: ['$$a.status', 'completed'] },
                },
              },
            },
          },
        },
        { $sort: { totalPatients: -1 } },
        { $limit: 10 },
      ]);

      // 9. Patient Registration Growth
      const patientGrowth = await User.aggregate([
        { $match: { role: 'patient' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            newPatients: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 30 },
        {
          $project: {
            date: '$_id',
            newPatients: 1,
            _id: 0,
          },
        },
      ]);

      res.status(200).json({
        success: true,
        data: {
          period: { startDate: startDateStr, endDate: endDateStr },
          todayStats,
          queueStats: {
            waitingCount: queueStats?.totalActiveWaiting || 0,
            inConsultationCount: queueStats?.totalInConsultation || 0,
            avgWaitMinutes: Math.round(queueStats?.avgWaitMinutes || 12),
          },
          summary: {
            totalAppointments: totalApts,
            completedAppointments: rangeStats?.completedAppointments || 0,
            noShowRate,
            totalRevenue: revenueStats?.totalRevenue || 0,
            collectedRevenue: revenueStats?.collectedRevenue || 0,
            pendingRevenue: revenueStats?.pendingRevenue || 0,
          },
          paymentModes: {
            cash: revenueStats?.cashTotal || 0,
            card: revenueStats?.cardTotal || 0,
            upi: revenueStats?.upiTotal || 0,
          },
          appointmentTrend,
          busiestHours,
          departmentLoad,
          doctorPerformance,
          patientGrowth,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
