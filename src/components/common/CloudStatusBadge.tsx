import React, { useState } from 'react';
import { Cloud, RefreshCw, Smartphone, Tablet, Wifi, WifiOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { isSupabaseConfigured } from '../../lib/supabase';
import { sound } from '../../lib/sound';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface CloudStatusBadgeProps {
  onRefresh?: () => void | Promise<void>;
  tableName?: string;
  className?: string;
  isRefreshing?: boolean;
}

export const CloudStatusBadge: React.FC<CloudStatusBadgeProps> = ({
  onRefresh,
  tableName,
  className,
  isRefreshing = false
}) => {
  const { t } = useTranslation();
  const { isOnline, pendingCount } = useOfflineSync();
  const configured = isSupabaseConfigured();
  const [internalRefreshing, setInternalRefreshing] = useState(false);

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    sound.playClick();
    if (onRefresh) {
      setInternalRefreshing(true);
      try {
        await onRefresh();
        sound.playSuccess();
      } catch (err) {
        console.warn('Refresh error:', err);
      } finally {
        setInternalRefreshing(false);
      }
    }
  };

  const refreshing = isRefreshing || internalRefreshing;

  return (
    <div className={cn("inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-800 shadow-sm", className)}>
      {/* Live Badge Pill */}
      <div 
        className={cn(
          "flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all select-none",
          !configured
            ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
            : !isOnline
            ? "bg-slate-800 text-slate-400 border border-slate-700"
            : pendingCount > 0
            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
        )}
        title={configured && isOnline ? "Live real-time sync with Supabase across all your devices (iPad & Mobile)" : "Local storage cache"}
      >
        {/* Pulsing indicator */}
        <span className="relative flex h-2 w-2">
          {configured && isOnline && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          )}
          <span className={cn(
            "relative inline-flex rounded-full h-2 w-2",
            !configured ? "bg-amber-400" : !isOnline ? "bg-slate-500" : pendingCount > 0 ? "bg-amber-400" : "bg-emerald-500"
          )} />
        </span>

        {/* Devices icon & text */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center text-slate-400">
            <Tablet className="w-3 h-3" />
            <span className="text-[9px] text-slate-500 font-mono">↔</span>
            <Smartphone className="w-3 h-3" />
          </div>
          <span className="font-bold text-[11px] tracking-wide min-w-[105px] text-center">
            {!configured 
              ? 'Local Mode' 
              : !isOnline 
              ? 'Offline Cache' 
              : pendingCount > 0 
              ? `${pendingCount} Syncing...` 
              : 'Multi-Device Live'}
          </span>
        </div>

        {tableName && configured && isOnline && (
          <span className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] font-mono text-emerald-400/80 bg-emerald-950/40 rounded border border-emerald-500/20">
            {tableName}
          </span>
        )}
      </div>

      {/* Quick sync button */}
      {onRefresh && (
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Sync & Pull Latest Cloud Data"
          className={cn(
            "p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer flex items-center justify-center",
            refreshing && "cursor-not-allowed opacity-75"
          )}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-indigo-400")} />
        </button>
      )}
    </div>
  );
};

export default CloudStatusBadge;
