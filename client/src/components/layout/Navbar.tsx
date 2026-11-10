import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../ui/Avatar';
import { api } from '../../services/api';
import {
  Bell,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Activity,
  CheckCircle2,
  Tv,
} from 'lucide-react';
import { NotificationDto } from '@smartqueue/shared';

export const Navbar: React.FC<{ onToggleSidebar?: () => void }> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000); // Polling fallback
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications?limit=5');
      if (res.data.success) {
        setNotifications(res.data.data.notifications);
        setUnreadCount(res.data.data.unreadCount);
      }
    } catch (err) {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      // Ignore
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-navy-900/80 backdrop-blur-md border-b border-navy-200 dark:border-navy-800 transition-colors">
      <div className="flex items-center justify-between px-4 lg:px-8 h-16">
        {/* Left: Mobile Toggle & Brand */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg text-navy-600 dark:text-navy-300 hover:bg-navy-100 dark:hover:bg-navy-800"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-medical-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-medical-500/20">
              <Activity className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight text-navy-900 dark:text-white">
                Smart<span className="text-medical-600 dark:text-medical-400">Queue</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-medical-50 text-medical-700 dark:bg-medical-950 dark:text-medical-300 border border-medical-200 dark:border-medical-800">
                Healthcare SaaS
              </span>
            </div>
          </Link>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Waiting Room Public Display Shortcut */}
          <Link
            to="/display"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-navy-100 hover:bg-navy-200 dark:bg-navy-800 dark:hover:bg-navy-700 text-navy-700 dark:text-navy-300 transition-colors"
          >
            <Tv className="w-3.5 h-3.5 text-medical-600" />
            Waiting Room Display
          </Link>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg text-navy-600 dark:text-navy-300 hover:bg-navy-100 dark:hover:bg-navy-800 transition-colors"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications Dropdown (Authenticated) */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg text-navy-600 dark:text-navy-300 hover:bg-navy-100 dark:hover:bg-navy-800 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-navy-900">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-navy-900 border border-navy-200 dark:border-navy-800 shadow-xl py-3 z-50">
                  <div className="flex items-center justify-between px-4 pb-2 border-b border-navy-100 dark:border-navy-800">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-navy-900 dark:text-white">
                      Notifications
                    </h5>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-medical-600 hover:text-medical-700 dark:text-medical-400 font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-navy-100 dark:divide-navy-800">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-navy-500 dark:text-navy-400">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n._id}
                          className={`p-3 text-xs transition-colors hover:bg-navy-50 dark:hover:bg-navy-800/50 ${
                            !n.read ? 'bg-medical-50/40 dark:bg-medical-950/20' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="font-semibold text-navy-900 dark:text-navy-100">
                              {n.title}
                            </span>
                          </div>
                          <p className="text-navy-600 dark:text-navy-400 mt-0.5">{n.message}</p>
                          <span className="text-[10px] text-navy-400 mt-1 block">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2 px-4 border-t border-navy-100 dark:border-navy-800 text-center">
                    <Link
                      to="/patient/notifications"
                      onClick={() => setShowNotifications(false)}
                      className="text-xs font-semibold text-medical-600 hover:text-medical-700 dark:text-medical-400"
                    >
                      View all notifications →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Profile Menu */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-medical-500/20 transition-all"
              >
                <Avatar name={user.name} size="sm" />
                <span className="hidden md:inline-block text-xs font-semibold text-navy-800 dark:text-navy-200 max-w-[120px] truncate">
                  {user.name}
                </span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl bg-white dark:bg-navy-900 border border-navy-200 dark:border-navy-800 shadow-xl py-1.5 z-50">
                  <div className="px-4 py-2 border-b border-navy-100 dark:border-navy-800">
                    <p className="text-xs font-bold text-navy-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-[11px] text-navy-500 dark:text-navy-400 truncate">{user.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-medical-100 text-medical-800 dark:bg-medical-950 dark:text-medical-300">
                      {user.role}
                    </span>
                  </div>

                  <Link
                    to="/patient/profile"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-navy-700 dark:text-navy-300 hover:bg-navy-50 dark:hover:bg-navy-800"
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    Profile & Settings
                  </Link>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-navy-700 dark:text-navy-300 hover:bg-navy-100 dark:hover:bg-navy-800"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-medical-600 hover:bg-medical-700 text-white shadow-sm"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
