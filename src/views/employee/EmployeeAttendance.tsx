import React, { useState } from 'react';
import { User, Site, AttendanceRecord } from '../../types';
import { storage, getTodayDateString } from '../../services/storage';
import { CameraCaptureModal } from '../../components/CameraCaptureModal';
import {
  CalendarCheck,
  Camera,
  CheckCircle,
  Clock,
  Calendar,
  AlertCircle,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { calculateDailyWorkingHours } from '../../utils/attendanceUtils';

interface EmployeeAttendanceProps {
  currentUser: User;
  sites: Site[];
  onRefresh: () => void;
}

export const EmployeeAttendance: React.FC<EmployeeAttendanceProps> = ({
  currentUser,
  sites,
  onRefresh,
}) => {
  const todayStr = getTodayDateString();
  const [selectedSiteId, setSelectedSiteId] = useState<string>(
    currentUser.siteId !== 'ALL' ? currentUser.siteId : sites[0]?.id || 'SITE-01'
  );

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<'punch_in' | 'punch_out'>('punch_in');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Month navigation for monthly calendar
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());
  const [selectedCalendarDateStr, setSelectedCalendarDateStr] = useState<string>(todayStr);

  // Load attendance records for current user
  const userAttendanceRecords = storage.getAttendance({ employeeId: currentUser.id });
  const todayRecord = storage.getTodayAttendanceForUser(currentUser.id, todayStr);

  const isPunchedIn = !!todayRecord?.punchInTime;
  const isPunchedOut = !!todayRecord?.punchOutTime;

  // Selected date record in calendar
  const selectedDateRecord = userAttendanceRecords.find((r) => r.date === selectedCalendarDateStr);

  const handleOpenPunchIn = () => {
    if (isPunchedIn && !isPunchedOut) {
      setFeedback({
        type: 'error',
        message: `Already punched in today at ${todayRecord?.punchInTime}. Ready for Punch Out.`,
      });
      return;
    }
    if (isPunchedIn && isPunchedOut) {
      setFeedback({
        type: 'error',
        message: 'Attendance cycle for today is already completed (Punched In & Out).',
      });
      return;
    }

    setCameraMode('punch_in');
    setIsCameraOpen(true);
    setFeedback(null);
  };

  const handleOpenPunchOut = () => {
    if (!isPunchedIn) {
      setFeedback({ type: 'error', message: 'You must Punch In before you can Punch Out.' });
      return;
    }
    if (isPunchedOut) {
      setFeedback({
        type: 'error',
        message: `Already punched out at ${todayRecord?.punchOutTime}.`,
      });
      return;
    }

    setCameraMode('punch_out');
    setIsCameraOpen(true);
    setFeedback(null);
  };

  const handleCapturePhoto = (photoBase64: string) => {
    if (cameraMode === 'punch_in') {
      const res = storage.punchIn(currentUser, photoBase64, selectedSiteId);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } else {
      const res = storage.punchOut(currentUser, photoBase64);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    }
  };

  // Calendar rendering helpers
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
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

  const handlePrevMonth = () => {
    setCurrentCalendarDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate(new Date(year, month + 1, 1));
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Top Banner: Shift and Punch Action Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              Employee ID
            </span>
            {/* Top Line: Employee ID */}
            <h2 className="text-lg font-bold font-mono text-slate-900 tracking-tight leading-none">
              {currentUser.id}
            </h2>
            {/* Directly Below: Employee Name */}
            <div className="text-sm font-bold text-emerald-800 mt-0.5">
              {currentUser.name}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Today: <strong>{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</strong>
            </p>
          </div>

          {/* Assigned Site Badge */}
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Site</span>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {currentUser.siteName}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-600 border border-slate-200 mt-1 inline-block">
              {currentUser.role}
            </span>
          </div>
        </div>

        {/* Feedback message */}
        {feedback && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        {/* Punch In / Punch Out Interactive Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Punch In Card */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isPunchedIn
                ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                : 'bg-white border-slate-200 hover:border-emerald-400'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Shift Start
              </span>
              {isPunchedIn && (
                <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-300">
                  RECORDED
                </span>
              )}
            </div>

            <div className="my-2">
              <span className="text-xs text-slate-600 block">Punch In Time:</span>
              <span className="text-xl font-bold font-mono text-slate-900">
                {todayRecord?.punchInTime || '—:—:—'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleOpenPunchIn}
              disabled={isPunchedIn}
              className={`w-full mt-2 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-98 cursor-pointer ${
                isPunchedIn
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Camera className="w-4 h-4" />
              {isPunchedIn ? 'Punch In Saved' : 'Mark Attendance / Punch In'}
            </button>
          </div>

          {/* Punch Out Card */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isPunchedOut
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : isPunchedIn
                ? 'bg-amber-50/50 border-amber-200'
                : 'bg-slate-50/50 border-slate-200 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Shift End
              </span>
              {isPunchedOut ? (
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                  COMPLETED
                </span>
              ) : isPunchedIn ? (
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300 animate-pulse">
                  AWAITING OUT
                </span>
              ) : null}
            </div>

            <div className="my-2">
              <span className="text-xs text-slate-600 block">Punch Out Time:</span>
              <span className="text-xl font-bold font-mono text-slate-900">
                {todayRecord?.punchOutTime || '—:—:—'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleOpenPunchOut}
              disabled={!isPunchedIn || isPunchedOut}
              className={`w-full mt-2 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-98 cursor-pointer ${
                isPunchedOut
                  ? 'bg-emerald-100 text-emerald-800 cursor-not-allowed border border-emerald-300'
                  : isPunchedIn
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              {isPunchedOut ? 'Punch Out Completed' : 'Save Attendance / Punch Out'}
            </button>
          </div>
        </div>

        {/* GPS Radius Notice */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Camera Facial Verification Active</span>
          <span className="text-slate-400 italic">GPS radius check: Deferred (Testing Mode)</span>
        </div>
      </div>

      {/* Monthly Attendance Calendar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Monthly Attendance Calendar
            </h3>
            <p className="text-[11px] text-slate-500">
              Color conventions: <strong className="text-blue-700">Blue</strong> = Punch In recorded |{' '}
              <strong className="text-emerald-700">Green</strong> = Both Punch In & Punch Out recorded.
            </p>
          </div>

          {/* Month Switcher */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-slate-200 rounded text-slate-600"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 px-2 min-w-[100px] text-center font-mono">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-slate-200 rounded text-slate-600"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          {/* Days of week header */}
          <div className="grid grid-cols-7 bg-slate-100 text-center text-[10px] font-bold text-slate-600 py-1.5 border-b border-slate-200">
            <span>SUN</span>
            <span>MON</span>
            <span>TUE</span>
            <span>WED</span>
            <span>THU</span>
            <span>FRI</span>
            <span>SAT</span>
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-px bg-slate-200 text-xs">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-slate-50 min-h-[50px] p-1" />
            ))}

            {/* Days in current month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateObj = new Date(year, month, dayNum);
              const dateString = getTodayDateString(dateObj);
              const record = userAttendanceRecords.find((r) => r.date === dateString);
              const isSelected = selectedCalendarDateStr === dateString;
              const isTodayCell = todayStr === dateString;

              // Color Convention:
              // Blue: Punch In recorded (not punched out)
              // Green: Punch In AND Punch Out recorded
              let statusColor = 'bg-white';
              let badgeColor = '';

              if (record) {
                if (record.punchInTime && record.punchOutTime) {
                  // Green
                  statusColor = 'bg-emerald-50/70 hover:bg-emerald-100/70';
                  badgeColor = 'bg-emerald-500 text-white';
                } else if (record.punchInTime && !record.punchOutTime) {
                  // Blue
                  statusColor = 'bg-blue-50/70 hover:bg-blue-100/70';
                  badgeColor = 'bg-blue-500 text-white';
                } else if (record.status === 'Leave') {
                  statusColor = 'bg-slate-50 text-slate-400';
                }
              }

              return (
                <div
                  key={dayNum}
                  onClick={() => setSelectedCalendarDateStr(dateString)}
                  className={`min-h-[52px] p-1.5 transition-colors cursor-pointer flex flex-col justify-between ${statusColor} ${
                    isSelected ? 'ring-2 ring-emerald-500 z-10' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-mono ${
                        isTodayCell
                          ? 'w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center'
                          : 'font-semibold text-slate-700'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {badgeColor && (
                      <span className={`w-2 h-2 rounded-full ${badgeColor}`} />
                    )}
                  </div>

                  {record && record.punchInTime && (
                    <div className="text-[9px] font-mono font-bold truncate">
                      {record.punchInTime && record.punchOutTime ? (
                        <span className="text-emerald-700">8h OK</span>
                      ) : (
                        <span className="text-blue-700">In {record.punchInTime.slice(0, 5)}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Detail Inspection */}
        {selectedCalendarDateStr && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
              <span className="font-bold text-slate-800">
                Attendance Details: {selectedCalendarDateStr}
              </span>
              {selectedDateRecord ? (
                selectedDateRecord.punchInTime && selectedDateRecord.punchOutTime ? (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                    PRESENT (GREEN)
                  </span>
                ) : selectedDateRecord.punchInTime ? (
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-300">
                    PUNCHED IN (BLUE)
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                    LEAVE / REST
                  </span>
                )
              ) : (
                <span className="text-[10px] text-slate-400 italic">No attendance record</span>
              )}
            </div>

            {selectedDateRecord ? (
              <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px] font-sans">Punch In</span>
                  <span className="font-bold text-slate-900">
                    {selectedDateRecord.punchInTime || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-sans">Punch Out</span>
                  {selectedDateRecord.punchOutTime ? (
                    <span className="font-bold text-slate-900">
                      {selectedDateRecord.punchOutTime}
                    </span>
                  ) : selectedDateRecord.punchInTime ? (
                    <span className="font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] inline-block border border-amber-200">
                      Missing Punch Out
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-sans">Working Hours</span>
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block">
                    {calculateDailyWorkingHours(
                      selectedDateRecord.punchInTime,
                      selectedDateRecord.punchOutTime,
                      selectedDateRecord.date,
                      selectedDateRecord.punchOutDate
                    ).formatted}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic">
                No attendance punch was recorded for this day.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCapturePhoto}
        title={cameraMode === 'punch_in' ? 'Punch In — Mark Attendance' : 'Punch Out — Save Attendance'}
        subtitle={`Employee: ${currentUser.name} (${currentUser.id})`}
      />
    </div>
  );
};
