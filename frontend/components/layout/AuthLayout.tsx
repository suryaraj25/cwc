import React from "react";

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
    {/* Background Ambience */}
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950 -z-10"></div>
    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 -z-10"></div>

    <div className="w-full max-w-4xl mx-auto relative">
      <div className="animate-fade-in-up">{children}</div>
    </div>

    <footer className="absolute bottom-4 text-center text-slate-600 text-xs">
      &copy; 2024 Bannari Amman Institute of Technology | CWC 3.0 Tech Team
    </footer>
  </div>
);
