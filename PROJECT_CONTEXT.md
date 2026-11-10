# SmartQueue — Project Context & Handoff Documentation

> **Document Version:** 1.0.0  
> **Target Audience:** Engineering Team & AI Assistants collaborating on SmartQueue  
> **Active Milestone:** Section 1 Completed (Foundation, Core Backend, Patient Portal)  
> **Next Milestone:** Section 2 (Doctor & Receptionist Dashboards, Clinical Records, Billing, AWS Deployment Readiness)

---

## 1. Project Summary & Complete Feature List

**SmartQueue** is an enterprise-grade, cloud-native Patient Appointment Scheduling and Live Queue Management System engineered for modern healthcare facilities—ranging from single-provider outpatient clinics to multi-department tertiary hospitals.

Designed as a Cloud Computing Capstone project and engineered for AWS cloud deployment, SmartQueue demonstrates modern architectural principles:
- **Stateless Services:** Zero session state stored in Node.js process memory; horizontal scale-out ready.
- **Data Integrity & Concurrency Control:** Atomic database operations and compound unique indexes preventing double-booking during traffic bursts.
- **Event-Driven Real-Time Sync:** Socket.IO bidirectional websocket pipes updating queue boards, patient position counters, and notification feeds with sub-100ms latency.
- **Enterprise Security:** Strict RBAC, rate-limiting, JWT access/refresh token rotation with httpOnly cookies, password hashing with bcrypt (12 rounds), account lockout protection, and zero-trust input validation via Zod schemas.

### Complete Feature List Across Entire Project

#### A. Authentication & Accounts
- [x] Registration, Login, Logout with JWT access token (15m) + refresh token (7d) in httpOnly cookie with rotation.
- [x] Role-Based Route Guards on backend middlewares (`verifyAuth`, `requireRoles`) and React Router (`<ProtectedRoute>`).
- [x] Forgot/Reset password workflow via signed token and email delivery. Profile edit and password change.
- [x] Account lockout after 5 consecutive failed login attempts with a 15-minute cooldown.
- [x] Express rate limiting on sensitive authentication and API endpoints.

#### B. Hospital & Clinical Setup
- [x] Multi-hospital data model supporting single-clinic up to multi-building hospital networks.
- [x] Department management (Cardiology, Orthopedics, General Medicine, Pediatrics, Dermatology) with counter allocation.
- [x] Doctor Profiles: Specialization, department linkage, experience, consultation fee, average consultation duration, bio, and photo.
- [x] Weekly doctor schedules (working days, shifts, break times, slot intervals) with leave/holiday blocking.
- [x] Staff management foundation (Doctors, Receptionists, Admins).

#### C. Appointment Management
- [x] Multi-criteria doctor discovery: department filter, name query, availability, consultation fee, and rating.
- [x] Dynamic slot generation engine respecting doctor shifts, break intervals, existing appointments, and leave dates.
- [x] **Double-booking prevention:** Compound unique partial index `{ doctorId: 1, date: 1, startTime: 1 }` with status filter (`cancelled` excluded).
- [x] Full appointment lifecycle: `booked` -> `checked_in` -> `in_consultation` -> `completed`, `cancelled`, `no_show`.
- [x] Booking for family dependents under a single patient master account.
- [x] Cancellation policy with window enforcement.
- [x] Automated background no-show marking after 30-minute grace period via `node-cron`.
- [x] Email appointment confirmations, 24-hour reminders, 1-hour reminders, and cancellation notifications (console/mock fallback).
- [x] Downloadable appointment slip in client with unique verification QR code and patient instructions.

#### D. Live Queue Management (Core Engine)
- [x] Daily doctor queues with human-readable token numbering (e.g. `CAR-001`, `ORT-012`).
- [x] Automated check-in and token issuance.
- [x] Priority Queueing: `emergency` (weight 3) > `senior` / pregnant / disabled (weight 2) > `normal` (weight 1).
- [x] Real-time live queue tracking for patients: current serving token, user's position, patients ahead, rolling estimated wait time (ETA).
- [x] "Your turn is near" warning banner and audio notification chime when $\le 3$ patients remain ahead.
- [x] **Public Waiting-Room Display Board (`/display/:hospitalId`):** High-contrast, large-font TV board displaying current active tokens per doctor with live Socket.IO push updates (zero login required).
- [x] Complete queue state audit trail and transitions (`waiting` -> `called` -> `in_consultation` -> `completed` / `skipped` / `no_show`).

