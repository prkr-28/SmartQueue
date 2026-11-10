import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  Stethoscope,
  Shield,
  CheckCircle2,
  XCircle,
  Power,
  Search,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';

export const StaffManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'doctor' | 'receptionist'>('all');
  const [modalOpen, setModalOpen] = useState(false);

  // New staff form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Staff@123');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'doctor' | 'receptionist'>('doctor');
  const [departmentId, setDepartmentId] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [roomNumber, setRoomNumber] = useState('Room 101');
  const [consultationFee, setConsultationFee] = useState(500);

  // Fetch staff data
  const { data: staffData, isLoading } = useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: async () => {
      const res = await api.get('/admin/staff');
      return res.data.data;
    },
  });

  // Fetch departments for doctor profile creation
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

  // Create staff mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/admin/staff', {
        name,
        email,
        password,
        phone,
        role,
        departmentId: role === 'doctor' ? departmentId : undefined,
        specialization: role === 'doctor' ? specialization : undefined,
        roomNumber: role === 'doctor' ? roomNumber : undefined,
        consultationFee: role === 'doctor' ? Number(consultationFee) : undefined,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
      setModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      toast.success('Staff member registered successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to create staff');
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.put(`/admin/staff/${userId}/status`);
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
      toast.success(`Staff member ${data.isActive ? 'activated' : 'deactivated'}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to toggle status');
    },
  });

  const doctors = staffData?.doctors || [];
  const staffUsers = staffData?.staff || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 dark:text-white">Staff & Clinician Management</h1>
          <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
            Provision physician profiles, receptionist credentials, and manage role access
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setModalOpen(true)}
          className="font-bold shadow-md"
        >
          <UserPlus className="w-4 h-4 mr-1.5" />
          Add Staff Member
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-navy-200 dark:border-navy-800 space-x-4">
        {(['all', 'doctor', 'receptionist'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === tab
                ? 'border-teal-600 text-teal-700 dark:text-teal-300'
                : 'border-transparent text-navy-400 hover:text-navy-700 dark:hover:text-navy-200'
            }`}
          >
            {tab === 'all' ? `All Staff (${doctors.length + staffUsers.length})` : tab === 'doctor' ? `Doctors (${doctors.length})` : `Receptionists (${staffUsers.length})`}
          </button>
        ))}
      </div>

      {/* Staff Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
          </>
        ) : (
          <>
            {/* Doctors */}
            {(activeTab === 'all' || activeTab === 'doctor') &&
              doctors.map((doc: any) => (
                <Card key={doc._id} className="hover:border-teal-500/40 transition-all flex flex-col justify-between">
                  <CardHeader className="pb-3 flex flex-row items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                          DOCTOR
                        </span>
                        <Badge variant={doc.isActive ? 'success' : 'default'}>
                          {doc.isActive ? 'ACTIVE' : 'DISABLED'}
                        </Badge>
                      </div>
                      <h3 className="text-base font-bold text-navy-900 dark:text-white mt-1.5">
                        Dr. {doc.userId?.name}
                      </h3>
                      <p className="text-xs text-navy-500 dark:text-navy-400">
                        {doc.specialization} • {doc.departmentId?.name}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleStatusMutation.mutate(doc.userId?._id)}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                        doc.isActive
                          ? 'text-rose-600 hover:bg-rose-50'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={doc.isActive ? 'Disable account' : 'Enable account'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </CardHeader>
                  <CardContent className="pt-2 border-t border-navy-100 dark:border-navy-800 space-y-1 text-xs">
                    <p className="text-navy-500 text-[11px]">{doc.userId?.email}</p>
                    <div className="flex justify-between text-navy-600 dark:text-navy-400 pt-1 font-mono">
                      <span>Room: {doc.roomNumber}</span>
                      <span>Fee: ₹{doc.consultationFee}</span>
                      <span>Pace: {doc.avgConsultationMinutes || 15}m</span>
                    </div>
                  </CardContent>
                </Card>
              ))}

            {/* Receptionists & Admin staff */}
            {(activeTab === 'all' || activeTab === 'receptionist') &&
              staffUsers.map((user: any) => (
                <Card key={user._id} className="hover:border-teal-500/40 transition-all flex flex-col justify-between">
                  <CardHeader className="pb-3 flex flex-row items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 uppercase">
                          {user.role}
                        </span>
                        <Badge variant={user.isActive ? 'success' : 'default'}>
                          {user.isActive ? 'ACTIVE' : 'DISABLED'}
                        </Badge>
                      </div>
                      <h3 className="text-base font-bold text-navy-900 dark:text-white mt-1.5">
                        {user.name}
                      </h3>
                      <p className="text-xs text-navy-500 dark:text-navy-400">{user.email}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleStatusMutation.mutate(user._id)}
                      className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                        user.isActive
                          ? 'text-rose-600 hover:bg-rose-50'
                          : 'text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title={user.isActive ? 'Disable account' : 'Enable account'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </CardHeader>
                  <CardContent className="pt-2 border-t border-navy-100 dark:border-navy-800 text-xs text-navy-400">
                    Phone: {user.phone || 'N/A'} • Joined: {new Date(user.createdAt).toLocaleDateString()}
                  </CardContent>
                </Card>
              ))}
          </>
        )}
      </div>

      {/* Add Staff Modal */}
      {modalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setModalOpen(false)}
          title="Add New Hospital Staff Member"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-navy-700 dark:text-navy-300 mb-1">
                Staff Role *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('doctor')}
                  className={`py-2 text-xs font-bold rounded-xl transition-all ${
                    role === 'doctor'
                      ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-400'
                      : 'bg-navy-100 dark:bg-navy-800 text-navy-600'
                  }`}
                >
                  Doctor / Clinician
                </button>
                <button
                  type="button"
                  onClick={() => setRole('receptionist')}
                  className={`py-2 text-xs font-bold rounded-xl transition-all ${
                    role === 'receptionist'
                      ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-400'
                      : 'bg-navy-100 dark:bg-navy-800 text-navy-600'
                  }`}
                >
                  Receptionist / Cashier
                </button>
              </div>
            </div>

            <Input
              label="Full Name *"
              placeholder="e.g. Dr. Anjali Sharma or Priya Nair"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Input
              label="Email Address *"
              type="email"
              placeholder="e.g. staff@smartqueue.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Temporary Password *"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Input
              label="Contact Phone"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            {role === 'doctor' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-navy-700 dark:text-navy-300 mb-1">
                    Department *
                  </label>
                  <Select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    options={[
                      { label: 'Select Department', value: '' },
                      ...(departments?.map((d: any) => ({ label: `${d.name} (${d.code})`, value: d._id })) || []),
                    ]}
                  />
                </div>

                <Input
                  label="Specialization *"
                  placeholder="e.g. Interventional Cardiology, Pediatrician"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Room / Counter Number *"
                    placeholder="e.g. Room 204"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                  />
                  <Input
                    label="Consultation Fee (INR) *"
                    type="number"
                    value={String(consultationFee)}
                    onChange={(e) => setConsultationFee(Number(e.target.value))}
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!name || !email}
                isLoading={createMutation.isPending}
                onClick={() => createMutation.mutate()}
                className="font-bold shadow-md"
              >
                Create Staff Account
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
