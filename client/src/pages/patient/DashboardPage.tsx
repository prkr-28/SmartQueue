import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Calendar,
  Clock,
  UserCheck,
  ArrowRight,
  Download,
  AlertCircle,
  Activity,
  PlusCircle,
  FileText,
  Users,
} from 'lucide-react';
import { AppointmentDto, QueueEntryDto } from '@smartqueue/shared';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [upcomingAppointment, setUpcomingAppointment] = useState<AppointmentDto | null>(null);
  const [liveQueue, setLiveQueue] = useState<{
    entry: QueueEntryDto | null;
    peopleAhead: number;
    estimatedWaitMinutes: number;
    doctorName?: string;
    roomNumber?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [aptRes, queueRes] = await Promise.all([
        api.get('/appointments?status=booked&limit=1'),
        api.get('/queue/patient/live'),
      ]);

      if (aptRes.data.success && aptRes.data.data.items?.length > 0) {
        setUpcomingAppointment(aptRes.data.data.items[0]);
      }

      if (queueRes.data.success) {
        setLiveQueue(queueRes.data.data);
      }
    } catch (err) {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadSlip = async (appointmentId: string) => {
    try {
      const response = await api.get(`/appointments/${appointmentId}/slip`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `smartqueue-appointment-${appointmentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      // Error
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-medical-600 via-medical-700 to-teal-800 text-white p-6 sm:p-8 shadow-card">
        <div className="relative z-10 max-w-2xl">
          <Badge variant="primary" className="bg-white/20 text-white border-white/20 mb-3">
            Patient Portal
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Hello, {user?.name.split(' ')[0]} 👋
          </h2>
          <p className="mt-2 text-sm text-teal-100 max-w-xl">
            Welcome to your healthcare dashboard. You can track real-time queue position, schedule consultations, and access appointment slips.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/patient/book">
              <Button size="sm" className="bg-white text-medical-800 hover:bg-teal-50 border-none shadow">
                <PlusCircle className="w-4 h-4 mr-1.5" /> Book Consultation
              </Button>
            </Link>
            <Link to="/patient/queue">
              <Button size="sm" variant="outline" className="border-white/40 text-white hover:bg-white/10">
                <Clock className="w-4 h-4 mr-1.5" /> Track Live Queue
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Upcoming Appointment & Live Queue */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Card 1: Active Live Queue */}
        <Card className="flex flex-col justify-between border-medical-200 dark:border-medical-900 bg-gradient-to-b from-medical-50/30 to-transparent dark:from-medical-950/20">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-navy-100 dark:border-navy-800">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="text-sm font-bold text-navy-900 dark:text-white uppercase tracking-wider">
                  Live Queue Status
                </h3>
              </div>
              <Badge variant="success">LIVE NOW</Badge>
            </div>

            {isLoading ? (
              <div className="py-6 space-y-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : liveQueue && liveQueue.entry ? (
              <div className="py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-navy-500 font-semibold uppercase">Your Token Number</span>
                    <h1 className="text-4xl font-black text-medical-600 dark:text-medical-400 mt-1">
                      {liveQueue.entry.tokenNumber}
                    </h1>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-navy-500 font-semibold uppercase">Room Number</span>
                    <p className="text-xl font-bold text-navy-900 dark:text-white mt-1">
                      {liveQueue.roomNumber || 'Room 101'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 p-3 rounded-xl bg-white dark:bg-navy-800 border border-navy-200 dark:border-navy-700">
                  <div>
                    <p className="text-[11px] text-navy-400 font-medium">Patients Ahead</p>
                    <p className="text-lg font-bold text-navy-900 dark:text-white">
                      {liveQueue.peopleAhead} person(s)
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-navy-400 font-medium">Estimated Wait Time</p>
                    <p className="text-lg font-bold text-navy-900 dark:text-white">
                      ~{liveQueue.estimatedWaitMinutes} mins
                    </p>
                  </div>
                </div>

                {liveQueue.peopleAhead <= 3 && (
                  <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Your turn is near! Please wait outside Room {liveQueue.roomNumber}.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Clock className="w-10 h-10 text-navy-300 dark:text-navy-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-navy-800 dark:text-navy-200">No active queue check-in</p>
                <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
                  Once you check-in for today's appointment, your live token and wait time will appear here.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-navy-100 dark:border-navy-800">
            <Link to="/patient/queue" className="w-full block">
              <Button variant="outline" size="sm" className="w-full justify-between">
                <span>Open Full Screen Tracker</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Card 2: Upcoming Appointment */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-navy-100 dark:border-navy-800">
              <div className="flex items-center gap-2 text-navy-900 dark:text-white">
                <Calendar className="w-4 h-4 text-medical-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Upcoming Appointment</h3>
              </div>
              {upcomingAppointment && <Badge variant="primary">{upcomingAppointment.status}</Badge>}
            </div>

            {isLoading ? (
              <div className="py-6 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : upcomingAppointment ? (
              <div className="py-5 space-y-3">
                <div>
                  <span className="text-xs text-navy-400 uppercase font-semibold">Appointment #</span>
                  <p className="text-lg font-bold text-navy-900 dark:text-white">
                    {upcomingAppointment.appointmentNumber}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-navy-50 dark:bg-navy-800/60 border border-navy-200 dark:border-navy-700/60 text-xs space-y-1.5">
                  <p className="text-navy-700 dark:text-navy-300 font-semibold">
                    Doctor: <span className="font-normal">Dr. {((upcomingAppointment.doctorId as any)?.userId?.name) || 'Specialist'}</span>
                  </p>
                  <p className="text-navy-700 dark:text-navy-300 font-semibold">
                    Department: <span className="font-normal">{(upcomingAppointment.departmentId as any)?.name}</span>
                  </p>
                  <p className="text-navy-700 dark:text-navy-300 font-semibold">
                    Scheduled Time: <span className="font-bold text-medical-600 dark:text-medical-400">{upcomingAppointment.date} at {upcomingAppointment.startTime}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <Calendar className="w-10 h-10 text-navy-300 dark:text-navy-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-navy-800 dark:text-navy-200">No upcoming appointments</p>
                <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
                  Ready to consult with a specialist? Select a department and book your time slot.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-navy-100 dark:border-navy-800 flex gap-2">
            {upcomingAppointment ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-1/2"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={() => handleDownloadSlip(upcomingAppointment._id)}
                >
                  Download Slip
                </Button>
                <Link to="/patient/appointments" className="w-1/2">
                  <Button variant="primary" size="sm" className="w-full">
                    Manage
                  </Button>
                </Link>
              </>
            ) : (
              <Link to="/patient/book" className="w-full">
                <Button variant="primary" size="sm" className="w-full">
                  Book Now
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/patient/doctors" className="group">
          <Card hoverable className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 group-hover:scale-110 transition-transform">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-navy-900 dark:text-white">Find Specialists</h4>
              <p className="text-xs text-navy-500 dark:text-navy-400 mt-0.5">Explore 10+ doctors across 5 departments</p>
            </div>
          </Card>
        </Link>

        <Link to="/patient/dependents" className="group">
          <Card hoverable className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-navy-900 dark:text-white">Family Members</h4>
              <p className="text-xs text-navy-500 dark:text-navy-400 mt-0.5">Book consultations on behalf of dependents</p>
            </div>
          </Card>
        </Link>

        <Link to="/patient/records" className="group">
          <Card hoverable className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-navy-900 dark:text-white">Medical History</h4>
              <p className="text-xs text-navy-500 dark:text-navy-400 mt-0.5">Review past consultations & prescriptions</p>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
};