#### E. Clinical Basics *(Data model defined in Section 1, UI scheduled for Section 2)*
- [x] Mongoose models defined: `Consultation`, `MedicalRecord`.
- [x] Storage service abstraction interface implemented with `local` and `s3` drivers selectable via `STORAGE_DRIVER` env.
- [ ] Section 2: Doctor consultation UI (vitals, diagnosis, prescription items, follow-up date).
- [ ] Section 2: Prescription PDF generation and medical report attachment uploads.

#### F. Billing & Invoicing *(Data model defined in Section 1, UI scheduled for Section 2)*
- [x] Mongoose model defined: `Invoice` (`pending`, `paid`, `refunded`, manual cash/card/UPI recording).
- [ ] Section 2: Receptionist billing screen, invoice generation, payment status updates, daily collection reporting.

#### G. Analytics & Reports *(Scheduled for Section 2)*
- [ ] Section 2: Hospital Admin dashboard with Recharts (daily volume, queue wait times, no-show rate, revenue breakdown, busiest hours heatmap, CSV exports).

#### H. Notifications & Audit Logs
- [x] In-app notification system with unread badge counter, live Socket.IO push, mark-as-read, and mark-all-read.
- [x] AuditLog model and centralized `logAuditAction` service capturing actor, target, action, IP address, user-agent, and metadata.

#### I. Cloud & Non-Functional Architecture
- [x] Stateless REST API design with centralized error handler and standard response enveloper `{ success, data, message, meta }`.
- [x] Deep health-check endpoint (`GET /api/health`) verifying MongoDB database connectivity and uptime.
- [x] Structured JSON logging via Pino with correlation `X-Request-Id` tracking across all requests.
- [x] Security headers via Helmet, CORS origin allowlist, MongoDB injection sanitization, rate limiting.
- [x] Ready for AWS Elastic Beanstalk / ECS / Fargate containerization with Docker.

---

## 2. Tech Stack and Hard Constraints

| Layer | Technology | Version | Purpose / Constraints |
| :--- | :--- | :--- | :--- |
| **Language** | TypeScript | `~5.5` | **Strict Rule:** TypeScript only across backend, frontend, scripts, and tests. **NO Python allowed anywhere.** |
| **Monorepo** | npm Workspaces | `v10+` | Root orchestration with `/server`, `/client`, and `/shared` packages. |
| **Backend Runtime** | Node.js + Express | `v18+` / `v4.19` | Stateless REST API, structured routing, centralized middlewares. |
| **Database & ODM** | MongoDB Atlas + Mongoose | `v8.5` | Cloud-hosted MongoDB cluster connected strictly via `MONGODB_URI`. |
| **Real-Time WebSockets**| Socket.IO | `v4.7` | Bi-directional events for live queue tracking, TV display, notifications. |
| **Validation** | Zod | `v3.23` | Runtime request body, query, and param validation with type inference. |
| **Authentication** | JWT (`jsonwebtoken`) + `bcrypt` | `v9` / `v5` | Access tokens (15m) + refresh tokens (7d) in httpOnly cookies. |
| **Scheduler** | `node-cron` | `v3.0` | In-process cron for no-show automations and reminder dispatches. |
| **Logging** | Pino + `pino-pretty` | `v9.2` | High-performance structured logging with request ID correlation. |
| **Email** | Nodemailer | `v6.9` | SMTP transport with mock fallback when SMTP credentials are unset. |
| **Frontend Framework** | React 18 + Vite | `v18.3` / `v6.4`| Single Page Application with fast HMR and optimized production bundles. |
| **Styling & UI** | Tailwind CSS + Lucide Icons | `v3.4` / `v0.400`| Calm medical palette (teal/blue), dark mode toggle, accessible tokens. |
| **Data Fetching** | TanStack Query + Axios | `v5.51` / `v1.7`| Server state caching, optimistic updates, automatic refetching. |
| **Unit & Integration** | Vitest + Supertest | `v3.2` / `v7.0` | Fast API integration testing against Atlas cloud. |
| **E2E Testing** | Playwright (Chromium) | `v1.45` | Headless browser validation across desktop (1280x800) and mobile (375x667). |

---

## 3. Architecture Overview & Folder Tree

