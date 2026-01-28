import React from "react";
import { LucideIcon } from "lucide-react";

interface AdminStatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  bg: string;
}

export const AdminStatsCard: React.FC<AdminStatsCardProps> = ({
  label,
  value,
  icon: Icon,
  color,
  bg,
}) => {
  return (
    <div
      className={`bg-slate-800 rounded-2xl p-6 border border-slate-700/50 bg-gradient-to-br ${bg} to-transparent relative overflow-hidden group`}
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110">
        <Icon size={64} />
      </div>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
        {label}
      </p>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
    </div>
  );
};
