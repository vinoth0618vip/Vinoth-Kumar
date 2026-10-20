import React, { useState, useMemo, useEffect } from 'react';
import { User, Site, AttendanceRecord } from '../../types';
import { storage, getTodayDateString } from '../../services/storage';
import {
  isSameEmployee,
  calculateDailyWorkingHours,
  getMonthDays,
  MonthDayInfo,
} from '../../utils/attendanceUtils';
import {
  CalendarCheck,
  Calendar,
  Clock,
  Search,
  Building,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Download,
  ShieldAlert,
  MapPin,
  Briefcase,
  Hash,
} from 'lucide-react';

interface EmployeeWiseAttendanceViewProps {
  currentUser: User;
  sites: Site[];
  initialSelectedEmployeeId?: string | null;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const EmployeeWiseAttendanceView: React.FC<EmployeeWiseAttendanceViewProps> = ({
  currentUser,
  sites,
  initialSelectedEmployeeId,
}) => {
  const [refreshCount, setRefreshCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [siteFilter, setSiteFilter] = useState<string>('ALL');

  // Selected employee for detailed full-month attendance view
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);

  // Month and Year state for the calendar
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth()); // 0-11
  const todayDateStr = getTodayDateString(today);

  // Reactive listener to refresh data on any attendance update
  useEffect(() => {
    const handleStorageUpdate = () => {
      setRefreshCount((prev) => prev + 1);
    };
    window.addEventListener('pms_storage_updated', handleStorageUpdate);
    return () => window.removeEventListener('pms_storage_updated', handleStorageUpdate);
  }, []);

  // Fetch all users (100+ employees supported)
  const allEmployees = useMemo(() => {
    return storage.getUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshCount]);

  // Handle initial selected employee if provided via props
  useEffect(() => {
    if (initialSelectedEmployeeId && !selectedEmployee) {
      const match = allEmployees.find((u) => isSameEmployee(u.id, initialSelectedEmployeeId));
      if (match) setSelectedEmployee(match);
    }
  }, [initialSelectedEmployeeId, allEmployees, selectedEmployee]);

