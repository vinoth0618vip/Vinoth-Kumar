import React from 'react';
import {
  CalendarCheck,
  TrendingUp,
  Settings,
  ClipboardList,
  FileBarChart2,
  UserCheck,
  LogOut,
  FolderKanban,
  CheckSquare,
  Clock,
} from 'lucide-react';
import { UserRole } from '../types';

interface BottomNavProps {
  role: UserRole;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  role,
  activeTab,
  onTabChange,
  onLogout,
}) => {
  // Navigation tabs definition per role
  const getNavItems = () => {
    switch (role) {
      case 'Admin':
        return [
          { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
          { id: 'pms', label: 'PMS System', icon: TrendingUp },
          { id: 'attendance_details', label: 'Attn Details', icon: ClipboardList },
          { id: 'ot_sheet', label: 'OT Sheet', icon: Clock },
          { id: 'reports', label: 'Reports', icon: FileBarChart2 },
          { id: 'settings', label: 'Settings', icon: Settings },
        ];

      case 'Manager':
        return [
          { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
          { id: 'attendance_details', label: 'Attn Details', icon: ClipboardList },
          { id: 'progress', label: 'Progress', icon: TrendingUp }, // In bottom navigation as specified!
          { id: 'monitor', label: 'Site Monitor', icon: CheckSquare },
          { id: 'ot_sheet', label: 'OT Sheet', icon: Clock },
          { id: 'profile', label: 'Profile', icon: UserCheck },
        ];

      case 'Supervisor':
        return [
          { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
          { id: 'progress_monitor', label: 'Progress', icon: TrendingUp },
          { id: 'profile', label: 'My Profile', icon: UserCheck },
        ];

      case 'Overall Manager':
        return [
          { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
          { id: 'pms_monitor', label: 'Progress Monitor', icon: TrendingUp },
          { id: 'ot_sheet', label: 'OT Sheet', icon: Clock },
          { id: 'reports', label: 'Reports', icon: FileBarChart2 },
          { id: 'profile', label: 'Profile', icon: UserCheck },
        ];

      case 'Overall Incharge':
        return [
          { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
          { id: 'progress_monitor', label: 'QA / Progress', icon: TrendingUp },
          { id: 'ot_sheet', label: 'OT Sheet', icon: Clock },
          { id: 'profile', label: 'Profile', icon: UserCheck },
        ];

      case 'Employee':
      default:
        // Employees see only Attendance, Progress, and My Profile
        return [
          { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
          { id: 'progress', label: 'Progress', icon: TrendingUp },
          { id: 'profile', label: 'My Profile', icon: UserCheck },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Floating discreet small Logout button at bottom-left */}
      <div className="fixed bottom-3 left-3 z-50">
        <button
          onClick={onLogout}
          type="button"
          aria-label="Sign Out"
          title="Sign Out"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/95 text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/90 shadow-md transition-all text-xs font-medium cursor-pointer active:scale-95 backdrop-blur-xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">Sign Out</span>
        </button>
      </div>

      {/* Main Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg safe-bottom">
        <div className="max-w-2xl mx-auto px-2 pl-12 sm:pl-16 flex items-center justify-around py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                type="button"
                className={`flex flex-col items-center justify-center py-1 px-1 sm:px-2 rounded-xl transition-all relative ${
                  isActive
                    ? 'text-emerald-700 bg-emerald-50/90 font-semibold'
                    : 'text-slate-500 hover:text-emerald-600 hover:bg-slate-50 font-normal'
                }`}
              >
                <Icon
                  className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${
                    isActive ? 'scale-110 text-emerald-600' : ''
                  }`}
                />
                <span className="text-[9px] sm:text-[10px] mt-0.5 tracking-tight truncate max-w-[62px] sm:max-w-[75px]">
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 w-6 h-0.5 bg-emerald-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
