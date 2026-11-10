import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { User, Mail, Phone, Lock, Save, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();

  // Profile fields
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      const res = await api.put('/auth/profile', { name, phone });
      if (res.data.success) {
        updateUser(res.data.data);
        toast.success('Profile updated successfully');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }

    setIsChangingPass(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-black text-navy-900 dark:text-white">Profile & Account Settings</h2>
        <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
          Manage your personal details, contact information, and account security
        </p>
      </div>

      {/* User Info Overview */}
      <Card className="p-6 flex items-center gap-4">
        <Avatar name={user?.name || 'User'} size="lg" />
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-navy-900 dark:text-white">{user?.name}</h3>
            <Badge variant="primary" size="sm">{user?.role?.toUpperCase()}</Badge>
          </div>
          <p className="text-xs text-navy-500 dark:text-navy-400">{user?.email}</p>
        </div>
      </Card>

      {/* Edit Profile Form */}
      <Card className="p-6">
        <h4 className="text-sm font-bold uppercase tracking-wider text-navy-900 dark:text-white mb-4">
          Personal Information
        </h4>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            leftIcon={<User className="w-4 h-4" />}
            required
          />

          <Input
            label="Email Address"
            type="email"
            value={user?.email || ''}
            disabled
            leftIcon={<Mail className="w-4 h-4" />}
            helperText="Email address cannot be changed."
          />

          <Input
            label="Phone Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone className="w-4 h-4" />}
            placeholder="+91 98765 43210"
          />

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isUpdatingProfile}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Change Password Form */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-medical-600" />
          <h4 className="text-sm font-bold uppercase tracking-wider text-navy-900 dark:text-white">
            Security & Password
          </h4>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            required
          />

          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            placeholder="Min. 6 characters"
            required
          />

          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            placeholder="Repeat new password"
            required
          />

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              isLoading={isChangingPass}
            >
              Update Password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
