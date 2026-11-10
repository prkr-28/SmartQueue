import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  CalendarPlus,
  CalendarCheck,
  Clock,
  FileText,
  Users,
  Bell,
  User,
  Tv,
  Stethoscope,
  Calendar,
  UserCheck,
  CreditCard,
  QrCode,
  Building2,
  ShieldCheck,
  Sliders,
  BarChart3,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const role = user?.role || 'patient';

  let portalTitle = 'Patient Portal';
  let navItems: Array<{ label: string; to: string; icon: any; badge?: string }> = [];

  if (role === 'doctor') {
    portalTitle = 'Doctor Portal';
    navItems = [
      { label: 'Doctor Dashboard', to: '/doctor/dashboard', icon: LayoutDashboard },
      { label: 'My Live Queue', to: '/doctor/queue', icon: Clock, badge: 'LIVE' },
      { label: 'My Schedule & Leaves', to: '/doctor/schedule', icon: Calendar },
      { label: 'Notifications', to: '/doctor/notifications', icon: Bell },
      { label: 'Profile & Settings', to: '/doctor/profile', icon: User },
    ];
  } else if (role === 'receptionist') {
    portalTitle = 'Reception Desk';
    navItems = [
      { label: "Today's Overview", to: '/receptionist/dashboard', icon: LayoutDashboard },
      { label: 'Walk-in Booking', to: '/receptionist/walk-in', icon: CalendarPlus },
      { label: 'Appointments & Check-in', to: '/receptionist/appointments', icon: UserCheck },
      { label: 'Live Queue Board', to: '/receptionist/queue', icon: Clock, badge: 'LIVE' },
      { label: 'Billing & Cashier', to: '/receptionist/billing', icon: CreditCard },
      { label: 'QR Scan Check-in', to: '/receptionist/scan', icon: QrCode },
      { label: 'Notifications', to: '/receptionist/notifications', icon: Bell },
      { label: 'Profile & Settings', to: '/receptionist/profile', icon: User },
    ];
  } else if (role === 'hospital_admin' || role === 'super_admin') {
    portalTitle = 'Hospital Admin';
    navItems = [
      { label: 'Analytics Dashboard', to: '/admin/dashboard', icon: BarChart3 },
      { label: 'Departments & Counters', to: '/admin/departments', icon: Building2 },
      { label: 'Staff & Doctors', to: '/admin/staff', icon: Stethoscope },
      { label: 'Patients Directory', to: '/admin/patients', icon: Users },
      { label: 'Security Audit Logs', to: '/admin/audit-logs', icon: ShieldCheck },
      { label: 'System Settings', to: '/admin/settings', icon: Sliders },
      { label: 'Notifications', to: '/admin/notifications', icon: Bell },
      { label: 'Profile & Settings', to: '/admin/profile', icon: User },
    ];
  } else {
    portalTitle = 'Patient Portal';
    navItems = [
      { label: 'Dashboard', to: '/patient/dashboard', icon: LayoutDashboard },
      { label: 'Find Doctors', to: '/patient/doctors', icon: Search },
      { label: 'Book Appointment', to: '/patient/book', icon: CalendarPlus },
      { label: 'My Appointments', to: '/patient/appointments', icon: CalendarCheck },
      { label: 'Live Queue Tracker', to: '/patient/queue', icon: Clock, badge: 'LIVE' },
      { label: 'Medical History', to: '/patient/records', icon: FileText },
      { label: 'Family Members', to: '/patient/dependents', icon: Users },
      { label: 'Notifications', to: '/patient/notifications', icon: Bell },
      { label: 'Profile & Settings', to: '/patient/profile', icon: User },
    ];
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-navy-900 border-r border-navy-200 dark:border-navy-800 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-4 border-b border-navy-100 dark:border-navy-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-medical-600 dark:text-medical-400">
              {portalTitle}
            </p>
            <p className="text-xs font-semibold text-navy-800 dark:text-navy-200 truncate max-w-[190px]">
              {user?.name}
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-navy-100 dark:bg-navy-800 text-navy-600 dark:text-navy-400">
            {role.replace('_', ' ')}
          </span>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all',
                    isActive
                      ? 'bg-medical-50 text-medical-700 dark:bg-medical-950/60 dark:text-medical-300 shadow-sm'
                      : 'text-navy-600 dark:text-navy-400 hover:bg-navy-50 dark:hover:bg-navy-800/60 hover:text-navy-900 dark:hover:text-navy-100'
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 stroke-[2]" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Public TV Display banner shortcut */}
        <div className="p-3 border-t border-navy-100 dark:border-navy-800">
          <NavLink
            to="/display"
            target="_blank"
            className="flex items-center gap-2.5 p-3 rounded-xl bg-navy-50 dark:bg-navy-800/60 hover:bg-navy-100 dark:hover:bg-navy-800 text-xs font-medium text-navy-700 dark:text-navy-300 transition-colors"
          >
            <div className="p-1.5 rounded-lg bg-medical-100 dark:bg-medical-950 text-medical-600 dark:text-medical-400">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-navy-900 dark:text-navy-100">Waiting Room TV</p>
              <p className="text-[10px] text-navy-500 dark:text-navy-400">Public Live Display Screen</p>
            </div>
          </NavLink>
        </div>
      </aside>
    </>
  );
};
