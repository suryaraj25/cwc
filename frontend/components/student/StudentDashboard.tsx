import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { User, Team, VotingConfig } from "../../types";
import { api } from "../../services/api";
import { useAuthStore } from "../../stores/useAuthStore";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { LoadingState } from "../ui/LoadingState";
import { VotingClosedState } from "./VotingClosedState";
import { TeamVoteCard } from "./TeamVoteCard";
import { Modal, ModalProps } from "../ui/Modal";
import { toast } from "../../stores/useToastStore";

interface StudentDashboardProps {}

export const StudentDashboard: React.FC<StudentDashboardProps> = () => {
  const { user: storeUser } = useAuthStore();
  // We keep local 'user' state to handle data refreshes like 'votesUsedToday' updates without polluting store
  // OR we can trust the store user if we update store on sync.
  // For safety, let's init local user from store and update it.
  const [user, setUser] = useState<User | null>(storeUser);
  const [teams, setTeams] = useState<Team[]>([]);
  const [config, setConfig] = useState<VotingConfig>({
    isVotingOpen: false,
    startTime: null,
    endTime: null,
    dailyQuota: 100,
  });

  // Local state for CURRENT session votes (always start at 0)
  const [votes, setVotes] = useState<Record<string, number>>({});
  console.log("votes", votes);

  // Track votes already used on server
  const [serverUsedVotes, setServerUsedVotes] = useState(0);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // Load data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Use public endpoints instead of admin endpoint
        const [teamsData, configData] = await Promise.all([
          api.getTeams(),
          api.getVotingConfig(),
        ]);
        setTeams(teamsData);
        setConfig(configData);

        // Use checkSession (calling /me) to get accurate daily usage
        const { user: refreshedUser, votesUsedToday } =
          await api.checkSession();
        if (refreshedUser) {
          setUser(refreshedUser);
          if (votesUsedToday !== undefined) {
            setServerUsedVotes(votesUsedToday);
          }
        }
      } catch (e) {
        console.error("Failed to fetch data", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Socket Connection for Real-time Updates
    // NOTE: In production, use env variable for URL
    const socket = io("https://cwc-b4ir.onrender.com", {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("Connected to WebSocket");
    });

    socket.on("admin:data-update", () => {
      console.log("Received Real-time Update");
      fetchData(); // Reload config
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id]);

  const totalCurrentSession = (Object.values(votes) as number[]).reduce(
    (a, b) => a + b,
    0,
  );
  const totalUsed = serverUsedVotes + totalCurrentSession;
  const remaining = (config.dailyQuota || 0) - totalUsed;

  const handleVoteChange = (teamId: string, delta: number) => {
    if (!config.isVotingOpen) return;

    const current = votes[teamId] || 0;
    const next = current + delta;

    if (next < 0) return;
    if (delta > 0 && remaining <= 0) return;

    setVotes((prev) => ({ ...prev, [teamId]: next }));
    setMessage(null);
  };

  const saveVotes = () => {
    if (totalUsed === 0) {
      toast.error("Please cast at least one vote.");
      return;
    }

    showModal(
      "Confirm Votes",
      "Are you sure? Once confirmed, you CANNOT change your votes for today.",
      "confirm",
      async () => {
        setSaving(true);
        try {
          if (!user) throw new Error("User not found");
          const result = await api.castVote(user.id, votes);

          if (result.success) {
            setVotes({}); // Clear local selection
            toast.success("Votes submitted successfully!");

            // Refresh quota usage
            const { user: refreshedUser, votesUsedToday } =
              await api.checkSession();
            if (refreshedUser) {
              setUser(refreshedUser);
              if (votesUsedToday !== undefined) {
                setServerUsedVotes(votesUsedToday);
              }
            }
          } else {
            toast.error(result.message);
          }
        } catch (e: any) {
          toast.error(e.message || "Failed to submit votes");
        } finally {
          setSaving(false);
        }
      },
    );
  };

  if (isLoading) {
    return <LoadingState message="Syncing voting status..." />;
  }

  // 2. Check if window is closed
  if (!config.isVotingOpen) {
    return <VotingClosedState config={config} />;
  }

  // 3. Voting Interface
  return (
    <div className="space-y-8 pb-20 animate-fade-in-up">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-indigo-900/50 to-slate-900 border-indigo-500/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <span className="text-xl font-bold text-indigo-400">
                {user?.name?.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-white">{user?.name}</h3>
              <p className="text-xs text-indigo-300 font-mono">
                {user?.rollNo}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-400 uppercase">Daily Quota</p>
              <p className="text-2xl font-bold text-white">
                {config.dailyQuota}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase">Remaining</p>
              <p
                className={`text-4xl font-bold ${remaining < 10 ? "text-red-500" : "text-green-500"}`}
              >
                {remaining}
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-800 border-slate-700 flex items-center justify-center">
          {message ? (
            <div
              className={`flex items-center gap-2 ${message.type === "success" ? "text-green-400" : "text-red-400"}`}
            >
              {message.type === "success" ? (
                <CheckCircle2 size={20} />
              ) : (
                <AlertTriangle size={20} />
              )}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500">
              <Clock size={20} />
              <span className="text-sm">Session Active</span>
            </div>
          )}
        </Card>
      </div>

      {/* Voting Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => {
          const currentVotes = votes[team.id] || 0;
          return (
            <TeamVoteCard
              key={team.id}
              team={team}
              currentVotes={currentVotes}
              handleVoteChange={handleVoteChange}
              remaining={remaining}
            />
          );
        })}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center px-6 z-50">
        <Button
          onClick={saveVotes}
          isLoading={saving}
          disabled={totalCurrentSession === 0}
          className="w-full max-w-md shadow-2xl py-4 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
        >
          Confirm & Lock {totalUsed} Votes
        </Button>
      </div>
      <Modal {...modalState} />
    </div>
  );
};
