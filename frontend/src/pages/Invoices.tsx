import { useEffect, useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Eye, Send, Download, CreditCard, Check, Trash2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../apiClient';
import { Invoice, Client, Project, InvoiceItem } from '../types';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const emptyItem: InvoiceItem = { description: '', quantity: 1, unit_price: 0 };
const emptyForm = {
  client_id: '',
  project_id: '',
  due_date: '',
  status: 'draft' as Invoice['status'],
  items: [{ ...emptyItem }],
};

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.get('/invoices'), api.get('/clients'), api.get('/projects')])
      .then(([{ data: inv }, { data: cli }, { data: proj }]) => {
        setInvoices(inv.invoices);
        setClients(cli.clients);
        setProjects(proj.projects);
      })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  function updateItem(index: number, field: keyof InvoiceItem, value: string | number) {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  }

  function addItem() {
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));
  }

  function removeItem(index: number) {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  }

  const total = form.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.items.length === 0) return toast.error('Add at least one item');
    setSaving(true);
    try {
      const { data } = await api.post('/invoices', {
        ...form,
        items: form.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
        })),
      });
      setInvoices((prev) => [data.invoice, ...prev]);
      toast.success('Invoice created');
      setModalOpen(false);
      setForm(emptyForm);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  }

  async function handleSend(id: string) {
    setActionLoading(`send-${id}`);
    try {
      await api.post(`/invoices/${id}/send`);
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === id && inv.status === 'draft' ? { ...inv, status: 'sent' } : inv))
      );
      toast.success('Invoice sent via email');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to send invoice');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDownloadPdf(id: string, number: string) {
    setActionLoading(`pdf-${id}`);
    try {
      const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleStripeCheckout(id: string) {
    setActionLoading(`stripe-${id}`);
    try {
      const { data } = await api.post('/billing/create-checkout', { invoice_id: id });
      window.open(data.url, '_blank');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create payment link');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMarkPaid(id: string) {
    setActionLoading(`paid-${id}`);
    try {
      await api.put(`/invoices/${id}`, { status: 'paid' });
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, status: 'paid' } : inv)));
      toast.success('Invoice marked as paid');
    } catch {
      toast.error('Failed to update invoice');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(id: string) {
    setActionLoading(`delete-${id}`);
    try {
      await api.delete(`/invoices/${id}`);
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
      toast.success('Invoice deleted');
    } catch {
      toast.error('Failed to delete invoice');
    } finally {
      setActionLoading(null);
      setConfirmDeleteId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Invoices</h1>
          <p className="text-gray-500 text-sm mt-1">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setModalOpen(true); }} className="btn-primary inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> New invoice
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="card text-center py-16">
          <FileText className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 mb-2">No invoices yet.</p>
          <button onClick={() => { setForm(emptyForm); setModalOpen(true); }} className="text-indigo-400 hover:text-indigo-300 text-sm">
            Create your first invoice →
          </button>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-800">
                <tr>
                  <th className="table-header">Invoice</th>
                  <th className="table-header hidden sm:table-cell">Client</th>
                  <th className="table-header hidden md:table-cell">Due Date</th>
                  <th className="table-header">Total</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="table-cell">
                      <Link to={`/invoices/${inv.id}`} className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                        {inv.invoice_number}
                      </Link>
                      {inv.client_name && <p className="text-xs text-gray-500 sm:hidden mt-0.5">{inv.client_name}</p>}
                    </td>
                    <td className="table-cell hidden sm:table-cell text-gray-400">{inv.client_name || '—'}</td>
                    <td className="table-cell hidden md:table-cell text-gray-400">
                      {inv.due_date ? format(new Date(inv.due_date), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="table-cell font-medium text-white">${Number(inv.total).toFixed(2)}</td>
                    <td className="table-cell"><StatusBadge status={inv.status} /></td>
                    <td className="table-cell text-right">
                      {confirmDeleteId === inv.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-gray-400">Delete?</span>
                          <button
                            onClick={() => handleDelete(inv.id)}
                            disabled={actionLoading === `delete-${inv.id}`}
                            className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded disabled:opacity-50"
                          >
                            {actionLoading === `delete-${inv.id}` ? '...' : 'Confirm'}
                          </button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/invoices/${inv.id}`} title="View" className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded transition-colors">
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button title="Send email" onClick={() => handleSend(inv.id)} disabled={!!actionLoading} className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-gray-800 rounded transition-colors disabled:opacity-40">
                            {actionLoading === `send-${inv.id}` ? <span className="w-4 h-4 border border-blue-400 border-t-transparent rounded-full animate-spin block" /> : <Send className="w-4 h-4" />}
                          </button>
                          <button title="Download PDF" onClick={() => handleDownloadPdf(inv.id, inv.invoice_number)} disabled={!!actionLoading} className="p-1.5 text-gray-500 hover:text-green-400 hover:bg-gray-800 rounded transition-colors disabled:opacity-40">
                            {actionLoading === `pdf-${inv.id}` ? <span className="w-4 h-4 border border-green-400 border-t-transparent rounded-full animate-spin block" /> : <Download className="w-4 h-4" />}
                          </button>
                          {inv.status !== 'paid' && (
                            <>
                              <button title="Create Stripe payment link" onClick={() => handleStripeCheckout(inv.id)} disabled={!!actionLoading} className="p-1.5 text-gray-500 hover:text-purple-400 hover:bg-gray-800 rounded transition-colors disabled:opacity-40">
                                {actionLoading === `stripe-${inv.id}` ? <span className="w-4 h-4 border border-purple-400 border-t-transparent rounded-full animate-spin block" /> : <CreditCard className="w-4 h-4" />}
                              </button>
                              <button title="Mark as paid" onClick={() => handleMarkPaid(inv.id)} disabled={!!actionLoading} className="p-1.5 text-gray-500 hover:text-yellow-400 hover:bg-gray-800 rounded transition-colors disabled:opacity-40">
                                {actionLoading === `paid-${inv.id}` ? <span className="w-4 h-4 border border-yellow-400 border-t-transparent rounded-full animate-spin block" /> : <Check className="w-4 h-4" />}
                              </button>
                            </>
                          )}
                          <button title="Delete" onClick={() => setConfirmDeleteId(inv.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {modalOpen && (
        <Modal title="New Invoice" onClose={() => setModalOpen(false)} size="xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Client</label>
                <select className="input" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                  <option value="">Select client</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Project</label>
                <select className="input" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                  <option value="">No project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Due Date</label>
                <input type="date" className="input" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Invoice['status'] })}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                </select>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Line Items *</label>
                <button type="button" onClick={addItem} className="text-xs text-indigo-400 hover:text-indigo-300">+ Add item</button>
              </div>
              <div className="space-y-2">
                {form.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-6">
                      <input
                        type="text"
                        required
                        className="input text-sm"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateItem(i, 'description', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        required
                        min="0.01"
                        step="0.01"
                        className="input text-sm"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        className="input text-sm"
                        placeholder="Unit price"
                        value={item.unit_price}
                        onChange={(e) => updateItem(i, 'unit_price', e.target.value)}
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-center pt-2">
                      {form.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(i)} className="text-gray-600 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end border-t border-gray-800 pt-3">
              <div className="text-right">
                <span className="text-sm text-gray-500">Total: </span>
                <span className="text-lg font-bold text-white">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : 'Create invoice'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
