import React from 'react';
import { Building2, User as UserIcon, Shield, MapPin, Hash, Sparkles } from 'lucide-react';
import { User, Site } from '../types';

interface HeaderProps {
  user: User;
  sites: Site[];
  onSwitchUser?: (user: User) => void;
  allUsers?: User[];
}

export const Header: React.FC<HeaderProps> = ({ user, sites, onSwitchUser, allUsers }) => {
  // Determine site number
  const assignedSite = sites.find((s) => s.id === user.siteId);
  const siteNumber = assignedSite ? assignedSite.siteNumber : user.siteId === 'ALL' ? 'ALL-00' : 'S-000';
  const siteDisplayName = assignedSite ? assignedSite.name : user.siteName;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Company Branding & App Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl overflow-hidden bg-white border border-emerald-200 shadow-xs shrink-0 flex items-center justify-center p-0.5 ring-2 ring-emerald-500/10">
              <img
                src="/logo.png"
                alt="Green Engineering Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm sm:text-base text-slate-900 tracking-tight leading-none">
                  Green E&C
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  PMS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate font-medium">
                Attendance Plus PMS
              </p>
            </div>
          </div>

          {/* User Info & Assigned Site Metadata */}
          <div className="flex items-center gap-2 shrink-0">
            {/* User Badge */}
            <div className="flex items-center gap-2 bg-emerald-50/70 border border-emerald-200/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {user.name.charAt(0)}
              </div>
              <div className="text-left hidden xs:block">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-900 truncate max-w-[110px] sm:max-w-[150px]">
                    {user.name}
                  </span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-200/70 text-emerald-800 font-bold uppercase">
                    {user.role}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                  <span>ID: {user.id}</span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-0.5 text-emerald-700 font-semibold" title={siteDisplayName}>
                    <Hash className="w-2.5 h-2.5" /> {siteNumber}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Demo Role Switcher for Testing (Useful for verifying roles quickly) */}
            {allUsers && allUsers.length > 0 && onSwitchUser && (
              <div className="relative group">
                <select
                  aria-label="Switch Test User Role"
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-1.5 px-2 rounded-lg border border-slate-300 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-emerald-500 appearance-none pr-6 text-[11px]"
                  value={user.id}
                  onChange={(e) => {
                    const selected = allUsers.find((u) => u.id === e.target.value);
                    if (selected) onSwitchUser(selected);
                  }}
                  title="Switch between test user roles"
                >
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      [{u.role}] {u.name} ({u.id})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">
                  ▼
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile secondary row showing assigned site name and number */}
        <div className="xs:hidden mt-1.5 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-600 font-medium">
          <div className="truncate flex items-center gap-1">
            <span className="font-semibold text-slate-800">{user.name}</span>
            <span className="font-mono text-slate-400">({user.id})</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-700 shrink-0 font-semibold">
            <MapPin className="w-3 h-3 text-emerald-600" />
            <span className="truncate max-w-[130px]">{siteDisplayName}</span>
            <span className="bg-emerald-100 text-emerald-800 px-1 rounded text-[9px]">
              {siteNumber}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
