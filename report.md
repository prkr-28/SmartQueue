# SmartQueue
## Cloud-Based Patient Appointment and Queue Management System

## 1. Executive Summary

SmartQueue is a cloud-ready, full-stack healthcare workflow system for hospitals and outpatient clinics. It combines appointment scheduling, doctor availability, patient and dependent management, receptionist walk-in registration, live queue tracking, waiting-room display boards, consultation records, prescriptions, billing, notifications, analytics, and audit logging in one platform.

The project is implemented as a TypeScript monorepo with a React client, an Express/Socket.IO server, and a shared contract package. MongoDB is used for persistence, while the architecture supports Redis for multi-instance real-time event distribution and Amazon S3 for medical-record storage. The application is containerized with Docker and includes an AWS deployment design for CloudFront, S3, Application Load Balancer, ECS Fargate, ElastiCache, MongoDB Atlas, SES, CloudWatch, and SSM Parameter Store.

## 2. Problem Statement

Many clinics still manage appointments and waiting queues through disconnected telephone, paper, or spreadsheet workflows. These approaches create several operational problems:

- Patients cannot reliably discover available doctors or appointment slots.
- Receptionists spend time coordinating walk-ins, check-ins, cancellations, and queue order manually.
- Patients have limited visibility into their position and expected waiting time.
- Doctors, receptionists, and administrators need different permissions and dashboards.
- Concurrent booking requests can create double-booked time slots if concurrency is not handled at the database layer.
- Waiting-room information is difficult to keep synchronized across staff consoles and public displays.
- Clinical documents, prescriptions, invoices, notifications, and audit events become fragmented across systems.

SmartQueue addresses these problems through a role-based web application, database-enforced booking integrity, real-time Socket.IO updates, scheduled background processing, and cloud-ready deployment components.

## 3. Objectives

The objectives of the project are:

1. Provide secure registration, login, password recovery, access-token refresh, and role-based authorization.
2. Allow patients to find doctors, view schedules, book appointments, manage dependents, and cancel or reschedule appointments.
3. Generate available slots from doctor shifts, leave blocks, appointment duration, and existing bookings.
4. Prevent double booking during concurrent requests using a MongoDB compound unique index.
5. Provide check-in, token generation, priority ordering, queue progression, and estimated waiting time.
6. Broadcast queue changes to doctor dashboards, receptionist consoles, patient trackers, and public displays in real time.
7. Support consultation records, prescription PDFs, medical-record uploads, invoices, receipt PDFs, and reports.
8. Provide administrators with analytics, staff management, department management, settings, and audit logs.
9. Demonstrate cloud computing principles including stateless services, containerization, horizontal scaling, managed storage, observability, and secure configuration.
10. Supply complete source code, configuration templates, tests, Docker files, and execution instructions.

## 4. Scope and User Roles

### 4.1 User roles

The shared package defines the following roles:

- `super_admin`
- `hospital_admin`
- `doctor`
- `receptionist`
- `patient`

Backend route guards and frontend protected routes restrict functionality by role.

### 4.2 Main capabilities

| Area | Implemented capabilities |
|---|---|
| Authentication | Registration, login, logout, JWT access/refresh tokens, refresh rotation, password reset, password change, account lockout |
| Hospital administration | Hospitals, departments, staff, doctor profiles, schedules, leave blocks, settings |
| Patient portal | Doctor discovery, slot search, appointment booking, appointment history, dependents, notifications, profile, medical history |
| Queue operations | Check-in, token generation, priority ordering, call-next, status changes, queue history, ETA, public display |
| Clinical workflow | Vitals, diagnosis, notes, prescriptions, follow-up dates, prescription PDF, medical-record uploads |
| Billing | Invoice creation, payment recording for cash/card/UPI, daily summaries, invoice/receipt PDF |
| Reporting | Analytics dashboard and CSV exports for appointment and revenue data |
| Governance | Audit log with actor, target, action, IP address, user-agent, and metadata |

## 5. System Architecture

### 5.1 Logical architecture

```text
Patients, staff, and public display browsers
                    |
          React 18 + Vite client
          REST API + Socket.IO client
                    |
        Express + Socket.IO backend
        Authentication, RBAC, services,
        validation, cron, PDF generation
                    |
              MongoDB Atlas
     Users, hospitals, schedules, appointments,
     queue entries, consultations, records, invoices,
     notifications, and audit logs

Optional horizontal-scale services:
       Redis Socket.IO adapter
       Amazon S3 medical-record storage
```

### 5.2 Repository structure

