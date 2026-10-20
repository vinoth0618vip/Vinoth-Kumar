import React, { useState, useMemo } from 'react';
import { ProgressSubmission, Site, User } from '../../types';
import { storage } from '../../services/storage';
import { PhotoViewerModal } from '../../components/PhotoViewerModal';
import {
  TrendingUp,
  Building,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  User as UserIcon,
  MessageSquare,
  Image,
  Award,
  Filter,
  Eye,
  Check,
  Trash2,
  AlertTriangle,
  Shield,
  AlertCircle,
  BarChart3,
} from 'lucide-react';

interface ProgressMonitorProps {
  currentUser: User;
  sites: Site[];
  onRefresh: () => void;
}

export const ProgressMonitor: React.FC<ProgressMonitorProps> = ({
  currentUser,
  sites,
  onRefresh,
}) => {
  // If user is restricted to a specific site (like Manager or Supervisor), lock to that site
  const defaultSiteId =
    currentUser.siteId !== 'ALL' ? currentUser.siteId : sites[0]?.id || 'SITE-01';

  const [selectedSiteId, setSelectedSiteId] = useState<string>(defaultSiteId);
  const [selectedDate, setSelectedDate] = useState<string>(''); // empty means all dates
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<ProgressSubmission | null>(
    null
  );
  const [inspectPhotoUrl, setInspectPhotoUrl] = useState<string | null>(null);
  const [inspectPhotoTitle, setInspectPhotoTitle] = useState<string>('Photo Inspection');

  // Remarks state for approval modal
  const [supervisorNote, setSupervisorNote] = useState('');
  const [managerNote, setManagerNote] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Delete confirmation popup state
  const [recordToDelete, setRecordToDelete] = useState<ProgressSubmission | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [pageFeedback, setPageFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const selectedSite = sites.find((s) => s.id === selectedSiteId);

  // Retrieve records for selected site
  const rawSubmissions = storage.getProgressSubmissions({
    siteId: selectedSiteId,
    date: selectedDate || undefined,
  });

  const submissions =
    selectedStatus === 'ALL'
      ? rawSubmissions
      : rawSubmissions.filter((s) => s.approvalStatus === selectedStatus);

  // Calculate completion percentage of each site for horizontal bar chart visualization
  const siteProgressData = useMemo(() => {
    const allProgress = storage.getProgressSubmissions();
    const allGuides = storage.getWorkGuides();

    return sites.map((site) => {
      const siteGuides = allGuides.filter((g) => g.siteId === site.id);
      const siteSubs = allProgress.filter((p) => p.siteId === site.id);
      const approvedSubs = siteSubs.filter((p) => p.approvalStatus === 'Approved');

      const totalTargetQty = siteGuides.reduce((sum, g) => sum + (Number(g.totalQuantity) || 0), 0);
      const totalCompletedQty = siteGuides.reduce((sum, g) => sum + (Number(g.completedQuantity) || 0), 0);

      let completionPct = 0;
      if (totalTargetQty > 0) {
        completionPct = Math.min(100, Math.round((totalCompletedQty / totalTargetQty) * 100));
      } else if (siteSubs.length > 0) {
        completionPct = Math.min(100, Math.round((approvedSubs.length / siteSubs.length) * 100));
      }

      return {
        id: site.id,
        siteNumber: site.siteNumber,
        name: site.name,
        completionPct,
        totalTargetQty,
        totalCompletedQty,
        totalSubmissions: siteSubs.length,
        approvedSubmissions: approvedSubs.length,
        isSelected: site.id === selectedSiteId,
      };
    });
  }, [sites, selectedSiteId]);

  const averageCompletion = useMemo(() => {
    if (siteProgressData.length === 0) return 0;
    const sum = siteProgressData.reduce((acc, s) => acc + s.completionPct, 0);
    return Math.round(sum / siteProgressData.length);
  }, [siteProgressData]);

  const handleOpenDetail = (record: ProgressSubmission) => {
    setSelectedRecordForDetail(record);
    setSupervisorNote(record.supervisorRemarks || '');
    setManagerNote(record.managerRemarks || '');
    setFeedback(null);
  };

  const handleUpdateStatus = (status: 'Approved' | 'Rejected' | 'Reviewed') => {
    if (!selectedRecordForDetail) return;

    const res = storage.updateProgressApproval(
      selectedRecordForDetail.id,
      status,
      supervisorNote.trim() || undefined,
      managerNote.trim() || undefined
    );

    if (res.success) {
      setFeedback(`Record successfully marked as ${status}.`);
      onRefresh();
      // Update local detailed record view
      setSelectedRecordForDetail((prev) =>
        prev
          ? {
              ...prev,
              approvalStatus: status,
              supervisorRemarks: supervisorNote.trim() || prev.supervisorRemarks,
              managerRemarks: managerNote.trim() || prev.managerRemarks,
            }
          : null
      );
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  // Open Delete Confirmation Modal
  const handlePromptDelete = (e: React.MouseEvent, record: ProgressSubmission) => {
    e.stopPropagation();
    setRecordToDelete(record);
    setPageFeedback(null);
  };

  const handleCancelDelete = () => {
    if (isDeleting) return;
    setRecordToDelete(null);
  };

  const handleConfirmDelete = () => {
    if (!recordToDelete || isDeleting) return;

    setIsDeleting(true);
    const targetId = recordToDelete.id;
    const targetCode = recordToDelete.workCode;
    const targetWorker = recordToDelete.employeeName;

    try {
      const res = storage.deleteProgressSubmission(targetId);
      setIsDeleting(false);

      if (res.success) {
        setRecordToDelete(null);
        // If the detail modal was inspecting this record, close it
        if (selectedRecordForDetail?.id === targetId) {
          setSelectedRecordForDetail(null);
        }
        setPageFeedback({
          type: 'success',
          message:
            res.message ||
            `Progress record for ${targetCode} (${targetWorker}) deleted successfully. Points and quantities recalculated.`,
        });
        onRefresh();
        setTimeout(() => setPageFeedback(null), 4000);
      } else {
        setRecordToDelete(null);
        setPageFeedback({
          type: 'error',
          message: res.message || 'Failed to delete progress record.',
        });
      }
    } catch (err: any) {
      setIsDeleting(false);
      setRecordToDelete(null);
      setPageFeedback({
        type: 'error',
        message: err?.message || 'An unexpected error occurred while deleting the progress record.',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle className="w-3 h-3 text-emerald-600" /> APPROVED
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3 h-3 text-rose-600" /> REJECTED
          </span>
        );
      case 'Reviewed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
            <Check className="w-3 h-3 text-indigo-600" /> REVIEWED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600" /> PENDING
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Site Header: Show selected site name ONCE here, not repeated in every record card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Site Progress Monitor
              </span>
              <span className="font-mono text-xs text-slate-400">
                [{selectedSite?.siteNumber || 'S-101'}]
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              {selectedSite?.name || 'Selected Construction Site'}
            </h2>
            <p className="text-xs text-slate-500">
              Site Address: {selectedSite?.address || 'Site Area'}
            </p>
          </div>

          {/* Controls: Site Selector (if permitted), Date Filter, Status Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {currentUser.siteId === 'ALL' && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={selectedSiteId}
                  onChange={(e) => {
                    setSelectedSiteId(e.target.value);
                    setSelectedRecordForDetail(null);
                  }}
                  className="text-xs bg-transparent text-slate-800 font-semibold focus:outline-hidden"
                >
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
                title="Filter by Submission Date"
              />
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  className="text-[10px] text-slate-400 hover:text-slate-600 font-bold ml-1"
                >
                  Clear
                </button>
              )}
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium focus:outline-hidden"
            >
              <option value="ALL">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Quick Summary Stats Bar */}
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 block uppercase">Submissions</span>
            <span className="font-bold text-slate-800 text-sm">{submissions.length}</span>
          </div>
          <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
            <span className="text-[10px] text-emerald-700 block uppercase">Approved</span>
            <span className="font-bold text-emerald-800 text-sm">
              {submissions.filter((s) => s.approvalStatus === 'Approved').length}
            </span>
          </div>
          <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
            <span className="text-[10px] text-amber-700 block uppercase">Pending Review</span>
            <span className="font-bold text-amber-800 text-sm">
              {submissions.filter((s) => s.approvalStatus === 'Pending').length}
            </span>
          </div>
          <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-200">
            <span className="text-[10px] text-indigo-700 block uppercase">Total Points</span>
            <span className="font-bold text-indigo-800 text-sm">
              {submissions.reduce((acc, s) => acc + (s.points || 0), 0)} pts
            </span>
          </div>
        </div>
      </div>

      {/* Site Completion Percentage Horizontal Bar Chart Visualization */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <BarChart3 className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                Site Completion Progress Overview
              </h3>
              <p className="text-[11px] text-slate-500">
                Visual horizontal bar chart showing completion percentage for each site. Click a bar to filter records.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
              Average Completion: <strong className="font-mono text-emerald-700 font-bold">{averageCompletion}%</strong>
            </span>
            <span className="text-[11px] text-slate-400">({sites.length} Sites)</span>
          </div>
        </div>

        {siteProgressData.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">No active sites to visualize.</p>
        ) : (
          <div className="space-y-3 pt-1">
            {siteProgressData.map((item) => {
              // Color styles based on completion percentage
              let barGradient = 'from-emerald-500 to-teal-600';
              let badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
              if (item.completionPct >= 75) {
                barGradient = 'from-emerald-500 to-teal-600';
                badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
              } else if (item.completionPct >= 40) {
                barGradient = 'from-blue-500 to-cyan-600';
                badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';
              } else if (item.completionPct > 0) {
                barGradient = 'from-amber-500 to-orange-500';
                badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
              } else {
                barGradient = 'from-slate-300 to-slate-400';
                badgeColor = 'bg-slate-100 text-slate-600 border-slate-200';
              }

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedSiteId(item.id);
                    setSelectedRecordForDetail(null);
                  }}
                  className={`group p-2.5 rounded-lg border transition-all cursor-pointer ${
                    item.isSelected
                      ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-300 shadow-2xs'
                      : 'bg-slate-50/50 hover:bg-slate-100/70 border-slate-200 hover:border-slate-300'
                  }`}
                  title={`Click to switch filter to ${item.name}`}
                >
                  {/* Top line: Site info and Completion Percentage */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[11px] font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                        {item.siteNumber}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                        {item.name}
                      </span>
                      {item.isSelected && (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-600 text-white px-1.5 py-0.2 rounded shrink-0">
                          Active Selection
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${badgeColor}`}
                      >
                        {item.completionPct}%
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar Chart Track */}
                  <div className="w-full bg-slate-200/80 rounded-full h-3 overflow-hidden p-0.5 shadow-inner">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-500 shadow-xs`}
                      style={{
                        width: `${Math.max(item.completionPct, item.completionPct > 0 ? 3 : 0)}%`,
                      }}
                    />
                  </div>

                  {/* Subtext info */}
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                    <span>
                      {item.totalTargetQty > 0
                        ? `${item.totalCompletedQty.toLocaleString()} / ${item.totalTargetQty.toLocaleString()} units completed`
                        : `${item.approvedSubmissions} approved of ${item.totalSubmissions} submissions`}
                    </span>
                    <span className="font-medium text-slate-400 group-hover:text-emerald-600 transition-colors">
                      {item.isSelected ? '● Currently viewing' : 'Click to view site records →'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Global Page Feedback (Shows confirmation after deletion or error) */}
      {pageFeedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 shadow-xs transition-all ${
            pageFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {pageFeedback.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span className="font-medium">{pageFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setPageFeedback(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
            title="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Progress Cards List — Compact, clean layout matching Employee My Saved Progress */}
      {submissions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
          <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700">No progress submissions found.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {selectedDate
              ? `No records found for date ${selectedDate}. Try clearing the date filter.`
              : 'Employees submit progress via their Progress Update screen.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {submissions.map((sub) => {
            const isCritical = sub.workType === 'Critical Work' || sub.workType === 'Very Critical Work';

            return (
              <div
                key={sub.id}
                onClick={() => handleOpenDetail(sub)}
                className="bg-white rounded-xl border border-slate-200 hover:border-emerald-300 p-3.5 shadow-2xl transition-all cursor-pointer hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  {/* Top line: Employee Name, ID, Points & Status */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {sub.employeeName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-slate-900 truncate block">
                          {sub.employeeName}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {sub.employeeId}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 flex items-center gap-1">
                        <Award className="w-3 h-3 text-indigo-600" />
                        {sub.points} pts
                      </span>
                      {getStatusBadge(sub.approvalStatus)}
                      {currentUser.role === 'Admin' && (
                        <button
                          type="button"
                          onClick={(e) => handlePromptDelete(e, sub)}
                          className="p-1 hover:bg-rose-100 text-rose-600 hover:text-rose-800 rounded transition-colors cursor-pointer ml-0.5"
                          title={`Delete progress record for ${sub.workCode} (${sub.employeeName})`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Work Code & Description */}
                  <div className="space-y-1 mb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-300">
                        {sub.workCode}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          sub.workType === 'Very Critical Work'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : sub.workType === 'Critical Work'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {sub.workType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 font-medium line-clamp-1">
                      {sub.workDescription}
                    </p>
                  </div>

                  {/* Quantity & Hours Metrics */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50/80 p-2 rounded-lg border border-slate-200/80 text-center mb-2">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Completed</span>
                      <span className="font-bold text-xs text-slate-900 font-mono">
                        {sub.completedQuantity} {sub.uom}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Work by Hour</span>
                      <span className="font-semibold text-xs text-slate-700 font-mono">
                        {sub.workGuideRate}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Hours</span>
                      <span className="font-bold text-xs text-emerald-700 font-mono">
                        {sub.workingHours} hrs
                      </span>
                    </div>
                  </div>

                  {/* Employee Remarks preview */}
                  {sub.employeeRemarks && (
                    <p className="text-[11px] text-slate-600 italic line-clamp-1 mb-2 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-slate-400 shrink-0" />
                      &ldquo;{sub.employeeRemarks}&rdquo;
                    </p>
                  )}
                </div>

                {/* Footer: Date, Photos thumbnail and inspect button */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    {sub.submissionDate} • {sub.submissionTime}
                  </span>
                  <div className="flex items-center gap-1">
                    {(sub.beforePhotos?.length > 0 || sub.afterPhotos?.length > 0) && (
                      <span className="flex items-center gap-0.5 text-emerald-700 font-medium text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded">
                        <Image className="w-3 h-3" />
                        {(sub.beforePhotos?.length || 0) + (sub.afterPhotos?.length || 0)} photos
                      </span>
                    )}
                    <span className="text-emerald-600 font-semibold text-xs flex items-center gap-0.5 ml-1">
                      <Eye className="w-3 h-3" /> Details
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Record Modal (Layout matches Employee My Saved Progress) */}
      {selectedRecordForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Progress Record: {selectedRecordForDetail.workCode}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Submitted by {selectedRecordForDetail.employeeName} ({selectedRecordForDetail.employeeId})
                </p>
              </div>
              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {feedback && (
                <div className="p-2.5 rounded-lg text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> {feedback}
                </div>
              )}

              {/* Status and Points banner */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Status:</span>
                  {getStatusBadge(selectedRecordForDetail.approvalStatus)}
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 mr-1.5">Awarded Points:</span>
                  <span className="font-bold text-sm text-indigo-700 font-mono">
                    {selectedRecordForDetail.points} pts
                  </span>
                </div>
              </div>

              {/* Core Details matching Employee My Saved Progress */}
              <div className="space-y-2 text-xs border border-slate-200 rounded-xl p-3 bg-white">
                <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Work Code</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedRecordForDetail.workCode}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Work Type</span>
                    <span className="font-semibold text-slate-800">
                      {selectedRecordForDetail.workType}
                    </span>
                  </div>
                </div>

                <div className="pb-2 border-b border-slate-100">
                  <span className="text-[10px] text-slate-400 block uppercase">Work Description</span>
                  <span className="font-medium text-slate-800">
                    {selectedRecordForDetail.workDescription}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pb-2 border-b border-slate-100 text-center">
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block uppercase">Completed</span>
                    <span className="font-bold text-emerald-700 font-mono text-sm">
                      {selectedRecordForDetail.completedQuantity} {selectedRecordForDetail.uom}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block uppercase">Work by Hour</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {selectedRecordForDetail.workGuideRate}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block uppercase">Working Hours</span>
                    <span className="font-bold text-slate-800 font-mono text-sm">
                      {selectedRecordForDetail.workingHours} hrs
                    </span>
                  </div>
                </div>

                {selectedRecordForDetail.followWorkerIds && (
                  <div className="pb-2 border-b border-slate-100">
                    <span className="text-[10px] text-slate-400 block uppercase">Follow Worker IDs</span>
                    <span className="font-mono text-slate-700">
                      {selectedRecordForDetail.followWorkerIds}
                    </span>
                  </div>
                )}

                {selectedRecordForDetail.employeeRemarks && (
                  <div className="p-2 bg-emerald-50/50 rounded-lg border border-emerald-100">
                    <span className="text-[10px] text-emerald-800 font-bold block uppercase">
                      Employee Remarks
                    </span>
                    <p className="text-slate-700 italic mt-0.5">
                      {selectedRecordForDetail.employeeRemarks}
                    </p>
                  </div>
                )}
              </div>

              {/* Photos Section */}
              <div className="space-y-3">
                {/* Before-work Photos */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5 text-emerald-600" />
                    Before-work Photos ({selectedRecordForDetail.beforePhotos?.length || 0})
                  </h4>
                  {selectedRecordForDetail.beforePhotos && selectedRecordForDetail.beforePhotos.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {selectedRecordForDetail.beforePhotos.map((img, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setInspectPhotoUrl(img);
                            setInspectPhotoTitle(
                              `Before-work Photo #${i + 1} (${selectedRecordForDetail.workCode})`
                            );
                          }}
                          className="aspect-square rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:opacity-90 relative group"
                        >
                          <img
                            src={img}
                            alt="Before work preview"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                            View
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No before-work photos attached.</p>
                  )}
                </div>

                {/* After-work Photos */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5 text-emerald-600" />
                    After-work Photos ({selectedRecordForDetail.afterPhotos?.length || 0})
                  </h4>
                  {selectedRecordForDetail.afterPhotos && selectedRecordForDetail.afterPhotos.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {selectedRecordForDetail.afterPhotos.map((img, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setInspectPhotoUrl(img);
                            setInspectPhotoTitle(
                              `After-work Photo #${i + 1} (${selectedRecordForDetail.workCode})`
                            );
                          }}
                          className="aspect-square rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:opacity-90 relative group"
                        >
                          <img
                            src={img}
                            alt="After work preview"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                            View
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No after-work photos attached.</p>
                  )}
                </div>
              </div>

              {/* Administrative Remarks, Approval Controls, and Delete Button */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-900">
                  Review Remarks & Action
                </h4>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Supervisor / Manager Remarks
                  </label>
                  <textarea
                    value={managerNote}
                    onChange={(e) => setManagerNote(e.target.value)}
                    placeholder="Add remarks or site verification notes..."
                    rows={2}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('Approved')}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('Reviewed')}
                    className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Reviewed
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus('Rejected')}
                    className="py-2 px-3 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>

                {/* Admin Delete Action Inside Detail Modal */}
                {currentUser.role === 'Admin' && (
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={(e) => handlePromptDelete(e, selectedRecordForDetail)}
                      className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Delete this specific progress submission"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete Progress Entry
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Before Progress Deletion Modal Popup */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-rose-600 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-100" />
                Confirm Delete Progress Record
              </h3>
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="text-rose-200 hover:text-white transition-colors cursor-pointer"
                title="Cancel"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-900 font-semibold">
                    Are you sure you want to delete this specific progress entry?
                  </p>
                </div>

                {/* Selected Progress Record Details */}
                <div className="bg-white p-3 rounded-lg border border-rose-200/80 space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 text-[11px]">Employee Name:</span>
                    <strong className="text-slate-900 font-bold">{recordToDelete.employeeName}</strong>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 text-[11px]">Employee ID:</span>
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.2 rounded">
                      {recordToDelete.employeeId}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 text-[11px]">Site Name:</span>
                    <span className="text-slate-800 font-medium truncate max-w-[200px]">
                      {recordToDelete.siteName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 text-[11px]">Work Code:</span>
                    <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      {recordToDelete.workCode}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 text-[11px]">Submission Date:</span>
                    <span className="font-mono text-slate-800 font-medium">
                      {recordToDelete.submissionDate} • {recordToDelete.submissionTime}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 text-[11px]">Completed Quantity:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {recordToDelete.completedQuantity} {recordToDelete.uom} ({recordToDelete.workingHours} hrs)
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-500 text-[11px]">Awarded Points:</span>
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                      {recordToDelete.points} pts
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Recalculation & Preservation Notice */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Automatic Recalculation:</strong> Deleting this record will delete ONLY this entry. Employee points, completed quantities, and balance quantities will be immediately recalculated. Other progress submissions and attendance records for this employee will remain untouched.
                </span>
              </div>

              {/* Modal Actions: Cancel and Confirm Delete */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-98"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" /> Confirm Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Full-Res Inspection Modal */}
      <PhotoViewerModal
        isOpen={!!inspectPhotoUrl}
        onClose={() => setInspectPhotoUrl(null)}
        photoUrl={inspectPhotoUrl}
        title={inspectPhotoTitle}
      />
    </div>
  );
};
