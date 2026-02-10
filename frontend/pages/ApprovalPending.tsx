import React from "react";
import { Clock, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

export const ApprovalPending: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-500/10 mb-4 ring-2 ring-yellow-500/50">
            <Clock className="w-10 h-10 text-yellow-500" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Approval Pending
          </h2>
          <p className="text-slate-400">
            Your account is currently under review.
          </p>
        </div>

        <Card className="border-t-4 border-t-yellow-500 bg-slate-800/50 backdrop-blur">
          <div className="space-y-4 text-center">
            <p className="text-slate-300">
              Thank you for registering! Your account details have been
              submitted successfully.
            </p>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-yellow-200 text-sm">
                Please wait for an administrator to approve your account. You
                will be able to login once your account is verified.
              </p>
            </div>

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
