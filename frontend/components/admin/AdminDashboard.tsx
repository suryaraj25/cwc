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
  Lock,
  LogOut,
  UserCog,
  ShieldAlert,
} from "lucide-react";
import { AdminNavBar } from "./AdminNavBar";
import { AdminStatsCard } from "./AdminStatsCard";
import { Pagination } from "../ui/Pagination";
import { AuditLogsTable } from "./AuditLogsTable";
import { Modal, ModalProps } from "../ui/Modal";
import { toast } from "../../stores/useToastStore";
import { AdminScoreManager } from "./AdminScoreManager";
import { UserAccessControl } from "./UserAccessControl";
import { useAuthStore } from "../../stores/useAuthStore.ts";
import { useDebounce } from "../../hooks/useDebounce.ts";

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
  const { adminRole } = useAuthStore();
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "teams"
    | "users"
    | "settings"
    | "transactions"
    | "audit_logs"
    | "admins"
    | "leaderboard"
    | "access_control"
  >("dashboard");

  const [data, setData] = useState<{
    users: User[];
    totalUsers: number;
    // Removed pagination metadata
    teams: Team[];
    config: VotingConfig;
    teamVotes: Record<string, number>;
    deviceCount: number;
  } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [admins, setAdmins] = useState<any[]>([]); // Admins List State
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set()); // Socket-based online users
  const [onlineAdmins, setOnlineAdmins] = useState<Set<string>>(new Set()); // Socket-based online admins
  console.log("online user: ", onlineUsers);
  // Pagination States (Transactions only now)
  // Users pagination removed
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsPageSize, setTransactionsPageSize] = useState(20);
  const [transactionsTotalPages, setTransactionsTotalPages] = useState(1);

  // Search States
  const [usersSearchInput, setUsersSearchInput] = useState("");
  const [selectedYear, setSelectedYear] = useState(""); // Year Filter State
  const [transactionsSearchInput, setTransactionsSearchInput] = useState("");

  // Debounced search values (3 seconds)
  const debouncedUsersSearch = useDebounce(usersSearchInput, 1000);
  const debouncedTransactionsSearch = useDebounce(
    transactionsSearchInput,
    1000,
  );

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

  // Password Reset State
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Config State
  const [configForm, setConfigForm] = useState<{
    startTime: string;
    endTime: string;
    currentSessionDate: string;
  }>({ startTime: "", endTime: "", currentSessionDate: "" });

  // Admin Management State
  const [createAdminOpen, setCreateAdminOpen] = useState(false);
  const [resetAdminPasswordOpen, setResetAdminPasswordOpen] = useState(false);
  const [targetAdminId, setTargetAdminId] = useState<string | null>(null);
  const [adminForm, setAdminForm] = useState({
    username: "",
    password: "",
    role: "ADMIN",
  });
  const [adminNewPassword, setAdminNewPassword] = useState("");

  const fetchAdmins = async () => {
    try {
      const res = await api.getAdmins();
      if (res.success) setAdmins(res.admins);
    } catch (error) {
      console.error("Failed to fetch admins", error);
    }
  };

  useEffect(() => {
    if (activeTab === "admins") {
      fetchAdmins();
    }
  }, [activeTab]);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAdmin(adminForm);
      toast.success("Admin created successfully");
      setCreateAdminOpen(false);
      setAdminForm({ username: "", password: "", role: "ADMIN" });
      fetchAdmins();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create admin");
    }
  };

  const handleDeleteAdmin = (adminId: string) => {
    showModal(
      "Delete Administrator",
      "Are you sure you want to delete this administrator?",
      "confirm",
      async () => {
        try {
          await api.deleteAdmin(adminId);
          toast.success("Admin deleted successfully");
          fetchAdmins();
        } catch (error: any) {
          toast.error(
            error.response?.data?.message || "Failed to delete admin",
          );
        }
      },
      { confirmVariant: "destructive", confirmLabel: "Delete Admin" },
    );
  };

  const handleResetAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAdminId || !adminNewPassword) return;
    try {
      await api.resetAdminPassword(targetAdminId, adminNewPassword);
      toast.success("Admin password reset successfully");
      setResetAdminPasswordOpen(false);
      setAdminNewPassword("");
      setTargetAdminId(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reset password");
    }
  };

  const handleForceLogoutAdmin = (adminId: string) => {
    showModal(
      "Force Logout Admin",
      "Are you sure you want to logout this admin?",
      "confirm",
      async () => {
        try {
          await api.forceLogoutAdmin(adminId);
          toast.success("Admin logged out successfully");
        } catch (error: any) {
          toast.error(
            error.response?.data?.message || "Failed to logout admin",
          );
        }
      },
      { confirmVariant: "destructive", confirmLabel: "Force Logout" },
    );
  };

  const handleAssignTeam = (user: User) => {
    let selectedTeamId = user.teamId || "";
    showModal(
      "Assign Team",
      <div className="space-y-4">
        <p className="text-slate-300">
          Assign <strong>{user.name}</strong> to a team. This will prevent them
          from voting for this team.
        </p>
        <select
          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          defaultValue={selectedTeamId}
          onChange={(e) => (selectedTeamId = e.target.value)}
        >
          <option value="">-- No Team --</option>
          {data?.teams.map((team: Team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>,
      "confirm",
      async () => {
        try {
          await api.assignTeam(user.id, selectedTeamId || null);
          toast.success("Team assigned successfully");
          refreshData();
        } catch (error: any) {
          toast.error(error.response?.data?.message || "Failed to assign team");
        }
      },
      { confirmLabel: "Save Assignment" },
    );
  };

  // Modal State
  const [modalState, setModalState] = useState<ModalProps>({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    onClose: () => {},
  });

  const showModal = (
    title: string,
    message: React.ReactNode,
    type: ModalProps["type"] = "info",
    onConfirm?: () => void,
    options: Partial<ModalProps> = {},
  ) => {
    setModalState({
      isOpen: true,
      title,
      message,
      type,
      onConfirm,
      ...options,
      onClose: () => setModalState((prev) => ({ ...prev, isOpen: false })),
    });
  };

  const toISTString = (dateString: string | number | Date) => {
    const date = new Date(dateString);
    const istDate = new Date(
      date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    );
    const year = istDate.getFullYear();
    const month = String(istDate.getMonth() + 1).padStart(2, "0");
    const day = String(istDate.getDate()).padStart(2, "0");
    const hours = String(istDate.getHours()).padStart(2, "0");
    const minutes = String(istDate.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  async function refreshData() {
    try {
      const d = await api.getAdminData(debouncedUsersSearch);
      setData(d);
      // setUsersTotalPages(d.totalPages || 1); // Removed
      // Only sync form if it's the first load (data was null)
      if (d && d.config && !data) {
        setConfigForm({
          startTime: d.config.startTime ? toISTString(d.config.startTime) : "",
          endTime: d.config.endTime ? toISTString(d.config.endTime) : "",
          currentSessionDate: d.config.currentSessionDate
            ? new Date(d.config.currentSessionDate).toISOString().split("T")[0]
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
    const socket = io("https://cwc-b4ir.onrender.com", {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("Connected to WebSocket");
    });

    socket.on("admin:online-users", (userIds: string[]) => {
      setOnlineUsers(new Set(userIds));
    });

    socket.on("admin:online-admins", (adminIds: string[]) => {
      setOnlineAdmins(new Set(adminIds));
    });

    socket.on("admin:data-update", () => {
      console.log("Received Real-time Update");
      refreshData();
      if (activeTab === "admins") fetchAdmins();
    });

    return () => {
      socket.disconnect();
    };
  }, []); // Run once on mount

  useEffect(() => {
    if (activeTab === "transactions") {
      api
        .getTransactions(
          transactionsPage,
          transactionsPageSize,
          debouncedTransactionsSearch,
        )
        .then((response) => {
          setTransactions(response.transactions);
          setTransactionsTotalPages(response.totalPages || 1);
        })
        .catch(console.error);
    }
  }, [
    activeTab,
    transactionsPage,
    transactionsPageSize,
    debouncedTransactionsSearch,
  ]);

  // Refetch users when search changes
  useEffect(() => {
    refreshData();
  }, [debouncedUsersSearch]);

  if (!data)
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-indigo-500">
        <Loader className="animate-spin text-blue-500 h-12 w-12" />
      </div>
    );

  // --- ANALYTICS CALCULATIONS ---

  // 1. Leaderboard Data
  const chartData = data?.teams
    ?.map((t: { name: any; id: string | number }) => ({
      name: t.name,
      votes: data.teamVotes[t.id] || 0,
    }))
    .sort((a: { votes: number }, b: { votes: number }) => b.votes - a.votes);

  // 2. Department Participation Data (Pie Chart)
  const deptStats: Record<string, number> = {};
  data?.users
    ?.filter((u: User) => u.lastVotedAt)
    .forEach((u: User) => {
      const dept = (DEPARTMENT_CODES as any)[u.dept]; // Abbreviate Dept Name
      deptStats[dept] = (deptStats[dept] || 0) + 1;
    });
  const pieData = Object.entries(deptStats)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Top 8 active depts

  // 3. Activity Timeline (Area Chart - Simulated by grouping hours)
  const timeStats: Record<string, number> = {};
  data?.users?.forEach((u: User) => {
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
    const now = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    );
    const start = data.config.startTime
      ? new Date(
          new Date(data.config.startTime).toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
          }),
        )
      : null;
    const end = data.config.endTime
      ? new Date(
          new Date(data.config.endTime).toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
          }),
        )
      : null;

    if (!data.config.isVotingOpen) {
      // Trying to open
      if (start && end) {
        if (now < start || now > end) {
          showModal(
            "Force Start Voting Session?",
            "The current time is outside the scheduled Start/End window. Starting now will CLEAR the schedule and enable voting immediately. Are you sure?",
            "warning",
            async () => {
              try {
                // Clear schedule and open
                await api.updateConfig({
                  isVotingOpen: true,
                  startTime: null,
                  endTime: null,
                });
                toast.success(
                  "Voting session forcefully started (Schedule Cleared)!",
                );
                refreshData();
              } catch (error) {
                console.error(error);
                toast.error("Failed to force start session.");
              }
            },
            { confirmLabel: "Force Start", confirmVariant: "destructive" },
          );
          return;
        }
      }
    }

    // If we are CLOSING the session, ask for confirmation to avoid accidental stops during live event
    if (data.config.isVotingOpen) {
      showModal(
        "Pause Voting Session?",
        "Are you sure you want to pause voting? Students will not be able to cast votes until you resume.",
        "warning",
        async () => {
          try {
            await api.updateConfig({ isVotingOpen: false });
            toast.info("Voting session paused.");
            refreshData();
          } catch (error) {
            console.error(error);
            toast.error("Failed to pause session. Check console.");
          }
        },
        { confirmVariant: "destructive", confirmLabel: "Pause Voting" },
      );
      return;
    }

    // If OPENING, ask for confirmation too
    showModal(
      "Start Voting Session?",
      "Are you sure you want to go LIVE? Students will be able to cast votes immediately.",
      "confirm",
      async () => {
        try {
          await api.updateConfig({ isVotingOpen: true });
          toast.success("Voting session is LIVE!");
          refreshData();
        } catch (error) {
          console.error(error);
          toast.error("Failed to start session. Check console.");
        }
      },
      { confirmLabel: "Start Session" },
    );
  };

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.updateConfig({
      startTime: configForm.startTime
        ? new Date(`${configForm.startTime}+05:30`).toISOString()
        : null,
      endTime: configForm.endTime
        ? new Date(`${configForm.endTime}+05:30`).toISOString()
        : null,
      currentSessionDate: configForm.currentSessionDate || null,
    });
    toast.success("Voting Window Updated Successfully");
    refreshData();
  };

  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = data.users.find(
      (u: { email: any; rollNo: any }) =>
        u.email === revokeQuery || u.rollNo === revokeQuery,
    );
    if (!user) {
      setRevokeMessage("User not found.");
      return;
    }
    const result = await api.revokeDevice(user.id);
    if (result.success) {
      setRevokeMessage(`Device unbound for ${user.name}.`);
      setRevokeQuery("");
      toast.success(`Device unbound for ${user.name}.`);
      refreshData();
    } else {
      setRevokeMessage("Error: User has no bound device.");
      toast.error("User has no bound device.");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId || !newPassword) return;

    try {
      await api.resetPassword(resetUserId, newPassword);
      toast.success("Password reset successfully");
      setResetPasswordOpen(false);
      setNewPassword("");
      setResetUserId(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reset password");
    }
  };

  const openResetPasswordModal = (userId: string) => {
    setResetUserId(userId);
    setNewPassword("");
    setResetPasswordOpen(true);
  };

  const handleDeleteUser = (userId: string) => {
    showModal(
      "Delete User",
      "Are you sure you want to permanently delete this user? All their votes and logs will be wiped. This action cannot be undone.",
      "confirm", // Fixed type from string literal abuse if possible, otherwise 'confirm' or similar based on ModalProps
      async () => {
        try {
          await api.deleteUser(userId);
          toast.success("User deleted successfully");
          refreshData();
        } catch (error: any) {
          toast.error(error.response?.data?.message || "Failed to delete user");
        }
      },
      { confirmVariant: "destructive", confirmLabel: "Delete User" },
    );
  };

  const handleForceLogout = (userId: string) => {
    showModal(
      "Force Logout",
      "Are you sure you want to force logout this user? They will be disconnected immediately.",
      "confirm",
      async () => {
        try {
          await api.forceLogoutUser(userId);
          toast.success("User logged out successfully");
          refreshData();
        } catch (error: any) {
          toast.error(error.response?.data?.message || "Failed to logout user");
        }
      },
      { confirmVariant: "destructive", confirmLabel: "Force Logout" },
    );
  };

  const handleDeleteVotes = (userId: string) => {
    showModal(
      "Delete User Votes",
      "Are you sure you want to delete ONLY the votes for this user? This will clear their engaged votes but keep the user account active.",
      "warning",
      async () => {
        try {
          await api.deleteUserVotes(userId);
          toast.success("User votes deleted successfully");
          refreshData();
        } catch (error: any) {
          toast.error(
            error.response?.data?.message || "Failed to delete user votes",
          );
        }
      },
      { confirmVariant: "destructive", confirmLabel: "Delete Votes" },
    );
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

    data.users.forEach((u: User) => {
      if (!u.lastVotedAt || Object.keys(u.votes).length === 0) return;

      Object.entries(u.votes).forEach(([teamId, count]) => {
        const teamName =
          data.teams.find((t: { id: string }) => t.id === teamId)?.name ||
          "Unknown Team";
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
    const activeVoters = data.users.filter((u: User) => u.lastVotedAt).length;
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
                        (t: { name: any; votes: number }, i: number) => `
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

  const handleDeleteTeam = (id: string) => {
    showModal(
      "Delete Team",
      "Are you sure you want to delete this team? This action cannot be undone.",
      "confirm",
      async () => {
        await api.deleteTeam(id);
        refreshData();
      },
      { confirmVariant: "destructive", confirmLabel: "Delete" },
    );
  };

  // Stats constants
  const totalVotesCast = Object.values(data.teamVotes).reduce(
    (a: number, b: number) => a + b,
    0,
  );
  const activeUsers = data.users.filter((u: User) => u.lastVotedAt).length;

  const filteredUsers = data.users.filter((user: User) => {
    if (selectedYear && user.year !== selectedYear) return false;
    return true;
  });

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
        userRole={adminRole || "ADMIN"}
      />

      {/* --- ACCESS CONTROL TAB --- */}
      {activeTab === "access_control" && <UserAccessControl />}

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
                      {chartData.map((entry: any, index: number) => (
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
          <div className="flex max-sm:flex-col max-sm:gap-y-4 justify-between items-center bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
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
                      .map(
                        (t: {
                          userId: {
                            dept: string | number;
                            name: any;
                            rollNo: any;
                          };
                          createdAt: string | number | Date;
                          teamId: { name: any };
                          votes: any;
                        }) => {
                          const deptCode = t.userId?.dept
                            ? (DEPARTMENT_CODES as any)[t.userId.dept] ||
                              t.userId.dept
                            : "N/A";
                          return `${new Date(t.createdAt).toISOString()},${t.userId?.name},${t.userId?.rollNo},${deptCode},${t.teamId?.name},${t.votes}`;
                        },
                      )
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

          {/* Search Input */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by student name, roll number, or team name..."
                value={transactionsSearchInput}
                onChange={(e: { target: { value: any } }) =>
                  setTransactionsSearchInput(e.target.value)
                }
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl  pl-12 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              />
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
                  {transactions.map(
                    (tx: {
                      userId: { dept: string | number; name: any; rollNo: any };
                      _id: any;
                      createdAt: string | number | Date;
                      teamId: { name: any };
                      votes: any;
                    }) => {
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
                    },
                  )}
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
              {/* Pagination */}
              <Pagination
                currentPage={transactionsPage}
                totalPages={transactionsTotalPages}
                onPageChange={(page: number) => setTransactionsPage(page)}
                pageSize={transactionsPageSize}
                onPageSizeChange={(size) => {
                  setTransactionsPageSize(size);
                  setTransactionsPage(1); // Reset to first page when changing page size
                }}
                className="mt-6"
              />
            </div>
          </div>
        </div>
      )}
      {activeTab === "teams" && (
        <div className="space-y-6">
          <div className="flex max-sm:flex-col max-sm:gap-y-4 justify-between items-center bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
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
                    onChange={(e: { target: { value: any } }) =>
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
                    onChange={(e: { target: { value: any } }) =>
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
                    onChange={(e: { target: { value: any } }) =>
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
            {data.teams.map((team: Team) => (
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
          <div className="flex flex-col gap-4 bg-slate-800 p-4 sm:p-6 rounded-2xl border border-slate-700 shadow-lg no-print">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Student Registry
                </h3>
                <p className="text-sm text-slate-400">
                  View participation logs and generate reports.
                </p>
              </div>
              <Button
                onClick={handleDetailedReport}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Download CSV
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by name, roll, email, dept..."
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  value={usersSearchInput}
                  onChange={(e: { target: { value: any } }) =>
                    setUsersSearchInput(e.target.value)
                  }
                />
              </div>
              <select
                className="bg-slate-900 border border-slate-600 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm w-full sm:w-auto"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="">All Years</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
          </div>

          {/* Data Table - Desktop View */}
          <div className="hidden md:block bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/50 text-slate-400 font-bold uppercase tracking-wider text-xs border-b border-slate-700">
                  <tr>
                    <th className="p-4 w-10 no-print"></th>
                    <th className="p-4">Student Identity</th>
                    <th className="p-4">Department</th>
                    <th className="p-4 text-center">Votes Cast</th>
                    <th className="p-4 text-right">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {filteredUsers.map((user: User) => (
                    <React.Fragment key={user.id}>
                      <tr
                        className={`group hover:bg-slate-700/30 transition-colors cursor-pointer ${expandedUser === user.id ? "bg-slate-700/30" : ""}`}
                        onClick={() =>
                          setExpandedUser(
                            expandedUser === user.id ? null : user.id,
                          )
                        }
                      >
                        <td className="p-4 text-slate-600 group-hover:text-indigo-400 transition-colors no-print">
                          {expandedUser === user.id ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-white text-base flex items-center gap-2">
                            {user.name}{" "}
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${onlineUsers.has(user.id) ? "bg-green-500 animate-pulse" : "bg-slate-500"}`}
                            ></span>
                          </div>
                          <div className="text-xs font-mono text-indigo-400 mt-0.5">
                            {user.rollNo}
                          </div>
                        </td>
                        <td className="p-4 text-slate-400 font-medium max-w-[200px] truncate">
                          {user.dept}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex items-center justify-center min-w-[32px] h-8 rounded-lg text-xs font-bold ${Object.keys(user.votes).length > 0 ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "bg-slate-700 text-slate-500"}`}
                          >
                            {Object.values(user.votes).reduce(
                              (a: number, b: number) => a + b,
                              0,
                            )}
                          </span>
                        </td>
                        <td className="p-4 text-right text-slate-500 text-xs font-mono">
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
                                          (t: { id: string }) => t.id === tid,
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
                                            <div className="flex items-center gap-2">
                                              <span className="font-bold text-white bg-slate-900 px-3 py-1 rounded-md text-xs">
                                                {count} Votes
                                              </span>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  showModal(
                                                    "Delete Team Votes",
                                                    `Are you sure you want to delete ${count} vote(s) for "${team?.name || "this team"}" from this user?`,
                                                    "warning",
                                                    async () => {
                                                      try {
                                                        await api.deleteUserTeamVotes(
                                                          user.id,
                                                          tid,
                                                        );
                                                        toast.success(
                                                          `Votes for ${team?.name || "team"} deleted`,
                                                        );
                                                        refreshData();
                                                      } catch (error: any) {
                                                        toast.error(
                                                          error.response?.data
                                                            ?.message ||
                                                            "Failed to delete team votes",
                                                        );
                                                      }
                                                    },
                                                    {
                                                      confirmVariant:
                                                        "destructive",
                                                      confirmLabel: "Delete",
                                                    },
                                                  );
                                                }}
                                                className="p-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                                title="Delete votes for this team"
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                            </div>
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
                                  <div className="flex justify-between border-b border-slate-700 pb-2">
                                    <span className="text-slate-500">Team</span>
                                    <span className="text-emerald-400 font-medium">
                                      {data.teams.find(
                                        (t: Team) => t.id === user.teamId,
                                      )?.name || "None"}
                                    </span>
                                  </div>

                                  <div className="pt-4 mt-4 border-t border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {adminRole === "SUPER_ADMIN" && (
                                      <>
                                        <Button
                                          variant="secondary"
                                          className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200"
                                          onClick={() =>
                                            openResetPasswordModal(user.id)
                                          }
                                        >
                                          <Lock size={16} /> Reset PW
                                        </Button>
                                        <Button
                                          variant="secondary"
                                          className="flex items-center justify-center gap-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20"
                                          onClick={() =>
                                            handleForceLogout(user.id)
                                          }
                                        >
                                          <LogOut size={16} /> Logout
                                        </Button>
                                      </>
                                    )}

                                    <Button
                                      variant="danger"
                                      className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-white border border-red-500/20"
                                      onClick={() => handleDeleteUser(user.id)}
                                    >
                                      <UserCog size={16} /> Del User
                                    </Button>

                                    <Button
                                      variant="danger"
                                      className="flex items-center justify-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20"
                                      onClick={() => handleDeleteVotes(user.id)}
                                    >
                                      <Trash2 size={16} /> Del Votes
                                    </Button>

                                    <Button
                                      variant="secondary"
                                      className="flex items-center justify-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20"
                                      onClick={() => handleAssignTeam(user)}
                                    >
                                      <Users size={16} /> Assign Team
                                    </Button>
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

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredUsers.map((user: User) => (
              <div
                key={user.id}
                className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg"
              >
                {/* Card Header - Always Visible */}
                <div
                  className="p-4 cursor-pointer active:bg-slate-700/30"
                  onClick={() =>
                    setExpandedUser(expandedUser === user.id ? null : user.id)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {expandedUser === user.id ? (
                          <ChevronDown size={16} className="text-indigo-400" />
                        ) : (
                          <ChevronRight size={16} className="text-slate-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span className="truncate">{user.name}</span>
                          <span
                            className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${onlineUsers.has(user.id) ? "bg-green-500 animate-pulse" : "bg-slate-500"}`}
                          ></span>
                        </div>
                        <div className="text-xs font-mono text-indigo-400">
                          {user.rollNo}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`flex-shrink-0 ml-2 inline-flex items-center justify-center min-w-[28px] h-7 rounded-lg text-xs font-bold ${Object.keys(user.votes).length > 0 ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "bg-slate-700 text-slate-500"}`}
                    >
                      {Object.values(user.votes).reduce(
                        (a: number, b: number) => a + b,
                        0,
                      )}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-400 truncate max-w-[60%]">
                      {user.dept}
                    </span>
                    <span className="text-slate-500 font-mono">
                      {user.lastVotedAt
                        ? new Date(user.lastVotedAt).toLocaleDateString()
                        : "---"}
                    </span>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedUser === user.id && (
                  <div className="border-t border-slate-700 p-4 bg-slate-900/40 space-y-4">
                    {/* Vote Breakdown */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Vote Breakdown
                      </h4>
                      <div className="bg-slate-800 rounded-xl border border-slate-700 p-3 space-y-2">
                        {Object.keys(user.votes).length > 0 ? (
                          Object.entries(user.votes).map(([tid, count]) => {
                            const team = data.teams.find(
                              (t: { id: string }) => t.id === tid,
                            );
                            return (
                              <div
                                key={tid}
                                className="flex justify-between items-center p-2 rounded-lg bg-slate-700/30"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  {team?.imageUrl && (
                                    <img
                                      src={team.imageUrl}
                                      className="w-6 h-6 rounded-md object-cover flex-shrink-0"
                                      alt=""
                                    />
                                  )}
                                  <span className="text-slate-200 text-sm font-medium truncate">
                                    {team?.name || "Unknown Team"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="font-bold text-white bg-slate-900 px-2 py-0.5 rounded-md text-xs">
                                    {count}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      showModal(
                                        "Delete Team Votes",
                                        `Delete ${count} vote(s) for "${team?.name || "this team"}"?`,
                                        "warning",
                                        async () => {
                                          try {
                                            await api.deleteUserTeamVotes(
                                              user.id,
                                              tid,
                                            );
                                            toast.success(
                                              `Votes for ${team?.name || "team"} deleted`,
                                            );
                                            refreshData();
                                          } catch (error: any) {
                                            toast.error(
                                              error.response?.data?.message ||
                                                "Failed to delete team votes",
                                            );
                                          }
                                        },
                                        {
                                          confirmVariant: "destructive",
                                          confirmLabel: "Delete",
                                        },
                                      );
                                    }}
                                    className="p-1 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-slate-500 text-sm italic">
                            No votes cast yet.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Contact
                      </h4>
                      <div className="bg-slate-800 rounded-xl border border-slate-700 p-3 text-sm space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Email</span>
                          <span className="text-slate-200 font-medium text-xs truncate max-w-[60%]">
                            {user.email}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Phone</span>
                          <span className="text-slate-200 font-medium">
                            {user.phone}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Year / Gender</span>
                          <span className="text-slate-200 font-medium">
                            {user.year} / {user.gender}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Device ID</span>
                          <span className="text-indigo-400 font-mono text-xs truncate max-w-[50%]">
                            {user.boundDeviceId
                              ? user.boundDeviceId.substring(0, 12) + "..."
                              : "Unbound"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      {adminRole === "SUPER_ADMIN" && (
                        <>
                          <Button
                            variant="secondary"
                            className="flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs py-2"
                            onClick={() => openResetPasswordModal(user.id)}
                          >
                            <Lock size={14} /> Reset PW
                          </Button>
                          <Button
                            variant="secondary"
                            className="flex items-center justify-center gap-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 text-xs py-2"
                            onClick={() => handleForceLogout(user.id)}
                          >
                            <LogOut size={14} /> Logout
                          </Button>
                        </>
                      )}
                      <Button
                        variant="danger"
                        className="flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-white border border-red-500/20 text-xs py-2"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <UserCog size={14} /> Del User
                      </Button>
                      <Button
                        variant="danger"
                        className="flex items-center justify-center gap-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 text-xs py-2"
                        onClick={() => handleDeleteVotes(user.id)}
                      >
                        <Trash2 size={14} /> Del Votes
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {data.users.length === 0 && (
              <div className="py-12 text-center text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-700">
                <Users className="mx-auto h-12 w-12 text-slate-600 mb-4" />
                <p>No students found.</p>
              </div>
            )}
          </div>

          {/* Pagination Removed for Users */}
        </div>
      )}

      {activeTab === "admins" && (
        <div className="max-w-7xl mx-auto">
          <div className="admin-glass rounded-2xl p-8 mb-6 border-l-4 border-l-indigo-500">
            <div className="flex max-sm:flex-col max-sm:gap-y-6 justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">
                  Administrator Management
                </h3>
                <p className="text-sm text-slate-400">
                  Manage admin access and security.
                </p>
              </div>
              <Button
                onClick={() => setCreateAdminOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2"
              >
                <Plus size={18} /> Create New Admin
              </Button>
            </div>
          </div>

          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/50 text-xs uppercase tracking-wider text-slate-400">
                    <th className="p-5 font-bold">Username</th>
                    <th className="p-5 font-bold">Role</th>
                    <th className="p-5 font-bold">Status</th>
                    <th className="p-5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {admins.map((admin) => (
                    <tr
                      key={admin._id}
                      className="hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="p-5">
                        <div className="font-bold text-white">
                          {admin.username}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          ID: {admin._id}
                        </div>
                      </td>
                      <td className="p-5">
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-bold ${admin.role === "SUPER_ADMIN" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"}`}
                        >
                          {admin.role}
                        </span>
                      </td>
                      <td className="p-5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${onlineAdmins.has(admin.username) ? "bg-green-500 animate-pulse" : "bg-slate-500"}`}
                          ></div>
                          <span className="text-slate-300 text-sm">
                            {onlineAdmins.has(admin.username)
                              ? "Online"
                              : "Offline"}
                          </span>
                        </div>
                      </td>
                      <td className="p-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {adminRole === "SUPER_ADMIN" &&
                            admin.username !== "superadmin" && ( // Prevent editing main superadmin if needed, or just self check in backend
                              <>
                                <Button
                                  variant="secondary"
                                  title="Reset Password"
                                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 p-2 h-auto"
                                  onClick={() => {
                                    setTargetAdminId(admin._id);
                                    setResetAdminPasswordOpen(true);
                                  }}
                                >
                                  <Lock size={16} />
                                </Button>
                                <Button
                                  variant="secondary"
                                  title="Force Logout"
                                  className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 p-2 h-auto"
                                  onClick={() =>
                                    handleForceLogoutAdmin(admin._id)
                                  }
                                >
                                  <LogOut size={16} />
                                </Button>
                                <Button
                                  variant="danger"
                                  title="Delete Admin"
                                  className="bg-red-500/10 hover:bg-red-500/20 text-white border border-red-500/20 p-2 h-auto"
                                  onClick={() => handleDeleteAdmin(admin._id)}
                                >
                                  <Trash2 size={16} />
                                </Button>
                              </>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {admins.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-8 text-center text-slate-500"
                      >
                        No administrators found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "audit_logs" && (
        <div className="max-w-7xl mx-auto">
          <AuditLogsTable />
        </div>
      )}

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
                    Session Start Time (IST)
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                      type="datetime-local"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none [color-scheme:dark]"
                      value={configForm.startTime}
                      onChange={(e: { target: { value: any } }) =>
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
                    Session End Time (IST)
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                      type="datetime-local"
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none [color-scheme:dark]"
                      value={configForm.endTime}
                      onChange={(e: { target: { value: any } }) =>
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

              {/* Session Override */}
              <div className="pt-6 border-t border-slate-700">
                <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Clock className="text-orange-500" />
                  Time Travel (Session Override)
                </h4>
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                  <div className="text-sm text-slate-400 mb-4">
                    <strong>Advanced:</strong> Set a custom date for the voting
                    session. This allows you to open a session for a past or
                    future date (e.g., "Yesterday's Voting"). All votes cast
                    while this is set will be recorded under this date.
                    <br />
                    <span className="text-orange-400">
                      Leave empty for normal operation.
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Override Session Date
                    </label>
                    <input
                      type="date"
                      className="w-full bg-slate-800 border border-slate-600 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:outline-none [color-scheme:dark]"
                      value={configForm.currentSessionDate}
                      onChange={(e) =>
                        setConfigForm({
                          ...configForm,
                          currentSessionDate: e.target.value,
                        })
                      }
                    />
                    {data.config?.currentSessionDate &&
                      !configForm.currentSessionDate && (
                        <p className="mt-2 text-xs text-indigo-400">
                          Currently Latched to:{" "}
                          {new Date(
                            data.config.currentSessionDate,
                          ).toLocaleDateString()}
                        </p>
                      )}
                    {data.config?.isVotingOpen &&
                      !data.config?.currentSessionDate && (
                        <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                          <AlertTriangle size={12} />
                          Warning: No date latched. Votes will be recorded on
                          whatever day they are cast.
                        </p>
                      )}
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

              <div className="flex justify-end max-sm:justify-center pt-4">
                <Button type="submit" className="px-8 py-3 text-lg">
                  Save Schedule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      <Modal {...modalState} />
      {/* Reset Password Modal */}
      {resetPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">
              Reset Password
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Enter a new permanent password for this user. They will be logged
              out of all active sessions.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  New Password
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setResetPasswordOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Reset Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Create Admin Modal */}
      {createAdminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">
              Create New Administrator
            </h3>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Username
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={adminForm.username}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, username: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Password
                </label>
                <input
                  type="password"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={adminForm.password}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, password: e.target.value })
                  }
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Role
                </label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={adminForm.role}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, role: e.target.value })
                  }
                >
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCreateAdminOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Create Admin
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Admin Password Modal */}
      {resetAdminPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">
              Reset Admin Password
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Enter a new password for this administrator.
            </p>
            <form onSubmit={handleResetAdminPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  New Password
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setResetAdminPasswordOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Reset Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === "leaderboard" && (
        <div className="max-w-6xl mx-auto">
          <div className="admin-glass rounded-2xl p-8">
            <AdminScoreManager />
          </div>
        </div>
      )}
    </div>
  );
};
