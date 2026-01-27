import React, { useState, useEffect } from 'react';
import { User, Team, VotingConfig } from '../../types';
import { api } from '../../services/api';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LogOut, CheckCircle2, AlertTriangle, Clock, Lock, Loader2, PartyPopper } from 'lucide-react';

interface StudentDashboardProps {
  user: User;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user: initialUser }) => {
  const [user, setUser] = useState<User>(initialUser);
  const [teams, setTeams] = useState<Team[]>([]);
  const [config, setConfig] = useState<VotingConfig>({
    isVotingOpen: false,
    startTime: null,
    endTime: null,
    dailyQuota: 100
  });

  // Local state for CURRENT session votes (always start at 0)
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Computed state: Has voted today?
  const hasVotedToday = React.useMemo(() => {
    if (!user.lastVotedAt) return false;
    return new Date(user.lastVotedAt).toDateString() === new Date().toDateString();
  }, [user.lastVotedAt]);

  // Load data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.getAdminData();
        setTeams(data.teams);

        if (data.config) {
          setConfig(data.config);
        }

        const refreshedUser = await api.getUserById(user.id);
        if (refreshedUser) {
          setUser(refreshedUser);
        }
      } catch (e) {
        console.error("Failed to fetch data", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Poll for status updates
    const interval = setInterval(async () => {
      const data = await api.getAdminData();
      if (data.config) {
        setConfig(prev => {
          if (prev.isVotingOpen !== data.config.isVotingOpen || prev.dailyQuota !== data.config.dailyQuota) {
            return data.config;
          }
          return prev;
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [user.id]);

  const totalUsed = (Object.values(votes) as number[]).reduce((a, b) => a + b, 0);
  const remaining = (config.dailyQuota || 0) - totalUsed;

  const handleVoteChange = (teamId: string, delta: number) => {
    if (!config.isVotingOpen) return;

    const current = votes[teamId] || 0;
    const next = current + delta;

    if (next < 0) return;
    if (delta > 0 && remaining <= 0) return;

    setVotes(prev => ({ ...prev, [teamId]: next }));
    setMessage(null);
  };

  const saveVotes = async () => {
    if (totalUsed === 0) {
      setMessage({ type: 'error', text: 'Please cast at least one vote.' });
      return;
    }
    if (!confirm("Are you sure? Once confirmed, you CANNOT change your votes for today.")) {
      return;
    }

    setSaving(true);
    try {
      const result = await api.castVote(user.id, votes);

      if (result.success) {
        // Refresh user immediately to update 'lastVotedAt'
        const refreshedUser = await api.getUserById(user.id);
        if (refreshedUser) setUser(refreshedUser);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || "Failed to submit votes" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
        <p>Syncing voting status...</p>
      </div>
    );
  }

  // 1. Check if voted today (Highest Priority View)
  if (hasVotedToday) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-6 animate-fade-in-up">
        <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-6 ring-2 ring-green-500/50">
          <PartyPopper className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Vote Recorded!</h2>
        <p className="text-slate-400 max-w-md text-lg">
          Thank you for participating in CWC 3.0. Your votes for today have been securely locked.
        </p>
        <div className="mt-8 p-6 bg-slate-800 rounded-xl border border-slate-700 max-w-md w-full">
          <p className="text-sm text-slate-500 uppercase tracking-wider mb-2">Status</p>
          <p className="text-xl font-bold text-white mb-4">Today's Chance Over</p>
          <p className="text-sm text-indigo-400 bg-indigo-500/10 py-2 px-4 rounded-lg inline-block">
            Please come back tomorrow to vote again.
          </p>
        </div>
      </div>
    );
  }

  // 2. Check if window is closed
  if (!config.isVotingOpen) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-6 animate-fade-in-up">
        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-12 h-12 text-slate-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Voting Window Closed</h2>
        <p className="text-slate-400 max-w-md">The voting lines are currently closed. Please wait for the Admin to open the next session.</p>
        {config.startTime && (
          <div className="mt-8 p-4 bg-slate-800 rounded-lg border border-slate-700">
            <p className="text-sm text-slate-400 uppercase tracking-wider">Session Status</p>
            <p className="text-xl font-mono text-indigo-400 mt-1">LOCKED</p>
          </div>
        )}
      </div>
    );
  }

  // 3. Voting Interface
  return (
    <div className="space-y-8 pb-20 animate-fade-in-up">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-indigo-900/50 to-slate-900 border-indigo-500/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <span className="text-xl font-bold text-indigo-400">{user.name.charAt(0)}</span>
            </div>
            <div>
              <h3 className="font-bold text-white">{user.name}</h3>
              <p className="text-xs text-indigo-300 font-mono">{user.rollNo}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-slate-400 uppercase">Daily Quota</p>
              <p className="text-2xl font-bold text-white">{config.dailyQuota}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase">Remaining</p>
              <p className={`text-4xl font-bold ${remaining < 10 ? 'text-red-500' : 'text-green-500'}`}>{remaining}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-slate-800 border-slate-700 flex items-center justify-center">
          {message ? (
            <div className={`flex items-center gap-2 ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
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
        {teams.map(team => {
          const currentVotes = votes[team.id] || 0;
          return (
            <div key={team.id} className="group relative bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 hover:border-indigo-500 transition-all shadow-xl">
              <div className="aspect-video w-full overflow-hidden">
                <img src={team.imageUrl} alt={team.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-90" />
                <div className="absolute bottom-4 left-4">
                  <h3 className="text-xl font-bold text-white">{team.name}</h3>
                  <p className="text-xs text-slate-300 line-clamp-1">{team.description}</p>
                </div>
              </div>

              <div className="p-4 flex items-center justify-between bg-slate-900/50 backdrop-blur-sm">
                <button
                  onClick={() => handleVoteChange(team.id, -1)}
                  className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center text-xl font-bold disabled:opacity-50"
                  disabled={currentVotes === 0}
                >
                  -
                </button>

                <div className="text-center">
                  <span className="text-3xl font-bold text-white font-mono">{currentVotes}</span>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Votes</p>
                </div>

                <button
                  onClick={() => handleVoteChange(team.id, 1)}
                  className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center text-xl font-bold disabled:opacity-50 disabled:bg-slate-700"
                  disabled={remaining === 0}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-50">
        <Button
          onClick={saveVotes}
          isLoading={saving}
          disabled={totalUsed === 0 && Object.keys(votes).length === 0}
          className="w-full max-w-md shadow-2xl py-4 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500"
        >
          Confirm & Lock {totalUsed} Votes
        </Button>
      </div>
    </div>
  );
};