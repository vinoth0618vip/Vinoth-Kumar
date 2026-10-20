import React from 'react';
import { X, ZoomIn } from 'lucide-react';

interface PhotoViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string | null;
  title?: string;
}

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
  isOpen,
  onClose,
  photoUrl,
  title = 'Photo Inspection',
}) => {
  if (!isOpen || !photoUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2">
            <ZoomIn className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-sm">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-2 flex items-center justify-center bg-black min-h-[350px] max-h-[75vh] overflow-auto">
          <img
            src={photoUrl}
            alt={title}
            className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-md"
          />
        </div>
      </div>
    </div>
  );
};