```text
SmartQueue/
├── client/                 React/Vite frontend
├── server/                 Express/Socket.IO backend
├── shared/                 Shared TypeScript types and events
├── e2e/                    Playwright browser journeys
├── scripts/                Browser verification and E2E orchestration
├── screenshots/            Desktop and mobile verification captures
├── docs/                   Architecture and AWS deployment guides
├── docker-compose.yml      Local container orchestration
├── package.json            npm workspace scripts
└── report.md               This report
```

### 5.3 Request and event flow

1. A browser sends a REST request through the Axios client.
2. The API applies request IDs, security headers, CORS rules, rate limiting, authentication, validation, and role checks as applicable.
3. Controllers delegate business operations to services.
4. Services read or update MongoDB models and create notifications/audit events.
5. Queue and appointment operations emit Socket.IO events to doctor, hospital, or patient rooms.
6. The React application updates the relevant dashboard without requiring a full page refresh.

## 6. Cloud Services and Infrastructure

### 6.1 Services used by the implementation

| Service or technology | Role in SmartQueue |
|---|---|
| MongoDB Atlas | Cloud database for application persistence; configured through `MONGODB_URI` |
| Amazon S3 SDK | Optional storage driver for medical records and uploaded files |
| Redis / ElastiCache-compatible Redis | Optional Socket.IO Redis adapter for multi-node event propagation |
| SMTP/SES-compatible mail service | Appointment confirmations, reminders, cancellation notices, and password reset messages |
| Docker | Reproducible server and client container images |

### 6.2 AWS production target

The documented production topology uses:

- **Amazon Route 53** for DNS.
- **Amazon CloudFront** for edge delivery and routing.
- **Amazon S3** for the built React SPA and, optionally, encrypted medical-record objects.
- **Application Load Balancer** for HTTPS termination, health checks, and routing to backend containers.
- **Amazon ECS Fargate** or an EC2 Auto Scaling deployment for stateless Node.js containers.
- **Amazon ElastiCache for Redis** for Socket.IO pub/sub across backend replicas.
- **MongoDB Atlas** for a managed, highly available database.
- **Amazon SES or an SMTP provider** for email delivery.
- **Amazon CloudWatch** for centralized logs and operational alarms.
- **AWS Systems Manager Parameter Store or Secrets Manager** for encrypted configuration.

The repository is deployment-ready for this topology; the included Docker Compose file is the local/self-hosted execution path and does not provision AWS resources automatically.

## 7. Implementation Details

### 7.1 Frontend

The client is a React 18 single-page application built with Vite and Tailwind CSS. React Router provides public, authenticated, and role-specific pages. Reusable UI components, authentication context, theme context, Axios interceptors, and Socket.IO client helpers support consistent behavior.

Important user interfaces include:

- Landing, login, registration, forgot-password, and reset-password pages.
- Patient dashboard, doctor search, five-step booking flow, appointments, dependents, profile, notifications, medical history, and live queue tracker.
- Doctor dashboard, queue, schedule, and consultation pages.
- Receptionist dashboard, walk-in booking, queue management, QR scanning, appointments, and billing desk.
- Admin analytics, departments, staff, patients, audit logs, and system settings.
- Public high-contrast display at `/display/:hospitalId`.

The Axios service stores the short-lived access token in browser storage, sends it as a bearer token, and attempts refresh through the refresh endpoint when an authenticated request expires. The Socket.IO client joins doctor, hospital, and patient rooms for targeted updates.

### 7.2 Backend

The server is an Express application attached to an HTTP server that also hosts Socket.IO. The server startup sequence connects to MongoDB, creates the Express app, initializes Socket.IO, starts background jobs outside test mode, and begins listening on the configured port.

The backend is organized into:

- `config`: environment parsing, database connection, and logging.
- `routes`: REST endpoint grouping.
- `controllers`: HTTP request/response handling.
- `services`: appointment, queue, slot, authentication, notification, storage, PDF, email, and audit business logic.
- `models`: Mongoose schemas and indexes.
- `middlewares`: authentication, RBAC, validation, request IDs, rate limiting, and error handling.
- `cron`: no-show and reminder jobs.
- `tests`: Vitest and Supertest integration tests.

All API routes are mounted below `/api`, including `/auth`, `/hospitals`, `/doctors`, `/appointments`, `/queue`, `/dependents`, `/notifications`, `/consultations`, `/medical-records`, `/invoices`, `/analytics`, `/reports`, `/admin`, and `/health`.

### 7.3 Appointment and slot engine

The slot service reads the doctor schedule, determines the requested day, checks leave blocks, generates slots using the configured duration, and marks slots unavailable when an active appointment already uses the start time or when the time has passed today.

Appointment creation:

