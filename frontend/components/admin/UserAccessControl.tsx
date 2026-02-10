import React, { useState, useEffect } from "react";
import {
  Users,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Lock,
  Unlock,
} from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { api } from "../../services/api";
import { toast } from "../../stores/useToastStore";
import { User } from "../../types";

export const UserAccessControl: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "pending" | "whitelist" | "blacklist"
  >("pending");
  const [loading, setLoading] = useState(false);

  // Data States
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [whitelist, setWhitelist] = useState<any[]>([]);
  const [blacklist, setBlacklist] = useState<any[]>([]);

  // Inputs
  const [newWhitelistEmail, setNewWhitelistEmail] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "pending") {
        const users = await api.getPendingUsers();
        setPendingUsers(users);
      } else if (activeTab === "whitelist") {
        const emails = await api.getWhitelist();
        setWhitelist(emails);
      } else if (activeTab === "blacklist") {
        const users = await api.getBlacklist();
        setBlacklist(users);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Actions
  const handleApprove = async (userId: string) => {
    try {
      await api.approveUser(userId);
      toast.success("User approved");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve");
    }
  };

  const handleBlock = async (userId: string) => {
    try {
      await api.blockUser(userId, blockReason || "Violation of rules");
      toast.success("User blocked");
      setBlockReason("");
      setSelectedUserId(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to block");
    }
  };

  const handleAddToWhitelist = async () => {
    if (!newWhitelistEmail) return;
    try {
      await api.addToWhitelist([newWhitelistEmail]);
      toast.success("Email added to whitelist");
      setNewWhitelistEmail("");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to add to whitelist");
    }
  };

  const handleRemoveFromWhitelist = async (id: string) => {
    try {
      await api.removeFromWhitelist(id);
      toast.success("Removed from whitelist");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove");
    }
  };

  const handleUnblock = async (id: string) => {
    try {
      await api.removeFromBlacklist(id);
      toast.success("User unblocked");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to unblock");
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "pending"
              ? "bg-indigo-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          Pending Approvals
          {pendingUsers.length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 rounded-full">
              {pendingUsers.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("whitelist")}
          className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "whitelist"
              ? "bg-indigo-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Whitelist
        </button>
        <button
          onClick={() => setActiveTab("blacklist")}
          className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "blacklist"
              ? "bg-indigo-600 text-white"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Blacklist
        </button>
      </div>

      {loading && (
        <div className="text-center text-slate-400 py-8">Loading...</div>
      )}

      {!loading && activeTab === "pending" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingUsers.length === 0 ? (
            <p className="text-slate-400 col-span-full text-center py-8">
              No pending approvals.
            </p>
          ) : (
            pendingUsers.map((user) => (
              <Card key={user.id} className="bg-slate-800 border-slate-700">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-white">{user.name}</h3>
                    <p className="text-sm text-slate-400">{user.email}</p>
                    <p className="text-xs text-slate-500">
                      {user.rollNo} • {user.dept}
                    </p>
                  </div>
                  <span className="bg-yellow-500/10 text-yellow-500 text-xs px-2 py-1 rounded">
                    Pending
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-500 py-1.5 text-xs"
                    onClick={() => handleApprove(user.id)}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1 py-1.5 text-xs"
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <Lock className="w-4 h-4 mr-1" /> Block
                  </Button>
                </div>
                {selectedUserId === user.id && (
                  <div className="mt-4 p-3 bg-slate-900/50 rounded animate-fade-in-up">
                    <Input
                      label="Reason"
                      placeholder="Reason for blocking..."
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      className="mb-2 text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        className="text-slate-400 text-xs hover:text-white"
                        onClick={() => setSelectedUserId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className="text-red-400 text-xs hover:text-red-300 font-bold"
                        onClick={() => handleBlock(user.id)}
                      >
                        Confirm Block
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {!loading && activeTab === "whitelist" && (
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <Input
              label="Email"
              placeholder="Add email to whitelist (e.g., student@example.com)"
              value={newWhitelistEmail}
              onChange={(e) => setNewWhitelistEmail(e.target.value)}
              className="max-w-md"
            />
            <Button
              onClick={handleAddToWhitelist}
              disabled={!newWhitelistEmail}
              className="h-fit py-3 mt-2 px-6 rounded-md"
            >
              <Plus className="w-4 h-4 mr-2" /> Add
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {whitelist.map((item: any) => (
              <div
                key={item._id}
                className="flex justify-between items-center bg-slate-800 p-3 rounded border border-slate-700"
              >
                <span className="text-slate-300">{item.email}</span>
                <button
                  onClick={() => handleRemoveFromWhitelist(item._id)}
                  className="text-slate-500 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {whitelist.length === 0 && (
              <p className="text-slate-400">Whitelist is empty.</p>
            )}
          </div>
        </div>
      )}

      {!loading && activeTab === "blacklist" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {blacklist.length === 0 ? (
            <p className="text-slate-400 col-span-full text-center py-8">
              No blacklisted users.
            </p>
          ) : (
            blacklist.map((user: any) => (
              <Card key={user._id} className="bg-slate-800 border-red-900/30">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-white">{user.email}</h3>
                    <p className="text-sm text-slate-400">{user.rollNo}</p>
                    <p className="text-xs text-red-400 mt-1">
                      Reason: {user.reason}
                    </p>
                  </div>
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                </div>
                <Button
                  variant="secondary"
                  className="w-full border-slate-600 hover:bg-slate-700 py-1.5 text-xs"
                  onClick={() => handleUnblock(user._id)}
                >
                  <Unlock className="w-4 h-4 mr-1" /> Unblock
                </Button>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};
