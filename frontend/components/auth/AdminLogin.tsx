import React, { useState } from "react";
import { api } from "../../services/api";
import { useAuthStore } from "../../stores/useAuthStore";
import { useNavigate } from "react-router-dom";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { ShieldCheck, LockKeyhole } from "lucide-react";

interface AdminLoginProps {}

export const AdminLogin: React.FC<AdminLoginProps> = () => {
  const { adminLogin } = useAuthStore();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await api.adminLogin(username, password);
      if (result.success && result.adminId) {
        adminLogin(result.adminId);
        navigate("/admin");
      } else {
        setError(result.message);
      }
    } catch (e) {
      setError("Connection failed");
    }
  };

  return (
    <div className="max-w-sm w-full mx-auto animate-fade-in-up">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4 ring-2 ring-red-500/50">
          <ShieldCheck className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Admin Control</h2>
        <p className="text-slate-400 text-sm">Authorized Personnel Only</p>
      </div>

      <Card className="border-t-4 border-t-red-500">
        <form onSubmit={handleLogin}>
          {error && (
            <p className="text-red-500 text-sm mb-4 text-center bg-red-500/10 p-2 rounded">
              {error}
            </p>
          )}
          <Input
            label="Admin ID"
            value={username}
            onChange={(e) => setUsername(e.target.value.toUpperCase())}
            placeholder="BIT123"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            required
          />
          <Button variant="danger" type="submit" className="w-full mt-4">
            <LockKeyhole className="w-4 h-4 mr-2" /> Access Dashboard
          </Button>
        </form>
      </Card>
    </div>
  );
};
