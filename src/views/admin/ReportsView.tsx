import React, { useState } from 'react';
import { Site, User } from '../../types';
import { storage } from '../../services/storage';
import { ExcelTable, ExcelColumn } from '../../components/ExcelTable';
import {
  FileBarChart2,
  CalendarCheck,
  TrendingUp,
  Award,
  Download,
  Building,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import { OTSheetView } from '../OTSheetView';
import { generateOTSheetData } from '../../utils/otCalculation';

interface ReportsViewProps {
  currentUser: User;
  sites: Site[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ currentUser, sites }) => {
  // Access control: Only Admin & Overall Manager permitted
  const isAuthorized = currentUser.role === 'Admin' || currentUser.role === 'Overall Manager';

  if (!isAuthorized) {
    return (
      <div className="bg-white rounded-xl border border-rose-200 p-8 text-center max-w-md mx-auto my-8">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-900">Access Restricted</h3>
        <p className="text-xs text-slate-500 mt-1">
          Executive reports are restricted to Admin and Overall Manager roles.
        </p>
      </div>
    );
  }

  const [activeReportTab, setActiveReportTab] = useState<'progress' | 'attendance' | 'points' | 'ot_sheet'>('progress');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('ALL');

  // Load live data
  const workGuides = storage.getWorkGuides(selectedSiteId);
  const attendanceList = storage.getAttendance({ siteId: selectedSiteId === 'ALL' ? undefined : selectedSiteId });
  const pointsSummary = storage.getEmployeePointsSummary(selectedSiteId === 'ALL' ? undefined : selectedSiteId);

  // Export handlers
  const handleExport = () => {
    if (activeReportTab === 'progress') {
      const exportData = workGuides.map((g) => ({
        'Site ID': g.siteId,
        'Work Code': g.workCode,
        Description: g.workDescription,
        'Duration Basis': g.workDuration,
        'Work By Hour': g.workByHour,
        UOM: g.uom,
        'Total Target Qty': g.totalQuantity,
        'Completed Qty': g.completedQuantity || 0,
        'Balance Qty': g.balanceQuantity ?? g.totalQuantity,
        'Progress %': g.totalQuantity > 0 ? Math.round(((g.completedQuantity || 0) / g.totalQuantity) * 100) : 0,
      }));
      storage.exportReportToExcel(exportData, `Site_Progress_Report_${selectedSiteId}`);
    } else if (activeReportTab === 'attendance') {
      const exportData = attendanceList.map((a) => ({
        Date: a.date,
        'Employee ID': a.employeeId,
        'Employee Name': a.employeeName,
        Site: a.siteName,
        'Punch In': a.punchInTime || '—',
        'Punch Out': a.punchOutTime || '—',
        Status: a.status,
      }));
      storage.exportReportToExcel(exportData, `Attendance_Summary_Report_${selectedSiteId}`);
    } else if (activeReportTab === 'ot_sheet') {
      const allUsers = storage.getUsers();
      const otData = generateOTSheetData(attendanceList, allUsers);
      const exportData = otData.map((row) => ({
        'Employee ID': row.employeeId,
        'Employee Name': row.employeeName,
        'Punch In Date': row.punchInDate,
        'Punch Out Date': row.punchOutDate,
        Overtime: row.overtime,
      }));
      storage.exportReportToExcel(exportData, `OT_Sheet_Report_${selectedSiteId}`, 'OT Sheet');
    } else {
      const exportData = pointsSummary.map((p, idx) => ({
        Rank: idx + 1,
        'Employee ID': p.employeeId,
        'Employee Name': p.employeeName,
        Site: p.siteName,
        'Total Points': p.totalPoints,
        'Logged Hours': p.totalHours,
        'Submissions Count': p.totalSubmissions,
        'Approved Count': p.approvedSubmissions,
      }));
      storage.exportReportToExcel(exportData, `Employee_Points_Ledger_${selectedSiteId}`);
    }
  };

  const progressColumns: ExcelColumn<any>[] = [
    {
      key: 'workCode',
      header: 'Code',
      width: 'w-24',
      render: (g) => <span className="font-mono font-bold text-emerald-800">{g.workCode}</span>,
    },
    {
      key: 'workDescription',
      header: 'Description',
      render: (g) => <span className="font-medium text-slate-800">{g.workDescription}</span>,
    },
    {
      key: 'uom',
      header: 'UOM',
      width: 'w-16',
      align: 'center',
      render: (g) => <span className="font-mono uppercase text-[10px]">{g.uom}</span>,
    },
    {
      key: 'totalQuantity',
      header: 'Target Qty',
      width: 'w-24',
      align: 'right',
      render: (g) => <span className="font-mono font-bold">{g.totalQuantity.toLocaleString()}</span>,
    },
    {
      key: 'completedQuantity',
      header: 'Completed',
      width: 'w-24',
      align: 'right',
      render: (g) => (
        <span className="font-mono text-emerald-700 font-bold">
          {(g.completedQuantity || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'balanceQuantity',
      header: 'Balance Qty',
      width: 'w-24',
      align: 'right',
      render: (g) => (
        <span className="font-mono text-amber-700 font-bold">
          {(g.balanceQuantity ?? g.totalQuantity).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'progressPercent',
      header: 'Progress %',
      width: 'w-28',
      align: 'center',
      render: (g) => {
        const pct = g.totalQuantity > 0 ? Math.min(100, Math.round(((g.completedQuantity || 0) / g.totalQuantity) * 100)) : 0;
        return (
          <div className="w-full flex items-center gap-1.5 px-1">
            <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-mono font-semibold text-[10px] w-8 text-right">{pct}%</span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileBarChart2 className="w-5 h-5 text-emerald-600" />
            Executive Reports & Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Consolidated reports authorized for Admin and Overall Manager with instant Excel export.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1">
            <Building className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="text-xs bg-transparent text-slate-800 font-semibold focus:outline-hidden"
            >
              <option value="ALL">All Sites Combined</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.siteNumber}] {s.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export .XLSX
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveReportTab('progress')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeReportTab === 'progress'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Work Progress & Quantities
        </button>
        <button
          type="button"
          onClick={() => setActiveReportTab('points')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeReportTab === 'points'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" /> Employee Points Summary
        </button>
        <button
          type="button"
          onClick={() => setActiveReportTab('attendance')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeReportTab === 'attendance'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarCheck className="w-4 h-4" /> Attendance Logs
        </button>
        <button
          type="button"
          onClick={() => setActiveReportTab('ot_sheet')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeReportTab === 'ot_sheet'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" /> OT Sheet
        </button>
      </div>

      {/* Report Content */}
      {activeReportTab === 'progress' && (
        <ExcelTable
          columns={progressColumns}
          data={workGuides}
          keyExtractor={(g) => `${g.siteId}-${g.workCode}`}
          emptyMessage="No work items found for the selected site."
        />
      )}

      {activeReportTab === 'points' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">
            Employee Performance & Points Ranking
          </h3>
          <div className="space-y-2">
            {pointsSummary.map((emp, index) => (
              <div
                key={emp.employeeId}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-slate-100 font-mono font-bold flex items-center justify-center text-slate-600 text-[11px]">
                    {index + 1}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 block">{emp.employeeName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {emp.employeeId} • {emp.siteName}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-indigo-700 text-sm block">
                    {emp.totalPoints} pts
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {emp.totalHours} hrs • {emp.approvedSubmissions} approved
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeReportTab === 'attendance' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">
            Recent Attendance Activity ({attendanceList.length} logs)
          </h3>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {attendanceList.map((att) => (
              <div key={att.id} className="py-2 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900">{att.employeeName}</span>
                  <span className="font-mono text-slate-400 text-[11px] ml-1.5">
                    ({att.employeeId})
                  </span>
                  <div className="text-[10px] text-slate-500">
                    {att.date} • {att.siteName}
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-emerald-700 font-semibold">In: {att.punchInTime || '—'}</div>
                  <div className="text-indigo-700">Out: {att.punchOutTime || '—'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeReportTab === 'ot_sheet' && (
        <OTSheetView currentUser={currentUser} sites={sites} />
      )}
    </div>
  );
};
