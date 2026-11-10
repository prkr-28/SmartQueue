import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Search,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileText,
  User,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';

export const WalkInBookingPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [patientMode, setPatientMode] = useState<'existing' | 'new'>('new');
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  // New patient registration form
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientEmail, setNewPatientEmail] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientGender, setNewPatientGender] = useState('other');

  // Appointment options
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedSlot, setSelectedSlot] = useState('');
  const [priority, setPriority] = useState<'normal' | 'senior_disabled' | 'emergency'>('normal');
  const [visitType, setVisitType] = useState<'new' | 'follow_up' | 'emergency'>('new');
  const [symptoms, setSymptoms] = useState('');
  const [autoCheckIn, setAutoCheckIn] = useState(true);

  // Success modal
  const [successModalData, setSuccessModalData] = useState<any>(null);

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
      return res.data.data;
    },
    enabled: !!hospitalData?._id,
  });

  // Fetch doctors
  const { data: doctors } = useQuery({
    queryKey: ['doctors', selectedDeptId],
    queryFn: async () => {
      const query = selectedDeptId ? `?departmentId=${selectedDeptId}` : '';
      const res = await api.get(`/doctors${query}`);
      return res.data.data;
    },
  });

  // Fetch available slots when doctor and date are chosen
  const { data: slotsData, isLoading: loadingSlots } = useQuery({
    queryKey: ['slots', selectedDocId, selectedDate],
    queryFn: async () => {
      if (!selectedDocId || !selectedDate) return null;
      const res = await api.get(`/doctors/${selectedDocId}/slots?date=${selectedDate}`);
      return res.data.data;
    },
    enabled: !!selectedDocId && !!selectedDate,
  });

  // Search existing patients
  const { data: searchResults, isFetching: searchingPatients } = useQuery({
    queryKey: ['patientSearch', patientSearch],
    queryFn: async () => {
      if (!patientSearch || patientSearch.length < 2) return [];
      const res = await api.get(`/admin/patients?search=${patientSearch}&limit=5`);
      return res.data.data.items || [];
    },
    enabled: patientSearch.length >= 2,
  });

  // Booking Mutation
  const bookMutation = useMutation({
    mutationFn: async () => {
      let patientId = selectedPatient?._id;

      // If new patient, register first
      if (patientMode === 'new') {
        const dummyEmail = newPatientEmail.trim() || `walkin.${Date.now()}@smartqueue.local`;
        const regRes = await api.post('/auth/register', {
          name: newPatientName,
          email: dummyEmail,
          password: 'WalkinPassword@123',
          phone: newPatientPhone,
          role: 'patient',
        });
        patientId = regRes.data.data.user._id;
      }

      if (!patientId) {
        throw new Error('Please select or register a patient');
      }

      if (!selectedDocId || !selectedSlot) {
        throw new Error('Please select a doctor and time slot');
      }

      // Book appointment
      const bookRes = await api.post('/appointments', {
        patientId,
        doctorId: selectedDocId,
        date: selectedDate,
        startTime: selectedSlot,
        visitType,
        priority: priority === 'senior_disabled' ? 'senior' : priority,
        symptoms,
        isWalkIn: true,
      });

      const appointment = bookRes.data.data;

      // Auto check-in if requested
      let queueEntry = null;
      if (autoCheckIn) {
        const checkInRes = await api.post('/queue/check-in', {
          appointmentId: appointment._id,
          priority: priority === 'senior_disabled' ? 'senior_disabled' : priority,
        });
        queueEntry = checkInRes.data.data;
      }

      return { appointment, queueEntry };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['receptionist'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setSuccessModalData(data);
      toast.success(
        data.queueEntry
          ? `Walk-in booked & Token ${data.queueEntry.tokenNumber} issued!`
          : 'Walk-in appointment booked successfully!'
      );
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || 'Booking failed');
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-navy-900 dark:text-white">Walk-in Patient Desk</h1>
        <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
          Instantly register, book, and issue a live queue token for counter patients
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Patient Selection */}
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <User className="w-4 h-4 text-medical-600" />
                1. Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-navy-100 dark:bg-navy-800">
                <button
                  type="button"
                  onClick={() => {
                    setPatientMode('new');
                    setSelectedPatient(null);
                  }}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    patientMode === 'new'
                      ? 'bg-white dark:bg-navy-900 text-teal-700 dark:text-teal-300 shadow-sm'
                      : 'text-navy-500 hover:text-navy-900 dark:hover:text-white'
                  }`}
                >
                  New Patient
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPatientMode('existing');
                  }}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    patientMode === 'existing'
                      ? 'bg-white dark:bg-navy-900 text-teal-700 dark:text-teal-300 shadow-sm'
                      : 'text-navy-500 hover:text-navy-900 dark:hover:text-white'
                  }`}
                >
                  Existing Patient
                </button>
              </div>

              {patientMode === 'new' ? (
                <div className="space-y-3">
                  <Input
                    label="Full Name *"
                    placeholder="e.g. Ramesh Kumar"
                    value={newPatientName}
                    onChange={(e) => setNewPatientName(e.target.value)}
                  />
                  <Input
                    label="Phone Number *"
                    placeholder="e.g. 9876543210"
                    value={newPatientPhone}
                    onChange={(e) => setNewPatientPhone(e.target.value)}
                  />
                  <Input
                    label="Email (Optional)"
                    type="email"
                    placeholder="patient@example.com"
                    value={newPatientEmail}
                    onChange={(e) => setNewPatientEmail(e.target.value)}
                  />
                  <div>
                    <label className="block text-xs font-semibold text-navy-700 dark:text-navy-300 mb-1">
                      Gender
                    </label>
                    <Select
                      value={newPatientGender}
                      onChange={(e) => setNewPatientGender(e.target.value)}
                      options={[
                        { label: 'Male', value: 'male' },
                        { label: 'Female', value: 'female' },
                        { label: 'Other', value: 'other' },
                      ]}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    label="Search Patient"
                    placeholder="Name, phone, or email"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    leftIcon={<Search className="w-4 h-4" />}
                  />

                  {searchingPatients && <p className="text-xs text-navy-400">Searching...</p>}

                  {searchResults && searchResults.length > 0 && !selectedPatient && (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto border border-navy-100 dark:border-navy-800 rounded-xl p-1.5">
                      {searchResults.map((p: any) => (
                        <div
                          key={p._id}
                          onClick={() => {
                            setSelectedPatient(p);
                            setPatientSearch(p.name);
                          }}
                          className="p-2 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-950/40 cursor-pointer text-xs transition-colors"
                        >
                          <p className="font-bold text-navy-900 dark:text-white">{p.name}</p>
                          <p className="text-[10px] text-navy-400">{p.phone} • {p.email}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedPatient && (
                    <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-teal-900 dark:text-teal-200">{selectedPatient.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedPatient(null)}
                          className="text-[10px] text-rose-600 font-bold hover:underline"
                        >
                          Change
                        </button>
                      </div>
                      <p className="text-teal-700 dark:text-teal-300 text-[11px] mt-0.5">
                        {selectedPatient.phone} • {selectedPatient.email}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 2 Columns: Doctor, Slot, & Queue Options */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-medical-600" />
                2. Clinical Routing & Scheduling
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-navy-700 dark:text-navy-300 mb-1">
                    Department
                  </label>
                  <Select
                    value={selectedDeptId}
                    onChange={(e) => {
                      setSelectedDeptId(e.target.value);
                      setSelectedDocId('');
                      setSelectedSlot('');
                    }}
                    options={[
                      { label: 'All Departments', value: '' },
                      ...(departments?.map((d: any) => ({ label: `${d.name} (${d.code})`, value: d._id })) || []),
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy-700 dark:text-navy-300 mb-1">
                    Doctor *
                  </label>
                  <Select
                    value={selectedDocId}
                    onChange={(e) => {
                      setSelectedDocId(e.target.value);
                      setSelectedSlot('');
                    }}
                    options={[
                      { label: 'Select Doctor', value: '' },
                      ...(doctors?.map((doc: any) => ({
                        label: `Dr. ${(doc.userId as any)?.name || 'Doctor'} (${doc.specialization} - Room ${doc.roomNumber})`,
                        value: doc._id,
                      })) || []),
                    ]}
                  />
                </div>
              </div>

              {/* Date & Slots */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-navy-700 dark:text-navy-300">
                    Appointment Date & Available Slots
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedSlot('');
                    }}
                    className="text-xs border border-navy-200 dark:border-navy-700 rounded-lg px-2.5 py-1 bg-white dark:bg-navy-900"
                  />
                </div>

                {loadingSlots ? (
                  <p className="text-xs text-navy-400 py-3">Loading available doctor slots...</p>
                ) : slotsData?.slots && slotsData.slots.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-36 overflow-y-auto p-1 border border-navy-100 dark:border-navy-800 rounded-xl">
                    {slotsData.slots.map((slot: any) => (
                      <button
                        key={slot.startTime}
                        type="button"
                        disabled={!slot.isAvailable}
                        onClick={() => setSelectedSlot(slot.startTime)}
                        className={`p-2 rounded-lg text-xs font-mono font-bold transition-all ${
                          selectedSlot === slot.startTime
                            ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-400'
                            : slot.isAvailable
                            ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 hover:bg-teal-100'
                            : 'bg-navy-100 dark:bg-navy-800/40 text-navy-400 cursor-not-allowed line-through'
                        }`}
                      >
                        {slot.startTime}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-navy-50 dark:bg-navy-800/50 text-xs text-navy-500">
                    {selectedDocId ? 'No available slots on this date. You can select another date.' : 'Select a doctor above to view available consultation slots.'}
                  </div>
                )}
              </div>

              {/* Priority & Visit Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-navy-700 dark:text-navy-300 mb-1">
                    Queue Priority
                  </label>
                  <Select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    options={[
                      { label: 'Normal (Standard Order)', value: 'normal' },
                      { label: 'Senior Citizen / Disabled / Pregnant', value: 'senior_disabled' },
                      { label: 'Emergency (Urgent High Priority)', value: 'emergency' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy-700 dark:text-navy-300 mb-1">
                    Visit Type
                  </label>
                  <Select
                    value={visitType}
                    onChange={(e) => setVisitType(e.target.value as any)}
                    options={[
                      { label: 'New Patient Visit', value: 'new' },
                      { label: 'Follow-up Consultation', value: 'follow_up' },
                      { label: 'Emergency Walk-in', value: 'emergency' },
                    ]}
                  />
                </div>
              </div>

              <Input
                label="Symptoms / Reason for Visit"
                placeholder="e.g. High fever, chest pain, routine checkup"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
              />

              {/* Auto Check-in Toggle */}
              <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-teal-900 dark:text-teal-200">
                    Immediate Queue Check-in
                  </p>
                  <p className="text-[11px] text-teal-700 dark:text-teal-400">
                    Generates token number immediately and pushes to live waiting room screens
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoCheckIn}
                  onChange={(e) => setAutoCheckIn(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full font-bold shadow-md"
                isLoading={bookMutation.isPending}
                disabled={!selectedDocId || !selectedSlot}
                onClick={() => bookMutation.mutate()}
              >
                Book Walk-in & Issue Token
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success Modal */}
      {successModalData && (
        <Modal
          isOpen={true}
          onClose={() => setSuccessModalData(null)}
          title="Patient Walk-in Registered Successfully"
        >
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <p className="text-xs uppercase font-bold text-navy-400">Assigned Queue Token</p>
              <h2 className="text-4xl font-black font-mono text-teal-700 dark:text-teal-400 mt-1">
                {successModalData.queueEntry?.tokenNumber || 'BOOKED'}
              </h2>
            </div>

            <div className="p-3 rounded-xl bg-navy-50 dark:bg-navy-800 text-left text-xs space-y-1.5 border border-navy-100 dark:border-navy-700">
              <div className="flex justify-between">
                <span className="text-navy-500">Appointment #:</span>
                <span className="font-bold font-mono">{successModalData.appointment.appointmentNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-500">Date & Slot:</span>
                <span className="font-bold">{successModalData.appointment.date} at {successModalData.appointment.startTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-500">Consultation Fee:</span>
                <span className="font-bold text-emerald-600">₹{successModalData.appointment.consultationFee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-500">Priority:</span>
                <Badge variant={priority === 'emergency' ? 'danger' : 'success'}>
                  {priority.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="w-full text-xs font-bold"
                onClick={() => {
                  window.open(`/api/appointments/${successModalData.appointment._id}/slip`, '_blank');
                }}
              >
                <FileText className="w-4 h-4 mr-1.5" />
                Print Slip
              </Button>
              <Button
                variant="primary"
                className="w-full text-xs font-bold"
                onClick={() => {
                  setSuccessModalData(null);
                  navigate('/receptionist/queue');
                }}
              >
                Queue Board
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
