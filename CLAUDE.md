# CLAUDE.md — FreelancerCRM

This file guides Claude when working in this repository.

## Project Overview

FreelancerCRM is a full-stack SaaS CRM for freelancers. It manages clients, projects, invoices, and payments.

- **Frontend**: React 18 + TypeScript + Tailwind CSS (Vite) — runs on port 5173
- **Backend**: Node.js + Express — runs on port 5000
- **Database**: PostgreSQL via Supabase (Transaction Pooler, port 6543)
- **Payments**: Stripe Checkout + Webhook
- **Email**: Resend with PDF attachment
- **PDF**: PDFKit
- **Auth**: JWT (15min access token) + refresh token (7d, httpOnly cookie)

## Running Locally

```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```

Both need `.env` files copied from `.env.example` with real values filled in.

## Repository Structure

```
freelancer-crm/
├── backend/
│   ├── index.js                   # Entry point — middleware order matters (webhook before json)
│   └── src/
│       ├── db.js                  # Pool + initDb() — all table creation here
│       ├── email.js               # Resend helper
│       ├── pdf.js                 # PDFKit invoice generator
│       ├── middleware/auth.js     # requireAuth — attaches req.userId
│       └── routes/
│           ├── auth.js            # register, login, refresh, logout, me, profile, password
│           ├── clients.js
│           ├── projects.js
│           ├── invoices.js        # CRUD + /pdf + /send
│           ├── billing.js         # Stripe checkout + webhook
│           └── dashboard.js
└── frontend/
    └── src/
        ├── apiClient.ts           # Axios instance with refresh interceptor
        ├── contexts/AuthContext.tsx
        ├── components/
        │   ├── Layout.tsx         # Wraps all protected pages
        │   ├── Sidebar.tsx        # Desktop sidebar + mobile drawer
        │   ├── Modal.tsx          # Reusable modal — use this for all dialogs
        │   ├── ProtectedRoute.tsx
        │   └── StatusBadge.tsx
        ├── pages/                 # One file per route
        └── types/index.ts         # All shared TypeScript types
```

## Key Conventions

### Backend
- All routes except `/auth/*` and `/billing/webhook` require `requireAuth` middleware
- Users can only access their own data — always filter by `req.userId`
- Database transactions use `pool.connect()` / `BEGIN` / `COMMIT` / `ROLLBACK` for multi-step writes (e.g. creating invoices with items)
- Stripe webhook route must stay registered **before** `express.json()` in `index.js` — it needs the raw body
- New database columns: use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` in `initDb()` to avoid breaking existing deployments
- Invoice numbers are auto-generated: `INV-YYYYMM-XXXX` format, generated in `invoices.js`

### Frontend
- **Never use `window.confirm()`** — use inline confirm UI with Confirm/Cancel buttons on the row
- All API calls go through `apiClient.ts` (Axios instance with `withCredentials: true` and refresh interceptor)
- Access token stored in `localStorage`, refresh token is an httpOnly cookie handled by the browser
- Toast notifications via `react-hot-toast` for all success/error feedback
- Loading states on every button and form submit — use spinner pattern: `disabled` + animated border spinner
- Use the `Modal` component for all dialogs — do not create inline modals
- Use `StatusBadge` for all status displays
- Tailwind only — no inline styles, no CSS modules
- Dark theme throughout — primary background `bg-gray-950`, cards `bg-gray-900`, accent `indigo-600`
- Common class shortcuts defined in `index.css`: `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.input`, `.label`, `.card`, `.table-header`, `.table-cell`

### TypeScript
- All shared types live in `src/types/index.ts` — add new types there
- Run `npx tsc --noEmit` from `frontend/` to check types before finishing any change

## Environment Variables

### Backend
| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase Transaction Pooler URL (port 6543) |
| `JWT_SECRET` | Access token signing secret |
| `REFRESH_SECRET` | Refresh token signing secret |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | Sender email (default: `onboarding@resend.dev`) |
| `CLIENT_URL` | Frontend URL — no trailing slash |
| `BACKEND_URL` | Backend URL — no trailing slash |
| `NODE_ENV` | `development` or `production` |

### Frontend
| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL — no trailing slash |

## Deployment

- **Backend → Render**: Root dir `backend`, start command `node index.js`
- **Frontend → Netlify**: Root dir `frontend`, build `npm run build`, publish `dist`
- **Database → Supabase**: Use Transaction Pooler URL (port 6543) — Render free tier is IPv4 only
- **Stripe Webhook**: Register endpoint at `https://<render-url>/billing/webhook`, event `checkout.session.completed`

## Things to Watch Out For

- CORS `CLIENT_URL` must have **no trailing slash** — a trailing slash breaks all requests
- `VITE_API_URL` must be set in Netlify env vars and a redeploy triggered after adding it
- Stripe is initialised lazily via `getStripe()` — do not initialise it at module load (crashes if key is missing)
- The Supabase **direct connection** URL uses IPv6 — use the **Transaction Pooler** URL on port 6543 instead
- When adding new protected routes, always add `router.use(requireAuth)` or per-route middleware
- PDF generation buffers the full PDF in memory before sending — fine for invoices, not suitable for large documents
