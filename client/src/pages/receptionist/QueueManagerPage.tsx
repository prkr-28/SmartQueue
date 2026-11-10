import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  ArrowRightLeft,
  FastForward,
  RotateCcw,
  PlusCircle,
  RefreshCw,
  PhoneCall,
  Flame,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { socketClient } from '../../services/socket';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

export const QueueManagerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');
  const [reassignModalEntry, setReassignModalEntry] = useState<any>(null);
  const [newDoctorId, setNewDoctorId] = useState('');
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [emergencyDocId, setEmergencyDocId] = useState('');
  const [emergencySymptoms, setEmergencySymptoms] = useState('');
  const [emergencyPatientName, setEmergencyPatientName] = useState('');
  const [emergencyPatientPhone, setEmergencyPatientPhone] = useState('');

  // Fetch doctors
  const { data: doctorsData } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const res = await api.get('/doctors');
      return res.data.data || [];
    },
  });

  // Fetch departments
  const { data: hospitalData } = useQuery({
    queryKey: ['hospitals'],
    queryFn: async () => {
      const res = await api.get('/hospitals');
      return res.data.data[0];
    },
  });

  const { data: departments } = useQuery({
    queryKey: ['departments', hospitalData?._id],
    queryFn: async () => {
      if (!hospitalData?._id) return [];
      const res = await api.get(`/hospitals/${hospitalData._id}/departments`);
      return res.data.data || [];
    },
    enabled: !!hospitalData?._id,
  });

  // Fetch hospital display data (gives all active doctor queues together)
  const { data: displayData, isLoading, refetch } = useQuery({
    queryKey: ['receptionist', 'queue-board'],
    queryFn: async () => {
      if (!hospitalData?._id) return null;
      const res = await api.get(`/queue/display/${hospitalData._id}`);
      return res.data.data;
    },
    enabled: !!hospitalData?._id,
    refetchInterval: 10000,
  });

  // Socket.IO real-time listener
  useEffect(() => {
    if (!hospitalData?._id) return;
    const socket = socketClient.connect();
    socketClient.joinHospital(hospitalData._id);

    const handleDisplayUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'queue-board'] });
    };

    socket.on('display:update', handleDisplayUpdate);
    socket.on('queue:update', handleDisplayUpdate);

    return () => {
      socket.off('display:update', handleDisplayUpdate);
      socket.off('queue:update', handleDisplayUpdate);
      socketClient.leaveHospital(hospitalData._id);
    };
  }, [hospitalData?._id, queryClient]);

  // Reassign mutation
  const reassignMutation = useMutation({
    mutationFn: async ({ entryId, docId }: { entryId: string; docId: string }) => {
      const res = await api.post(`/queue/entry/${entryId}/reassign`, {
        newDoctorId: docId,
        reason: 'Reassigned by reception queue manager',
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'queue-board'] });
      setReassignModalEntry(null);
      setNewDoctorId('');
      toast.success('Patient reassigned to new doctor successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Reassign failed');
    },
  });

  // Emergency insert mutation
  const emergencyMutation = useMutation({
    mutationFn: async () => {
      // Create patient first
      const email = `emergency.${Date.now()}@smartqueue.local`;
      const userRes = await api.post('/auth/register', {
        name: emergencyPatientName || 'Urgent Emergency Patient',
        email,
        password: 'EmergencyPassword@123',
        phone: emergencyPatientPhone || '9999999999',
        role: 'patient',
      });
      const patientId = userRes.data.data.user._id;

      // Emergency insert into queue
      const res = await api.post('/queue/emergency-insert', {
        doctorId: emergencyDocId,
        patientId,
        symptoms: emergencySymptoms || 'Acute medical emergency',
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'queue-board'] });
      setEmergencyModalOpen(false);
      setEmergencySymptoms('');
      setEmergencyPatientName('');
      setEmergencyPatientPhone('');
      toast.success(`EMERGENCY INSERTED: Token ${data.tokenNumber} prioritized at top of queue!`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Emergency insert failed');
    },
  });

  // Pause toggle mutation
  const pauseMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await api.post(`/doctors/${docId}/pause`);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'queue-board'] });
      toast.success(data.isPaused ? 'Doctor paused (on break)' : 'Doctor queue resumed');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to toggle doctor pause');
    },
  });

  const doctorsList = doctorsData || [];
  const deptList = displayData?.departments || [];

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-navy-900 dark:text-white">Live Hospital Queue Board</h1>
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Live Sync
            </span>
          </div>
          <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
            Real-time multi-doctor queue orchestrator: monitor tokens, reassign patients, trigger emergency triage
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="danger"
            size="sm"
            onClick={() => setEmergencyModalOpen(true)}
            className="font-bold shadow-md animate-pulse"
          >
            <Flame className="w-4 h-4 mr-1.5" />
            Emergency Insert
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Sync
          </Button>
        </div>
      </div>

      {/* Multi-Column Doctor Live Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-navy-400 text-xs">
            Loading hospital queue matrices...
          </div>
        ) : (
          deptList.map((dept: any) =>
            dept.doctors.map((doc: any) => {
              const fullDoc = doctorsList.find((d: any) => d._id === doc.doctorId);
              return (
                <div
                  key={doc.doctorId}
                  className="rounded-2xl border border-navy-200 dark:border-navy-800 bg-white dark:bg-navy-900 shadow-sm flex flex-col overflow-hidden"
                >
                  {/* Doctor Header */}
                  <div className="p-4 border-b border-navy-100 dark:border-navy-800 bg-gradient-to-r from-navy-50 to-white dark:from-navy-800/50 dark:to-navy-900 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                          {dept.departmentName}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-navy-100 dark:bg-navy-800 text-navy-600 dark:text-navy-400">
                          {doc.roomNumber}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-navy-900 dark:text-white mt-0.5">
                        {doc.doctorName}
                      </h3>
                      <p className="text-[11px] text-navy-500 dark:text-navy-400">
                        {doc.specialization}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant={fullDoc?.isPaused ? 'danger' : 'outline'}
                      className="h-7 px-2 text-[11px] font-semibold"
                      onClick={() => pauseMutation.mutate(doc.doctorId)}
                      title={fullDoc?.isPaused ? 'Resume doctor queue' : 'Pause doctor queue for break'}
                    >
                      {fullDoc?.isPaused ? (
                        <>
                          <Play className="w-3 h-3 mr-1" /> Resume
                        </>
                      ) : (
                        <>
                          <Pause className="w-3 h-3 mr-1" /> Break
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Now Serving Card */}
                  <div className="p-4 bg-teal-50/50 dark:bg-teal-950/20 border-b border-navy-100 dark:border-navy-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-teal-700 dark:text-teal-300">
                        Now Serving
                      </span>
                      <p className="text-2xl font-black font-mono text-teal-800 dark:text-teal-200 mt-0.5">
                        {doc.nowServingToken || '— IDLE —'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-navy-400 font-medium">Waiting Queue</span>
                      <p className="text-sm font-bold font-mono text-navy-800 dark:text-navy-200">
                        {doc.nextTokens?.length || 0} in line
                      </p>
                    </div>
                  </div>

                  {/* Upcoming Queue Tokens in this Doctor's Column */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-navy-400 mb-2">
                        Next in Line
                      </p>

                      {doc.nextTokens && doc.nextTokens.length > 0 ? (
                        <div className="space-y-2">
                          {doc.nextTokens.map((token: string, idx: number) => (
                            <div
                              key={token}
                              className="p-2.5 rounded-xl border border-navy-100 dark:border-navy-800 bg-navy-50/50 dark:bg-navy-800/40 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold flex items-center justify-center text-[10px]">
                                  {idx + 1}
                                </span>
                                <div>
                                  <p className="font-mono font-bold text-navy-900 dark:text-white">
                                    {token}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-1.5 text-[10px] text-navy-600 dark:text-navy-300 hover:text-teal-600"
                                  title="Reassign to another doctor"
                                  onClick={() => setReassignModalEntry({ token, doctorId: doc.doctorId })}
                                >
                                  <ArrowRightLeft className="w-3 h-3 mr-1" />
                                  Reassign
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 text-center text-xs text-navy-400 italic">
                          No pending patients in queue
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>

      {/* Emergency Insert Modal */}
      {emergencyModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setEmergencyModalOpen(false)}
          title="Triage: Emergency Patient Insertion"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Emergency insertion bypasses regular queues and places the patient at weight 3 (Immediate Next Serving) across display boards and doctor consoles.
              </span>
            </div>

            <Input
              label="Patient Name"
              placeholder="e.g. John Doe (Emergency)"
              value={emergencyPatientName}
              onChange={(e) => setEmergencyPatientName(e.target.value)}
            />

            <Input
              label="Contact Phone"
              placeholder="e.g. 9876543210"
              value={emergencyPatientPhone}
              onChange={(e) => setEmergencyPatientPhone(e.target.value)}
            />

            <div>
              <label className="block text-xs font-semibold text-navy-700 dark:text-navy-300 mb-1">
                Assign to Doctor *
              </label>
              <Select
                value={emergencyDocId}
                onChange={(e) => setEmergencyDocId(e.target.value)}
                options={[
                  { label: 'Select Attending Doctor', value: '' },
                  ...doctorsList.map((doc: any) => ({
                    label: `Dr. ${(doc.userId as any)?.name || 'Doctor'} - ${doc.specialization} (Room ${doc.roomNumber})`,
                    value: doc._id,
                  })),
                ]}
              />
            </div>

            <Input
              label="Emergency Symptoms / Vitals Notes *"
              placeholder="e.g. Severe chest pain, dyspnea, trauma"
              value={emergencySymptoms}
              onChange={(e) => setEmergencySymptoms(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEmergencyModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                isLoading={emergencyMutation.isPending}
                disabled={!emergencyDocId}
                onClick={() => emergencyMutation.mutate()}
                className="font-bold shadow-md"
              >
                Insert Emergency at Top
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reassign Modal */}
      {reassignModalEntry && (
        <Modal
          isOpen={true}
          onClose={() => setReassignModalEntry(null)}
          title={`Reassign Token: ${reassignModalEntry.token}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-navy-600 dark:text-navy-300">
              Select the new doctor to whom token <strong>{reassignModalEntry.token}</strong> should be transferred:
            </p>

            <Select
              value={newDoctorId}
              onChange={(e) => setNewDoctorId(e.target.value)}
              options={[
                { label: 'Choose New Doctor', value: '' },
                ...doctorsList
                  .filter((d: any) => d._id !== reassignModalEntry.doctorId)
                  .map((doc: any) => ({
                    label: `Dr. ${(doc.userId as any)?.name || 'Doctor'} - ${doc.specialization} (Room ${doc.roomNumber})`,
                    value: doc._id,
                  })),
              ]}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setReassignModalEntry(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!newDoctorId}
                isLoading={reassignMutation.isPending}
                onClick={() =>
                  reassignMutation.mutate({
                    entryId: reassignModalEntry.token,
                    docId: newDoctorId,
                  })
                }
              >
                Confirm Reassign
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
