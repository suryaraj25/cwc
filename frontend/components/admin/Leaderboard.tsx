import React, { useEffect, useState } from "react";
import { Trophy, TrendingUp, Calendar } from "lucide-react";
import { Card } from "../ui/Card";
import { api } from "../../services/api";
import { useAuthStore } from "../../stores/useAuthStore";
import { UserRole, VotingConfig } from "../../types";

interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  totalScore?: number;
  lastScore?: number;
  score?: number;
  advantage?: number;
  main?: number;
  special?: number;
  elimination?: number;
  immunity?: number;
  studentVotes?: number;
  lastUpdated: string | null;
}

interface LeaderboardProps {
  config?: VotingConfig;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ config }) => {
  const { role } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    config?.currentSessionDate || new Date().toISOString().split("T")[0],
  );
  const [viewType, setViewType] = useState<"total" | "daily">("total");

  useEffect(() => {
    if (config?.currentSessionDate) {
      setSelectedDate(config.currentSessionDate);
    }
  }, [config?.currentSessionDate]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        let data;
        if (viewType === "total") {
          data = await api.getLeaderboard();
        } else {
          data = await api.getDailyLeaderboard(selectedDate);
        }
        setLeaderboard(data.leaderboard || []);
      } catch (error) {
        console.error("Failed to fetch leaderboard", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [viewType, selectedDate]);

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return "🥇";
      case 2:
        return "🥈";
      case 3:
        return "🥉";
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin">
          <Trophy className="w-12 h-12 text-indigo-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-500" />
          <h2 className="text-3xl font-bold text-white">Leaderboard</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewType("total")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewType === "total"
                ? "bg-indigo-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            Total Score
          </button>
          <button
            onClick={() => setViewType("daily")}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              viewType === "daily"
                ? "bg-indigo-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            Daily Score
          </button>
        </div>
      </div>

      {/* Date Picker for Daily View */}
      {viewType === "daily" && (
        <div className="flex gap-3 items-center">
          <Calendar className="w-5 h-5 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg border border-slate-700 focus:border-indigo-500 outline-none"
          />
        </div>
      )}

      {/* Leaderboard Table/Cards */}
      <div className="space-y-3">
        {leaderboard.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700 p-8 text-center">
            <p className="text-slate-400">No teams available</p>
          </Card>
        ) : (
          leaderboard.map((team) => (
            <Card
              key={team.id}
              className={`bg-gradient-to-r border transition-all ${
                team.rank === 1
                  ? "from-yellow-900/30 to-slate-800 border-yellow-500/50"
                  : team.rank === 2
                    ? "from-gray-700/30 to-slate-800 border-gray-400/50"
                    : team.rank === 3
                      ? "from-orange-900/30 to-slate-800 border-orange-700/50"
                      : "from-slate-800 to-slate-900 border-slate-700 hover:border-indigo-500/50"
              }`}
            >
              <div className="flex items-center gap-4 p-4">
                {/* Rank */}
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-700/50">
                  {getMedalIcon(team.rank) ? (
                    <span className="text-2xl">{getMedalIcon(team.rank)}</span>
                  ) : (
                    <span className="text-lg font-bold text-slate-300">
                      #{team.rank}
                    </span>
                  )}
                </div>

                {/* Team Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">
                    {team.name}
                  </h3>
                  <p className="text-sm text-slate-400 truncate">
                    {team.description}
                  </p>
                </div>

                {/* Score Display */}
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold text-white">
                        {viewType === "total"
                          ? team.totalScore || 0
                          : team.score || 0}
                      </p>
                      <p className="text-xs text-slate-400">
                        {viewType === "total" ? "Total" : "Today's"}
                      </p>
                    </div>
                  </div>
                  {viewType === "total" && team.lastUpdated && (
                    <p className="text-xs text-slate-500 mt-2">
                      Last: {new Date(team.lastUpdated).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              {/* Breakdown Display - Only visible to ADMINS */}
              {role === UserRole.ADMIN && (
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-6 gap-1 text-[10px] sm:text-xs text-slate-400 bg-slate-900/40 p-2 rounded-lg border border-slate-700/30">
                    <div className="flex flex-col items-center border-r border-slate-700/50">
                      <span className="font-bold text-indigo-400">ADV</span>
                      <span className="text-white font-mono">
                        {team.advantage || 0}
                      </span>
                    </div>
                    <div className="flex flex-col items-center border-r border-slate-700/50">
                      <span className="font-bold text-indigo-400">MAIN</span>
                      <span className="text-white font-mono">
                        {team.main || 0}
                      </span>
                    </div>
                    <div className="flex flex-col items-center border-r border-slate-700/50">
                      <span className="font-bold text-indigo-400">SPL</span>
                      <span className="text-white font-mono">
                        {team.special || 0}
                      </span>
                    </div>
                    <div className="flex flex-col items-center border-r border-slate-700/50">
                      <span className="font-bold text-indigo-400">ELIM</span>
                      <span className="text-white font-mono">
                        {team.elimination || 0}
                      </span>
                    </div>
                    <div className="flex flex-col items-center border-r border-slate-700/50">
                      <span className="font-bold text-indigo-400">IMM</span>
                      <span className="text-white font-mono">
                        {team.immunity || 0}
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-green-500">VOTES</span>
                      <span className="text-white font-mono">
                        {team.studentVotes || 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
