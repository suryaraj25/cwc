import React from "react";
import {
  LayoutDashboard,
  FileSpreadsheet,
  Trophy,
  Users,
  Clock,
  Play,
  Pause,
  Shield,
  UserCog,
} from "lucide-react";
import { Button } from "../ui/Button";
import { VotingConfig } from "../../types";

interface AdminNavBarProps {
  activeTab:
    | "dashboard"
    | "teams"
    | "users"
    | "settings"
    | "transactions"
    | "audit_logs"
    | "admins"
    | "leaderboard"
    | "access_control";
  setActiveTab: (
    tab:
      | "dashboard"
      | "teams"
      | "users"
      | "settings"
      | "transactions"
      | "audit_logs"
      | "admins"
      | "leaderboard"
      | "access_control",
  ) => void;
  config: VotingConfig;
  toggleVoting: () => void;
  userRole?: string;
}

export const AdminNavBar: React.FC<AdminNavBarProps> = ({
  activeTab,
  setActiveTab,
  config,
  toggleVoting,
  userRole = "ADMIN",
}) => {
  const tabs = [
    { id: "dashboard", icon: LayoutDashboard, label: "Overview" },
    ...(userRole === "SUPER_ADMIN"
      ? [
          {
            id: "admins",
            icon: UserCog,
            label: "Admins",
          },
          {
            id: "transactions",
            icon: FileSpreadsheet,
            label: "Transactions",
          },
          {
            id: "audit_logs",
            icon: Shield,
            label: "Audit Logs",
          },
          {
            id: "access_control",
            icon: Shield,
            label: "Access Control",
          },
        ]
      : []),
    { id: "teams", icon: Trophy, label: "Teams" },
    { id: "users", icon: Users, label: "Students" },
    { id: "settings", icon: Clock, label: "Schedule" },
    { id: "leaderboard", icon: Trophy, label: "Leaderboard" },
    {
            id: "access_control",
            icon: Shield,
            label: "Access Control",
          },
          {
            id: "transactions",
            icon: FileSpreadsheet,
            label: "Transactions",
          },
  ];

  return (
    <div className="admin-glass p-2 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4  top-4 z-30 mx-0.5 no-print ring-1 ring-white/5">
      <div className="flex gap-1 overflow-x-auto w-full md:w-auto p-1 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-105"
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
            }`}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-x-2 gap-y-4 sm:gap-4 px-2 sm:px-3 w-full md:w-auto">
        <div
          className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full border w-full sm:w-auto justify-center ${
            config.isVotingOpen
              ? "bg-green-500/10 border-green-500/20"
              : "bg-red-500/10 border-red-500/20"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              config.isVotingOpen ? "bg-green-500 animate-pulse" : "bg-red-500"
            }`}
          />
          <span
            className={`text-xs font-bold uppercase tracking-wider whitespace-nowrap ${
              config.isVotingOpen ? "text-green-400" : "text-red-400"
            }`}
          >
            {config.isVotingOpen ? "Online" : "Locked"}
          </span>
        </div>
        <Button
          onClick={toggleVoting}
          className={`${
            config.isVotingOpen
              ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
              : "bg-green-600 text-white hover:bg-green-500"
          } border-0 px-4 sm:px-6 py-2 rounded-xl transition-all font-bold whitespace-nowrap w-full sm:w-auto text-sm`}
        >
          {config.isVotingOpen ? (
            <>
              <Pause size={16} className="mr-1.5" /> Pause
            </>
          ) : (
            <>
              <Play size={16} className="mr-1.5" /> Start
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
