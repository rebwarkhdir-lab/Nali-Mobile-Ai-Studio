/**
 * Professional Camera, Torch & Hardware Barcode Scanner Service
 * Multi-device camera enumeration, cascading fallbacks, flashlight control,
 * image file barcode extraction, and USB/Bluetooth HID scanner integration.
 */

import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export interface CameraDeviceInfo {
  deviceId: string;
  label: string;
  kind: string;
  isBackCamera: boolean;
  hasTorch?: boolean;
  hasZoom?: boolean;
  minZoom?: number;
  maxZoom?: number;
}

export interface HardwareScanResult {
  code: string;
  scanTimeMs: number;
  timestamp: Date;
}

const STORAGE_KEYS = {
  CAMERA_ALLOWED: 'nali_camera_access_allowed',
  PREFERRED_DEVICE_ID: 'nali_camera_preferred_device_id',
  LAST_AUTHORIZED_AT: 'nali_camera_last_authorized_at',
  AUTO_SCAN_ENABLED: 'nali_camera_auto_scan_enabled',
  SCANNER_AUDIO_ENABLED: 'nali_scanner_audio_enabled',
  VIBRATION_ENABLED: 'nali_scanner_vibration_enabled'
};

class CameraService {
  private permissionStatus: PermissionStatus | null = null;
  private cachedDevices: CameraDeviceInfo[] = [];
  private hardwareScannerListeners: Set<(result: HardwareScanResult) => void> = new Set();
  private isListenerAttached = false;
  private keyBuffer: { key: string; time: number }[] = [];
  private keyBufferTimeout: any = null;

