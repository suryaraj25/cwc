import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuthStore } from "./stores/useAuthStore";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { LandingPage } from "./pages/LandingPage";
import { StudentAuth } from "./components/auth/StudentAuth";
import { AdminLogin } from "./components/auth/AdminLogin";
import { StudentDashboard } from "./components/student/StudentDashboard";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { UserRole } from "./types";
import { Fingerprint, Shield } from "lucide-react";
import { AiOutlineLogout } from "react-icons/ai";

import { AuthLayout } from "./components/layout/AuthLayout";
import { DashboardLayout } from "./components/layout/DashboardLayout";

const App: React.FC = () => {
  const { checkSession } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route
          path="/login"
          element={
            <AuthLayout>
              <StudentAuth />
            </AuthLayout>
          }
        />

        <Route
          path="/admin-login"
          element={
            <AuthLayout>
              <AdminLogin />
            </AuthLayout>
          }
        />

        <Route element={<ProtectedRoute allowedRoles={[UserRole.STUDENT]} />}>
          <Route
            path="/dashboard"
            element={
              <DashboardLayout userRole={UserRole.STUDENT}>
                <StudentDashboard />
              </DashboardLayout>
            }
          />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]} />}>
          <Route
            path="/admin"
            element={
              <DashboardLayout userRole={UserRole.ADMIN}>
                <AdminDashboard />
              </DashboardLayout>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
