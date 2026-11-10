import React from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  ShieldCheck,
  Zap,
  Activity,
  ArrowRight,
  CheckCircle2,
  Users,
  Tv,
  HeartPulse,
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-navy-50 dark:bg-navy-950 text-navy-900 dark:text-navy-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-medical-500/10 dark:bg-medical-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-medical-100 dark:bg-medical-950/80 text-medical-800 dark:text-medical-300 text-xs font-semibold uppercase tracking-wider mb-6 border border-medical-200 dark:border-medical-800">
            <HeartPulse className="w-4 h-4 text-medical-600 animate-pulse" />
            Next-Gen Cloud Healthcare Platform
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-navy-950 dark:text-white leading-[1.15]">
            Smart Healthcare Appointments &{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-medical-600 to-teal-400">
              Zero-Wait Live Queue
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-navy-600 dark:text-navy-300 max-w-3xl mx-auto leading-relaxed">
            Eliminate waiting-room overcrowding with guaranteed real-time token tracking, atomic slot booking, and cloud-native resilience designed for modern clinics and hospitals.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/patient/book">
              <Button size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                Book an Appointment
              </Button>
            </Link>
            <Link to="/display">
              <Button size="lg" variant="outline" leftIcon={<Tv className="w-5 h-5" />}>
                Public Waiting Display
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="secondary">
                Demo Accounts Sign In
              </Button>
            </Link>
          </div>

          {/* Quick Metrics */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white/70 dark:bg-navy-900/70 backdrop-blur border border-navy-200 dark:border-navy-800 rounded-2xl shadow-card">
            <div>
              <p className="text-3xl font-extrabold text-medical-600">0%</p>
              <p className="text-xs font-semibold text-navy-500 uppercase mt-1">Double Booking</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-navy-900 dark:text-white">&lt; 30s</p>
              <p className="text-xs font-semibold text-navy-500 uppercase mt-1">Check-in Time</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-medical-600">Real-Time</p>
              <p className="text-xs font-semibold text-navy-500 uppercase mt-1">Socket.IO Position</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-navy-900 dark:text-white">99.9%</p>
              <p className="text-xs font-semibold text-navy-500 uppercase mt-1">Cloud Reliability</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-20 bg-white dark:bg-navy-900/50 border-y border-navy-200 dark:border-navy-800 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-medical-600">Engineered for Excellence</h2>
            <h3 className="text-3xl font-bold text-navy-950 dark:text-white mt-2">
              Transforming Patient Flow from Waiting Rooms to Living Rooms
            </h3>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-navy-50 dark:bg-navy-900 border border-navy-200 dark:border-navy-800 hover:border-medical-500/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-medical-100 dark:bg-medical-950 flex items-center justify-center text-medical-600 mb-5">
                <Calendar className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-navy-900 dark:text-white">Guaranteed Non-Conflict Booking</h4>
              <p className="text-sm text-navy-600 dark:text-navy-400 mt-2">
                Compound unique indexing and atomic reservation locks completely eliminate double-booking race conditions during high-traffic surges.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-navy-50 dark:bg-navy-900 border border-navy-200 dark:border-navy-800 hover:border-medical-500/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-teal-600 mb-5">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-navy-900 dark:text-white">Live Queue & Smart ETA</h4>
              <p className="text-sm text-navy-600 dark:text-navy-400 mt-2">
                Patients track their live position, people ahead, and rolling wait times calculated dynamically from doctors’ actual consultation speeds.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-navy-50 dark:bg-navy-900 border border-navy-200 dark:border-navy-800 hover:border-medical-500/50 transition-all">
              <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-600 mb-5">
                <Tv className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-navy-900 dark:text-white">Public Waiting Room Display</h4>
              <p className="text-sm text-navy-600 dark:text-navy-400 mt-2">
                High-contrast TV display boards automatically broadcast "Now Serving" tokens per doctor across multi-department clinics with audio chimes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-medical-600">Frictionless Experience</h2>
          <h3 className="text-3xl font-bold text-navy-950 dark:text-white mt-2">How SmartQueue Works</h3>
        </div>

        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-medical-600 text-white font-bold flex items-center justify-center text-lg mb-4">
              1
            </div>
            <h4 className="font-bold text-navy-900 dark:text-white">Select Doctor & Time</h4>
            <p className="text-xs text-navy-500 dark:text-navy-400 mt-1 max-w-xs">
              Search by department, view doctor availability in real-time, and download your verified appointment slip with QR code.
            </p>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-medical-600 text-white font-bold flex items-center justify-center text-lg mb-4">
              2
            </div>
            <h4 className="font-bold text-navy-900 dark:text-white">Check In & Get Token</h4>
            <p className="text-xs text-navy-500 dark:text-navy-400 mt-1 max-w-xs">
              Check in upon arrival via receptionist or self-service QR to receive your sequential department token (e.g. CAR-014).
            </p>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-medical-600 text-white font-bold flex items-center justify-center text-lg mb-4">
              3
            </div>
            <h4 className="font-bold text-navy-900 dark:text-white">Live Turn Notifications</h4>
            <p className="text-xs text-navy-500 dark:text-navy-400 mt-1 max-w-xs">
              Receive "Your turn is near" alerts when only 3 patients remain, walk straight to your doctor’s room, and proceed.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="py-12 bg-white dark:bg-navy-900 border-t border-navy-200 dark:border-navy-800 text-center text-xs text-navy-500 dark:text-navy-400">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-medical-600" />
            <span className="font-bold text-navy-900 dark:text-white">SmartQueue Healthcare</span>
            <span>&copy; {new Date().getFullYear()} Cloud Computing Capstone</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/display" className="hover:text-medical-600">Live TV Display</Link>
            <Link to="/login" className="hover:text-medical-600">Portal Login</Link>
            <Link to="/register" className="hover:text-medical-600">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
