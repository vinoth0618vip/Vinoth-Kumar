import React, { useState } from 'react';
import { User, ProgressSubmission } from '../../types';
import { storage } from '../../services/storage';
import { PhotoViewerModal } from '../../components/PhotoViewerModal';
import {
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  Image,
  Users,
  MessageSquare,
  Eye,
  ChevronDown,
} from 'lucide-react';

interface MySavedProgressProps {
  currentUser: User;
}

export const MySavedProgress: React.FC<MySavedProgressProps> = ({ currentUser }) => {
  const [selectedRecord, setSelectedRecord] = useState<ProgressSubmission | null>(null);
  const [inspectPhotoUrl, setInspectPhotoUrl] = useState<string | null>(null);
  const [inspectTitle, setInspectTitle] = useState<string>('Progress Photo');

  const mySubmissions = storage.getProgressSubmissions({ employeeId: currentUser.id });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> APPROVED
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
            REVIEWED
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
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            My Saved Progress
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            History of your submitted work progress, verification photos, and earned points.
          </p>
        </div>
        <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-1 rounded-lg">
          {mySubmissions.length} Submissions
        </span>
      </div>

      {/* Submissions List */}
      {mySubmissions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
          <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700">No saved progress records yet.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Use the Progress Update tab to submit your daily completed tasks.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {mySubmissions.map((sub) => (
            <div
              key={sub.id}
              onClick={() => setSelectedRecord(sub)}
              className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 p-4 shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                    {sub.workCode}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {sub.workType}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1">
                    <Award className="w-3 h-3 text-indigo-600" />
                    +{sub.points} pts
                  </span>
                  {getStatusBadge(sub.approvalStatus)}
                </div>
              </div>

              <h3 className="text-xs font-bold text-slate-800 mb-2">
                {sub.workDescription}
              </h3>

              {/* Quantities Grid */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center text-xs mb-2">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Completed Qty</span>
                  <span className="font-mono font-bold text-slate-900">
                    {sub.completedQuantity} {sub.uom}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Rate / Hour</span>
                  <span className="font-mono text-slate-700">
                    {sub.workGuideRate} {sub.uom}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Working Hours</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {sub.workingHours} hrs
                  </span>
                </div>
              </div>

              {sub.employeeRemarks && (
                <p className="text-[11px] text-slate-600 italic line-clamp-1 mb-2">
                  &ldquo;{sub.employeeRemarks}&rdquo;
                </p>
              )}

              {/* Footer info */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {sub.submissionDate} • {sub.submissionTime}
                </span>
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
                  {(sub.beforePhotos?.length > 0 || sub.afterPhotos?.length > 0) && (
                    <span className="flex items-center gap-0.5 text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded">
                      <Image className="w-3 h-3" />
                      {(sub.beforePhotos?.length || 0) + (sub.afterPhotos?.length || 0)} photos
                    </span>
                  )}
                  <Eye className="w-3.5 h-3.5 ml-1" /> View Full Record
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Record Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Submission: {selectedRecord.workCode}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {selectedRecord.siteName} • {selectedRecord.submissionDate}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Status and Points */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-600">Approval:</span>
                  {getStatusBadge(selectedRecord.approvalStatus)}
                </div>
                <div className="text-right">
                  <span className="text-slate-500 mr-1.5">Earned Points:</span>
                  <span className="font-bold text-sm text-indigo-700 font-mono">
                    {selectedRecord.points} pts
                  </span>
                </div>
              </div>

              {/* Work Guide & Details */}
              <div className="space-y-2 border border-slate-200 rounded-xl p-3.5 bg-white">
                <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Work Code</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedRecord.workCode}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Work Type</span>
                    <span className="font-semibold text-slate-800">
                      {selectedRecord.workType}
                    </span>
                  </div>
                </div>

                <div className="pb-2 border-b border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase block">Work Description</span>
                  <span className="font-medium text-slate-800">
                    {selectedRecord.workDescription}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pb-2 border-b border-slate-100 text-center">
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase block">Completed Qty</span>
                    <span className="font-bold text-emerald-700 font-mono text-sm">
                      {selectedRecord.completedQuantity} {selectedRecord.uom}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase block">Work by Hour</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {selectedRecord.workGuideRate}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase block">Working Hours</span>
                    <span className="font-bold text-slate-800 font-mono text-sm">
                      {selectedRecord.workingHours} hrs
                    </span>
                  </div>
                </div>

                {selectedRecord.followWorkerIds && (
                  <div className="pb-2 border-b border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase block">Follow Worker IDs</span>
                    <span className="font-mono text-slate-700">
                      {selectedRecord.followWorkerIds}
                    </span>
                  </div>
                )}

                {selectedRecord.employeeRemarks && (
                  <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-100">
                    <span className="text-[10px] text-emerald-800 font-bold block uppercase">
                      My Remarks
                    </span>
                    <p className="text-slate-700 italic mt-0.5">
                      {selectedRecord.employeeRemarks}
                    </p>
                  </div>
                )}

                {selectedRecord.managerRemarks && (
                  <div className="p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100">
                    <span className="text-[10px] text-indigo-800 font-bold block uppercase">
                      Supervisor / Manager Verification Remarks
                    </span>
                    <p className="text-slate-700 mt-0.5">
                      {selectedRecord.managerRemarks}
                    </p>
                  </div>
                )}
              </div>

              {/* Photos */}
              <div className="space-y-3">
                {/* Before Photos */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5 text-emerald-600" />
                    Before-work Photos ({selectedRecord.beforePhotos?.length || 0})
                  </h4>
                  {selectedRecord.beforePhotos && selectedRecord.beforePhotos.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {selectedRecord.beforePhotos.map((photo, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setInspectPhotoUrl(photo);
                            setInspectTitle(`Before-work Photo #${i + 1}`);
                          }}
                          className="aspect-square rounded-xl overflow-hidden border border-slate-200 cursor-pointer hover:opacity-90"
                        >
                          <img
                            src={photo}
                            alt="Before work preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No before-work photos attached.</p>
                  )}
                </div>

                {/* After Photos */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5 text-emerald-600" />
                    After-work Photos ({selectedRecord.afterPhotos?.length || 0})
                  </h4>
                  {selectedRecord.afterPhotos && selectedRecord.afterPhotos.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {selectedRecord.afterPhotos.map((photo, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setInspectPhotoUrl(photo);
                            setInspectTitle(`After-work Photo #${i + 1}`);
                          }}
                          className="aspect-square rounded-xl overflow-hidden border border-slate-200 cursor-pointer hover:opacity-90"
                        >
                          <img
                            src={photo}
                            alt="After work preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No after-work photos attached.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Photo Modal */}
      <PhotoViewerModal
        isOpen={!!inspectPhotoUrl}
        onClose={() => setInspectPhotoUrl(null)}
        photoUrl={inspectPhotoUrl}
        title={inspectTitle}
      />
    </div>
  );
};
