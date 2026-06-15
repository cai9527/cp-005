import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import Monitor from "@/pages/Monitor";
import Cranes from "@/pages/Cranes";
import CraneDetail from "@/pages/CraneDetail";
import History from "@/pages/History";
import Alerts from "@/pages/Alerts";
import Analysis from "@/pages/Analysis";
import Users from "@/pages/Users";
import Profile from "@/pages/Profile";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import DeviceStatus from "@/pages/DeviceStatus";
import RotationSimulator from "@/pages/RotationSimulator";
import CollisionMonitor from "@/pages/CollisionMonitor";
import Drivers from "@/pages/Drivers";
import { useAuthStore, type UserRole } from "@/stores/authStore";

interface RouteConfig {
  path: string
  element: React.ReactNode
  roles: UserRole[]
}

const routes: RouteConfig[] = [
  { path: "", element: <Monitor />, roles: ["admin", "user"] },
  { path: "collision-monitor", element: <CollisionMonitor />, roles: ["admin", "user"] },
  { path: "device-status", element: <DeviceStatus />, roles: ["admin", "user"] },
  { path: "rotation-simulator", element: <RotationSimulator />, roles: ["admin"] },
  { path: "cranes", element: <Cranes />, roles: ["admin"] },
  { path: "cranes/:id", element: <CraneDetail />, roles: ["admin"] },
  { path: "history", element: <History />, roles: ["admin", "user"] },
  { path: "alerts", element: <Alerts />, roles: ["admin", "user"] },
  { path: "analysis", element: <Analysis />, roles: ["admin"] },
  { path: "users", element: <Users />, roles: ["admin"] },
  { path: "drivers", element: <Drivers />, roles: ["admin"] },
  { path: "profile", element: <Profile />, roles: ["admin", "user"] },
]

function ProtectedLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Layout />;
}

function RoleRoute({ config }: { config: RouteConfig }) {
  const userRole = useAuthStore((s) => s.user?.role || "user");
  if (!config.roles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }
  return <>{config.element}</>;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<ProtectedLayout />}>
          {routes.map((config) => (
            <Route
              key={config.path}
              path={config.path}
              element={<RoleRoute config={config} />}
            />
          ))}
        </Route>
      </Routes>
    </Router>
  );
}
