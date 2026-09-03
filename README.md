# WABulk — Simple. Powerful. Official WhatsApp Messaging.

WABulk is a production-ready, enterprise-grade **WhatsApp Bulk Messaging Web Application** built from the ground up to integrate with the **Official Meta WhatsApp Business Platform (Cloud API v20.0)**.

Unlike unofficial tools or browser-automation hacks, WABulk strictly adheres to Meta policies, supporting pre-approved WhatsApp message templates, variable mapping, background queue processing, real-time delivery status webhooks, and automatic opt-out handling.

---

## 🌟 Key Features

* **Official Meta WhatsApp Cloud API:** Native integration with Meta Graph API v20.0 (`messages` endpoint), supporting marketing, utility, and authentication templates.
* **Safe Demo Mode:** If live Meta credentials are not configured, WABulk seamlessly activates a simulated sandbox mode with realistic WhatsApp message IDs (`wamid...`) and automated delivery progression (Queued → Sent → Delivered → Read).
* **Audience Segmentation:** Group contacts (e.g. Customers, Employees, Leads) and apply flexible color-coded tags (e.g. VIP, Region, Paid).
* **Interactive CSV/XLSX Import Wizard:** 6-step import engine with file parsing (PapaParse / xlsx), automatic column mapping, duplicate phone detection, international E.164 phone formatting, preview of the first 50 rows, and downloadable error reports.
* **Multi-Step Campaign Wizard:**
  1. Campaign Info (Name, Description)
  2. Audience Selection (Groups, Tags, or All) with live eligible contact counting
  3. Official Template Selection (Approved Meta templates)
  4. Variable Mapping (`{{1}} → firstName`, `{{2}} → custom/date`, etc.)
  5. Live Personalized Preview rendered in a realistic WhatsApp chat bubble
  6. Scheduling (Immediate dispatch or future schedule with timezone support)
  7. Final Confirmation Summary before queue submission
* **Hybrid Background Queue Engine:**
  - When Redis is available, background messaging jobs run via **BullMQ**.
  - When running locally without Redis, WABulk automatically uses a **built-in in-process queue runner** respecting the exact same rate limits (`messagesPerMinute`, concurrency, retries).
* **Live Campaign Tracking & Control:** Real-time polling progress bar, live state machine (`RUNNING`, `PAUSED`, `COMPLETED`, `CANCELLED`), and delivery/read rate KPI calculations.
* **Webhook & Opt-Out System:** Idempotent webhook handler verifying Meta tokens and automatically setting `optedIn = false` when contacts reply with keywords like `STOP`, `UNSUBSCRIBE`, or `OPT OUT`.
* **Security & RBAC:** Session cookie-based authentication, password hashing with bcrypt, role-based access control (`SUPER_ADMIN`, `ADMIN`, `OPERATOR`), and comprehensive immutable audit logs.
* **Theme Support:** Polished SaaS UI with Light, Dark, and System theme modes.

---

## 🛠️ Tech Stack

* **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Sonner (Toasts)
* **Backend:** Next.js Route Handlers, TypeScript, Service-oriented architecture
* **Database:** PostgreSQL with Prisma ORM
* **Queue:** BullMQ + Redis (with resilient internal queue fallback)
* **Data & Validation:** Zod, libphonenumber-js, PapaParse, XLSX, bcryptjs, jsonwebtoken

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
* Node.js v20+ or v24+
* PostgreSQL running locally or cloud database (Neon, Supabase, Aiven, Render)

### 2. Clone & Install
```bash
cd wabulk
npm install --legacy-peer-deps
```

### 3. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure your PostgreSQL `DATABASE_URL` is set:
```env
DATABASE_URL="postgresql://postgres:1234@localhost:5432/wabulk?schema=public"
AUTH_SECRET="your_secure_auth_secret_here"
```

### 4. Database Setup & Seeding
```bash
# Push schema to PostgreSQL
npx prisma db push

# Seed initial admin user, demo contacts, templates, and campaigns
npm run seed
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Default Seed Credentials

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@example.com` | `Admin@123456` | Full system access, users, settings |
| **Operator** | `operator@example.com` | `Operator@123456` | Contacts, campaigns, reports |

---

## 📲 Meta WhatsApp Cloud API Setup Guide

To switch from Safe Demo Mode to live production messaging:

1. **Create a Meta Developer Account:** Visit [developers.facebook.com](https://developers.facebook.com/) and register as a developer.
2. **Create a Meta App:** Click *Create App*, select **Business** type, and add the **WhatsApp** product.
3. **Obtain Credentials:**
   * In the WhatsApp > API Setup screen:
     * Note your **Phone Number ID**
     * Note your **WhatsApp Business Account ID (WABA ID)**
4. **Generate Permanent Access Token:**
   * Go to **Business Settings > Users > System Users**.
   * Add a System User with Admin role.
   * Generate a token with `whatsapp_business_messaging` and `whatsapp_business_management` permissions.
5. **Configure Webhook:**
   * Callback URL: `https://your-domain.com/api/webhooks/whatsapp`
   * Verify Token: Match the `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in your `.env`
   * Webhook Fields: Subscribe to `messages`.
6. **Save in WABulk:**
   * Navigate to **Settings > WhatsApp API** in WABulk.
   * Paste your Phone ID, Business Account ID, and Token, then click **Test Connection**.

---

## 🐳 Docker Deployment

To run WABulk together with PostgreSQL and Redis in Docker containers:

```bash
docker compose up -d --build
```

The application will be accessible at `http://localhost:3000`.

---

## 🧪 Running Tests

WABulk includes automated unit tests covering phone formatting, variable interpolation, and authentication:

```bash
npm test
```

---

## 📄 License
MIT License. Built for enterprise messaging compliance.
