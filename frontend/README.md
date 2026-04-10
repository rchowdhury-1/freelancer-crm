# FreelancerCRM — Frontend

React 18 + TypeScript single-page application for the FreelancerCRM platform. Built with Vite and styled entirely with Tailwind CSS using a dark theme.

---

## Overview

- **Framework:** React 18 with TypeScript
- **Build tool:** Vite 5
- **Styling:** Tailwind CSS v3 — dark theme throughout, no CSS modules or inline styles
- **Routing:** React Router v6
- **HTTP:** Axios with automatic token refresh interceptor
- **Notifications:** react-hot-toast
- **Charts:** Recharts
- **Drag & Drop:** dnd-kit (used on the Projects kanban board)
- **Icons:** Lucide React

---

## Running Locally

### Prerequisites

- Node.js 18+
- Backend API running (see [backend README](../backend/README.md))

### Steps

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:5001
npm install
npm run dev
```

Frontend runs on http://localhost:5173 (or next available port).

### Build for production

```bash
npm run build
# Output in /dist
```

TypeScript is checked as part of the build (`tsc && vite build`). To check types without building:

```bash
npx tsc --noEmit
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL — no trailing slash. Example: `http://localhost:5001` or `https://api.example.com` |

> Vite bakes environment variables into the bundle at build time. After changing `VITE_API_URL` in Netlify, you must trigger a redeploy for the change to take effect.

---

## Pages

| Route | Page | Auth | Description |
|---|---|---|---|
| `/` | Landing | No | Marketing landing page with sign up / login CTAs |
| `/register` | Register | No | Sign up form. Shows "check your email" screen after submit |
| `/login` | Login | No | Sign in form. Displays toast on `?verified=true` redirect from email |
| `/dashboard` | Dashboard | Yes | Stats cards, 6-month revenue chart, recent activity tables |
| `/clients` | Clients | Yes | List, create, edit, and delete clients |
| `/projects` | Projects | Yes | Kanban board with drag-and-drop across status columns |
| `/invoices` | Invoices | Yes | Table of all invoices with status badges and quick actions |
| `/invoices/:id` | InvoiceDetail | Yes | Full invoice view — PDF download, email send, Stripe pay |
| `/settings` | Settings | Yes | Update profile (name/email) and change password |

Any unknown route redirects to `/`.

---

## Component Structure

```
src/
├── App.tsx                  # BrowserRouter + routes + Toaster
├── apiClient.ts             # Axios instance with refresh interceptor
├── main.tsx                 # React DOM render, AuthProvider wraps App
├── index.css                # Tailwind directives + shared utility classes
├── contexts/
│   └── AuthContext.tsx      # Global auth state — user, token, login, logout
├── components/
│   ├── Layout.tsx           # Shell for all protected pages — sidebar + main content
│   ├── Sidebar.tsx          # Navigation — desktop sidebar + mobile drawer
│   ├── Modal.tsx            # Reusable modal with backdrop — use for all dialogs
│   ├── ProtectedRoute.tsx   # Redirects to /login if not authenticated
│   └── StatusBadge.tsx      # Coloured pill badge for project/invoice statuses
├── pages/
│   ├── Landing.tsx
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   ├── Clients.tsx
│   ├── Projects.tsx
│   ├── Invoices.tsx
│   ├── InvoiceDetail.tsx
│   └── Settings.tsx
└── types/
    └── index.ts             # All shared TypeScript interfaces
```

---

## Shared Component Classes

Global component utility classes are defined in `index.css` and available throughout the app:

| Class | Usage |
|---|---|
| `.btn-primary` | Indigo filled button |
| `.btn-secondary` | Gray outlined button |
| `.btn-danger` | Red filled button |
| `.input` | Dark styled text input |
| `.label` | Form field label |
| `.card` | Dark rounded card (`bg-gray-900`) |
| `.table-header` | Table `<th>` cell |
| `.table-cell` | Table `<td>` cell |

---

## Authentication

### How it works

1. **Register:** User submits the form → backend sends a verification email → frontend shows "check your email" screen
2. **Verify email:** User clicks link in email → backend sets `email_verified = true` → redirects to `/login?verified=true`
3. **Login:** User submits credentials → backend returns `{ accessToken, user }` → frontend stores both in `localStorage` and saves to `AuthContext` state → sets httpOnly refresh cookie
4. **Authenticated requests:** Axios request interceptor reads `accessToken` from `localStorage` and attaches `Authorization: Bearer <token>` header to every request
5. **Token refresh:** When any request returns `401`, the response interceptor automatically calls `POST /auth/refresh` (which uses the httpOnly refresh cookie), stores the new access token, and retries the original request — the user never sees a login prompt
6. **Logout:** Calls `POST /auth/logout` to invalidate the server-side refresh token, clears `localStorage`, and redirects to `/login`
7. **Page load:** `AuthContext` reads the token from `localStorage`, decodes the JWT to check expiry, and restores the session if valid

### Storage

| Data | Storage |
|---|---|
| Access token | `localStorage` key `accessToken` |
| User object | `localStorage` key `user` |
| Refresh token | httpOnly cookie (managed by browser, sent automatically) |

### Protected routes

`ProtectedRoute` checks `AuthContext.loading` and `AuthContext.user`. While loading it renders nothing (avoids flash of login redirect). If no user, redirects to `/login`.

---

## State Management

There is no external state management library. State is managed with:

- **`AuthContext`** — global auth state (user, token, login/logout functions)
- **Component-level `useState`** — all page-local state (lists, form values, loading flags, modal open/close, confirm states)
- **`useEffect`** — data fetching on mount

Each page fetches its own data independently. There is no shared data cache — pages re-fetch on mount.

---

## Key Conventions

- **No `window.confirm()`** — delete confirmations use inline Confirm/Cancel buttons rendered on the row
- **Every button has a loading state** — `disabled` attribute + animated spinner while async operations are in flight
- **All dialogs use `<Modal>`** — never create inline modals or portals in page components
- **All statuses use `<StatusBadge>`** — never render raw status strings
- **Tailwind only** — no inline `style` props, no CSS modules
- **Dark theme** — primary background `bg-gray-950`, cards `bg-gray-900`, accent `indigo-600`
- **All shared types in `src/types/index.ts`** — never define interfaces inline in pages

---

## TypeScript Types

All shared interfaces are in [`src/types/index.ts`](src/types/index.ts):

| Interface | Description |
|---|---|
| `User` | Authenticated user — `id`, `name`, `email`, `created_at` |
| `Client` | Client record with optional contact fields |
| `Project` | Project with status union, optional rate/deadline, joined client fields |
| `InvoiceItem` | Single line item — description, quantity, unit_price |
| `Invoice` | Full invoice with optional joined client/project fields and items array |
| `DashboardStats` | Dashboard API response shape including monthly revenue array |
