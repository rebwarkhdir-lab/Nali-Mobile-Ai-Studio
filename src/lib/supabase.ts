import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Keys for local persistence
const STORAGE_URL_KEY = 'nali_supabase_url';
const STORAGE_ANON_KEY = 'nali_supabase_anon_key';

// Check if any query parameters exist in the current URL (e.g., from QR code or share link)
function getUrlParamConfig(): { url: string; key: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const url = params.get('supabase_url') || params.get('sb_url');
    const key = params.get('supabase_key') || params.get('sb_key');
    if (url && key) {
      // Clean URL params so they don't linger in browser history
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('supabase_url');
      cleanUrl.searchParams.delete('sb_url');
      cleanUrl.searchParams.delete('supabase_key');
      cleanUrl.searchParams.delete('sb_key');
      window.history.replaceState({}, document.title, cleanUrl.toString());
      return { url: url.trim(), key: key.trim() };
    }
  } catch {}
  return null;
}

// Determine initial config
function resolveInitialConfig() {
  const urlParamConfig = getUrlParamConfig();
  if (urlParamConfig) {
    try {
      localStorage.setItem(STORAGE_URL_KEY, urlParamConfig.url);
      localStorage.setItem(STORAGE_ANON_KEY, urlParamConfig.key);
      // Also persist to server in background
      fetch('/api/supabase-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabaseUrl: urlParamConfig.url, supabaseAnonKey: urlParamConfig.key })
      }).catch(() => {});
    } catch {}
    return urlParamConfig;
  }

  // Check window.__SUPABASE_SERVER_CONFIG__ bootstrapped by index.html
  if (typeof window !== 'undefined') {
    const srv = (window as any).__SUPABASE_SERVER_CONFIG__;
    if (srv && srv.supabaseUrl && srv.supabaseAnonKey && srv.isConfigured) {
      return {
        url: srv.supabaseUrl.trim(),
        key: srv.supabaseAnonKey.trim()
      };
    }
  }

  let localUrl = '';
  let localKey = '';
  if (typeof window !== 'undefined') {
    try {
      localUrl = localStorage.getItem(STORAGE_URL_KEY) || '';
      localKey = localStorage.getItem(STORAGE_ANON_KEY) || '';
    } catch {}
  }

  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const activeUrl = (localUrl && localUrl.trim().length > 0) ? localUrl.trim() : envUrl.trim();
  const activeKey = (localKey && localKey.trim().length > 0) ? localKey.trim() : envKey.trim();

  return {
    url: activeUrl || 'https://placeholder.supabase.co',
    key: activeKey || 'placeholder'
  };
}

let currentConfig = resolveInitialConfig();
let activeClient: SupabaseClient = createClient(currentConfig.url, currentConfig.key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

export function isSupabaseConfigured(): boolean {
  return Boolean(
    currentConfig?.url &&
    currentConfig.url.includes('.supabase.co') &&
    !currentConfig.url.includes('placeholder') &&
    currentConfig?.key &&
    currentConfig.key !== 'placeholder' &&
    (currentConfig.key?.length || 0) > 20
  );
}

export function getSupabaseConfig() {
  return {
    supabaseUrl: currentConfig.url,
    supabaseAnonKey: currentConfig.key,
    isConfigured: isSupabaseConfigured()
  };
}

export function setSupabaseConfig(url: string, key: string, persistToServer: boolean = true) {
  const cleanedUrl = url.trim().replace(/\/+$/, '');
  const cleanedKey = key.trim();

  currentConfig = {
    url: cleanedUrl,
    key: cleanedKey
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_URL_KEY, cleanedUrl);
      localStorage.setItem(STORAGE_ANON_KEY, cleanedKey);
    } catch {}
  }

  // Create new active client
  activeClient = createClient(cleanedUrl, cleanedKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  });

  if (persistToServer && typeof window !== 'undefined') {
    fetch('/api/supabase-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabaseUrl: cleanedUrl, supabaseAnonKey: cleanedKey })
    }).catch(err => console.warn('Failed to persist Supabase config to server:', err));
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('supabase_config_changed', {
      detail: { url: cleanedUrl, isConfigured: isSupabaseConfigured() }
    }));
    window.dispatchEvent(new CustomEvent('supabase_data_reload'));
  }

  return activeClient;
}

// Background auto-fetch from server (syncs config across iPad and Mobile automatically)
export async function syncConfigFromServer(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch('/api/supabase-config');
    if (!res.ok) return false;
    const data = await res.json();
    if (data && data.isConfigured && data.supabaseUrl && data.supabaseAnonKey) {
      if (data.supabaseUrl !== currentConfig.url || data.supabaseAnonKey !== currentConfig.key) {
        setSupabaseConfig(data.supabaseUrl, data.supabaseAnonKey, false);
        return true;
      }
    }
  } catch (e) {
    // Non-blocking
  }
  return false;
}

// Test connectivity to Supabase directly
export async function testSupabaseConnection(
  urlToCheck?: string,
  keyToCheck?: string
): Promise<{ success: boolean; message: string; tablesFound?: string[] }> {
  const targetUrl = (urlToCheck || currentConfig.url).trim().replace(/\/+$/, '');
  const targetKey = (keyToCheck || currentConfig.key).trim();

  if (!targetUrl || targetUrl.includes('placeholder') || !targetKey || targetKey === 'placeholder') {
    return {
      success: false,
      message: 'Please provide a valid Supabase Project URL and Anon Key.'
    };
  }

  try {
    const client = createClient(targetUrl, targetKey);
    
    // Test 1: Check nali_mobiles table
    const { data: mobData, error: mobErr } = await client
      .from('nali_mobiles')
      .select('id')
      .limit(1);

    // Test 2: Check nali_accessories table
    const { data: accData, error: accErr } = await client
      .from('nali_accessories')
      .select('id')
      .limit(1);

    const tablesFound: string[] = [];
    if (!mobErr) tablesFound.push('nali_mobiles');
    if (!accErr) tablesFound.push('nali_accessories');

    if ((tablesFound?.length || 0) > 0) {
      return {
        success: true,
        message: `Successfully connected to Supabase! Verified active tables: ${tablesFound.join(', ')}.`,
        tablesFound
      };
    }

    if (mobErr?.code === 'PGRST205' || mobErr?.code === '42P01') {
      return {
        success: true,
        message: 'Connected to Supabase project! (Tables not detected yet, please verify SQL was executed).',
        tablesFound: []
      };
    }

    return {
      success: true,
      message: 'Connected to Supabase successfully.',
      tablesFound: []
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Connection test failed. Please verify your Project URL and Anon Key.'
    };
  }
}

// Trigger initial background server sync on startup
if (typeof window !== 'undefined') {
  setTimeout(() => {
    syncConfigFromServer();
  }, 100);
}

// Export dynamic proxy to preserve full backwards compatibility
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (activeClient as any)[prop];
  }
});

