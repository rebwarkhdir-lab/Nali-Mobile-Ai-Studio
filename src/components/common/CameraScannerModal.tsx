import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, 
  X, 
  RefreshCw, 
  Zap, 
  ZapOff, 
  Upload, 
  Image as ImageIcon, 
  CheckCircle2, 
  ScanLine, 
  Keyboard, 
  ShieldAlert,
  ArrowRight,
  SlidersHorizontal,
  ZoomIn,
  Sparkles,
  SunMedium
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { cameraService, CameraDeviceInfo } from '../../lib/cameraService';
import { sound } from '../../lib/sound';
import { useToast } from './Toast';
import { cn } from '../../lib/utils';
import { useModalScrollLock } from '../../lib/modalLock';

export interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  continuousMode?: boolean;
}

// Full suite of 1D and 2D barcode formats for IMEI, Serial Numbers, and Product labels
const ALL_BARCODE_FORMATS: Html5QrcodeSupportedFormats[] = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.AZTEC,
  Html5QrcodeSupportedFormats.PDF_417,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.MAXICODE
];

const NATIVE_DETECTOR_FORMATS = [
  'code_128',
  'code_39',
  'code_93',
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'itf',
  'qr_code',
  'data_matrix',
  'aztec',
  'pdf417',
  'codabar'
];

