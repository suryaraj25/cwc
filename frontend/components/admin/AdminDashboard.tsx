import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { User, Team, VotingConfig, DeviceRegistry } from "../../types";
import { api } from "../../services/api";
import { DEPARTMENT_CODES } from "../../constants";
import { Button } from "../ui/Button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  PieChart,
  Pie,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  Smartphone,
  Users,
  RotateCcw,
  FileSpreadsheet,
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Trophy,
  Activity,
  FolderPlus,
  Download,
  Clock,
  Calendar,
  FileText,
  Loader,
} from "lucide-react";
import { AdminNavBar } from "./AdminNavBar";
import { AdminStatsCard } from "./AdminStatsCard";

// Modern Color Palette for Charts
const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
];

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "teams" | "users" | "settings" | "transactions"
  >("dashboard");
  const [data, setData] = useState<{
    users: User[];
    teams: Team[];
    config: VotingConfig;
    teamVotes: Record<string, number>;
    devices: DeviceRegistry;
  } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  // UI States
  const [revokeQuery, setRevokeQuery] = useState("");
  const [revokeMessage, setRevokeMessage] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Team Management States
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [teamForm, setTeamForm] = useState({
    name: "",
    description: "",
    imageUrl: "",
  });

  // Config State
  const [configForm, setConfigForm] = useState<{
    startTime: string;
    endTime: string;
  }>({ startTime: "", endTime: "" });

  async function refreshData() {
    try {
      const d = await api.getAdminData();
      setData(d);
      // Only sync form if it's the first load (data was null)
      if (d && d.config && !data) {
        setConfigForm({
          startTime: d.config.startTime
            ? new Date(d.config.startTime).toISOString().slice(0, 16)
            : "",
          endTime: d.config.endTime
            ? new Date(d.config.endTime).toISOString().slice(0, 16)
            : "",
        });
      }
    } catch (e) {
      console.error("Failed to load admin data", e);
    }
  }

  useEffect(() => {
    // Initial Fetch
    refreshData();

    // Socket Connection
    // NOTE: In production, use env variable for URL
    const socket = io("http://localhost:5000", {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("Connected to WebSocket");
    });

    socket.on("admin:data-update", () => {
      console.log("Received Real-time Update");
      refreshData();
    });

    return () => {
      socket.disconnect();
    };
  }, []); // Run once on mount

  useEffect(() => {
    if (activeTab === "transactions") {
      api.getTransactions().then(setTransactions).catch(console.error);
    }
  }, [activeTab]);

  if (!data)
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-indigo-500">
        <Loader className="animate-spin text-blue-500 h-12 w-12" />
      </div>
    );

  // --- ANALYTICS CALCULATIONS ---

  // 1. Leaderboard Data
  const chartData = data?.teams
    ?.map((t) => ({
      name: t.name,
      votes: data.teamVotes[t.id] || 0,
    }))
    .sort((a, b) => b.votes - a.votes);

  // 2. Department Participation Data (Pie Chart)
  const deptStats: Record<string, number> = {};
  data?.users
    ?.filter((u) => u.lastVotedAt)
    .forEach((u) => {
      const dept = (DEPARTMENT_CODES as any)[u.dept] // Abbreviate Dept Name
      deptStats[dept] = (deptStats[dept] || 0) + 1;
    });
  const pieData = Object.entries(deptStats)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Top 8 active depts

  // 3. Activity Timeline (Area Chart - Simulated by grouping hours)
  const timeStats: Record<string, number> = {};
  data?.users?.forEach((u) => {
    if (u.lastVotedAt) {
      const hour = new Date(u.lastVotedAt).getHours();
      const label = `${hour}:00`;
      timeStats[label] = (timeStats[label] || 0) + 1;
    }
  });
  // Fill missing hours for a nice curve
  const areaData = Array.from({ length: 24 }, (_, i) => ({
    name: `${i}:00`,
    users: timeStats[`${i}:00`] || 0,
  }));

  // --- ACTIONS ---

  const toggleVoting = async () => {
    // Check if within time window
    const now = new Date();
    const start = data.config.startTime
      ? new Date(data.config.startTime)
      : null;
    const end = data.config.endTime ? new Date(data.config.endTime) : null;

    if (!data.config.isVotingOpen) {
      // Trying to open
      if (start && end) {
        if (now < start || now > end) {
          alert(
            "Cannot start voting: Current time is outside the configured Start/End window. Please adjust the times in Settings.",
          );
          return;
        }
      }
    }

    await api.updateConfig({ isVotingOpen: !data.config.isVotingOpen });
    refreshData();
  };

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.updateConfig({
      startTime: configForm.startTime || null,
      endTime: configForm.endTime || null,
    });
    alert("Voting Window Updated Successfully");
    refreshData();
  };

  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = data.users.find(
      (u) => u.email === revokeQuery || u.rollNo === revokeQuery,
    );
    if (!user) {
      setRevokeMessage("User not found.");
      return;
    }
    const result = await api.revokeDevice(user.id);
    if (result.success) {
      setRevokeMessage(`Device unbound for ${user.name}.`);
      setRevokeQuery("");
      refreshData();
    } else {
      setRevokeMessage("Error: User has no bound device.");
    }
  };

  // --- REPORT GENERATION ---

  // 1. Transactional CSV (Raw Data)
  const handleDetailedReport = () => {
    if (!data) return;

    const headers = [
      "Student Name",
      "Roll No",
      "Department",
      "Email",
      "Phone",
      "Voted Team",
      "Votes Cast",
      "Vote Timestamp",
    ];

    const rows: string[] = [];

    data.users.forEach((u) => {
      if (!u.lastVotedAt || Object.keys(u.votes).length === 0) return;

      Object.entries(u.votes).forEach(([teamId, count]) => {
        const teamName =
          data.teams.find((t) => t.id === teamId)?.name || "Unknown Team";
        const row = [
          `"${u.name}"`,
          `"${u.rollNo}"`,
          `"${u.dept}"`,
          `"${u.email}"`,
          `"${u.phone}"`,
          `"${teamName}"`,
          count,
          `"${new Date(u.lastVotedAt!).toLocaleString()}"`,
        ];
        rows.push(row.join(","));
      });
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `CWC_Raw_Data_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Summary Report (PDF Simulation via HTML Print)
  const handleSummaryReport = () => {
    if (!data) return;

    const printWindow = window.open("", "", "width=800,height=600");
    if (!printWindow) return;

    const totalVotes: any = Object.values(data.teamVotes).reduce(
      (a: number, b: number) => a + b,
      0,
    );
    const activeVoters = data.users.filter((u) => u.lastVotedAt).length;
    const leader = chartData.length > 0 ? chartData[0] : null;

    const html = `
        <html>
        <head>
            <title>CWC 3.0 Voting Report</title>
            <style>
                body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; }
                h1 { color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
                .meta { margin-bottom: 30px; color: #666; font-size: 0.9em; }
                .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
                .stat-box { background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; }
                .stat-val { font-size: 24px; font-weight: bold; color: #111; }
                .stat-label { font-size: 12px; text-transform: uppercase; color: #666; margin-top: 5px; }
                table { w-full; border-collapse: collapse; margin-top: 20px; width: 100%; }
                th { text-align: left; background: #4f46e5; color: white; padding: 12px; }
                td { border-bottom: 1px solid #ddd; padding: 12px; }
                .leader-badge { background: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }
                .footer { margin-top: 50px; font-size: 12px; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
            </style>
        </head>
        <body>
            <h1>CWC 3.0 Official Voting Report</h1>
            <div class="meta">
                Generated on: ${new Date().toLocaleString()}<br/>
                System Status: ${data.config.isVotingOpen ? "OPEN" : "CLOSED"}
            </div>

            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-val">${totalVotes}</div>
                    <div class="stat-label">Total Votes Cast</div>
                </div>
                <div class="stat-box">
                    <div class="stat-val">${activeVoters} / ${data.users.length}</div>
                    <div class="stat-label">Voter Turnout</div>
                </div>
                <div class="stat-box">
                    <div class="stat-val">${leader ? leader.name : "-"}</div>
                    <div class="stat-label">Current Leader</div>
                </div>
            </div>

            <h2>Team Standings</h2>
            <table>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Team Name</th>
                        <th>Votes Received</th>
                        <th>Share</th>
                    </tr>
                </thead>
                <tbody>
                    ${chartData
                      .map(
                        (t, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${t.name} ${i === 0 ? '<span class="leader-badge">LEADER</span>' : ""}</td>
                            <td>${t.votes}</td>
                            <td>${totalVotes > 0 ? ((t.votes / totalVotes) * 100).toFixed(1) : 0}%</td>
                        </tr>
                    `,
                      )
                      .join("")}
                </tbody>
            </table>

            <div class="footer">
                CWC 3.0 Digital Voting System • Secure Report Generation
            </div>
            <script>window.print();</script>
        </body>
        </html>
      `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTeam) {
      await api.updateTeam(editingTeam, teamForm);
      setEditingTeam(null);
    } else {
      await api.addTeam(teamForm);
      setIsAddingTeam(false);
    }
    setTeamForm({ name: "", description: "", imageUrl: "" });
    refreshData();
  };

  const startEditTeam = (team: Team) => {
    setEditingTeam(team.id);
    setTeamForm({
      name: team.name,
      description: team.description,
      imageUrl: team.imageUrl,
    });
    setIsAddingTeam(true);
  };

  const handleDeleteTeam = async (id: string) => {
    if (confirm("Delete this team?")) {
      await api.deleteTeam(id);
      refreshData();
    }
  };

  // Stats constants
  const totalVotesCast = Object.values(data.teamVotes).reduce(
    (a: number, b: number) => a + b,
    0,
  );
  const activeUsers = data.users.filter((u) => u.lastVotedAt).length;

  return (
    <div className="space-y-8 animate-fade-in-up pb-20">
      <style>{`
        .admin-glass { @apply bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 shadow-xl; }
        .chart-tooltip { @apply bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-2xl text-xs; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      {/* --- COMMAND BAR --- */}
      <AdminNavBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        config={data.config}
        toggleVoting={toggleVoting}
      />

      {/* --- DASHBOARD TAB --- */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* KPI GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Total Votes",
                value: totalVotesCast,
                icon: Activity,
                color: "text-indigo-400",
                bg: "from-indigo-500/10",
              },
              {
                label: "Registered Students",
                value: data.users.length,
                icon: Users,
                color: "text-blue-400",
                bg: "from-blue-500/10",
              },
              {
                label: "Turnout Today",
                value: `${Math.round((activeUsers / (data.users.length || 1)) * 100)}%`,
                icon: Clock,
                color: "text-emerald-400",
                bg: "from-emerald-500/10",
              },
            ].map((stat, idx) => (
              <AdminStatsCard
                key={idx}
                label={stat.label}
                value={stat.value}
                icon={stat.icon}
                color={stat.color}
                bg={stat.bg}
              />
            ))}
          </div>

          {/* CHARTS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[450px]">
            {/* MAIN LEADERBOARD */}
            <div className="lg:col-span-2 admin-glass rounded-2xl p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Trophy className="text-yellow-500" size={20} /> Live Results
                </h3>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSummaryReport}
                    variant="secondary"
                    className="px-3 py-1 text-xs h-8 bg-slate-700"
                  >
                    <FileText size={14} className="mr-1" /> Vote List (PDF)
                  </Button>
                  <span className="text-xs text-slate-500 font-mono flex items-center">
                    UPDATED: {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
              <div className="flex-1 w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={true}
                      vertical={false}
                      stroke="#334155"
                      opacity={0.5}
                    />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.03)" }}
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      labelStyle={{ color: "#fff" }}
                      itemStyle={{ color: "#fff" }}
                    />
                    <Bar dataKey="votes" radius={[0, 4, 4, 0]} barSize={32}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SIDE STATS */}
            <div className="flex flex-col gap-6 h-full">
              {/* Dept Distribution */}
              <div className="admin-glass rounded-2xl p-6 flex-1 min-h-[200px] flex flex-col">
                <h3 className="text-sm font-bold text-slate-300 uppercase mb-4">
                  Department Activity
                </h3>
                <div className="flex-1 relative min-h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            stroke="rgba(0,0,0,0)"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                          borderRadius: "8px",
                          color: "#fff",
                          fontSize: "10px",
                        }}
                        labelStyle={{ color: "#fff" }}
                        itemStyle={{ color: "#fff" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <span className="text-2xl font-bold text-white block">
                        {activeUsers}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase">
                        Voters
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Voting Trend */}
              <div className="admin-glass rounded-2xl p-6 flex-1 min-h-[200px] flex flex-col">
                <h3 className="text-sm font-bold text-slate-300 uppercase mb-4">
                  Traffic (24H)
                </h3>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={areaData}>
                      <defs>
                        <linearGradient
                          id="colorUsers"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#8b5cf6"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#8b5cf6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                          borderRadius: "8px",
                          color: "#fff",
                          fontSize: "10px",
                        }}
                        labelStyle={{ color: "#fff" }}
                        itemStyle={{ color: "#fff" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="users"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorUsers)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TRANSACTIONS TAB --- */}
      {activeTab === "transactions" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
            <div>
              <h3 className="text-2xl font-bold text-white">Voting Log</h3>
              <p className="text-sm text-slate-400">
                Real-time audit trail of all votes cast.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  const csvContent =
                    "data:text/csv;charset=utf-8," +
                    ["Date,User,RollNo,Department,Team,Votes"].join(",") +
                    "\n" +
                    transactions
                      .map((t) => {
                        const deptCode = t.userId?.dept
                          ? (DEPARTMENT_CODES as any)[t.userId.dept] ||
                            t.userId.dept
                          : "N/A";
                        return `${new Date(t.createdAt).toISOString()},${t.userId?.name},${t.userId?.rollNo},${deptCode},${t.teamId?.name},${t.votes}`;
                      })
                      .join("\n");
                  const encoded = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encoded);
                  link.setAttribute("download", "transactions.csv");
                  document.body.appendChild(link);
                  link.click();
                }}
              >
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </Button>
            </div>
          </div>

          <div className="admin-glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="bg-slate-900/50 border-b border-slate-700">
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Team Voted
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Votes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {transactions.map((tx) => {
                    const deptCode = tx.userId?.dept
                      ? (DEPARTMENT_CODES as any)[tx.userId.dept] ||
                        tx.userId.dept
                      : "N/A";
                    return (
                      <tr
                        key={tx._id}
                        className="hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-slate-300">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">
                              {tx.userId?.name || "Unknown"}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              {tx.userId?.rollNo}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-indigo-300">
                          {deptCode}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-indigo-400">
                          {tx.teamId?.name || "Unknown Team"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-slate-700 text-white font-bold text-xs ring-1 ring-slate-600">
                            {tx.votes}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {transactions.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-slate-500"
                      >
                        No transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {activeTab === "teams" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
            <div>
              <h3 className="text-2xl font-bold text-white">Manage Teams</h3>
              <p className="text-sm text-slate-400">
                Configure voting options and candidates.
              </p>
            </div>
            {!isAddingTeam && (
              <Button
                onClick={() => {
                  setIsAddingTeam(true);
                  setEditingTeam(null);
                  setTeamForm({ name: "", description: "", imageUrl: "" });
                }}
              >
                <Plus className="w-4 h-4 mr-2" /> Add Team
              </Button>
            )}
          </div>

          {isAddingTeam && (
            <div className="admin-glass rounded-2xl p-8 border-l-4 border-l-indigo-500 animate-in slide-in-from-top-4 fade-in duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">
                  {editingTeam ? "Edit Team Details" : "Register New Team"}
                </h3>
                <button
                  onClick={() => setIsAddingTeam(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X />
                </button>
              </div>
              <form
                onSubmit={handleSaveTeam}
                className="grid grid-cols-1 gap-6"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Team Name
                  </label>
                  <input
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                    value={teamForm.name}
                    onChange={(e) =>
                      setTeamForm({ ...teamForm, name: e.target.value })
                    }
                    required
                    placeholder="e.g. Code Warriors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Description (Slogan)
                  </label>
                  <input
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                    value={teamForm.description}
                    onChange={(e) =>
                      setTeamForm({ ...teamForm, description: e.target.value })
                    }
                    required
                    placeholder="Short catchphrase..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Image URL
                  </label>
                  <input
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                    value={teamForm.imageUrl}
                    onChange={(e) =>
                      setTeamForm({ ...teamForm, imageUrl: e.target.value })
                    }
                    required
                    placeholder="https://..."
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsAddingTeam(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    <Save className="w-4 h-4 mr-2" />{" "}
                    {editingTeam ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.teams.length === 0 && !isAddingTeam && (
              <div className="col-span-full py-20 text-center text-slate-500 bg-slate-800/30 rounded-3xl border-2 border-dashed border-slate-700">
                <FolderPlus className="mx-auto h-16 w-16 text-slate-600 mb-6" />
                <h3 className="text-xl font-bold text-slate-300">
                  No Teams Configured
                </h3>
                <p className="text-sm max-w-sm mx-auto mt-2">
                  The voting roster is empty. Click "Add Team" above to setup
                  the candidates.
                </p>
              </div>
            )}
            {data.teams.map((team) => (
              <div
                key={team.id}
                className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-lg group relative hover:border-indigo-500/50 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
              >
                <div className="aspect-video w-full relative bg-slate-900 overflow-hidden">
                  <img
                    src={team.imageUrl}
                    alt={team.name}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-90" />

                  {/* Action Overlay */}
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={() => startEditTeam(team)}
                      className="p-2 bg-white/10 backdrop-blur-md rounded-lg hover:bg-white/20 text-white"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="p-2 bg-red-500/80 backdrop-blur-md rounded-lg hover:bg-red-500 text-white"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <h4 className="font-bold text-xl text-white truncate">
                      {team.name}
                    </h4>
                    <p className="text-xs text-slate-300 line-clamp-1">
                      {team.description}
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-slate-800 border-t border-slate-700">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500 uppercase tracking-widest">
                      Total Votes
                    </span>
                    <span className="text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                      {data.teamVotes[team.id] || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- USERS TAB --- */}
      {activeTab === "users" && (
        <div className="space-y-6">
          {/* Report Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg no-print">
            <div>
              <h3 className="text-2xl font-bold text-white">
                Student Registry
              </h3>
              <p className="text-sm text-slate-400">
                View participation logs and generate reports.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleDetailedReport}
                className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Download Raw CSV
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full md:w-64 bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
              <table className="w-full text-left text-sm min-w-[768px]">
                <thead className="bg-slate-900/50 text-slate-400 font-bold uppercase tracking-wider text-xs border-b border-slate-700">
                  <tr>
                    <th className="p-5 w-10 no-print"></th>
                    <th className="p-5">Student Identity</th>
                    <th className="p-5">Department</th>
                    <th className="p-5 text-center">Votes Cast</th>
                    <th className="p-5 text-right">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {data.users
                    .filter(
                      (u) =>
                        u.name
                          .toLowerCase()
                          .includes(userSearch.toLowerCase()) ||
                        u.rollNo
                          .toLowerCase()
                          .includes(userSearch.toLowerCase()),
                    )
                    .map((user) => (
                      <React.Fragment key={user.id}>
                        <tr
                          className={`group hover:bg-slate-700/30 transition-colors cursor-pointer ${expandedUser === user.id ? "bg-slate-700/30" : ""}`}
                          onClick={() =>
                            setExpandedUser(
                              expandedUser === user.id ? null : user.id,
                            )
                          }
                        >
                          <td className="p-5 text-slate-600 group-hover:text-indigo-400 transition-colors no-print">
                            {expandedUser === user.id ? (
                              <ChevronDown size={16} />
                            ) : (
                              <ChevronRight size={16} />
                            )}
                          </td>
                          <td className="p-5">
                            <div className="font-bold text-white text-base">
                              {user.name}
                            </div>
                            <div className="text-xs font-mono text-indigo-400 mt-0.5">
                              {user.rollNo}
                            </div>
                          </td>
                          <td className="p-5 text-slate-400 font-medium max-w-[200px] truncate">
                            {user.dept}
                          </td>
                          <td className="p-5 text-center">
                            <span
                              className={`inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg text-xs font-bold ${Object.keys(user.votes).length > 0 ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "bg-slate-700 text-slate-500"}`}
                            >
                              {Object.values(user.votes).reduce(
                                (a: number, b: number) => a + b,
                                0,
                              )}
                            </span>
                          </td>
                          <td className="p-5 text-right text-slate-500 text-xs font-mono">
                            {user.lastVotedAt
                              ? new Date(user.lastVotedAt).toLocaleString()
                              : "---"}
                          </td>
                        </tr>
                        {expandedUser === user.id && (
                          <tr className="bg-slate-900/40">
                            <td colSpan={5} className="p-6">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Vote History */}
                                <div>
                                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                                    Vote Breakdown
                                  </h4>
                                  <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-2">
                                    {Object.keys(user.votes).length > 0 ? (
                                      Object.entries(user.votes).map(
                                        ([tid, count]) => {
                                          const team = data.teams.find(
                                            (t) => t.id === tid,
                                          );
                                          return (
                                            <div
                                              key={tid}
                                              className="flex justify-between items-center p-2 rounded-lg bg-slate-700/30"
                                            >
                                              <div className="flex items-center gap-3">
                                                {team?.imageUrl && (
                                                  <img
                                                    src={team.imageUrl}
                                                    className="w-8 h-8 rounded-md object-cover"
                                                    alt=""
                                                  />
                                                )}
                                                <span className="text-slate-200 text-sm font-medium">
                                                  {team?.name || "Unknown Team"}
                                                </span>
                                              </div>
                                              <span className="font-bold text-white bg-slate-900 px-3 py-1 rounded-md text-xs">
                                                {count} Votes
                                              </span>
                                            </div>
                                          );
                                        },
                                      )
                                    ) : (
                                      <p className="text-slate-500 text-sm italic">
                                        No votes cast yet.
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* User Details */}
                                <div>
                                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                                    Contact Profile
                                  </h4>
                                  <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 text-sm space-y-3">
                                    <div className="flex justify-between border-b border-slate-700 pb-2">
                                      <span className="text-slate-500">
                                        Email Address
                                      </span>
                                      <span className="text-slate-200 font-medium">
                                        {user.email}
                                      </span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-700 pb-2">
                                      <span className="text-slate-500">
                                        Phone Number
                                      </span>
                                      <span className="text-slate-200 font-medium">
                                        {user.phone}
                                      </span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-700 pb-2">
                                      <span className="text-slate-500">
                                        Year / Gender
                                      </span>
                                      <span className="text-slate-200 font-medium">
                                        {user.year} / {user.gender}
                                      </span>
                                    </div>
                                    <div className="flex justify-between pt-1">
                                      <span className="text-slate-500">
                                        Device ID Hash
                                      </span>
                                      <span className="text-indigo-400 font-mono text-xs">
                                        {user.boundDeviceId || "Unbound"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- DEVICES TAB --- */}
      {/* {activeTab === 'devices' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="admin-glass rounded-2xl p-8 border-l-4 border-l-orange-500">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-orange-500/20 rounded-xl"><RotateCcw className="text-orange-500" /></div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Emergency Device Reset</h3>
                                <p className="text-sm text-slate-400">Unbind a student from their registered device.</p>
                            </div>
                        </div>

                        <div className="bg-orange-900/20 p-4 rounded-xl border border-orange-500/20 mb-6">
                            <p className="text-sm text-orange-200 flex items-start gap-2">
                                <AlertTriangle className="w-5 h-5 shrink-0" />
                                <span>This action is irreversible. The student will be allowed to login from a new device immediately. Only use for lost devices.</span>
                            </p>
                        </div>

                        <form onSubmit={handleRevoke}>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Student Roll No or Email</label>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                    value={revokeQuery}
                                    onChange={(e) => { setRevokeQuery(e.target.value); setRevokeMessage(''); }}
                                    placeholder="e.g. 7376..."
                                />
                                <Button variant="danger" type="submit" className="px-6 bg-orange-600 hover:bg-orange-700 rounded-xl font-bold">
                                    Unbind Device
                                </Button>
                            </div>
                        </form>

                        {revokeMessage && (
                            <div className={`mt-4 p-4 rounded-xl border ${revokeMessage.includes('Error') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                                <p className="font-medium text-sm">{revokeMessage}</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden flex flex-col h-[500px]">
                        <div className="p-6 border-b border-slate-700 bg-slate-800">
                            <h3 className="text-lg font-bold text-white">Active Sessions</h3>
                            <p className="text-xs text-slate-400 mt-1">Real-time device bindings.</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
                            {data.users.filter(u => u.boundDeviceId).map((u, i) => (
                                <div key={u.id} className="flex items-center justify-between p-4 border-b border-slate-700 hover:bg-slate-700/20 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm">
                                            {i + 1}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm">{u.name}</p>
                                            <p className="text-xs text-slate-500 font-mono">{u.boundDeviceId?.substring(0, 16)}...</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                        <span className="text-xs text-green-400 font-bold uppercase">Online</span>
                                    </div>
                                </div>
                            ))}
                            {data.users.filter(u => u.boundDeviceId).length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                    <Smartphone size={48} className="mb-2 opacity-20" />
                                    <p>No active devices.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )} */}

      {/* --- SETTINGS TAB --- */}
      {activeTab === "settings" && (
        <div className="max-w-3xl mx-auto">
          <div className="admin-glass rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-8 border-b border-slate-700 pb-4">
              <div className="p-3 bg-indigo-500/20 rounded-xl">
                <Clock className="text-indigo-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Voting Schedule
                </h3>
                <p className="text-sm text-slate-400">
                  Strictly enforce voting hours. Students cannot vote outside
                  this window.
                </p>
              </div>
            </div>

            <form onSubmit={saveConfig} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Session Start Time
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                      type="datetime-local"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none [color-scheme:dark]"
                      value={configForm.startTime}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          startTime: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Session End Time
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                      type="datetime-local"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none [color-scheme:dark]"
                      value={configForm.endTime}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          endTime: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex gap-4 items-start">
                <AlertTriangle className="text-indigo-400 w-6 h-6 shrink-0" />
                <div className="text-sm text-indigo-300">
                  <strong>Note:</strong> The "Start Session" button on the
                  dashboard will only work if the current time falls within this
                  configured window. If no window is set, manual toggling works
                  freely.
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" className="px-8 py-3 text-lg">
                  Save Schedule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
