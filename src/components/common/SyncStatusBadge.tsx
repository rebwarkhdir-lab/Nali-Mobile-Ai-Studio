import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  CloudOff,
  Radio,
  Cloud,
  Layers,
  Sparkles
} from 'lucide-react';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { isSupabaseConfigured } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { sound } from '../../lib/sound';

interface SyncStatusBadgeProps {
  onClick?: () => void;
  className?: string;
  variant?: 'compact' | 'full' | 'pos-header';
}

export default function SyncStatusBadge({ 
  onClick, 
  className,
  variant = 'compact'
}: SyncStatusBadgeProps) {
  const { 
    isOnline, 
    isSimulatingOffline, 
    isSyncing, 
    pendingCount, 
    lastError,
    triggerSync 
  } = useOfflineSync();

  const [hasCloudConfig, setHasCloudConfig] = useState(isSupabaseConfigured());

  useEffect(() => {
    const handleConfigChange = () => {
      setHasCloudConfig(isSupabaseConfigured());
    };
    window.addEventListener('supabase_config_changed', handleConfigChange);
    return () => window.removeEventListener('supabase_config_changed', handleConfigChange);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    if (onClick) onClick();
  };

  // 1. Supabase Not Configured / Placeholder state
  if (!hasCloudConfig) {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25 transition-all shadow-sm active:scale-95 cursor-pointer animate-pulse",
          className
        )}
        title="Supabase is not connected yet! Click to link your iPad and mobile phone so they share real-time data."
      >
        <Cloud className="w-3.5 h-3.5 text-amber-400" />
        <span>Link iPad & Mobile</span>
      </button>
    );
  }

  // 2. Syncing state
  if (isSyncing) {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-all shadow-sm active:scale-95 cursor-pointer",
          className
        )}
        title="Synchronizing transactions with cloud database..."
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
        <span>{pendingCount > 0 ? `Syncing (${pendingCount})...` : 'Syncing...'}</span>
      </button>
    );
  }

  // 3. Offline / Simulated Offline state
  if (!isOnline) {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer animate-in fade-in",
          isSimulatingOffline
            ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 hover:bg-amber-500/25"
            : "bg-rose-500/15 text-rose-300 border border-rose-500/40 hover:bg-rose-500/25",
          className
        )}
        title="Offline Mode Active: All POS sales and inventory changes are cached locally in IndexedDB and will auto-sync when online."
      >
        {isSimulatingOffline ? (
          <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-rose-400" />
        )}
        <span>{isSimulatingOffline ? 'Simulated Offline' : 'Offline Mode'}</span>
        {pendingCount > 0 && (
          <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-200 text-[10px] font-extrabold border border-amber-400/30">
            {pendingCount}
          </span>
        )}
      </button>
    );
  }

  // 4. Error state with pending retry
  if (lastError && pendingCount > 0) {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition-all shadow-sm active:scale-95 cursor-pointer",
          className
        )}
        title={`Sync Warning: ${lastError}. Click to open Sync Manager.`}
      >
        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
        <span>Sync Issue ({pendingCount})</span>
      </button>
    );
  }

  // 5. Pending items awaiting auto-sync
  if (pendingCount > 0) {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all shadow-sm active:scale-95 cursor-pointer",
          className
        )}
        title={`${pendingCount} offline transaction(s) pending sync`}
      >
        <CloudOff className="w-3.5 h-3.5 text-amber-400" />
        <span>{pendingCount} Pending Sync</span>
      </button>
    );
  }

  // 6. Default: Online & Fully Synced with Supabase
  return (
    <button
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all shadow-sm active:scale-95 cursor-pointer",
        className
      )}
      title="Connected to Supabase Cloud & Multi-Device Realtime Sync Active"
    >
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <span>Multi-Device Live</span>
    </button>
  );
}