```
SmartQueue/
├── .eslintrc.json              # Monorepo ESLint configuration
├── .gitignore                  # Git ignore rules (prevents .env, dist, uploads)
├── package.json                # Root package with npm workspace targets
├── tsconfig.base.json          # Shared strict TypeScript compiler options
├── playwright.config.ts        # Playwright end-to-end configuration
├── README.md                   # Project overview and quick start guide
├── PROJECT_CONTEXT.md          # Complete project specification and handoff
├── screenshots/                # Real-browser visual verification captures
│   ├── 01-desktop-landing.png
│   ├── 02-desktop-display-board.png
│   ├── 03-desktop-login.png
│   ├── 04-desktop-dashboard.png
│   ├── 05-desktop-doctors.png
│   ├── 06-desktop-book-step1.png
│   ├── 07-desktop-book-slots.png
│   ├── 08-desktop-book-reason.png
│   ├── 09-desktop-my-appointments.png
│   ├── 10-desktop-live-queue.png
│   ├── 11-desktop-dependents.png
│   ├── 12-desktop-profile.png
│   ├── 13-mobile-landing.png
│   ├── 14-mobile-dashboard.png
│   ├── 15-mobile-live-queue.png
│   └── 16-mobile-display.png
├── scripts/
│   ├── run-e2e.ts              # Robust multi-server orchestrator for E2E
│   └── verify-browser.ts       # Visual screenshot and console error auditor
├── e2e/
│   └── patient-journey.spec.ts # 7 comprehensive Playwright journey tests
├── shared/                     # @smartqueue/shared
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       └── index.ts            # Enums, DTOs, API payloads, Socket event definitions
├── server/                     # @smartqueue/server
│   ├── .env.example            # Environment template with placeholders
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── src/
│       ├── app.ts              # Express application factory & middleware setup
│       ├── index.ts            # Server entry point, HTTP + Socket.IO bootstrap
│       ├── config/
│       │   ├── database.ts     # Mongoose connection to Atlas
│       │   ├── env.ts          # Zod-validated environment config
│       │   └── logger.ts       # Pino structured logger
│       ├── controllers/        # Request handling and response shaping
│       ├── cron/               # Appointment reminder & no-show scheduled tasks
│       ├── middlewares/        # Auth, role guard, validation, rate limiters
│       ├── models/             # Mongoose schemas with compound indexes
│       ├── routes/             # Express route declarations
│       ├── scripts/
│       │   └── seed.ts         # High-density database seeder
│       ├── services/           # Business logic, email, storage, queue engine
│       ├── tests/
│       │   └── api.test.ts     # Vitest API integration test suite
│       └── validations/        # Zod input schemas
└── client/                     # @smartqueue/client
    ├── .env.example
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── App.tsx             # Route definitions & Toast provider
        ├── main.tsx            # React DOM bootstrap
        ├── vite-env.d.ts       # Vite client types
        ├── components/
        │   ├── layout/         # Navbar, Sidebar, AppLayout, ProtectedRoute
        │   └── ui/             # Reusable design system components
        ├── context/            # AuthContext, ThemeContext
        ├── pages/              # View pages (Patient portal, Auth, TV display)
        └── services/           # Axios API instance and Socket.IO client
```

---

## 4. Data Models (Collections, Fields, Indexes)

All Mongoose models reside in `server/src/models/` and are fully typed.

### 1. `User` (`users`)
- **Fields:** `email` (string, unique), `passwordHash` (string, select: false), `role` (`'admin' | 'doctor' | 'receptionist' | 'patient'`), `firstName`, `lastName`, `phone`, `dateOfBirth`, `gender`, `bloodGroup`, `address` (object), `isActive` (boolean), `failedLoginAttempts` (number), `lockUntil` (Date), `passwordResetToken` (string), `passwordResetExpires` (Date).
- **Indexes:** `{ email: 1 }` (unique), `{ role: 1 }`.

### 2. `Hospital` (`hospitals`)
- **Fields:** `name`, `slug` (unique), `code` (e.g. `HOSP1`), `address` (street, city, state, zip, country), `contactPhone`, `contactEmail`, `operatingHours` (weekdays, weekends), `isActive`.
- **Indexes:** `{ slug: 1 }` (unique), `{ code: 1 }` (unique).

### 3. `Department` (`departments`)
- **Fields:** `hospitalId` (ref: Hospital), `name`, `code` (e.g. `CAR`, `ORT`), `description`, `floor`, `rooms` (string array), `isActive`.
- **Indexes:** `{ hospitalId: 1, code: 1 }` (unique compound), `{ hospitalId: 1, name: 1 }`.

### 4. `DoctorProfile` (`doctor_profiles`)
- **Fields:** `userId` (ref: User, unique), `hospitalId` (ref: Hospital), `departmentId` (ref: Department), `specialization`, `qualifications` (string array), `experienceYears`, `consultationFee`, `avgConsultationMinutes` (default: 15), `bio`, `roomNumber`, `rating` (number), `reviewCount` (number), `isActive`.
- **Indexes:** `{ userId: 1 }` (unique), `{ hospitalId: 1, departmentId: 1 }`, `{ specialization: 1 }`.

