# SmartQueue — Project Context & Handoff Documentation

> **Document Version:** 2.0.0  
> **Target Audience:** Engineering Team & AI Assistants collaborating on SmartQueue  
> **Active Milestone:** Section 1 & Section 2 Completed (Full-Stack Production-Ready, Verified, AWS Cloud-Ready)  
> **Deployment Status:** Cloud-Ready (Docker multi-stage images, AWS ECS Fargate, ALB Sticky Sessions, CloudFront S3 SPA)

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

#### E. Clinical Basics
- [x] Mongoose models defined: `Consultation`, `MedicalRecord`.
- [x] Storage service abstraction interface implemented with `local` and `s3` drivers selectable via `STORAGE_DRIVER` env.
- [x] Doctor consultation UI with live patient vitals, diagnosis, dynamic prescription item builder, and follow-up date picker (`DoctorConsultationPage.tsx`).
- [x] Professional A4 Prescription PDF generation (`pdfkit`) with hospital letterhead, doctor credentials, patient vitals, and structured Rx table (`/api/consultations/:id/pdf`).
- [x] Patient medical report and lab file attachment uploads via Multer memory storage and S3 storage abstraction (`/api/medical-records/upload`).

#### F. Billing & Invoicing
- [x] Mongoose model defined: `Invoice` (`pending`, `paid`, `refunded`, manual cash/card/UPI recording).
- [x] Receptionist Billing & Cashier Desk with payment collection modal (Cash, Card, UPI), instant status sync, and daily collection metrics (`BillingDeskPage.tsx`).
- [x] Formal tax invoice & receipt PDF generation (`pdfkit`) with breakdown of consultation fees, hospital tax ID, and payment timestamp (`/api/invoices/:id/pdf`).
- [x] Daily collection summary reporting endpoint (`GET /api/invoices/daily-summary`).

#### G. Analytics & Reports
- [x] Hospital Admin executive dashboard with Recharts (`AnalyticsDashboardPage.tsx`):
  - Today's appointment volume & queue status breakdown.
  - Average queue wait time and consultation pace metrics.
  - No-show rate and revenue collection distribution by payment mode (Cash, Card, UPI).
  - 30-day appointment throughput trends and busiest hours traffic heatmap.
  - Departmental caseload distribution and doctor productivity rankings.
  - Cumulative patient registration growth curve with date range picker.
- [x] Streaming CSV export utility for appointment rosters and revenue logs (`/api/reports/appointments/export` and `/api/reports/revenue/export`).

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

### Clinical Consultations (`/api/consultations`)
- `POST /api/consultations` — Doctor only. Body: `{ appointmentId, vitals: { bloodPressure, pulse, temperature, weight, oxygenLevel }, symptoms, diagnosis, notes, prescriptionItems: [{ medicineName, dosage, frequency, duration, instructions }], labTests, followUpDate }`. Atomically completes appointment and updates doctor's rolling consultation pace.
- `GET /api/consultations/appointment/:appointmentId` — Authenticated (Doctor, Receptionist, Patient). Fetches consultation record for the given appointment.
- `GET /api/consultations/:id/pdf` — Authenticated. Generates and streams professional A4 prescription PDF via `pdfkit`.
- `GET /api/consultations/patient/:patientId` — Authenticated. Returns historical clinical consultation timeline.

### Medical Records & Report Uploads (`/api/medical-records`)
- `POST /api/medical-records/upload` — Authenticated. Multipart upload (`file`, `title`, `recordType`, `patientId`, `appointmentId`). Stores file via storage abstraction (`local` or `s3`) and records metadata.
- `GET /api/medical-records/patient/:patientId` — Authenticated. Fetches patient lab reports and uploaded medical documents.
- `GET /api/medical-records/:id/download` — Authenticated. Streams file or generates presigned S3 URL.
- `DELETE /api/medical-records/:id` — Authenticated. Removes document from database and storage driver.

### Invoicing & Billing (`/api/invoices`)
- `GET /api/invoices` — Staff (Receptionist, Admin) or Patient. Returns paginated invoice list with search, status, and date filters.
- `GET /api/invoices/:id` — Authenticated. Fetches invoice by ID with patient/doctor details.
- `PUT /api/invoices/:id/pay` — Receptionist or Admin. Body: `{ paymentMode: 'cash' | 'card' | 'upi', notes }`. Records manual payment and synchronizes appointment payment status.
- `GET /api/invoices/:id/pdf` — Authenticated. Streams formal tax invoice & payment receipt PDF.
- `GET /api/invoices/daily-summary` — Staff only. Aggregates today's billed, collected, pending amounts, and mode breakdown.

