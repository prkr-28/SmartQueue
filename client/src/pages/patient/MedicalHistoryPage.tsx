import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { FileText, Calendar, Pill, Activity, Download, Plus } from 'lucide-react';
import { AppointmentDto } from '@smartqueue/shared';

export const MedicalHistoryPage: React.FC = () => {
  const [pastVisits, setPastVisits] = useState<AppointmentDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPastVisits();
  }, []);

  const fetchPastVisits = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/appointments?status=completed&limit=20');
      if (res.data.success) {
        setPastVisits(res.data.data.items);
      }
    } catch (err) {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-navy-900 dark:text-white">Medical History & Prescriptions</h2>
        <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
          Review your clinical consultation records, prescribed medications, and doctor diagnoses
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="h-32 animate-pulse bg-navy-100 dark:bg-navy-800" />
          ))}
        </div>
      ) : pastVisits.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          title="No Medical Consultations Recorded Yet"
          description="Your medical prescriptions, doctor diagnoses, and vitals from completed consultations will appear chronologically here."
          actionText="Book New Consultation"
          onAction={() => (window.location.href = '/patient/book')}
        />
      ) : (
        <div className="space-y-6 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-navy-200 dark:before:bg-navy-800">
          {pastVisits.map((visit) => {
            const doc = visit.doctorId as any;
            const docUser = doc?.userId;
            const dept = visit.departmentId as any;

            return (
              <div key={visit._id} className="relative pl-10">
                <div className="absolute left-2.5 top-5 -translate-x-1/2 w-4 h-4 rounded-full bg-medical-500 ring-4 ring-white dark:ring-navy-950" />
                <Card className="p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-navy-100 dark:border-navy-800">
                    <div>
                      <span className="text-xs font-bold text-medical-600 dark:text-medical-400 uppercase">
                        {dept?.name || 'General OPD'}
                      </span>
                      <h4 className="text-base font-bold text-navy-900 dark:text-white mt-0.5">
                        Consultation with Dr. {docUser?.name || 'Doctor'}
                      </h4>
                    </div>
                    <Badge variant="success" size="sm">
                      COMPLETED
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-navy-600 dark:text-navy-400">
                    <div>
                      <span className="font-semibold text-navy-400 uppercase text-[10px]">Date</span>
                      <p className="font-bold text-navy-900 dark:text-white">{visit.date}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-navy-400 uppercase text-[10px]">Slot</span>
                      <p className="font-bold text-navy-900 dark:text-white">{visit.startTime} - {visit.endTime}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-navy-400 uppercase text-[10px]">Fee Paid</span>
                      <p className="font-bold text-medical-600">₹{visit.consultationFee}</p>
                    </div>
                  </div>

                  {visit.symptoms && (
                    <div className="p-3 rounded-xl bg-navy-50 dark:bg-navy-800/60 text-xs">
                      <span className="font-bold text-navy-800 dark:text-navy-200">Clinical Symptoms & Notes:</span>
                      <p className="text-navy-600 dark:text-navy-400 mt-0.5">{visit.symptoms}</p>
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
