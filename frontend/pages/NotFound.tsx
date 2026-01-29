import React from "react";
import { useNavigate } from "react-router-dom";
import { Ghost, Home, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/Button";

export const NotFound: React.FC = () => {
  const navigate = useNavigate();
  React.useEffect(() => {
    console.log("NotFound Component Mounted");
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-slate-900 to-purple-500/10 pointer-events-none" />

      <div className="relative text-center space-y-8 max-w-lg mx-auto">
        {/* Animated Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-pulse" />
            <Ghost
              className="w-32 h-32 text-indigo-400 animate-bounce"
              strokeWidth={1.5}
            />
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-4">
          <h1 className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-purple-500">
            404
          </h1>
          <h2 className="text-2xl font-bold text-white">Page Not Found</h2>
          <p className="text-slate-400 text-lg">
            Oops! It seems you've ventured into the void. The page you are
            looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button
            onClick={() => navigate(-1)}
            variant="secondary"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-600 transition-all p-3"
          >
            <ArrowLeft size={18} />
            Go Back
          </Button>

          <Button
            onClick={() => navigate("/")}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition-all p-3"
          >
            <Home size={18} />
            Back to Home
          </Button>
        </div>
      </div>

      {/* Footer Decoration */}
      <div className="absolute bottom-8 text-center text-slate-600 text-xs text-nowrap">
        Code Warriors Council • 404 Error
      </div>
    </div>
  );
};