### Executive Analytics (`/api/analytics`)
- `GET /api/analytics/dashboard` — Hospital Admin / Super Admin. Query: `startDate`, `endDate`. Returns comprehensive MongoDB aggregations:
  - Throughput summary (total scheduled, completed, cancelled, no-show rate).
  - Active queue metrics (currently waiting, avg wait time in minutes).
  - Revenue summary (total billed, collected, pending, revenue by payment mode).
  - 30-day daily volume trend and busiest hours traffic heatmap (08:00 - 18:00).
  - Caseload by department and clinician productivity breakdown.
  - Cumulative patient registration growth curve.

### Data Reports & CSV Exports (`/api/reports`)
- `GET /api/reports/appointments/export` — Staff only. Query: `startDate`, `endDate`, `status`, `departmentId`. Streams CSV of appointments with patient, clinician, token, and timing data.
- `GET /api/reports/revenue/export` — Staff only. Query: `startDate`, `endDate`. Streams CSV of all billed invoices and payment transaction logs.

### Hospital Administration & Staff Directory (`/api/admin`)
- `GET /api/admin/staff` — Admin only. Lists all doctors and receptionists with statuses and department linkages.
- `POST /api/admin/doctors` — Admin only. Creates doctor user account and linked `DoctorProfile`.
- `POST /api/admin/receptionists` — Admin only. Creates receptionist user account.
- `PATCH /api/admin/staff/:userId/status` — Admin only. Body: `{ isActive: boolean }`. Enables or disables clinician/staff login.
- `GET /api/admin/patients` — Staff only. Returns searchable directory of registered patients.
- `GET /api/admin/audit-logs` — Admin only. Query: `action`, `limit`, `page`. Security and administrative audit trail with actor, IP, and timestamp.
- `GET /api/admin/settings` — Admin only. Returns hospital operational policies and working hours.
- `PUT /api/admin/settings` — Admin only. Body: `{ cancellationWindowHours, defaultSlotDurationMinutes, gracePeriodMinutes, workingHoursStart, workingHoursEnd }`.

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

### Section 2 Scope (Completed & Verified)
- [x] **Doctor Portal Dashboard:**
  - [x] Doctor live queue management console: Call Next, Start Consultation, Complete, Skip, Recall, Mark No-Show, Pause Queue (`DoctorQueuePage.tsx`).
  - [x] Doctor schedule manager: Modify weekly shifts, break times, and request leave blocks (`DoctorSchedulePage.tsx`).
  - [x] Clinical consultation interface: Record vitals (BP, pulse, temp, weight), diagnosis, prescriptions, and follow-up date (`DoctorConsultationPage.tsx`).
  - [x] Patient medical record upload: Attach lab reports/images via storage abstraction (`/api/medical-records/upload`).
  - [x] Prescription PDF generator via `pdfkit` (`/api/consultations/:id/pdf`).
- [x] **Receptionist Portal:**
  - [x] Walk-in patient quick booking and token check-in (`WalkInBookingPage.tsx`).
  - [x] Live hospital queue manager (reorder, reassign to alternate doctor, emergency priority override) (`QueueManagerPage.tsx`).
  - [x] Billing & Invoicing desk: Record payment status (`paid`, `pending`), payment mode (`cash`, `card`, `upi`), and print invoices (`BillingDeskPage.tsx`).
  - [x] QR Scan check-in screen for rapid patient arrival validation (`QrScannerPage.tsx`).
- [x] **Hospital Admin Portal & Analytics:**
  - [x] Analytics dashboard with Recharts: Daily appointment trends, average queue wait times, no-show rate, revenue graphs, busiest hours heatmap (`AnalyticsDashboardPage.tsx`).
  - [x] CSV export for appointment and revenue reports (`/api/reports/appointments/export`, `/api/reports/revenue/export`).
  - [x] Department and doctor management CRUD (`DepartmentsPage.tsx`, `StaffManagementPage.tsx`).
  - [x] Security audit log browser (`AuditLogsPage.tsx`) and Hospital operational settings (`SystemSettingsPage.tsx`).
