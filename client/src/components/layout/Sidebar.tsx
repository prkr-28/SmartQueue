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
} from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navItems = [
    { label: 'Dashboard', to: '/patient/dashboard', icon: LayoutDashboard },
    { label: 'Find Doctors', to: '/patient/doctors', icon: Search },
    { label: 'Book Appointment', to: '/patient/book', icon: CalendarPlus },
    { label: 'My Appointments', to: '/patient/appointments', icon: CalendarCheck },
    {
      label: 'Live Queue Tracker',
      to: '/patient/queue',
      icon: Clock,
      badge: 'LIVE',
    },
    { label: 'Medical History', to: '/patient/records', icon: FileText },
    { label: 'Family Members', to: '/patient/dependents', icon: Users },
    { label: 'Notifications', to: '/patient/notifications', icon: Bell },
    { label: 'Profile & Settings', to: '/patient/profile', icon: User },
  ];

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
        <div className="p-4 border-b border-navy-100 dark:border-navy-800">
          <p className="text-[11px] font-bold uppercase tracking-wider text-navy-400 dark:text-navy-500">
            Patient Portal
          </p>
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
