import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { Users, Plus, Edit2, Trash2, CalendarPlus, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { DependentDto, DependentRelationship } from '@smartqueue/shared';

export const DependentsPage: React.FC = () => {
  const [dependents, setDependents] = useState<DependentDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDependent, setEditingDependent] = useState<DependentDto | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState<DependentRelationship>('child');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchDependents();
  }, []);

  const fetchDependents = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/dependents');
      if (res.data.success) {
        setDependents(res.data.data);
      }
    } catch (err) {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingDependent(null);
    setName('');
    setRelationship('child');
    setDateOfBirth('');
    setGender('male');
    setPhone('');
    setBloodGroup('O+');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (dep: DependentDto) => {
    setEditingDependent(dep);
    setName(dep.name);
    setRelationship(dep.relationship);
    setDateOfBirth(dep.dateOfBirth ? dep.dateOfBirth.slice(0, 10) : '');
    setGender(dep.gender);
    setPhone(dep.phone || '');
    setBloodGroup(dep.bloodGroup || 'O+');
    setIsModalOpen(true);
  };

  const handleSaveDependent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter the family member name');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name,
        relationship,
        dateOfBirth: dateOfBirth || undefined,
        gender,
        phone: phone || undefined,
        bloodGroup: bloodGroup || undefined,
      };

      if (editingDependent) {
        await api.put(`/dependents/${editingDependent._id}`, payload);
        toast.success('Family member updated');
      } else {
        await api.post('/dependents', payload);
        toast.success('Family member added');
      }

      setIsModalOpen(false);
      fetchDependents();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save family member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDependent = async (id: string) => {
    if (!confirm('Are you sure you want to remove this family member?')) return;
    try {
      await api.delete(`/dependents/${id}`);
      toast.success('Family member removed');
      fetchDependents();
    } catch (err: any) {
      toast.error('Failed to remove family member');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-navy-900 dark:text-white">Family Members & Dependents</h2>
          <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
            Add children, parents, or spouses to book consultations and manage health records on their behalf
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleOpenAddModal} leftIcon={<Plus className="w-4 h-4" />}>
          Add Family Member
        </Button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-32 animate-pulse bg-navy-100 dark:bg-navy-800" />
          ))}
        </div>
      ) : dependents.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title="No Family Members Added Yet"
          description="Add your family members to effortlessly book specialist appointments for them under your account."
          actionText="Add First Member"
          onAction={handleOpenAddModal}
        />
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {dependents.map((dep) => (
            <Card key={dep._id} className="p-5 flex flex-col justify-between hover:shadow-card transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <Badge variant="primary" size="sm">
                    {dep.relationship.toUpperCase()}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(dep)}
                      className="p-1 text-navy-400 hover:text-navy-700 dark:hover:text-navy-200"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDependent(dep._id)}
                      className="p-1 text-rose-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="text-base font-bold text-navy-900 dark:text-white mt-2">{dep.name}</h4>

                <div className="mt-3 space-y-1 text-xs text-navy-500 dark:text-navy-400">
                  <p>Gender: <span className="text-navy-800 dark:text-navy-200 font-medium capitalize">{dep.gender}</span></p>
                  {dep.dateOfBirth && (
                    <p>DOB: <span className="text-navy-800 dark:text-navy-200 font-medium">{dep.dateOfBirth.slice(0, 10)}</span></p>
                  )}
                  {dep.bloodGroup && (
                    <p>Blood Group: <span className="font-bold text-medical-600">{dep.bloodGroup}</span></p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-navy-100 dark:border-navy-800">
                <Link to={`/patient/book`}>
                  <Button variant="outline" size="sm" className="w-full" leftIcon={<CalendarPlus className="w-3.5 h-3.5" />}>
                    Book for {dep.name.split(' ')[0]}
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingDependent ? 'Edit Family Member' : 'Add New Family Member'}
        >
          <form onSubmit={handleSaveDependent} className="space-y-3.5">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Leo Vance"
              required
            />

            <Select
              label="Relationship"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value as DependentRelationship)}
              options={[
                { value: 'spouse', label: 'Spouse' },
                { value: 'child', label: 'Child / Dependent' },
                { value: 'parent', label: 'Parent' },
                { value: 'sibling', label: 'Sibling' },
                { value: 'other', label: 'Other Family' },
              ]}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-navy-700 dark:text-navy-300 mb-1">
                  Gender
                </label>
                <Select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  options={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-navy-700 dark:text-navy-300 mb-1">
                  Blood Group
                </label>
                <Select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  options={[
                    { value: 'A+', label: 'A+' },
                    { value: 'A-', label: 'A-' },
                    { value: 'B+', label: 'B+' },
                    { value: 'B-', label: 'B-' },
                    { value: 'AB+', label: 'AB+' },
                    { value: 'AB-', label: 'AB-' },
                    { value: 'O+', label: 'O+' },
                    { value: 'O-', label: 'O-' },
                  ]}
                />
              </div>
            </div>

            <Input
              label="Date of Birth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />

            <Input
              label="Contact Phone (Optional)"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 00000"
            />

            <div className="pt-3 border-t border-navy-100 dark:border-navy-800 flex justify-end gap-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
                Save Family Member
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