### 5. `Schedule` (`schedules`)
- **Fields:** `doctorId` (ref: DoctorProfile, unique), `weeklySchedule` (array of `{ dayOfWeek: 0-6, isWorkingDay: boolean, shifts: [{ startTime: "HH:mm", endTime: "HH:mm" }], breakTimes: [{ startTime: "HH:mm", endTime: "HH:mm" }], slotDurationMinutes: number }`), `leaves` (array of `{ startDate: Date, endDate: Date, reason: string }`).
- **Indexes:** `{ doctorId: 1 }` (unique).

### 6. `Appointment` (`appointments`)
- **Fields:** `appointmentNumber` (unique string, e.g. `APT-20261110-XXXX`), `hospitalId` (ref: Hospital), `departmentId` (ref: Department), `doctorId` (ref: DoctorProfile), `patientId` (ref: User), `dependentId` (ref: Dependent, optional), `date` (YYYY-MM-DD string), `startTime` ("HH:mm"), `endTime` ("HH:mm"), `visitType` (`'new' | 'follow_up' | 'emergency'`), `priority` (`'normal' | 'senior' | 'emergency'`), `reasonForVisit`, `symptoms` (string array), `status` (`'booked' | 'checked_in' | 'in_consultation' | 'completed' | 'cancelled' | 'no_show'`), `cancellationReason`, `cancelledAt`, `cancelledBy` (ref: User), `checkInTime` (Date), `consultationStartTime` (Date), `consultationEndTime` (Date), `notes`.
- **Compound Unique Index:**
  ```typescript
  AppointmentSchema.index(
    { doctorId: 1, date: 1, startTime: 1 },
    { unique: true, partialFilterExpression: { status: { $ne: 'cancelled' } } }
  );
  ```
  *Prevents double-booking at the database layer while permitting re-booking cancelled time slots.*
- **Query Indexes:** `{ patientId: 1, date: -1 }`, `{ doctorId: 1, date: 1 }`, `{ hospitalId: 1, date: 1, status: 1 }`.

### 7. `QueueEntry` (`queue_entries`)
- **Fields:** `hospitalId` (ref: Hospital), `doctorId` (ref: DoctorProfile), `departmentId` (ref: Department), `appointmentId` (ref: Appointment, unique), `patientId` (ref: User), `date` (YYYY-MM-DD), `tokenNumber` (e.g. `CAR-001`), `sequenceNumber` (integer sequence), `priority` (`'normal' | 'senior' | 'emergency'`), `priorityWeight` (`3` for emergency, `2` for senior, `1` for normal), `status` (`'waiting' | 'called' | 'in_consultation' | 'completed' | 'skipped' | 'no_show'`), `estimatedStartTime` (Date), `actualStartTime` (Date), `completedTime` (Date), `calledAt` (Date), `skippedCount` (number), `notes`.
- **Indexes:** `{ doctorId: 1, date: 1, status: 1, priorityWeight: -1, sequenceNumber: 1 }`, `{ appointmentId: 1 }` (unique), `{ hospitalId: 1, date: 1 }`.

### 8. `Dependent` (`dependents`)
- **Fields:** `patientId` (ref: User), `firstName`, `lastName`, `relationship` (`'spouse' | 'child' | 'parent' | 'sibling' | 'other'`), `dateOfBirth`, `gender`, `bloodGroup`, `emergencyContact`.
- **Indexes:** `{ patientId: 1 }`.

### 9. `Notification` (`notifications`)
- **Fields:** `userId` (ref: User), `title`, `message`, `type` (`'appointment_booked' | 'appointment_reminder' | 'queue_turn_near' | 'queue_called' | 'status_update' | 'system'`), `isRead` (boolean), `data` (metadata object).
- **Indexes:** `{ userId: 1, isRead: 1, createdAt: -1 }`.

### 10. `AuditLog` (`audit_logs`)
- **Fields:** `actorId` (ref: User), `action` (string), `targetModel` (string), `targetId` (ObjectId), `metadata` (object), `ipAddress`, `userAgent`.
- **Indexes:** `{ actorId: 1, createdAt: -1 }`, `{ targetModel: 1, targetId: 1 }`.

### 11. Section 2 Models (Defined & Ready)
- `Consultation`: `{ appointmentId, doctorId, patientId, vitals: { bp, pulse, temp, weight }, diagnosis, notes, prescription: [{ medicineName, dosage, frequency, duration, instructions }], followUpDate }`
- `MedicalRecord`: `{ patientId, doctorId, appointmentId, title, recordType, fileUrl, fileKey, mimeType, sizeBytes }`
- `Invoice`: `{ invoiceNumber, appointmentId, patientId, hospitalId, amount, status: 'pending'|'paid'|'refunded', paymentMethod: 'cash'|'card'|'upi', paidAt }`

