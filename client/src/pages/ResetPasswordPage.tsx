import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Activity, Lock, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

const schema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type FormValues = z.infer<typeof schema>;

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        email,
        newPassword: data.newPassword,
      });
      toast.success('Password updated successfully! You can now log in.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Password reset failed. Invalid or expired link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-navy-50 dark:bg-navy-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-medical-600 to-teal-400 flex items-center justify-center text-white shadow-md">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-2xl font-black text-navy-900 dark:text-white">SmartQueue</span>
          </Link>
          <h2 className="text-xl font-bold text-navy-900 dark:text-white">Set New Password</h2>
        </div>

        <div className="bg-white dark:bg-navy-900 border border-navy-200 dark:border-navy-800 rounded-2xl shadow-card p-6 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="New Password"
              type="password"
              placeholder="Min. 6 characters"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Repeat password"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button type="submit" variant="primary" className="w-full mt-2" size="lg" isLoading={isLoading}>
              Update Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
