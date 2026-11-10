import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Bell, CheckCheck, Clock, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { NotificationDto } from '@smartqueue/shared';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/notifications?limit=50');
      if (res.data.success) {
        setNotifications(res.data.data.notifications);
        setUnreadCount(res.data.data.unreadCount);
      }
    } catch (err) {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (err) {
      // Ignore
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-navy-900 dark:text-white">Notification Center</h2>
          <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
            Appointment alerts, live queue turn updates, and healthcare reminders
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            leftIcon={<CheckCheck className="w-4 h-4" />}
          >
            Mark All Read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-20 animate-pulse bg-navy-100 dark:bg-navy-800" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-8 h-8" />}
          title="No Notifications Yet"
          description="When you book appointments or your token is called in the queue, real-time alerts will appear here."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n._id}
              onClick={() => !n.read && handleMarkAsRead(n._id)}
              className={`p-4 transition-all cursor-pointer flex items-start justify-between gap-4 ${
                !n.read
                  ? 'border-medical-500 bg-medical-50/20 dark:bg-medical-950/20'
                  : 'opacity-80'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-navy-900 dark:text-white">{n.title}</h4>
                  {!n.read && <Badge variant="primary" size="sm">NEW</Badge>}
                </div>
                <p className="text-xs text-navy-600 dark:text-navy-300">{n.message}</p>
                <span className="text-[10px] text-navy-400 block pt-1">
                  {new Date(n.createdAt).toLocaleDateString()} at{' '}
                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
