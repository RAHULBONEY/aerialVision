import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@/pages/Login";

import AdminLayout from "@/components/layout/AdminLayout";
import Overview from "@/pages/admin/OverView";
import Operators from "@/pages/admin/Operators";
// import Roles from "@/pages/admin/Roles";
import Streams from "@/pages/admin/Streams";
// import ModelConfig from "@/pages/admin/ModelConfig";
// import AuditLogs from "@/pages/admin/AuditLogs";
// import LoginHistory from "@/pages/admin/LoginHistory";
// import Metrics from "@/pages/admin/Metrics";

import RequireAuth from "@/components/common/RequireAuth";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />

      {/* ADMIN ROUTES */}
      <Route
        path="/admin"
        element={
          <RequireAuth role="ADMIN">
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Overview />} />
        <Route path="operators" element={<Operators />} />
        {/* <Route path="roles" element={<Roles />} />
        
        <Route path="model" element={<ModelConfig />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="login-history" element={<LoginHistory />} /> */}
        {/* <Route path="metrics" element={<Metrics />} /> */}
        <Route path="streams" element={<Streams />} />
      </Route>

      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}