  // Filtered employee list (supports 100+ employees with instant search and site filter)
  const filteredEmployees = useMemo(() => {
    return allEmployees.filter((emp) => {
      // Site filter
      if (siteFilter !== 'ALL' && emp.siteId !== siteFilter && emp.siteId !== 'ALL') {
        return false;
      }
      // Search query (matches Employee ID or Employee Name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = emp.id.toLowerCase().includes(q);
        const matchName = emp.name.toLowerCase().includes(q);
        return matchId || matchName;
      }
      return true;
    });
  }, [allEmployees, siteFilter, searchQuery]);

  // All attendance records for the selected employee
  const employeeAttendanceRecords = useMemo(() => {
    if (!selectedEmployee) return [];
    return storage.getAttendance({ employeeId: selectedEmployee.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployee, refreshCount]);

  // Calendar dates for the selected month (from 1st to last day of month)
  const monthDays = useMemo(() => {
    return getMonthDays(selectedYear, selectedMonth, todayDateStr);
  }, [selectedYear, selectedMonth, todayDateStr]);

  // Map each date of the month to its saved attendance record and working hours
  const monthAttendanceRows = useMemo(() => {
    return monthDays.map((day) => {
      // Find saved attendance record for this exact date
      const record = employeeAttendanceRecords.find((r) => r.date === day.dateString);

      let statusDisplay: 'Present' | 'Missing Punch Out' | 'Leave' | 'Weekly Off' | 'No Record' =
        'No Record';
      let workingHoursFormatted = '—';
      let workingMinutes = 0;

      if (record) {
        if (record.punchInTime && record.punchOutTime) {
          statusDisplay = 'Present';
          const wh = calculateDailyWorkingHours(
            record.punchInTime,
            record.punchOutTime,
            record.date,
            record.punchOutDate
          );
          workingHoursFormatted = wh.formatted;
          workingMinutes = wh.totalMinutes;
        } else if (record.punchInTime && !record.punchOutTime) {
          statusDisplay = 'Missing Punch Out';
          workingHoursFormatted = 'Awaiting Out';
        } else if (record.status === 'Leave') {
          statusDisplay = 'Leave';
        } else {
          statusDisplay = 'Present';
        }
      } else {
        if (day.isSunday) {
          statusDisplay = 'Weekly Off';
        } else {
          statusDisplay = 'No Record';
        }
      }

      return {
        day,
        record: record || null,
        statusDisplay,
        workingHoursFormatted,
        workingMinutes,
        punchInTime: record?.punchInTime || null,
        punchOutTime: record?.punchOutTime || null,
        punchOutDate: record?.punchOutDate || null,
      };
    });
  }, [monthDays, employeeAttendanceRecords]);

  // Monthly summary metrics for selected employee
  const monthSummary = useMemo(() => {
    let presentCount = 0;
    let missingOutCount = 0;
    let leaveCount = 0;
    let totalMinutes = 0;

    monthAttendanceRows.forEach((row) => {
      if (row.statusDisplay === 'Present') presentCount++;
      if (row.statusDisplay === 'Missing Punch Out') missingOutCount++;
      if (row.statusDisplay === 'Leave') leaveCount++;
      totalMinutes += row.workingMinutes;
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const remMins = totalMinutes % 60;
    const totalWorkingHoursFormatted = `${totalHours}h ${remMins}m`;

    return {
      presentCount,
      missingOutCount,
      leaveCount,
      totalWorkingHoursFormatted,
      totalDays: monthDays.length,
    };
  }, [monthAttendanceRows, monthDays]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
  };

  // Export full month attendance report for selected employee
  const handleExportMonthExcel = () => {
    if (!selectedEmployee) return;

    const exportData = monthAttendanceRows.map((row) => ({
      Date: row.day.dateString,
      Day: row.day.dayName,
      'Employee ID': selectedEmployee.id,
      'Employee Name': selectedEmployee.name,
      'Attendance Status': row.statusDisplay,
      'Punch In Time': row.punchInTime || '—',
      'Punch Out Time': row.punchOutTime || (row.statusDisplay === 'Missing Punch Out' ? 'Missing Punch Out' : '—'),
      'Working Hours': row.workingHoursFormatted,
    }));

    const monthStr = MONTH_NAMES[selectedMonth];
    storage.exportReportToExcel(
      exportData,
      `Attendance_${selectedEmployee.id}_${monthStr}_${selectedYear}`,
      'Monthly Attendance'
    );
  };

  // =========================================================================
  // VIEW 1: SELECTED EMPLOYEE ATTENDANCE DETAILS (FULL MONTH CALENDAR & TABLE)
  // =========================================================================
  if (selectedEmployee) {
    const firstDayOfWeek = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 is Sunday

    return (
      <div className="space-y-4">
        {/* Top Header & Navigation */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedEmployee(null)}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
              title="Return to Employee List"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold text-emerald-700 tracking-wider">
                  Employee Attendance Details
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-700 border border-slate-200">
                  {selectedEmployee.role}
                </span>
              </div>
              {/* Employee ID on top line, Employee Name directly below */}
              <h2 className="text-lg font-bold font-mono text-slate-900 tracking-tight leading-none mt-1">
                {selectedEmployee.id}
              </h2>
              <div className="text-sm font-bold text-emerald-800">
                {selectedEmployee.name}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportMonthExcel}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export Month (.xlsx)
            </button>

            <button
              type="button"
              onClick={() => setSelectedEmployee(null)}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Change Employee
            </button>
          </div>
        </div>

        {/* Employee Metadata Banner */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-slate-400" />
              <span>{selectedEmployee.designation || 'Staff'} ({selectedEmployee.department || 'Operations'})</span>
            </span>
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <Building className="w-4 h-4 text-emerald-600" />
              <span>{selectedEmployee.siteName}</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-500 font-mono">
              <span>Mobile: <strong>{selectedEmployee.mobile}</strong></span>
            </span>
          </div>

          <div className="text-[11px] text-slate-500">
            Attendance data is retrieved strictly using Employee ID: <strong className="font-mono text-slate-800">{selectedEmployee.id}</strong>
          </div>
        </div>

        {/* Month & Year Navigation Bar */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              {MONTH_NAMES[selectedMonth]} {selectedYear} Attendance
            </h3>
          </div>

          {/* Month & Year Selector Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Previous Month */}
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Month Dropdown */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              aria-label="Select month"
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={idx}>
                  {name}
                </option>
              ))}
            </select>

            {/* Year Dropdown */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              aria-label="Select year"
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>

            {/* Next Month */}
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Quick jump to current month */}
            <button
              type="button"
              onClick={handleResetToCurrentMonth}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ml-1"
            >
              Today's Month
            </button>
          </div>
        </div>

        {/* Monthly Attendance Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Present (Full Shifts)</span>
            <span className="text-xl font-bold font-mono text-emerald-600">
              {monthSummary.presentCount}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Days completed</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Missing Punch Out</span>
            <span className="text-xl font-bold font-mono text-amber-600">
              {monthSummary.missingOutCount}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Incomplete punch cycles</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Leave / Rest</span>
            <span className="text-xl font-bold font-mono text-slate-600">
              {monthSummary.leaveCount}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Approved off days</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Working Hours</span>
            <span className="text-xl font-bold font-mono text-indigo-700">
              {monthSummary.totalWorkingHoursFormatted}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Calculated in month</span>
          </div>
        </div>

        {/* 1. Full-Month Calendar Grid (Sun to Sat) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4 text-emerald-600" />
                Monthly Calendar Grid ({MONTH_NAMES[selectedMonth]} {selectedYear})
              </h4>
              <p className="text-[11px] text-slate-500">
                Visual status overview from the 1st to the last day of the month.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-medium text-slate-600">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Missing Out
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> No Record / Off
              </span>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            {/* Days of Week */}
            <div className="grid grid-cols-7 bg-slate-100 text-center text-[10px] font-bold text-slate-700 py-2 border-b border-slate-200">
              <span className="text-rose-600">SUN</span>
              <span>MON</span>
              <span>TUE</span>
              <span>WED</span>
              <span>THU</span>
              <span>FRI</span>
              <span>SAT</span>
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-px bg-slate-200 text-xs">
              {/* Empty leading padding */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-slate-50/70 min-h-[58px] p-1.5" />
              ))}

              {/* Month Days */}
              {monthAttendanceRows.map((item) => {
                const day = item.day;
                let bgStyle = 'bg-white hover:bg-slate-50';
                let badge = null;

                if (item.statusDisplay === 'Present') {
                  bgStyle = 'bg-emerald-50/70 hover:bg-emerald-100/70';
                  badge = (
                    <span className="text-[9px] font-mono font-bold text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded border border-emerald-300">
                      {item.workingHoursFormatted}
                    </span>
                  );
                } else if (item.statusDisplay === 'Missing Punch Out') {
                  bgStyle = 'bg-amber-50/80 hover:bg-amber-100/80';
                  badge = (
                    <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded border border-amber-300 animate-pulse">
                      Awaiting Out
                    </span>
                  );
                } else if (item.statusDisplay === 'Leave') {
                  bgStyle = 'bg-purple-50 hover:bg-purple-100';
                  badge = (
                    <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1 py-0.2 rounded">
                      Leave
                    </span>
                  );
                } else if (day.isSunday) {
                  bgStyle = 'bg-slate-50/90 text-slate-400';
                  badge = <span className="text-[9px] text-slate-400 font-medium">Off</span>;
                }

                return (
                  <div
                    key={day.dayNumber}
                    className={`min-h-[64px] p-1.5 flex flex-col justify-between transition-colors ${bgStyle} ${
                      day.isToday ? 'ring-2 ring-emerald-500 z-10' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] font-mono font-bold ${
                          day.isSunday ? 'text-rose-600' : day.isToday ? 'text-emerald-700 underline' : 'text-slate-800'
                        }`}
                      >
                        {day.dayNumber}
                      </span>
                      {day.isToday && (
                        <span className="text-[8px] bg-emerald-600 text-white font-bold px-1 rounded">
                          TODAY
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-col items-start gap-0.5">
                      {badge}
                      {item.punchInTime && (
                        <span className="text-[9px] font-mono text-slate-500 leading-tight">
                          In: {item.punchInTime.slice(0, 5)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Full-Month Day-by-Day Detailed Table (From 1st to Last Day) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                Complete Daily Attendance Breakdown (1st to {monthDays.length}th {MONTH_NAMES[selectedMonth]} {selectedYear})
              </h4>
              <p className="text-[11px] text-slate-500">
                Shows all dates in the month. Working hours are calculated using actual saved punch times.
              </p>
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              Total Dates: <strong>{monthDays.length}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3.5 w-32 whitespace-nowrap">Date</th>
                  <th className="py-2.5 px-3.5 w-20 whitespace-nowrap">Day</th>
                  <th className="py-2.5 px-3.5 w-44 whitespace-nowrap">Daily Status</th>
                  <th className="py-2.5 px-3.5 w-44 whitespace-nowrap">Punch In Time</th>
                  <th className="py-2.5 px-3.5 w-44 whitespace-nowrap">Punch Out Time</th>
                  <th className="py-2.5 px-3.5 w-36 text-right whitespace-nowrap">Working Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {monthAttendanceRows.map((row) => {
                  const day = row.day;
                  const isPresent = row.statusDisplay === 'Present';
                  const isMissingOut = row.statusDisplay === 'Missing Punch Out';
                  const isLeave = row.statusDisplay === 'Leave';

                  return (
                    <tr
                      key={day.dateString}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        day.isToday ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      {/* Date */}
                      <td className="py-2.5 px-3.5 font-mono text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {day.isToday && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          )}
                          <span className={day.isToday ? 'font-bold text-emerald-800' : ''}>
                            {day.dateString}
                          </span>
                        </div>
                      </td>

                      {/* Day of Week */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            day.isSunday ? 'text-rose-600 font-bold' : 'text-slate-600'
                          }`}
                        >
                          {day.dayName}
                        </span>
                      </td>

                      {/* Daily Status */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        {isPresent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            PRESENT
                          </span>
                        )}
                        {isMissingOut && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            MISSING PUNCH OUT
                          </span>
                        )}
                        {isLeave && (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            LEAVE
                          </span>
                        )}
                        {!isPresent && !isMissingOut && !isLeave && (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-200">
                            {row.statusDisplay}
                          </span>
                        )}
                      </td>

                      {/* Punch In */}
                      <td className="py-2.5 px-3.5 font-mono whitespace-nowrap">
                        {row.punchInTime ? (
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {row.punchInTime}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Punch Out */}
                      <td className="py-2.5 px-3.5 font-mono whitespace-nowrap">
                        {row.punchOutTime ? (
                          <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {row.punchOutDate && row.punchOutDate !== day.dateString ? `[${row.punchOutDate}] ` : ''}
                            {row.punchOutTime}
                          </span>
                        ) : isMissingOut ? (
                          <span className="text-[11px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Missing Punch Out
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Working Hours */}
                      <td className="py-2.5 px-3.5 text-right font-mono whitespace-nowrap">
                        {isPresent ? (
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {row.workingHoursFormatted}
                          </span>
                        ) : isMissingOut ? (
                          <span className="text-[11px] text-amber-600 font-semibold italic">
                            Incomplete
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: INDIVIDUAL EMPLOYEE LIST (SUPPORTS 100+ EMPLOYEES)
  // Displays each employee as a separate entry with:
  // TOP LINE: Employee ID
  // DIRECTLY BELOW: Employee Name
  // Clicking an employee opens their monthly attendance details page!
  // =========================================================================
  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <CalendarCheck className="w-5 h-5 text-emerald-700" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Employee-Wise Attendance Details
              </h2>
              <p className="text-xs text-slate-500">
                Click any employee name to open their complete full-month attendance calendar and punch details.
              </p>
            </div>
          </div>
        </div>

        {/* Stats count badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            Total Employees: <strong className="text-emerald-700 font-mono">{allEmployees.length}</strong>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar for 100+ Employees */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-2.5 text-xs">
        {/* Search Input: Instant Filter by Employee ID or Name */}
        <div className="flex-1 min-w-[220px] flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by Employee ID (e.g. EMP001) or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-slate-800 focus:outline-hidden text-xs placeholder:text-slate-400 font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[10px] text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Site Filter */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
          <Building className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-500 font-medium">Site:</span>
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="bg-transparent text-slate-800 font-semibold focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Sites ({allEmployees.length})</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                [{s.siteNumber}] {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Results Counter */}
        <span className="text-slate-500 text-[11px] font-medium ml-auto">
          Showing <strong>{filteredEmployees.length}</strong> of {allEmployees.length} employees
        </span>
      </div>

      {/* Employee List Grid: Showing Employee ID on Top Line and Name Directly Below */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredEmployees.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            <UserIcon className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="font-semibold text-slate-700">No employees match "{searchQuery}"</p>
            <p className="text-xs text-slate-400 mt-1">Try searching by a different ID or name.</p>
          </div>
        ) : (
          filteredEmployees.map((emp) => {
            const hasAttToday = storage.getTodayAttendanceForUser(emp.id);

            return (
              <button
                key={emp.id}
                type="button"
                onClick={() => setSelectedEmployee(emp)}
                className="bg-white rounded-xl border border-slate-200 hover:border-emerald-500 p-4 shadow-2xs hover:shadow-md transition-all text-left flex flex-col justify-between group cursor-pointer active:scale-99"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    {/* TOP LINE: Employee ID in bold */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-sm text-slate-900 group-hover:text-emerald-700 bg-slate-100 group-hover:bg-emerald-50 px-2 py-0.5 rounded border border-slate-200 group-hover:border-emerald-300 transition-colors">
                        {emp.id}
                      </span>
                    </div>

                    {/* Role / Status Badge */}
                    <div className="flex items-center gap-1">
                      {hasAttToday?.punchInTime && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Punched In Today" />
                      )}
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                        {emp.role}
                      </span>
                    </div>
                  </div>

                  {/* DIRECTLY BELOW: Employee Name */}
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition-colors leading-snug">
                    {emp.name}
                  </h3>

                  {/* Secondary metadata */}
                  <div className="mt-2 space-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 truncate">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{emp.designation || 'Staff'} • {emp.department || 'Operations'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 truncate">
                      <Building className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{emp.siteName}</span>
                    </div>
                  </div>
                </div>

                {/* Footer action affordance */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-medium text-slate-400 font-mono">
                    Mobile: {emp.mobile}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    <span>View Attendance</span>
                    <span>→</span>
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
