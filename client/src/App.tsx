import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { DisplayScreenPage } from './pages/DisplayScreenPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Patient Portal Pages
import { DashboardPage } from './pages/patient/DashboardPage';
import { FindDoctorsPage } from './pages/patient/FindDoctorsPage';
import { BookAppointmentPage } from './pages/patient/BookAppointmentPage';
import { MyAppointmentsPage } from './pages/patient/MyAppointmentsPage';
import { LiveQueueTrackerPage } from './pages/patient/LiveQueueTrackerPage';
import { MedicalHistoryPage } from './pages/patient/MedicalHistoryPage';
import { DependentsPage } from './pages/patient/DependentsPage';
import { NotificationsPage } from './pages/patient/NotificationsPage';
import { ProfilePage } from './pages/patient/ProfilePage';

// Receptionist Portal Pages
import { ReceptionistDashboardPage } from './pages/receptionist/ReceptionistDashboardPage';
import { WalkInBookingPage } from './pages/receptionist/WalkInBookingPage';
import { ReceptionistAppointmentsPage } from './pages/receptionist/ReceptionistAppointmentsPage';
import { QueueManagerPage } from './pages/receptionist/QueueManagerPage';
import { BillingDeskPage } from './pages/receptionist/BillingDeskPage';
import { QrScannerPage } from './pages/receptionist/QrScannerPage';

// Doctor Portal Pages
import { DoctorDashboardPage } from './pages/doctor/DoctorDashboardPage';
import { DoctorQueuePage } from './pages/doctor/DoctorQueuePage';
import { DoctorConsultationPage } from './pages/doctor/DoctorConsultationPage';
import { DoctorSchedulePage } from './pages/doctor/DoctorSchedulePage';

// Admin Portal Pages
import { AnalyticsDashboardPage } from './pages/admin/AnalyticsDashboardPage';
import { DepartmentsPage } from './pages/admin/DepartmentsPage';
import { StaffManagementPage } from './pages/admin/StaffManagementPage';
import { PatientsListPage } from './pages/admin/PatientsListPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { SystemSettingsPage } from './pages/admin/SystemSettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#0f172a',
                  color: '#fff',
                  fontSize: '13px',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                },
              }}
            />
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Public Hospital Waiting Room Display */}
              <Route path="/display" element={<DisplayScreenPage />} />
              <Route path="/display/:hospitalId" element={<DisplayScreenPage />} />

              {/* Protected Patient Portal */}
              <Route element={<ProtectedRoute allowedRoles={['patient', 'super_admin']} />}>
                <Route path="/patient" element={<AppLayout />}>
                  <Route index element={<Navigate to="/patient/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="doctors" element={<FindDoctorsPage />} />
                  <Route path="book" element={<BookAppointmentPage />} />
                  <Route path="appointments" element={<MyAppointmentsPage />} />
                  <Route path="queue" element={<LiveQueueTrackerPage />} />
                  <Route path="records" element={<MedicalHistoryPage />} />
                  <Route path="dependents" element={<DependentsPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>
              </Route>

              {/* Protected Receptionist Portal */}
              <Route element={<ProtectedRoute allowedRoles={['receptionist', 'hospital_admin', 'super_admin']} />}>
                <Route path="/receptionist" element={<AppLayout />}>
                  <Route index element={<Navigate to="/receptionist/dashboard" replace />} />
                  <Route path="dashboard" element={<ReceptionistDashboardPage />} />
                  <Route path="walk-in" element={<WalkInBookingPage />} />
                  <Route path="appointments" element={<ReceptionistAppointmentsPage />} />
                  <Route path="queue" element={<QueueManagerPage />} />
                  <Route path="billing" element={<BillingDeskPage />} />
                  <Route path="scan" element={<QrScannerPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>
              </Route>

              {/* Protected Doctor Portal */}
              <Route element={<ProtectedRoute allowedRoles={['doctor', 'super_admin']} />}>
                <Route path="/doctor" element={<AppLayout />}>
                  <Route index element={<Navigate to="/doctor/dashboard" replace />} />
                  <Route path="dashboard" element={<DoctorDashboardPage />} />
                  <Route path="queue" element={<DoctorQueuePage />} />
                  <Route path="consultation/:appointmentId" element={<DoctorConsultationPage />} />
                  <Route path="schedule" element={<DoctorSchedulePage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>
              </Route>

              {/* Protected Admin Portal */}
              <Route element={<ProtectedRoute allowedRoles={['hospital_admin', 'super_admin']} />}>
                <Route path="/admin" element={<AppLayout />}>
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<AnalyticsDashboardPage />} />
                  <Route path="departments" element={<DepartmentsPage />} />
                  <Route path="staff" element={<StaffManagementPage />} />
                  <Route path="patients" element={<PatientsListPage />} />
                  <Route path="audit-logs" element={<AuditLogsPage />} />
                  <Route path="settings" element={<SystemSettingsPage />} />
                  <Route path="notifications" element={<NotificationsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>
              </Route>

              {/* Unauthorized Fallback */}
              <Route
                path="/unauthorized"
                element={
                  <div className="min-h-screen flex items-center justify-center bg-navy-50 dark:bg-navy-950 p-4">
                    <div className="max-w-md text-center bg-white dark:bg-navy-900 p-8 rounded-2xl shadow-card border border-navy-200 dark:border-navy-800">
                      <h2 className="text-xl font-bold text-navy-900 dark:text-white">Access Denied</h2>
                      <p className="text-xs text-navy-500 mt-2">
                        You do not have the required role permissions to access this clinical dashboard.
                      </p>
                      <button
                        onClick={() => window.history.back()}
                        className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold"
                      >
                        Go Back
                      </button>
                    </div>
                  </div>
                }
              />

              {/* 404 Fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
