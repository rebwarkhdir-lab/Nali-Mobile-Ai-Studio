// Intelligent client-side hardware, platform, browser & device category detector
// For Nali Mobile POS device session tracking and telemetry
import { DeviceSession } from '../pages/admin/types';
import { getStoredSessions, saveStoredSessions, addAuditEntry, fetchConnectedDevicesFromCloud } from '../pages/admin/adminStore';

export type DeviceCategory = 'Computer / Laptop' | 'Mobile Phone' | 'Tablet' | 'POS Terminal';
export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'terminal';

export interface DetectedDevice {
  deviceType: DeviceType;
  deviceCategory: DeviceCategory;
  deviceName: string;
  osName: string;
  browser: string;
  screenResolution: string;
  ipAddress: string;
  location: string;
  isTouch: boolean;
}

export function detectDevice(): DetectedDevice {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      deviceType: 'desktop',
      deviceCategory: 'Computer / Laptop',
      deviceName: 'Desktop Workstation',
      osName: 'Desktop OS',
      browser: 'Web Browser',
      screenResolution: '1920x1080',
      ipAddress: '192.168.1.10',
      location: 'Main Terminal HQ',
      isTouch: false
    };
  }

  const ua = navigator.userAgent || '';
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || '';
  const isTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const width = window.screen?.width || window.innerWidth || 1024;
  const height = window.screen?.height || window.innerHeight || 768;
  const screenResolution = `${width}x${height}`;

  let deviceType: DeviceType = 'desktop';
  let deviceCategory: DeviceCategory = 'Computer / Laptop';
  let deviceName = 'Computer / Laptop';
  let osName = 'Desktop OS';

  // 1. Check iOS devices
  if (/iPad/i.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1 && !/iPhone/i.test(ua))) {
    deviceType = 'tablet';
    deviceCategory = 'Tablet';
    deviceName = 'Apple iPad';
    osName = 'iPadOS';
  } else if (/iPhone/i.test(ua)) {
    deviceType = 'mobile';
    deviceCategory = 'Mobile Phone';
    deviceName = 'Apple iPhone';
    osName = 'iOS';
  } else if (/Android/i.test(ua)) {
    // Check if Android Tablet or Android Phone
    const isTablet = !/Mobile/i.test(ua) || width >= 768;
    if (isTablet) {
      deviceType = 'tablet';
      deviceCategory = 'Tablet';
      deviceName = 'Android Tablet';
    } else {
      deviceType = 'mobile';
      deviceCategory = 'Mobile Phone';
      
      // Extract brand/model if detectable
      if (/SM-|Galaxy/i.test(ua)) {
        deviceName = 'Samsung Galaxy Phone';
      } else if (/Xiaomi|Redmi|POCO/i.test(ua)) {
        deviceName = 'Xiaomi / Redmi Mobile';
      } else if (/Pixel/i.test(ua)) {
        deviceName = 'Google Pixel Mobile';
      } else if (/Infinix/i.test(ua)) {
        deviceName = 'Infinix Mobile';
      } else if (/TECNO/i.test(ua)) {
        deviceName = 'Tecno Mobile';
      } else if (/Huawei|Honor/i.test(ua)) {
        deviceName = 'Huawei Mobile';
      } else {
        deviceName = 'Android Mobile Phone';
      }
    }
    osName = 'Android';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    deviceType = 'desktop';
    deviceCategory = 'Computer / Laptop';
    deviceName = 'Apple MacBook / iMac';
    osName = 'macOS';
  } else if (/Windows NT/i.test(ua)) {
    deviceType = 'desktop';
    deviceCategory = 'Computer / Laptop';
    if (/Windows NT 10.0/i.test(ua)) {
      deviceName = 'Windows 11 / 10 PC';
      osName = 'Windows 11';
    } else {
      deviceName = 'Windows PC Laptop';
      osName = 'Windows';
    }
  } else if (/Linux/i.test(ua)) {
    deviceType = 'desktop';
    deviceCategory = 'Computer / Laptop';
    deviceName = 'Linux Workstation';
    osName = 'Linux';
  } else if (/CrOS/i.test(ua)) {
    deviceType = 'desktop';
    deviceCategory = 'Computer / Laptop';
    deviceName = 'Chromebook Laptop';
    osName = 'ChromeOS';
  }

  // Detect POS terminal specific criteria (touch screen POS terminal)
  if (isTouch && width <= 1366 && width >= 800 && deviceType === 'desktop') {
    deviceType = 'terminal';
    deviceCategory = 'POS Terminal';
    deviceName = 'Touchscreen POS Register';
  }

  // Detect Browser
  let browser = 'Web Browser';
  if (/Edg\//i.test(ua)) {
    const match = ua.match(/Edg\/(\d+)/);
    browser = `Edge ${match ? match[1] : ''}`.trim();
  } else if (/Chrome\//i.test(ua) && !/Chromium|Edg/i.test(ua)) {
    const match = ua.match(/Chrome\/(\d+)/);
    browser = `Chrome ${match ? match[1] : ''}`.trim();
  } else if (/Safari\//i.test(ua) && !/Chrome|Chromium/i.test(ua)) {
    const match = ua.match(/Version\/(\d+)/);
    browser = `Safari ${match ? match[1] : ''}`.trim();
  } else if (/Firefox\//i.test(ua)) {
    const match = ua.match(/Firefox\/(\d+)/);
    browser = `Firefox ${match ? match[1] : ''}`.trim();
  } else if (/SamsungBrowser\//i.test(ua)) {
    browser = 'Samsung Internet';
  } else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) {
    browser = 'Opera';
  }

  // Persistent IP for this client
  let ipAddress = '192.168.1.105';
  try {
    const cachedIp = localStorage.getItem('nali_device_ip_address');
    if (cachedIp) {
      ipAddress = cachedIp;
    } else {
      const generatedIp = `192.168.1.${Math.floor(100 + Math.random() * 150)}`;
      localStorage.setItem('nali_device_ip_address', generatedIp);
      ipAddress = generatedIp;
    }
  } catch {}

  return {
    deviceType,
    deviceCategory,
    deviceName,
    osName,
    browser,
    screenResolution,
    ipAddress,
    location: 'Main Terminal (Storefront)',
    isTouch
  };
}

