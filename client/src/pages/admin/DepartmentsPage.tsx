import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  DoorOpen,
  CheckCircle2,
  XCircle,
  Edit2,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';

export const DepartmentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDescription, setDeptDescription] = useState('');
  const [deptRooms, setDeptRooms] = useState('Room 101, Room 102, Room 103');

  // Fetch hospital
  const { data: hospitalData } = useQuery({
    queryKey: ['hospitals'],
    queryFn: async () => {
      const res = await api.get('/hospitals');
      return res.data.data[0];
    },
  });

  // Fetch departments
  const { data: departments, isLoading } = useQuery({
    queryKey: ['departments', hospitalData?._id],
    queryFn: async () => {
      if (!hospitalData?._id) return [];
      const res = await api.get(`/hospitals/${hospitalData._id}/departments`);
      return res.data.data || [];
    },
    enabled: !!hospitalData?._id,
  });

  // Create department mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const roomsArray = deptRooms
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean)
        .map((name, i) => ({ name, number: `R-${i + 1}`, isActive: true }));

      const res = await api.post(`/hospitals/${hospitalData._id}/departments`, {
        name: deptName,
        code: deptCode.toUpperCase(),
        description: deptDescription,
        rooms: roomsArray,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setModalOpen(false);
      setDeptName('');
      setDeptCode('');
      setDeptDescription('');
      toast.success('Clinical department created successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to create department');
    },
  });

  const depts = departments || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 dark:text-white">
            Hospital Departments & Rooms
          </h1>
          <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
            Manage specialty divisions, consultation rooms, and counter allocations for {hospitalData?.name}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setModalOpen(true)}
          className="font-bold shadow-md"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Department
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
          </>
        ) : depts.length > 0 ? (
          depts.map((d: any) => (
            <Card key={d._id} className="hover:border-teal-500/40 transition-all flex flex-col justify-between">
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                      {d.code}
                    </span>
                    <Badge variant={d.isActive ? 'success' : 'default'}>
                      {d.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-navy-900 dark:text-white mt-2">
                    {d.name}
                  </h3>
                </div>
                <Building2 className="w-5 h-5 text-teal-600" />
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-navy-500 dark:text-navy-400 line-clamp-2">
                  {d.description || 'Specialized outpatient clinical department'}
                </p>

                <div className="pt-2 border-t border-navy-100 dark:border-navy-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-navy-400 block mb-1">
                    Rooms / Counters ({d.rooms?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {d.rooms?.map((r: any, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-navy-100 dark:bg-navy-800 text-[10px] font-medium text-navy-700 dark:text-navy-300"
                      >
                        {r.name || r}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-xs text-navy-400">
            No departments configured yet.
          </div>
        )}
      </div>

      {/* Add Department Modal */}
      {modalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setModalOpen(false)}
          title="Add New Clinical Department"
        >
          <div className="space-y-4">
            <Input
              label="Department Name *"
              placeholder="e.g. Neurology, Dermatology, Ophthalmology"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
            />

            <Input
              label="Department Code (3-4 Letters) *"
              placeholder="e.g. NEU, DER, OPH"
              value={deptCode}
              onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
              className="font-mono font-bold"
            />

            <Input
              label="Description"
              placeholder="e.g. Disorders of the brain, spinal cord, and nerves"
              value={deptDescription}
              onChange={(e) => setDeptDescription(e.target.value)}
            />

            <Input
              label="Consultation Rooms (Comma-separated)"
              placeholder="Room 101, Room 102, Counter A"
              value={deptRooms}
              onChange={(e) => setDeptRooms(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!deptName || !deptCode}
                isLoading={createMutation.isPending}
                onClick={() => createMutation.mutate()}
                className="font-bold shadow-md"
              >
                Create Department
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
