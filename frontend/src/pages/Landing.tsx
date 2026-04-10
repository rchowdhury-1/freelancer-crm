import { Link } from 'react-router-dom';
import { Briefcase, Users, FolderKanban, FileText, CreditCard, Mail, CheckCircle, ArrowRight, Zap } from 'lucide-react';

const features = [
  { icon: Users, title: 'Client Management', desc: 'Store all client details, notes, and contact info in one place.' },
  { icon: FolderKanban, title: 'Project Tracking', desc: 'Kanban board to track projects from start to finish with deadlines.' },
  { icon: FileText, title: 'Professional Invoices', desc: 'Generate PDF invoices with line items and send them via email.' },
  { icon: CreditCard, title: 'Online Payments', desc: 'Clients pay directly via Stripe. Invoices are marked paid automatically.' },
  { icon: Mail, title: 'Email Integration', desc: 'Send invoices to clients with attached PDFs directly from the app.' },
  { icon: Zap, title: 'Dashboard Insights', desc: 'See revenue, active projects, and outstanding invoices at a glance.' },
];

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: ['5 clients', '3 active projects', 'Basic invoices', 'Email support'],
    cta: 'Get started',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    features: ['Unlimited clients', 'Unlimited projects', 'PDF invoices', 'Stripe payments', 'Email invoices', 'Priority support'],
    cta: 'Start free trial',
    highlight: true,
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Nav */}
      <nav className="border-b border-gray-800/50 sticky top-0 bg-gray-950/80 backdrop-blur-md z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-white">FreelancerCRM</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary text-sm">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-transparent to-purple-900/10 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center relative">
          <div className="inline-flex items-center gap-2 bg-indigo-900/30 border border-indigo-700/50 text-indigo-300 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-indigo-400 rounded-full" />
            Built for freelancers, by freelancers
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
            Manage your freelance
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              business with ease.
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Clients, projects, invoices and payments — all in one dark-themed CRM built specifically for
            independent freelancers who want to get paid faster and stay organised.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-primary inline-flex items-center gap-2 text-base px-6 py-3">
              Start for free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="btn-secondary inline-flex items-center gap-2 text-base px-6 py-3">
              Sign in to your account
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[
              { value: '100%', label: 'Free to start' },
              { value: 'PDF', label: 'Invoice export' },
              { value: 'Stripe', label: 'Payment processing' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-indigo-400">{stat.value}</div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Everything you need to run your business</h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Stop juggling spreadsheets and chasing payments. FreelancerCRM puts all your business tools in one clean dashboard.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card group hover:border-indigo-700/50 transition-colors">
              <div className="w-10 h-10 bg-indigo-900/50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600/30 transition-colors">
                <Icon className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">{title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 border-t border-gray-800">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Simple, transparent pricing</h2>
          <p className="text-lg text-gray-400">Start free. Upgrade when you're ready.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`card relative ${
                plan.highlight
                  ? 'border-indigo-600 ring-2 ring-indigo-600/30'
                  : 'border-gray-800'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Most popular
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={`block text-center py-2.5 rounded-lg font-medium transition-colors ${
                  plan.highlight
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-100'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to get your freelance business organised?
          </h2>
          <p className="text-gray-400 mb-8 text-lg">Join freelancers who use FreelancerCRM to manage their work.</p>
          <Link to="/register" className="btn-primary inline-flex items-center gap-2 text-base px-8 py-3">
            Create your free account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
              <Briefcase className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm text-gray-400">FreelancerCRM</span>
          </div>
          <p className="text-sm text-gray-600">© {new Date().getFullYear()} FreelancerCRM. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
