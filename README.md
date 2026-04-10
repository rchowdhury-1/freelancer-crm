# FreelancerCRM

A full-stack CRM application built for freelancers to manage clients, projects, invoices, and payments.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Tailwind CSS + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL (Supabase) |
| Payments | Stripe Checkout + Webhooks |
| PDF | PDFKit |
| Email | Resend |
| Auth | JWT (access tokens 15m) + Refresh tokens 7d (httpOnly cookie) |
| Frontend Deploy | Netlify |
| Backend Deploy | Render |

## Project Structure

```
freelancer-crm/
├── backend/
│   ├── index.js                  # Express app entry point
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── db.js                 # PostgreSQL pool + table init
│       ├── email.js              # Resend email helper
│       ├── pdf.js                # PDFKit invoice generator
│       ├── middleware/
│       │   └── auth.js           # JWT verification middleware
│       └── routes/
│           ├── auth.js           # Register, login, refresh, logout, profile, password
│           ├── clients.js        # CRUD clients
│           ├── projects.js       # CRUD projects
│           ├── invoices.js       # CRUD invoices + PDF + send email
│           ├── billing.js        # Stripe checkout + webhook
│           └── dashboard.js      # Aggregated stats
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── .env.example
    └── src/
        ├── App.tsx
        ├── apiClient.ts          # Axios + refresh token interceptor
        ├── main.tsx
        ├── index.css             # Tailwind + component classes
        ├── contexts/
        │   └── AuthContext.tsx
        ├── components/
        │   ├── Layout.tsx
        │   ├── Sidebar.tsx
        │   ├── Modal.tsx
        │   ├── ProtectedRoute.tsx
        │   └── StatusBadge.tsx
        ├── pages/
        │   ├── Landing.tsx
        │   ├── Login.tsx
        │   ├── Register.tsx
        │   ├── Dashboard.tsx
        │   ├── Clients.tsx
        │   ├── Projects.tsx       # Kanban drag-and-drop
        │   ├── Invoices.tsx
        │   ├── InvoiceDetail.tsx
        │   └── Settings.tsx
        └── types/
            └── index.ts
```

## Database Schema

```sql
users           (id, name, email, password_hash, created_at)
refresh_tokens  (id, token, user_id, expires_at, created_at)
clients         (id, user_id, name, email, phone, company, notes, created_at)
projects        (id, user_id, client_id, title, description, status, rate, rate_type, deadline, created_at)
invoices        (id, user_id, client_id, project_id, invoice_number, status, due_date, total, created_at)
invoice_items   (id, invoice_id, description, quantity, unit_price)
payments        (id, invoice_id, amount, stripe_session_id, paid_at)
```

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL (or a Supabase project)

### 1. Backend

```bash
cd backend
cp .env.example .env
# Fill in your .env values
npm install
npm run dev
```

Backend runs on http://localhost:5000

### 2. Frontend

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000
npm install
npm run dev
```

Frontend runs on http://localhost:5173

### Environment Variables

#### Backend `.env`
```
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://...
JWT_SECRET=...          # generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
REFRESH_SECRET=...      # generate another random secret
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
EMAIL_FROM=onboarding@resend.dev
BACKEND_URL=http://localhost:5000
CLIENT_URL=http://localhost:5173
```

#### Frontend `.env`
```
VITE_API_URL=http://localhost:5000
```

## API Routes

### Auth
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | /auth/register | No | Register new user |
| POST | /auth/login | No | Login, returns access token + sets refresh cookie |
| POST | /auth/refresh | No (cookie) | Get new access token |
| POST | /auth/logout | No | Clear refresh token |
| GET | /auth/me | Bearer | Get current user |
| PUT | /auth/profile | Bearer | Update name/email |
| PUT | /auth/password | Bearer | Change password |

### Clients (all require Bearer token)
| Method | Route | Description |
|---|---|---|
| GET | /clients | List all clients |
| POST | /clients | Create client |
| PUT | /clients/:id | Update client |
| DELETE | /clients/:id | Delete client |

### Projects (all require Bearer token)
| Method | Route | Description |
|---|---|---|
| GET | /projects | List all projects (with client names) |
| GET | /projects/:id | Get project detail |
| POST | /projects | Create project |
| PUT | /projects/:id | Update project (used for status drag-drop) |
| DELETE | /projects/:id | Delete project |

### Invoices (all require Bearer token)
| Method | Route | Description |
|---|---|---|
| GET | /invoices | List all invoices |
| GET | /invoices/:id | Invoice detail with line items |
| POST | /invoices | Create invoice with items |
| PUT | /invoices/:id | Update invoice |
| DELETE | /invoices/:id | Delete invoice |
| GET | /invoices/:id/pdf | Download PDF |
| POST | /invoices/:id/send | Email invoice with PDF to client |

### Billing
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | /billing/create-checkout | Bearer | Create Stripe Checkout session |
| POST | /billing/webhook | Stripe sig | Mark invoice paid on payment success |

### Dashboard
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | /dashboard/stats | Bearer | Aggregated stats + recent activity |

## Deployment

### Supabase (Database)
1. Create a Supabase project at supabase.com
2. Go to Settings → Database → Connection Pooling
3. Copy the **Transaction** pooler URL (port **6543**) — required for Render free tier (IPv4)
4. Set `DATABASE_URL` to this URL

### Render (Backend)
1. Create a new **Web Service** on render.com
2. Connect your GitHub repo, set root directory to `backend`
3. Build command: `npm install`
4. Start command: `node index.js`
5. Add all backend environment variables:
   - `DATABASE_URL` (Supabase Transaction Pooler URL, port 6543)
   - `JWT_SECRET`, `REFRESH_SECRET`
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - `RESEND_API_KEY`, `EMAIL_FROM`
   - `CLIENT_URL` = your Netlify URL (no trailing slash)
   - `NODE_ENV=production`
6. Deploy. Note your Render URL (e.g. `https://your-app.onrender.com`)

### Stripe Webhook (after Render deploy)
1. Go to Stripe Dashboard → Webhooks → Add endpoint
2. Endpoint URL: `https://your-render-url.onrender.com/billing/webhook`
3. Events: `checkout.session.completed`
4. Copy the webhook signing secret → set as `STRIPE_WEBHOOK_SECRET` in Render

### Netlify (Frontend)
1. Create a new site on netlify.com
2. Connect your GitHub repo, set base directory to `frontend`
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variable:
   - `VITE_API_URL` = your Render backend URL (no trailing slash)
6. Deploy

### Git Push
Push both frontend and backend from the repo root. Render and Netlify watch for pushes and auto-deploy.

## Features
- JWT auth with 15-minute access tokens and 7-day refresh tokens
- Refresh token rotation via httpOnly cookie
- Kanban project board with drag-and-drop (dnd-kit)
- PDF invoice generation (PDFKit) — downloadable and emailable
- Email invoices with PDF attachment (Resend)
- Stripe Checkout for client online payments
- Stripe webhook signature verification
- Dashboard with bar chart (recharts) showing 6-month revenue
- Inline confirmation UI (no browser confirm() dialogs)
- Toast notifications for all actions
- Fully responsive dark-themed UI
