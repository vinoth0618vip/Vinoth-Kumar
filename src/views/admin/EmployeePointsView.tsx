import React, { useState } from 'react';
import { Site, User, ProgressSubmission } from '../../types';
import { storage } from '../../services/storage';
import { ExcelTable, ExcelColumn } from '../../components/ExcelTable';
import {
  Award,
  TrendingUp,
  Building,
  User as UserIcon,
  Clock,
  CheckCircle2,
  ChevronRight,
  Download,
  Calendar,
} from 'lucide-react';

interface EmployeePointsViewProps {
  currentUser: User;
  sites: Site[];
}

export const EmployeePointsView: React.FC<EmployeePointsViewProps> = ({ currentUser, sites }) => {
  const [selectedSiteId, setSelectedSiteId] = useState<string>('ALL');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const summaries = storage.getEmployeePointsSummary(selectedSiteId);
  const allSubmissions = storage.getProgressSubmissions({
    siteId: selectedSiteId === 'ALL' ? undefined : selectedSiteId,
    employeeId: selectedEmployeeId || undefined,
  });

  const selectedEmployeeSummary = summaries.find((s) => s.employeeId === selectedEmployeeId);

  const handleExportPoints = () => {
    const exportData = summaries.map((s, idx) => ({
      Rank: idx + 1,
      'Employee ID': s.employeeId,
      'Employee Name': s.employeeName,
      'Site Name': s.siteName,
      'Total Points': s.totalPoints,
      'Working Hours': s.totalHours,
      'Total Submissions': s.totalSubmissions,
      'Approved Submissions': s.approvedSubmissions,
    }));
    storage.exportReportToExcel(exportData, `Employee_Points_Report_${selectedSiteId}`);
  };

  const columns: ExcelColumn<any>[] = [
    {
      key: 'employeeId',
      header: 'Emp ID',
      width: 'w-24',
      render: (item) => (
        <span className="font-mono font-bold text-slate-800">{item.employeeId}</span>
      ),
    },
    {
      key: 'employeeName',
      header: 'Employee Name',
      render: (item) => (
        <span className="font-semibold text-slate-900">{item.employeeName}</span>
      ),
    },
    {
      key: 'siteName',
      header: 'Site Assignment',
      render: (item) => <span className="text-slate-600">{item.siteName}</span>,
    },
    {
      key: 'totalSubmissions',
      header: 'Submissions',
      width: 'w-24',
      align: 'center',
      render: (item) => (
        <span className="font-mono text-slate-700">
          {item.approvedSubmissions} / {item.totalSubmissions} approved
        </span>
      ),
    },
    {
      key: 'totalHours',
      header: 'Logged Hours',
      width: 'w-24',
      align: 'right',
      render: (item) => (
        <span className="font-mono font-semibold text-slate-800">{item.totalHours} hrs</span>
      ),
    },
    {
      key: 'totalPoints',
      header: 'Total Points',
      width: 'w-28',
      align: 'right',
      render: (item) => (
        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
          {item.totalPoints} pts
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header and Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            Employee PMS Points Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Points dynamically reconciled with verified progress submissions. No double-counting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser.siteId === 'ALL' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedSiteId}
                onChange={(e) => {
                  setSelectedSiteId(e.target.value);
                  setSelectedEmployeeId(null);
                }}
                className="text-xs bg-transparent text-slate-800 font-semibold focus:outline-hidden"
              >
                <option value="ALL">All Sites</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.siteNumber}] {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={handleExportPoints}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export Excel
          </button>
        </div>
      </div>

      {/* Main Points Summary Table (Excel-Style Layout) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">
            Leaderboard & Site Totals ({summaries.length} Active Earners)
          </span>
          <span className="text-[11px] text-slate-500">
            Click row to view underlying progress submissions
          </span>
        </div>

        <ExcelTable
          columns={columns}
          data={summaries}
          keyExtractor={(item) => item.employeeId}
          onRowClick={(item) =>
            setSelectedEmployeeId(selectedEmployeeId === item.employeeId ? null : item.employeeId)
          }
          emptyMessage="No progress submissions recorded yet to compute employee points."
        />
      </div>

      {/* Underlying Reconciled Progress Submissions breakdown */}
      {selectedEmployeeId && (
        <div className="bg-white rounded-xl border-2 border-indigo-200 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Underlying Records for {selectedEmployeeSummary?.employeeName} ({selectedEmployeeId})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Total Accumulated Points: <strong>{selectedEmployeeSummary?.totalPoints} pts</strong> over{' '}
                  <strong>{selectedEmployeeSummary?.totalHours} hours</strong>
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedEmployeeId(null)}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
            >
              Close Breakdown ✕
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {allSubmissions.map((sub) => (
              <div key={sub.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {sub.workCode}
                    </span>
                    <span className="font-medium text-slate-800 truncate">{sub.workDescription}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                      {sub.workType}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 font-mono">
                    <span>Date: {sub.submissionDate}</span>
                    <span>•</span>
                    <span>
                      Completed: {sub.completedQuantity} {sub.uom}
                    </span>
                    <span>•</span>
                    <span>Hours: {sub.workingHours} hrs</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-indigo-700 text-sm block">
                    +{sub.points} pts
                  </span>
                  <span className="text-[10px] text-slate-400">{sub.approvalStatus}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
