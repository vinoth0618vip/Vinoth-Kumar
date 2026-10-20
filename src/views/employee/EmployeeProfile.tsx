import React from 'react';
import { User, Site } from '../../types';
import { storage } from '../../services/storage';
import {
  User as UserIcon,
  Building,
  CalendarCheck,
  Award,
  Phone,
  Briefcase,
  Clock,
  Shield,
  FileText,
} from 'lucide-react';

interface EmployeeProfileProps {
  currentUser: User;
  sites: Site[];
}

export const EmployeeProfile: React.FC<EmployeeProfileProps> = ({ currentUser, sites }) => {
  const attendanceList = storage.getAttendance({ employeeId: currentUser.id });
  const mySubmissions = storage.getProgressSubmissions({ employeeId: currentUser.id });

  const assignedSite = sites.find((s) => s.id === currentUser.siteId);
  const siteNumber = assignedSite ? assignedSite.siteNumber : 'S-000';

  const presentDays = attendanceList.filter((a) => a.status === 'Present').length;
  const punchedInDays = attendanceList.filter((a) => a.status === 'PunchedIn').length;
  const leaveDays = attendanceList.filter((a) => a.status === 'Leave').length;

  const totalPoints = mySubmissions.reduce((sum, s) => sum + (s.points || 0), 0);
  const totalHours = mySubmissions.reduce((sum, s) => sum + (s.workingHours || 0), 0);

  // Overtime (OT Sheet) calculation: any hours beyond standard 8h per day
  const otHours = mySubmissions.reduce((sum, s) => {
    return sum + (s.workingHours > 8 ? s.workingHours - 8 : 0);
  }, 0);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-2xl shadow-md ring-4 ring-emerald-50">
            {currentUser.name.charAt(0)}
          </div>
          <div className="text-center sm:text-left flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{currentUser.name}</h2>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 w-fit mx-auto sm:mx-0">
                {currentUser.role}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Employee ID: <strong>{currentUser.id}</strong> • Mobile: {currentUser.mobile}
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                {currentUser.designation || 'Staff'} ({currentUser.department || 'Operations'})
              </span>
              <span className="flex items-center gap-1 font-semibold text-emerald-700">
                <Building className="w-3.5 h-3.5 text-emerald-600" />
                {assignedSite ? `${assignedSite.name} [${siteNumber}]` : currentUser.siteName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Attendance Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Present</span>
          <span className="text-xl font-bold font-mono text-emerald-600">{presentDays}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Full Shifts</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Punched In</span>
          <span className="text-xl font-bold font-mono text-blue-600">{punchedInDays}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Today Active</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Rest / Leave</span>
          <span className="text-xl font-bold font-mono text-slate-600">{leaveDays}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Days</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-xs">
          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Points</span>
          <span className="text-xl font-bold font-mono text-indigo-600">{totalPoints}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">PMS Score</span>
        </div>
      </div>

      {/* Agreed OT Sheet Section (Strict: No obsolete OTC naming) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <FileText className="w-4 h-4 text-emerald-600" />
              OT Sheet (Overtime Summary)
            </h3>
            <p className="text-[11px] text-slate-500">
              Approved overtime logged against site progress.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {otHours} OT Hours
          </span>
        </div>

        <div className="text-xs text-slate-600 space-y-1.5">
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span>Normal Working Hours Logged:</span>
            <span className="font-mono font-bold text-slate-800">{totalHours} hrs</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span>Approved Overtime (OT):</span>
            <span className="font-mono font-bold text-emerald-700">{otHours} hrs</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Total Verified Submissions:</span>
            <span className="font-mono font-bold text-slate-800">
              {mySubmissions.filter((s) => s.approvalStatus === 'Approved').length} /{' '}
              {mySubmissions.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
