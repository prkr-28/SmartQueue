import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { socketClient } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Activity,
  Volume2,
  VolumeX,
  Building,
  RefreshCw,
  BellRing,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { QueueEntryDto, SocketTurnNearPayload } from '@smartqueue/shared';

export const LiveQueueTrackerPage: React.FC = () => {
  const { user } = useAuth();
  const [queueData, setQueueData] = useState<{
    entry: QueueEntryDto | null;
    peopleAhead: number;
    estimatedWaitMinutes: number;
    doctorName?: string;
    roomNumber?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [turnNearAlert, setTurnNearAlert] = useState<SocketTurnNearPayload | null>(null);

  useEffect(() => {
    fetchLiveQueue();

    // Connect socket and listen for live updates
    const socket = socketClient.getSocket();

    const handleTurnNear = (payload: SocketTurnNearPayload) => {
      setTurnNearAlert(payload);
      toast('🔔 Your turn is near! Only ' + payload.peopleAhead + ' patient(s) ahead.', {
        icon: '⚠️',
        duration: 8000,
      });
      playChime();
      fetchLiveQueue();
    };

    const handleQueueUpdate = () => {
      fetchLiveQueue();
    };

    socket.on('patient:turn_near', handleTurnNear);
    socket.on('queue:update', handleQueueUpdate);

    // Auto-polling fallback every 10 seconds
    const interval = setInterval(fetchLiveQueue, 10000);

    return () => {
      socket.off('patient:turn_near', handleTurnNear);
      socket.off('queue:update', handleQueueUpdate);
      clearInterval(interval);
    };
  }, []);

  const fetchLiveQueue = async () => {
    try {
      const res = await api.get('/queue/patient/live');
      if (res.data.success) {
        setQueueData(res.data.data);
      }
    } catch (err) {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      // Audio autoplay policy
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-2xl font-black text-navy-900 dark:text-white">Live Queue Tracker</h2>
          </div>
          <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
            Real-time waiting room position powered by Socket.IO
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            aria-label="Toggle sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-medical-600" /> : <VolumeX className="w-4 h-4 text-navy-400" />}
          </Button>

          <Button variant="outline" size="sm" onClick={fetchLiveQueue} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-8 space-y-4">
          <Skeleton className="h-8 w-40 mx-auto" />
          <Skeleton className="h-16 w-3/4 mx-auto" />
          <Skeleton className="h-24 w-full" />
        </Card>
      ) : !queueData || !queueData.entry ? (
        /* Empty / Not Checked In State */
        <Card className="p-8 sm:p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-navy-100 dark:bg-navy-800 flex items-center justify-center text-navy-400 mx-auto">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-navy-900 dark:text-white">
            No Active Queue Entry Found Today
          </h3>
          <p className="text-xs text-navy-500 dark:text-navy-400 max-w-md mx-auto leading-relaxed">
            You do not currently have an active waiting token. When you check in for your appointment (at reception or via the receptionist dashboard), your live queue tracker will update automatically here.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link to="/patient/appointments">
              <Button variant="outline" size="sm">
                View My Appointments
              </Button>
            </Link>
            <Link to="/patient/book">
              <Button variant="primary" size="sm">
                Book Consultation
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        /* Active Live Queue View */
        <div className="space-y-6">
          {/* Urgent "Your Turn is Near" Banner */}
          {(queueData.peopleAhead <= 3 || turnNearAlert) && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-teal-500/10 border-2 border-amber-500/40 dark:border-amber-500/30 flex items-start sm:items-center gap-3.5 animate-pulse">
              <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0">
                <BellRing className="w-5 h-5 animate-bounce" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-navy-900 dark:text-white">
                  Your Turn is Near!
                </h4>
                <p className="text-xs text-navy-600 dark:text-navy-300 mt-0.5">
                  Only <strong>{queueData.peopleAhead}</strong> patient(s) ahead of you. Please proceed towards{' '}
                  <strong className="text-medical-600 dark:text-medical-400">
                    Room {queueData.roomNumber || '101'}
                  </strong>.
                </p>
              </div>
            </div>
          )}

          {/* Main Token Billboard */}
          <Card className="p-6 sm:p-10 text-center relative overflow-hidden border-2 border-medical-500/30 shadow-elevated">
            <div className="absolute top-0 right-0 p-4">
              <Badge
                variant={
                  queueData.entry.status === 'in_consultation'
                    ? 'success'
                    : queueData.entry.status === 'called'
                    ? 'warning'
                    : 'primary'
                }
                size="md"
              >
                {queueData.entry.status === 'in_consultation'
                  ? 'INSIDE CONSULTATION'
                  : queueData.entry.status === 'called'
                  ? 'NOW CALLED'
                  : 'WAITING IN QUEUE'}
              </Badge>
            </div>

            <p className="text-xs font-bold uppercase tracking-widest text-navy-400">
              Your Daily Token Number
            </p>

            <h1 className="text-5xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-medical-600 to-teal-500 tracking-tight my-4">
              {queueData.entry.tokenNumber}
            </h1>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-navy-100 dark:bg-navy-800 text-xs font-semibold text-navy-700 dark:text-navy-300">
              <Building className="w-3.5 h-3.5 text-medical-600" />
              <span>Consulting with Dr. {queueData.doctorName || 'Doctor'} - Room {queueData.roomNumber}</span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-navy-100 dark:border-navy-800">
              <div className="p-4 rounded-xl bg-navy-50 dark:bg-navy-800/60 border border-navy-200 dark:border-navy-700">
                <p className="text-xs text-navy-500 dark:text-navy-400 font-medium">Patients Ahead of You</p>
                <p className="text-3xl font-extrabold text-navy-900 dark:text-white mt-1">
                  {queueData.peopleAhead}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-navy-50 dark:bg-navy-800/60 border border-navy-200 dark:border-navy-700">
                <p className="text-xs text-navy-500 dark:text-navy-400 font-medium">Estimated Waiting Time</p>
                <p className="text-3xl font-extrabold text-medical-600 dark:text-medical-400 mt-1">
                  ~{queueData.estimatedWaitMinutes} <span className="text-sm font-semibold">mins</span>
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-8 text-left">
              <div className="flex justify-between text-xs text-navy-500 mb-2">
                <span>Queue Flow Progress</span>
                <span className="font-semibold">{queueData.peopleAhead === 0 ? 'Next Up / Inside' : `${queueData.peopleAhead} waiting`}</span>
              </div>
              <div className="w-full h-3 rounded-full bg-navy-100 dark:bg-navy-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-medical-500 to-teal-400 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(10, 100 - queueData.peopleAhead * 15)}%`,
                  }}
                />
              </div>
            </div>
          </Card>

          {/* Quick Notice */}
          <div className="p-4 rounded-xl bg-white dark:bg-navy-900 border border-navy-200 dark:border-navy-800 text-xs text-navy-600 dark:text-navy-400 flex items-start gap-3">
            <Activity className="w-4 h-4 text-medical-600 shrink-0 mt-0.5" />
            <span>
              Estimated wait times are dynamically calculated based on Dr. {queueData.doctorName}'s rolling average consultation duration. Please ensure your device sound is enabled to hear turn announcements.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
