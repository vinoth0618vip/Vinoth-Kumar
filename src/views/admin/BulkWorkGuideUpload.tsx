import React, { useState, useRef, useEffect } from 'react';
import { Site, WorkGuideItem, User } from '../../types';
import { storage } from '../../services/storage';
import { ExcelTable, ExcelColumn } from '../../components/ExcelTable';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Building,
  RefreshCw,
  Search,
  Trash2,
  ShieldAlert,
  X,
  Loader2,
} from 'lucide-react';

interface BulkWorkGuideUploadProps {
  currentUser?: User;
  sites: Site[];
  onRefresh: () => void;
}

export const BulkWorkGuideUpload: React.FC<BulkWorkGuideUploadProps> = ({
  currentUser,
  sites,
  onRefresh,
}) => {
  const activeUser = currentUser || storage.getCurrentUser();
  const isAdmin = activeUser?.role === 'Admin';

  const [selectedSiteId, setSelectedSiteId] = useState<string>(sites[0]?.id || 'SITE-01');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedItems, setParsedItems] = useState<Omit<WorkGuideItem, 'id' | 'siteId'>[] | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshCount, setRefreshCount] = useState<number>(0);

  // Individual item deletion state
  const [itemToDelete, setItemToDelete] = useState<WorkGuideItem | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);

  // Bulk Delete All State (Double Confirmation)
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [deleteAllStep, setDeleteAllStep] = useState<1 | 2>(1);
  const [deleteScope, setDeleteScope] = useState<'site' | 'all'>('site');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Real-time synchronization on storage updates
  useEffect(() => {
    const handleStorageUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ key?: string }>;
      if (
        !customEvent.detail ||
        customEvent.detail.key === 'pms_work_guides_v2' ||
        customEvent.detail.key === 'pms_deleted_work_guides_ids_v2' ||
        customEvent.detail.key === 'pms_work_guides_cleared_all_v2'
      ) {
        setRefreshCount((c) => c + 1);
      }
    };
    window.addEventListener('pms_storage_updated', handleStorageUpdate);
    return () => window.removeEventListener('pms_storage_updated', handleStorageUpdate);
  }, []);

  // Retrieve current active work guides for the selected site and across all sites
  const currentSiteGuides = storage.getWorkGuides(selectedSiteId);
  const allWorkGuides = storage.getWorkGuides();
  const selectedSite = sites.find((s) => s.id === selectedSiteId);

  const handleDownloadTemplate = () => {
    storage.downloadWorkGuideTemplate(selectedSite?.name || 'Project');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setValidationErrors([]);
    setFeedback(null);
    setParsedItems(null);

    const parseResult = await storage.parseWorkGuideExcel(file);
    setIsParsing(false);

    if (parseResult.success && parseResult.data) {
      setParsedItems(parseResult.data);
      setFeedback({
        type: 'success',
        message: `Parsed ${parseResult.data.length} valid work items from spreadsheet. Review below and click "Save & Apply Work Guide".`,
      });
    } else {
      setValidationErrors(parseResult.errors || ['Invalid Excel file format']);
      if (parseResult.data && parseResult.data.length > 0) {
        setParsedItems(parseResult.data);
      }
    }

    // Reset input so same file can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCommitUpload = () => {
    if (!parsedItems || parsedItems.length === 0) {
      setFeedback({ type: 'error', message: 'No valid items to save.' });
      return;
    }

    const res = storage.saveWorkGuidesForSite(selectedSiteId, parsedItems);
    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Work Guide successfully updated for ${selectedSite?.name}! ${res.count} work items saved.`,
      });
      setParsedItems(null);
      setValidationErrors([]);
      setRefreshCount((c) => c + 1);
      onRefresh();
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  // Execute Individual Work Guide Deletion
  const handleConfirmSingleDelete = () => {
    if (!itemToDelete) return;
    setIsDeletingSingle(true);

    try {
      const res = storage.deleteWorkGuide(itemToDelete.id);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setItemToDelete(null);
        setRefreshCount((c) => c + 1);
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to delete work guide item.',
      });
    } finally {
      setIsDeletingSingle(false);
    }
  };

  // Execute Delete All Work Guides (Double Confirmed)
  const handleConfirmDeleteAll = () => {
    setIsDeletingAll(true);
    try {
      const targetSiteId = deleteScope === 'site' ? selectedSiteId : undefined;
      const res = storage.deleteAllWorkGuides({ siteId: targetSiteId });
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setDeleteAllModalOpen(false);
        setDeleteAllStep(1);
        setConfirmChecked(false);
        setRefreshCount((c) => c + 1);
        onRefresh();
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to delete work guides.',
      });
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Filter existing items for search query
  const filteredCurrentItems = currentSiteGuides.filter(
    (g) =>
      g.workCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.workDescription.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const targetDeleteCount =
    deleteScope === 'site' ? currentSiteGuides.length : allWorkGuides.length;

  const columns: ExcelColumn<WorkGuideItem>[] = [
    {
      key: 'workCode',
      header: 'Work Code',
      width: 'w-24',
      render: (item) => (
        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
          {item.workCode}
        </span>
      ),
    },
    {
      key: 'workDescription',
      header: 'Work Description',
      render: (item) => <span className="font-medium text-slate-800">{item.workDescription}</span>,
    },
    {
      key: 'workDuration',
      header: 'Work Duration',
      width: 'w-28',
      render: (item) => <span className="text-slate-600">{item.workDuration}</span>,
    },
    {
      key: 'workByHour',
      header: 'Work by Hour',
      width: 'w-28',
      align: 'right',
      render: (item) => (
        <span className="font-mono font-semibold text-slate-900">
          {item.workByHour.toFixed(1)}
        </span>
      ),
    },
    {
      key: 'uom',
      header: 'UOM',
      width: 'w-20',
      align: 'center',
      render: (item) => (
        <span className="font-mono uppercase bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
          {item.uom}
        </span>
      ),
    },
    {
      key: 'totalQuantity',
      header: 'Total Qty',
      width: 'w-24',
      align: 'right',
      render: (item) => (
        <span className="font-mono font-bold text-slate-800">
          {item.totalQuantity.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'completedQuantity',
      header: 'Completed',
      width: 'w-24',
      align: 'right',
      render: (item) => (
        <span className="font-mono text-emerald-700 font-semibold">
          {(item.completedQuantity || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'balanceQuantity',
      header: 'Balance Qty',
      width: 'w-24',
      align: 'right',
      render: (item) => (
        <span className="font-mono font-bold text-amber-700">
          {(item.balanceQuantity ?? item.totalQuantity).toLocaleString()}
        </span>
      ),
    },
    ...(isAdmin
      ? [
          {
            key: 'action',
            header: 'Action',
            width: 'w-24',
            align: 'center' as const,
            render: (item: WorkGuideItem) => (
              <button
                type="button"
                onClick={() => setItemToDelete(item)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded border border-rose-200 cursor-pointer transition-colors shadow-2xs"
                title={`Delete work guide ${item.workCode}`}
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
    <div className="space-y-5">
      {/* Target Site Selector & Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Excel Bulk Work Guide Upload
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select the construction site first, download the template, upload your Excel spreadsheet, and save site-specific work codes.
            </p>
          </div>

          {/* Site Selector */}
          <div className="flex items-center gap-2 bg-emerald-50/70 border border-emerald-200 p-1.5 rounded-xl">
            <Building className="w-4 h-4 text-emerald-700 shrink-0 ml-1" />
            <label className="text-xs font-semibold text-emerald-950 shrink-0">Site:</label>
            <select
              value={selectedSiteId}
              onChange={(e) => {
                setSelectedSiteId(e.target.value);
                setParsedItems(null);
                setValidationErrors([]);
                setFeedback(null);
              }}
              className="text-xs bg-white text-slate-800 font-bold py-1 px-2.5 rounded-lg border border-emerald-300 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            >
              {sites.filter((s) => s.active !== false).map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.siteNumber}] {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Upload Zone & Download Template */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-emerald-50/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Upload Excel File (.xlsx, .xls, .csv)
                </p>
                <p className="text-[11px] text-slate-500">
                  Target Site: <strong className="text-emerald-800">{selectedSite?.name}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsing}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                {isParsing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Reading File...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Select Excel File
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Download Official Template */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                Work Guide Template
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Standard format with required columns: Work Code, Description, Duration, Work by Hour, UOM, Total Quantity.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="mt-2 w-full py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" /> Download .XLSX
            </button>
          </div>
        </div>

        {/* Feedback / Validation Messages */}
        {feedback && (
          <div
            className={`mt-4 p-3 rounded-lg text-xs flex items-center justify-between gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="font-medium">{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {validationErrors.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Spreadsheet Validation Issues ({validationErrors.length} errors found):
            </div>
            <ul className="list-disc pl-5 max-h-36 overflow-y-auto space-y-0.5 font-mono text-[11px]">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
            <p className="text-[11px] text-amber-700 font-sans pt-1">
              Please fix the errors in your Excel file and upload again, or review parsed items below.
            </p>
          </div>
        )}

        {/* Parsed Preview Section & Save Action */}
        {parsedItems && parsedItems.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
              <div>
                <span className="font-bold text-xs text-emerald-900">
                  Ready to Commit: {parsedItems.length} Work Items
                </span>
                <p className="text-[11px] text-emerald-700">
                  Click the button to save these items directly to <strong>{selectedSite?.name}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCommitUpload}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" /> Save & Apply Work Guide
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-300">
              <table className="w-full text-xs text-left border-collapse border border-slate-300">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <tr>
                    <th className="px-2 py-1.5 border border-slate-300">Code</th>
                    <th className="px-2 py-1.5 border border-slate-300">Description</th>
                    <th className="px-2 py-1.5 border border-slate-300">Duration</th>
                    <th className="px-2 py-1.5 border border-slate-300 text-right">Work/Hour</th>
                    <th className="px-2 py-1.5 border border-slate-300 text-center">UOM</th>
                    <th className="px-2 py-1.5 border border-slate-300 text-right">Total Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {parsedItems.map((item, idx) => (
                    <tr key={idx} className="bg-white">
                      <td className="px-2 py-1 border border-slate-300 font-mono font-bold text-emerald-700">
                        {item.workCode}
                      </td>
                      <td className="px-2 py-1 border border-slate-300">{item.workDescription}</td>
                      <td className="px-2 py-1 border border-slate-300 text-slate-600">{item.workDuration}</td>
                      <td className="px-2 py-1 border border-slate-300 text-right font-mono font-semibold">
                        {item.workByHour}
                      </td>
                      <td className="px-2 py-1 border border-slate-300 text-center font-mono uppercase text-[10px]">
                        {item.uom}
                      </td>
                      <td className="px-2 py-1 border border-slate-300 text-right font-mono font-bold">
                        {item.totalQuantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Actual Saved Work Guide Records for Selected Site */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>Saved Work Guide: {selectedSite?.name}</span>
              <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                {currentSiteGuides.length} ITEMS
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Real-time synchronization with Completed Quantity and Balance Quantity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-56">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search work code or description..."
                className="w-full text-xs px-3 py-1.5 pl-8 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Delete All Work Guides Button (Admin Only) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setDeleteScope('site');
                  setDeleteAllStep(1);
                  setConfirmChecked(false);
                  setDeleteAllModalOpen(true);
                }}
                disabled={currentSiteGuides.length === 0 && allWorkGuides.length === 0}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
                title="Clear all existing work guides after double-confirmation"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All Work Guides</span>
                <span className="bg-rose-800/80 text-rose-100 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {currentSiteGuides.length}
                </span>
              </button>
            )}
          </div>
        </div>

        {currentSiteGuides.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500">
            <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No Work Guide uploaded for this site yet.</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Download the template above, fill in the codes, and upload to enable progress reporting for site workers.
            </p>
          </div>
        ) : (
          <ExcelTable
            columns={columns}
            data={filteredCurrentItems}
            keyExtractor={(item) => item.id}
            emptyMessage="No matching work items found."
          />
        )}
      </div>

      {/* Individual Work Guide Item Delete Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-rose-100 text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  Delete Work Guide Item
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm deletion of this specific work guide code from <strong>{selectedSite?.name}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isDeletingSingle && setItemToDelete(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer -mt-1 -mr-1"
                disabled={isDeletingSingle}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected Work Guide details */}
            <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Work Code:</span>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {itemToDelete.workCode}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Description:</span>
                <span className="text-slate-900 font-bold max-w-[230px] truncate text-right" title={itemToDelete.workDescription}>
                  {itemToDelete.workDescription}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Duration / Work by Hour:</span>
                <span className="font-mono text-slate-700">
                  {itemToDelete.workDuration} ({itemToDelete.workByHour} {itemToDelete.uom}/hr)
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Total Quantity:</span>
                <span className="font-mono font-bold text-slate-900">
                  {itemToDelete.totalQuantity} {itemToDelete.uom.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Completed / Balance:</span>
                <span className="font-mono font-semibold text-slate-700">
                  <span className="text-emerald-700 font-bold">{itemToDelete.completedQuantity || 0}</span> /{' '}
                  <span className="text-amber-700 font-bold">{itemToDelete.balanceQuantity ?? itemToDelete.totalQuantity}</span>
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-400 font-medium">Unique Item ID:</span>
                <span className="font-mono text-[10px] text-slate-500 truncate max-w-[200px]" title={itemToDelete.id}>
                  {itemToDelete.id}
                </span>
              </div>
            </div>

            <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Safety Notice:</strong> Only this specific work code will be removed. Existing submitted employee progress records and points will remain safely preserved in the database.
              </span>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
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

      {/* Delete All Work Guides - Double Confirmation Modal */}
      {deleteAllModalOpen && (
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
                        STEP 1 OF 2 &bull; FIRST CONFIRMATION
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      Clear / Delete Work Guides
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select which work guides you want to clear from the database.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteAllModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer -mt-1 -mr-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Scope selector */}
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <p className="text-xs font-bold text-slate-800">Select Deletion Scope:</p>
                  <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="deleteScope"
                      value="site"
                      checked={deleteScope === 'site'}
                      onChange={() => setDeleteScope('site')}
                      className="text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-800">
                        Selected Site Only ({selectedSite?.name})
                      </span>
                      <span className="ml-2 font-mono text-[11px] text-rose-700 font-bold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                        {currentSiteGuides.length} items
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="deleteScope"
                      value="all"
                      checked={deleteScope === 'all'}
                      onChange={() => setDeleteScope('all')}
                      className="text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-800">
                        All Construction Sites (Entire Database)
                      </span>
                      <span className="ml-2 font-mono text-[11px] text-rose-700 font-bold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                        {allWorkGuides.length} items total
                      </span>
                    </div>
                  </label>
                </div>

                {/* Warning details */}
                <div className="mt-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-rose-900">Total Work Guides to Delete:</span>
                    <span className="font-mono font-extrabold text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-200">
                      {targetDeleteCount} items
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    Clearing work guides will remove work codes and target quantities. Site employees will not be able to choose these codes for new progress entries until a replacement work guide is uploaded.
                  </p>
                </div>

                <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                  <p className="font-semibold text-slate-700">Protected Historical Records:</p>
                  <p className="text-slate-500 mt-0.5">
                    Existing employee progress submissions, supervisor approvals, employee points, and attendance records are completely safe and will not be deleted.
                  </p>
                </div>

                {/* Actions */}
                <div className="mt-5 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDeleteAllModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteAllStep(2)}
                    disabled={targetDeleteCount === 0}
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
                        STEP 2 OF 2 &bull; DOUBLE-CONFIRMATION
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      Final Confirmation: Delete Work Guides
                    </h3>
                    <p className="text-xs text-rose-600 font-semibold mt-0.5">
                      This action is permanent and cannot be undone.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => !isDeletingAll && setDeleteAllModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer -mt-1 -mr-1"
                    disabled={isDeletingAll}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-red-50 border-2 border-red-300 space-y-3">
                  <p className="text-xs text-red-950 font-medium">
                    You are confirming the complete removal of{' '}
                    <strong className="font-mono font-bold text-red-700">
                      {targetDeleteCount} work guide items
                    </strong>{' '}
                    from{' '}
                    <strong>
                      {deleteScope === 'site'
                        ? `Site: ${selectedSite?.name}`
                        : 'All Construction Sites'}
                    </strong>
                    .
                  </p>
                  <p className="text-[11px] text-red-800">
                    After this double-confirmation, the work guide table will update immediately. Deleted work guides will not reappear after browser reload or sign in.
                  </p>

                  <label className="flex items-start gap-2.5 p-3 rounded-lg bg-white border border-red-300 cursor-pointer hover:bg-red-50/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={confirmChecked}
                      onChange={(e) => setConfirmChecked(e.target.checked)}
                      disabled={isDeletingAll}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-red-900 select-none">
                      I understand that all {targetDeleteCount} selected work guide items will be permanently cleared from the database.
                    </span>
                  </label>
                </div>

                {/* Actions */}
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
                      onClick={() => setDeleteAllModalOpen(false)}
                      disabled={isDeletingAll}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDeleteAll}
                      disabled={!confirmChecked || isDeletingAll}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeletingAll ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Deleting Work Guides...</span>
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
    </div>
  );
};
