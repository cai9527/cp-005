import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import Monitor from "@/pages/Monitor";
import Cranes from "@/pages/Cranes";
import CraneDetail from "@/pages/CraneDetail";
import History from "@/pages/History";
import Alerts from "@/pages/Alerts";
import Analysis from "@/pages/Analysis";
import Login from "@/pages/Login";
import { useAuthStore } from "@/stores/authStore";

function ProtectedLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Layout />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedLayout />}>
          <Route index element={<Monitor />} />
          <Route path="cranes" element={<Cranes />} />
          <Route path="cranes/:id" element={<CraneDetail />} />
          <Route path="history" element={<History />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="analysis" element={<Analysis />} />
        </Route>
      </Routes>
    </Router>
  );
}
