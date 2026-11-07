# Premium Construction Billing & Invoice Management Software

A modern, enterprise-grade, lightweight SaaS billing and invoice management platform built for construction contractors, infrastructure developers, and civil engineering companies.

---

## 1. Project Overview & Architecture

This application provides everyday billing management without the overhead or complexity of a heavy ERP. It is engineered with high precision financial calculations, configurable GST rate logic, payment tracking, automated A4 PDF invoice rendering, and WhatsApp client statement sharing.

### Monorepo Structure

```text
Billing system/
├── client/                     # React + Vite + TypeScript Frontend
│   ├── src/
│   │   ├── components/         # Reusable UI & Modals (ClientModal, PaymentModal, ConfirmModal)
│   │   ├── context/            # AuthContext (JWT) & ToastContext (Notifications)
│   │   ├── pages/              # Dashboard, Clients, Invoices, Payments, Settings, Login
│   │   ├── services/           # Axios API Client & Endpoints
│   │   ├── types/              # TypeScript Models & Interfaces
│   │   ├── utils/              # Decimal-safe math & currency formatters (INR)
│   │   ├── App.tsx             # Routes & Layout definition
│   │   └── main.tsx            # Application entrypoint
│   ├── vercel.json             # Vercel SPA routing rewrites
│   ├── vite.config.ts          # Vite bundler & API dev proxy
│   └── package.json
│
├── server/                     # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── config/             # MongoDB connection & Environment config
│   │   ├── controllers/        # Auth, Dashboard, Clients, Invoices, Payments, Settings
│   │   ├── middleware/         # JWT Auth, Zod Validation, Global Error Handling
│   │   ├── models/             # Mongoose Schemas (User, Client, Invoice, Payment, Settings, AuditLog)
│   │   ├── routes/             # RESTful API endpoints
│   │   ├── services/           # Financial math, sequential numbering, PDF generation (PDFKit), audit
│   │   ├── scripts/            # Seed script for initial admin & realistic construction records
│   │   ├── tests/              # Automated financial calculation test suite
│   │   └── server.ts           # Express server entry point
│   ├── tsconfig.json           # Server TypeScript configuration
│   └── package.json
│
├── README.md                   # Complete architectural and deployment manual
├── .gitignore                  # Git ignore rules for node_modules, builds, .env
└── package.json                # Root monorepo workspace scripts
```

---

## 2. Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, Axios, React Router v6.
- **Backend:** Node.js 22, Express.js, TypeScript, REST API architecture, JWT authentication, bcryptjs, Helmet, Zod validation.
- **Database:** MongoDB Atlas with Mongoose ODM (includes embedded memory server fallback for instant zero-config offline development).
- **PDF Generation:** Server-side PDFKit producing print-ready, vectorized A4 invoices with corporate deep navy styling, bank remittance particulars, and authorized signatory blocks.
- **Sharing:** Direct WhatsApp click-to-chat prefilled text generator with verified invoice totals and balance due.

---

## 3. Financial Calculation Rules & GST Compliance

All financial calculations are validated on the backend service layer (`server/src/services/calculationService.ts`) and mirrored on the client for live calculation previews (`client/src/utils/calculations.ts`):

1. **Line Item Amounts:** `Quantity × Rate` rounded to 2 decimal places.
2. **Subtotal:** Sum of all line item amounts.
3. **Discounts:** Supports either Fixed Amount or Percentage discount (`(Subtotal × %) / 100`).
4. **Taxable Amount:** `Subtotal - Discount + Additional Charges`.
5. **GST Rules:**
   - **Intra-State Supply:** `CGST = Rate / 2 %` and `SGST = Rate / 2 %`.
   - **Inter-State Supply:** `IGST = Rate %` (CGST = 0, SGST = 0).
   - **Configurable Rates:** 5%, 12%, 18%, 28%, or custom CA-prescribed works contract rates.
   - **Exempt / Zero Rated:** Taxable at 0% with "Bill of Supply" designation.
6. **Snapshots:** When an invoice is officially issued, a complete immutable snapshot of client address, GSTIN, and company banking details is sealed into the invoice record. Historical invoices never silently recalculate when settings change.
7. **Overpayment Prevention:** Payments exceeding the remaining invoice balance are rejected to prevent ledger corruption.

---

## 4. Local Development Setup

### Prerequisites
- Node.js (v18 or v22+)
- npm (v9 or v10+)

### Step 1: Install Dependencies
From the project root:
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Step 2: Configure Environment Variables

**Server (`server/.env`):**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/construction_billing
JWT_SECRET=construction_billing_jwt_super_secret_key_2026_secure
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
ADMIN_EMAIL=admin@construction.com
ADMIN_PASSWORD=Admin@123456
```
*(Note: If a local MongoDB instance is not detected, the server automatically starts an in-memory MongoDB instance for seamless local testing without any configuration).*

**Client (`client/.env`):**
```env
VITE_API_URL=http://localhost:5000/api
```

### Step 3: Run the Development Servers

Open two terminals:

**Terminal 1 (Backend):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 5. Default Admin Credentials

On first server launch, the database is seeded automatically:
- **Email:** `admin@construction.com`
- **Password:** `Admin@123456`
- **Role:** `admin`

Realistic demo construction clients (`DLF Cyber Real Estate`, `Godrej Highland`, `Signature Global Horizon`) and sample invoices are pre-populated for immediate evaluation.

---

## 6. Running Automated Financial Tests

To verify that all financial calculation functions (item pricing, subtotals, discounts, intra-state CGST/SGST, inter-state IGST, grand totals, and payment status derivations) adhere to 100% precision:

```bash
cd server
npx tsx src/tests/testMath.ts
```

Output:
```text
--- RUNNING FINANCIAL CALCULATION TESTS ---
 ALL FINANCIAL LOGIC TESTS PASSED WITH 100% ACCURACY!
```

---

## 7. Production Deployment Guide

### A. Database — MongoDB Atlas
1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com/).
2. In **Database Access**, create a user with read/write privileges.
3. In **Network Access**, whitelist your deployment IPs (or `0.0.0.0/0` with secure credentials).
4. Copy the connection string (e.g. `mongodb+srv://user:pass@cluster0.mongodb.net/construction_billing?retryWrites=true&w=majority`).

### B. Backend — Render
1. Create a **New Web Service** connected to your repository.
2. Root Directory: `server`
3. Environment: `Node`
4. Build Command: `npm install && npm run build`
5. Start Command: `npm run start`
6. Health Check Path: `/api/health`
7. Set Environment Variables:
   - `NODE_ENV=production`
   - `PORT=5000` (Render handles port routing automatically)
   - `MONGODB_URI=<your_mongodb_atlas_uri>`
   - `JWT_SECRET=<strong_random_secret_32_chars>`
   - `CLIENT_URL=https://your-frontend.vercel.app`
   - `ADMIN_EMAIL=director@yourcompany.com`
   - `ADMIN_PASSWORD=YourSecurePassword123`
> **Hosting Note:** Render's free tier spins down after 15 minutes of inactivity and takes ~30-50s to wake up on the first request. For mission-critical production with guaranteed instant response, the Starter plan ($7/mo) is recommended.

### C. Frontend — Vercel
1. Import the repository into [Vercel](https://vercel.com/).
2. Root Directory: `client`
3. Framework Preset: `Vite`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Environment Variables:
   - `VITE_API_URL=https://your-render-backend-url.onrender.com/api`
7. The included `client/vercel.json` ensures client-side routing works smoothly across page refreshes.

---

## 8. License

Proprietary enterprise software built for Apex Skyline Infrastructure & Constructions.

