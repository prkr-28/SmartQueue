// Roles and Permissions
export type UserRole = 'super_admin' | 'hospital_admin' | 'doctor' | 'receptionist' | 'patient';

// Appointment Statuses
export type AppointmentStatus =
  | 'booked'
  | 'checked_in'
  | 'in_consultation'
  | 'completed'
  | 'cancelled'
  | 'no_show';

// Visit Types
export type VisitType = 'new' | 'follow_up' | 'emergency';

// Queue Statuses
export type QueueStatus =
  | 'waiting'
  | 'called'
  | 'in_consultation'
  | 'completed'
  | 'skipped'
  | 'no_show'
  | 'recalled';

// Priority Levels
export type PriorityLevel = 'emergency' | 'senior_disabled' | 'normal';

// Payment Statuses & Modes
export type PaymentStatus = 'pending' | 'paid' | 'refunded';
export type PaymentMode = 'cash' | 'card' | 'upi';

// Dependent Relationships
export type DependentRelationship = 'spouse' | 'child' | 'parent' | 'sibling' | 'other';

// Common Entity Interfaces
export interface UserDto {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  hospitalId?: string;
  isActive: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HospitalDto {
  _id: string;
  name: string;
  slug: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  phone: string;
  email: string;
  timezone: string;
  settings: {
    cancellationWindowHours: number;
    workingHoursStart: string;
    workingHoursEnd: string;
    defaultSlotDurationMinutes: number;
    gracePeriodMinutes: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentDto {
  _id: string;
  hospitalId: string;
  name: string;
  code: string;
  description?: string;
  rooms: Array<{
    name: string;
    number: string;
    isActive: boolean;
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorProfileDto {
  _id: string;
  userId: string | UserDto;
  hospitalId: string | HospitalDto;
  departmentId: string | DepartmentDto;
  specialization: string;
  qualifications: string[];
  experienceYears: number;
  consultationFee: number;
  avgConsultationMinutes: number;
  roomNumber: string;
  bio?: string;
  photoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyShiftDto {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  shifts: Array<{
    startTime: string; // "09:00"
    endTime: string;   // "13:00"
  }>;
  slotDurationMinutes: number;
}

export interface LeaveBlockDto {
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface ScheduleDto {
  _id: string;
  doctorProfileId: string;
  hospitalId: string;
  weeklyHours: WeeklyShiftDto[];
  leaveBlocks: LeaveBlockDto[];
  createdAt: string;
  updatedAt: string;
}

export interface DependentDto {
  _id: string;
  patientId: string;
  name: string;
  relationship: DependentRelationship;
  dateOfBirth?: string;
  gender: 'male' | 'female' | 'other';
  phone?: string;
  bloodGroup?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentDto {
  _id: string;
  appointmentNumber: string;
  hospitalId: string | HospitalDto;
  departmentId: string | DepartmentDto;
  doctorId: string | DoctorProfileDto;
  patientId: string | UserDto;
  dependentId?: string | DependentDto;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  slotTime: string; // ISO string
  status: AppointmentStatus;
  visitType: VisitType;
  symptoms?: string;
  notes?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  paymentStatus: PaymentStatus;
  consultationFee: number;
  isWalkIn?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QueueEntryDto {
  _id: string;
  hospitalId: string;
  departmentId: string;
  doctorId: string;
  appointmentId: string | AppointmentDto;
  patientId: string | UserDto;
  tokenNumber: string;
  date: string;
  sequenceNumber: number;
  priority: PriorityLevel;
  status: QueueStatus;
  checkInTime: string;
  calledTime?: string;
  startTime?: string;
  endTime?: string;
  estimatedWaitMinutes: number;
  peopleAhead?: number;
  roomNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDto {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'appointment' | 'queue' | 'system' | 'reminder';
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogDto {
  _id: string;
  actorId?: string | UserDto;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

// Section 2 Models (Defined now for model completeness)
export interface VitalsDto {
  bloodPressure?: string;
  pulse?: number;
  temperature?: number;
  weight?: number;
  oxygenLevel?: number;
}

export interface PrescriptionItemDto {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface ConsultationDto {
  _id: string;
  appointmentId: string;
  doctorId: string;
  patientId: string;
  vitals?: VitalsDto;
  symptoms: string[];
  diagnosis: string;
  notes?: string;
  prescriptionItems: PrescriptionItemDto[];
  followUpDate?: string;
  labTests?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceDto {
  _id: string;
  invoiceNumber: string;
  appointmentId: string;
  patientId: string;
  hospitalId: string;
  doctorId: string;
  consultationFee: number;
  taxAmount: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentMode: PaymentMode;
  paymentDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalRecordDto {
  _id: string;
  patientId: string;
  title: string;
  recordType: 'prescription' | 'lab_report' | 'scan' | 'summary' | 'other';
  fileUrl: string;
  fileKey: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy: string;
  consultationId?: string;
  appointmentId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// API Standard Responses
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Array<{ field?: string; message: string }>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Slot Engine Types
export interface AvailableSlot {
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  slotTime: string;  // ISO UTC
  isAvailable: boolean;
}

export interface DaySlotsResponse {
  date: string;
  doctorId: string;
  slotDurationMinutes: number;
  slots: AvailableSlot[];
}

// Real-Time Socket.IO Types
export interface SocketQueueUpdatePayload {
  doctorId: string;
  hospitalId: string;
  date: string;
  activeEntries: QueueEntryDto[];
  nowServing?: QueueEntryDto | null;
}

export interface SocketDisplayPayload {
  hospitalId: string;
  departments: Array<{
    departmentName: string;
    doctors: Array<{
      doctorId: string;
      doctorName: string;
      specialization: string;
      roomNumber: string;
      status: 'active' | 'break' | 'offline';
      nowServingToken?: string;
      nextTokens: string[];
    }>;
  }>;
}

export interface SocketTurnNearPayload {
  patientId: string;
  appointmentId: string;
  tokenNumber: string;
  doctorName: string;
  roomNumber: string;
  peopleAhead: number;
  estimatedWaitMinutes: number;
}
