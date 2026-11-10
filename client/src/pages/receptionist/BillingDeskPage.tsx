import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Search,
  FileText,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  Download,
  Receipt,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

export const BillingDeskPage: React.FC = () => {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Mark payment modal
  const [payingInvoice, setPayingInvoice] = useState<any>(null);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'card' | 'upi'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Daily summary query
  const { data: summaryData, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['billing', 'daily-summary', date],
    queryFn: async () => {
      const res = await api.get(`/invoices/daily-summary?date=${date}`);
      return res.data.data;
    },
  });

  // Invoices list query
  const { data: invoicesData, isLoading: loadingInvoices, refetch: refetchInvoices } = useQuery({
    queryKey: ['billing', 'invoices', status, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('page', String(page));
      params.append('limit', '15');

      const res = await api.get(`/invoices?${params.toString()}`);
      return res.data.data;
    },
  });

  // Mark payment mutation
  const payMutation = useMutation({
    mutationFn: async ({ id, mode, notes }: { id: string; mode: string; notes?: string }) => {
      const res = await api.put(`/invoices/${id}/pay`, {
        paymentMode: mode,
        notes,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      queryClient.invalidateQueries({ queryKey: ['receptionist'] });
      setPayingInvoice(null);
      setPaymentNotes('');
      toast.success(`Payment recorded for Invoice ${data.invoiceNumber}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to record payment');
    },
  });

  const invoices = invoicesData?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 dark:text-white">Billing & Cashier Desk</h1>
          <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
            Collect consultation payments, reconcile cashier transactions, and generate GST receipts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchSummary();
              refetchInvoices();
            }}
            className="text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.open(`/api/reports/revenue/export`, '_blank')}
            className="text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Daily Collection Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Billed"
          value={loadingSummary ? '...' : `₹${summaryData?.totalBilled || 0}`}
          icon={Receipt}
          description="Invoiced today"
        />
        <StatCard
          title="Collected Today"
          value={loadingSummary ? '...' : `₹${summaryData?.totalCollected || 0}`}
          icon={CreditCard}
          description={`${summaryData?.paidCount || 0} invoices settled`}
          trend={summaryData?.totalCollected > 0 ? { value: 'Paid', isPositive: true } : undefined}
        />
        <StatCard
          title="Pending Payments"
          value={loadingSummary ? '...' : `₹${summaryData?.totalPending || 0}`}
          icon={Clock}
          description={`${summaryData?.pendingCount || 0} unpaid balances`}
          trend={summaryData?.totalPending > 0 ? { value: 'Outstanding', isPositive: false } : undefined}
        />
        <StatCard
          title="UPI / Digital"
          value={loadingSummary ? '...' : `₹${summaryData?.upiTotal || 0}`}
          icon={DollarSign}
          description={`Cash: ₹${summaryData?.cashTotal || 0} | Card: ₹${summaryData?.cardTotal || 0}`}
        />
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-navy-600 dark:text-navy-400 uppercase tracking-wider mb-1">
                Payment Status
              </label>
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                options={[
                  { label: 'All Invoices', value: '' },
                  { label: 'Pending Settlement', value: 'pending' },
                  { label: 'Paid & Settled', value: 'paid' },
                  { label: 'Refunded', value: 'refunded' },
                ]}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-navy-600 dark:text-navy-400 uppercase tracking-wider mb-1">
                Search Patient / Invoice
              </label>
              <Input
                placeholder="Search by invoice number (e.g. INV-) or patient name"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-50/75 dark:bg-navy-800/50 border-b border-navy-200 dark:border-navy-700 text-navy-500 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Doctor</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100 dark:divide-navy-800">
              {loadingInvoices ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-navy-400">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-navy-400">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                invoices.map((inv: any) => (
                  <tr key={inv._id} className="hover:bg-navy-50/40 dark:hover:bg-navy-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-navy-900 dark:text-white">
                      {inv.invoiceNumber}
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-bold text-navy-900 dark:text-white">
                        {inv.patientId?.name || 'Patient'}
                      </p>
                      <p className="text-[10px] text-navy-400">
                        {inv.patientId?.phone || inv.patientId?.email}
                      </p>
                    </td>

                    <td className="py-3 px-4">
                      Dr. {inv.doctorId?.userId?.name || 'Doctor'}
                    </td>

                    <td className="py-3 px-4 font-mono font-black text-teal-700 dark:text-teal-300">
                      ₹{inv.totalAmount?.toFixed(2)}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inv.paymentStatus === 'paid'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                      }`}>
                        {inv.paymentStatus.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3 px-4 uppercase text-[10px] font-semibold text-navy-600 dark:text-navy-300">
                      {inv.paymentMode}
                    </td>

                    <td className="py-3 px-4 text-navy-500 text-[11px]">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {inv.paymentStatus === 'pending' && (
                        <Button
                          size="sm"
                          variant="primary"
                          className="h-7 px-2.5 text-xs font-bold shadow-sm"
                          onClick={() => {
                            setPayingInvoice(inv);
                            setPaymentMode('cash');
                          }}
                        >
                          <CreditCard className="w-3.5 h-3.5 mr-1" />
                          Collect
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        title="Download Invoice PDF"
                        onClick={() => window.open(`/api/invoices/${inv._id}/pdf`, '_blank')}
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mark Payment Modal */}
      {payingInvoice && (
        <Modal
          isOpen={true}
          onClose={() => setPayingInvoice(null)}
          title={`Collect Payment: ${payingInvoice.invoiceNumber}`}
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs">
              <div className="flex justify-between font-bold text-teal-900 dark:text-teal-200">
                <span>Patient:</span>
                <span>{payingInvoice.patientId?.name}</span>
              </div>
              <div className="flex justify-between font-bold text-base text-teal-950 dark:text-teal-100 mt-1">
                <span>Total Due:</span>
                <span>₹{payingInvoice.totalAmount?.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-700 dark:text-navy-300 mb-1">
                Payment Settlement Mode *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['cash', 'card', 'upi'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMode(m)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold uppercase transition-all ${
                      paymentMode === m
                        ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-400'
                        : 'bg-navy-100 dark:bg-navy-800 text-navy-600 dark:text-navy-300 hover:bg-navy-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Transaction Notes / Reference (Optional)"
              placeholder="e.g. UPI Ref #, Card last 4 digits, Cash receipt #"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setPayingInvoice(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                isLoading={payMutation.isPending}
                onClick={() =>
                  payMutation.mutate({
                    id: payingInvoice._id,
                    mode: paymentMode,
                    notes: paymentNotes,
                  })
                }
                className="font-bold shadow-md"
              >
                Confirm Payment Settlement
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
