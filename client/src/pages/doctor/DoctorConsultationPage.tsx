import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stethoscope,
  Activity,
  Pill,
  Plus,
  Trash2,
  FileText,
  UploadCloud,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowLeft,
  AlertCircle,
  FileCheck,
  User,
  History,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';

interface PrescriptionItem {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export const DoctorConsultationPage: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Vitals State
  const [bloodPressure, setBloodPressure] = useState('120/80');
  const [pulse, setPulse] = useState('72');
  const [temperature, setTemperature] = useState('98.6');
  const [weight, setWeight] = useState('70');
  const [oxygenLevel, setOxygenLevel] = useState('98');

  // Clinical Diagnosis & Notes
  const [diagnosis, setDiagnosis] = useState('');
  const [symptomsInput, setSymptomsInput] = useState('');
  const [notes, setNotes] = useState('');
  const [labTestsInput, setLabTestsInput] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');

  // Prescription Items
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([
    { medicineName: 'Paracetamol', dosage: '500mg', frequency: '1-0-1 after food', duration: '5 days', instructions: 'Take with water' },
  ]);

  // File Upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileTitle, setFileTitle] = useState('');

  // 1. Fetch Appointment Details
  const { data: appointment, isLoading: loadingApt } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      const res = await api.get(`/appointments/${appointmentId}`);
      return res.data.data;
    },
    enabled: !!appointmentId,
  });

  const patientId = appointment?.patientId?._id || appointment?.patientId;

  // 2. Fetch Existing Consultation (if already exists)
  const { data: existingConsultation } = useQuery({
    queryKey: ['consultation', appointmentId],
    queryFn: async () => {
      const res = await api.get(`/consultations/appointment/${appointmentId}`);
      return res.data.data;
    },
    enabled: !!appointmentId,
  });

  // 3. Fetch Patient's Past Consultation History
  const { data: patientHistory } = useQuery({
    queryKey: ['patientHistory', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const res = await api.get(`/consultations/patient/${patientId}`);
      return res.data.data || [];
    },
    enabled: !!patientId,
  });

  // Populate existing data if found
  useEffect(() => {
    if (existingConsultation) {
      if (existingConsultation.vitals) {
        setBloodPressure(existingConsultation.vitals.bloodPressure || '');
        setPulse(existingConsultation.vitals.pulse ? String(existingConsultation.vitals.pulse) : '');
        setTemperature(existingConsultation.vitals.temperature ? String(existingConsultation.vitals.temperature) : '');
        setWeight(existingConsultation.vitals.weight ? String(existingConsultation.vitals.weight) : '');
        setOxygenLevel(existingConsultation.vitals.oxygenLevel ? String(existingConsultation.vitals.oxygenLevel) : '');
      }
      setDiagnosis(existingConsultation.diagnosis || '');
      setSymptomsInput(existingConsultation.symptoms?.join(', ') || '');
      setNotes(existingConsultation.notes || '');
      if (existingConsultation.prescriptionItems && existingConsultation.prescriptionItems.length > 0) {
        setPrescriptionItems(existingConsultation.prescriptionItems);
      }
      if (existingConsultation.labTests) {
        setLabTestsInput(existingConsultation.labTests.join(', '));
      }
      if (existingConsultation.followUpDate) {
        setFollowUpDate(new Date(existingConsultation.followUpDate).toISOString().slice(0, 10));
      }
    } else if (appointment?.symptoms) {
      setSymptomsInput(appointment.symptoms);
    }
  }, [existingConsultation, appointment]);

  // Add / Remove medicine row
  const addPrescriptionRow = () => {
    setPrescriptionItems([
      ...prescriptionItems,
      { medicineName: '', dosage: '500mg', frequency: '1-0-1', duration: '5 days', instructions: '' },
    ]);
  };

  const removePrescriptionRow = (index: number) => {
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
  };

  const updatePrescriptionItem = (index: number, field: keyof PrescriptionItem, val: string) => {
    const updated = [...prescriptionItems];
    updated[index][field] = val;
    setPrescriptionItems(updated);
  };

  // Save Consultation Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!diagnosis.trim()) {
        throw new Error('Please provide a clinical diagnosis');
      }

      const payload = {
        appointmentId,
        vitals: {
          bloodPressure,
          pulse: pulse ? Number(pulse) : undefined,
          temperature: temperature ? Number(temperature) : undefined,
          weight: weight ? Number(weight) : undefined,
          oxygenLevel: oxygenLevel ? Number(oxygenLevel) : undefined,
        },
        symptoms: symptomsInput ? symptomsInput.split(',').map((s) => s.trim()) : [],
        diagnosis,
        notes,
        prescriptionItems: prescriptionItems.filter((i) => i.medicineName.trim()),
        followUpDate: followUpDate || undefined,
        labTests: labTestsInput ? labTestsInput.split(',').map((t) => t.trim()) : [],
      };

      const res = await api.post('/consultations', payload);
      const consultation = res.data.data;

      // If a file report is attached, upload it
      if (uploadedFile && patientId) {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('patientId', patientId);
        formData.append('title', fileTitle || uploadedFile.name);
        formData.append('recordType', 'prescription');
        formData.append('consultationId', consultation._id);
        formData.append('appointmentId', appointmentId!);

        await api.post('/medical-records/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      return consultation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['consultation', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['doctor', 'queue'] });
      toast.success('Consultation completed and prescription generated!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.message || 'Failed to save consultation');
    },
  });

  if (loadingApt) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const patient = appointment?.patientId;
  const isCompleted = appointment?.status === 'completed';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/doctor/queue')}
            className="p-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-navy-900 dark:text-white">
              Clinical Consultation & Rx
            </h1>
            <p className="text-xs text-navy-500 dark:text-navy-400">
              Appt #{appointment?.appointmentNumber} • {appointment?.date} ({appointment?.startTime})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {existingConsultation && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-bold text-teal-700 dark:text-teal-300"
              onClick={() => window.open(`/api/consultations/${existingConsultation._id}/pdf`, '_blank')}
            >
              <FileCheck className="w-4 h-4 mr-1.5" />
              Download Prescription PDF
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            className="text-xs font-bold shadow-md"
            isLoading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            {isCompleted ? 'Update Consultation' : 'Save & Complete Visit'}
          </Button>
        </div>
      </div>

      {/* Patient Overview Card */}
      <Card className="bg-gradient-to-r from-teal-50/80 to-sky-50/50 dark:from-teal-950/30 dark:to-navy-900 border-teal-200 dark:border-teal-900">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              {patient?.name?.[0] || 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-navy-900 dark:text-white">{patient?.name}</h3>
                <Badge variant={appointment?.priority === 'emergency' ? 'danger' : 'default'}>
                  {appointment?.priority?.toUpperCase() || 'NORMAL'}
                </Badge>
              </div>
              <p className="text-xs text-navy-500 dark:text-navy-400 mt-0.5">
                {patient?.phone} • {patient?.email} • Visit: <span className="font-semibold uppercase">{appointment?.visitType}</span>
              </p>
            </div>
          </div>

          <div className="text-sm font-semibold text-teal-800 dark:text-teal-200 sm:text-right">
            <span className="text-[10px] uppercase tracking-wider text-navy-400 block font-bold">Chief Complaint</span>
            {appointment?.symptoms || 'Routine clinical visit'}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Clinical Form */}
        <div className="lg:col-span-2 space-y-5">
          {/* 1. Patient Vitals */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Activity className="w-4 h-4 text-medical-600" />
                1. Patient Vitals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <Input
                  label="BP (mmHg)"
                  placeholder="120/80"
                  value={bloodPressure}
                  onChange={(e) => setBloodPressure(e.target.value)}
                />
                <Input
                  label="Pulse (bpm)"
                  placeholder="72"
                  type="number"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                />
                <Input
                  label="Temp (°F)"
                  placeholder="98.6"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                />
                <Input
                  label="Weight (kg)"
                  placeholder="70"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
                <Input
                  label="SpO2 (%)"
                  placeholder="98"
                  value={oxygenLevel}
                  onChange={(e) => setOxygenLevel(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* 2. Diagnosis & Clinical Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-medical-600" />
                2. Clinical Diagnosis & Findings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Diagnosis *"
                placeholder="e.g. Acute upper respiratory tract infection, Essential hypertension"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />

              <Input
                label="Symptoms (comma separated)"
                placeholder="e.g. Fever, cough, fatigue, headache"
                value={symptomsInput}
                onChange={(e) => setSymptomsInput(e.target.value)}
              />

              <div>
                <label className="block text-xs font-semibold text-navy-700 dark:text-navy-300 mb-1">
                  Doctor Clinical Advice & Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Plenty of oral fluids, rest for 3 days, avoid cold beverages"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs border border-navy-200 dark:border-navy-700 rounded-xl p-3 bg-white dark:bg-navy-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* 3. Prescription Items Builder */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Pill className="w-4 h-4 text-medical-600" />
                  3. Prescription Medication Builder
                </CardTitle>
                <p className="text-xs text-navy-400">Add drug prescriptions with dosages and frequencies</p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={addPrescriptionRow}
                className="text-xs font-bold text-teal-700 dark:text-teal-300 border-teal-300"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Medicine
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {prescriptionItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-navy-100 dark:border-navy-800 bg-navy-50/50 dark:bg-navy-800/40 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-navy-700 dark:text-navy-300">
                      Medicine #{idx + 1}
                    </span>
                    {prescriptionItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePrescriptionRow(idx)}
                        className="text-rose-500 hover:text-rose-700 text-[11px] flex items-center gap-1 font-semibold"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div className="sm:col-span-2">
                      <Input
                        placeholder="Drug / Medicine Name (e.g. Amoxicillin)"
                        value={item.medicineName}
                        onChange={(e) => updatePrescriptionItem(idx, 'medicineName', e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="Dosage (e.g. 500mg)"
                        value={item.dosage}
                        onChange={(e) => updatePrescriptionItem(idx, 'dosage', e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="Duration (e.g. 5 days)"
                        value={item.duration}
                        onChange={(e) => updatePrescriptionItem(idx, 'duration', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      placeholder="Frequency (e.g. 1-0-1 after food)"
                      value={item.frequency}
                      onChange={(e) => updatePrescriptionItem(idx, 'frequency', e.target.value)}
                    />
                    <Input
                      placeholder="Instructions (e.g. Before bed, do not skip)"
                      value={item.instructions}
                      onChange={(e) => updatePrescriptionItem(idx, 'instructions', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 4. Investigations & Follow-Up */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-medical-600" />
                4. Investigations & Follow-up Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Recommended Lab Tests (comma separated)"
                  placeholder="e.g. Complete Blood Count (CBC), Lipid Profile, Chest X-Ray"
                  value={labTestsInput}
                  onChange={(e) => setLabTestsInput(e.target.value)}
                />

                <div>
                  <label className="block text-xs font-semibold text-navy-700 dark:text-navy-300 mb-1">
                    Follow-Up Date
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full text-xs border border-navy-200 dark:border-navy-700 rounded-xl px-3 py-2.5 bg-white dark:bg-navy-900"
                  />
                </div>
              </div>

              {/* Upload Report */}
              <div className="pt-2 border-t border-navy-100 dark:border-navy-800">
                <label className="block text-xs font-semibold text-navy-700 dark:text-navy-300 mb-1">
                  Attach Medical Report / Scanned File (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                    className="text-xs text-navy-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                  />
                  {uploadedFile && (
                    <Input
                      placeholder="Document title (e.g. Blood Test Report)"
                      value={fileTitle}
                      onChange={(e) => setFileTitle(e.target.value)}
                      className="max-w-xs text-xs"
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Patient Medical Timeline History */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <History className="w-4 h-4 text-teal-600" />
                Patient Medical Timeline ({patientHistory?.length || 0})
              </CardTitle>
              <p className="text-xs text-navy-500 dark:text-navy-400">Past consultation records for this patient</p>
            </CardHeader>
            <CardContent>
              {patientHistory && patientHistory.length > 0 ? (
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {patientHistory.map((rec: any) => (
                    <div
                      key={rec._id}
                      className="p-3 rounded-xl border border-navy-100 dark:border-navy-800 bg-white dark:bg-navy-900 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-navy-900 dark:text-white">
                          {rec.diagnosis}
                        </span>
                        <span className="text-[10px] text-navy-400 font-mono">
                          {new Date(rec.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-[11px] text-teal-700 dark:text-teal-300">
                        Dr. {rec.doctorId?.userId?.name || 'Physician'}
                      </p>

                      {rec.vitals?.bloodPressure && (
                        <p className="text-[10px] text-navy-500">
                          BP: {rec.vitals.bloodPressure} | Pulse: {rec.vitals.pulse || '—'} bpm
                        </p>
                      )}

                      {rec.prescriptionItems?.length > 0 && (
                        <div className="text-[10px] text-navy-500 pt-1 border-t border-navy-50 dark:border-navy-800">
                          <span className="font-semibold text-navy-700 dark:text-navy-300">Rx: </span>
                          {rec.prescriptionItems.map((p: any) => p.medicineName).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-xs text-navy-400 italic">
                  No prior medical consultation history on record for this patient.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
