import React, { useState, useEffect } from 'react';
import { api, getThisDeviceId } from './services/api';
import { User, AuthState, UserRole } from './types';
import { StudentAuth } from './components/auth/StudentAuth';
import { AdminLogin } from './components/auth/AdminLogin';
import { StudentDashboard } from './components/student/StudentDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Fingerprint, MonitorSmartphone, Shield } from 'lucide-react';

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({
    role: UserRole.GUEST,
    user: null,
    adminId: null
  });

  const [view, setView] = useState<'landing' | 'student-auth' | 'admin-auth'>('landing');

  useEffect(() => {
    // Auto-login logic:
    const checkSession = async () => {
      const deviceId = getThisDeviceId();
      try {
        const { user } = await api.checkSession(deviceId);
        if (user) {
          setAuth({ role: UserRole.STUDENT, user, adminId: null });
        }
      } catch (e) {
        console.error("Session check failed", e);
      }
    };
    checkSession();
  }, []);

  const handleStudentLogin = (user: User) => {
    setAuth({ role: UserRole.STUDENT, user, adminId: null });
  };

  const handleAdminLogin = (adminId: string) => {
    setAuth({ role: UserRole.ADMIN, user: null, adminId });
  };

  const handleLogout = () => {
    // Only Admin can logout freely. 
    setAuth({ role: UserRole.GUEST, user: null, adminId: null });
    setView('landing');
  };

  // --- Render Logic ---

  if (auth.role === UserRole.STUDENT && auth.user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
        <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-40 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Fingerprint className="text-indigo-500" />
              <h1 className="text-xl font-bold tracking-tight">CWC 3.0 <span className="text-indigo-500">VOTING</span></h1>
            </div>
            <div className="text-xs text-slate-500 font-mono hidden sm:block">
              DEVICE ID: {getThisDeviceId().slice(0, 8)}...
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto p-4 md:p-8">
          <StudentDashboard user={auth.user} />
        </main>
      </div>
    );
  }

  if (auth.role === UserRole.ADMIN) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
        <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 sticky top-0 z-40 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Shield className="text-indigo-500 fill-indigo-500/20" />
              <h1 className="text-xl font-bold tracking-tight text-white">CWC 3.0 <span className="text-indigo-400">COMMAND CENTER</span></h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden md:block text-sm text-slate-400 font-mono">ADMIN: <span className="text-white">{auth.adminId}</span></span>
              <button onClick={handleLogout} className="text-sm font-semibold text-slate-400 hover:text-red-400 transition-colors">
                Logout
              </button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto p-4 md:p-8">
          <AdminDashboard />
        </main>
      </div>
    );
  }

  // --- Landing / Auth Views ---

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950 -z-10"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 -z-10"></div>

      <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

        {/* Left Side: Branding */}
        <div className="text-center md:text-left space-y-6">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-600 drop-shadow-lg">
            CWC 3.0
          </h1>
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            Official Digital Voting System
          </h2>
          <div className="space-y-4 text-slate-400 max-w-md mx-auto md:mx-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg"><Fingerprint size={20} className="text-indigo-400" /></div>
              <span>One Device, One Vote Policy</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg"><MonitorSmartphone size={20} className="text-purple-400" /></div>
              <span>Secure Reality-Show Grade Platform</span>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Forms */}
        <div className="relative">
          {view === 'landing' && (
            <div className="space-y-4 w-full max-w-sm mx-auto">
              <button
                onClick={() => setView('student-auth')}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all transform hover:scale-105"
              >
                Student Access
              </button>
              <button
                onClick={() => setView('admin-auth')}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-4 rounded-xl font-semibold border border-slate-700 transition-all"
              >
                Admin Login
              </button>
            </div>
          )}

          {view === 'student-auth' && (
            <div className="animate-fade-in-up">
              <button onClick={() => setView('landing')} className="text-slate-500 hover:text-white mb-4 text-sm">← Back</button>
              <StudentAuth onLoginSuccess={handleStudentLogin} />
            </div>
          )}

          {view === 'admin-auth' && (
            <div className="animate-fade-in-up">
              <button onClick={() => setView('landing')} className="text-slate-500 hover:text-white mb-4 text-sm">← Back</button>
              <AdminLogin onLoginSuccess={handleAdminLogin} />
            </div>
          )}
        </div>
      </div>

      <footer className="absolute bottom-4 text-center text-slate-600 text-xs">
        &copy; 2024 Bannari Amman Institute of Technology | CWC 3.0 Tech Team
      </footer>
    </div>
  );
};

export default App;