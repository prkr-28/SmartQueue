import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Activity, Mail, Lock, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.post('/auth/login', data);
      login(res.data.data);
      toast.success('Signed in successfully!');

      const role = res.data.data.user.role;
      if (role === 'patient') {
        navigate('/patient/dashboard');
      } else {
        navigate('/patient/dashboard'); // Teammate 1 scope redirects to portal
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Invalid credentials or server error';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoFill = (email: string, pass: string) => {
    setValue('email', email);
    setValue('password', pass);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-navy-50 dark:bg-navy-950">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-medical-600 to-teal-400 flex items-center justify-center text-white shadow-md">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className="text-2xl font-black text-navy-900 dark:text-white">SmartQueue</span>
          </Link>
          <h2 className="text-xl font-bold text-navy-900 dark:text-white">Welcome Back</h2>
          <p className="text-xs text-navy-500 dark:text-navy-400 mt-0.5">
            Log in to manage your appointments, live queue status, and health records
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-navy-900 border border-navy-200 dark:border-navy-800 rounded-2xl shadow-card p-6 sm:p-8">
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-navy-700 dark:text-navy-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-medical-600 hover:text-medical-700 dark:text-medical-400 font-medium"
                >
                  Forgot?
                </Link>
              </div>
              <Input
                type="password"
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <Button type="submit" variant="primary" className="w-full mt-2" size="lg" isLoading={isLoading}>
              Sign In to Account
            </Button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-navy-100 dark:border-navy-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-navy-700 dark:text-navy-300 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Quick Demo Sign-In (Click to fill)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemoFill('patient1@smartqueue.test', 'Patient@123')}
                className="p-2 text-left rounded-lg border border-navy-200 dark:border-navy-800 hover:border-medical-500 hover:bg-medical-50/40 dark:hover:bg-medical-950/20 transition-all"
              >
                <p className="font-bold text-navy-900 dark:text-white">Patient</p>
                <p className="text-[10px] text-navy-400">patient1@smartqueue.test</p>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('doctor1@smartqueue.test', 'Doctor@123')}
                className="p-2 text-left rounded-lg border border-navy-200 dark:border-navy-800 hover:border-medical-500 hover:bg-medical-50/40 dark:hover:bg-medical-950/20 transition-all"
              >
                <p className="font-bold text-navy-900 dark:text-white">Doctor</p>
                <p className="text-[10px] text-navy-400">doctor1@smartqueue.test</p>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('receptionist1@smartqueue.test', 'Receptionist@123')}
                className="p-2 text-left rounded-lg border border-navy-200 dark:border-navy-800 hover:border-medical-500 hover:bg-medical-50/40 dark:hover:bg-medical-950/20 transition-all"
              >
                <p className="font-bold text-navy-900 dark:text-white">Receptionist</p>
                <p className="text-[10px] text-navy-400">receptionist1@smartqueue.test</p>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('admin@smartqueue.test', 'Admin@123')}
                className="p-2 text-left rounded-lg border border-navy-200 dark:border-navy-800 hover:border-medical-500 hover:bg-medical-50/40 dark:hover:bg-medical-950/20 transition-all"
              >
                <p className="font-bold text-navy-900 dark:text-white">Hospital Admin</p>
                <p className="text-[10px] text-navy-400">admin@smartqueue.test</p>
              </button>
            </div>
          </div>

          <div className="mt-5 text-center text-xs text-navy-500 dark:text-navy-400">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-semibold text-medical-600 hover:text-medical-700 dark:text-medical-400">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