---

## 5. API Reference

All responses return standard envelope format:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable status",
  "meta": { "total": 100, "page": 1, "limit": 10 }
}
```

### Health Check
- `GET /api/health` — Public. Checks database ping, memory usage, uptime.

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Public. Body: `{ email, password, firstName, lastName, phone, role }`.
- `POST /api/auth/login` — Public. Body: `{ email, password }`. Sets `refreshToken` httpOnly cookie; returns user + accessToken.
- `POST /api/auth/refresh-token` — Public. Reads httpOnly cookie, rotates refresh token, returns fresh access token.
- `POST /api/auth/logout` — Authenticated. Clears refresh cookie.
- `POST /api/auth/forgot-password` — Public. Body: `{ email }`. Sends password reset token link.
- `POST /api/auth/reset-password` — Public. Body: `{ token, newPassword }`.
- `GET /api/auth/me` — Authenticated. Returns authenticated user profile.
- `PUT /api/auth/profile` — Authenticated. Updates personal information.
- `PUT /api/auth/change-password` — Authenticated. Body: `{ currentPassword, newPassword }`.

### Hospitals & Departments (`/api/hospitals`)
- `GET /api/hospitals` — Public. Lists all active hospitals.
- `GET /api/hospitals/:id` — Public. Detailed hospital view with departments.
- `POST /api/hospitals` — Admin only. Creates a new hospital.
- `GET /api/hospitals/:hospitalId/departments` — Public. Lists departments within a hospital.
- `POST /api/hospitals/:hospitalId/departments` — Admin only. Creates a department.

### Doctors & Schedules (`/api/doctors`)
- `GET /api/doctors` — Public. Query: `hospitalId`, `departmentId`, `search`, `limit`, `page`.
- `GET /api/doctors/:id` — Public. Full doctor profile with qualifications, rating, and fee.
- `GET /api/doctors/:id/schedule` — Public. Weekly shifts and leave blocks.
- `GET /api/doctors/:id/available-slots` — Public. Query: `date` (YYYY-MM-DD). Computes unbooked slots.
- `PUT /api/doctors/:id/schedule` — Doctor / Admin. Updates shifts, slot duration, and leave blocks.

### Appointments (`/api/appointments`)
- `POST /api/appointments` — Authenticated (Patient / Receptionist / Admin). Body: `{ doctorId, date, startTime, visitType, priority, reasonForVisit, symptoms, dependentId }`. Prevents double-booking via atomic database check and compound index.
- `GET /api/appointments` — Authenticated. Role-scoped (Patients see own; Doctors see assigned; Receptionists/Admins see hospital appointments).
- `GET /api/appointments/:id` — Authenticated. Full appointment details.
- `PUT /api/appointments/:id/reschedule` — Authenticated. Body: `{ date, startTime }`. Atomically releases old slot and books new.
- `PUT /api/appointments/:id/cancel` — Authenticated. Body: `{ reason }`. Cancels appointment and removes/cancels associated queue entry.
- `PUT /api/appointments/:id/status` — Staff only (Receptionist / Doctor / Admin). Body: `{ status }`. Allowed state machine transitions.

### Live Queue Engine (`/api/queue`)
- `GET /api/queue/live` — Public / Authenticated. Query: `doctorId`, `date`. Returns full live queue sequence.
- `GET /api/queue/patient-status/:appointmentId` — Authenticated. Returns current token, waiting count, and ETA.
- `GET /api/queue/display/:hospitalId` — Public. Fast waiting-room display feed of currently serving tokens across all departments.
- `POST /api/queue/check-in/:appointmentId` — Staff (Receptionist / Admin). Checks in patient and generates token.
- `POST /api/queue/call-next` — Doctor / Staff. Advances queue; emits `queue:token_called` event.
- `POST /api/queue/update-status` — Doctor / Staff. Body: `{ queueEntryId, status: 'in_consultation' | 'completed' | 'skipped' | 'no_show' }`.
- `POST /api/queue/reassign` — Staff. Reassigns a patient to another doctor's queue.

### Dependents (`/api/dependents`)
- `GET /api/dependents` — Patient only. Lists all family members.
- `POST /api/dependents` — Patient only. Creates a dependent.
- `PUT /api/dependents/:id` — Patient only. Updates a dependent.
- `DELETE /api/dependents/:id` — Patient only. Removes a dependent.

### Notifications (`/api/notifications`)
- `GET /api/notifications` — Authenticated. Returns user notification feed.
- `PUT /api/notifications/:id/read` — Authenticated. Marks a single notification as read.
- `PUT /api/notifications/read-all` — Authenticated. Marks all notifications as read.

---

## 6. Socket.IO Events Reference

Socket connection endpoint: `ws://<server-domain>/socket.io`

