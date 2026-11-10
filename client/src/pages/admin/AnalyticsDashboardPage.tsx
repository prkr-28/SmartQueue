import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Users,
  Clock,
  AlertOctagon,
  CreditCard,
  Download,
  Calendar,
  Building2,
  Stethoscope,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';

const PIE_COLORS = ['#0d9488', '#0284c7', '#f59e0b', '#ec4899'];

export const AnalyticsDashboardPage: React.FC = () => {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);

  // Fetch Dashboard Analytics
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['admin', 'analytics', startDate, endDate],
    queryFn: async () => {
      const res = await api.get(`/analytics/dashboard?startDate=${startDate}&endDate=${endDate}`);
      return res.data.data;
    },
  });

  const summary = analyticsData?.summary || {};
  const queueStats = analyticsData?.queueStats || {};
  const todayStats = analyticsData?.todayStats || {};
  const appointmentTrend = analyticsData?.appointmentTrend || [];
  const busiestHours = analyticsData?.busiestHours || [];
  const departmentLoad = analyticsData?.departmentLoad || [];
  const doctorPerformance = analyticsData?.doctorPerformance || [];
  const patientGrowth = analyticsData?.patientGrowth || [];
  const paymentModes = analyticsData?.paymentModes || { cash: 0, card: 0, upi: 0 };

  const paymentPieData = [
    { name: 'Cash', value: paymentModes.cash },
    { name: 'Card', value: paymentModes.card },
    { name: 'UPI', value: paymentModes.upi },
  ].filter((p) => p.value > 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Filter & CSV Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-navy-900 via-teal-950 to-navy-900 text-white shadow-md border border-navy-800">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
            Hospital Analytics & Reporting Engine
          </span>
          <h1 className="text-2xl font-black mt-0.5">Executive Operations Overview</h1>
          <p className="text-xs text-navy-300 mt-1">
            Real-time patient throughput, queue bottlenecks, revenue streams, and clinician productivity
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-navy-800/80 border border-navy-700 rounded-xl px-2.5 py-1 text-xs">
            <span className="text-navy-400 text-[10px] uppercase font-bold">Range</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-white font-mono text-xs focus:outline-none"
            />
            <span className="text-navy-400">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-white font-mono text-xs focus:outline-none"
            />
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.open(`/api/reports/appointments/export?startDate=${startDate}&endDate=${endDate}`, '_blank')}
            className="text-xs font-bold bg-white text-navy-900 hover:bg-navy-100"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Appts CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/reports/revenue/export?startDate=${startDate}&endDate=${endDate}`, '_blank')}
            className="text-xs font-bold border-navy-600 text-white hover:bg-navy-800"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Revenue CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard
          title="Total Scheduled"
          value={isLoading ? '...' : summary.totalAppointments || 0}
          icon={Users}
          description="In selected date window"
        />
        <StatCard
          title="Avg Queue Wait"
          value={isLoading ? '...' : `${queueStats.avgWaitMinutes || 12}m`}
          icon={Clock}
          description="Check-in to consultation"
          trend={queueStats.avgWaitMinutes > 20 ? { value: 'Elevated wait', isPositive: false } : undefined}
        />
        <StatCard
          title="No-Show Rate"
          value={isLoading ? '...' : `${summary.noShowRate || 0}%`}
          icon={AlertOctagon}
          description="Missed consultations"
          trend={summary.noShowRate > 10 ? { value: 'High no-show', isPositive: false } : undefined}
        />
        <StatCard
          title="Total Revenue"
          value={isLoading ? '...' : `₹${summary.totalRevenue || 0}`}
          icon={CreditCard}
          description={`₹${summary.collectedRevenue || 0} collected`}
          trend={summary.collectedRevenue > 0 ? { value: 'Revenue', isPositive: true } : undefined}
        />
        <StatCard
          title="Completed Visits"
          value={isLoading ? '...' : summary.completedAppointments || 0}
          icon={CheckCircle2}
          description="Successfully concluded"
        />
      </div>

      {/* Row 1: Volume Trend (Area Chart) & Department Load (Bar Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments Trend */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold">Daily Patient Appointment Volume</CardTitle>
              <p className="text-xs text-navy-400">Total bookings vs completed consultations</p>
            </div>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </CardHeader>
          <CardContent className="h-72">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : appointmentTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={appointmentTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorApts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '10px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area type="monotone" dataKey="appointments" name="Total Scheduled" stroke="#0d9488" fillOpacity={1} fill="url(#colorApts)" />
                  <Area type="monotone" dataKey="completed" name="Completed" stroke="#0284c7" fillOpacity={1} fill="url(#colorCompleted)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-navy-400">
                No trend data for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department Load */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold">Department Consultation Load</CardTitle>
              <p className="text-xs text-navy-400">Patient distribution across specialties</p>
            </div>
            <Building2 className="w-4 h-4 text-sky-600" />
          </CardHeader>
          <CardContent className="h-72">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : departmentLoad.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentLoad} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="code" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '10px' }} />
                  <Bar dataKey="appointments" name="Appointments" fill="#0d9488" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-navy-400">
                No department data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Busiest Hours Heatmap & Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Busiest Hours Heatmap */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Peak Consultation Hours (Traffic Heatmap)</CardTitle>
                <p className="text-xs text-navy-400">Hourly appointment concentration throughout the day</p>
              </div>
              <Clock className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent className="h-64">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : busiestHours.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={busiestHours} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '10px' }} />
                    <Bar dataKey="appointments" name="Visits" fill="#0284c7" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-navy-400">
                  No hourly data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment Modes Pie */}
        <div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Revenue Settlement by Mode</CardTitle>
              <p className="text-xs text-navy-400">Cash vs Card vs UPI Digital</p>
            </CardHeader>
            <CardContent className="h-64">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : paymentPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {paymentPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-navy-400">
                  No settled invoices in period
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 3: Clinician Productivity & Doctor Performance */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-teal-600" />
              Doctor Performance & Clinician Productivity
            </CardTitle>
            <p className="text-xs text-navy-400">Patients evaluated, consultation speeds, and room allocations</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-navy-50/75 dark:bg-navy-800/50 border-b border-navy-200 dark:border-navy-700 text-navy-500 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Doctor</th>
                  <th className="py-2.5 px-3">Specialization</th>
                  <th className="py-2.5 px-3">Room</th>
                  <th className="py-2.5 px-3">Scheduled</th>
                  <th className="py-2.5 px-3">Completed</th>
                  <th className="py-2.5 px-3">Avg Pace</th>
                  <th className="py-2.5 px-3 text-right">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100 dark:divide-navy-800">
                {doctorPerformance.map((doc: any) => {
                  const rate = doc.totalPatients > 0 ? Math.round((doc.completedPatients / doc.totalPatients) * 100) : 0;
                  return (
                    <tr key={doc.name} className="hover:bg-navy-50/40 dark:hover:bg-navy-800/30">
                      <td className="py-2.5 px-3 font-bold text-navy-900 dark:text-white">
                        Dr. {doc.name}
                      </td>
                      <td className="py-2.5 px-3 text-navy-600 dark:text-navy-300">
                        {doc.specialization}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-navy-700 dark:text-navy-400">
                        {doc.roomNumber}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold">
                        {doc.totalPatients}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-teal-700 dark:text-teal-300">
                        {doc.completedPatients}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {doc.avgConsultationMinutes || 15} mins
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="font-bold text-xs text-emerald-600">
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
