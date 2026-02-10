import React from "react";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

export const AccountBlacklisted: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 mb-4 ring-2 ring-red-500/50">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Account Blacklisted
          </h2>
          <p className="text-slate-400">
            Access to this platform has been restricted.
          </p>
        </div>

        <Card className="border-t-4 border-t-red-500 bg-slate-800/50 backdrop-blur">
          <div className="space-y-4 text-center">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-200 text-sm font-medium">
                Your account has been flagged for violation of platform rules
                and added to the blacklist.
              </p>
            </div>
            <p className="text-slate-400 text-sm">
              If you believe this is a mistake, please contact the system
              administrator.
            </p>

            <div className="pt-4">
              <Link to="/">
                <Button variant="secondary" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
