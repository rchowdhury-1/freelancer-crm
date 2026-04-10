import { useState, FormEvent } from 'react';
import { Eye, EyeOff, User, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../apiClient';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
  const { user, updateUser } = useAuth();

  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [profileLoading, setProfileLoading] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [pwLoading, setPwLoading] = useState(false);

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const { data } = await api.put('/auth/profile', profileForm);
      updateUser(data.user);
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    if (pwForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setPwLoading(true);
    try {
      await api.put('/auth/password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success('Password updated');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update password');
    } finally {
      setPwLoading(false);
    }
  }

  function PasswordInput({
    label,
    value,
    onChange,
    show,
    onToggle,
    placeholder,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    show: boolean;
    onToggle: () => void;
    placeholder?: string;
  }) {
    return (
      <div>
        <label className="label">{label}</label>
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            required
            className="input pr-10"
            placeholder={placeholder || '••••••••'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account details</p>
      </div>

      {/* Profile */}
      <div className="card space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
          <div className="w-9 h-9 bg-indigo-700 rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-indigo-200" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Profile</h2>
            <p className="text-xs text-gray-500">Update your name and email</p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input
              type="text"
              required
              className="input"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Email address</label>
            <input
              type="email"
              required
              className="input"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
            />
          </div>
          <button type="submit" disabled={profileLoading} className="btn-primary">
            {profileLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : 'Save profile'}
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="card space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-800">
          <div className="w-9 h-9 bg-gray-800 rounded-xl flex items-center justify-center">
            <Lock className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Password</h2>
            <p className="text-xs text-gray-500">Change your account password</p>
          </div>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <PasswordInput
            label="Current password"
            value={pwForm.currentPassword}
            onChange={(v) => setPwForm({ ...pwForm, currentPassword: v })}
            show={showPw.current}
            onToggle={() => setShowPw({ ...showPw, current: !showPw.current })}
          />
          <PasswordInput
            label="New password"
            value={pwForm.newPassword}
            onChange={(v) => setPwForm({ ...pwForm, newPassword: v })}
            show={showPw.new}
            onToggle={() => setShowPw({ ...showPw, new: !showPw.new })}
            placeholder="Min. 8 characters"
          />
          <PasswordInput
            label="Confirm new password"
            value={pwForm.confirmPassword}
            onChange={(v) => setPwForm({ ...pwForm, confirmPassword: v })}
            show={showPw.confirm}
            onToggle={() => setShowPw({ ...showPw, confirm: !showPw.confirm })}
            placeholder="Repeat new password"
          />
          <button type="submit" disabled={pwLoading} className="btn-primary">
            {pwLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Updating...
              </span>
            ) : 'Update password'}
          </button>
        </form>
      </div>

      {/* Account info */}
      <div className="card">
        <h2 className="font-semibold text-white mb-4">Account Info</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">User ID</span>
            <span className="text-gray-400 font-mono text-xs">{user?.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Member since</span>
            <span className="text-gray-400">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
