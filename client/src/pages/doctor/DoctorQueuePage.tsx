import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  Play,
  Pause,
  FastForward,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Stethoscope,
  Volume2,
  Flame,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { socketClient } from '../../services/socket';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';

export const DoctorQueuePage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  // Fetch doctor profile
  const { data: profileData } = useQuery({
    queryKey: ['doctor', 'my-profile'],
    queryFn: async () => {
      const res = await api.get('/doctors/profile/me');
      return res.data.data;
    },
  });

  const doctor = profileData?.doctor;
  const doctorId = doctor?._id;

  // Fetch queue data
  const { data: queueData, isLoading, refetch } = useQuery({
    queryKey: ['doctor', 'queue', doctorId],
    queryFn: async () => {
      if (!doctorId) return null;
      const res = await api.get(`/queue/doctor/${doctorId}?date=${today}`);
      return res.data.data;
    },
    enabled: !!doctorId,
    refetchInterval: 10000,
  });

  // Socket.IO real-time listener for this doctor's room
  useEffect(() => {
    if (!doctorId) return;
    const socket = socketClient.connect();
    socketClient.joinDoctor(doctorId);

    const handleQueueUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'queue', doctorId] });
    };

    socket.on('queue:update', handleQueueUpdate);

    return () => {
      socket.off('queue:update', handleQueueUpdate);
      socketClient.leaveDoctor(doctorId);
    };
  }, [doctorId, queryClient]);

  // Audio announcement chime helper
  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      // AudioContext not allowed without prior user interaction
    }
  };

  // 1. Call Next Mutation
  const callNextMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/queue/doctor/${doctorId}/call-next`);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'queue', doctorId] });
      playChime();
      if (data) {
        toast.success(`Token ${data.tokenNumber} called to Room ${doctor?.roomNumber}!`);
      } else {
        toast('No more waiting patients in queue');
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to advance queue');
    },
  });

  // 2. Start Consultation Mutation
  const startMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const res = await api.post(`/queue/entry/${entryId}/start`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'queue', doctorId] });
      toast.success('Consultation started');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to start consultation');
    },
  });

  // 3. Skip Patient Mutation
  const skipMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const res = await api.post(`/queue/entry/${entryId}/skip`, {
        reason: 'Patient did not answer call',
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'queue', doctorId] });
      toast(`Token ${data.tokenNumber} skipped`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to skip patient');
    },
  });

  // 4. Recall Patient Mutation
  const recallMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const res = await api.post(`/queue/entry/${entryId}/recall`);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'queue', doctorId] });
      playChime();
      toast.success(`Token ${data.tokenNumber} recalled to room!`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to recall patient');
    },
  });

  // 5. Mark No-Show Mutation
  const noShowMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const res = await api.post(`/queue/entry/${entryId}/no-show`);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'queue', doctorId] });
      toast.error(`Token ${data.tokenNumber} marked as No-Show`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to mark no-show');
    },
  });

  // 6. Pause / Break Toggle Mutation
  const pauseMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/doctors/${doctorId}/pause`);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['doctor'] });
      toast.success(data.isPaused ? 'Queue paused (On Break)' : 'Queue resumed');
    },
  });

  const nowServing = queueData?.nowServing;
  const entries = queueData?.activeEntries || [];
  const waitingEntries = entries.filter((e: any) => e.status === 'waiting' || e.status === 'recalled');
  const skippedEntries = entries.filter((e: any) => e.status === 'skipped');

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-navy-900 dark:text-white">Doctor Live Queue Console</h1>
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Connected
            </span>
          </div>
          <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
            Room {doctor?.roomNumber} • Dr. {doctor?.userId?.name} • Live bidirectional sync with patient app & waiting TV
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant={doctor?.isPaused ? 'danger' : 'outline'}
            onClick={() => pauseMutation.mutate()}
            className="font-bold text-xs"
          >
            {doctor?.isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 mr-1" /> Resume Serving
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 mr-1" /> Take a Break (Pause)
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Sync
          </Button>
        </div>
      </div>

      {/* Main Focus: Now Serving Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-2 border-teal-500/40 shadow-card">
            <CardHeader className="bg-teal-50/70 dark:bg-teal-950/30 border-b border-navy-100 dark:border-navy-800 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-teal-950 dark:text-teal-100 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-teal-600" />
                  Currently Serving Token
                </CardTitle>
                <p className="text-xs text-navy-500 dark:text-navy-400">
                  Patient inside or entering your consultation chamber
                </p>
              </div>

              {nowServing && (
                <Badge variant={nowServing.status === 'in_consultation' ? 'success' : 'warning'}>
                  {nowServing.status === 'in_consultation' ? 'IN CONSULTATION' : 'CALLED / ENTERING'}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-28 w-full" />
                </div>
              ) : nowServing ? (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-navy-50 dark:bg-navy-800/60 border border-navy-200 dark:border-navy-700">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                        Token Number
                      </span>
                      <h2 className="text-4xl font-black font-mono text-navy-900 dark:text-white mt-0.5">
                        {nowServing.tokenNumber}
                      </h2>
                      <h3 className="text-base font-bold text-navy-900 dark:text-white mt-2">
                        {nowServing.patientId?.name || 'Patient'}
                      </h3>
                      <p className="text-xs text-navy-500 dark:text-navy-400">
                        {nowServing.patientId?.phone || nowServing.patientId?.email}
                      </p>
                    </div>

                    <div className="flex flex-col sm:items-end gap-2.5">
                      <Badge variant={nowServing.priority === 'emergency' ? 'danger' : 'default'}>
                        {nowServing.priority.toUpperCase()} PRIORITY
                      </Badge>
                      <div className="text-xs text-navy-500 text-right">
                        Called at:{' '}
                        <span className="font-mono font-bold">
                          {nowServing.calledTime ? new Date(nowServing.calledTime).toLocaleTimeString() : 'Just now'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for current token */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-2">
                    {nowServing.status === 'called' && (
                      <Button
                        variant="secondary"
                        size="md"
                        className="font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                        isLoading={startMutation.isPending}
                        onClick={() => startMutation.mutate(nowServing._id)}
                      >
                        <Play className="w-4 h-4 mr-1.5" />
                        Start Consultation
                      </Button>
                    )}

                    <Link to={`/doctor/consultation/${nowServing.appointmentId?._id || nowServing.appointmentId}`}>
                      <Button variant="primary" size="md" className="font-bold shadow-md">
                        <Stethoscope className="w-4 h-4 mr-1.5" />
                        Consultation Form & Prescriptions
                      </Button>
                    </Link>

                    <Button
                      variant="outline"
                      size="md"
                      className="text-xs font-bold text-amber-700 dark:text-amber-300"
                      isLoading={skipMutation.isPending}
                      onClick={() => skipMutation.mutate(nowServing._id)}
                      title="Skip this patient and move to next"
                    >
                      <FastForward className="w-4 h-4 mr-1.5" />
                      Skip
                    </Button>

                    <Button
                      variant="danger"
                      size="md"
                      className="text-xs font-bold"
                      isLoading={noShowMutation.isPending}
                      onClick={() => noShowMutation.mutate(nowServing._id)}
                      title="Mark as No-Show"
                    >
                      <XCircle className="w-4 h-4 mr-1.5" />
                      Mark No-Show
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-600 mx-auto flex items-center justify-center">
                    <Clock className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-navy-900 dark:text-white">
                      Consultation Room is Available
                    </h3>
                    <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
                      {waitingEntries.length > 0
                        ? `There are ${waitingEntries.length} patient(s) waiting in queue outside.`
                        : 'No checked-in patients are currently waiting.'}
                    </p>
                  </div>

                  {waitingEntries.length > 0 && (
                    <Button
                      variant="primary"
                      size="lg"
                      className="font-bold shadow-md px-8"
                      isLoading={callNextMutation.isPending}
                      onClick={() => callNextMutation.mutate()}
                    >
                      <Play className="w-5 h-5 mr-2" />
                      Call Next Patient ({waitingEntries[0]?.tokenNumber})
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skipped Patients List (Recall capability) */}
          {skippedEntries.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <FastForward className="w-4 h-4 text-amber-600" />
                  Skipped Patients ({skippedEntries.length})
                </CardTitle>
                <p className="text-xs text-navy-500 dark:text-navy-400">
                  Patients who were previously called but did not respond. You can recall them to the room.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {skippedEntries.map((entry: any) => (
                    <div
                      key={entry._id}
                      className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-navy-900 dark:text-white">
                            {entry.tokenNumber}
                          </span>
                          <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold">
                            Skipped {entry.skippedCount || 1} time(s)
                          </span>
                        </div>
                        <p className="text-[11px] text-navy-500">{entry.patientId?.name || 'Patient'}</p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs font-bold border-amber-300 text-amber-800 dark:text-amber-200 hover:bg-amber-100"
                        isLoading={recallMutation.isPending}
                        onClick={() => recallMutation.mutate(entry._id)}
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Recall Patient
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right 1 Col: Waiting Queue in Order */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">Waiting Patients ({waitingEntries.length})</CardTitle>
                <p className="text-xs text-navy-500 dark:text-navy-400">Priority ordered queue</p>
              </div>

              {waitingEntries.length > 0 && !nowServing && (
                <Button
                  size="sm"
                  variant="primary"
                  className="h-7 px-2 text-xs font-bold"
                  isLoading={callNextMutation.isPending}
                  onClick={() => callNextMutation.mutate()}
                >
                  <Play className="w-3 h-3 mr-1" />
                  Call Next
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : waitingEntries.length > 0 ? (
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {waitingEntries.map((entry: any, index: number) => (
                    <div
                      key={entry._id}
                      className={`p-3 rounded-xl border transition-all ${
                        entry.priority === 'emergency'
                          ? 'border-rose-300 bg-rose-50/60 dark:bg-rose-950/20 shadow-sm'
                          : 'border-navy-100 dark:border-navy-800 bg-white dark:bg-navy-900'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full font-bold flex items-center justify-center text-[10px] ${
                            entry.priority === 'emergency'
                              ? 'bg-rose-200 text-rose-800'
                              : 'bg-navy-100 dark:bg-navy-800 text-navy-700 dark:text-navy-300'
                          }`}>
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-bold font-mono text-navy-900 dark:text-white">
                              {entry.tokenNumber}
                            </p>
                            <p className="text-[11px] text-navy-600 dark:text-navy-300">
                              {entry.patientId?.name || 'Patient'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <Badge variant={entry.priority === 'emergency' ? 'danger' : 'default'}>
                            {entry.priority}
                          </Badge>
                          <p className="text-[10px] text-navy-400 mt-1 font-mono">
                            {new Date(entry.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-xs text-navy-400 italic">
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
