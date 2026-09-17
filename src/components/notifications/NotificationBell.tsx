import React from 'react';
import { 
  Bell, 
  Volume2, 
  VolumeX, 
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '../../context/NotificationContext';
import { sound } from '../../lib/sound';
import { cn } from '../../lib/utils';

interface NotificationBellProps {
  className?: string;
  showSoundToggle?: boolean;
}

export default function NotificationBell({ className, showSoundToggle = false }: NotificationBellProps) {
  const { 
    unreadCount, 
    criticalCount, 
    toggleCenter, 
    preferences, 
    updatePreferences 
  } = useNotifications();

  const handleToggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSound = !preferences.soundEnabled;
    updatePreferences({ soundEnabled: nextSound });
    if (nextSound) {
      sound.playNotificationPing();
    } else {
      sound.playClick();
    }
  };

  return (
    <div className={cn("relative flex items-center gap-1", className)}>
      {/* Sound quick toggle (if enabled) */}
      {showSoundToggle && (
        <button
          type="button"
          onClick={handleToggleSound}
          title={preferences.soundEnabled ? 'Mute notification chimes' : 'Unmute notification chimes'}
          className={cn(
            "p-1.5 rounded-xl border text-xs transition-all active:scale-95",
            preferences.soundEnabled
              ? "text-indigo-400 bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20"
              : "text-slate-500 bg-white/[0.02] border-white/[0.06] hover:text-slate-300"
          )}
        >
          {preferences.soundEnabled ? (
            <Volume2 className="w-3.5 h-3.5" />
          ) : (
            <VolumeX className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      {/* Main Bell Button */}
      <button
        id="header-notification-bell-btn"
        type="button"
        onClick={() => {
          sound.playClick();
          toggleCenter();
        }}
        aria-label="Open notifications center"
        className={cn(
          "relative p-2 rounded-xl border transition-all duration-200 flex items-center justify-center active:scale-95 group",
          criticalCount > 0
            ? "bg-rose-500/15 border-rose-500/40 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.25)] hover:bg-rose-500/25"
            : unreadCount > 0
            ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/25 shadow-[0_0_12px_rgba(99,102,241,0.15)]"
            : "bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08]"
        )}
      >
        <Bell className={cn(
          "w-4 h-4 transition-transform group-hover:rotate-12",
          criticalCount > 0 && "animate-bounce"
        )} />

        {/* Real-time Pulse Glow Ring for Critical Alerts */}
        {criticalCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border-2 border-[#0B0F19]"></span>
          </span>
        )}

        {/* Counter Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className={cn(
                "absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center text-white border-2 border-[#0B0F19] shadow-md font-mono",
                criticalCount > 0 ? "bg-rose-600" : "bg-indigo-600"
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
