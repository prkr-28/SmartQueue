import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Calendar,
  Clock,
  Download,
  CalendarX,
  CalendarCheck,
  RefreshCw,
  AlertCircle,
  FileText,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AppointmentDto, AvailableSlot } from '@smartqueue/shared';

export const MyAppointmentsPage: React.FC = () => {
  const [tab, setTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [appointments, setAppointments] = useState<AppointmentDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const [rescheduleTarget, setRescheduleTarget] = useState<AppointmentDto | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState<AvailableSlot[]>([]);
  const [rescheduleSelectedSlot, setRescheduleSelectedSlot] = useState<AvailableSlot | null>(null);
  const [isLoadingRescheduleSlots, setIsLoadingRescheduleSlots] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, [tab]);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      let statusQuery = '';
      if (tab === 'upcoming') statusQuery = 'status=booked';
      else if (tab === 'past') statusQuery = 'status=completed';
      else if (tab === 'cancelled') statusQuery = 'status=cancelled';

      const res = await api.get(`/appointments?${statusQuery}&limit=50`);
      if (res.data.success) {
        setAppointments(res.data.data.items);
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
      toast.success('Appointment pass downloaded');
    } catch (err) {
      toast.error('Failed to download appointment slip');
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTargetId) return;
    setIsCancelling(true);
    try {
      await api.post(`/appointments/${cancelTargetId}/cancel`, { reason: cancelReason });
      toast.success('Appointment cancelled successfully');
      setCancelTargetId(null);
      setCancelReason('');
      fetchAppointments();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to cancel appointment');
    } finally {
      setIsCancelling(false);
    }
  };

  const openRescheduleModal = async (apt: AppointmentDto) => {
    setRescheduleTarget(apt);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDate = tomorrow.toISOString().slice(0, 10);
    setRescheduleDate(defaultDate);
    fetchRescheduleSlots((apt.doctorId as any)?._id || apt.doctorId, defaultDate);
  };

  const fetchRescheduleSlots = async (docId: string, date: string) => {
    try {
      setIsLoadingRescheduleSlots(true);
      setRescheduleSelectedSlot(null);
      const res = await api.get(`/doctors/${docId}/slots?date=${date}`);
      if (res.data.success) {
        setRescheduleSlots(res.data.data.slots || []);
      }
    } catch (err) {
      toast.error('Failed to load slots');
    } finally {
      setIsLoadingRescheduleSlots(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleTarget || !rescheduleSelectedSlot) return;
    setIsRescheduling(true);
    try {
      await api.post(`/appointments/${rescheduleTarget._id}/reschedule`, {
        newDate: rescheduleDate,
        newStartTime: rescheduleSelectedSlot.startTime,
      });
      toast.success('Appointment rescheduled successfully');
      setRescheduleTarget(null);
      fetchAppointments();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Reschedule failed');
    } finally {
      setIsRescheduling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-navy-900 dark:text-white">My Appointments</h2>
          <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
            Manage upcoming consultations, reschedule slots, and download official medical check-in slips
          </p>
        </div>
        <Link to="/patient/book">
          <Button variant="primary" size="sm">
            Book New Appointment
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-navy-200 dark:border-navy-800 space-x-6 text-sm font-semibold">
        {[
          { key: 'upcoming', label: 'Upcoming Consultations' },
          { key: 'past', label: 'Past Visits' },
          { key: 'cancelled', label: 'Cancelled' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`pb-3 border-b-2 transition-all ${
              tab === t.key
                ? 'border-medical-600 text-medical-600 dark:text-medical-400 font-bold'
                : 'border-transparent text-navy-500 hover:text-navy-800 dark:hover:text-navy-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-8 w-full" />
            </Card>
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-8 h-8" />}
          title={`No ${tab} appointments found`}
          description={
            tab === 'upcoming'
              ? 'You do not have any upcoming consultations scheduled.'
              : `No appointments in ${tab} history.`
          }
          actionText={tab === 'upcoming' ? 'Book an Appointment' : undefined}
          onAction={tab === 'upcoming' ? () => (window.location.href = '/patient/book') : undefined}
        />
      ) : (
        <div className="space-y-4">
          {appointments.map((apt) => {
            const doctorUser = (apt.doctorId as any)?.userId;
            const dept = apt.departmentId as any;
            const hospital = apt.hospitalId as any;

            return (
              <Card key={apt._id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-navy-900 dark:text-white">
                      {apt.appointmentNumber}
                    </span>
                    <Badge
                      variant={
                        apt.status === 'completed'
                          ? 'success'
                          : apt.status === 'cancelled'
                          ? 'danger'
                          : apt.status === 'checked_in'
                          ? 'warning'
                          : 'primary'
                      }
                      size="sm"
                    >
                      {apt.status.toUpperCase()}
                    </Badge>
                  </div>

                  <p className="text-sm font-semibold text-navy-800 dark:text-navy-200">
                    Dr. {doctorUser?.name || 'Doctor'} -{' '}
                    <span className="font-normal text-navy-500">{dept?.name}</span>
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-navy-600 dark:text-navy-400">
                    <span className="flex items-center gap-1 font-semibold text-medical-600 dark:text-medical-400">
                      <Calendar className="w-3.5 h-3.5" /> {apt.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {apt.startTime} - {apt.endTime}
                    </span>
                    <span>Fee: ₹{apt.consultationFee}</span>
                  </div>

                  {apt.symptoms && (
                    <p className="text-xs text-navy-500 italic mt-1">Reason: {apt.symptoms}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                    onClick={() => handleDownloadSlip(apt._id)}
                  >
                    Slip PDF
                  </Button>

                  {apt.status === 'booked' && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                        onClick={() => openRescheduleModal(apt)}
                      >
                        Reschedule
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        leftIcon={<CalendarX className="w-3.5 h-3.5" />}
                        onClick={() => setCancelTargetId(apt._id)}
                      >
                        Cancel
                      </Button>
                    </>
                  )}

                  {apt.status === 'checked_in' && (
                    <Link to="/patient/queue">
                      <Button variant="primary" size="sm">
                        Track Live Queue
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelTargetId && (
        <Modal
          isOpen={!!cancelTargetId}
          onClose={() => setCancelTargetId(null)}
          title="Cancel Appointment"
        >
          <div className="space-y-4">
            <p className="text-xs text-navy-600 dark:text-navy-400">
              Are you sure you wish to cancel this appointment? Cancellations are permitted up to 2 hours before the scheduled time slot.
            </p>
            <div>
              <label className="block text-xs font-semibold uppercase text-navy-700 dark:text-navy-300 mb-1">
                Reason for Cancellation (Optional)
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Schedule conflict or resolved symptoms"
                className="w-full rounded-lg border border-navy-300 dark:border-navy-700 bg-white dark:bg-navy-900 p-2.5 text-xs text-navy-900 dark:text-white"
              />
            </div>
            <div className="pt-3 border-t border-navy-100 dark:border-navy-800 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setCancelTargetId(null)}>
                Keep Appointment
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={isCancelling}
                onClick={handleConfirmCancel}
              >
                Yes, Cancel Appointment
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <Modal
          isOpen={!!rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          title="Reschedule Appointment"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <p className="text-xs text-navy-600 dark:text-navy-400">
              Select a new date and time slot for your appointment with Dr.{' '}
              {((rescheduleTarget.doctorId as any)?.userId?.name)}.
            </p>

            <div>
              <label className="block text-xs font-semibold uppercase text-navy-700 dark:text-navy-300 mb-1">
                Select New Date
              </label>
              <input
                type="date"
                value={rescheduleDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => {
                  setRescheduleDate(e.target.value);
                  fetchRescheduleSlots(
                    (rescheduleTarget.doctorId as any)?._id || rescheduleTarget.doctorId,
                    e.target.value
                  );
                }}
                className="w-full rounded-lg border border-navy-300 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2 text-xs text-navy-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-navy-700 dark:text-navy-300 mb-2">
                Available Slots
              </label>
              {isLoadingRescheduleSlots ? (
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-8 bg-navy-100 dark:bg-navy-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : rescheduleSlots.length === 0 ? (
                <p className="text-xs text-navy-400">No slots available on this date.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {rescheduleSlots.map((slot) => {
                    const isSel = rescheduleSelectedSlot?.startTime === slot.startTime;
                    return (
                      <button
                        key={slot.startTime}
                        type="button"
                        disabled={!slot.isAvailable}
                        onClick={() => setRescheduleSelectedSlot(slot)}
                        className={`p-2 rounded-lg border text-xs font-semibold text-center ${
                          isSel
                            ? 'border-medical-600 bg-medical-600 text-white'
                            : slot.isAvailable
                            ? 'border-navy-200 dark:border-navy-700 hover:border-medical-500'
                            : 'opacity-40 line-through cursor-not-allowed'
                        }`}
                      >
                        {slot.startTime}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-navy-100 dark:border-navy-800 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setRescheduleTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!rescheduleSelectedSlot}
                isLoading={isRescheduling}
                onClick={handleConfirmReschedule}
              >
                Confirm Reschedule
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