1. Verifies the doctor, hospital, patient, and optional dependent.
2. Computes the end time and UTC slot timestamp.
3. Creates an appointment with a generated appointment number.
4. Sends a notification and confirmation email.
5. Writes an audit event.
6. Converts a MongoDB duplicate-key error into a `409 Conflict` response when another request has taken the slot.

The `Appointment` model uses a unique compound index on doctor, date, and start time, restricted to active appointment statuses. Cancelled and no-show appointments therefore do not permanently block a slot.

### 7.4 Live queue engine

Queue entries contain the hospital, department, doctor, appointment, patient, token, sequence, priority, status, timestamps, estimated wait, room, and queue history. The queue service supports check-in, token assignment, priority-based ordering, next-patient calls, status transitions, reassignment, and patient status calculation.

Socket.IO rooms are used as follows:

- `doctor:<doctorId>` for doctor queue updates.
- `hospital:<hospitalId>` for public display updates and hospital alerts.
- `patient:<patientId>` for personal queue and appointment notifications.

The server emits queue updates, display updates, appointment updates, and “turn near” events. The patient interface can therefore show the current token, people ahead, estimated wait, and an audio/visual warning when the turn is close.

### 7.5 Authentication and security

The implementation includes:

- JWT access tokens with configurable expiry.
- Refresh tokens in an HTTP-only cookie and refresh-token rotation.
- Bcrypt password hashing.
- Five failed login attempts trigger a fifteen-minute account lockout.
- JWT authentication middleware and role-based route guards.
- Zod-based request validation.
- Helmet security headers.
- CORS allowlisting with credentials.
- Express rate limiting for API traffic and sensitive operations.
- Request ID propagation through `X-Request-Id`.
- Pino structured logging.
- Centralized error handling.
- Ownership checks for patient dependents and patient-owned appointments.
- Audit events for important authentication and appointment actions.

Production deployment should use strong secrets, TLS, private subnets where applicable, managed secret storage, encrypted S3 buckets, least-privilege IAM, and restricted MongoDB network access.

### 7.6 Background processing, documents, and billing

The cron module runs:

- Every ten minutes: marks overdue booked appointments as no-shows after the configured 30-minute grace period and updates waiting queue entries.
- Every hour: sends approximately 24-hour and 1-hour appointment reminders.

The storage abstraction exposes upload, delete, and read-stream operations. Local storage writes to `server/uploads`; the S3 driver uses the AWS SDK when the required bucket and credentials are configured. The consultation service generates prescription PDFs with PDFKit, while the invoice service generates invoice/receipt PDFs. Multer handles in-memory medical-record uploads before they are passed to the configured storage driver.

## 8. Data Model

The principal MongoDB collections are:

| Model | Purpose |
|---|---|
| `User` | Identity, role, password state, lockout, and hospital association |
| `Hospital` | Facility settings, timezone, cancellation window, and operating hours |
| `Department` | Clinical department and room/counter configuration |
| `DoctorProfile` | Specialization, qualifications, fee, duration, room, and department |
| `Schedule` | Weekly shifts and leave blocks |
| `Appointment` | Patient booking, status lifecycle, slot, visit, and payment state |
| `QueueEntry` | Daily token, queue status, priority, ETA, and history |
| `Dependent` | Family members managed by a patient |
| `Consultation` | Vitals, symptoms, diagnosis, notes, prescriptions, and follow-up |
| `MedicalRecord` | Uploaded reports, prescriptions, scans, and metadata |
| `Invoice` | Fee, tax, payment status, payment mode, and timestamps |
| `Notification` | Appointment, queue, reminder, and system notifications |
| `AuditLog` | Actor, action, target, IP address, user-agent, and metadata |

## 9. Results and Verification

The repository includes backend integration tests and Playwright journeys. The test coverage demonstrates:

- Health endpoint and database connectivity.
- Patient registration and login.
- Cookie issuance and token behavior.
- Account lockout after repeated failed logins.
- Slot generation and availability.
- Concurrent booking protection with one success and one conflict.
- Appointment cancellation and invalid repeat cancellation.
- Queue priority ordering.
- Role-based access restrictions for admin analytics, billing, and consultation actions.
- Doctor consultation creation and appointment completion.
- Prescription PDF generation.
- Billing summary and payment workflows.

The `screenshots/` directory contains desktop and mobile captures for the landing page, display board, authentication, patient, receptionist, doctor, and administrator workflows. These captures provide visual evidence of the implemented interfaces and responsive behavior.

Expected project verification commands are:

```bash
npm run build
npm run lint
npm run test
npm run test:e2e
```

The E2E suite requires the application and its configured database to be available. The integration tests also require seeded or otherwise prepared MongoDB data, as described below.

