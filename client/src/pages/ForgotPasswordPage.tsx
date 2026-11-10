import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Activity, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const ForgotPasswordPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ email: string }>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: { email: string }) => {
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', data);
      setIsSubmitted(true);
      toast.success('Password reset link sent!');
    } catch (err: any) {
      toast.error('Failed to request reset. Please try again.');
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
          <h2 className="text-xl font-bold text-navy-900 dark:text-white">Forgot Password</h2>
          <p className="text-xs text-navy-500 dark:text-navy-400 mt-0.5">
            Enter your email to receive a secure password reset link
          </p>
        </div>

        <div className="bg-white dark:bg-navy-900 border border-navy-200 dark:border-navy-800 rounded-2xl shadow-card p-6 sm:p-8">
          {isSubmitted ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-navy-900 dark:text-white">Check Your Email</h4>
              <p className="text-xs text-navy-500 dark:text-navy-400 mt-2">
                If the email address is registered, we have dispatched a password reset link valid for 1 hour.
              </p>
              <Link to="/login" className="inline-block mt-6">
                <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Registered Email Address"
                type="email"
                placeholder="you@example.com"
                leftIcon={<Mail className="w-4 h-4" />}
                error={errors.email?.message}
                {...register('email')}
              />

              <Button type="submit" variant="primary" className="w-full mt-2" size="lg" isLoading={isLoading}>
                Send Reset Link
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-600 hover:text-navy-900 dark:text-navy-400 dark:hover:text-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
