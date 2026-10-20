import React, { useState, useEffect, useMemo } from 'react';
import { Site, User, AttendanceRecord } from '../types';
import { storage } from '../services/storage';
import {
  calculateIndividualOTDay,
  formatDateToDDMMYYYY,
  getTodayDDMMYYYY,
  IndividualOTDayItem,
} from '../utils/otCalculation';
import {
  Clock,
  Building,
  Calendar,
  Search,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  CalendarX,
  FileSpreadsheet,
  ShieldAlert,
} from 'lucide-react';

interface OTSheetViewProps {
  currentUser: User;
  sites: Site[];
}

export const OTSheetView: React.FC<OTSheetViewProps> = ({ currentUser, sites }) => {
  // Check authorized role access: Admin, Manager, Overall Incharge, Overall Manager
  const isAuthorizedRole = [
    'Admin',
    'Manager',
    'Overall Incharge',
    'Overall Manager',
  ].includes(currentUser.role);

  const [refreshCount, setRefreshCount] = useState<number>(0);

  // Month selector: defaults to current year-month (e.g. 2026-10)
  const defaultYearMonth = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultYearMonth);
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);

  // Storage change listener
  useEffect(() => {
    const handleStorageUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ key?: string }>;
      if (
        !customEvent.detail ||
        customEvent.detail.key === 'pms_attendance_v2' ||
        customEvent.detail.key === 'pms_deleted_attendance_ids_v2' ||
        customEvent.detail.key === 'pms_attendance_cleared_all_v2' ||
        customEvent.detail.key === 'pms_users_v2' ||
        customEvent.detail.key === 'pms_sites_v2'
      ) {
        setRefreshCount((prev) => prev + 1);
      }
    };

    window.addEventListener('pms_storage_updated', handleStorageUpdate);
    return () => window.removeEventListener('pms_storage_updated', handleStorageUpdate);
  }, []);

  // Fetch all active users from storage
  const allUsers = useMemo(() => {
    return storage.getUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshCount]);

  // List of distinct employees (filter out duplicate records if any)
  const employeeList = useMemo(() => {
    const seen = new Set<string>();
    const list: User[] = [];

    allUsers.forEach((u) => {
      // Show all employee records or workers
      if (!seen.has(u.id)) {
        seen.add(u.id);
        list.push(u);
      }
    });

    return list;
  }, [allUsers]);

  // Filtered employee list based on Site and Search query
  const filteredEmployees = useMemo(() => {
    return employeeList.filter((emp) => {
      if (selectedSiteFilter !== 'ALL' && emp.siteId !== selectedSiteFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = emp.name.toLowerCase().includes(q);
      const matchId = emp.id.toLowerCase().includes(q);
      const matchSite = (emp.siteName || '').toLowerCase().includes(q);
      return matchName || matchId || matchSite;
    });
  }, [employeeList, selectedSiteFilter, searchQuery]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [yStr, mStr] = selectedMonth.split('-');
    let y = parseInt(yStr, 10);
    let m = parseInt(mStr, 10);
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [yStr, mStr] = selectedMonth.split('-');
    let y = parseInt(yStr, 10);
    let m = parseInt(mStr, 10);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  // Month label formatted e.g. "October 2026"
  const formattedMonthLabel = useMemo(() => {
    try {
      const [yStr, mStr] = selectedMonth.split('-');
      const d = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return selectedMonth;
    }
  }, [selectedMonth]);

  // Attendance records for the selected employee in the selected month
  const selectedEmployeeAttendance = useMemo(() => {
    if (!selectedEmployee) return [];
    const allAttendance = storage.getAttendance({ employeeId: selectedEmployee.id });
    return allAttendance.filter((rec) => rec.date && rec.date.startsWith(selectedMonth));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployee, selectedMonth, refreshCount]);

  // Map attendance records to 5-column OT Sheet day rows
  const otSheetRows: IndividualOTDayItem[] = useMemo(() => {
    if (!selectedEmployee) return [];

    // Sort attendance records chronologically by date
    const sorted = [...selectedEmployeeAttendance].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return sorted.map((rec) => calculateIndividualOTDay(rec));
  }, [selectedEmployee, selectedEmployeeAttendance]);

  // Monthly aggregated totals
  const stats = useMemo(() => {
    let totalOtMinutes = 0;
    let completeCount = 0;
    let missingPunchOutCount = 0;
    let leaveCount = 0;

    otSheetRows.forEach((row) => {
      totalOtMinutes += row.overtimeMinutes;
      if (row.status === 'Complete') completeCount++;
      else if (row.status === 'Missing Punch Out') missingPunchOutCount++;
      else if (row.status === 'Leave') leaveCount++;
    });

    const hours = Math.floor(totalOtMinutes / 60);
    const mins = totalOtMinutes % 60;

    return {
      totalOtFormatted: `${hours} hrs ${mins} mins`,
      totalOtMinutes,
      completeCount,
      missingPunchOutCount,
      leaveCount,
      totalRecords: otSheetRows.length,
    };
  }, [otSheetRows]);

  // Export current individual OT Sheet to Excel
  const handleExportExcel = () => {
    if (!selectedEmployee) return;

    const exportData = otSheetRows.map((row) => ({
      Date: row.date,
      'Punch In Time': row.punchInTime,
      'Punch Out Time': row.punchOutTime,
      'Overtime (OT)': row.overtime,
      Status: row.status,
    }));

    const safeName = selectedEmployee.name.replace(/\s+/g, '_');
    storage.exportReportToExcel(
      exportData,
      `OT_Sheet_${safeName}_${selectedEmployee.id}_${selectedMonth}`,
      `OT Sheet - ${selectedEmployee.name}`
    );
  };

  // Trigger A4 landscape print
  const handlePrint = () => {
    window.print();
  };

  // 1. Role access guard: Strictly enforce visibility
  if (!isAuthorizedRole) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-md mx-auto my-12 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Access Restricted</h3>
        <p className="text-xs text-slate-500 mt-1">
          OT Sheet is visible only to Admin, Manager, Overall Incharge, and Overall Manager.
        </p>
      </div>
    );
  }

  // 2. Individual Employee OT Sheet Detail View
  if (selectedEmployee) {
    // Resolve employee site name
    const assignedSite = sites.find((s) => s.id === selectedEmployee.siteId);
    const siteDisplayName = assignedSite ? assignedSite.name : selectedEmployee.siteName || 'All Sites (Corporate HQ)';
    const todayFormatted = getTodayDDMMYYYY();

    return (
      <div className="space-y-4">
        {/* Print Styling CSS Injection */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * {
                visibility: hidden;
              }
              #ot-sheet-print-container, #ot-sheet-print-container * {
                visibility: visible;
              }
              #ot-sheet-print-container {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: white !important;
                padding: 10mm;
              }
              .no-print {
                display: none !important;
              }
              @page {
                size: landscape;
                margin: 10mm;
              }
            }
          `
        }} />

        {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedEmployee(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← Back to Employee List</span>
          </button>

          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  if (e.target.value) setSelectedMonth(e.target.value);
                }}
                className="bg-transparent text-slate-800 font-bold focus:outline-hidden cursor-pointer text-xs"
              />
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Actions: Export Excel & Print */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4 Landscape</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={otSheetRows.length === 0}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* ========================================================
            INDIVIDUAL OT SHEET DOCUMENT (Optimized for Screen & A4 Print)
            ======================================================== */}
        <div
          id="ot-sheet-print-container"
          className="bg-white p-5 sm:p-7 rounded-xl border border-slate-200 shadow-sm space-y-6"
        >
          {/* 3. OT Sheet Header */}
          <div className="border-b-2 border-emerald-600 pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* Left: Company Logo & Company Name */}
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden bg-white border border-emerald-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                  <img
                    src="/logo.png"
                    alt="Attendance Plus PMS Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                    Attendance Plus PMS
                  </h1>
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Green E&C — Overtime (OT) Statement
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Month: <span className="font-bold text-slate-800">{formattedMonthLabel}</span>
                  </p>
                </div>
              </div>

              {/* Right: Employee Name, Employee ID, Site Name, Date (DD-MM-YYYY) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs w-full sm:w-auto min-w-[280px]">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Employee Name
                    </span>
                    <span className="font-bold text-slate-900 text-xs">
                      {selectedEmployee.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Employee ID
                    </span>
                    <span className="font-mono font-bold text-emerald-800 text-xs">
                      {selectedEmployee.id}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Site Name
                    </span>
                    <span className="font-semibold text-slate-800 text-xs">
                      {siteDisplayName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Date
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {todayFormatted}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Summary KPIs (Screen & Print) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                Total Overtime (OT)
              </span>
              <span className="text-base font-extrabold text-emerald-900 font-mono">
                {stats.totalOtFormatted}
              </span>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-bold text-blue-700 block">
                Complete Shifts
              </span>
              <span className="text-base font-extrabold text-blue-900 font-mono">
                {stats.completeCount}
              </span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-bold text-amber-700 block">
                Missing Punch Out
              </span>
              <span className="text-base font-extrabold text-amber-900 font-mono">
                {stats.missingPunchOutCount}
              </span>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5">
              <span className="text-[10px] uppercase font-bold text-purple-700 block">
                Leave / Rest Days
              </span>
              <span className="text-base font-extrabold text-purple-900 font-mono">
                {stats.leaveCount}
              </span>
            </div>
          </div>

          {/* 4. OT Sheet Columns Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-800 text-[11px] font-bold uppercase tracking-wider divide-x divide-slate-300">
                  <th className="py-2.5 px-3 w-32 whitespace-nowrap">
                    1. Date
                  </th>
                  <th className="py-2.5 px-3 w-40 whitespace-nowrap">
                    2. Punch In Time
                  </th>
                  <th className="py-2.5 px-3 w-40 whitespace-nowrap">
                    3. Punch Out Time
                  </th>
                  <th className="py-2.5 px-3 w-40 text-right whitespace-nowrap">
                    4. Overtime (OT)
                  </th>
                  <th className="py-2.5 px-3 w-40 text-center whitespace-nowrap">
                    5. Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {otSheetRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400 bg-slate-50/50">
                      <Clock className="w-8 h-8 text-slate-300 mx-auto mb-1.5 opacity-60" />
                      <p className="font-semibold text-slate-600">
                        No attendance records found for {formattedMonthLabel}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Recorded punches for this employee will appear automatically.
                      </p>
                    </td>
                  </tr>
                ) : (
                  otSheetRows.map((row, idx) => (
                    <tr
                      key={row.id || `${row.rawDate}-${idx}`}
                      className={`divide-x divide-slate-200 ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                      }`}
                    >
                      {/* 1. Date (DD-MM-YYYY) */}
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {row.date}
                      </td>

                      {/* 2. Punch In Time */}
                      <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {row.punchInTime !== '—' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span>{row.punchInTime}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 3. Punch Out Time */}
                      <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {row.punchOutTime !== '—' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                            <span>{row.punchOutTime}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 4. Overtime (OT) */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {row.overtime !== '—' ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              row.overtimeMinutes > 0
                                ? 'bg-emerald-100 text-emerald-900 font-bold'
                                : 'text-slate-600 font-medium'
                            }`}
                          >
                            {row.overtime}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* 5. Status: Complete / Missing Punch Out / Leave */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {row.status === 'Complete' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Complete
                          </span>
                        )}
                        {row.status === 'Missing Punch Out' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Missing Punch Out
                          </span>
                        )}
                        {row.status === 'Leave' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                            <CalendarX className="w-3 h-3 text-purple-600" />
                            Leave
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 6. Employee Signature Area (Suitable for Print and Audit) */}
          <div className="pt-6 border-t border-slate-300 mt-6">
            <div className="grid grid-cols-2 gap-8 text-xs text-slate-700">
              {/* Left Column: Employee Signature */}
              <div className="space-y-3">
                <p className="font-bold text-slate-900">Employee Acknowledgment:</p>
                <div className="h-14 border-b border-dashed border-slate-400 flex items-end pb-1 text-slate-400 italic text-[11px]">
                  Employee Signature
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Name: <strong className="text-slate-800">{selectedEmployee.name}</strong></span>
                  <span>Date: <strong className="text-slate-800">____ / ____ / ________</strong></span>
                </div>
              </div>

              {/* Right Column: Authorized Incharge / Manager Signature */}
              <div className="space-y-3">
                <p className="font-bold text-slate-900">Authorized Incharge / Manager Approval:</p>
                <div className="h-14 border-b border-dashed border-slate-400 flex items-end pb-1 text-slate-400 italic text-[11px]">
                  Authorized Signature & Stamp
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Verified By: <strong className="text-slate-800">{currentUser.name} ({currentUser.role})</strong></span>
                  <span>Date: <strong className="text-slate-800">{todayFormatted}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // 2. MAIN DIRECTORY: Individual employee OT Sheets List
  // ========================================================
  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
            <Clock className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              OT Sheet — Employee Records
            </h2>
            <p className="text-xs text-slate-500">
              Select an employee record to open their individual monthly OT Sheet.
            </p>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                if (e.target.value) setSelectedMonth(e.target.value);
              }}
              className="bg-transparent text-slate-800 font-bold focus:outline-hidden cursor-pointer text-xs"
            />
          </div>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-2.5 text-xs">
        {/* Site Filter */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
          <Building className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-500 font-medium">Site:</span>
          <select
            value={selectedSiteFilter}
            onChange={(e) => setSelectedSiteFilter(e.target.value)}
            className="bg-transparent text-slate-800 font-semibold focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                [{s.siteNumber}] {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[200px] flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search employee name, ID or site..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-slate-800 focus:outline-hidden text-xs placeholder:text-slate-400 font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[10px] text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          )}
        </div>

        <div className="text-[11px] text-slate-500 font-medium ml-auto">
          Showing <strong>{filteredEmployees.length}</strong> Employees
        </div>
      </div>

      {/* Employee Records List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
          <span>Individual Employee OT Sheets — Month: {formattedMonthLabel}</span>
          <span className="text-[11px] font-normal text-slate-500">
            Click any employee record to view their individual OT Sheet
          </span>
        </div>

        {filteredEmployees.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <UserCheck className="w-10 h-10 text-slate-300 mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-slate-600">No employee records match the filter</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Try adjusting the site filter or search query.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredEmployees.map((emp) => {
              const assignedSite = sites.find((s) => s.id === emp.siteId);
              const siteDisplayName = assignedSite
                ? assignedSite.name
                : emp.siteName || 'All Sites (Corporate HQ)';

              return (
                <div
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  className="p-3.5 sm:p-4 hover:bg-emerald-50/60 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs group-hover:bg-emerald-700 transition-colors">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      {/* Specified display format: Employee Name — Employee ID [ID] — Site Name */}
                      <div className="font-bold text-slate-900 text-xs sm:text-sm flex flex-wrap items-center gap-1.5">
                        <span className="group-hover:text-emerald-700 transition-colors">
                          {emp.name}
                        </span>
                        <span className="text-slate-400 font-normal">—</span>
                        <span className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-xs">
                          Employee ID {emp.id}
                        </span>
                        <span className="text-slate-400 font-normal">—</span>
                        <span className="text-slate-600 font-medium text-xs">
                          {siteDisplayName}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span>Role: {emp.role}</span>
                        {emp.designation && <span>• {emp.designation}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEmployee(emp);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 group-hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                    >
                      <span>Open OT Sheet</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