### Rooms
- `hospital:<hospitalId>`: Room for hospital-wide broadcasts and public TV display screens.
- `doctor:<doctorId>`: Room for specific doctor queue updates.
- `patient:<userId>`: Private room for user-specific queue and notification push events.

### Client-to-Server Events
- `join:hospital` — Payload: `{ hospitalId: string }`.
- `leave:hospital` — Payload: `{ hospitalId: string }`.
- `join:doctor` — Payload: `{ doctorId: string }`.
- `leave:doctor` — Payload: `{ doctorId: string }`.
- `join:patient` — Payload: `{ patientId: string }`.
- `leave:patient` — Payload: `{ patientId: string }`.

### Server-to-Client Broadcast Events
- `queue:updated`: Emitted when queue ordering or status changes. Payload: `{ doctorId, date, currentServingToken, totalWaiting }`.
- `queue:token_called`: Emitted when doctor calls a token. Payload: `{ doctorId, tokenNumber, patientName, roomNumber }`.
- `queue:turn_near`: Emitted to patient room when $\le 3$ patients are ahead. Payload: `{ appointmentId, tokenNumber, position, etaMinutes }`.
- `notification:new`: Emitted to user room when a new notification is generated. Payload: `{ notification: INotification }`.

---

## 7. Frontend Conventions & Design System

### Design Tokens (Tailwind CSS)
- **Palette:** Calm medical theme.
  - Primary / Brand: `teal-600` (`#0d9488`), `teal-700` (`#0f766e`), hover `teal-500`.
  - Secondary / Accent: `sky-600` (`#0284c7`), `blue-600` (`#2563eb`).
  - Dark Mode: Surface `slate-900`, cards `slate-800`, borders `slate-700`, text `slate-100`.
  - Neutrals: Background `slate-50`, text `slate-900`, muted text `slate-500`.
  - Priority Badges: Normal (`emerald-100 text-emerald-800`), Senior (`amber-100 text-amber-800`), Emergency (`rose-100 text-rose-800 animate-pulse`).
- **Typography:** Modern clean sans-serif (`Inter`, `system-ui`).
- **Card Styling:** `bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm`.

### Component Directory (`client/src/components/`)
- `ui/Button.tsx`: Variants (`primary`, `secondary`, `outline`, `danger`, `ghost`), sizes (`sm`, `md`, `lg`), loading spinner.
- `ui/Input.tsx`: Form inputs with floating labels, error messages, and icon adornments.
- `ui/Select.tsx`: Dropdown select component with error states.
- `ui/Card.tsx`: Standard card container with Header, Title, and Content subcomponents.
- `ui/Badge.tsx`: Status and priority pills.
- `ui/Modal.tsx`: Accessible backdrop dialog with escape key and click-outside dismissal.
- `ui/Skeleton.tsx`: Content placeholders for loading states.
- `ui/EmptyState.tsx`: Visual feedback when lists or tables are empty.
- `ui/Avatar.tsx`: Patient and doctor initials/photo renderer.
- `ui/StatCard.tsx`: KPI counter cards with icon and trend badge.
- `ui/ConfirmDialog.tsx`: Action confirmation modal for destructive operations.

### Routing Map (`client/src/App.tsx`)
- `/` — Public Landing Page with hero, features, workflow, and CTAs.
- `/login` — Login screen with 1-click demo credential autofill buttons.
- `/register` — Self-registration for patients.
- `/forgot-password` & `/reset-password` — Password recovery flow.
- `/display/:hospitalId` — Public Waiting-Room TV Screen (zero authentication required).
- `/patient/*` — Protected Patient Portal routes wrapped in `<AppLayout>`:
  - `/patient/dashboard` — Overview: upcoming appointments, active tokens, quick actions.
  - `/patient/doctors` — Search doctors by department and fee.
  - `/patient/book` — 5-step interactive appointment booking wizard.
  - `/patient/appointments` — Active and historical appointments with cancellation, rescheduling, and PDF slip download.
  - `/patient/queue/:appointmentId` — Live queue tracker with real-time websocket sync, audio chime, and ETA countdown.
  - `/patient/history` — Medical timeline and consultation records.
  - `/patient/dependents` — Family members management.
  - `/patient/notifications` — Notification center.
  - `/patient/profile` — Account profile editor.

---

## 8. Progress Checklist