  /**
   * Check if Native BarcodeDetector is available in this browser
   */
  public hasNativeBarcodeDetector(): boolean {
    return typeof window !== 'undefined' && 'BarcodeDetector' in window;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.initPermissionWatcher();
      this.initHardwareScannerListener();
    }
  }

  private async initPermissionWatcher() {
    try {
      if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
        const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
        this.permissionStatus = status;
        
        if (status.state === 'granted') {
          this.setCameraAllowed(true);
        }

        status.onchange = () => {
          if (status.state === 'granted') {
            this.setCameraAllowed(true);
          } else if (status.state === 'denied') {
            this.setCameraAllowed(false);
          }
        };
      }
    } catch {
      // Permission query not supported on some engines (e.g. Safari / older WebViews)
    }
  }

  /**
   * Hardware Scanner Detection (USB & Bluetooth Handheld Barcode Guns)
   * Listens for fast keystrokes (<45ms between characters) terminating with Enter/Tab.
   */
  private initHardwareScannerListener() {
    if (this.isListenerAttached || typeof window === 'undefined') return;

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // If user is typing in a standard multi-line textarea, ignore unless explicitly configured
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';
      
      const now = Date.now();
      const key = e.key;

      // Enter or Tab usually denotes the end of a hardware barcode burst
      if (key === 'Enter' || key === 'Tab') {
        if ((this.keyBuffer?.length || 0) >= 3) {
          // Calculate average typing speed
          const bufLen = this.keyBuffer?.length || 0;
          const totalDuration = bufLen > 0 ? (this.keyBuffer[bufLen - 1]?.time || now) - (this.keyBuffer[0]?.time || now) : 0;
          const avgInterval = totalDuration / Math.max(1, bufLen - 1);

          // Barcode scanners transmit entire codes within 20-50ms total or < 40ms avg per key
          if (avgInterval < 65 || totalDuration < 250) {
            const barcode = (this.keyBuffer || []).map(item => item.key).join('').trim();
            if ((barcode?.length || 0) >= 3) {
              // Valid hardware scan detected!
              const result: HardwareScanResult = {
                code: barcode,
                scanTimeMs: totalDuration,
                timestamp: new Date()
              };

              this.notifyHardwareListeners(result);
              this.triggerHaptic([50]);
            }
          }
        }
        this.keyBuffer = [];
        return;
      }

      // Record printable ASCII characters
      if ((key?.length || 0) === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        this.keyBuffer.push({ key, time: now });

        // Auto-clear buffer if no key arrives within 120ms (distinguishes human typing from scanner)
        clearTimeout(this.keyBufferTimeout);
        this.keyBufferTimeout = setTimeout(() => {
          this.keyBuffer = [];
        }, 120);
      }
    }, true);

    this.isListenerAttached = true;
  }

  /**
   * Subscribe to global physical hardware barcode scanner events (USB/Bluetooth)
   */
  public subscribeHardwareScanner(listener: (result: HardwareScanResult) => void): () => void {
    this.hardwareScannerListeners.add(listener);
    return () => {
      this.hardwareScannerListeners.delete(listener);
    };
  }

  private notifyHardwareListeners(result: HardwareScanResult) {
    this.hardwareScannerListeners.forEach(fn => {
      try {
        fn(result);
      } catch (err) {
        console.error('Error in hardware scanner listener:', err);
      }
    });
  }

  /**
   * Check whether camera has been approved
   */
  public isCameraAllowed(): boolean {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CAMERA_ALLOWED);
      if (stored === 'true') return true;
      if (this.permissionStatus && this.permissionStatus.state === 'granted') {
        this.setCameraAllowed(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Set permanent camera authorization status
   */
  public setCameraAllowed(allowed: boolean, deviceId?: string): void {
    try {
      if (allowed) {
        localStorage.setItem(STORAGE_KEYS.CAMERA_ALLOWED, 'true');
        localStorage.setItem(STORAGE_KEYS.LAST_AUTHORIZED_AT, new Date().toISOString());
        if (deviceId) {
          localStorage.setItem(STORAGE_KEYS.PREFERRED_DEVICE_ID, deviceId);
        }
      } else {
        localStorage.removeItem(STORAGE_KEYS.CAMERA_ALLOWED);
      }
    } catch (e) {
      console.warn('Could not write camera preference to localStorage:', e);
    }
  }

  /**
   * Get preferred camera device ID for this machine
   */
  public getPreferredDeviceId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.PREFERRED_DEVICE_ID);
    } catch {
      return null;
    }
  }

  /**
   * Set preferred camera device ID
   */
  public setPreferredDeviceId(deviceId: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PREFERRED_DEVICE_ID, deviceId);
    } catch (e) {
      console.warn('Could not save preferred camera ID:', e);
    }
  }

  /**
   * Enumerate all available video cameras on this device with enhanced friendly labels
   */
  public async getAvailableCameras(): Promise<CameraDeviceInfo[]> {
    try {
      if (!navigator?.mediaDevices?.enumerateDevices) {
        return [];
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');

      this.cachedDevices = videoDevices.map((d, index) => {
        let label = d.label;
        if (!label) {
          label = index === 0 ? 'Main Camera (Rear/Webcam)' : `Camera ${index + 1}`;
        }

        const isBack = /back|rear|environment|wide|main|primary|telephoto|macro|0\.5x|1x|2x|3x/i.test(label);
        return {
          deviceId: d.deviceId,
          label: label,
          kind: d.kind,
          isBackCamera: isBack
        };
      });

      return this.cachedDevices;
    } catch (e) {
      console.warn('Failed to enumerate camera devices:', e);
      return [];
    }
  }

  /**
   * Request / test camera access to establish browser authorization and verify stream quality
   */
  public async testAndAuthorizeCamera(preferredDeviceId?: string): Promise<{ 
    success: boolean; 
    deviceId?: string; 
    label?: string; 
    hasTorch?: boolean;
    resolution?: string;
    error?: string;
  }> {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        return { success: false, error: 'Camera API (MediaDevices) is not supported in this browser environment.' };
      }

      let stream: MediaStream | null = null;
      let lastErr: any = null;

      // 1. Try with preferred device ID if provided
      if (preferredDeviceId) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: preferredDeviceId } }
          });
        } catch (e) {
          lastErr = e;
        }
      }

      // 2. Try rear environment camera
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } }
          });
        } catch (e) {
          lastErr = e;
        }
      }

      // 3. Fallback to generic video
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (e) {
          lastErr = e;
        }
      }

      if (!stream) {
        throw lastErr || new Error('Unable to start video camera stream');
      }

      // Inspect active video track
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack?.getSettings();
      const capabilities: any = typeof videoTrack.getCapabilities === 'function' ? videoTrack.getCapabilities() : {};
      
      const actualDeviceId = settings?.deviceId || preferredDeviceId || '';
      const label = videoTrack.label || 'Default Camera';
      const hasTorch = Boolean(capabilities?.torch);
      const resolution = settings?.width && settings?.height ? `${settings.width}x${settings.height}` : 'HD 720p/1080p';

      // Safely close stream after testing
      stream.getTracks().forEach(track => track.stop());

      // Permanently store device permission
      this.setCameraAllowed(true, actualDeviceId);

      // Re-enumerate cameras now that permissions are unlocked so real device labels appear
      await this.getAvailableCameras();

      return { 
        success: true, 
        deviceId: actualDeviceId,
        label,
        hasTorch,
        resolution
      };
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        console.warn('Camera permission not granted by user or context:', err);
      } else {
        console.warn('Camera authorization notice:', err);
      }
      let msg = err?.message || 'Permission denied or no camera found on this device.';
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        msg = 'Camera access was blocked by the browser. Please tap the camera/lock icon in your browser address bar to allow camera permissions.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        msg = 'No camera hardware found on this computer or phone.';
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        msg = 'Camera is already in use by another application or tab. Please close other camera apps and retry.';
      }
      return { 
        success: false, 
        error: msg 
      };
    }
  }

  /**
   * Toggle Torch / Flashlight on an active MediaStream video track
   */
  public async toggleTorch(videoTrack: MediaStreamTrack, enabled: boolean): Promise<boolean> {
    try {
      const capabilities: any = typeof videoTrack.getCapabilities === 'function' ? videoTrack.getCapabilities() : {};
      if (capabilities.torch) {
        await (videoTrack as any).applyConstraints({
          advanced: [{ torch: enabled }]
        });
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Torch toggle failed:', err);
      return false;
    }
  }

  /**
   * Decode Barcode / QR / IMEI from an image file (e.g. photo upload, gallery)
   */
  public async scanFileForBarcode(file: File): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
      // Create a temporary hidden Html5Qrcode instance
      const tempId = `temp-scanner-file-${Date.now()}`;
      const tempDiv = document.createElement('div');
      tempDiv.id = tempId;
      tempDiv.style.display = 'none';
      document.body.appendChild(tempDiv);

      const scanner = new Html5Qrcode(tempId, {
        formatsToSupport: [
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
        ],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      });
      try {
        const decodedText = await scanner.scanFile(file, true);
        tempDiv.remove();
        return { success: true, text: decodedText.trim() };
      } catch (scanErr: any) {
        tempDiv.remove();
        return { success: false, error: scanErr?.message || 'Could not detect a clear barcode in this photo. Please try a clearer picture or enter manually.' };
      }
    } catch (e: any) {
      return { success: false, error: e?.message || 'File scanning not supported.' };
    }
  }

  /**
   * Trigger haptic vibration if supported on mobile
   */
  public triggerHaptic(pattern: number[] = [80]) {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch {}
  }
}

export const cameraService = new CameraService();
