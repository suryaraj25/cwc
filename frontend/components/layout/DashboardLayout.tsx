import React from "react";
import { UserRole } from "../../types";
import { useAuthStore } from "../../stores/useAuthStore";
import { Fingerprint, Shield } from "lucide-react";
import { AiOutlineLogout } from "react-icons/ai";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole: UserRole;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  userRole,
}) => {
  const { logout, adminId } = useAuthStore();

  if (userRole === UserRole.STUDENT) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
        <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-40 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Fingerprint className="text-indigo-500" />
              <h1 className="text-xl font-bold tracking-tight">
                CWC 3.0 <span className="text-indigo-500">VOTING</span>
              </h1>
            </div>
            <button
              onClick={logout}
              className="text-sm font-semibold text-slate-400 hover:text-red-400 transition-colors"
            >
              <AiOutlineLogout color="red" size={24} />
            </button>
          </div>
        </header>
        <main className="max-w-7xl mx-auto p-4 md:p-8">{children}</main>
      </div>
    );
  }

  if (userRole === UserRole.ADMIN) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
        <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 sticky top-0 z-40 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Shield className="text-indigo-500 fill-indigo-500/20" />
              <h1 className="text-xl font-bold tracking-tight text-white">
                CWC 3.0 <span className="text-indigo-400">COMMAND CENTER</span>
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden md:block text-sm text-slate-400 font-mono">
                ADMIN: <span className="text-white">{adminId}</span>
              </span>
              <button
                onClick={logout}
                className="text-sm font-semibold text-slate-400 hover:text-red-400 transition-colors"
              >
                <AiOutlineLogout color="red" size={24} />
              </button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto p-4 md:p-8">{children}</main>
      </div>
    );
  }

  return <>{children}</>;
};
