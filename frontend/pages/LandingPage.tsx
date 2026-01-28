import React from "react";
import { Link } from "react-router-dom";
import { Fingerprint, MonitorSmartphone } from "lucide-react";

export const LandingPage: React.FC = () => {
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
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Fingerprint size={20} className="text-indigo-400" />
              </div>
              <span>One Device, One Vote Policy</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <MonitorSmartphone size={20} className="text-purple-400" />
              </div>
              <span>Secure Reality-Show Grade Platform</span>
            </div>
          </div>
        </div>

        {/* Right Side: Navigation */}
        <div className="relative space-y-4 w-full max-w-sm mx-auto">
          <Link
            to="/login"
            className="block w-full text-center bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all transform hover:scale-105"
          >
            Student Access
          </Link>
          <Link
            to="/admin-login"
            className="block w-full text-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-4 rounded-xl font-semibold border border-slate-700 transition-all"
          >
            Admin Login
          </Link>
        </div>
      </div>

      <footer className="absolute bottom-4 text-center text-slate-600 text-xs">
        &copy; 2024 Bannari Amman Institute of Technology | CWC 3.0 Tech Team
      </footer>
    </div>
  );
};