- [x] **AWS Deployment Preparation:**
  - [x] Multi-stage production `Dockerfile` for backend (`node:20-alpine`, non-root user).
  - [x] Multi-stage production `Dockerfile` with Nginx for frontend (`nginx:alpine` SPA routing).
  - [x] Root `docker-compose.yml` for unified local container execution.
  - [x] Complete AWS deployment documentation (`docs/AWS_DEPLOYMENT.md`) and system architecture specification (`docs/ARCHITECTURE.md`).

---

## 9. Section 2 Completed Implementation & Verification Log

All Section 2 requirements have been implemented in strict TypeScript with zero placeholders and verified via automated test suites and real-browser visual execution:

1. **Doctor Portal Console:**
   - Real-time queue sync with Socket.IO room `doctor:<doctorId>`.
   - Vitals recording, diagnosis classification, Rx medications with dosing frequency, and PDF generation.
   - Doctor rolling average consultation pace auto-update upon consultation completion.
2. **Receptionist Flow:**
   - Walk-in registration with atomic double-booking prevention.
   - Queue management board with priority sorting (`emergency` > `senior` > `normal`) and doctor reassignment.
   - Billing cashier desk recording cash/card/UPI payments and generating PDF tax invoices.
3. **Hospital Admin Analytics & Auditing:**
   - Aggregation pipelines computing queue latency, no-show percentage, and busiest clinic hours.
   - Streaming CSV downloads for compliance and offline analysis.
   - Full staff activation/deactivation toggles and immutable audit logs.
4. **Hardening & Verification:**
   - `tsc --noEmit`: 0 compiler errors across monorepo packages.
   - ESLint: 0 warnings, 0 errors.
   - Vitest backend test suite: 19/19 tests passing.
   - Playwright end-to-end suite: 11/11 tests passing.
   - Real-browser visual verification: 20 high-fidelity full-page screenshots captured across desktop and mobile viewports with zero console errors.

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

## 12. Production Readiness & Handoff Summary

1. **TypeScript Only:** Backend, frontend, seed scripts, and tests are 100% TypeScript with zero Python artifacts.
2. **Quality Benchmark:** Passed with zero compiler errors (`tsc --noEmit`), zero ESLint warnings, 19/19 Vitest integration tests passing, and 11/11 Playwright end-to-end tests passing.
3. **No Mocks or Placeholders:** Every UI screen in Patient, Doctor, Receptionist, and Admin dashboards connects to live Express endpoints and MongoDB Atlas.
4. **AWS-Ready Containerization:** Multi-stage production Dockerfiles for `server` and `client`, unified `docker-compose.yml`, sticky-session ALB socket architecture, and AWS ECS deployment guide in `docs/AWS_DEPLOYMENT.md`.

---

## 13. Project Report Helper (College Capstone Reference)

This section serves as a comprehensive reference guide for preparing the final academic project report, presentation slides, and technical viva documentation for the **SmartQueue** Cloud Computing Capstone project.

### 13.1 Abstract
In traditional healthcare facilities, inefficient patient scheduling and physical queue crowding result in prolonged wait times, patient dissatisfaction, clinical burnout, and transmission risks in crowded waiting rooms. **SmartQueue** is a modern, cloud-native Patient Appointment Scheduling and Live Queue Management System engineered for outpatient clinics and multi-specialty hospitals. Built on a stateless Node.js/Express and MongoDB Atlas architecture with a reactive React 18 frontend and bidirectional Socket.IO websockets, SmartQueue eliminates waiting room congestion through real-time queue tracking, priority triage, automated notification chimes, digital clinical records, and hospital-wide public display boards. The system strictly adheres to cloud computing principles—stateless elasticity, high availability, atomic concurrency control preventing double-booking, and pay-as-you-go managed cloud services—providing an AWS-deployable, resilient solution designed to streamline the end-to-end patient care lifecycle.

### 13.2 Problem Statement
1. **Unpredictable Waiting Times:** Patients arrive without visibility into clinical queue delays, leading to crowded waiting areas and extended idle times averaging 60–120 minutes.
2. **Double-Booking & Race Conditions:** Concurrent booking attempts during peak hours frequently cause overbooking, clinician fatigue, and operational friction.
3. **Information Asymmetry:** Patients lack real-time updates regarding doctor availability, consultation progress, and emergency delays.
4. **Disjointed Healthcare Administration:** Paper-based prescriptions, walk-in registration bottlenecks, disconnected cashier desks, and lack of operational analytics hinder clinical decision-making.
5. **Infrastructure Rigidity:** Legacy hospital management software requires expensive on-premise hardware with high maintenance costs and zero elasticity to absorb sudden traffic surges.

