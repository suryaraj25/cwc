import React, { useState } from 'react';
import { User } from '../../types';
import { DEPARTMENTS } from '../../constants';
import { api, getThisDeviceId } from '../../services/api';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { UserPlus, LogIn, Lock, AlertCircle } from 'lucide-react';

interface StudentAuthProps {
  onLoginSuccess: (user: User) => void;
}

export const StudentAuth: React.FC<StudentAuthProps> = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    rollNo: '',
    dept: '',
    email: '',
    phone: '',
    gender: 'Male',
    year: '1',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const deviceId = getThisDeviceId();

      if (isRegistering) {
        // Validation
        if (formData.password !== formData.confirmPassword) throw new Error("Passwords do not match");
        if (!formData.rollNo || !formData.email || !formData.name) throw new Error("All fields are required");

        const result = await api.register({
          name: formData.name,
          rollNo: formData.rollNo,
          dept: formData.dept,
          email: formData.email,
          phone: formData.phone,
          gender: formData.gender as any,
          year: formData.year,
          passwordHash: formData.password,
          // deviceId is explicitly handled in login, but register might implicit bind if backend logic changed.
          // our backend register doesn't require deviceId, but login does. 
          // After register, user usually logs in.
        });

        if (result.success) {
          // Auto login after register
          const loginResult = await api.login(formData.rollNo, formData.password, deviceId);
          if (loginResult.success && loginResult.user) {
            onLoginSuccess(loginResult.user);
          } else {
            setError(loginResult.message);
          }
        } else {
          setError(result.message);
        }
      } else {
        // Login
        const result = await api.login(formData.rollNo || formData.email, formData.password, deviceId);
        if (result.success && result.user) {
          onLoginSuccess(result.user);
        } else {
          setError(result.message);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/10 mb-4 ring-2 ring-indigo-500/50">
          <Lock className="w-8 h-8 text-indigo-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Student Portal</h2>
        <p className="text-slate-400 text-sm">One Account • One Device • Secure Voting</p>
      </div>

      <Card className="border-t-4 border-t-indigo-500">
        <div className="flex justify-between mb-6 border-b border-slate-700 pb-4">
          <button
            className={`flex-1 pb-2 text-sm font-medium transition-colors ${!isRegistering ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
            onClick={() => setIsRegistering(false)}
          >
            Login
          </button>
          <button
            className={`flex-1 pb-2 text-sm font-medium transition-colors ${isRegistering ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
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
              <Input label="Full Name" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" required />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Roll No" name="rollNo" value={formData.rollNo} onChange={handleChange} placeholder="7376..." required />
                <Select label="Year" name="year" options={['1', '2', '3', '4']} value={formData.year} onChange={handleChange} required />
              </div>
              <Select label="Department" name="dept" options={DEPARTMENTS} value={formData.dept} onChange={handleChange} required />
              <Input label="Email (@bitsathy.ac.in)" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="student@bitsathy.ac.in" required />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="9876543210" required />
                <Select label="Gender" name="gender" options={['Male', 'Female', 'Other']} value={formData.gender} onChange={handleChange} required />
              </div>
              <Input label="Password" type="password" name="password" value={formData.password} onChange={handleChange} required />
              <Input label="Confirm Password" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
            </>
          ) : (
            <>
              <Input label="Roll No or Email" name="rollNo" value={formData.rollNo} onChange={handleChange} placeholder="Enter Roll No or Email" required />
              <Input label="Password" type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required />
            </>
          )}

          <Button type="submit" className="w-full mt-6" isLoading={loading}>
            {isRegistering ? (
              <><UserPlus className="w-4 h-4 mr-2" /> Register & Lock Device</>
            ) : (
              <><LogIn className="w-4 h-4 mr-2" /> Login</>
            )}
          </Button>
        </form>
      </Card>

      <p className="text-center text-xs text-slate-500 mt-6 max-w-xs mx-auto">
        By continuing, you agree that your account will be permanently bound to this device ID.
      </p>
    </div>
  );
};