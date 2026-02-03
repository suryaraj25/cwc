import React, { useState } from "react";
import { User } from "../../types";
import { DEPARTMENTS } from "../../constants";
import { api } from "../../services/api";
import { useAuthStore } from "../../stores/useAuthStore";
import { useNavigate } from "react-router-dom";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { UserPlus, LogIn, Lock, AlertCircle, KeyRound } from "lucide-react";

interface StudentAuthProps {}

const BITS_EMAIL_REGEX = /^[a-z]+(\.[a-z]{2,5}[0-9]{2})@bitsathy\.ac\.in$/;

export const StudentAuth: React.FC<StudentAuthProps> = () => {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Password change state
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [passwordChangeForm, setPasswordChangeForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    rollNo: "",
    dept: "",
    email: "",
    phone: "",
    gender: "Male",
    year: "1",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handlePasswordChangeInput = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setPasswordChangeForm({
      ...passwordChangeForm,
      [e.target.name]: e.target.value,
    });
    setError(null);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (
        passwordChangeForm.newPassword !== passwordChangeForm.confirmNewPassword
      ) {
        throw new Error("New passwords do not match");
      }
      if (passwordChangeForm.newPassword.length < 6) {
        throw new Error("New password must be at least 6 characters");
      }

      const result = await api.changePassword(
        passwordChangeForm.currentPassword,
        passwordChangeForm.newPassword,
      );

      if (result.success && pendingUser) {
        // Password changed successfully, proceed to dashboard
        login(pendingUser);
        navigate("/dashboard");
      } else {
        setError(result.message || "Failed to change password");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        // Validation
        if (formData.password !== formData.confirmPassword)
          throw new Error("Passwords do not match");
        if (!formData.rollNo || !formData.email || !formData.name)
          throw new Error("All fields are required");
        if (!BITS_EMAIL_REGEX.test(formData.email)) {
          throw new Error(
            "Invalid email format. Use format like name.dept-year@bitsathy.ac.in",
          );
        }
        const result = await api.register({
          name: formData.name,
          rollNo: formData.rollNo,
          dept: formData.dept,
          email: formData.email,
          phone: formData.phone,
          gender: formData.gender as any,
          year: formData.year,
          passwordHash: formData.password,
        });

        if (result.success) {
          // Auto login after register
          const loginResult = await api.login(
            formData.rollNo,
            formData.password,
          );
          if (loginResult.success && loginResult.user) {
            localStorage.setItem("cwc_voting_user_id", loginResult.user.id);
            login(loginResult.user);
            navigate("/dashboard");
          } else {
            console.log("loginResult", loginResult);
            setError(loginResult.message);
          }
        } else {
          setError(result.message);
        }
      } else {
        // Login
        if (!BITS_EMAIL_REGEX.test(formData.email)) {
          throw new Error(
            "Invalid email format. Use format like name.dept-year@bitsathy.ac.in",
          );
        }
        const result = await api.login(
          formData.rollNo || formData.email,
          formData.password,
        );
        if (result.success && result.user) {
          console.log("result", result);
          localStorage.setItem("cwc_voting_user_id", result.user.id);

          // Check if user must change password
          if (result.user.mustChangePassword) {
            setPendingUser(result.user);
            setMustChangePassword(true);
            setPasswordChangeForm({
              currentPassword: formData.password, // Pre-fill with login password
              newPassword: "",
              confirmNewPassword: "",
            });
          } else {
            login(result.user);
            navigate("/dashboard");
          }
        } else {
          console.log("result", result);
          setError(result.message);
        }
      }
    } catch (err: any) {
      console.log("err", err.message);
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Password Change Form UI
  if (mustChangePassword) {
    return (
      <div className="max-w-md w-full mx-auto animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 mb-4 ring-2 ring-amber-500/50">
            <KeyRound className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Change Password
          </h2>
          <p className="text-slate-400 text-sm">
            Your password was reset by an administrator. Please set a new
            password to continue.
          </p>
        </div>

        <Card className="border-t-4 border-t-amber-500">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              name="currentPassword"
              value={passwordChangeForm.currentPassword}
              onChange={handlePasswordChangeInput}
              placeholder="Enter your current password"
              required
            />
            <Input
              label="New Password"
              type="password"
              name="newPassword"
              value={passwordChangeForm.newPassword}
              onChange={handlePasswordChangeInput}
              placeholder="Enter new password (min 6 chars)"
              required
            />
            <Input
              label="Confirm New Password"
              type="password"
              name="confirmNewPassword"
              value={passwordChangeForm.confirmNewPassword}
              onChange={handlePasswordChangeInput}
              placeholder="Confirm new password"
              required
            />

            <Button type="submit" className="w-full mt-6" isLoading={loading}>
              <KeyRound className="w-4 h-4 mr-2" /> Update Password
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full mx-auto animate-fade-in-up">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/10 mb-4 ring-2 ring-indigo-500/50">
          <Lock className="w-8 h-8 text-indigo-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Student Portal</h2>
        <p className="text-slate-400 text-sm">One Account • Secure Voting</p>
      </div>

      <Card className="border-t-4 border-t-indigo-500">
        <div className="flex justify-between mb-6 border-b border-slate-700 pb-4">
          <button
            className={`flex-1 pb-2 text-sm font-medium transition-colors ${!isRegistering ? "text-indigo-400 border-b-2 border-indigo-400" : "text-slate-500 hover:text-slate-300"}`}
            onClick={() => setIsRegistering(false)}
          >
            Login
          </button>
          <button
            className={`flex-1 pb-2 text-sm font-medium transition-colors ${isRegistering ? "text-indigo-400 border-b-2 border-indigo-400" : "text-slate-500 hover:text-slate-300"}`}
            onClick={() => setIsRegistering(true)}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering ? (
            <>
              <Input
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Roll No"
                  name="rollNo"
                  value={formData.rollNo}
                  onChange={handleChange}
                  placeholder="7376..."
                  required
                />
                <Select
                  label="Year"
                  name="year"
                  options={["1", "2", "3", "4"]}
                  value={formData.year}
                  onChange={handleChange}
                  required
                />
              </div>
              <Select
                label="Department"
                name="dept"
                options={DEPARTMENTS}
                value={formData.dept}
                onChange={handleChange}
                required
              />
              <Input
                label="Email (@bitsathy.ac.in)"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="student@bitsathy.ac.in"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="9876543210"
                  required
                />
                <Select
                  label="Gender"
                  name="gender"
                  options={["Male", "Female", "Other"]}
                  value={formData.gender}
                  onChange={handleChange}
                  required
                />
              </div>
              <Input
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <Input
                label="Confirm Password"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </>
          ) : (
            <>
              <Input
                label="Email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter Email"
                required
              />
              <Input
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </>
          )}

          <Button type="submit" className="w-full mt-6" isLoading={loading}>
            {isRegistering ? (
              <>
                <UserPlus className="w-4 h-4 mr-2" /> Register
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" /> Login
              </>
            )}
          </Button>
        </form>
      </Card>

      <p className="text-center text-xs text-slate-500 mt-6 max-w-xs mx-auto">
        Secure Voting Platform
      </p>
    </div>
  );
};