export default function CameraScannerModal({
  isOpen,
  onClose,
  onScan,
  title = "Smart Live Barcode & IMEI Scanner",
  subtitle = "High-speed AI detection • Point at any barcode, QR or IMEI label",
  placeholder = "Enter Barcode, Serial or IMEI manually...",
  continuousMode = false
}: CameraScannerModalProps) {
  const { success, error: toastError, info } = useToast();
  
  const [cameras, setCameras] = useState<CameraDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>(() => {
    return cameraService.getPreferredDeviceId() || '';
  });
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [maxZoomSupported, setMaxZoomSupported] = useState<number>(1);
  const [enhancedContrast, setEnhancedContrast] = useState(false);
  const [engineType, setEngineType] = useState<'native' | 'universal'>('universal');

  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);
  const nativeDetectorLoopRef = useRef<number | null>(null);
  const lastDetectedTimeRef = useRef<number>(0);
  const lastScannedValueRef = useRef<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readerElementId = 'camera-smart-scanner-viewport';

  // Process decoded code with smart debouncing
  const handleDetectedCode = useCallback((rawCode: string) => {
    const cleanCode = rawCode.trim();
    if (!cleanCode) return;

    const now = Date.now();
    // Debounce exact duplicate scans within 1400ms in continuous mode
    if (cleanCode === lastScannedValueRef.current && (now - lastDetectedTimeRef.current) < 1400) {
      return;
    }

    lastDetectedTimeRef.current = now;
    lastScannedValueRef.current = cleanCode;

    sound.playScan();
    cameraService.triggerHaptic([60, 30, 60]);
    cameraService.setCameraAllowed(true, selectedCameraId || undefined);

    setLastScannedCode(cleanCode);
    setScannedCount(prev => prev + 1);
    onScan(cleanCode);

    if (!continuousMode) {
      onClose();
    }
  }, [continuousMode, onClose, onScan, selectedCameraId]);

  // Load available cameras when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setErrorMessage(null);
    setIsInitializing(true);
    setTorchOn(false);
    setZoomLevel(1);

    cameraService.getAvailableCameras().then(list => {
      if (!isMounted) return;
      setCameras(list);
      
      const pref = cameraService.getPreferredDeviceId();
      if (pref && list.some(c => c.deviceId === pref)) {
        setSelectedCameraId(pref);
      } else if ((list?.length || 0) > 0) {
        const back = list.find(c => c.isBackCamera) || list[0];
        setSelectedCameraId(back.deviceId);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Start scanner stream
  useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;
    const scannerId = readerElementId;

    // Small delay to ensure container is mounted
    const initTimer = setTimeout(async () => {
      try {
        // Clean up previous instance and loops
        if (nativeDetectorLoopRef.current) {
          cancelAnimationFrame(nativeDetectorLoopRef.current);
          nativeDetectorLoopRef.current = null;
        }

        if (scannerInstanceRef.current) {
          try {
            if (scannerInstanceRef.current.isScanning) {
              await scannerInstanceRef.current.stop();
            }
            await scannerInstanceRef.current.clear();
          } catch (e) {
            console.warn('Previous scanner cleanup:', e);
          }
          scannerInstanceRef.current = null;
        }

        const html5QrCode = new Html5Qrcode(scannerId, {
          formatsToSupport: ALL_BARCODE_FORMATS,
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        });
        scannerInstanceRef.current = html5QrCode;

        // Determine camera constraint strategy
        let cameraConfig: any = { facingMode: 'environment' };
        if (selectedCameraId) {
          cameraConfig = { deviceId: { exact: selectedCameraId } };
        }

        const config = {
          fps: 30,
          // Full-aspect scanning box for optimal wide 1D barcode & QR recognition
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const width = Math.min(Math.floor(viewfinderWidth * 0.94), 520);
            const height = Math.min(Math.floor(viewfinderHeight * 0.72), 300);
            return { width: Math.max(width, 240), height: Math.max(height, 120) };
          },
          aspectRatio: 1.333333,
          disableFlip: false,
          videoConstraints: {
            facingMode: 'environment',
            width: { min: 640, ideal: 1920, max: 2560 },
            height: { min: 480, ideal: 1080, max: 1440 },
            focusMode: 'continuous'
          }
        };

        const scanSuccessCallback = (decodedText: string) => {
          if (!isSubscribed) return;
          handleDetectedCode(decodedText);
        };

        // Try primary start
        try {
          await html5QrCode.start(
            cameraConfig,
            config,
            scanSuccessCallback,
            () => {} // silent frame discard
          );
        } catch (initialErr: any) {
          const isNotAllowed = 
            initialErr?.name === 'NotAllowedError' || 
            initialErr?.name === 'PermissionDeniedError' || 
            initialErr?.toString?.().includes('NotAllowedError') ||
            initialErr?.toString?.().includes('Permission denied');

          if (isNotAllowed) {
            // Do not retry multiple times if permission is specifically denied
            throw initialErr;
          }

          console.warn('Initial camera start with device constraint failed, trying fallback to environment:', initialErr);
          try {
            await html5QrCode.start(
              { facingMode: 'environment' },
              config,
              scanSuccessCallback,
              () => {}
            );
          } catch (fallbackErr: any) {
            const isFallbackNotAllowed = 
              fallbackErr?.name === 'NotAllowedError' || 
              fallbackErr?.name === 'PermissionDeniedError' || 
              fallbackErr?.toString?.().includes('NotAllowedError');

            if (isFallbackNotAllowed) {
              throw fallbackErr;
            }

            console.warn('Fallback to environment failed, trying user camera:', fallbackErr);
            await html5QrCode.start(
              { facingMode: 'user' },
              config,
              scanSuccessCallback,
              () => {}
            );
          }
        }

        if (!isSubscribed) return;

        setIsInitializing(false);
        setErrorMessage(null);

        // Check capabilities (Torch & Hardware Zoom)
        try {
          const videoEl = document.querySelector(`#${scannerId} video`) as HTMLVideoElement;
          if (videoEl && videoEl.srcObject instanceof MediaStream) {
            const track = videoEl.srcObject.getVideoTracks()[0];
            const caps: any = track?.getCapabilities?.() || {};
            setHasTorch(Boolean(caps?.torch));
            if (caps?.zoom) {
              setMaxZoomSupported(caps.zoom.max || 3);
            }

            // Setup Native Hardware-Accelerated BarcodeDetector if available for super-fast 60fps detection
            if ('BarcodeDetector' in window) {
              setEngineType('native');
              try {
                const nativeDetector = new (window as any).BarcodeDetector({
                  formats: NATIVE_DETECTOR_FORMATS
                });

                const runNativeDetector = async () => {
                  if (!isSubscribed) return;
                  if (videoEl && videoEl.readyState >= 2) {
                    try {
                      const barcodes = await nativeDetector.detect(videoEl);
                      if (barcodes && (barcodes?.length || 0) > 0) {
                        const firstCode = barcodes[0].rawValue;
                        if (firstCode) {
                          handleDetectedCode(firstCode);
                        }
                      }
                    } catch {}
                  }
                  nativeDetectorLoopRef.current = requestAnimationFrame(runNativeDetector);
                };

                nativeDetectorLoopRef.current = requestAnimationFrame(runNativeDetector);
              } catch (e) {
                console.warn('Native BarcodeDetector loop init failed, continuing with Html5Qrcode engine:', e);
                setEngineType('universal');
              }
            } else {
              setEngineType('universal');
            }
          }
        } catch {
          setHasTorch(false);
          setEngineType('universal');
        }

      } catch (err: any) {
        if (!isSubscribed) return;
        setIsInitializing(false);
        
        const isPermissionError = 
          err?.name === 'NotAllowedError' || 
          err?.name === 'PermissionDeniedError' || 
          err?.toString?.().includes('NotAllowedError') ||
          err?.toString?.().includes('denied permission') ||
          err?.toString?.().includes('not allowed');

        if (isPermissionError) {
          console.warn('Camera access denied or restricted by browser context:', err);
          setShowManualInput(true);
        } else {
          console.warn('Smart camera scanner startup notice:', err);
        }
        
        let msg = 'Could not start camera stream.';
        if (isPermissionError) {
          msg = 'دەستڕاگەیشتن بە کامێرا ڕێپێدراو نییە (Camera permission not granted). دەتوانیت بارکۆد بە کیبۆرد بنووسیت یان وێنەی بارکۆد باربکەیت.';
        } else if (err?.name === 'NotFoundError' || err?.toString().includes('NotFoundError')) {
          msg = 'هیچ کامێرایەک نەدۆزرایەوە لەم ئامێرەدا. دەتوانیت بارکۆد بە کیبۆرد بنووسیت یان وێنە باربکەیت.';
        } else if (err?.name === 'NotReadableError' || err?.toString().includes('NotReadableError')) {
          msg = 'کامێرا لەلایەن بەرنامەیەکی ترەوە بەکاردێت. تکایە بەرنامەکانی تر دابخە و دووبارە هەوڵبدەرەوە.';
        } else if (typeof err === 'string') {
          msg = err;
        }
        setErrorMessage(msg);
      }
    }, 180);

    return () => {
      isSubscribed = false;
      clearTimeout(initTimer);
      if (nativeDetectorLoopRef.current) {
        cancelAnimationFrame(nativeDetectorLoopRef.current);
        nativeDetectorLoopRef.current = null;
      }
      if (scannerInstanceRef.current) {
        const instance = scannerInstanceRef.current;
        scannerInstanceRef.current = null;
        try {
          if (instance.isScanning) {
            instance.stop().then(() => instance.clear()).catch(console.warn);
          } else {
            instance.clear();
          }
        } catch (e) {
          console.warn('Cleanup error:', e);
        }
      }
    };
  }, [isOpen, selectedCameraId, handleDetectedCode]);

  // Flashlight toggle
  const handleToggleTorch = async () => {
    try {
      const videoEl = document.querySelector(`#${readerElementId} video`) as HTMLVideoElement;
      if (videoEl && videoEl.srcObject instanceof MediaStream) {
        const track = videoEl.srcObject.getVideoTracks()[0];
        const nextState = !torchOn;
        const worked = await cameraService.toggleTorch(track, nextState);
        if (worked) {
          setTorchOn(nextState);
          sound.playClick();
        } else {
          info('Flashlight is not supported by this camera lens.');
        }
      }
    } catch {
      info('Flashlight unavailable on this lens.');
    }
  };

  // Zoom control
  const handleApplyZoom = async (level: number) => {
    sound.playClick();
    setZoomLevel(level);
    try {
      const videoEl = document.querySelector(`#${readerElementId} video`) as HTMLVideoElement;
      if (videoEl && videoEl.srcObject instanceof MediaStream) {
        const track = videoEl.srcObject.getVideoTracks()[0];
        const caps: any = track?.getCapabilities?.() || {};
        if (caps?.zoom) {
          await (track as any).applyConstraints({
            advanced: [{ zoom: Math.min(level, caps.zoom.max || 3) }]
          });
        }
      }
    } catch (e) {
      console.warn('Hardware zoom not supported, using CSS preview scale:', e);
    }
  };

  // Switch to next camera
  const handleCycleCamera = () => {
    if ((cameras?.length || 0) <= 1) return;
    sound.playClick();
    const currentIndex = cameras.findIndex(c => c.deviceId === selectedCameraId);
    const nextIndex = (currentIndex + 1) % (cameras?.length || 0);
    const nextCamera = cameras[nextIndex];
    setSelectedCameraId(nextCamera.deviceId);
    cameraService.setPreferredDeviceId(nextCamera.deviceId);
  };

  // Image / photo file upload scan
  const handleImageFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    sound.playClick();

    const result = await cameraService.scanFileForBarcode(file);
    setIsProcessingFile(false);

    if (result.success && result.text) {
      sound.playScan();
      success(`Barcode found: ${result.text}`);
      handleDetectedCode(result.text);
    } else {
      toastError(result.error || 'No barcode detected in selected picture. Please try another image.');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Manual code entry submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;

    handleDetectedCode(clean);
    setManualCode('');
  };

  // Lock background scroll when camera scanner is open
  useModalScrollLock(isOpen, 'camera-scanner-modal');

  if (!isOpen) return null;

  return (
    <div 
      data-modal="true"
      data-modal-backdrop="true"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-[95] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200 touch-none overscroll-contain"
    >
      <div 
        className="w-full max-w-lg bg-[#0f1422] rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] font-sans overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header */}
        <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-[#0a0e19] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm tracking-tight">{title}</h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {engineType === 'native' ? 'AI Hardware 60fps' : 'Universal ZXing'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Control Toolbar (Lenses, Zoom, Torch, Contrast) */}
        <div className="px-4 py-2 bg-[#0d1220] border-b border-slate-800/80 flex items-center justify-between gap-2 shrink-0 flex-wrap text-xs">
          
          {/* Lens Selector / Switcher */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {(cameras?.length || 0) > 1 ? (
              <button
                type="button"
                onClick={handleCycleCamera}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-200 hover:text-white rounded-lg text-xs transition-colors cursor-pointer"
                title="Switch Camera Lens"
              >
                <RefreshCw className="w-3 h-3 text-cyan-400" />
                <span className="truncate max-w-[120px]">
                  {cameras.find(c => c.deviceId === selectedCameraId)?.label || 'Switch Lens'}
                </span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-400">Rear Camera Active</span>
            )}
          </div>

          {/* Quick Zoom Buttons (1x, 2x, 3x) */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 px-1 font-semibold flex items-center gap-0.5">
              <ZoomIn className="w-3 h-3 text-slate-400" />
            </span>
            {[1, 2, 3].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => handleApplyZoom(lvl)}
                className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer",
                  zoomLevel === lvl
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
                title={`Set Zoom to ${lvl}x`}
              >
                {lvl}x
              </button>
            ))}
          </div>

          {/* Action Tools (Torch, Contrast, Photo, Manual) */}
          <div className="flex items-center gap-1 shrink-0">
            {hasTorch && (
              <button
                type="button"
                onClick={handleToggleTorch}
                className={cn(
                  "p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors cursor-pointer",
                  torchOn 
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40" 
                    : "bg-slate-900 text-slate-300 border-slate-700 hover:text-white"
                )}
                title="Toggle Flashlight (Torch)"
              >
                {torchOn ? <Zap className="w-3.5 h-3.5 fill-current" /> : <ZapOff className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              type="button"
              onClick={() => setEnhancedContrast(prev => !prev)}
              className={cn(
                "p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors cursor-pointer",
                enhancedContrast
                  ? "bg-indigo-600/30 text-indigo-300 border-indigo-500"
                  : "bg-slate-900 text-slate-300 border-slate-700 hover:text-white"
              )}
              title="High Contrast / Inverted Filter for Dark Barcodes"
            >
              <SunMedium className="w-3.5 h-3.5" />
            </button>

            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageFileSelected} 
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingFile}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
              title="Scan barcode from photo or gallery"
            >
              {isProcessingFile ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowManualInput(prev => !prev)}
              className={cn(
                "p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors cursor-pointer",
                showManualInput
                  ? "bg-indigo-600 text-white border-indigo-500"
                  : "bg-slate-900 text-slate-300 border-slate-700 hover:text-white"
              )}
              title="Manual keyboard typing"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scanner Viewport & Overlays */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3">
          
          {/* Camera Viewfinder Box */}
          <div className={cn(
            "relative rounded-2xl overflow-hidden border border-slate-800 bg-black min-h-[240px] sm:min-h-[280px] flex items-center justify-center shadow-inner transition-all",
            enhancedContrast ? "contrast-150 brightness-110" : ""
          )}>
            
            {/* HTML5 QR Container */}
            <div 
              id={readerElementId} 
              className="w-full h-full min-h-[240px] sm:min-h-[280px]"
              style={{
                transform: zoomLevel > 1 ? `scale(${zoomLevel})` : undefined,
                transition: 'transform 0.2s ease-out'
              }}
            />

            {/* Smart Laser Reticle Overlay */}
            {!errorMessage && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
                <div className="relative w-full max-w-[340px] h-40 sm:h-48 border-2 border-cyan-400/60 rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.35)] flex items-center justify-center">
                  
                  {/* Glowing Corner Target Brackets */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-cyan-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-cyan-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-cyan-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-cyan-400 rounded-br-lg" />
                  
                  {/* High-Tech Animated Laser Line */}
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(6,182,212,1)] animate-pulse" />
                  
                  {/* Center Crosshair */}
                  <div className="w-2 h-2 rounded-full bg-cyan-400/40" />

                  {/* Sub-label */}
                  <div className="absolute bottom-2 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-cyan-300 font-mono flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400 animate-spin" />
                    <span>Auto-Detecting 1D/2D Barcodes & IMEI...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isInitializing && !errorMessage && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2.5 text-cyan-400 z-10">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span className="text-xs font-bold text-white tracking-wide">Starting Ultra-Precision Scanner...</span>
              </div>
            )}

            {/* Error Overlay / Fallback */}
            {errorMessage && (
              <div className="absolute inset-0 bg-[#0d1220]/95 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center gap-3 z-20">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="max-w-xs space-y-1">
                  <h4 className="font-bold text-white text-sm">Camera Stream Notice</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{errorMessage}</p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsInitializing(true);
                      setErrorMessage(null);
                      cameraService.testAndAuthorizeCamera().then(res => {
                        if (res.success) {
                          setSelectedCameraId(res.deviceId || '');
                        } else {
                          setErrorMessage(res.error || 'Authorization failed');
                        }
                      });
                    }}
                    className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    Upload Image
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Manual Input Panel (Toggleable) */}
          {(showManualInput || errorMessage) && (
            <form onSubmit={handleManualSubmit} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-xs font-semibold text-slate-300">
                Direct Keyboard / USB Scanner Input
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span>Enter</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* Scanned Feedback Card */}
          {lastScannedCode && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-2 animate-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="text-xs text-slate-200 truncate">
                  Scanned Code: <strong className="text-white font-mono">{lastScannedCode}</strong>
                </div>
              </div>
              <span className="text-[11px] text-emerald-400 font-bold shrink-0">#{scannedCount}</span>
            </div>
          )}

          {/* Quick Hardware Tip */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>USB / Bluetooth barcode guns supported</span>
            </div>
            {continuousMode && (
              <span className="text-cyan-400 font-medium">Continuous POS Mode</span>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-[#0a0e19] border-t border-slate-800 flex justify-between items-center shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upload Photo / Barcode</span>
          </button>
          
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
