import React, { useState } from 'react';
import { User } from '../types';
import { storage } from '../services/storage';
import {
  Building2,
  Lock,
  Phone,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  KeyRound,
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [mobile, setMobile] = useState('12345678');
  const [password, setPassword] = useState('12345678');
  const [error, setError] = useState<string | null>(null);

  const allUsers = storage.getUsers();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const user = allUsers.find(
      (u) => u.mobile === mobile.trim() && (u.password || '12345678') === password.trim()
    );

    if (user) {
      storage.setCurrentUser(user);
      onLoginSuccess(user);
    } else {
      setError('Invalid Mobile Number or Password. Please check your credentials.');
    }
  };

  const handleQuickRoleSelect = (user: User) => {
    storage.setCurrentUser(user);
    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/20 to-slate-100 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-emerald-100/80 p-6 sm:p-8 space-y-6">
        {/* Branding */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white mx-auto flex items-center justify-center shadow-lg border border-emerald-200 p-1 ring-4 ring-emerald-500/10">
            <img
              src="/logo.png"
              alt="Green Engineering Logo"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Attendance Plus PMS
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Progress Management System (PMS) • Green E&C
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Mobile Number
            </label>
            <div className="relative">
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="12345678"
                className="w-full text-sm px-3.5 py-2.5 pl-10 border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                required
              />
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-sm px-3.5 py-2.5 pl-10 border border-slate-300 rounded-xl font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                required
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-98 transition-all cursor-pointer"
          >
            Sign In to PMS <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Testing Switcher */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              1-Click Role Testing
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Sample: 12345678</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {allUsers.slice(0, 6).map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleQuickRoleSelect(u)}
                className="p-2 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 group-hover:bg-emerald-100 group-hover:text-emerald-800">
                    {u.role}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">{u.id}</span>
                </div>
                <span className="font-semibold text-slate-800 block truncate mt-1 text-[11px]">
                  {u.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center text-[10px] text-slate-400">
          Attendance Plus PMS • Trial & Testing Mode v2.4
        </div>
      </div>
    </div>
  );
};
