import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Search, Filter, RefreshCw, Terminal } from 'lucide-react';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';

export const AuditLogsPage: React.FC = () => {
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'audit-logs', action, entity, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (action) params.append('action', action);
      if (entity) params.append('entity', entity);
      params.append('page', String(page));
      params.append('limit', '25');

      const res = await api.get(`/admin/audit-logs?${params.toString()}`);
      return res.data.data;
    },
  });

  const logs = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 dark:text-white">Security & System Audit Logs</h1>
          <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
            Immutable trace of user authentication, state modifications, payments, and administrative events
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-navy-600 dark:text-navy-400 uppercase tracking-wider mb-1">
                Filter by Entity Type
              </label>
              <Select
                value={entity}
                onChange={(e) => {
                  setEntity(e.target.value);
                  setPage(1);
                }}
                options={[
                  { label: 'All Entities', value: '' },
                  { label: 'User / Accounts', value: 'User' },
                  { label: 'Appointments', value: 'Appointment' },
                  { label: 'Queue Entries', value: 'QueueEntry' },
                  { label: 'Consultations', value: 'Consultation' },
                  { label: 'Invoices & Payments', value: 'Invoice' },
                  { label: 'Hospital Settings', value: 'Hospital' },
                ]}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-navy-600 dark:text-navy-400 uppercase tracking-wider mb-1">
                Filter by Action Type
              </label>
              <Select
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setPage(1);
                }}
                options={[
                  { label: 'All Actions', value: '' },
                  { label: 'APPOINTMENT_BOOKED', value: 'APPOINTMENT_BOOKED' },
                  { label: 'APPOINTMENT_CANCELLED', value: 'APPOINTMENT_CANCELLED' },
                  { label: 'CONSULTATION_COMPLETED', value: 'CONSULTATION_COMPLETED' },
                  { label: 'INVOICE_PAID', value: 'INVOICE_PAID' },
                  { label: 'STAFF_CREATED', value: 'STAFF_CREATED' },
                  { label: 'STAFF_STATUS_UPDATED', value: 'STAFF_STATUS_UPDATED' },
                  { label: 'HOSPITAL_SETTINGS_UPDATED', value: 'HOSPITAL_SETTINGS_UPDATED' },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-50/75 dark:bg-navy-800/50 border-b border-navy-200 dark:border-navy-700 text-navy-500 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Audit Payload / Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100 dark:divide-navy-800 font-mono text-[11px]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-navy-400 font-sans">
                    Loading audit stream...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-navy-400 font-sans">
                    No audit records found matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log._id} className="hover:bg-navy-50/40 dark:hover:bg-navy-800/30 transition-colors">
                    <td className="py-3 px-4 text-navy-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold text-[10px]">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-bold text-navy-800 dark:text-navy-200">
                      {log.entity}
                    </td>

                    <td className="py-3 px-4 font-sans">
                      <p className="font-bold text-navy-900 dark:text-white">
                        {log.actorId?.name || 'System Auto'}
                      </p>
                      <p className="text-[10px] text-navy-400">
                        {log.actorId?.role || 'Daemon'}
                      </p>
                    </td>

                    <td className="py-3 px-4 text-navy-400 text-[10px]">
                      {log.ipAddress || '127.0.0.1'}
                    </td>

                    <td className="py-3 px-4 max-w-xs truncate text-[10px] text-navy-600 dark:text-navy-400">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-navy-100 dark:border-navy-800 flex items-center justify-between text-xs font-sans">
            <span className="text-navy-400">
              Page {page} of {totalPages}
            </span>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