### 13.3 Project Objectives
- **Zero Double-Booking:** Implement atomic concurrency control and compound database indexes to prevent overlapping appointment slots during simultaneous patient bookings.
- **Real-Time Live Queue Tracking:** Deliver sub-100ms bidirectional event streaming for patients to track live position, count of patients ahead, and rolling estimated wait time (ETA) based on physician pacing.
- **Priority Triage:** Automate intelligent queue reordering based on clinical severity (`emergency` > `senior/pregnant/disabled` > `normal`).
- **Complete Clinical & Financial Flow:** Provide integrated consultation logging, vitals recording, dynamic Rx prescription PDF generation, and cashless/cash invoice receipts.
- **Public Waiting-Room Monitor:** Deliver a zero-login, large-font TV display board for hospital waiting lounges auto-updated via WebSockets.
- **Executive Analytics:** Equip hospital administrators with live operational heatmaps, clinician productivity rankings, department caseload distributions, and revenue aggregates.
- **Cloud-Native Architecture:** Architect the entire system around stateless microservices, containerization, and AWS managed services for high availability, fault tolerance, and cost efficiency.

### 13.4 Modules Breakdown
1. **Authentication & RBAC Module:**
   - Multi-role access control (`Patient`, `Doctor`, `Receptionist`, `Hospital Admin`, `Super Admin`).
   - JWT authentication featuring short-lived access tokens (15m) and secure httpOnly refresh tokens (7d) with automatic rotation.
   - Account lockout enforcement (5 consecutive failed attempts triggering a 15-minute cooldown) and password reset with signed tokens.
2. **Appointment Scheduling Engine:**
   - Multi-criteria discovery (specialization, department, consultation fee, doctor rating).
   - Dynamic time-slot engine parsing shift timings, break intervals, holidays, and existing reservations.
   - Atomic database reservation with unique compound index `{ doctorId: 1, date: 1, startTime: 1 }` (cancelled appointments excluded).
   - Background cron worker (`node-cron`) automatically flagging no-shows past the 30-minute grace window.
   - Downloadable appointment verification slip with dynamic QR code.
3. **Live Queue Management Module (Core Engine):**
   - Department-prefixed sequential tokens (e.g., `CAR-001`, `ORT-014`).
   - Priority-weighted queue sorting: Emergency (weight 3), Senior/Disabled (weight 2), Normal (weight 1).
   - Doctor consultation actions: Call Next, Start Consultation, Complete, Skip, Recall, Mark No-Show, and Pause Queue (break).
   - Dynamic ETA calculation reflecting the doctor's actual rolling consultation duration.
   - "Your turn is near" visual banner and audio notification chime when $\le 3$ patients remain ahead.
4. **Clinical Records & Prescriptions Module:**
   - Real-time consultation dashboard recording vitals (BP, pulse, body temperature, weight, oxygen saturation).
   - Symptoms, clinical diagnosis, and dynamic prescription medication table (drug name, dosage, frequency, duration, dietary instructions).
   - Auto-generated A4 prescription PDF via `pdfkit` featuring medical headers, doctor credentials, and digital stamp.
   - Multipart medical record and lab report attachment upload with storage driver abstraction (`local` filesystem for development, AWS S3 for production).
5. **Billing & Invoicing Desk:**
   - Consultation fee invoicing with instant status tracking (`pending`, `paid`, `refunded`).
   - Multi-channel payment recording: Cash, Card, UPI.
   - Auto-generated tax invoice & receipt PDF.
   - Daily collection summary aggregation for cashier reconciliation.
6. **Executive Admin Analytics & CSV Reports:**
   - Real-time operational dashboard rendered with Recharts: monthly appointment throughput, queue latency trends, no-show rate, revenue breakdown by payment mode, and hourly consultation heatmaps (08:00–18:00).
   - Department caseload distribution and doctor productivity metrics.
   - Streaming CSV export utility for appointments and billing audits.
   - Staff activation toggles and immutable security audit logs capturing actor, action, IP, and timestamp.
7. **Public Waiting-Room Display Board (`/display/:hospitalId`):**
   - High-contrast, large-font TV board optimized for waiting lounge monitors.
   - Displays "Now Serving" token numbers and next-in-line tokens categorized by department and doctor room.
   - Zero login required; auto-synchronizes instantly via Socket.IO push broadcasts.

