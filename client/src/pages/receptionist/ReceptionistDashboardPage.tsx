import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  CalendarPlus,
  QrCode,
  CreditCard,
  Tv,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { api } from '../../services/api';
import { StatCard } from '../../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';

export const ReceptionistDashboardPage: React.FC = () => {
  const today = new Date().toISOString().slice(0, 10);

  // Fetch today's appointments
  const { data: appointmentsData, isLoading: loadingApts } = useQuery({
    queryKey: ['receptionist', 'appointments', today],
    queryFn: async () => {
      const res = await api.get(`/appointments?date=${today}&limit=100`);
      return res.data.data.items || [];
    },
    refetchInterval: 15000,
  });

  // Fetch daily billing summary
  const { data: billingData, isLoading: loadingBilling } = useQuery({
    queryKey: ['receptionist', 'billing-summary', today],
    queryFn: async () => {
      const res = await api.get(`/invoices/daily-summary?date=${today}`);
      return res.data.data;
    },
    refetchInterval: 30000,
  });

  // Fetch hospital display data to see doctors' queues
  const { data: displayData, isLoading: loadingDisplay } = useQuery({
    queryKey: ['receptionist', 'display-queues'],
    queryFn: async () => {
      // Find hospital first
      const hospRes = await api.get('/hospitals');
      const hospitalId = hospRes.data.data[0]?._id;
      if (!hospitalId) return null;
      const res = await api.get(`/queue/display/${hospitalId}`);
      return res.data.data;
    },
    refetchInterval: 10000,
  });

  const apts = appointmentsData || [];
  const totalToday = apts.length;
  const waitingCount = apts.filter((a: any) => a.status === 'checked_in').length;
  const inConsultCount = apts.filter((a: any) => a.status === 'in_consultation').length;
  const completedCount = apts.filter((a: any) => a.status === 'completed').length;
  const noShowCount = apts.filter((a: any) => a.status === 'no_show').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-teal-700 via-medical-600 to-sky-700 text-white shadow-md">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-200">Reception Desk Overview</span>
          <h1 className="text-2xl font-black mt-0.5">Today's Patient Flow</h1>
          <p className="text-xs text-teal-100 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/receptionist/walk-in">
            <Button variant="secondary" size="sm" className="bg-white text-teal-800 hover:bg-teal-50 border-0 font-bold shadow-sm">
              <CalendarPlus className="w-4 h-4 mr-1.5" />
              New Walk-in
            </Button>
          </Link>
          <Link to="/receptionist/scan">
            <Button variant="outline" size="sm" className="border-teal-300 text-white hover:bg-white/10 font-bold">
              <QrCode className="w-4 h-4 mr-1.5" />
              Scan QR
            </Button>
          </Link>
          <Link to="/receptionist/billing">
            <Button variant="outline" size="sm" className="border-teal-300 text-white hover:bg-white/10 font-bold">
              <CreditCard className="w-4 h-4 mr-1.5" />
              Cashier Desk
            </Button>
          </Link>
          <Link to="/display" target="_blank">
            <Button variant="outline" size="sm" className="border-teal-300 text-white hover:bg-white/10 font-bold">
              <Tv className="w-4 h-4 mr-1.5" />
              Waiting TV
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard
          title="Today's Total"
          value={loadingApts ? '...' : totalToday}
          icon={Users}
          description="Total scheduled patients"
        />
        <StatCard
          title="In Waiting Area"
          value={loadingApts ? '...' : waitingCount}
          icon={Clock}
          description="Checked-in & queued"
          trend={waitingCount > 0 ? { value: `${waitingCount} waiting`, isPositive: false } : undefined}
        />
        <StatCard
          title="In Consultation"
          value={loadingApts ? '...' : inConsultCount}
          icon={TrendingUp}
          description="With doctors now"
        />
        <StatCard
          title="Completed"
          value={loadingApts ? '...' : completedCount}
          icon={CheckCircle2}
          description="Consultation finished"
        />
        <StatCard
          title="Collections"
          value={loadingBilling ? '...' : `₹${billingData?.totalCollected || 0}`}
          icon={CreditCard}
          description={`₹${billingData?.totalPending || 0} pending`}
          trend={billingData?.paidCount ? { value: `${billingData.paidCount} bills`, isPositive: true } : undefined}
        />
      </div>

      {/* Doctor Queues Live Feed & Recent Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Doctor Live Counters */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold">Doctor Live Counters & Waiting Room</CardTitle>
                <p className="text-xs text-navy-500 dark:text-navy-400">Live token statuses pushing to waiting room monitors</p>
              </div>
              <Link to="/receptionist/queue">
                <Button variant="ghost" size="sm" className="text-xs text-medical-600 dark:text-medical-400">
                  Manage Board <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loadingDisplay ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : displayData?.departments && displayData.departments.length > 0 ? (
                <div className="space-y-4">
                  {displayData.departments.map((dept: any) => (
                    <div key={dept.departmentName} className="rounded-xl border border-navy-100 dark:border-navy-800 p-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-navy-800 dark:text-navy-200">
                          {dept.departmentName}
                        </span>
                        <span className="text-[10px] text-navy-400">
                          {dept.doctors?.length || 0} Doctor(s) active
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {dept.doctors.map((doc: any) => (
                          <div
                            key={doc.doctorId}
                            className="p-3 rounded-lg bg-navy-50 dark:bg-navy-800/60 border border-navy-100 dark:border-navy-700/60 flex items-center justify-between"
                          >
                            <div>
                              <p className="text-xs font-bold text-navy-900 dark:text-white truncate max-w-[130px]">
                                {doc.doctorName}
                              </p>
                              <p className="text-[10px] text-navy-500 dark:text-navy-400">
                                {doc.roomNumber} • {doc.specialization}
                              </p>
                              <div className="flex items-center gap-1 mt-1 text-[10px] text-navy-400">
                                <span>Next:</span>
                                {doc.nextTokens?.length > 0 ? (
                                  doc.nextTokens.slice(0, 3).map((t: string) => (
                                    <span key={t} className="px-1 py-0.5 rounded bg-navy-200 dark:bg-navy-700 text-navy-800 dark:text-navy-200 font-mono">
                                      {t}
                                    </span>
                                  ))
                                ) : (
                                  <span className="italic">Queue clear</span>
                                )}
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-[9px] uppercase tracking-wider text-navy-400 font-bold block">Serving</span>
                              <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                                {doc.nowServingToken || '—'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-navy-400">
                  No active queues found for today.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Quick Patient Check-In & Action list */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Upcoming / Unchecked In</CardTitle>
              <p className="text-xs text-navy-500 dark:text-navy-400">Patients booked for today awaiting arrival</p>
            </CardHeader>
            <CardContent>
              {loadingApts ? (
                <div className="space-y-2.5">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : apts.filter((a: any) => a.status === 'booked').length > 0 ? (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {apts
                    .filter((a: any) => a.status === 'booked')
                    .slice(0, 8)
                    .map((apt: any) => (
                      <div
                        key={apt._id}
                        className="p-2.5 rounded-xl border border-navy-100 dark:border-navy-800 hover:border-teal-500/40 bg-white dark:bg-navy-900 transition-all flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-navy-900 dark:text-white">
                            {apt.patientId?.name || 'Walk-in Patient'}
                          </p>
                          <p className="text-[10px] text-navy-500 dark:text-navy-400">
                            {apt.startTime} • Dr. {apt.doctorId?.userId?.name || 'Doctor'}
                          </p>
                        </div>
                        <Link to={`/receptionist/appointments?search=${apt.appointmentNumber}`}>
                          <Button size="sm" variant="outline" className="text-xs font-bold h-7 px-2 text-teal-700 dark:text-teal-300">
                            Check In
                          </Button>
                        </Link>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-navy-400">
                  All today's patients have been checked in or processed!
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-navy-100 dark:border-navy-800">
                <Link to="/receptionist/appointments">
                  <Button variant="ghost" size="sm" className="w-full text-xs font-semibold text-medical-600">
                    View All Today's Appointments ({apts.length})
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
