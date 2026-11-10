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
              <Route element={<ProtectedRoute />}>
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
