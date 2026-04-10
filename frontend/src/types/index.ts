export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  client_id?: string;
  client_name?: string;
  client_company?: string;
  title: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  rate?: number;
  rate_type?: 'hourly' | 'fixed';
  deadline?: string;
  created_at: string;
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
}

export interface Invoice {
  id: string;
  user_id: string;
  client_id?: string;
  project_id?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_company?: string;
  project_title?: string;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  due_date?: string;
  total: number;
  created_at: string;
  items?: InvoiceItem[];
}

export interface DashboardStats {
  totalClients: number;
  activeProjects: number;
  outstandingInvoices: number;
  totalRevenue: number;
  monthlyRevenue: { month: string; revenue: number }[];
  recentClients: Pick<Client, 'id' | 'name' | 'company' | 'created_at'>[];
  recentProjects: Pick<Project, 'id' | 'title' | 'status' | 'deadline'>[];
  recentInvoices: Pick<Invoice, 'id' | 'invoice_number' | 'status' | 'total' | 'due_date' | 'client_name'>[];
}
