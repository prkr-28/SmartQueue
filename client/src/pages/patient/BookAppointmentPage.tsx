import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import {
  Calendar,
  Clock,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Download,
  AlertCircle,
  FileText,
  User,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  DepartmentDto,
  DoctorProfileDto,
  AvailableSlot,
  DependentDto,
  AppointmentDto,
  VisitType,
} from '@smartqueue/shared';

export const BookAppointmentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const preselectedDoctorId = searchParams.get('doctorId') || '';
  const navigate = useNavigate();
  const { user } = useAuth();

  // Wizard Steps: 1 = Department, 2 = Doctor, 3 = Date & Slot, 4 = Patient Details, 5 = Confirmed
  const [currentStep, setCurrentStep] = useState(preselectedDoctorId ? 3 : 1);

  // Data states
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfileDto[]>([]);
  const [dependents, setDependents] = useState<DependentDto[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);

  // Selection states
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(preselectedDoctorId);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfileDto | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default to tomorrow or today
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [selectedPatientTarget, setSelectedPatientTarget] = useState<string>('self');
  const [visitType, setVisitType] = useState<VisitType>('new');
  const [symptoms, setSymptoms] = useState('');
  const [notes, setNotes] = useState('');

  // Loading & confirmation states
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState<AppointmentDto | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedDoctorId) {
      fetchDoctorDetails(selectedDoctorId);
    }
  }, [selectedDoctorId]);

  useEffect(() => {
    if (selectedDoctorId && selectedDate) {
      fetchSlots(selectedDoctorId, selectedDate);
    }
  }, [selectedDoctorId, selectedDate]);

  const fetchInitialData = async () => {
    try {
      const [hospRes, depRes] = await Promise.all([
        api.get('/hospitals'),
        api.get('/dependents'),
      ]);

      if (hospRes.data.success && hospRes.data.data.length > 0) {
        const hospitalId = hospRes.data.data[0]._id;
        const deptRes = await api.get(`/hospitals/${hospitalId}/departments`);
        if (deptRes.data.success) {
          setDepartments(deptRes.data.data);
        }
      }

      if (depRes.data.success) {
        setDependents(depRes.data.data);
      }
    } catch (err) {
      // Ignore
    }
  };

  const fetchDoctorDetails = async (id: string) => {
    try {
      const res = await api.get(`/doctors/${id}`);
      if (res.data.success) {
        setSelectedDoctor(res.data.data.doctor);
        if (!selectedDeptId && res.data.data.doctor.departmentId) {
          setSelectedDeptId((res.data.data.doctor.departmentId as any)._id || res.data.data.doctor.departmentId);
        }
      }
    } catch (err) {
      // Ignore
    }
  };

  const fetchDoctorsForDept = async (deptId: string) => {
    try {
      const res = await api.get(`/doctors?departmentId=${deptId}`);
      if (res.data.success) {
        setDoctors(res.data.data);
      }
    } catch (err) {
      // Ignore
    }
  };

  const fetchSlots = async (doctorId: string, date: string) => {
    try {
      setIsLoadingSlots(true);
      setSelectedSlot(null);
      const res = await api.get(`/doctors/${doctorId}/slots?date=${date}`);
      if (res.data.success) {
        setAvailableSlots(res.data.data.slots || []);
      }
    } catch (err) {
      toast.error('Failed to load slots for selected date');
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleSelectDept = (deptId: string) => {
    setSelectedDeptId(deptId);
    fetchDoctorsForDept(deptId);
    setCurrentStep(2);
  };

  const handleSelectDoctor = (doc: DoctorProfileDto) => {
    setSelectedDoctorId(doc._id);
    setSelectedDoctor(doc);
    setCurrentStep(3);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoctorId || !selectedDate || !selectedSlot) {
      toast.error('Please select an appointment time slot');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        doctorId: selectedDoctorId,
        date: selectedDate,
        startTime: selectedSlot.startTime,
        visitType,
        symptoms,
        notes,
      };

      if (selectedPatientTarget !== 'self') {
        payload.dependentId = selectedPatientTarget;
      }

      const res = await api.post('/appointments', payload);
      if (res.data.success) {
        setConfirmedAppointment(res.data.data);
        setCurrentStep(5);
        toast.success('Appointment booked successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Booking failed. Slot may no longer be available.');
    } finally {
      setIsSubmitting(false);
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
      toast.error('Failed to download slip');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Stepper Header */}
      <div className="bg-white dark:bg-navy-900 border border-navy-200 dark:border-navy-800 rounded-2xl p-4 shadow-card">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: 'Department' },
            { num: 2, label: 'Doctor' },
            { num: 3, label: 'Date & Slot' },
            { num: 4, label: 'Patient Info' },
            { num: 5, label: 'Confirmed' },
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === s.num
                    ? 'bg-medical-600 text-white ring-4 ring-medical-500/20'
                    : currentStep > s.num
                    ? 'bg-emerald-500 text-white'
                    : 'bg-navy-100 dark:bg-navy-800 text-navy-400'
                }`}
              >
                {currentStep > s.num ? '✓' : s.num}
              </div>
              <span
                className={`hidden sm:inline-block text-xs font-semibold ${
                  currentStep === s.num ? 'text-navy-900 dark:text-white' : 'text-navy-400'
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Department Selection */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold text-navy-900 dark:text-white">Step 1: Choose Medical Department</h3>
            <p className="text-xs text-navy-500 mt-1">Select the department that best matches your symptoms or health need.</p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <Card
                key={dept._id}
                hoverable
                onClick={() => handleSelectDept(dept._id)}
                className={`p-5 transition-all text-left ${
                  selectedDeptId === dept._id ? 'border-medical-500 ring-2 ring-medical-500/20 bg-medical-50/20' : ''
                }`}
              >
                <Badge variant="primary" size="sm">
                  {dept.code}
                </Badge>
                <h4 className="text-base font-bold text-navy-900 dark:text-white mt-2">{dept.name}</h4>
                <p className="text-xs text-navy-500 dark:text-navy-400 mt-1 line-clamp-2">{dept.description}</p>
                <div className="mt-4 flex items-center text-xs font-bold text-medical-600 dark:text-medical-400 gap-1">
                  <span>Select Department</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Doctor Selection */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-navy-900 dark:text-white">Step 2: Choose Specialist Doctor</h3>
              <p className="text-xs text-navy-500 mt-1">Select an experienced practitioner for your consultation.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {doctors.map((doc) => {
              const docUser = doc.userId as any;
              return (
                <Card
                  key={doc._id}
                  hoverable
                  onClick={() => handleSelectDoctor(doc)}
                  className="p-5 flex items-start gap-3.5"
                >
                  <Avatar name={docUser?.name} src={doc.photoUrl} size="lg" />
                  <div className="flex-1">
                    <h4 className="font-bold text-base text-navy-900 dark:text-white">{docUser?.name}</h4>
                    <p className="text-xs text-medical-600 dark:text-medical-400 font-semibold">{doc.specialization}</p>
                    <p className="text-xs text-navy-500 mt-1">
                      {doc.experienceYears} Years Exp. | Room {doc.roomNumber}
                    </p>
                    <p className="text-xs font-bold text-navy-900 dark:text-white mt-2">
                      Fee: ₹{doc.consultationFee}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: Date and Slot Selection */}
      {currentStep === 3 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-navy-900 dark:text-white">Step 3: Select Date & Available Slot</h3>
              <p className="text-xs text-navy-500 mt-1">
                Consulting with Dr. {(selectedDoctor?.userId as any)?.name} ({selectedDoctor?.specialization})
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Change Doctor
            </Button>
          </div>

          {/* Date Picker Card */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <label className="block text-xs font-semibold uppercase tracking-wider text-navy-700 dark:text-navy-300 mb-1">
                  Select Appointment Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded-lg border border-navy-300 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2 text-sm text-navy-900 dark:text-white focus:ring-2 focus:ring-medical-500"
                />
              </div>

              <div className="w-full sm:w-auto text-xs text-navy-500 dark:text-navy-400 flex items-center gap-2 pt-2 sm:pt-4">
                <Calendar className="w-4 h-4 text-medical-600" />
                <span>Working Shifts: Mon - Sat (09:00 - 18:00)</span>
              </div>
            </div>
          </Card>

          {/* Slots Grid */}
          <Card className="p-6">
            <h4 className="text-sm font-bold uppercase tracking-wider text-navy-900 dark:text-white mb-4">
              Available Slots for {selectedDate}
            </h4>

            {isLoadingSlots ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="h-10 bg-navy-100 dark:bg-navy-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 text-navy-300 dark:text-navy-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-navy-800 dark:text-navy-200">
                  No slots available on this date
                </p>
                <p className="text-xs text-navy-500 mt-1">
                  The doctor may be off-duty or on leave. Please select another date.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {availableSlots.map((slot) => {
                  const isSelected = selectedSlot?.startTime === slot.startTime;
                  return (
                    <button
                      key={slot.startTime}
                      type="button"
                      disabled={!slot.isAvailable}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                        isSelected
                          ? 'border-medical-600 bg-medical-600 text-white shadow-md'
                          : slot.isAvailable
                          ? 'border-navy-200 dark:border-navy-700 bg-white dark:bg-navy-800 text-navy-800 dark:text-navy-200 hover:border-medical-500 hover:bg-medical-50/40'
                          : 'border-navy-100 dark:border-navy-800 bg-navy-50 dark:bg-navy-950 text-navy-300 dark:text-navy-600 cursor-not-allowed line-through'
                      }`}
                    >
                      {slot.startTime}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-8 flex justify-between items-center pt-4 border-t border-navy-100 dark:border-navy-800">
              <span className="text-xs text-navy-500">
                {selectedSlot ? `Selected: ${selectedDate} at ${selectedSlot.startTime}` : 'Please pick a slot'}
              </span>
              <Button
                variant="primary"
                size="md"
                disabled={!selectedSlot}
                onClick={() => setCurrentStep(4)}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue to Patient Info
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Step 4: Patient Details & Reason */}
      {currentStep === 4 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-navy-900 dark:text-white">Step 4: Patient Details & Reason</h3>
              <p className="text-xs text-navy-500 mt-1">Specify who this appointment is for and any symptoms.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCurrentStep(3)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Slots
            </Button>
          </div>

          <Card className="p-6 space-y-4">
            {/* Self or Dependent Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-navy-700 dark:text-navy-300 mb-1">
                Who is this appointment for?
              </label>
              <Select
                value={selectedPatientTarget}
                onChange={(e) => setSelectedPatientTarget(e.target.value)}
                options={[
                  { value: 'self', label: `Myself (${user?.name})` },
                  ...dependents.map((d) => ({
                    value: d._id,
                    label: `${d.name} (${d.relationship.toUpperCase()})`,
                  })),
                ]}
              />
            </div>

            {/* Visit Type */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-navy-700 dark:text-navy-300 mb-1">
                Visit Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'new', label: 'New Consultation' },
                  { id: 'follow_up', label: 'Follow-up' },
                  { id: 'emergency', label: 'Urgent / Priority' },
                ].map((vt) => (
                  <button
                    key={vt.id}
                    type="button"
                    onClick={() => setVisitType(vt.id as VisitType)}
                    className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                      visitType === vt.id
                        ? 'border-medical-600 bg-medical-50 dark:bg-medical-950/40 text-medical-700 dark:text-medical-300'
                        : 'border-navy-200 dark:border-navy-800 bg-white dark:bg-navy-900 text-navy-700 dark:text-navy-300'
                    }`}
                  >
                    {vt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Symptoms */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-navy-700 dark:text-navy-300 mb-1">
                Primary Reason or Symptoms
              </label>
              <textarea
                rows={3}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Describe your symptoms, condition, or consultation objective..."
                className="w-full rounded-lg border border-navy-300 dark:border-navy-700 bg-white dark:bg-navy-900 p-3 text-sm text-navy-900 dark:text-white focus:ring-2 focus:ring-medical-500"
              />
            </div>

            {/* Summary Box */}
            <div className="p-4 rounded-xl bg-navy-50 dark:bg-navy-800 text-xs space-y-1.5 border border-navy-200 dark:border-navy-700">
              <p className="font-bold text-navy-900 dark:text-white text-sm">Appointment Summary</p>
              <p>Doctor: Dr. {(selectedDoctor?.userId as any)?.name}</p>
              <p>Date & Time: {selectedDate} at {selectedSlot?.startTime}</p>
              <p>Consultation Fee: ₹{selectedDoctor?.consultationFee} (Pay at desk or online)</p>
            </div>

            <div className="pt-4 border-t border-navy-100 dark:border-navy-800 flex justify-end">
              <Button
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                onClick={handleConfirmBooking}
                leftIcon={<ShieldCheck className="w-5 h-5" />}
              >
                Confirm and Lock Slot
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Step 5: Confirmed Success Screen */}
      {currentStep === 5 && confirmedAppointment && (
        <Card className="p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <Badge variant="success" size="md">
              CONFIRMED & LOCKED
            </Badge>
            <h3 className="text-2xl font-black text-navy-900 dark:text-white mt-2">
              Appointment Successfully Booked!
            </h3>
            <p className="text-sm text-navy-500 mt-1">
              Your appointment number is{' '}
              <span className="font-bold text-medical-600 dark:text-medical-400">
                {confirmedAppointment.appointmentNumber}
              </span>
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 rounded-xl bg-navy-50 dark:bg-navy-800 text-xs text-left space-y-2 border border-navy-200 dark:border-navy-700">
            <p><strong>Doctor:</strong> Dr. {(selectedDoctor?.userId as any)?.name} ({selectedDoctor?.specialization})</p>
            <p><strong>Date & Slot:</strong> {confirmedAppointment.date} at {confirmedAppointment.startTime}</p>
            <p><strong>Room:</strong> Room {selectedDoctor?.roomNumber || '101'}</p>
            <p><strong>Status:</strong> {confirmedAppointment.status.toUpperCase()}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Button
              variant="outline"
              size="md"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={() => handleDownloadSlip(confirmedAppointment._id)}
            >
              Download PDF Slip
            </Button>
            <Link to="/patient/queue">
              <Button variant="primary" size="md" leftIcon={<Clock className="w-4 h-4" />}>
                Go to Live Queue Tracker
              </Button>
            </Link>
            <Link to="/patient/appointments">
              <Button variant="ghost" size="md">
                My Appointments
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
};
