import React, { useState, useEffect } from 'react';
import { Site } from '../../types';
import { storage } from '../../services/storage';
import { ExcelTable, ExcelColumn } from '../../components/ExcelTable';
import {
  MapPin,
  Plus,
  Check,
  AlertCircle,
  Building,
  Hash,
  Trash2,
  Edit2,
  X,
  AlertTriangle,
  Shield,
  Archive,
  RefreshCw,
  Users,
  CalendarCheck,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';

interface SitesManagementProps {
  sites: Site[];
  onRefresh: () => void;
}

export const SitesManagement: React.FC<SitesManagementProps> = ({ sites, onRefresh }) => {
  // Sync state to guarantee immediate refresh when sites are modified in storage
  const [, setStorageSyncTick] = useState<number>(0);

  useEffect(() => {
    const handleStorageSync = () => {
      setStorageSyncTick((prev) => prev + 1);
    };

    window.addEventListener('pms_storage_updated', handleStorageSync);
    window.addEventListener('pms_sites_updated', handleStorageSync);
    window.addEventListener('pms_sites_cleared', handleStorageSync);
    return () => {
      window.removeEventListener('pms_storage_updated', handleStorageSync);
      window.removeEventListener('pms_sites_updated', handleStorageSync);
      window.removeEventListener('pms_sites_cleared', handleStorageSync);
    };
  }, []);

  // Guarantee single source of truth: Add Site and Site List use the exact same storage data source
  const freshStoredSites = storage.getSites();
  const currentSites: Site[] = freshStoredSites.length > 0 || sites.length === 0 ? freshStoredSites : sites;

  // Add Site Form state
  const [siteName, setSiteName] = useState('');
  const [siteNumber, setSiteNumber] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [locationDetails, setLocationDetails] = useState('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    title?: string;
    message: string;
    errorCode?: string;
  } | null>(null);

  // Filter state for Site List
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');

  // Edit Site Modal state
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [editName, setEditName] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editLocationDetails, setEditLocationDetails] = useState('');
  const [editActive, setEditActive] = useState<boolean>(true);

  // Delete Confirmation Modal state
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const [deleteDependencies, setDeleteDependencies] = useState<{
    hasDependencies: boolean;
    userCount: number;
    attendanceCount: number;
    progressCount: number;
    workGuideCount: number;
    summary: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Bulk delete all sites modal state
  const [showDeleteAllSitesModal, setShowDeleteAllSitesModal] = useState<boolean>(false);
  const [deleteAllSitesConfirmText, setDeleteAllSitesConfirmText] = useState<string>('');
  const [isDeletingAllSites, setIsDeletingAllSites] = useState<boolean>(false);
  const [allSitesDeps, setAllSitesDeps] = useState<{
    totalSites: number;
    totalAssignedUsers: number;
    totalAttendanceRecords: number;
    totalProgressRecords: number;
    totalWorkGuides: number;
    sitesBreakdown: any[];
  } | null>(null);

  const handleOpenDeleteAllSites = () => {
    const deps = storage.checkAllSitesDependencies();
    setAllSitesDeps(deps);
    setDeleteAllSitesConfirmText('');
    setShowDeleteAllSitesModal(true);
    setFeedback(null);
  };

  const handleConfirmDeleteAllSites = () => {
    if (isDeletingAllSites || deleteAllSitesConfirmText.trim() !== 'DELETE') return;
    setIsDeletingAllSites(true);
    setFeedback(null);

    try {
      const res = storage.deleteAllSites();
      setIsDeletingAllSites(false);
      setShowDeleteAllSitesModal(false);
      setDeleteAllSitesConfirmText('');

      if (res.success) {
        setFeedback({
          type: 'success',
          title: 'All Sites Deleted',
          message: res.message,
        });
        onRefresh();
      } else {
        setFeedback({
          type: 'error',
          title: 'Deletion Failed',
          message: res.message,
        });
      }
    } catch (err: any) {
      setIsDeletingAllSites(false);
      setShowDeleteAllSitesModal(false);
      setFeedback({
        type: 'error',
        title: 'Deletion Error',
        message: err?.message || 'Failed to delete all sites.',
      });
    }
  };

  const handleCreateSite = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = siteName.trim();
    const trimmedAddress = siteAddress.trim();
    const trimmedNumber = siteNumber.trim();
    const trimmedLocation = locationDetails.trim();

    if (!trimmedName) {
      setFeedback({ type: 'error', message: 'Site Name is required.' });
      return;
    }
    if (!trimmedAddress) {
      setFeedback({ type: 'error', message: 'Site Address & Location is required.' });
      return;
    }

    const res = storage.saveSite({
      name: trimmedName,
      address: trimmedAddress,
      siteNumber: trimmedNumber,
      locationDetails: trimmedLocation || 'General Site Perimeter',
      active: true,
    });

    if (res.success && res.site) {
      setFeedback({
        type: 'success',
        title: 'Site Added Successfully',
        message: `Site "${res.site.name}" (${res.site.siteNumber}) added successfully with ID: ${res.site.id}.`,
      });
      setSiteName('');
      setSiteNumber('');
      setSiteAddress('');
      setLocationDetails('');
      // Reset filter if user was viewing Archived sites so the new active site is in view
      if (statusFilter === 'ARCHIVED') {
        setStatusFilter('ALL');
      }
      onRefresh();
      setStorageSyncTick((v) => v + 1);
      setTimeout(() => setFeedback(null), 5000);
    } else {
      setFeedback({
        type: 'error',
        title: 'Unable to Add Site',
        message: res.message || 'Failed to save site record.',
      });
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (site: Site) => {
    setEditingSite(site);
    setEditName(site.name);
    setEditNumber(site.siteNumber);
    setEditAddress(site.address);
    setEditLocationDetails(site.locationDetails || '');
    setEditActive(site.active);
    setFeedback(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSite) return;

    const trimmedName = editName.trim();
    const trimmedAddress = editAddress.trim();
    const trimmedNumber = editNumber.trim();
    const trimmedLocation = editLocationDetails.trim();

    if (!trimmedName) {
      setFeedback({ type: 'error', message: 'Site Name is required.' });
      return;
    }
    if (!trimmedAddress) {
      setFeedback({ type: 'error', message: 'Site Address & Location is required.' });
      return;
    }

    const updatedSite: Site = {
      ...editingSite,
      name: trimmedName,
      siteNumber: trimmedNumber || editingSite.siteNumber,
      address: trimmedAddress,
      locationDetails: trimmedLocation || 'General Site Perimeter',
      active: editActive,
    };

    const res = storage.saveSite(updatedSite);
    if (res.success && res.site) {
      setFeedback({
        type: 'success',
        title: 'Site Updated',
        message: `Site "${res.site.name}" (${res.site.siteNumber}) updated successfully.`,
      });
      setEditingSite(null);
      onRefresh();
      setStorageSyncTick((v) => v + 1);
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  // Open Delete Confirmation Modal
  const handlePromptDelete = (e: React.MouseEvent, site: Site) => {
    e.stopPropagation();
    const deps = storage.checkSiteDependencies(site.id);
    setSiteToDelete(site);
    setDeleteDependencies(deps);
    setModalError(null);
    setFeedback(null);
  };

  const handleCancelDelete = () => {
    if (isDeleting) return;
    setSiteToDelete(null);
    setDeleteDependencies(null);
    setModalError(null);
  };

  // Execute Site Deletion (Safely cascades work guides & reassigns staff)
  const handleConfirmDelete = () => {
    if (!siteToDelete || isDeleting) return;

    setIsDeleting(true);
    setModalError(null);
    const targetId = siteToDelete.id;
    const targetName = siteToDelete.name;

    try {
      const res = storage.deleteSite(targetId);
      setIsDeleting(false);

      if (res.success) {
        setSiteToDelete(null);
        setDeleteDependencies(null);
        setFeedback({
          type: 'success',
          title: 'Site Deleted',
          message: res.message || `Site "${targetName}" (${targetId}) deleted successfully.`,
        });
        onRefresh();
        setTimeout(() => setFeedback(null), 5000);
      } else {
        setModalError(res.message);
        setFeedback({
          type: 'error',
          title: 'Delete Failed',
          message: res.message,
        });
      }
    } catch (err: any) {
      setIsDeleting(false);
      const errMsg = err?.message || 'An unexpected database error occurred while deleting the site.';
      setModalError(errMsg);
      setFeedback({
        type: 'error',
        title: 'Delete Failed',
        message: errMsg,
      });
    }
  };

  // Reactivate an archived site
  const handleReactivate = (siteId: string) => {
    const res = storage.unarchiveSite(siteId);
    if (res.success) {
      setFeedback({
        type: 'success',
        title: 'Site Reactivated',
        message: res.message,
      });
      onRefresh();
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback({
        type: 'error',
        message: res.message,
      });
    }
  };

  // Filtered sites list derived from unified single source of truth
  const filteredSites = currentSites.filter((s) => {
    if (statusFilter === 'ACTIVE') return s.active !== false;
    if (statusFilter === 'ARCHIVED') return s.active === false;
    return true;
  });

  const activeCount = currentSites.filter((s) => s.active !== false).length;
  const archivedCount = currentSites.filter((s) => s.active === false).length;

  const columns: ExcelColumn<Site>[] = [
    {
      key: 'siteNumber',
      header: 'Site No.',
      width: 'w-24',
      render: (s) => (
        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
          {s.siteNumber}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Site Name',
      render: (s) => (
        <div className="font-semibold text-slate-800">
          {s.name}
          {s.locationDetails && (
            <span className="block text-[10px] text-slate-500 font-normal">
              Zone: {s.locationDetails}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Site Address & Location',
      render: (s) => (
        <div className="flex items-start gap-1 text-slate-600">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span>{s.address}</span>
        </div>
      ),
    },
    {
      key: 'active',
      header: 'Status',
      width: 'w-28',
      align: 'center',
      render: (s) => (
        <span
          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
            s.active
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
              : 'bg-amber-100 text-amber-800 border-amber-300'
          }`}
        >
          {s.active ? 'ACTIVE' : 'ARCHIVED'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Settings -> Add Site Form */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-emerald-600" />
            Add New Construction / Project Site
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin site creation. Only Admin-created sites appear in employee assignment, Work Guide upload, and progress tracking.
          </p>
        </div>

        {/* Global Page Feedback (Shows confirmation after site add/edit/delete or constraint error) */}
        {feedback && (
          <div
            className={`mb-4 p-3.5 rounded-xl text-xs flex items-start justify-between gap-3 shadow-xs transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : feedback.type === 'warning'
                ? 'bg-amber-50 text-amber-900 border border-amber-200'
                : 'bg-rose-50 text-rose-900 border border-rose-300'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {feedback.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              )}
              <div className="space-y-0.5">
                {feedback.title && (
                  <div className="font-bold flex items-center gap-2">
                    <span>{feedback.title}</span>
                    {feedback.errorCode && (
                      <span className="font-mono text-[10px] px-1.5 py-0.2 bg-rose-200 text-rose-900 rounded font-bold">
                        {feedback.errorCode}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-[11px] leading-relaxed">{feedback.message}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer shrink-0"
              title="Dismiss notification"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleCreateSite} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Site Name *
              </label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. Jurong Island Refinery Phase 2"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Site Number / Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={siteNumber}
                  onChange={(e) => setSiteNumber(e.target.value)}
                  placeholder="e.g. S-104"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500 pl-7"
                />
                <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Site Address & Location *
              </label>
              <input
                type="text"
                value={siteAddress}
                onChange={(e) => setSiteAddress(e.target.value)}
                placeholder="e.g. 15 Banyan Drive, Jurong Island, Singapore 628312"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Zone / Area Details
              </label>
              <input
                type="text"
                value={locationDetails}
                onChange={(e) => setLocationDetails(e.target.value)}
                placeholder="e.g. Sector 4, Process Plant Building B"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create & Add Site
            </button>
          </div>
        </form>
      </div>

      {/* Site List Below Entry Form in Required Excel-Style Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>Site List (Excel Table Format)</span>
              <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                {currentSites.length} SITES
              </span>
            </h3>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              | Visible borders for headers, columns, rows & cells
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenDeleteAllSites}
              disabled={currentSites.length === 0}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
              title={currentSites.length === 0 ? 'No sites to delete' : `Permanently delete all ${currentSites.length} sites`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete All Sites</span>
            </button>

            {/* Status Filter Tabs */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Sites ({currentSites.length})
              </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ARCHIVED')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                statusFilter === 'ARCHIVED'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Archived ({archivedCount})
            </button>
          </div>
        </div>
      </div>

        <ExcelTable
          columns={columns}
          data={filteredSites}
          keyExtractor={(s) => s.id}
          emptyMessage="No sites match the selected filter."
          actionsHeader="Action"
          showIndex={false}
          renderActions={(s) => (
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenEdit(s);
                }}
                className="p-1.5 hover:bg-emerald-100 text-emerald-700 rounded transition-colors cursor-pointer"
                title={`Edit Site: ${s.name} (${s.siteNumber})`}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => handlePromptDelete(e, s)}
                className="p-1.5 hover:bg-rose-100 text-rose-600 hover:text-rose-800 rounded transition-colors cursor-pointer"
                title={`Delete Site: ${s.name} (${s.siteNumber}, ID: ${s.id})`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              {s.active === false && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReactivate(s.id);
                  }}
                  className="p-1.5 hover:bg-emerald-100 text-emerald-600 rounded transition-colors cursor-pointer"
                  title="Reactivate archived site for assignments & progress"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        />
      </div>

      {/* Confirmation Before Deletion Modal Popup */}
      {siteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-rose-600 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-100" />
                Site Deletion & Dependency Audit
              </h3>
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="text-rose-200 hover:text-white transition-colors cursor-pointer"
                title="Cancel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Modal Inline Error if Deletion Failed */}
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold">Database Operation Rejected:</span>
                    <p className="text-[11px]">{modalError}</p>
                  </div>
                </div>
              )}

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-900 font-semibold">
                    Target Site for Deletion:
                  </p>
                </div>

                {/* Selected Site Details */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 text-[11px]">Site Name:</span>
                    <strong className="text-slate-900 font-bold">{siteToDelete.name}</strong>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 text-[11px]">Site Number:</span>
                    <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      {siteToDelete.siteNumber}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 text-[11px]">Unique Site ID:</span>
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.2 rounded">
                      {siteToDelete.id}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                    <span className="text-slate-500 text-[11px]">Current Status:</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                        siteToDelete.active
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      {siteToDelete.active ? 'ACTIVE' : 'ARCHIVED'}
                    </span>
                  </div>
                  <div className="flex justify-between items-start py-0.5">
                    <span className="text-slate-500 text-[11px]">Address:</span>
                    <span className="text-slate-800 font-medium text-right max-w-[240px] truncate">
                      {siteToDelete.address}
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Dependency & Reassignment Notice */}
              {deleteDependencies && deleteDependencies.userCount > 0 && (
                <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200 text-xs text-indigo-950 flex items-start gap-2">
                  <Users className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Staff Reassignment:</strong> {deleteDependencies.userCount} assigned employee(s) will be automatically and safely reassigned to All Sites (Corporate HQ). Their accounts and credentials remain safe.
                  </span>
                </div>
              )}

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Data Safety:</strong> Historical attendance logs, progress submissions, and employee points will be preserved in the audit database.
                </span>
              </div>

              {modalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Deleting Site...</span>
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
        </div>
      )}

      {/* Delete All Sites Confirmation Modal */}
      {showDeleteAllSitesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-rose-300">
            {/* Header */}
            <div className="px-5 py-3.5 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-white" />
                <h3 className="font-bold text-sm tracking-tight">
                  Delete All Construction Sites
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isDeletingAllSites) {
                    setShowDeleteAllSitesModal(false);
                    setDeleteAllSitesConfirmText('');
                  }
                }}
                disabled={isDeletingAllSites}
                className="text-white/80 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Alert Warning Box */}
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-800">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Permanent Bulk Deletion Notice</span>
                </div>
                <p className="leading-relaxed">
                  You are about to permanently delete all <strong className="font-mono text-rose-950 font-bold underline">{allSitesDeps?.totalSites || sites.length}</strong> construction sites from the system.
                </p>
              </div>

              {/* Reference Handling & Impact Analysis */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Reference Impact & Safe Preservation Summary
                </span>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <Users className="w-4 h-4 text-indigo-600" /> Assigned Employees:
                    </span>
                    <span className="font-mono font-bold text-indigo-900">
                      {allSitesDeps?.totalAssignedUsers || 0} user(s) → Reassigned to Corporate HQ
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <CalendarCheck className="w-4 h-4 text-emerald-600" /> Attendance Records:
                    </span>
                    <span className="font-mono font-bold text-emerald-900">
                      {allSitesDeps?.totalAttendanceRecords || 0} logs preserved (marked Closed)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <TrendingUp className="w-4 h-4 text-blue-600" /> Progress Submissions:
                    </span>
                    <span className="font-mono font-bold text-blue-900">
                      {allSitesDeps?.totalProgressRecords || 0} records & points archived
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                    <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <FileSpreadsheet className="w-4 h-4 text-amber-600" /> Work Guides:
                    </span>
                    <span className="font-mono font-bold text-amber-900">
                      {allSitesDeps?.totalWorkGuides || 0} site guides cleared
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Typing Requirement */}
              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Type <span className="font-mono text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-300">DELETE</span> to confirm bulk deletion:
                </label>
                <input
                  type="text"
                  value={deleteAllSitesConfirmText}
                  onChange={(e) => setDeleteAllSitesConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  disabled={isDeletingAllSites}
                  className="w-full text-xs px-3 py-2 border-2 border-slate-300 focus:border-rose-500 rounded-lg font-mono font-bold tracking-wider uppercase focus:outline-hidden"
                  autoFocus
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteAllSitesModal(false);
                    setDeleteAllSitesConfirmText('');
                  }}
                  disabled={isDeletingAllSites}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteAllSites}
                  disabled={isDeletingAllSites || deleteAllSitesConfirmText.trim() !== 'DELETE'}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  {isDeletingAllSites ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deleting All Sites...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" /> Confirm Delete All Sites
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Site Modal */}
      {editingSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                Edit Site: {editingSite.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingSite(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Site Name *
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Site Number / Code
                  </label>
                  <input
                    type="text"
                    value={editNumber}
                    onChange={(e) => setEditNumber(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Site Address & Location *
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Zone / Area Details
                </label>
                <input
                  type="text"
                  value={editLocationDetails}
                  onChange={(e) => setEditLocationDetails(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Site Status
                </label>
                <select
                  value={editActive ? 'active' : 'inactive'}
                  onChange={(e) => setEditActive(e.target.value === 'active')}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="active">ACTIVE (Available for assignments & submissions)</option>
                  <option value="inactive">INACTIVE / ARCHIVED (Hidden from new dropdowns)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSite(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
