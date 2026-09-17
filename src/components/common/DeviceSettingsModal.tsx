import { useDesignSystem } from '../../context/DesignContext';
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Volume2, 
  RefreshCw, 
  Sparkles,
  Smartphone,
  ShieldCheck,
  Zap,
  Palette,
  ScanLine,
  SlidersHorizontal,
  Video,
  VideoOff,
  Check,
  ArrowRight,
  Usb,
  Cpu,
  Trash2
} from 'lucide-react';
import { cameraService, CameraDeviceInfo, HardwareScanResult } from '../../lib/cameraService';
import { sound } from '../../lib/sound';
import { useToast } from './Toast';
import { cn } from '../../lib/utils';
import RecycleBinModal from './RecycleBinModal';

interface DeviceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDesignSettings?: () => void;
}

export default function DeviceSettingsModal({ isOpen, onClose, onOpenDesignSettings }: DeviceSettingsModalProps) {
  const { t } = useTranslation();
  const { success, error: toastError, info } = useToast();
  
  const [isAllowed, setIsAllowed] = useState(false);
  const [cameras, setCameras] = useState<CameraDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    label?: string;
    resolution?: string;
    hasTorch?: boolean;
  } | null>(null);

  // Live stream preview state
  const [isLivePreviewOn, setIsLivePreviewOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [torchState, setTorchState] = useState(false);

  // Hardware Scanner Test state
  const [recentHardwareScans, setRecentHardwareScans] = useState<HardwareScanResult[]>([]);
  const [manualTestInput, setManualTestInput] = useState('');

  const { settings, updateSettings } = useDesignSystem();
  // Exchange rate state
  const [exchangeRate, setExchangeRate] = useState<string>(() => {
    return (settings.exchangeRate || 1500).toString();
  });
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setExchangeRate((settings.exchangeRate || 1500).toString());
    }
  }, [isOpen, settings.exchangeRate]);

  // Load cameras and subscribe to hardware scanner
  useEffect(() => {
    if (!isOpen) {
      stopLiveStream();
      return;
    }

    const allowed = cameraService.isCameraAllowed();
    setIsAllowed(allowed);
    const pref = cameraService.getPreferredDeviceId() || '';
    setSelectedCameraId(pref);

    cameraService.getAvailableCameras().then(list => {
      setCameras(list);
      if (!pref && (list?.length || 0) > 0) {
        const back = list.find(c => c.isBackCamera) || list[0];
        setSelectedCameraId(back.deviceId);
      }
    });

    // Subscribe to USB / Bluetooth hardware barcode scanner guns
    const unsubscribe = cameraService.subscribeHardwareScanner((res) => {
      sound.playScan();
      success(`Hardware Scanner detected: ${res.code}`);
      setRecentHardwareScans(prev => [res, ...prev.slice(0, 4)]);
    });

    return () => {
      unsubscribe();
      stopLiveStream();
    };
  }, [isOpen]);

  const stopLiveStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsLivePreviewOn(false);
    setTorchState(false);
  };

  const startLiveStream = async (deviceId?: string) => {
    stopLiveStream();
    setIsTesting(true);

    try {
      let stream: MediaStream | null = null;
      const targetId = deviceId || selectedCameraId;

      if (targetId) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: targetId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          });
        } catch {
          // Fallback
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } }
          });
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }
        });
      }

      if (stream && videoRef.current) {
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(console.warn);
        
        setIsLivePreviewOn(true);
        setIsAllowed(true);
        cameraService.setCameraAllowed(true, targetId || undefined);

        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack?.getSettings();
        const caps: any = videoTrack?.getCapabilities ? videoTrack.getCapabilities() : {};

        setTestResult({
          label: videoTrack.label || 'Default Camera',
          resolution: settings?.width && settings?.height ? `${settings.width}x${settings.height}` : 'HD',
          hasTorch: Boolean(caps?.torch)
        });

        // Re-enumerate to get fresh labels
        const updatedList = await cameraService.getAvailableCameras();
        setCameras(updatedList);
        success('Live camera stream connected and operational!');
      }
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        console.warn('Camera preview permission not granted:', err);
      } else {
        console.warn('Camera stream notice:', err);
      }
      toastError(err?.message || 'Could not start camera preview. Please check permissions.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestAndAuthorize = async () => {
    sound.playClick();
    await startLiveStream(selectedCameraId || undefined);
  };

  const handleSelectCamera = async (deviceId: string) => {
    setSelectedCameraId(deviceId);
    cameraService.setPreferredDeviceId(deviceId);
    sound.playClick();
    success('Default camera updated');

    if (isLivePreviewOn) {
      await startLiveStream(deviceId);
    }
  };

  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      const next = !torchState;
      const ok = await cameraService.toggleTorch(track, next);
      if (ok) {
        setTorchState(next);
        sound.playClick();
      } else {
        info('Flashlight is not available on this lens.');
      }
    }
  };

  const handleManualTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTestInput.trim()) return;
    sound.playScan();
    const result: HardwareScanResult = {
      code: manualTestInput.trim(),
      scanTimeMs: 12,
      timestamp: new Date()
    };
    setRecentHardwareScans(prev => [result, ...prev.slice(0, 4)]);
    setManualTestInput('');
    success(`Barcode verified: ${result.code}`);
  };

  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(exchangeRate);
    if (!isNaN(rate) && rate > 0) {
      updateSettings({ exchangeRate: rate });
      sound.playSuccess();
      success(`Default exchange rate saved ($1 = ${rate.toLocaleString()} IQD)`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[90] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#111625] rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#0d111d] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base tracking-tight">{t('deviceSettings.title', 'Camera & Hardware Configuration')}</h3>
              <p className="text-xs text-slate-400">{t('deviceSettings.subtitle', 'Manage camera streams, USB/Bluetooth barcode guns, and hardware peripherals')}</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              stopLiveStream();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Section 1: Camera & Video Hardware */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{t('deviceSettings.cameraAuth', 'Camera Device & Authorization')}</h4>
                  <p className="text-xs text-slate-400">
                    {t('deviceSettings.cameraAuthDesc', 'High-speed barcode, QR, and IMEI scanning with zero repeated permission prompts')}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1.5 ${
                isAllowed 
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              }`}>
                {isAllowed ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t('deviceSettings.authorized', 'Authorized')}
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    {t('deviceSettings.needsVerification', 'Needs Verification')}
                  </>
                )}
              </span>
            </div>

            {/* Live Camera Viewport (When active) */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black min-h-[160px] flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className={cn(
                  "w-full h-48 object-cover rounded-2xl",
                  !isLivePreviewOn && "hidden"
                )}
              />

              {!isLivePreviewOn && (
                <div className="py-8 flex flex-col items-center justify-center text-slate-500 space-y-2">
                  <VideoOff className="w-8 h-8 text-slate-600" />
                  <p className="text-xs text-slate-400">{t('deviceSettings.livePreviewIdle', 'Live preview idle. Tap below to test camera stream.')}</p>
                </div>
              )}

              {/* Stream Overlay info */}
              {isLivePreviewOn && testResult && (
                <div className="absolute top-2 left-2 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-lg border border-slate-700 text-[11px] text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>{testResult.resolution}</span>
                  <span className="text-slate-400 truncate max-w-[140px]">{testResult.label}</span>
                </div>
              )}

              {/* Torch button if available */}
              {isLivePreviewOn && testResult?.hasTorch && (
                <button
                  type="button"
                  onClick={handleToggleTorch}
                  className={cn(
                    "absolute top-2 right-2 px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 shadow-md cursor-pointer",
                    torchState 
                      ? "bg-amber-500 text-slate-950 border-amber-400" 
                      : "bg-black/70 backdrop-blur-md text-white border-slate-700"
                  )}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{torchState ? t('deviceSettings.flashOn', 'Flash On') : t('deviceSettings.flash', 'Flash')}</span>
                </button>
              )}
            </div>

            {/* Camera Switcher & Actions */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <button
                type="button"
                onClick={handleTestAndAuthorize}
                disabled={isTesting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-xs shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {t('deviceSettings.testingCamera', 'Testing Camera Connection...')}
                  </>
                ) : isLivePreviewOn ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    {t('deviceSettings.restartStream', 'Restart Live Stream')}
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    {t('deviceSettings.startCamera', 'Start Camera & Verify Stream')}
                  </>
                )}
              </button>

              {isLivePreviewOn && (
                <button
                  type="button"
                  onClick={stopLiveStream}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                >
                  {t('deviceSettings.stopPreview', 'Stop Preview')}
                </button>
              )}
            </div>

            {/* Camera hardware chooser */}
            {(cameras?.length || 0) > 0 && (
              <div className="pt-2 border-t border-slate-800/80">
                <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('deviceSettings.defaultCameraHardware', 'Default Camera Hardware')}:</span>
                </label>
                <select
                  value={selectedCameraId}
                  onChange={(e) => handleSelectCamera(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  {cameras.map((c, i) => (
                    <option key={c.deviceId || i} value={c.deviceId}>
                      {c.label || `${t('deviceSettings.camera', 'Camera')} ${i + 1}`} {c.isBackCamera ? `(${t('deviceSettings.rearLensRecommended', 'Recommended / Rear Lens')})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Section 2: Physical Hardware Barcode Scanners (USB & Bluetooth Guns) */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Usb className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{t('deviceSettings.barcodeGuns', 'USB & Bluetooth Barcode Guns')}</h4>
                  <p className="text-xs text-slate-400">
                    {t('deviceSettings.barcodeGunsDesc', 'Handheld laser & 2D imagers (Honeywell, Zebra, Netum, Datalogic, Symcode)')}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                {t('deviceSettings.hidActive', 'HID Active')}
              </span>
            </div>

            {/* Interactive Scanner Test Input */}
            <form onSubmit={handleManualTestSubmit} className="space-y-2">
              <label className="block text-xs font-medium text-slate-400">
                {t('deviceSettings.testScanArea', 'Test Scan Area (Pull your scanner trigger or type barcode):')}
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                  <input
                    type="text"
                    value={manualTestInput}
                    onChange={(e) => setManualTestInput(e.target.value)}
                    placeholder={t('deviceSettings.pullTriggerPlaceholder', 'Pull scanner trigger to test hardware signal...')}
                    className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!manualTestInput.trim()}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <span>{t('deviceSettings.test', 'Test')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            {/* Recent Scans Log */}
            {(recentHardwareScans?.length || 0) > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-semibold text-slate-400">{t('deviceSettings.recentHardwareSignals', 'Recent Hardware Trigger Signals:')}</div>
                <div className="space-y-1">
                  {recentHardwareScans.map((scan, idx) => (
                    <div key={idx} className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                        <span className="font-bold">{scan.code}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {scan.scanTimeMs}ms {t('deviceSettings.latency', 'latency')} • {scan.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Sound & Audio Feedback */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">{t('deviceSettings.audioHaptic', 'Audio & Haptic Feedback')}</h4>
                <p className="text-xs text-slate-400">{t('deviceSettings.audioHapticDesc', 'Crystal audio chimes and vibrations for barcode scans and sales')}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                sound.playScan();
                cameraService.triggerHaptic([80]);
              }}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
            >
              {t('deviceSettings.testSoundHaptic', 'Test Sound & Haptic')}
            </button>
          </div>

          {/* Section 4: Design Studio Link */}
          {onOpenDesignSettings && (
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{t('deviceSettings.designStudio', 'Design & Theme Studio')}</h4>
                  <p className="text-xs text-slate-400">{t('deviceSettings.designStudioDesc', 'Customize color themes, dark/light modes, and font scale')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  stopLiveStream();
                  onOpenDesignSettings();
                }}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all shrink-0 cursor-pointer"
              >
                {t('deviceSettings.customizeUI', 'Customize UI')}
              </button>
            </div>
          )}

          {/* Section 5: Default Exchange Rate Card */}
          <form onSubmit={handleSaveRate} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{t('deviceSettings.defaultExchangeRate', 'Default Shop Exchange Rate')}</h4>
                  <p className="text-xs text-slate-400">{t('deviceSettings.defaultExchangeRateDesc', 'Applied automatically to dual currency conversions (USD/IQD)')}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$1 =</span>
                <input
                  type="number"
                  step="1"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-12 py-2 text-xs text-white font-mono"
                  placeholder="1500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">IQD</span>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer"
              >
                {t('deviceSettings.saveRate', 'Save Rate')}
              </button>
            </div>
          </form>

          {/* Section 6: Recycle Bin */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Recycle Bin</h4>
                <p className="text-xs text-slate-400">View, recover or permanently delete removed items</p>
              </div>
            </div>
            <button
              onClick={() => { sound.playClick(); setIsRecycleBinOpen(true); }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors border border-slate-700 cursor-pointer"
            >
              Open Bin
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0d111d] border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              stopLiveStream();
              onClose();
            }}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            {t('common.done', 'Done')}
          </button>
        </div>

      </div>

      {isRecycleBinOpen && (
        <RecycleBinModal 
          isOpen={isRecycleBinOpen}
          onClose={() => setIsRecycleBinOpen(false)}
        />
      )}
    </div>
  );
}
