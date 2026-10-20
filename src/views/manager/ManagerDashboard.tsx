import React, { useState } from 'react';
import { User, Site, AttendanceRecord, ProgressSubmission } from '../../types';
import { storage, getTodayDateString } from '../../services/storage';
import { PhotoViewerModal } from '../../components/PhotoViewerModal';
import {
  Users,
  CalendarCheck,
  TrendingUp,
  Award,
  CheckCircle,
  Clock,
  AlertTriangle,
  Building,
  Eye,
  Check,
  XCircle,
  MessageSquare,
} from 'lucide-react';

interface ManagerDashboardProps {
  currentUser: User;
  sites: Site[];
  onRefresh: () => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  currentUser,
  sites,
  onRefresh,
}) => {
  const todayStr = getTodayDateString();
  const managerSiteId = currentUser.siteId !== 'ALL' ? currentUser.siteId : sites[0]?.id || 'SITE-01';
  const assignedSite = sites.find((s) => s.id === managerSiteId);

  const [activeSubTab, setActiveSubTab] = useState<'attendance' | 'submissions'>('attendance');
  const [selectedRecord, setSelectedRecord] = useState<ProgressSubmission | null>(null);
  const [managerRemarks, setManagerRemarks] = useState('');
  const [inspectPhotoUrl, setInspectPhotoUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Load site users, attendance, and progress
  const allUsers = storage.getUsers();
  const siteEmployees = allUsers.filter(
    (u) => (u.siteId === managerSiteId || managerSiteId === 'ALL') && u.role === 'Employee'
  );

  const todaySiteAttendance = storage.getAttendance({
    siteId: managerSiteId,
    date: todayStr,
  });

  const siteProgressSubmissions = storage.getProgressSubmissions({
    siteId: managerSiteId,
  });

  // Calculate manager KPIs
  const totalEmployees = siteEmployees.length;
  const punchedInCount = todaySiteAttendance.filter((a) => a.punchInTime && !a.punchOutTime).length;
  const punchedOutCount = todaySiteAttendance.filter((a) => a.punchInTime && a.punchOutTime).length;
  const missingPunchOutCount = todaySiteAttendance.filter(
    (a) => a.punchInTime && !a.punchOutTime && a.date !== todayStr
  ).length;

  const handleUpdateApproval = (status: 'Approved' | 'Reviewed' | 'Rejected') => {
    if (!selectedRecord) return;
    const res = storage.updateProgressApproval(
      selectedRecord.id,
      status,
      undefined,
      managerRemarks.trim() || undefined
    );
    if (res.success) {
      setFeedback(`Record marked as ${status}.`);
      onRefresh();
      setSelectedRecord((prev) =>
        prev
          ? {
              ...prev,
              approvalStatus: status,
              managerRemarks: managerRemarks.trim() || prev.managerRemarks,
            }
          : null
      );
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Top Banner: Site Progress Monitoring Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Site Management Hub
              </span>
              <span className="font-mono text-xs text-slate-400">
                [{assignedSite?.siteNumber || 'S-101'}]
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              {assignedSite?.name || 'Assigned Site'}
            </h2>
            <p className="text-xs text-slate-500">
              Site Manager: <strong>{currentUser.name}</strong> • Operations Monitor
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Date</span>
            <span className="text-xs font-mono font-bold text-slate-800">{todayStr}</span>
          </div>
        </div>

        {/* Manager KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
              Site Workers
            </span>
            <span className="text-xl font-bold font-mono text-slate-900">{totalEmployees}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Assigned</span>
          </div>

          <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 text-center">
            <span className="text-[10px] text-blue-700 uppercase font-semibold block">
              Punched In
            </span>
            <span className="text-xl font-bold font-mono text-blue-800">{punchedInCount}</span>
            <span className="text-[10px] text-blue-600 block mt-0.5">Active On Site</span>
          </div>

          <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200 text-center">
            <span className="text-[10px] text-emerald-700 uppercase font-semibold block">
              Punched Out
            </span>
            <span className="text-xl font-bold font-mono text-emerald-800">{punchedOutCount}</span>
            <span className="text-[10px] text-emerald-600 block mt-0.5">Shift Done</span>
          </div>

          <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 text-center">
            <span className="text-[10px] text-indigo-700 uppercase font-semibold block">
              Progress Updates
            </span>
            <span className="text-xl font-bold font-mono text-indigo-800">
              {siteProgressSubmissions.length}
            </span>
            <span className="text-[10px] text-indigo-600 block mt-0.5">Submissions</span>
          </div>
        </div>
      </div>

      {/* Agreed Title: Employee attendance */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('attendance')}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeSubTab === 'attendance'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Employee attendance
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('submissions')}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeSubTab === 'submissions'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Progress Submissions ({siteProgressSubmissions.length})
            </button>
          </div>
          <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
            Manager Review Portal
          </span>
        </div>

        {/* Tab 1: Agreed Employee attendance monitoring list */}
        {activeSubTab === 'attendance' && (
          <div className="p-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Site Employee Roster & Live Status
            </h3>

            {siteEmployees.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 text-center">
                No employees currently assigned to this site.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {siteEmployees.map((emp) => {
                  const todayAtt = todaySiteAttendance.find((a) => a.employeeId === emp.id);

                  return (
                    <div
                      key={emp.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{emp.name}</span>
                            <span className="font-mono text-[10px] text-slate-500">
                              {emp.id}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {emp.designation || 'Site Worker'} • {emp.department || 'Operations'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 justify-between sm:justify-end">
                        <div className="text-left sm:text-right font-mono text-[11px]">
                          <div>
                            In: <strong className="text-emerald-700">{todayAtt?.punchInTime || '—'}</strong>
                          </div>
                          <div>
                            Out: <strong className="text-indigo-700">{todayAtt?.punchOutTime || '—'}</strong>
                          </div>
                        </div>

                        <div>
                          {todayAtt?.punchInTime && todayAtt?.punchOutTime ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              COMPLETED
                            </span>
                          ) : todayAtt?.punchInTime ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                              PUNCHED IN
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                              NOT MARKED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Progress Submissions for Manager Verification */}
        {activeSubTab === 'submissions' && (
          <div className="p-4 space-y-3">
            {siteProgressSubmissions.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-6 text-center">
                No progress submissions recorded for this site yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {siteProgressSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => {
                      setSelectedRecord(sub);
                      setManagerRemarks(sub.managerRemarks || '');
                      setFeedback(null);
                    }}
                    className="p-3 rounded-xl border border-slate-200 hover:border-emerald-400 bg-white hover:bg-emerald-50/20 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {sub.workCode}
                        </span>
                        <span className="font-semibold text-slate-900">{sub.employeeName}</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          ({sub.employeeId})
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                          {sub.workType}
                        </span>
                      </div>
                      <p className="text-slate-600 line-clamp-1">{sub.workDescription}</p>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono">
                        Date: {sub.submissionDate} • Completed: <strong>{sub.completedQuantity} {sub.uom}</strong> in <strong>{sub.workingHours} hrs</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-between sm:justify-end shrink-0">
                      <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {sub.points} pts
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sub.approvalStatus === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sub.approvalStatus === 'Reviewed'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {sub.approvalStatus}
                      </span>
                      <span className="text-emerald-700 font-semibold text-xs flex items-center gap-0.5">
                        <Eye className="w-3.5 h-3.5" /> Verify
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Verification Modal for Manager */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Manager Verification: {selectedRecord.workCode}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {selectedRecord.employeeName} ({selectedRecord.employeeId}) • {selectedRecord.submissionDate}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {feedback && (
                <div className="p-2.5 rounded-lg text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> {feedback}
                </div>
              )}

              {/* Work Metrics */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Completed Qty</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    {selectedRecord.completedQuantity} {selectedRecord.uom}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Rate Basis</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {selectedRecord.workGuideRate}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Working Hours</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {selectedRecord.workingHours} hrs
                  </span>
                </div>
              </div>

              {/* Description & Employee Remarks */}
              <div className="space-y-1.5 border border-slate-200 rounded-xl p-3 bg-white">
                <span className="text-[10px] text-slate-400 uppercase block">Work Description</span>
                <p className="font-medium text-slate-800">{selectedRecord.workDescription}</p>

                {selectedRecord.employeeRemarks && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <span className="text-[10px] text-emerald-800 font-bold uppercase block">
                      Employee Notes
                    </span>
                    <p className="text-slate-600 italic mt-0.5">{selectedRecord.employeeRemarks}</p>
                  </div>
                )}
              </div>

              {/* Photos Inspection */}
              {(selectedRecord.beforePhotos?.length > 0 || selectedRecord.afterPhotos?.length > 0) && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    Verification Photos
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {selectedRecord.beforePhotos?.map((p, i) => (
                      <div
                        key={`b-${i}`}
                        onClick={() => setInspectPhotoUrl(p)}
                        className="aspect-square rounded-lg overflow-hidden border border-slate-200 cursor-pointer"
                      >
                        <img src={p} alt="Before" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {selectedRecord.afterPhotos?.map((p, i) => (
                      <div
                        key={`a-${i}`}
                        onClick={() => setInspectPhotoUrl(p)}
                        className="aspect-square rounded-lg overflow-hidden border border-slate-200 cursor-pointer"
                      >
                        <img src={p} alt="After" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manager Remarks Input */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-bold text-slate-700">
                  Manager Verification Notes
                </label>
                <textarea
                  rows={2}
                  value={managerRemarks}
                  onChange={(e) => setManagerRemarks(e.target.value)}
                  placeholder="Enter site verification remarks..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleUpdateApproval('Approved')}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateApproval('Reviewed')}
                  className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Mark Reviewed
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateApproval('Rejected')}
                  className="py-2 px-3 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Photo Modal */}
      <PhotoViewerModal
        isOpen={!!inspectPhotoUrl}
        onClose={() => setInspectPhotoUrl(null)}
        photoUrl={inspectPhotoUrl}
        title="Manager Photo Inspection"
      />
    </div>
  );
};
