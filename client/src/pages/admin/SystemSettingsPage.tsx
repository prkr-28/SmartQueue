import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sliders, Save, Building, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';

export const SystemSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [hospitalName, setHospitalName] = useState('');
  const [hospitalPhone, setHospitalPhone] = useState('');
  const [hospitalEmail, setHospitalEmail] = useState('');

  // Policy Settings
  const [cancellationWindowHours, setCancellationWindowHours] = useState('2');
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState('30');
  const [defaultSlotDurationMinutes, setDefaultSlotDurationMinutes] = useState('15');
  const [workingHoursStart, setWorkingHoursStart] = useState('09:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('17:00');

  // Fetch settings
  const { data: hospital, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const res = await api.get('/admin/settings');
      return res.data.data;
    },
  });

  useEffect(() => {
    if (hospital) {
      setHospitalName(hospital.name || '');
      setHospitalPhone(hospital.phone || '');
      setHospitalEmail(hospital.email || '');

      if (hospital.settings) {
        setCancellationWindowHours(String(hospital.settings.cancellationWindowHours || 2));
        setGracePeriodMinutes(String(hospital.settings.gracePeriodMinutes || 30));
        setDefaultSlotDurationMinutes(String(hospital.settings.defaultSlotDurationMinutes || 15));
        setWorkingHoursStart(hospital.settings.workingHoursStart || '09:00');
        setWorkingHoursEnd(hospital.settings.workingHoursEnd || '17:00');
      }
    }
  }, [hospital]);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: hospitalName,
        phone: hospitalPhone,
        email: hospitalEmail,
        settings: {
          cancellationWindowHours: Number(cancellationWindowHours),
          gracePeriodMinutes: Number(gracePeriodMinutes),
          defaultSlotDurationMinutes: Number(defaultSlotDurationMinutes),
          workingHoursStart,
          workingHoursEnd,
        },
      };

      const res = await api.put('/admin/settings', payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      toast.success('Hospital and system automation settings updated');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update settings');
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 dark:text-white">Hospital & System Settings</h1>
          <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
            Global operational parameters, cancellation policies, and background automation thresholds
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="font-bold shadow-md"
          isLoading={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          <Save className="w-4 h-4 mr-1.5" />
          Save Settings
        </Button>
      </div>

      {/* General Hospital Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Building className="w-4 h-4 text-medical-600" />
            Hospital Entity Profile
          </CardTitle>
          <p className="text-xs text-navy-400">Public institution branding appearing on receipts & slips</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Hospital / Clinic Full Legal Name"
            value={hospitalName}
            onChange={(e) => setHospitalName(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Phone"
              value={hospitalPhone}
              onChange={(e) => setHospitalPhone(e.target.value)}
            />
            <Input
              label="Contact Email"
              type="email"
              value={hospitalEmail}
              onChange={(e) => setHospitalEmail(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Scheduling & Queue Automation Policies */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Clock className="w-4 h-4 text-medical-600" />
            Appointment & Queue Engine Policies
          </CardTitle>
          <p className="text-xs text-navy-400">Timers enforced automatically by server cron daemons</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Cancellation Window (Hours)"
              type="number"
              value={cancellationWindowHours}
              onChange={(e) => setCancellationWindowHours(e.target.value)}
              helperText="Minimum hours before slot time a patient is allowed to cancel"
            />

            <Input
              label="Auto No-Show Grace Period (Minutes)"
              type="number"
              value={gracePeriodMinutes}
              onChange={(e) => setGracePeriodMinutes(e.target.value)}
              helperText="Minutes past slot time before automated cron marks un-checked-in as no-show"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <Input
              label="Default Slot Duration (Mins)"
              type="number"
              value={defaultSlotDurationMinutes}
              onChange={(e) => setDefaultSlotDurationMinutes(e.target.value)}
            />

            <Input
              label="Facility Opens At"
              type="time"
              value={workingHoursStart}
              onChange={(e) => setWorkingHoursStart(e.target.value)}
            />

            <Input
              label="Facility Closes At"
              type="time"
              value={workingHoursEnd}
              onChange={(e) => setWorkingHoursEnd(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