### Section 1 Scope (Completed by Teammate 1)
- [x] Monorepo scaffolding with npm workspaces (`server`, `client`, `shared`), TypeScript strict configs, ESLint rules, `.gitignore`.
- [x] Complete Mongoose data models with all indexes (including compound unique index on `{ doctorId: 1, date: 1, startTime: 1 }` to prevent double-booking).
- [x] Section 2 models defined early (`Consultation`, `MedicalRecord`, `Invoice`) for data model completeness.
- [x] JWT Authentication module with 15m access token + 7d rotating refresh cookie, account lockout (5 attempts), and bcrypt hashing.
- [x] Hospital, Department, Doctor Profile, and dynamic Slot Generation engine.
- [x] Appointment management with concurrency control, cancellation, rescheduling, and status transitions.
- [x] Real-time live queue engine with tokens, priority ordering (Emergency > Senior > Normal), and Socket.IO rooms.
- [x] Background cron jobs for 30-minute no-show auto-marking and appointment reminder dispatches.
- [x] Storage service abstraction with `local` and `s3` drivers.
- [x] Seed script populating 1 hospital, 5 departments, 10 doctors with weekly schedules, 1 admin, 2 receptionists, 15 patients with dependents, and 64 realistic appointments.
- [x] Vitest + Supertest backend API test suite (8 integration tests passing).
- [x] Modern React 18 + Vite frontend with Tailwind CSS, dark mode toggle, and accessible design system.
- [x] Public Waiting-Room TV Display screen (`/display/:hospitalId`).
- [x] 16 full-page real-browser screenshots on desktop (1280x800) and mobile (375x667) with 0 console errors.
- [x] Playwright End-to-End automated test suite (7 journey tests passing).
- [x] Root `README.md` and complete `PROJECT_CONTEXT.md` specification.

### Section 2 Scope (Pending for Teammate 2)
- [ ] **Doctor Portal Dashboard:**
  - [ ] Doctor live queue management view: Call Next, Start Consultation, Complete, Skip, Recall, Mark No-Show.
  - [ ] Doctor schedule manager: Modify weekly shifts, break times, and request leave blocks.
  - [ ] Clinical consultation interface: Record vitals (BP, pulse, temp, weight), diagnosis, prescriptions, and follow-up date.
  - [ ] Patient medical record upload: Attach lab reports/images via storage abstraction.
  - [ ] Prescription PDF generator.
- [ ] **Receptionist Portal:**
  - [ ] Walk-in patient quick booking and token check-in.
  - [ ] Live hospital queue manager (reorder, reassign to alternate doctor, emergency priority override).
  - [ ] Billing & Invoicing desk: Record payment status (`paid`, `pending`), payment mode (`cash`, `card`, `upi`), and print invoices.
- [ ] **Hospital Admin Portal & Analytics:**
  - [ ] Analytics dashboard with Recharts: Daily appointment trends, average queue wait times, no-show rate, revenue graphs, busiest hours heatmap.
  - [ ] CSV export for appointment and revenue reports.
  - [ ] Department and doctor management CRUD.
- [ ] **AWS Deployment Preparation:**
  - [ ] Multi-stage production `Dockerfile` for backend.
  - [ ] Multi-stage production `Dockerfile` with Nginx for frontend.
  - [ ] Root `docker-compose.yml` for unified local container execution.
  - [ ] AWS deployment documentation (ECS/Fargate or Elastic Beanstalk architecture guide).

---

## 9. Section 2 TODO & Implementation Guide for Teammate 2

When Teammate 2 picks up the codebase, here are the exact steps and files to create:

### Step 1: Doctor Portal Screens
1. Create `client/src/pages/doctor/DoctorQueuePage.tsx`:
   - Connects to Socket.IO room `doctor:<doctorId>`.
   - Displays currently serving patient card with full vitals and reason for visit.
   - Action buttons calling `/api/queue/call-next` and `/api/queue/update-status` (`in_consultation`, `completed`, `skipped`).
2. Create `client/src/pages/doctor/DoctorConsultationPage.tsx`:
   - Form for vitals (BP, Pulse, Temperature, Weight).
   - Dynamic prescription item rows (Medicine, Dosage, Duration, Instructions).
   - Post to `/api/consultations` (create controller in `server/src/controllers/consultation.controller.ts`).
3. Create `client/src/pages/doctor/DoctorSchedulePage.tsx`:
   - Interface to edit weekly shifts and block holiday dates.

### Step 2: Receptionist Portal Screens
1. Create `client/src/pages/receptionist/WalkInBookingPage.tsx`:
   - Quick patient registration + appointment booking + automatic token check-in in a single flow.
2. Create `client/src/pages/receptionist/QueueManagerPage.tsx`:
   - Real-time drag-and-drop or action menu to reassign patients between doctors and trigger emergency overrides.
