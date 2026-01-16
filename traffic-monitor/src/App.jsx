import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Components
import LoginPage from '@/pages/Login';
import DashboardPage from '@/pages/Dashboard';
import AppShell from '@/components/layout/AppShell';
import AdminDashboard from '@/pages/AdminDashboard';
import HospitalDashboard from '@/pages/HospitalDashboard';
import PoliceDashboard from '@/pages/PoliceDashboard'; // Add this import

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* PUBLIC ROUTE: Login */}
            <Route path="/" element={<LoginPage />} />

            {/* PROTECTED ROUTES (Wrapped in AppShell) */}

            {/* General Dashboard - All authenticated users */}
            <Route element={<AppShell allowedRoles={['ADMIN', 'admin', 'TRAFFIC_POLICE', 'EMERGENCY']} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>

            {/* Admin Only */}
            <Route element={<AppShell allowedRoles={['ADMIN', 'admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            {/* Police Dashboard */}
            <Route element={<AppShell allowedRoles={['TRAFFIC_POLICE', 'ADMIN', 'admin']} />}>
              <Route path="/police" element={<PoliceDashboard />} />
              <Route path="/incidents" element={<PoliceDashboard />} /> {/* Alias for incidents */}
            </Route>

            {/* Hospital Dashboard */}
            <Route element={<AppShell allowedRoles={['EMERGENCY', 'ADMIN', 'admin']} />}>
              <Route path="/hospital" element={<HospitalDashboard />} />
            </Route>

            {/* Catch-all redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}
