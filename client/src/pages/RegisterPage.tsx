import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Activity, Mail, Lock, User, Phone, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
      });

      login(res.data.data);
      toast.success('Account created successfully!');
      navigate('/patient/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Registration failed. Try again.';
      setErrorMessage(msg);
      toast.error(msg);
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
          <h2 className="text-xl font-bold text-navy-900 dark:text-white">Create Patient Account</h2>
          <p className="text-xs text-navy-500 dark:text-navy-400 mt-0.5">
            Book doctors, track live waiting positions, and manage family health
          </p>
        </div>

        <div className="bg-white dark:bg-navy-900 border border-navy-200 dark:border-navy-800 rounded-2xl shadow-card p-6 sm:p-8">
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            <Input
              label="Full Name"
              placeholder="e.g. Eleanor Vance"
              leftIcon={<User className="w-4 h-4" />}
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Phone Number"
              type="tel"
              placeholder="+91 98765 43210"
              leftIcon={<Phone className="w-4 h-4" />}
              error={errors.phone?.message}
              {...register('phone')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Min. 6 characters"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register('password')}
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Repeat password"
              leftIcon={<Lock className="w-4 h-4" />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button type="submit" variant="primary" className="w-full mt-2" size="lg" isLoading={isLoading}>
              Register as Patient
            </Button>
          </form>

          <div className="mt-5 text-center text-xs text-navy-500 dark:text-navy-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-medical-600 hover:text-medical-700 dark:text-medical-400">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
