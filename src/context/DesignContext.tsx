import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  DesignSettings, 
  DEFAULT_DESIGN_SETTINGS, 
  CURATED_PRESETS,
  THEME_PALETTES,
  ThemePalette,
  AppearanceMode,
  sanitizeDesignSettings
} from '../types/design';
import { sound } from '../lib/sound';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface DesignContextType {
  settings: DesignSettings;
  updateSettings: (partial: Partial<DesignSettings>) => void;
  applyPreset: (presetId: string) => void;
  resetToDefaults: () => void;
  exportProfile: () => string;
  importProfile: (jsonString: string) => { success: boolean; error?: string };
  syncWithCloud: (forcePush?: boolean) => Promise<boolean>;
  isCloudSyncing: boolean;
  lastCloudSyncTime: Date | null;
  activeThemeInfo: typeof THEME_PALETTES[0];
  isOled: boolean;
  isLight: boolean;
  isCompact: boolean;
  currentPresetId: string | null;
}

const STORAGE_KEY = 'nali_design_settings_v2';
const SETTINGS_CLOUD_KEY = 'nali_store_branding_settings_v1';

const DesignContext = createContext<DesignContextType | undefined>(undefined);

export const DesignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<DesignSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Harmonize with existing saved exchange rate if present
        const savedRate = localStorage.getItem('nali_exchange_rate');
        if (savedRate && !parsed.exchangeRate) {
          parsed.exchangeRate = parseFloat(savedRate) || 1500;
        }
        return sanitizeDesignSettings(parsed);
      }
    } catch (e) {
      console.warn('Failed to load design settings:', e);
    }
    return DEFAULT_DESIGN_SETTINGS;
  });

  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<Date | null>(null);

  const isInitialMount = useRef(true);
  const isIncomingRemoteUpdateRef = useRef(false);
  const lastPushedHashRef = useRef<string>('');
  const pushDebounceRef = useRef<any>(null);
  const fetchCloudBrandingRef = useRef<() => Promise<void>>(async () => {});

  // Sync settings to Supabase Cloud & Server relay
  const pushSettingsToCloud = useCallback(async (newSettings: DesignSettings): Promise<boolean> => {
    const brandingFingerprint = JSON.stringify({
      storeName: newSettings.storeName || '',
      storeSubtitle: newSettings.storeSubtitle || '',
      customLogoUrl: newSettings.customLogoUrl || '',
      theme: newSettings.theme || '',
      appearance: newSettings.appearance || '',
      exchangeRate: newSettings.exchangeRate || 1500
    });

    // Skip if already pushed identical data
    if (lastPushedHashRef.current === brandingFingerprint) {
      return true;
    }

    setIsCloudSyncing(true);

    // 1. Fast Server-side relay (instant fallback across devices connected to this app instance)
    try {
      fetch('/api/store-branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      }).catch(() => {});
    } catch {}

    // 2. BroadcastChannel for instant multi-tab sync on the same device
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('nali_store_branding_sync');
        bc.postMessage({ type: 'BRANDING_UPDATED', settings: newSettings });
        bc.close();
      }
    } catch {}

    // 3. Supabase Cloud Sync
    if (!isSupabaseConfigured()) {
      lastPushedHashRef.current = brandingFingerprint;
      setIsCloudSyncing(false);
      return false;
    }

    try {
      const storeSettingsPayload = {
        id: 'default',
        store_name: newSettings.storeName || 'NALI POS',
        tagline: newSettings.storeSubtitle || '',
        logo_url: newSettings.customLogoUrl || null,
        phone: newSettings.businessPhone || '',
        address: newSettings.businessAddressEn || '',
        primary_currency: newSettings.primaryCurrency || 'USD',
        exchange_rate: newSettings.exchangeRate || 1500,
        dark_mode: newSettings.appearance !== 'light',
        settings_json: newSettings,
        updated_at: new Date().toISOString()
      };

      const { error: storeErr } = await supabase
        .from('store_settings')
        .upsert(storeSettingsPayload, { onConflict: 'id' });

      if (storeErr) {
        console.warn('store_settings upsert notice:', storeErr);
      }

      const { error: kvErr } = await supabase
        .from('settings')
        .upsert({
          key: SETTINGS_CLOUD_KEY,
          value: newSettings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (kvErr) {
        console.warn('settings key-value upsert notice:', kvErr);
      }

      lastPushedHashRef.current = brandingFingerprint;
      if (!storeErr || !kvErr) {
        setLastCloudSyncTime(new Date());
      }
      return true;
    } catch (err) {
      console.warn('Failed to push store settings to cloud:', err);
      return false;
    } finally {
      setIsCloudSyncing(false);
    }
  }, []);

  // Fetch settings from Supabase Cloud & subscribe to realtime changes
  useEffect(() => {
    let active = true;

    async function fetchCloudBranding() {
      try {
        let mergedCloudData: Partial<DesignSettings> = {};
        let foundAny = false;

        // 1. Check independent store_settings table in Supabase
        if (isSupabaseConfigured()) {
          try {
            const { data: storeData, error: storeErr } = await supabase
              .from('store_settings')
              .select('*')
              .eq('id', 'default')
              .maybeSingle();

            if (!storeErr && storeData) {
              foundAny = true;
              const rawJson = (storeData.settings_json && typeof storeData.settings_json === 'object') 
                ? storeData.settings_json 
                : {};
              
              mergedCloudData = {
                ...rawJson,
                ...mergedCloudData
              };

              if (storeData.store_name) {
                mergedCloudData.storeName = storeData.store_name;
              }
              // Support tagline and store_subtitle
              const sub = storeData.tagline || storeData.store_subtitle || rawJson.storeSubtitle || rawJson.tagline;
              if (sub !== undefined && sub !== null) {
                mergedCloudData.storeSubtitle = sub;
              }
              // Support logo_url and custom_logo_url
              const logo = storeData.logo_url || storeData.custom_logo_url || rawJson.customLogoUrl || rawJson.logoUrl;
              if (logo !== undefined && logo !== null) {
                mergedCloudData.customLogoUrl = logo;
              }
              if (storeData.exchange_rate) {
                mergedCloudData.exchangeRate = Number(storeData.exchange_rate);
              }
            }
          } catch (e) {
            console.warn('store_settings query notice:', e);
          }

          // 2. Check settings key-value table
          try {
            const { data: kvData, error: kvErr } = await supabase
              .from('settings')
              .select('value')
              .eq('key', SETTINGS_CLOUD_KEY)
              .maybeSingle();

            if (!kvErr && kvData?.value && typeof kvData.value === 'object') {
              foundAny = true;
              mergedCloudData = {
                ...mergedCloudData,
                ...kvData.value
              };
              if (kvData.value.customLogoUrl) {
                mergedCloudData.customLogoUrl = kvData.value.customLogoUrl;
              }
              if (kvData.value.storeSubtitle) {
                mergedCloudData.storeSubtitle = kvData.value.storeSubtitle;
              }
              if (kvData.value.storeName) {
                mergedCloudData.storeName = kvData.value.storeName;
              }
            }
          } catch (e) {
            console.warn('settings kv query notice:', e);
          }
        }

        // 3. Central server fallback (/api/store-branding)
        if (!foundAny) {
          try {
            const srvRes = await fetch('/api/store-branding');
            if (srvRes.ok) {
              const srvJson = await srvRes.json();
              if (srvJson?.success && srvJson.branding) {
                foundAny = true;
                mergedCloudData = {
                  ...mergedCloudData,
                  ...srvJson.branding
                };
              }
            }
          } catch {}
        }

        if (foundAny && active) {
          setSettings(prev => {
            const merged = sanitizeDesignSettings({ ...prev, ...mergedCloudData });
            // Compare if actual visual changes exist to prevent loops
            if (
              prev.storeName === merged.storeName &&
              prev.storeSubtitle === merged.storeSubtitle &&
              prev.customLogoUrl === merged.customLogoUrl &&
              prev.theme === merged.theme &&
              prev.appearance === merged.appearance &&
              prev.exchangeRate === merged.exchangeRate
            ) {
              return prev;
            }
            isIncomingRemoteUpdateRef.current = true;
            lastPushedHashRef.current = JSON.stringify({
              storeName: merged.storeName || '',
              storeSubtitle: merged.storeSubtitle || '',
              customLogoUrl: merged.customLogoUrl || '',
              theme: merged.theme || '',
              appearance: merged.appearance || '',
              exchangeRate: merged.exchangeRate || 1500
            });
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
              if (merged.exchangeRate) {
                localStorage.setItem('nali_exchange_rate', merged.exchangeRate.toString());
              }
            } catch {}
            return merged;
          });
          setLastCloudSyncTime(new Date());
        }
      } catch (e) {
        console.warn('Notice loading store branding from cloud:', e);
      }
    }

    fetchCloudBrandingRef.current = fetchCloudBranding;

    // Initial fetch
    fetchCloudBranding();

    // Setup Supabase Realtime Channel for store branding across all devices
    let channel: any = null;
    try {
      if (isSupabaseConfigured()) {
        channel = supabase
          .channel('store_settings_live_sync')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings' }, () => {
            fetchCloudBranding();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: `key=eq.${SETTINGS_CLOUD_KEY}` }, (payload: any) => {
            if (payload?.new?.key === SETTINGS_CLOUD_KEY) {
              fetchCloudBranding();
            }
          })
          .subscribe();
      }
    } catch {}

    // Multi-tab BroadcastChannel listener
    let broadcastChannel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        broadcastChannel = new BroadcastChannel('nali_store_branding_sync');
        broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'BRANDING_UPDATED' && event.data.settings && active) {
            isIncomingRemoteUpdateRef.current = true;
            setSettings(prev => sanitizeDesignSettings({ ...prev, ...event.data.settings }));
          }
        };
      }
    } catch {}

    // Dynamic Supabase config changes
    const handleConfigReload = () => {
      fetchCloudBranding();
    };
    window.addEventListener('supabase_config_changed', handleConfigReload);
    window.addEventListener('supabase_data_reload', handleConfigReload);

    return () => {
      active = false;
      if (channel) {
        try { supabase.removeChannel(channel); } catch {}
      }
      if (broadcastChannel) {
        try { broadcastChannel.close(); } catch {}
      }
      window.removeEventListener('supabase_config_changed', handleConfigReload);
      window.removeEventListener('supabase_data_reload', handleConfigReload);
    };
  }, []);

  // Apply settings to DOM, CSS variables, dynamic PWA icons, and sound engine
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      if (settings.exchangeRate) {
        localStorage.setItem('nali_exchange_rate', settings.exchangeRate.toString());
      }
    } catch (e) {
      console.warn('Failed to persist design settings:', e);
    }

    // Audio engine sync
    sound.setEnabled(settings.soundEnabled);
    sound.setVolume(settings.soundVolume);

    // Apply dynamic PWA Icon & Apple Touch Icon
    if (typeof document !== 'undefined') {
      const activeIconUrl = settings.customLogoUrl || '/apple-touch-icon.png';
      
      let appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
      if (!appleIcon) {
        appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        document.head.appendChild(appleIcon);
      }
      appleIcon.href = activeIconUrl;

      let favIcon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favIcon) {
        favIcon.href = activeIconUrl;
      }

      // Update page title if storeName changes
      if (settings.storeName) {
        document.title = `${settings.storeName} - POS & Inventory System`;
      }
    }

    // Apply attributes and classes to document root
    const root = document.documentElement;

    // Appearance & Dark/Light mode
    root.classList.remove('appearance-dark', 'appearance-oled', 'appearance-light');
    if (settings.appearance === 'oled') {
      root.classList.add('appearance-oled', 'dark');
      root.setAttribute('data-theme', 'oled');
    } else if (settings.appearance === 'light') {
      root.classList.add('appearance-light');
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    } else {
      root.classList.add('appearance-dark', 'dark');
      root.setAttribute('data-theme', 'dark');
    }

    // Theme Palette classes
    THEME_PALETTES.forEach(p => root.classList.remove(`theme-${p.id}`));
    root.classList.add(`theme-${settings.theme}`);
    root.setAttribute('data-palette', settings.theme);

    // UI Density
    root.classList.remove('density-compact', 'density-standard', 'density-spacious');
    root.classList.add(`density-${settings.density}`);
    root.setAttribute('data-density', settings.density);

    // Corner Radius
    root.classList.remove('radius-sharp', 'radius-rounded', 'radius-smooth');
    root.classList.add(`radius-${settings.radius}`);
    root.setAttribute('data-radius', settings.radius);

    // Font Scale
    root.classList.remove('font-scale-sm', 'font-scale-md', 'font-scale-lg');
    if (settings.fontScale === 'small') root.classList.add('font-scale-sm');
    else if (settings.fontScale === 'large') root.classList.add('font-scale-lg');
    else root.classList.add('font-scale-md');

    // Number Font
    root.classList.remove('font-numbers-mono', 'font-numbers-sans');
    if (settings.numberFont === 'tabular-mono') {
      root.classList.add('font-numbers-mono');
    } else {
      root.classList.add('font-numbers-sans');
    }

    // Toggles
    if (!settings.glassmorphism) root.classList.add('no-glass');
    else root.classList.remove('no-glass');

    if (!settings.glowEffects) root.classList.add('no-glow');
    else root.classList.remove('no-glow');

    if (settings.highContrast) root.classList.add('high-contrast-mode');
    else root.classList.remove('high-contrast-mode');

    if (!settings.enableAnimations) root.classList.add('reduce-motion-mode');
    else root.classList.remove('reduce-motion-mode');

    // CSS Custom properties for dynamic styling
    const activeTheme = THEME_PALETTES.find(p => p.id === settings.theme) || THEME_PALETTES[0];
    root.style.setProperty('--primary-color', activeTheme.primaryColor);
    root.style.setProperty('--secondary-color', activeTheme.secondaryColor);

    if (settings.radius === 'sharp') {
      root.style.setProperty('--custom-radius', '6px');
      root.style.setProperty('--custom-radius-lg', '8px');
    } else if (settings.radius === 'smooth') {
      root.style.setProperty('--custom-radius', '24px');
      root.style.setProperty('--custom-radius-lg', '32px');
    } else {
      root.style.setProperty('--custom-radius', '16px');
      root.style.setProperty('--custom-radius-lg', '20px');
    }

    // Push to cloud when settings are modified after initial mount (debounced)
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else if (isIncomingRemoteUpdateRef.current) {
      isIncomingRemoteUpdateRef.current = false;
    } else {
      if (pushDebounceRef.current) clearTimeout(pushDebounceRef.current);
      pushDebounceRef.current = setTimeout(() => {
        pushSettingsToCloud(settings);
      }, 600);
    }
  }, [settings, pushSettingsToCloud]);

  const syncWithCloud = useCallback(async (forcePush: boolean = false): Promise<boolean> => {
    if (forcePush) {
      if (pushDebounceRef.current) clearTimeout(pushDebounceRef.current);
      return await pushSettingsToCloud(settings);
    } else {
      setIsCloudSyncing(true);
      try {
        await fetchCloudBrandingRef.current();
        return true;
      } finally {
        setIsCloudSyncing(false);
      }
    }
  }, [settings, pushSettingsToCloud]);

  const updateSettings = useCallback((partial: Partial<DesignSettings>) => {
    setSettings(prev => {
      const cleanPartial: any = {};
      for (const [k, v] of Object.entries(partial)) {
        if (v !== undefined && v !== null) {
          cleanPartial[k] = v;
        }
      }
      return sanitizeDesignSettings({ ...prev, ...cleanPartial });
    });
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    const preset = CURATED_PRESETS.find(p => p.id === presetId);
    if (preset) {
      sound.playSuccess();
      setSettings(prev => sanitizeDesignSettings({ ...prev, ...preset.settings }));
    }
  }, []);

  const resetToDefaults = useCallback(() => {
    sound.playAlert();
    setSettings(DEFAULT_DESIGN_SETTINGS);
  }, []);

  const exportProfile = useCallback(() => {
    return JSON.stringify(settings, null, 2);
  }, [settings]);

  const importProfile = useCallback((jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed !== 'object' || parsed === null) {
        return { success: false, error: 'Invalid profile format' };
      }
      setSettings(prev => sanitizeDesignSettings({ ...prev, ...parsed }));
      sound.playSuccess();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to parse JSON profile' };
    }
  }, []);

  const activeThemeInfo = useMemo(() => {
    return THEME_PALETTES.find(p => p.id === settings.theme) || THEME_PALETTES[0];
  }, [settings.theme]);

  const isOled = settings.appearance === 'oled';
  const isLight = settings.appearance === 'light';
  const isCompact = settings.density === 'compact';

  // Identify if current settings match any preset
  const matchedPreset = useMemo(() => {
    return CURATED_PRESETS.find(p => {
      const s = p.settings;
      return Object.keys(s).every(k => (settings as any)[k] === (s as any)[k]);
    });
  }, [settings]);

  const currentPresetId = matchedPreset ? matchedPreset.id : null;

  const contextValue = useMemo(() => ({
    settings,
    updateSettings,
    applyPreset,
    resetToDefaults,
    exportProfile,
    importProfile,
    syncWithCloud,
    isCloudSyncing,
    lastCloudSyncTime,
    activeThemeInfo,
    isOled,
    isLight,
    isCompact,
    currentPresetId
  }), [
    settings,
    updateSettings,
    applyPreset,
    resetToDefaults,
    exportProfile,
    importProfile,
    syncWithCloud,
    isCloudSyncing,
    lastCloudSyncTime,
    activeThemeInfo,
    isOled,
    isLight,
    isCompact,
    currentPresetId
  ]);

  return (
    <DesignContext.Provider value={contextValue}>
      {children}
    </DesignContext.Provider>
  );
};

export function useDesignSystem(): DesignContextType {
  const context = useContext(DesignContext);
  if (!context) {
    throw new Error('useDesignSystem must be used within a DesignProvider');
  }
  return context;
}