### 13.5 Tech Stack Details
| Component | Technology | Rationale & Purpose |
| :--- | :--- | :--- |
| **Programming Language** | TypeScript 5.5+ | Full-stack type safety across backend, frontend, scripts, and tests, eliminating runtime schema bugs. |
| **Backend Runtime** | Node.js + Express | Event-driven, asynchronous I/O ideal for concurrent API requests and real-time socket connections. |
| **Database & ODM** | MongoDB Atlas + Mongoose 8.5 | Cloud document database offering schema flexibility, high-performance compound indexing, and aggregation pipelines. |
| **Real-Time Communication** | Socket.IO 4.7 | Bidirectional websocket protocol with auto-reconnection and room-based pub/sub for instant queue updates. |
| **Frontend Framework** | React 18 + Vite | Virtual DOM, fast client-side routing, modular component hierarchy, and sub-second HMR. |
| **Styling & Icons** | Tailwind CSS + Lucide React | Utility-first responsive design system with a calm medical palette (teal/navy/sky), dark mode, and accessibility. |
| **Client State Management** | TanStack Query (React Query) | Server state caching, background refetching, query invalidation, and optimistic UI updates. |
| **Validation** | Zod 3.23 | Strict runtime data validation and static TypeScript inference for API request bodies and frontend forms. |
| **PDF Generation** | PDFKit | High-performance server-side PDF document generation for prescription slips and invoices. |
| **Testing Frameworks** | Vitest, Supertest, Playwright | Fast unit/integration tests and real headless browser end-to-end automation. |
| **Containerization** | Docker & Docker Compose | Multi-stage container builds ensuring identical runtime environments between dev and AWS cloud. |

### 13.6 Cloud Concepts Demonstrated
1. **Stateless Services:**
   - The Express backend retains zero session state in local memory. Authentication is stateless via signed JWT access tokens and database-backed refresh tokens. Any API instance can handle any incoming request.
2. **Horizontal Elasticity & Auto-Scaling:**
   - The containerized backend can be deployed across AWS ECS Fargate or EC2 Auto Scaling Groups behind an Application Load Balancer (ALB), scaling instances up or down dynamically based on CPU/memory utilization.
3. **High Availability (HA) & Fault Tolerance:**
   - MongoDB Atlas provides multi-AZ automated replica sets with automatic primary failover. Backend containers can run across multiple AWS Availability Zones with ALB health-checking (`/api/health`).
4. **Concurrency Control & Atomic Operations:**
   - Double-booking prevention uses atomic MongoDB operations (`findOneAndUpdate` with pre-condition checks) and compound unique partial indexes (`{ doctorId: 1, date: 1, startTime: 1 }`), handling race conditions during high-volume registration bursts.
5. **Pay-as-You-Go & Resource Efficiency:**
   - Leveraging managed cloud resources (MongoDB Atlas, AWS ECS Fargate, S3, CloudFront) ensures billing strictly reflects consumed compute and storage, eliminating idle hardware costs.
6. **Cloud Security & Zero-Trust Architecture:**
   - Secure secrets injection via environment variables / AWS SSM Parameter Store.
   - Network layer protection via VPC private subnets, security group ingress rules, CORS origin restrictions, Helmet security headers, rate limiting, and password hashing with bcrypt (12 rounds).
7. **Storage Abstraction & Disaster Recovery:**
   - Medical reports use an S3-compatible cloud storage driver with server-side AES-256 encryption. Automated daily database snapshots in MongoDB Atlas guarantee low RPO and RTO for disaster recovery.

### 13.7 Future Scope
- **SMS & WhatsApp Gateway Integration:** Integrate Twilio or AWS SNS for automated token call SMS and WhatsApp reminder alerts.
- **Predictive AI Queue Estimation:** Incorporate machine learning models trained on historical appointment duration, patient age, visit type, and clinician pacing for higher-precision wait time forecasting.
- **Teleconsultation & Video Calling:** Embed WebRTC video rooms for hybrid remote/in-person outpatient clinics.
- **Biometric & Facial Recognition Check-In:** Self-service kiosk check-in via face recognition or national health ID integration (e.g., Ayushman Bharat Digital Mission - ABDM in India).
- **Payment Gateway Integration:** Direct integration with Stripe, Razorpay, or Apple Pay for online advance consultation fee settlements.
