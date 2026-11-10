import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

export const ReceptionistAppointmentsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Cancellation modal
  const [cancellingApt, setCancellingApt] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Check-in token display
  const [checkedInToken, setCheckedInToken] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['receptionist', 'appointments', date, status, search, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      params.append('page', String(page));
      params.append('limit', '15');

      const res = await api.get(`/appointments?${params.toString()}`);
      return res.data.data;
    },
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const res = await api.post('/queue/check-in', {
        appointmentId,
        priority: 'normal',
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['receptionist'] });
      setCheckedInToken(data.tokenNumber);
      toast.success(`Patient checked in! Token: ${data.tokenNumber}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to check in patient');
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api.put(`/appointments/${id}/cancel`, { reason });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receptionist'] });
      setCancellingApt(null);
      setCancelReason('');
      toast.success('Appointment cancelled');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Cancellation failed');
    },
  });

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'checked_in':
        return <Badge variant="warning">Checked In (Waiting)</Badge>;
      case 'in_consultation':
        return <Badge variant="info">In Consultation</Badge>;
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="danger">Cancelled</Badge>;
      case 'no_show':
        return <Badge variant="default">No-Show</Badge>;
      default:
        return <Badge variant="default">Booked</Badge>;
    }
  };

  const appointments = data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 dark:text-white">Appointments & Check-in Desk</h1>
          <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
            Search patient reservations, verify arrival, issue queue passes, and handle cancellations
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-navy-600 dark:text-navy-400 uppercase tracking-wider mb-1">
                Filter by Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs border border-navy-200 dark:border-navy-700 rounded-xl px-3 py-2 bg-white dark:bg-navy-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-navy-600 dark:text-navy-400 uppercase tracking-wider mb-1">
                Appointment Status
              </label>
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                options={[
                  { label: 'All Statuses', value: '' },
                  { label: 'Booked (Awaiting)', value: 'booked' },
                  { label: 'Checked In', value: 'checked_in' },
                  { label: 'In Consultation', value: 'in_consultation' },
                  { label: 'Completed', value: 'completed' },
                  { label: 'Cancelled', value: 'cancelled' },
                  { label: 'No Show', value: 'no_show' },
                ]}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-navy-600 dark:text-navy-400 uppercase tracking-wider mb-1">
                Search Patient / Appointment
              </label>
              <Input
                placeholder="Search patient name, phone, or appointment # (e.g. APT-)"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-50/75 dark:bg-navy-800/50 border-b border-navy-200 dark:border-navy-700 text-navy-500 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Appt #</th>
                <th className="py-3 px-4">Patient Details</th>
                <th className="py-3 px-4">Doctor & Dept</th>
                <th className="py-3 px-4">Time Slot</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100 dark:divide-navy-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-navy-400">
                    Loading appointments...
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-navy-400">
                    No appointments found matching current filters.
                  </td>
                </tr>
              ) : (
                appointments.map((apt: any) => (
                  <tr key={apt._id} className="hover:bg-navy-50/40 dark:hover:bg-navy-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-navy-900 dark:text-white">
                      {apt.appointmentNumber}
                      {apt.isWalkIn && (
                        <span className="ml-1.5 px-1 py-0.5 rounded text-[9px] bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-sans font-bold">
                          Walk-in
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-bold text-navy-900 dark:text-white">
                        {apt.patientId?.name || 'Patient'}
                      </p>
                      <p className="text-[10px] text-navy-400">
                        {apt.patientId?.phone || apt.patientId?.email}
                      </p>
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-semibold text-navy-800 dark:text-navy-200">
                        Dr. {apt.doctorId?.userId?.name || 'Doctor'}
                      </p>
                      <p className="text-[10px] text-navy-400">
                        {apt.departmentId?.name} • Room {apt.doctorId?.roomNumber}
                      </p>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-navy-700 dark:text-navy-300">
                      {apt.startTime} - {apt.endTime}
                    </td>

                    <td className="py-3 px-4">
                      {getStatusBadge(apt.status)}
                    </td>

                    <td className="py-3 px-4 font-medium">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        apt.paymentStatus === 'paid'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                      }`}>
                        ₹{apt.consultationFee} • {apt.paymentStatus.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {apt.status === 'booked' && (
                        <Button
                          size="sm"
                          variant="primary"
                          className="h-7 px-2.5 text-xs font-bold shadow-sm"
                          isLoading={checkInMutation.isPending}
                          onClick={() => checkInMutation.mutate(apt._id)}
                        >
                          <UserCheck className="w-3.5 h-3.5 mr-1" />
                          Check In
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        title="Download Appointment Slip PDF"
                        onClick={() => window.open(`/api/appointments/${apt._id}/slip`, '_blank')}
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </Button>

                      {apt.status === 'booked' && (
                        <Button
                          size="sm"
                          variant="danger"
                          className="h-7 px-2 text-xs"
                          title="Cancel appointment"
                          onClick={() => setCancellingApt(apt)}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Token Issued Confirmation Modal */}
      {checkedInToken && (
        <Modal
          isOpen={true}
          onClose={() => setCheckedInToken(null)}
          title="Patient Checked In Successfully"
        >
          <div className="text-center py-4 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <p className="text-xs text-navy-500">Live queue token issued for patient:</p>
            <h2 className="text-4xl font-mono font-black text-teal-600 dark:text-teal-400">
              {checkedInToken}
            </h2>
            <p className="text-xs text-navy-400">
              Pushed to doctor live queue and public waiting room display board.
            </p>
            <Button
              variant="primary"
              className="w-full mt-3 font-bold"
              onClick={() => setCheckedInToken(null)}
            >
              Done
            </Button>
          </div>
        </Modal>
      )}

      {/* Cancellation Modal */}
      {cancellingApt && (
        <Modal
          isOpen={true}
          onClose={() => setCancellingApt(null)}
          title={`Cancel Appointment: ${cancellingApt.appointmentNumber}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-navy-600 dark:text-navy-300">
              Are you sure you want to cancel the reservation for <strong>{cancellingApt.patientId?.name}</strong>?
            </p>
            <Input
              label="Reason for Cancellation"
              placeholder="e.g. Patient requested cancellation, emergency conflict"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setCancellingApt(null)}>
                Keep Appointment
              </Button>
              <Button
                variant="danger"
                isLoading={cancelMutation.isPending}
                onClick={() =>
                  cancelMutation.mutate({
                    id: cancellingApt._id,
                    reason: cancelReason || 'Cancelled at reception desk',
                  })
                }
              >
                Confirm Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
