import React from "react";
import { Lock } from "lucide-react";
import { VotingConfig } from "../../types";

interface VotingClosedStateProps {
  config: VotingConfig;
}

export const VotingClosedState: React.FC<VotingClosedStateProps> = ({
  config,
}) => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-6 animate-fade-in-up">
      <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6">
        <Lock className="w-12 h-12 text-slate-500" />
      </div>
      <h2 className="text-3xl font-bold text-white mb-2">
        Voting Window Closed
      </h2>
      <p className="text-slate-400 max-w-md">
        The voting lines are currently closed. Please wait for the Admin to open
        the next session.
      </p>
      {config.startTime && (
        <div className="mt-8 p-4 bg-slate-800 rounded-lg border border-slate-700">
          <p className="text-sm text-slate-400 uppercase tracking-wider">
            Session Status
          </p>
          <p className="text-xl font-mono text-indigo-400 mt-1">LOCKED</p>
        </div>
      )}
    </div>
  );
};