## 10. Execution Instructions

### 10.1 Prerequisites

- Node.js 18 or newer.
- npm 9 or newer.
- MongoDB Atlas or another reachable MongoDB instance.
- Docker and Docker Compose for containerized execution.
- A configured SMTP provider if real email delivery is required.
- AWS credentials and an S3 bucket only when using the S3 storage driver.

### 10.2 Local development

1. Clone the repository and open a terminal at its root.
2. Create the server environment file:

   ```powershell
   Copy-Item server\.env.example server\.env
   ```

3. Create the client environment file:

   ```powershell
   Copy-Item client\.env.example client\.env
   ```

4. Set at least `MONGODB_URI` in `server\.env`. For a normal local setup, use:

   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<database>
   MONGODB_DB_NAME=smartqueue
   JWT_ACCESS_SECRET=<strong-secret>
   JWT_REFRESH_SECRET=<strong-secret>
   CLIENT_URL=http://localhost:5173
   STORAGE_DRIVER=local
   ```

5. Set the client API and Socket.IO URLs in `client\.env`:

   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   ```

6. Install dependencies, compile packages, seed demo data, and start development servers:

   ```powershell
   npm install
   npm run build
   npm run seed
   npm run dev
   ```

7. Open `http://localhost:5173`. The backend health endpoint is `http://localhost:5000/api/health`.

The seed script creates representative hospitals, departments, doctors, staff, patients, appointments, and queue data. Demo credentials and the exact seeded account names are documented in `README.md`; credentials should be changed or removed before production use.

### 10.3 Docker Compose

The included Compose file starts:

- API server on port `5000`.
- Nginx-served client on port `8080`.
- Optional Redis on port `6379`.

Configure `server\.env` first, then run:

```powershell
docker compose up --build
```

The application is available at `http://localhost:8080`, and the API health check is available at `http://localhost:5000/api/health`.

### 10.4 Production configuration

For AWS deployment, follow `docs/AWS_DEPLOYMENT.md`. Store secrets in SSM Parameter Store or Secrets Manager rather than committing `.env` files. Build and push the server image using `server/Dockerfile`, build and serve the frontend using `client/Dockerfile`, place the API behind an ALB, configure `/api/health` as the health check, and use Redis when more than one backend instance is deployed.

## 11. Source Code and Configuration Deliverables

The complete implementation is included in this repository:

- Frontend source: `client/src`.
- Backend source: `server/src`.
- Shared types: `shared/src`.
- Backend and frontend package manifests: `server/package.json` and `client/package.json`.
- Workspace scripts: `package.json`.
- TypeScript configuration: `tsconfig.base.json` and package-level `tsconfig.json` files.
- Docker configuration: `docker-compose.yml`, `server/Dockerfile`, and `client/Dockerfile`.
- Environment templates: `server/.env.example` and `client/.env.example`.
- Automated tests: `server/src/tests` and `e2e`.
- Architecture and deployment references: `docs/ARCHITECTURE.md` and `docs/AWS_DEPLOYMENT.md`.
- Browser verification screenshots: `screenshots`.

No credentials, production secrets, or private keys should be committed to the repository.

## 12. Limitations and Future Enhancements

The current project is cloud-ready, but the AWS topology is a deployment design rather than an infrastructure-as-code provisioning package. The following enhancements would strengthen a production rollout:

1. Add Terraform or AWS CDK modules for repeatable infrastructure provisioning.
2. Replace long-lived access-key configuration with IAM task roles for ECS and S3.
3. Add a dedicated job queue for retries and durable reminder delivery.
4. Add automated database migrations, backup-restore drills, and disaster-recovery runbooks.
5. Add stronger automated performance tests for peak outpatient traffic.
6. Add centralized metrics and tracing in addition to structured logs.
7. Configure a production WAF, stricter CSP, secret rotation, and formal vulnerability scanning.
8. Add broader accessibility testing and localization/time-zone test coverage.
9. Use a shared Redis adapter and carefully validated sticky-session/WebSocket routing for multi-replica deployments.

## 13. Conclusion

SmartQueue demonstrates how a healthcare appointment and queue workflow can be implemented as a secure, modular, and cloud-oriented system. The application combines a responsive React interface, a typed Express API, MongoDB persistence, Socket.IO real-time updates, scheduled automation, document generation, billing, and role-based dashboards. Its database constraint protects appointment integrity under concurrency, while its stateless backend, Docker packaging, optional Redis adapter, and S3 abstraction provide a practical path to horizontal scaling.

The completed source code, configuration templates, automated tests, screenshots, architecture documentation, and AWS deployment guide provide the materials needed to execute, evaluate, and extend the project.
