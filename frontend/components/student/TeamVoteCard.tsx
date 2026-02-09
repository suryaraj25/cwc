import React from "react";
import { Team } from "../../types";

interface TeamVoteCardProps {
  team: Team;
  currentVotes: number;
  userTotalVotes: number;
  handleVoteChange: (teamId: string, delta: number) => void;
  remaining: number;
}

export const TeamVoteCard: React.FC<TeamVoteCardProps> = ({
  team,
  currentVotes,
  userTotalVotes,
  handleVoteChange,
  remaining,
}) => {
  return (
    <div className="group relative bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 hover:border-indigo-500 transition-all shadow-xl">
      <div className="aspect-video w-full overflow-hidden relative">
        <img
          src={team.imageUrl}
          alt={team.name}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-90" />
        <div className="absolute bottom-4 left-4">
          <h3 className="text-xl font-bold text-white">{team.name}</h3>
          <p className="text-xs text-slate-300 line-clamp-1">
            {team.description}
          </p>
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
          <div>
            <span className="text-2xl font-bold text-white font-mono">
              {userTotalVotes}
            </span>
            <p className="text-[9px] text-slate-400 uppercase tracking-widest">
              Total Votes
            </p>
          </div>
          {currentVotes > 0 && (
            <div className="mt-1 pt-1 border-t border-slate-600">
              <span className="text-sm font-semibold text-indigo-400">
                +{currentVotes}
              </span>
              <p className="text-[9px] text-indigo-400 uppercase tracking-widest">
                This Session
              </p>
            </div>
          )}
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
};
