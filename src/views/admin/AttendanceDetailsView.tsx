import React, { useState, useEffect } from 'react';
import { AttendanceRecord, Site, User } from '../../types';
import { storage } from '../../services/storage';
import { ExcelTable, ExcelColumn } from '../../components/ExcelTable';
import { PhotoViewerModal } from '../../components/PhotoViewerModal';
import {
  CalendarCheck,
  Building,
  Calendar,
  Camera,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Search,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  X,
  Loader2,
  Users,
} from 'lucide-react';
import { OTSheetView } from '../OTSheetView';
import { EmployeeWiseAttendanceView } from './EmployeeWiseAttendanceView';

interface AttendanceDetailsViewProps {
  currentUser: User;
  sites: Site[];
}

export const AttendanceDetailsView: React.FC<AttendanceDetailsViewProps> = ({
  currentUser,
  sites,
}) => {
  const isAdmin = currentUser.role === 'Admin';

  const [subView, setSubView] = useState<'employee_wise' | 'attendance' | 'ot_sheet'>('employee_wise');
  const [selectedEmpIdForCalendar, setSelectedEmpIdForCalendar] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState<number>(0);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchEmp, setSearchEmp] = useState<string>('');
  const [inspectPhoto, setInspectPhoto] = useState<string | null>(null);
  const [photoTitle, setPhotoTitle] = useState<string>('Attendance Photo');

  // Feedback notifications
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Individual deletion state
  const [recordToDelete, setRecordToDelete] = useState<AttendanceRecord | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState<boolean>(false);

  // Bulk / Delete All state
  const [showDeleteAllModal, setShowDeleteAllModal] = useState<boolean>(false);
  const [deleteAllStep, setDeleteAllStep] = useState<1 | 2>(1);
  const [deleteAllConfirmChecked, setDeleteAllConfirmChecked] = useState<boolean>(false);
  const [isDeletingAll, setIsDeletingAll] = useState<boolean>(false);

  // Storage event listener for reactive real-time updates
  useEffect(() => {
    const handleStorageUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ key?: string }>;
      if (
        !customEvent.detail ||
        customEvent.detail.key === 'pms_attendance_v2' ||
        customEvent.detail.key === 'pms_deleted_attendance_ids_v2' ||
        customEvent.detail.key === 'pms_attendance_cleared_all_v2'
      ) {
        setRefreshCount((prev) => prev + 1);
      }
    };

    window.addEventListener('pms_storage_updated', handleStorageUpdate);
    return () => window.removeEventListener('pms_storage_updated', handleStorageUpdate);
  }, []);

  // Fetch total database records and filtered records
  const allDbRecords = storage.getAttendance();
  const totalDbCount = allDbRecords.length;

  const rawRecords = storage.getAttendance({
    siteId: selectedSiteId === 'ALL' ? undefined : selectedSiteId,
    date: selectedDate || undefined,
  });

  const records = rawRecords.filter((r) =>
    searchEmp.trim() === ''
      ? true
      : r.employeeName.toLowerCase().includes(searchEmp.toLowerCase()) ||
        r.employeeId.toLowerCase().includes(searchEmp.toLowerCase())
  );

  const handleExportAttendance = () => {
    const exportData = records.map((r, i) => ({
      '#': i + 1,
      'Employee ID': r.employeeId,
      'Employee Name': r.employeeName,
      Date: r.date,
      Site: r.siteName,
      'Punch In Time': r.punchInTime || '—',
      'Punch Out Time': r.punchOutTime || '—',
      Status: r.status,
      Notes: r.notes || '',
    }));
    storage.exportReportToExcel(exportData, `Attendance_Logs_${selectedDate || 'All'}`);
  };

  // Execute single attendance record deletion
  const handleConfirmSingleDelete = () => {
    if (!recordToDelete) return;

    setIsDeletingSingle(true);
    try {
      const res = storage.deleteAttendanceRecord(recordToDelete.id);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setRecordToDelete(null);
        setRefreshCount((c) => c + 1);
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to delete attendance record.',
      });
    } finally {
      setIsDeletingSingle(false);
    }
  };

  // Execute Delete All attendance records
  const handleConfirmDeleteAll = () => {
    setIsDeletingAll(true);
    try {
      const res = storage.deleteAllAttendanceRecords();
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setShowDeleteAllModal(false);
        setDeleteAllStep(1);
        setDeleteAllConfirmChecked(false);
        setRefreshCount((c) => c + 1);
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to delete all attendance records.',
      });
    } finally {
      setIsDeletingAll(false);
    }
  };

  const columns: ExcelColumn<AttendanceRecord>[] = [
    {
      key: 'date',
      header: 'Date',
      width: 'w-24',
      render: (r) => <span className="font-mono text-slate-700">{r.date}</span>,
    },
    {
      key: 'employeeId',
      header: 'Emp ID',
      width: 'w-24',
      render: (r) => <span className="font-mono font-bold text-slate-900">{r.employeeId}</span>,
    },
    {
      key: 'employeeName',
      header: 'Employee Name',
      render: (r) => (
        <button
          type="button"
          onClick={() => {
            setSelectedEmpIdForCalendar(r.employeeId);
            setSubView('employee_wise');
          }}
          className="font-bold text-emerald-800 hover:text-emerald-600 hover:underline cursor-pointer text-left"
          title={`Click to view monthly attendance calendar for ${r.employeeName}`}
        >
          {r.employeeName}
        </button>
      ),
    },
    {
      key: 'siteName',
      header: 'Site',
      render: (r) => <span className="text-slate-600">{r.siteName}</span>,
    },
    {
      key: 'punchInTime',
      header: 'Punch In',
      width: 'w-24',
      align: 'center',
      render: (r) =>
        r.punchInTime ? (
          <span className="font-mono text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
            {r.punchInTime}
          </span>
        ) : (
          <span className="text-slate-400 font-mono">—</span>
        ),
    },
    {
      key: 'punchInPhoto',
      header: 'In Photo',
      width: 'w-20',
      align: 'center',
      render: (r) =>
        r.punchInPhoto ? (
          <button
            type="button"
            onClick={() => {
              setInspectPhoto(r.punchInPhoto!);
              setPhotoTitle(`Punch In Photo: ${r.employeeName} (${r.date})`);
            }}
            className="inline-flex items-center gap-1 text-[10px] text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 cursor-pointer"
          >
            <Camera className="w-3 h-3" /> View
          </button>
        ) : (
          <span className="text-slate-300 text-[10px]">—</span>
        ),
    },
    {
      key: 'punchOutTime',
      header: 'Punch Out',
      width: 'w-24',
      align: 'center',
      render: (r) =>
        r.punchOutTime ? (
          <span className="font-mono text-indigo-800 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
            {r.punchOutTime}
          </span>
        ) : (
          <span className="text-amber-600 text-[10px] font-semibold">Missing Out</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      width: 'w-24',
      align: 'center',
      render: (r) => {
        if (r.status === 'Present') {
          return (
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              PRESENT
            </span>
          );
        }
        if (r.status === 'PunchedIn') {
          return (
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
              PUNCHED IN
            </span>
          );
        }
        if (r.status === 'Leave') {
          return (
            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
              LEAVE
            </span>
          );
        }
        return (
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            INCOMPLETE
          </span>
        );
      },
    },
    ...(isAdmin
      ? [
          {
            key: 'action',
            header: 'Action',
            width: 'w-24',
            align: 'center' as const,
            render: (r: AttendanceRecord) => (
              <button
                type="button"
                onClick={() => setRecordToDelete(r)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded border border-rose-200 cursor-pointer transition-colors shadow-2xs"
                title={`Delete attendance record for ${r.employeeName} (${r.date})`}
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      {/* Sub-view switcher: Employee-Wise Attendance, Raw Logs, OT Sheet */}
      <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-start gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setSelectedEmpIdForCalendar(null);
            setSubView('employee_wise');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            subView === 'employee_wise'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" /> 1. Employee-Wise Attendance Details
        </button>
        <button
          type="button"
          onClick={() => setSubView('attendance')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            subView === 'attendance'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CalendarCheck className="w-4 h-4" /> 2. Attendance Logs & Punch Verification
        </button>
        <button
          type="button"
          onClick={() => setSubView('ot_sheet')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            subView === 'ot_sheet'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" /> 3. OT Sheet
        </button>
      </div>

      {subView === 'employee_wise' ? (
        <EmployeeWiseAttendanceView
          currentUser={currentUser}
          sites={sites}
          initialSelectedEmployeeId={selectedEmpIdForCalendar}
        />
      ) : subView === 'ot_sheet' ? (
        <OTSheetView currentUser={currentUser} sites={sites} />
      ) : (
        <>
          {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer ml-3"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-emerald-600" />
            Attendance Logs & Punch Verification
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Full audit log of camera punch ins, punch outs, facial capture snapshots, and daily status.
            <span className="ml-1 text-slate-700 font-medium">
              (Total records in database: <strong className="font-mono text-slate-900">{totalDbCount}</strong>)
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUser.siteId === 'ALL' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1">
              <Building className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
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

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs bg-transparent text-slate-800 focus:outline-hidden"
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate('')}
                className="text-[10px] text-slate-400 hover:text-slate-600 font-bold ml-1 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchEmp}
              onChange={(e) => setSearchEmp(e.target.value)}
              placeholder="Search employee..."
              className="text-xs pl-7 pr-2 py-1 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 w-36"
            />
            <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
          </div>

          <button
            type="button"
            onClick={handleExportAttendance}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>

          {/* Delete All Attendance Records Button - Admin Only */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setDeleteAllStep(1);
                setDeleteAllConfirmChecked(false);
                setShowDeleteAllModal(true);
              }}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              title="Delete all attendance punch records in one operation"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete All Attendance Records</span>
              <span className="bg-rose-800/80 text-rose-100 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                {totalDbCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Excel Table */}
      <ExcelTable
        columns={columns}
        data={records}
        keyExtractor={(r) => r.id}
        emptyMessage={
          totalDbCount === 0
            ? 'Zero attendance records in database. All records have been deleted.'
            : 'No attendance records match the specified filters.'
        }
      />

      {/* Photo Viewer Modal */}
      <PhotoViewerModal
        isOpen={!!inspectPhoto}
        onClose={() => setInspectPhoto(null)}
        photoUrl={inspectPhoto}
        title={photoTitle}
      />

      {/* Individual Attendance Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-rose-100 text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  Delete Attendance Record
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm permanent deletion of this employee attendance record from the database.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isDeletingSingle && setRecordToDelete(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer -mt-1 -mr-1"
                disabled={isDeletingSingle}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected record details summary */}
            <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Employee Name:</span>
                <span className="text-slate-900 font-bold">{recordToDelete.employeeName}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Employee ID:</span>
                <span className="font-mono font-bold text-slate-900">{recordToDelete.employeeId}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Attendance Date:</span>
                <span className="font-mono font-semibold text-slate-800">{recordToDelete.date}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Assigned Site:</span>
                <span className="text-slate-700 font-semibold">{recordToDelete.siteName}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Punch In Time:</span>
                <span className="font-mono font-semibold text-emerald-700">
                  {recordToDelete.punchInTime || '—'}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Punch Out Time:</span>
                <span className="font-mono font-semibold text-indigo-700">
                  {recordToDelete.punchOutTime || '— (Missing Out)'}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Status:</span>
                <span className="font-bold text-slate-800">{recordToDelete.status}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-400 font-medium">Record ID:</span>
                <span className="font-mono text-[10px] text-slate-500 truncate max-w-[200px]" title={recordToDelete.id}>
                  {recordToDelete.id}
                </span>
              </div>
            </div>

            <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Data Safety Notice:</strong> Deleting this record operates only on this specific date entry. The employee account, other attendance entries, and PMS progress records remain completely intact.
              </span>
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                disabled={isDeletingSingle}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                disabled={isDeletingSingle}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isDeletingSingle ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Attendance Records - Two-Step Strong Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            {deleteAllStep === 1 ? (
              <>
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-full bg-rose-100 text-rose-600 shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                        STEP 1 OF 2
                      </span>
                      <h3 className="text-base font-bold text-slate-900">
                        Delete All Attendance Records
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      You have initiated a bulk purge of all employee attendance records.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDeleteAllModal(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer -mt-1 -mr-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Highlighted Warning Stats */}
                <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-900">
                      Total Attendance Records to be Deleted:
                    </span>
                    <span className="font-mono text-base font-extrabold text-rose-700 bg-white px-2.5 py-0.5 rounded-lg border border-rose-200 shadow-2xs">
                      {totalDbCount} records
                    </span>
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    This operation will permanently purge all Punch In timestamps, Punch Out timestamps, facial capture snapshots, and daily attendance records across all employees, all dates, and all sites.
                  </p>
                </div>

                <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">Protected Master Data:</p>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5 text-slate-600">
                    <li>Employee user accounts and passwords remain safe.</li>
                    <li>Site master configurations and locations remain safe.</li>
                    <li>PMS Progress submissions and Employee Points remain safe.</li>
                  </ul>
                </div>

                {/* Modal Step 1 Actions */}
                <div className="mt-5 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowDeleteAllModal(false)}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteAllStep(2)}
                    disabled={totalDbCount === 0}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Proceed to Final Confirmation</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-full bg-rose-600 text-white shrink-0 animate-pulse">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-600 text-white border border-rose-700">
                        STEP 2 OF 2 &bull; FINAL CONFIRMATION
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      Are you absolutely sure?
                    </h3>
                    <p className="text-xs text-rose-600 font-semibold mt-0.5">
                      This action cannot be undone or reversed.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => !isDeletingAll && setShowDeleteAllModal(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer -mt-1 -mr-1"
                    disabled={isDeletingAll}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-red-50 border-2 border-red-300 space-y-3">
                  <p className="text-xs text-red-950 font-medium">
                    You are confirming the complete removal of <strong className="font-mono font-bold text-red-700">{totalDbCount} attendance records</strong> from the persistent database.
                  </p>
                  <p className="text-[11px] text-red-800">
                    After deletion, the attendance log and punch verification table will immediately show 0 records. The deletion will persist after page refresh, logging out, and signing in again.
                  </p>

                  <label className="flex items-start gap-2.5 p-3 rounded-lg bg-white border border-red-300 cursor-pointer hover:bg-red-50/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={deleteAllConfirmChecked}
                      onChange={(e) => setDeleteAllConfirmChecked(e.target.checked)}
                      disabled={isDeletingAll}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-red-900 select-none">
                      I understand that all {totalDbCount} attendance records will be permanently deleted and cannot be recovered.
                    </span>
                  </label>
                </div>

                {/* Modal Step 2 Actions */}
                <div className="mt-5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setDeleteAllStep(1)}
                    disabled={isDeletingAll}
                    className="px-3 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    &larr; Back to Step 1
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteAllModal(false)}
                      disabled={isDeletingAll}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDeleteAll}
                      disabled={!deleteAllConfirmChecked || isDeletingAll}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeletingAll ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Deleting All Records...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Confirm Permanent Delete All</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
