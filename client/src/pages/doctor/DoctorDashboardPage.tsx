import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  CheckCircle2,
  Calendar,
  Play,
  ArrowRight,
  TrendingUp,
  Stethoscope,
  Activity,
  Pause,
} from 'lucide-react';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';

export const DoctorDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  // Fetch doctor profile
  const { data: profileData, isLoading: loadingProfile } = useQuery({
    queryKey: ['doctor', 'my-profile'],
    queryFn: async () => {
      const res = await api.get('/doctors/profile/me');
      return res.data.data;
    },
  });

  const doctor = profileData?.doctor;
  const doctorId = doctor?._id;

  // Fetch doctor live queue
  const { data: queueData, isLoading: loadingQueue } = useQuery({
    queryKey: ['doctor', 'queue', doctorId],
    queryFn: async () => {
      if (!doctorId) return null;
      const res = await api.get(`/queue/doctor/${doctorId}?date=${today}`);
      return res.data.data;
    },
    enabled: !!doctorId,
    refetchInterval: 10000,
  });

  // Fetch today's appointments for this doctor
  const { data: appointments, isLoading: loadingApts } = useQuery({
    queryKey: ['doctor', 'appointments', doctorId, today],
    queryFn: async () => {
      if (!doctorId) return [];
      const res = await api.get(`/doctors/${doctorId}/appointments?date=${today}`);
      return res.data.data || [];
    },
    enabled: !!doctorId,
    refetchInterval: 15000,
  });

  const apts = appointments || [];
  const totalPatients = apts.length;
  const waitingPatients = queueData?.activeEntries?.filter((e: any) => e.status === 'waiting' || e.status === 'recalled') || [];
  const nowServing = queueData?.nowServing;
  const completedCount = apts.filter((a: any) => a.status === 'completed').length;
  const avgMinutes = doctor?.avgConsultationMinutes || 15;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-800 via-teal-700 to-sky-800 text-white shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-200">
            Consulting Physician Console
          </span>
          <h1 className="text-2xl font-black mt-0.5">
            Dr. {doctor?.userId?.name || 'Doctor'}
          </h1>
          <p className="text-xs text-teal-100 mt-1">
            {doctor?.specialization} • Room {doctor?.roomNumber} • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/doctor/queue">
            <Button variant="secondary" size="sm" className="bg-white text-teal-800 hover:bg-teal-50 border-0 font-bold shadow-sm">
              <Clock className="w-4 h-4 mr-1.5" />
              Open Live Queue
            </Button>
          </Link>
          <Link to="/doctor/schedule">
            <Button variant="outline" size="sm" className="border-teal-300 text-white hover:bg-white/10 font-bold">
              <Calendar className="w-4 h-4 mr-1.5" />
              Schedule & Leaves
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Patients"
          value={loadingApts ? '...' : totalPatients}
          icon={Users}
          description="Total scheduled visits"
        />
        <StatCard
          title="In Waiting Line"
          value={loadingQueue ? '...' : waitingPatients.length}
          icon={Clock}
          description="Checked-in outside room"
          trend={waitingPatients.length > 0 ? { value: `${waitingPatients.length} queued`, isPositive: false } : undefined}
        />
        <StatCard
          title="Completed Today"
          value={loadingApts ? '...' : completedCount}
          icon={CheckCircle2}
          description="Consultations concluded"
        />
        <StatCard
          title="Avg Consultation"
          value={`${avgMinutes} mins`}
          icon={Activity}
          description="Rolling average time"
        />
      </div>

      {/* Main Focus: Now Serving & Next Patient */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Now Serving Patient Card */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-2 border-teal-500/30">
            <CardHeader className="bg-teal-50/50 dark:bg-teal-950/20 pb-3 border-b border-navy-100 dark:border-navy-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-teal-900 dark:text-teal-200">
                  <Stethoscope className="w-4 h-4 text-teal-600" />
                  Currently in Consultation Room
                </CardTitle>
                <p className="text-xs text-navy-500 dark:text-navy-400">
                  Active patient consultation session
                </p>
              </div>

              {nowServing && (
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  IN ROOM
                </span>
              )}
            </CardHeader>
            <CardContent className="p-6">
              {loadingQueue ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : nowServing ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-navy-50 dark:bg-navy-800/60 border border-navy-200 dark:border-navy-700">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600">
                        Serving Token
                      </span>
                      <h3 className="text-3xl font-black font-mono text-navy-900 dark:text-white">
                        {nowServing.tokenNumber}
                      </h3>
                      <p className="text-sm font-bold text-navy-800 dark:text-navy-200 mt-1">
                        {nowServing.patientId?.name || 'Patient'}
                      </p>
                      <p className="text-xs text-navy-500 dark:text-navy-400">
                        {nowServing.patientId?.phone || nowServing.patientId?.email}
                      </p>
                    </div>

                    <div className="flex flex-col sm:items-end gap-2">
                      <Badge variant={nowServing.priority === 'emergency' ? 'danger' : 'info'}>
                        {nowServing.priority.toUpperCase()} PRIORITY
                      </Badge>
                      <Link to={`/doctor/consultation/${nowServing.appointmentId?._id || nowServing.appointmentId}`}>
                        <Button variant="primary" size="md" className="font-bold shadow-md">
                          <Stethoscope className="w-4 h-4 mr-1.5" />
                          Record Consultation & Vitals
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-600 mx-auto flex items-center justify-center">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-navy-900 dark:text-white">
                      No Patient Currently in Consultation
                    </p>
                    <p className="text-xs text-navy-500 dark:text-navy-400 mt-0.5">
                      {waitingPatients.length > 0
                        ? `${waitingPatients.length} patient(s) waiting outside your room`
                        : 'Your waiting queue is currently clear'}
                    </p>
                  </div>
                  {waitingPatients.length > 0 && (
                    <Link to="/doctor/queue">
                      <Button variant="primary" className="font-bold shadow-sm">
                        <Play className="w-4 h-4 mr-1.5" />
                        Call Next Patient ({waitingPatients[0]?.tokenNumber})
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Up Next Queue Preview */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Upcoming in Queue</CardTitle>
                <p className="text-xs text-navy-500 dark:text-navy-400">Next patients waiting</p>
              </div>
              <Link to="/doctor/queue">
                <Button variant="ghost" size="sm" className="text-xs text-teal-600">
                  Full Queue <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loadingQueue ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : waitingPatients.length > 0 ? (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {waitingPatients.slice(0, 5).map((entry: any, index: number) => (
                    <div
                      key={entry._id}
                      className="p-2.5 rounded-xl border border-navy-100 dark:border-navy-800 bg-white dark:bg-navy-900 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center text-[10px]">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-bold font-mono text-navy-900 dark:text-white">
                            {entry.tokenNumber}
                          </p>
                          <p className="text-[10px] text-navy-500 dark:text-navy-400">
                            {entry.patientId?.name || 'Patient'}
                          </p>
                        </div>
                      </div>

                      <Badge variant={entry.priority === 'emergency' ? 'danger' : 'default'}>
                        {entry.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-navy-400">
                  No patients waiting in queue right now.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
