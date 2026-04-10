import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, Download, CreditCard, Check, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../apiClient';
import { Invoice } from '../types';
import StatusBadge from '../components/StatusBadge';

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/invoices/${id}`)
      .then(({ data }) => setInvoice(data.invoice))
      .catch(() => { toast.error('Invoice not found'); navigate('/invoices'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success') toast.success('Payment received! Invoice marked as paid.');
    if (payment === 'cancelled') toast.error('Payment cancelled.');
  }, [searchParams]);

  async function handleSend() {
    setActionLoading('send');
    try {
      await api.post(`/invoices/${id}/send`);
      if (invoice?.status === 'draft') setInvoice((prev) => prev ? { ...prev, status: 'sent' } : prev);
      toast.success('Invoice sent via email');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send invoice');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDownloadPdf() {
    setActionLoading('pdf');
    try {
      const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice?.invoice_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleStripeCheckout() {
    setActionLoading('stripe');
    try {
      const { data } = await api.post('/billing/create-checkout', { invoice_id: id });
      window.open(data.url, '_blank');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create payment link');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMarkPaid() {
    setActionLoading('paid');
    try {
      await api.put(`/invoices/${id}`, { status: 'paid' });
      setInvoice((prev) => prev ? { ...prev, status: 'paid' } : prev);
      toast.success('Invoice marked as paid');
    } catch {
      toast.error('Failed to update invoice');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!invoice) return null;

  const subtotal = invoice.items?.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unit_price),
    0
  ) ?? Number(invoice.total);

  const isOverdue = invoice.status !== 'paid' && invoice.due_date && new Date(invoice.due_date) < new Date();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/invoices')}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">{invoice.invoice_number}</h1>
          <p className="text-gray-500 text-sm">Invoice detail</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge status={isOverdue ? 'overdue' : invoice.status} />
        </div>
      </div>

      {/* Payment banner */}
      {invoice.status === 'paid' && (
        <div className="bg-green-900/20 border border-green-800 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <p className="text-green-300 text-sm font-medium">This invoice has been paid.</p>
        </div>
      )}
      {isOverdue && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-sm font-medium">
            This invoice is overdue (due {format(new Date(invoice.due_date!), 'dd MMM yyyy')}).
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleSend}
          disabled={!!actionLoading}
          className="btn-secondary inline-flex items-center gap-2 text-sm"
        >
          {actionLoading === 'send' ? (
            <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : <Send className="w-4 h-4" />}
          Send invoice
        </button>
        <button
          onClick={handleDownloadPdf}
          disabled={!!actionLoading}
          className="btn-secondary inline-flex items-center gap-2 text-sm"
        >
          {actionLoading === 'pdf' ? (
            <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : <Download className="w-4 h-4" />}
          Download PDF
        </button>
        {invoice.status !== 'paid' && (
          <>
            <button
              onClick={handleStripeCheckout}
              disabled={!!actionLoading}
              className="btn-secondary inline-flex items-center gap-2 text-sm text-purple-300"
            >
              {actionLoading === 'stripe' ? (
                <span className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              ) : <CreditCard className="w-4 h-4" />}
              Create payment link
            </button>
            <button
              onClick={handleMarkPaid}
              disabled={!!actionLoading}
              className="btn-secondary inline-flex items-center gap-2 text-sm text-green-300"
            >
              {actionLoading === 'paid' ? (
                <span className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
              ) : <Check className="w-4 h-4" />}
              Mark as paid
            </button>
          </>
        )}
      </div>

      {/* Invoice body */}
      <div className="card space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-6 pb-6 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-white mb-4">INVOICE</h2>
            <div className="space-y-1 text-sm">
              <div className="flex gap-3">
                <span className="text-gray-500 w-28">Invoice number</span>
                <span className="text-white font-medium">{invoice.invoice_number}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-500 w-28">Issue date</span>
                <span className="text-gray-300">{format(new Date(invoice.created_at), 'dd MMM yyyy')}</span>
              </div>
              <div className="flex gap-3">
                <span className="text-gray-500 w-28">Due date</span>
                <span className="text-gray-300">
                  {invoice.due_date ? format(new Date(invoice.due_date), 'dd MMM yyyy') : 'Upon receipt'}
                </span>
              </div>
              {invoice.project_title && (
                <div className="flex gap-3">
                  <span className="text-gray-500 w-28">Project</span>
                  <span className="text-gray-300">{invoice.project_title}</span>
                </div>
              )}
            </div>
          </div>

          {/* Client */}
          {invoice.client_name && (
            <div className="sm:text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Bill To</p>
              <p className="text-white font-semibold">{invoice.client_name}</p>
              {invoice.client_company && <p className="text-gray-400 text-sm">{invoice.client_company}</p>}
              {invoice.client_email && <p className="text-gray-400 text-sm">{invoice.client_email}</p>}
              {invoice.client_phone && <p className="text-gray-400 text-sm">{invoice.client_phone}</p>}
            </div>
          )}
        </div>

        {/* Line Items */}
        <div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-500 uppercase tracking-wider pb-2">Description</th>
                <th className="text-right text-xs text-gray-500 uppercase tracking-wider pb-2">Qty</th>
                <th className="text-right text-xs text-gray-500 uppercase tracking-wider pb-2">Unit Price</th>
                <th className="text-right text-xs text-gray-500 uppercase tracking-wider pb-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {invoice.items?.map((item, i) => (
                <tr key={item.id || i}>
                  <td className="py-3 text-sm text-gray-300">{item.description}</td>
                  <td className="py-3 text-sm text-gray-400 text-right">{item.quantity}</td>
                  <td className="py-3 text-sm text-gray-400 text-right">${Number(item.unit_price).toFixed(2)}</td>
                  <td className="py-3 text-sm text-white font-medium text-right">
                    ${(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t border-gray-800 pt-4 flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-300">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t border-gray-700 pt-2 mt-2">
              <span className="text-white">Total Due</span>
              <span className="text-indigo-400 text-lg">${Number(invoice.total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
