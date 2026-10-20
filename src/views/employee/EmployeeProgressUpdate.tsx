import React, { useState, useRef } from 'react';
import { User, Site, WorkGuideItem, WorkType, ProgressSubmission } from '../../types';
import { storage, getTodayDateString } from '../../services/storage';
import { CameraCaptureModal } from '../../components/CameraCaptureModal';
import { PhotoViewerModal } from '../../components/PhotoViewerModal';
import {
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Camera,
  Image,
  Upload,
  Trash2,
  Building,
  Clock,
  Sparkles,
  Users,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';

interface EmployeeProgressUpdateProps {
  currentUser: User;
  sites: Site[];
  onSubmissionSuccess?: (record: ProgressSubmission) => void;
}

const WORK_TYPES: WorkType[] = ['Normal Work', 'Critical Work', 'Very Critical Work'];

export const EmployeeProgressUpdate: React.FC<EmployeeProgressUpdateProps> = ({
  currentUser,
  sites,
  onSubmissionSuccess,
}) => {
  // If user has a specific assigned site (not ALL), use that site; if ALL, allow selecting
  const [selectedSiteId, setSelectedSiteId] = useState<string>(
    currentUser.siteId !== 'ALL' ? currentUser.siteId : sites[0]?.id || 'SITE-01'
  );

  // Load Work Guide items for the selected site
  const siteWorkGuides = storage.getWorkGuides(selectedSiteId);
  const selectedSite = sites.find((s) => s.id === selectedSiteId);

  // Form states
  const [selectedWorkType, setSelectedWorkType] = useState<WorkType>('Normal Work');
  const [selectedWorkCode, setSelectedWorkCode] = useState<string>(siteWorkGuides[0]?.workCode || '');
  const [completedQuantity, setCompletedQuantity] = useState<string>('');
  const [workingHours, setWorkingHours] = useState<string>('8');
  const [followWorkerIds, setFollowWorkerIds] = useState<string>('');
  const [employeeRemarks, setEmployeeRemarks] = useState<string>('');

  // Photos (up to 3 before-work, up to 3 after-work)
  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [activePhotoCategory, setActivePhotoCategory] = useState<'before' | 'after'>('before');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [inspectPhotoUrl, setInspectPhotoUrl] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Find currently selected work item details
  const activeWorkItem = siteWorkGuides.find((g) => g.workCode === selectedWorkCode) || siteWorkGuides[0];

  // Photo handlers
  const handleAddPhoto = (category: 'before' | 'after') => {
    const currentList = category === 'before' ? beforePhotos : afterPhotos;
    if (currentList.length >= 3) {
      setFeedback({ type: 'error', message: `Maximum of 3 ${category}-work photos allowed.` });
      return;
    }
    setActivePhotoCategory(category);
    setIsCameraOpen(true);
    setFeedback(null);
  };

  const handleCapturePhoto = (photoBase64: string) => {
    if (activePhotoCategory === 'before') {
      setBeforePhotos((prev) => [...prev, photoBase64].slice(0, 3));
    } else {
      setAfterPhotos((prev) => [...prev, photoBase64].slice(0, 3));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      handleCapturePhoto(dataUrl);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = (category: 'before' | 'after', index: number) => {
    if (category === 'before') {
      setBeforePhotos((prev) => prev.filter((_, i) => i !== index));
    } else {
      setAfterPhotos((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeWorkItem) {
      setFeedback({
        type: 'error',
        message: 'No Work Guide available for this site. Please contact Admin.',
      });
      return;
    }

    const qtyNum = parseFloat(completedQuantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setFeedback({ type: 'error', message: 'Please enter a valid Completed Quantity greater than 0.' });
      return;
    }

    const hoursNum = parseFloat(workingHours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      setFeedback({ type: 'error', message: 'Please enter valid Working Hours.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const submissionData = {
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      siteId: selectedSiteId,
      siteName: selectedSite?.name || currentUser.siteName,
      workCode: activeWorkItem.workCode,
      workDescription: activeWorkItem.workDescription,
      workType: selectedWorkType,
      workDuration: activeWorkItem.workDuration,
      completedQuantity: qtyNum,
      workingHours: hoursNum,
      workGuideRate: activeWorkItem.workByHour,
      uom: activeWorkItem.uom,
      followWorkerIds: followWorkerIds.trim(),
      employeeRemarks: employeeRemarks.trim(),
      beforePhotos,
      afterPhotos,
    };

    const result = storage.saveProgressSubmission(submissionData);
    setIsSubmitting(false);

    if (result.success && result.record) {
      setFeedback({
        type: 'success',
        message: `Progress saved successfully! Awarded points: ${result.record.points} pts. Record stored in My Saved Progress.`,
      });

      // Clear input fields
      setCompletedQuantity('');
      setEmployeeRemarks('');
      setBeforePhotos([]);
      setAfterPhotos([]);

      if (onSubmissionSuccess) {
        onSubmissionSuccess(result.record);
      }
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Form Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              PMS Progress Update
            </h2>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {currentUser.name} ({currentUser.id})
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Record work completed today against your assigned site&apos;s approved Work Guide.
          </p>
        </div>

        {feedback && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Site Selection (if user is assigned to All Sites) */}
          {currentUser.siteId === 'ALL' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Target Construction Site *
              </label>
              <select
                value={selectedSiteId}
                onChange={(e) => {
                  setSelectedSiteId(e.target.value);
                  const newGuides = storage.getWorkGuides(e.target.value);
                  if (newGuides.length > 0) {
                    setSelectedWorkCode(newGuides[0].workCode);
                  }
                }}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium focus:ring-1 focus:ring-emerald-500"
              >
                {sites.filter((s) => s.active !== false).map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.siteNumber}] {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 1. Work Type Selection (Strict requirement: DO NOT show numerical multipliers to employee) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
              1. Work Type Selection *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {WORK_TYPES.map((type) => {
                const isSelected = selectedWorkType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedWorkType(type)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                      isSelected
                        ? type === 'Very Critical Work'
                          ? 'bg-rose-50 border-rose-400 text-rose-800 ring-1 ring-rose-400 shadow-xs'
                          : type === 'Critical Work'
                          ? 'bg-amber-50 border-amber-400 text-amber-800 ring-1 ring-amber-400 shadow-xs'
                          : 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Work Code Selection from Site's Work Guide */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              2. Work Code & Description *
            </label>
            {siteWorkGuides.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                No Work Guide uploaded for <strong>{selectedSite?.name}</strong>. Please request Admin to upload the site&apos;s Work Guide.
              </div>
            ) : (
              <select
                value={selectedWorkCode}
                onChange={(e) => setSelectedWorkCode(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium focus:ring-1 focus:ring-emerald-500"
                required
              >
                {siteWorkGuides.map((g) => (
                  <option key={g.id} value={g.workCode}>
                    [{g.workCode}] {g.workDescription} ({g.workByHour} {g.uom}/hr)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Active Work Guide Item Details Auto-Populated */}
          {activeWorkItem && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Work Duration</span>
                <span className="font-semibold text-slate-800">{activeWorkItem.workDuration}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Work by Hour</span>
                <span className="font-mono font-bold text-slate-900">
                  {activeWorkItem.workByHour} {activeWorkItem.uom}/hr
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Site Balance Qty</span>
                <span className="font-mono font-bold text-amber-700">
                  {(activeWorkItem.balanceQuantity ?? activeWorkItem.totalQuantity).toLocaleString()} {activeWorkItem.uom}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Unit of Measure</span>
                <span className="font-mono font-bold uppercase text-slate-700">
                  {activeWorkItem.uom}
                </span>
              </div>
            </div>
          )}

          {/* 3. Completed Quantity & Working Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                3. Completed Work / Quantity *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={completedQuantity}
                  onChange={(e) => setCompletedQuantity(e.target.value)}
                  placeholder="e.g. 35.5"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 font-mono text-base font-bold pr-14"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400 uppercase">
                  {activeWorkItem?.uom || 'units'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Working Hours *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="16"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(e.target.value)}
                  placeholder="e.g. 8"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500 font-mono text-base font-bold pr-14"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">
                  hours
                </span>
              </div>
            </div>
          </div>

          {/* 4. Follow Worker IDs */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Follow Worker IDs (Co-workers / Team Members)
            </label>
            <input
              type="text"
              value={followWorkerIds}
              onChange={(e) => setFollowWorkerIds(e.target.value)}
              placeholder="e.g. EMP-1002, EMP-1005 (comma separated)"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* 5. Employee Remarks / Additional Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              Employee Remarks / Additional Notes
            </label>
            <textarea
              rows={2}
              value={employeeRemarks}
              onChange={(e) => setEmployeeRemarks(e.target.value)}
              placeholder="Describe work progress, corridor/drawing grid locations, challenges encountered..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* 6. Before-work & After-work Photos (Up to 3 each) */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            {/* Before-work Photos */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5 text-emerald-600" />
                  Before-work Photos ({beforePhotos.length}/3)
                </label>
                {beforePhotos.length < 3 && (
                  <button
                    type="button"
                    onClick={() => handleAddPhoto('before')}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" /> Take Photo
                  </button>
                )}
              </div>

              {beforePhotos.length === 0 ? (
                <div
                  onClick={() => handleAddPhoto('before')}
                  className="border-2 border-dashed border-slate-200 hover:border-emerald-300 rounded-xl p-3 text-center cursor-pointer bg-slate-50/50 hover:bg-emerald-50/30 transition-colors"
                >
                  <Camera className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <span className="text-xs text-slate-600 font-medium">Add Before-work Photo</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {beforePhotos.map((photo, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group"
                    >
                      <img
                        src={photo}
                        alt={`Before work ${index + 1}`}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setInspectPhotoUrl(photo)}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto('before', index)}
                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {beforePhotos.length < 3 && (
                    <button
                      type="button"
                      onClick={() => handleAddPhoto('before')}
                      className="aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-400 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                    >
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span className="text-[10px] font-semibold">+ Add</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* After-work Photos */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5 text-emerald-600" />
                  After-work Photos ({afterPhotos.length}/3)
                </label>
                {afterPhotos.length < 3 && (
                  <button
                    type="button"
                    onClick={() => handleAddPhoto('after')}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" /> Take Photo
                  </button>
                )}
              </div>

              {afterPhotos.length === 0 ? (
                <div
                  onClick={() => handleAddPhoto('after')}
                  className="border-2 border-dashed border-slate-200 hover:border-emerald-300 rounded-xl p-3 text-center cursor-pointer bg-slate-50/50 hover:bg-emerald-50/30 transition-colors"
                >
                  <Camera className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <span className="text-xs text-slate-600 font-medium">Add After-work Photo</span>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {afterPhotos.map((photo, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group"
                    >
                      <img
                        src={photo}
                        alt={`After work ${index + 1}`}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setInspectPhotoUrl(photo)}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto('after', index)}
                        className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition-colors cursor-pointer"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {afterPhotos.length < 3 && (
                    <button
                      type="button"
                      onClick={() => handleAddPhoto('after')}
                      className="aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-emerald-400 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                    >
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span className="text-[10px] font-semibold">+ Add</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSubmitting || siteWorkGuides.length === 0}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-transform active:scale-98 cursor-pointer"
            >
              <TrendingUp className="w-4 h-4" /> Save Progress Submission
            </button>
          </div>
        </form>
      </div>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCapturePhoto}
        title={activePhotoCategory === 'before' ? 'Take Before-work Photo' : 'Take After-work Photo'}
        subtitle="Hold camera steady to document progress for verification"
      />

      {/* Inspect Photo Modal */}
      <PhotoViewerModal
        isOpen={!!inspectPhotoUrl}
        onClose={() => setInspectPhotoUrl(null)}
        photoUrl={inspectPhotoUrl}
        title="Inspection Photo"
      />
    </div>
  );
};
