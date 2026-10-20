import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, X, Check, Upload, AlertCircle } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Photo: string) => void;
  title?: string;
  subtitle?: string;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Capture Attendance Photo',
  subtitle = 'Please look directly at the camera to record attendance',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Initialize camera when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedPhoto(null);
      setCameraError(null);
      return;
    }

    startCamera(facingMode);

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const startCamera = async (mode: 'user' | 'environment') => {
    setIsInitializing(true);
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera device API not supported in this browser environment.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch((e) => console.log('Video play error', e));
      }
    } catch (err: any) {
      console.warn('Camera initialization warning:', err);
      setCameraError(
        'Direct camera access was denied or is unavailable. You can use the photo upload fallback below.'
      );
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSnap = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Watermark with current timestamp
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, canvas.height - 36, canvas.width, 36);
    ctx.font = '14px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    const now = new Date();
    const watermarkText = `VERIFIED • ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    ctx.fillText(watermarkText, 12, canvas.height - 13);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera(facingMode);
  };

  const handleConfirm = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
      onClose();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      setCapturedPhoto(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-emerald-700 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-emerald-200" />
              {title}
            </h3>
            <p className="text-[11px] text-emerald-100">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-emerald-800 text-emerald-100 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="p-4 flex flex-col items-center justify-center bg-slate-900 min-h-[300px] relative">
          <canvas ref={canvasRef} className="hidden" />

          {capturedPhoto ? (
            <div className="relative w-full aspect-square max-w-[320px] rounded-xl overflow-hidden border-2 border-emerald-500 shadow-lg">
              <img
                src={capturedPhoto}
                alt="Captured attendance verification"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                <Check className="w-3 h-3" /> Photo Ready
              </div>
            </div>
          ) : cameraError ? (
            <div className="p-4 text-center text-slate-200 max-w-xs">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-2" />
              <p className="text-xs text-amber-200 mb-3">{cameraError}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-md"
              >
                <Upload className="w-4 h-4" /> Select Photo File
              </button>
            </div>
          ) : (
            <div className="relative w-full aspect-square max-w-[320px] rounded-xl overflow-hidden bg-black flex items-center justify-center border border-slate-700">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              {/* Viewfinder crosshairs overlay */}
              <div className="absolute inset-8 border border-white/30 rounded-2xl pointer-events-none flex items-center justify-center">
                <div className="w-16 h-16 border-t-2 border-emerald-400 rounded-full animate-pulse" />
              </div>

              {/* Camera Switcher Button */}
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-xs transition-colors"
                title="Switch Camera (Front/Back)"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          {capturedPhoto ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-2 px-3 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retake Photo
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" /> Confirm & Save
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-slate-600 hover:text-slate-800 text-xs font-medium py-2 px-2 flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5" /> Gallery Upload
              </button>
              <button
                type="button"
                onClick={handleSnap}
                disabled={isInitializing || !!cameraError}
                className="flex-1 max-w-[200px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-98 transition-transform"
              >
                <Camera className="w-4 h-4" /> Snap Photo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
