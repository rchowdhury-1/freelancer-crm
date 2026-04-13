import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, FolderKanban, FileText, DollarSign, TrendingUp, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../apiClient';
import { DashboardStats } from '../types';
import StatusBadge from '../components/StatusBadge';

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-gray-800 rounded-lg px-3 py-2" style={{ border: '1px solid var(--border)' }}>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-white">${payload[0].value.toFixed(2)}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats')
      .then(({ data }) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const maxRevenue = stats ? Math.max(...stats.monthlyRevenue.map((m) => m.revenue)) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Your freelance business at a glance</p>
      </div>

      {/* Stat Cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Clients" value={String(stats?.totalClients ?? 0)} color="bg-blue-600" />
        <StatCard icon={FolderKanban} label="Active Projects" value={String(stats?.activeProjects ?? 0)} color="bg-amber-600" />
        <StatCard icon={FileText} label="Outstanding" value={`$${(stats?.outstandingInvoices ?? 0).toFixed(2)}`} color="bg-red-600" />
        <StatCard icon={DollarSign} label="Total Revenue" value={`$${(stats?.totalRevenue ?? 0).toFixed(2)}`} color="bg-green-600" />
      </div>

      {/* Revenue Chart */}
      <div className="card">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">Revenue — Last 6 Months</h2>
        </div>
        {stats?.monthlyRevenue.every((m) => m.revenue === 0) ? (
          <div className="h-48 flex items-center justify-center text-slate-600 text-sm">
            No revenue data yet. Send your first invoice!
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats?.monthlyRevenue} barCategoryGap="35%">
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37,99,235,0.08)' }} />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                {stats?.monthlyRevenue.map((entry, i) => (
                  <Cell key={i} fill={entry.revenue === maxRevenue && maxRevenue > 0 ? '#2563eb' : '#374151'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Clients */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Recent Clients</h2>
            <Link to="/clients" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {stats?.recentClients.length === 0 ? (
            <p className="text-sm text-slate-600">No clients yet.</p>
          ) : (
            <div className="space-y-3">
              {stats?.recentClients.map((c) => (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-blue-700 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{c.name}</p>
                    {c.company && <p className="text-xs text-slate-500 truncate">{c.company}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Projects */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Recent Projects</h2>
            <Link to="/projects" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {stats?.recentProjects.length === 0 ? (
            <p className="text-sm text-slate-600">No projects yet.</p>
          ) : (
            <div className="space-y-3">
              {stats?.recentProjects.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <p className="text-sm text-white truncate">{p.title}</p>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Recent Invoices</h2>
            <Link to="/invoices" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {stats?.recentInvoices.length === 0 ? (
            <p className="text-sm text-slate-600">No invoices yet.</p>
          ) : (
            <div className="space-y-3">
              {stats?.recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{inv.invoice_number}</p>
                    <p className="text-xs text-slate-500">${Number(inv.total).toFixed(2)}</p>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