3. Create `client/src/pages/receptionist/BillingPage.tsx`:
   - List pending invoices, record payment collection (Cash/Card/UPI), and download invoice PDF.

### Step 3: Admin Analytics & Reports
1. Create `client/src/pages/admin/AnalyticsDashboardPage.tsx`:
   - Recharts visual charts: AreaChart for monthly volume, BarChart for department load, Heatmap for peak consultation hours, PieChart for payment methods.
2. Create CSV export utility in `client/src/utils/exportCsv.ts` and backend endpoint `GET /api/reports/appointments/export`.

### Step 4: Docker & AWS Readiness
1. Create `server/Dockerfile`:
   - Multi-stage build (`node:20-alpine`), transpile TypeScript, prune devDependencies, run with non-root user.
2. Create `client/Dockerfile`:
   - Multi-stage build (`node:20-alpine` -> `nginx:alpine`), build Vite bundle, copy to `/usr/share/nginx/html`.
3. Create `docker-compose.yml` in root.
4. Document AWS ECS/Fargate deployment architecture in `docs/AWS_DEPLOYMENT.md`.

---

## 10. How to Run the Project

### Environment Setup
1. Create `server/.env`:
   ```bash
   cp server/.env.example server/.env
   ```
   Populate `MONGODB_URI` with your MongoDB Atlas connection string.
2. Create `client/.env`:
   ```bash
   cp client/.env.example client/.env
   ```

### Execution Commands
```bash
# 1. Install all dependencies across monorepo workspaces
npm install

# 2. Build TypeScript packages
npm run build

# 3. Seed database with realistic demonstration data
npm run seed

# 4. Start full-stack development environment (Backend: 5000, Frontend: 5173)
npm run dev

# 5. Run Vitest backend API tests
npm run test

# 6. Run Playwright real-browser journey tests and screenshot verification
npm run test:e2e

# 7. Run ESLint across all packages
npm run lint
```

### Demonstration Accounts
- **Hospital Admin:** `admin@smartqueue.com` / `Admin@123456`
- **Cardiology Doctor:** `doctor.cardio@smartqueue.com` / `Doctor@123456`
- **Orthopedics Doctor:** `doctor.ortho@smartqueue.com` / `Doctor@123456`
- **Receptionist:** `reception@smartqueue.com` / `Staff@123456`
- **Patient 1:** `patient1@smartqueue.com` / `Patient@123456`
- **Patient 2:** `patient2@smartqueue.com` / `Patient@123456`

---

## 11. Known Issues, Architecture Decisions & Gotchas

1. **Workspace Dependency Linking in npm Workspaces:**
   - In `server/package.json` and `client/package.json`, `@smartqueue/shared` is referenced as `"file:../shared"` to guarantee clean local resolution without needing an npm registry publish. Always run `npm run build` in root before starting dev servers.
2. **Double-Booking Compound Unique Index:**
   - The unique compound index on `Appointment` is `{ doctorId: 1, date: 1, startTime: 1 }` with a partial index filter `{ status: { $ne: 'cancelled' } }`. This allows a previously cancelled slot to be legitimately rebooked while strictly rejecting simultaneous concurrent bookings with HTTP 409 Conflict.
3. **Network Isolation in Terminal Sandbox:**
   - Outbound internet connections (such as connecting to MongoDB Atlas) require `BypassSandbox: true` when running automated test or seed scripts in sandboxed environments.
4. **Playwright Strict Mode Violations:**
   - When navigating and querying elements by visible text in Playwright, prefer `getByRole('heading', { name: ... })` or specific test IDs rather than generic `getByText`, as sidebar navigation items and page headers often share identical textual labels.
5. **Real-Time WebSockets on Windows:**
   - Vite and Express run on ports 5173 and 5000. In development, CORS is configured with `credentials: true` and `origin: 'http://localhost:5173'`. The Socket.IO connection automatically uses websocket transport with HTTP long-polling fallback.

---

## 12. Rules for Next AI Session

1. **TypeScript Only:** Do not introduce Python scripts, tooling, or utilities under any circumstances.
2. **Preserve Zero-Error Standard:** Every new feature must compile cleanly with `tsc --noEmit` and pass `npm run lint` with 0 warnings and 0 errors.
3. **No Mocks or Placeholders:** Do not write mock buttons or half-working screens. Every UI element in Doctor, Receptionist, and Admin dashboards must be backed by real REST endpoints or Socket.IO events.
4. **Secrets Discipline:** Never print, log, or commit `.env` files or connection credentials. All secrets must originate strictly from environment variables.
5. **Real-Browser Verification:** When Section 2 screens are implemented, verify all flows with real browser screenshots and Playwright tests before declaring completion.
