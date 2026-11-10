# SmartQueue — Cloud-Based Patient Appointment & Queue Management System

SmartQueue is a cloud-native, multi-tenant patient appointment scheduling and real-time waiting-room queue management platform designed for clinics and multi-department tertiary hospitals. Built as a full-stack TypeScript cloud capstone project, it is architected for scalability, high availability, statelessness, security, and AWS readiness.

---

## 🌟 Key Features (Section 1 Scope Implemented)

- **End-to-End TypeScript Monorepo**: Type-safe shared contracts between backend (`/server`) and frontend (`/client`) via `@smartqueue/shared`.
- **Stateless Cloud Architecture**: JWT-based authentication (15m access token in memory/headers + 7d rotating refresh token in httpOnly cookie), account lockout protection (5 failed attempts), and rate limiting.
- **Race-Condition-Proof Booking**: Unique compound partial index on `{ doctorId: 1, date: 1, startTime: 1 }` preventing double-booking even under concurrent traffic spikes.
- **Real-Time Live Queue Management**: Token generation (e.g. `CAR-001`), priority ordering (`emergency` > `senior` > `normal`), rolling average estimated wait times (ETA), audio chimes, and "turn near" notifications.
- **Public Waiting-Room TV Display**: Dedicated high-contrast fullscreen dashboard (`/display/:hospitalId`) for waiting area monitors showing current serving tokens with live Socket.IO push updates (no authentication required).
- **Patient Portal**: Search & filter doctors by department/experience/fee, 5-step booking wizard, family member dependents management, downloadable appointment slips (with QR code), and personal notifications.
- **Background Cron Jobs**: Automated no-show markups after 30-minute grace periods and 24h/1h appointment reminder dispatch.

---

## 🏗️ Architecture & Monorepo Structure

```
SmartQueue/
├── client/                     # React 18 + Vite + Tailwind CSS + Lucide
│   ├── src/
│   │   ├── components/         # Reusable design system (Avatar, Badge, Modal, etc.)
│   │   ├── context/            # AuthContext, ThemeContext (Dark mode support)
│   │   ├── pages/              # Landing, Auth, Patient Portal, Public TV Display
│   │   └── services/           # Axios API client & Socket.IO real-time client
│   └── package.json
├── server/                     # Node.js + Express + Mongoose + Socket.IO + Pino
│   ├── src/
│   │   ├── config/             # DB (Atlas), Pino logger, Env schema (Zod)
│   │   ├── controllers/        # Express handlers (Auth, Hospital, Doctor, Queue, etc.)
│   │   ├── cron/               # node-cron scheduled background tasks
│   │   ├── middlewares/        # JWT auth guard, RBAC, Rate limiter, Request ID
│   │   ├── models/             # Mongoose schemas with compound indexes
│   │   ├── routes/             # RESTful API routing
│   │   ├── scripts/            # Database seed script
│   │   ├── services/           # Core domain logic, email, storage abstraction
│   │   └── tests/              # Vitest + Supertest integration tests
│   └── package.json
├── shared/                     # Shared TypeScript types, enums, & Socket events
├── e2e/                        # Playwright end-to-end tests
├── scripts/                    # Headless browser verification orchestrator
├── screenshots/                # 16 visual screenshots on Desktop and Mobile
├── PROJECT_CONTEXT.md          # Comprehensive architecture & handoff specification
└── package.json                # Root npm workspaces configuration
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB Atlas**: An active MongoDB Atlas cluster connection string.

### 2. Environment Configuration
Copy the provided `.env.example` templates:

```bash
# Server configuration
cp server/.env.example server/.env

# Client configuration
cp client/.env.example client/.env
```

Edit `server/.env` with your MongoDB Atlas connection string and strong JWT secrets:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=smartqueue
JWT_ACCESS_SECRET=your_super_secret_access_key_min_32_characters
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_characters
```

### 3. Install Dependencies & Build Packages
```bash
npm install
npm run build
```

### 4. Seed the Database
Populates 1 hospital, 5 departments, 10 doctors with full weekly schedules, 1 admin, 2 receptionists, 15 patients with family dependents, and 60+ appointments & queue entries:
```bash
npm run seed
```

### 5. Run the Application in Development Mode
Starts both backend (`http://localhost:5000`) and frontend (`http://localhost:5173`):
```bash
npm run dev
```

---

## 🧪 Testing & Verification

```bash
# 1. TypeScript compilation check across all workspaces
npm run build

# 2. ESLint code standard audit (0 warnings, 0 errors)
npm run lint

# 3. Backend API integration tests with Vitest & Supertest
npm run test

# 4. Playwright End-to-End browser suite & visual screenshot capture
npm run test:e2e
```

---

## 🔑 Demo Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Hospital Admin** | `admin@smartqueue.com` | `Admin@123456` |
| **Doctor** | `doctor.cardio@smartqueue.com` | `Doctor@123456` |
| **Receptionist** | `reception@smartqueue.com` | `Staff@123456` |
| **Patient (Default)** | `patient1@smartqueue.com` | `Patient@123456` |
| **Patient (Alternate)** | `patient2@smartqueue.com` | `Patient@123456` |

*Note: The login page includes 1-click demo login buttons for instant evaluation.*

---

## 📄 License & Attribution
Developed for the Cloud Computing Capstone Project — SmartQueue.
