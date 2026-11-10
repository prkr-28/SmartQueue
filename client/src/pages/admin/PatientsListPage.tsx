import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Search, RefreshCw, Mail, Phone, Calendar } from 'lucide-react';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const PatientsListPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'patients', search, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('page', String(page));
      params.append('limit', '20');

      const res = await api.get(`/admin/patients?${params.toString()}`);
      return res.data.data;
    },
  });

  const patients = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 dark:text-white">Registered Patients Directory</h1>
          <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
            Complete database of patients registered across outpatient departments ({total} total)
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Search patient by name, phone number, or email address..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-50/75 dark:bg-navy-800/50 border-b border-navy-200 dark:border-navy-700 text-navy-500 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Gender</th>
                <th className="py-3 px-4">Blood Group</th>
                <th className="py-3 px-4 text-right">Registration Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100 dark:divide-navy-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-navy-400">
                    Loading patients directory...
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-navy-400">
                    No patients found.
                  </td>
                </tr>
              ) : (
                patients.map((p: any) => (
                  <tr key={p._id} className="hover:bg-navy-50/40 dark:hover:bg-navy-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-navy-900 dark:text-white">
                      {p.name}
                    </td>
                    <td className="py-3 px-4 text-navy-600 dark:text-navy-300 font-mono text-[11px]">
                      {p.email}
                    </td>
                    <td className="py-3 px-4 text-navy-600 dark:text-navy-300 font-mono text-[11px]">
                      {p.phone || 'N/A'}
                    </td>
                    <td className="py-3 px-4 capitalize text-navy-600 dark:text-navy-300">
                      {p.gender || '—'}
                    </td>
                    <td className="py-3 px-4 font-bold text-teal-700 dark:text-teal-300 font-mono">
                      {p.bloodGroup || '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-navy-400 text-[11px]">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-navy-100 dark:border-navy-800 flex items-center justify-between text-xs">
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
