import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@/pages/Login";
import AdminLayout from "@/components/layout/AdminLayout";
import Overview from "@/pages/admin/OverView";
import Operators from "@/pages/admin/Operators";
import Roles from "@/pages/admin/Roles";
import Streams from "@/pages/admin/Streams";
import ModelConfig from "@/pages/admin/ModelConfig";
import AuditLogs from "@/pages/admin/AuditLogs";
import LoginHistory from "@/pages/admin/LoginHistory";
import Metrics from "@/pages/admin/Metrics";
import VideoAnalysis from "@/pages/admin/VideoAnalysis";
import PoliceLayout from "@/components/layout/PoliceLayout";
import TrafficDashboard from "@/pages/police/TrafficDashboard";
import RequireAuth from "@/components/common/RequireAuth";
import LiveFeeds from "./pages/police/LiveFeeds";
import Incidents from "./pages/police/Incidents";
import EmergencyComms from "./pages/police/EmergencyComms";
import PatrolUnits from "./pages/police/PatrolUnits";

// Emergency Operator imports
import EmergencyLayout from "@/components/layout/EmergencyLayout";
import EmergencyDashboard from "@/pages/emergency/Dashboard";
import EmergencyStreams from "@/pages/emergency/Streams";
import EmergencyIncidents from "@/pages/emergency/Incidents";
import RouteSelector from "@/components/emergency/RouteSelector";

const ComingSoon = ({ title }) => (
  <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
    <h2 className="text-2xl font-bold dark:text-white text-blacks mb-2">{title}</h2>
    <p>Module under construction</p>
  </div>
);
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
        <Route path="model" element={<ModelConfig />} />
        <Route path="roles" element={<Roles />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="login-history" element={<LoginHistory />} />
        <Route path="metrics" element={<Metrics />} />
        <Route path="streams" element={<Streams />} />
        <Route path="analyze" element={<VideoAnalysis />} />
      </Route>

      {/* Traffic Operator ROUTES */}
      <Route
        path="/police"
        element={
          <RequireAuth role="TRAFFIC_POLICE">
            <PoliceLayout />
          </RequireAuth>
        }
      >
        <Route index element={<TrafficDashboard />} />
        <Route path="streams" element={<LiveFeeds />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="comms" element={<EmergencyComms />} />
        <Route path="units" element={<PatrolUnits />} />
      </Route>

      {/* EMERGENCY OPERATOR ROUTES */}
      <Route
        path="/emergency"
        element={
          <RequireAuth role="EMERGENCY">
            <EmergencyLayout />
          </RequireAuth>
        }
      >
        <Route index element={<EmergencyDashboard />} />
        <Route path="routing" element={<RouteSelector />} />
        <Route path="streams" element={<EmergencyStreams />} />
        <Route path="incidents" element={<EmergencyIncidents />} />
      </Route>

      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
