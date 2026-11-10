import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Users,
  Save,
  Sun,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const DoctorSchedulePage: React.FC = () => {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [selectedDate, setSelectedDate] = useState(today);

  // Leave Block Form
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  // Weekly Shifts State
  const [weeklyHours, setWeeklyHours] = useState<any[]>([]);
  const [leaveBlocks, setLeaveBlocks] = useState<any[]>([]);

  // 1. Fetch Doctor Profile & Schedule
  const { data: profileData, isLoading: loadingProfile } = useQuery({
    queryKey: ['doctor', 'my-profile'],
    queryFn: async () => {
      const res = await api.get('/doctors/profile/me');
      return res.data.data;
    },
  });

  const doctor = profileData?.doctor;
  const schedule = profileData?.schedule;

  // Initialize schedule form
  useEffect(() => {
    if (schedule?.weeklyHours && schedule.weeklyHours.length > 0) {
      setWeeklyHours(schedule.weeklyHours);
    } else {
      // Default: Mon-Fri 09:00 - 17:00
      const defaults = [1, 2, 3, 4, 5].map((day) => ({
        dayOfWeek: day,
        shifts: [{ startTime: '09:00', endTime: '17:00' }],
        slotDurationMinutes: doctor?.avgConsultationMinutes || 15,
      }));
      setWeeklyHours(defaults);
    }

    if (schedule?.leaveBlocks) {
      setLeaveBlocks(schedule.leaveBlocks);
    }
  }, [schedule, doctor]);

  // 2. Fetch Patients for Selected Date
  const { data: dateAppointments, isLoading: loadingDateApts } = useQuery({
    queryKey: ['doctor', 'appointments-by-date', doctor?._id, selectedDate],
    queryFn: async () => {
      if (!doctor?._id) return [];
      const res = await api.get(`/doctors/${doctor._id}/appointments?date=${selectedDate}`);
      return res.data.data || [];
    },
    enabled: !!doctor?._id,
  });

  // Save Schedule Mutation
  const saveScheduleMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        weeklyHours,
        leaveBlocks,
      };
      const res = await api.put('/doctors/profile/schedule', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor', 'my-profile'] });
      toast.success('Doctor shifts and leaves saved successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to save schedule');
    },
  });

  // Toggle working day
  const toggleWorkingDay = (dayIndex: number) => {
    const exists = weeklyHours.find((h) => h.dayOfWeek === dayIndex);
    if (exists) {
      setWeeklyHours(weeklyHours.filter((h) => h.dayOfWeek !== dayIndex));
    } else {
      setWeeklyHours([
        ...weeklyHours,
        {
          dayOfWeek: dayIndex,
          shifts: [{ startTime: '09:00', endTime: '17:00' }],
          slotDurationMinutes: 15,
        },
      ]);
    }
  };

  // Update shift times
  const updateShift = (dayIndex: number, field: 'startTime' | 'endTime', val: string) => {
    const updated = weeklyHours.map((h) => {
      if (h.dayOfWeek === dayIndex) {
        const shifts = [...h.shifts];
        if (shifts.length === 0) shifts.push({ startTime: '09:00', endTime: '17:00' });
        shifts[0][field] = val;
        return { ...h, shifts };
      }
      return h;
    });
    setWeeklyHours(updated);
  };

  // Update slot duration
  const updateSlotDuration = (dayIndex: number, val: number) => {
    const updated = weeklyHours.map((h) => {
      if (h.dayOfWeek === dayIndex) {
        return { ...h, slotDurationMinutes: val };
      }
      return h;
    });
    setWeeklyHours(updated);
  };

  // Add leave block
  const handleAddLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveStart || !leaveEnd) {
      toast.error('Please select both start and end date for leave');
      return;
    }
    const newBlock = {
      startDate: leaveStart,
      endDate: leaveEnd,
      reason: leaveReason || 'Personal Leave',
    };
    setLeaveBlocks([...leaveBlocks, newBlock]);
    setLeaveStart('');
    setLeaveEnd('');
    setLeaveReason('');
  };

  const removeLeave = (index: number) => {
    setLeaveBlocks(leaveBlocks.filter((_, i) => i !== index));
  };

  const apts = dateAppointments || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 dark:text-white">
            Schedule & Clinical Hours
          </h1>
          <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
            Configure your weekly shifts, slot durations, holiday blocks, and view patient schedule by date
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="font-bold shadow-md"
          isLoading={saveScheduleMutation.isPending}
          onClick={() => saveScheduleMutation.mutate()}
        >
          <Save className="w-4 h-4 mr-1.5" />
          Save Schedule Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Weekly Shifts & Leaves */}
        <div className="lg:col-span-2 space-y-6">
          {/* Weekly Shifts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-medical-600" />
                Weekly Working Hours & Shift Intervals
              </CardTitle>
              <p className="text-xs text-navy-400">Slots are dynamically generated according to these shift hours</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {DAY_NAMES.map((dayName, dayIndex) => {
                const shiftConfig = weeklyHours.find((h) => h.dayOfWeek === dayIndex);
                const isWorking = !!shiftConfig;
                const shift = shiftConfig?.shifts?.[0] || { startTime: '09:00', endTime: '17:00' };

                return (
                  <div
                    key={dayIndex}
                    className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isWorking
                        ? 'border-teal-200 dark:border-teal-900 bg-teal-50/30 dark:bg-teal-950/20'
                        : 'border-navy-100 dark:border-navy-800 bg-navy-50/40 dark:bg-navy-900/40 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isWorking}
                        onChange={() => toggleWorkingDay(dayIndex)}
                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                      />
                      <div>
                        <span className="font-bold text-navy-900 dark:text-white block">
                          {dayName}
                        </span>
                        <span className="text-[10px] text-navy-400">
                          {isWorking ? 'Working Day' : 'Day Off / Closed'}
                        </span>
                      </div>
                    </div>

                    {isWorking && (
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-navy-500">From</span>
                          <input
                            type="time"
                            value={shift.startTime}
                            onChange={(e) => updateShift(dayIndex, 'startTime', e.target.value)}
                            className="text-xs border border-navy-200 dark:border-navy-700 rounded-lg px-2 py-1 bg-white dark:bg-navy-900 font-mono font-bold"
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-navy-500">To</span>
                          <input
                            type="time"
                            value={shift.endTime}
                            onChange={(e) => updateShift(dayIndex, 'endTime', e.target.value)}
                            className="text-xs border border-navy-200 dark:border-navy-700 rounded-lg px-2 py-1 bg-white dark:bg-navy-900 font-mono font-bold"
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-navy-500">Slot</span>
                          <select
                            value={shiftConfig?.slotDurationMinutes || 15}
                            onChange={(e) => updateSlotDuration(dayIndex, Number(e.target.value))}
                            className="text-xs border border-navy-200 dark:border-navy-700 rounded-lg px-2 py-1 bg-white dark:bg-navy-900 font-bold"
                          >
                            <option value={10}>10 min</option>
                            <option value={15}>15 min</option>
                            <option value={20}>20 min</option>
                            <option value={30}>30 min</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Leaves & Holiday Blocks */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                Planned Leaves & Holiday Blocks
              </CardTitle>
              <p className="text-xs text-navy-400">
                Patients will not be able to book appointments during these blocked dates
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleAddLeave} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-navy-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                    className="w-full text-xs border border-navy-200 dark:border-navy-700 rounded-xl px-2.5 py-1.5 bg-white dark:bg-navy-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-navy-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                    className="w-full text-xs border border-navy-200 dark:border-navy-700 rounded-xl px-2.5 py-1.5 bg-white dark:bg-navy-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-navy-500 mb-1">Reason</label>
                  <Input
                    placeholder="e.g. Annual leave, Medical conference"
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" variant="outline" size="sm" className="w-full text-xs font-bold border-teal-300">
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Leave
                  </Button>
                </div>
              </form>

              {/* Leave blocks list */}
              {leaveBlocks.length > 0 ? (
                <div className="space-y-2 pt-2">
                  {leaveBlocks.map((block, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 text-xs flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-navy-900 dark:text-white">
                          {new Date(block.startDate).toLocaleDateString()} — {new Date(block.endDate).toLocaleDateString()}
                        </p>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300">
                          {block.reason || 'Leave'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeLeave(idx)}
                        className="text-rose-500 hover:text-rose-700 text-xs font-semibold p-1"
                        title="Delete leave block"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-navy-400 py-2 italic">
                  No upcoming leaves or holiday blocks configured.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Patients by Date */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-medical-600" />
                Scheduled Patients by Date
              </CardTitle>
              <div className="pt-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full text-xs border border-navy-200 dark:border-navy-700 rounded-xl px-3 py-2 bg-white dark:bg-navy-900 font-bold"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loadingDateApts ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : apts.length > 0 ? (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {apts.map((apt: any) => (
                    <div
                      key={apt._id}
                      className="p-3 rounded-xl border border-navy-100 dark:border-navy-800 bg-white dark:bg-navy-900 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-teal-700 dark:text-teal-300">
                          {apt.startTime} - {apt.endTime}
                        </span>
                        <Badge variant={apt.status === 'completed' ? 'success' : 'default'}>
                          {apt.status}
                        </Badge>
                      </div>

                      <p className="font-bold text-navy-900 dark:text-white">
                        {apt.patientId?.name || 'Patient'}
                      </p>
                      <p className="text-[10px] text-navy-500">
                        {apt.symptoms || 'General Consultation'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-xs text-navy-400 italic">
                  No appointments scheduled for {selectedDate}.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
