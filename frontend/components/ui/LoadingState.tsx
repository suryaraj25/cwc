import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading...",
}) => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-500">
      <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
      <p>{message}</p>
    </div>
  );
};
