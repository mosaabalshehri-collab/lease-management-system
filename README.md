# Lease Management System · نظام إدارة عقود الإيجار

A full-stack lease management system for organizations that **both rent properties (as tenant) and lease them out (as landlord)**. It tracks contracts in both directions, auto-generates payment schedules, manages multi-department approvals, and surfaces expiry/payment alerts — with a bilingual (Arabic-first, RTL) interface and a Hijri/Gregorian calendar toggle.

Built as a portfolio piece with a design language inspired by Saudi Arabia's **Najiz** e-services platform (official green + gold).

---

## Key Features

- **Bidirectional contracts** — every contract has a *direction*:
  - `نستأجر` (leased-in / **payable** — money we pay)
  - `نؤجّر` (leased-out / **receivable** — money owed to us)
- **Automatic payment schedules** — generated from start date + frequency (monthly, quarterly, 4-monthly, semi-annual, annual). Amounts are distributed to the halala with rounding remainder placed on the final installment, so the schedule always sums to the exact contract value.
- **Role-based access (3 roles)**
  - `admin` — registers contracts & files, records payments, full visibility
  - `department` — sees only contracts linked to their department, approves/rejects (rejection requires a mandatory reason; it is recorded but does **not** change contract status)
  - `viewer` — read-only across everything
- **Dashboard** — separate totals for payable vs. receivable, outstanding balances, expiring-contract and overdue-payment counters, and a live alerts feed.
- **Monthly report** — pick any month to see all amounts due, split by direction.
- **In-app notifications** — 30 days before contract expiry, 7 days before a payment is due (plus overdue flags).
- **Department management** — departments are admin-managed data; a department linked to contracts/users is protected from deletion (deactivate instead).
- **Hijri/Gregorian toggle** — dates are stored as Gregorian ISO and rendered in either calendar via the Umm al-Qura calendar (`Intl`, no external library). Preference persists per user.
- **File uploads** — attach the original contract (PDF/image), served with permission checks.
- **Dark mode** — manual toggle, no flash of incorrect theme.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Database | SQLite via Node's built-in `node:sqlite` |
| Auth | JWT (httpOnly cookie) + bcrypt |
| Validation | Zod |

No ORM and no external database server — the entire data layer runs on Node's native SQLite, keeping the project self-contained and easy to run.

---

## Getting Started

> Requires **Node.js 22.5+** (for built-in `node:sqlite`).

```bash
npm install
npm run seed     # creates the database + demo accounts and sample data
npm run build
npm start        # http://localhost:3000
```

For development:

```bash
npm run dev
```

> Both `start`/`dev` are configured to run with the `--experimental-sqlite` flag automatically. If you invoke Node directly, pass `NODE_OPTIONS="--experimental-sqlite"`.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin (مدير) | `admin@lease.sa` | `Admin@123` |
| Department (إدارة) | `finance@lease.sa` | `Dept@123` |
| Viewer (مشاهد) | `viewer@lease.sa` | `Viewer@123` |

---

## Architecture Notes

- **Direction as the core abstraction.** Payable vs. receivable is modeled as a single `direction` column rather than two separate entities, so dashboards, reports, and lists share one query path and stay consistent.
- **Money handled in halalas.** Payment splitting computes in integer halalas (`amount × 100`) to avoid floating-point drift, then converts back — guaranteeing installments sum to the contract total.
- **Server/client boundary.** Server-only modules (`next/headers`, SQLite) are kept out of client bundles; shared constants (roles, labels) live in client-safe modules.
- **Permission filtering at the query layer.** Visibility rules (a department user only sees their contracts) are applied in SQL `WHERE` clauses, not just in the UI.

---

## Project Structure

```
src/
├── app/
│   ├── (app)/            # authenticated shell (sidebar + topbar)
│   │   ├── dashboard/    contracts/  payments/
│   │   ├── reports/monthly/  approvals/
│   │   └── departments/  users/  notifications/
│   ├── api/              # route handlers (auth, contracts, payments, …)
│   └── login/
├── components/           # UI + interactive client islands
└── lib/
    ├── db.ts             # schema + connection (node:sqlite)
    ├── dates.ts          # payment-schedule generation, Hijri/Gregorian
    ├── auth.ts           # JWT, bcrypt, role guards
    ├── queries.ts        # dashboard/report aggregates, visibility filters
    └── types.ts / roles.ts
```

---

*Built by Mosaab Alshehri.*