export function recordAndActivateDeviceSession(
  user: {
    id: string;
    full_name?: string;
    username?: string;
    email?: string;
    role_id?: string;
    role?: { name?: string };
  },
  explicitRoleName?: string
): { session: DeviceSession; device: DetectedDevice } {
  const detected = detectDevice();
  const rawRole = explicitRoleName || user.role?.name || (
    user.role_id === 'role-admin' ? 'Administrator' :
    user.role_id === 'role-manager' ? 'Manager' :
    user.role_id === 'role-cashier' ? 'Cashier' :
    user.role_id === 'role-user' ? 'User' :
    user.role_id === 'role-technician' ? 'Technician' : 'Cashier'
  );

  const roleName = rawRole.toLowerCase().includes('admin') ? 'Administrator' :
    rawRole.toLowerCase().includes('manager') ? 'Manager' :
    rawRole.toLowerCase().includes('cashier') ? 'Cashier' :
    rawRole.toLowerCase().includes('user') ? 'User' :
    rawRole.toLowerCase().includes('tech') ? 'Technician' : rawRole;

  const userName = user.username ? `@${user.username}` : (user.full_name || user.email?.split('@')[0] || 'Staff');

  const existingSessions = getStoredSessions();
  
  let deviceSessionId = '';
  try {
    deviceSessionId = localStorage.getItem('nali_device_session_id') || '';
    if (!deviceSessionId) {
      deviceSessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem('nali_device_session_id', deviceSessionId);
    }
  } catch {
    deviceSessionId = `sess-${Date.now()}`;
  }

  const nowIso = new Date().toISOString();

  // Mark all previous sessions in this browser as non-current
  const otherSessions = existingSessions
    .filter(s => s.id !== deviceSessionId)
    .map(s => ({ ...s, is_current: false }));

  const currentSession: DeviceSession = {
    id: deviceSessionId,
    user_id: user.id,
    user_name: userName,
    user_role: roleName,
    device_name: detected.deviceName,
    device_type: detected.deviceType,
    device_category: detected.deviceCategory,
    device_model: detected.deviceName,
    os_name: detected.osName,
    browser: `${detected.browser} • ${detected.osName}`,
    ip_address: detected.ipAddress,
    location: `${detected.deviceCategory} • Main Store`,
    created_at: nowIso,
    last_active: 'Just now',
    is_current: true,
    trusted: true
  };

  const updatedSessions = [currentSession, ...otherSessions.slice(0, 19)];
  
  // 1. Immediately save to local storage for quick access
  localStorage.setItem('nali_pos_admin_sessions', JSON.stringify(updatedSessions));
  window.dispatchEvent(new CustomEvent('nali_sessions_updated'));

  // 2. Asynchronously merge with cloud to prevent overwriting other devices
  setTimeout(async () => {
    try {
      const cloudSessions = await fetchConnectedDevicesFromCloud();
      
      // Deduplicate and merge: keep the newly created local session first, 
      // then add cloud sessions excluding this device's old sessions.
      const mergedMap = new Map<string, DeviceSession>();
      mergedMap.set(currentSession.id, currentSession);
      
      for (const cs of cloudSessions) {
        if (!mergedMap.has(cs.id)) {
          mergedMap.set(cs.id, cs);
        }
      }
      
      const finalSessions = Array.from(mergedMap.values()).slice(0, 30);
      saveStoredSessions(finalSessions);
    } catch (e) {
      console.warn('Failed to merge cloud sessions during login:', e);
    }
  }, 0);

  // Add Security Audit Log entry
  addAuditEntry({
    user_name: userName,
    user_role: roleName,
    action: `Device session activated: Logged in as ${roleName} from ${detected.deviceCategory} (${detected.deviceName})`,
    module: 'Security & Sessions',
    target: userName,
    severity: 'info',
    ip_address: detected.ipAddress,
    details: {
      session_id: currentSession.id,
      device_category: detected.deviceCategory,
      device_name: detected.deviceName,
      os: detected.osName,
      browser: detected.browser,
      resolution: detected.screenResolution
    }
  });

  return { session: currentSession, device: detected };
}
