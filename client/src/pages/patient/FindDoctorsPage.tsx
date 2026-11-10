import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Avatar } from '../../components/ui/Avatar';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  Star,
  Award,
  DollarSign,
  ArrowRight,
  Info,
} from 'lucide-react';
import { DoctorProfileDto, DepartmentDto } from '@smartqueue/shared';

export const FindDoctorsPage: React.FC = () => {
  const [doctors, setDoctors] = useState<DoctorProfileDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [sortBy, setSortBy] = useState('experience_desc');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfileDto | null>(null);

  useEffect(() => {
    fetchDepartments();
    fetchDoctors();
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [departmentId, sortBy]);

  const fetchDepartments = async () => {
    try {
      const hospitalRes = await api.get('/hospitals');
      if (hospitalRes.data.success && hospitalRes.data.data.length > 0) {
        const hId = hospitalRes.data.data[0]._id;
        const deptRes = await api.get(`/hospitals/${hId}/departments`);
        if (deptRes.data.success) {
          setDepartments(deptRes.data.data);
        }
      }
    } catch (err) {
      // Ignore
    }
  };

  const fetchDoctors = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (departmentId) params.append('departmentId', departmentId);
      if (sortBy) params.append('sortBy', sortBy);

      const res = await api.get(`/doctors?${params.toString()}`);
      if (res.data.success) {
        setDoctors(res.data.data);
      }
    } catch (err) {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDoctors();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-black text-navy-900 dark:text-white">Find Specialists & Doctors</h2>
        <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
          Search qualified doctors, compare consultation fees, and view available daily shifts
        </p>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-5">
            <Input
              label="Doctor Name or Specialization"
              placeholder="e.g. Cardiologist or Rao"
              leftIcon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="sm:col-span-4">
            <Select
              label="Department"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              options={[
                { value: '', label: 'All Departments' },
                ...departments.map((d) => ({ value: d._id, label: d.name })),
              ]}
            />
          </div>

          <div className="sm:col-span-3">
            <Select
              label="Sort By"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={[
                { value: 'experience_desc', label: 'Highest Experience' },
                { value: 'fee_asc', label: 'Consultation Fee (Low to High)' },
                { value: 'fee_desc', label: 'Consultation Fee (High to Low)' },
              ]}
            />
          </div>
        </form>
      </Card>

      {/* Doctors Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="space-y-4">
              <div className="flex gap-3">
                <Skeleton className="w-14 h-14 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-10 w-full" />
            </Card>
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-navy-900 border border-navy-200 dark:border-navy-800 rounded-2xl p-8">
          <Info className="w-8 h-8 text-navy-400 mx-auto mb-2" />
          <h4 className="font-bold text-navy-900 dark:text-white">No doctors match your search</h4>
          <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
            Try adjusting your search query or selecting a different department filter.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doc) => {
            const docUser = doc.userId as any;
            const dept = doc.departmentId as any;

            return (
              <Card key={doc._id} className="flex flex-col justify-between hover:shadow-card transition-all">
                <div>
                  <div className="flex items-start gap-3.5">
                    <Avatar name={docUser?.name || 'Doctor'} src={doc.photoUrl} size="lg" />
                    <div>
                      <h4 className="font-bold text-base text-navy-900 dark:text-white">
                        {docUser?.name}
                      </h4>
                      <Badge variant="primary" size="sm" className="mt-1">
                        {dept?.name || 'Specialist'}
                      </Badge>
                      <p className="text-xs text-navy-500 dark:text-navy-400 mt-1 line-clamp-1">
                        {doc.specialization}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 p-2.5 rounded-xl bg-navy-50 dark:bg-navy-800/60 text-xs">
                    <div>
                      <p className="text-[10px] text-navy-400 font-semibold uppercase">Experience</p>
                      <p className="font-bold text-navy-900 dark:text-white">{doc.experienceYears} Years</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-navy-400 font-semibold uppercase">Consultation Fee</p>
                      <p className="font-bold text-medical-600 dark:text-medical-400">₹{doc.consultationFee}</p>
                    </div>
                  </div>

                  {doc.bio && (
                    <p className="text-xs text-navy-600 dark:text-navy-400 mt-3 line-clamp-2">
                      {doc.bio}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-navy-100 dark:border-navy-800 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-1/2"
                    onClick={() => setSelectedDoctor(doc)}
                  >
                    View Details
                  </Button>
                  <Link to={`/patient/book?doctorId=${doc._id}`} className="w-1/2">
                    <Button variant="primary" size="sm" className="w-full">
                      Book Now
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Doctor Detail Modal */}
      {selectedDoctor && (
        <Modal
          isOpen={!!selectedDoctor}
          onClose={() => setSelectedDoctor(null)}
          title={`Dr. ${(selectedDoctor.userId as any)?.name}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={(selectedDoctor.userId as any)?.name} src={selectedDoctor.photoUrl} size="xl" />
              <div>
                <h4 className="text-lg font-bold text-navy-900 dark:text-white">
                  {(selectedDoctor.userId as any)?.name}
                </h4>
                <p className="text-xs font-semibold text-medical-600 dark:text-medical-400">
                  {selectedDoctor.specialization}
                </p>
                <p className="text-xs text-navy-500 mt-1">
                  Department: {(selectedDoctor.departmentId as any)?.name} | Room {selectedDoctor.roomNumber}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-navy-50 dark:bg-navy-800 text-xs space-y-2">
              <p>
                <strong>Qualifications:</strong> {selectedDoctor.qualifications?.join(', ') || 'MBBS, MD'}
              </p>
              <p>
                <strong>Experience:</strong> {selectedDoctor.experienceYears} Years Clinical Practice
              </p>
              <p>
                <strong>Average Consultation Time:</strong> {selectedDoctor.avgConsultationMinutes || 15} Minutes
              </p>
              <p>
                <strong>Consultation Fee:</strong> ₹{selectedDoctor.consultationFee}
              </p>
            </div>

            {selectedDoctor.bio && (
              <div>
                <p className="text-xs font-bold uppercase text-navy-400 mb-1">Biography</p>
                <p className="text-xs text-navy-600 dark:text-navy-300 leading-relaxed">
                  {selectedDoctor.bio}
                </p>
              </div>
            )}

            <div className="pt-3 border-t border-navy-100 dark:border-navy-800 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedDoctor(null)}>
                Close
              </Button>
              <Link to={`/patient/book?doctorId=${selectedDoctor._id}`}>
                <Button variant="primary" size="sm">
                  Proceed to Book
                </Button>
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
