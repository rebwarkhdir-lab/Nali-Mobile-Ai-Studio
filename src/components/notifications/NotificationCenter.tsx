import React, { useState } from 'react';
import { 
  X, 
  Bell, 
  CheckCheck, 
  Trash2, 
  Settings, 
  Sparkles, 
  Search, 
  Filter, 
  AlertTriangle, 
  Package, 
  Coins, 
  Building2,
  Wrench, 
  ShieldAlert, 
  RotateCcw, 
  RefreshCw,
  CheckCircle2,
  Volume2,
  VolumeX,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '../../context/NotificationContext';
import { NotificationCategory, NotificationPriority } from '../../types/notification';
import NotificationCard from './NotificationCard';
import { SearchInput } from '../common/SearchInput';
import { sound } from '../../lib/sound';
import { cn } from '../../lib/utils';

export default function NotificationCenter() {
  const {
    isCenterOpen,
    closeCenter,
    filteredNotifications,
    notifications,
    unreadCount,
    criticalCount,
    filterState,
    setCategoryFilter,
    setPriorityFilter,
    setStatusFilter,
    setSearchQuery,
    resetFilters,
    markAllAsRead,
    clearRead,
    openSettings,
    openSimulator,
    preferences,
    updatePreferences,
    triggerDatabaseAudit,
    purgeUnverifiedNotifications,
  } = useNotifications();

  const [isAuditing, setIsAuditing] = useState(false);

  const handleAudit = () => {
    setIsAuditing(true);
    sound.playClick();
    purgeUnverifiedNotifications();
    triggerDatabaseAudit();
    setTimeout(() => {
      setIsAuditing(false);
    }, 800);
  };

  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  // Category counts
  const countByCategory = {
    all: safeNotifications?.length || 0,
    inventory: (safeNotifications || []).filter(n => n.category === 'inventory').length,
    debt: (safeNotifications || []).filter(n => n.category === 'debt').length,
    supplier: (safeNotifications || []).filter(n => n.category === 'supplier').length,
    repair: (safeNotifications || []).filter(n => n.category === 'repair').length,
    security: (safeNotifications || []).filter(n => n.category === 'security').length,
  };

  const unreadByCategory = {
    all: unreadCount,
    inventory: safeNotifications.filter(n => n.category === 'inventory' && !n.isRead).length,
    debt: safeNotifications.filter(n => n.category === 'debt' && !n.isRead).length,
    supplier: safeNotifications.filter(n => n.category === 'supplier' && !n.isRead).length,
    repair: safeNotifications.filter(n => n.category === 'repair' && !n.isRead).length,
    security: safeNotifications.filter(n => n.category === 'security' && !n.isRead).length,
  };

  const categories: Array<{ id: NotificationCategory; label: string; icon: React.ElementType }> = [
    { id: 'all', label: 'All Alerts', icon: Bell },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'debt', label: 'Debts & Plans', icon: Coins },
    { id: 'supplier', label: 'Suppliers', icon: Building2 },
    { id: 'repair', label: 'Repairs', icon: Wrench },
    { id: 'security', label: 'Security & Audit', icon: ShieldAlert },
  ];

  if (!isCenterOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            sound.playClick();
            closeCenter();
          }}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Slide-over Notification Center Drawer */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="relative w-full max-w-lg bg-[#0B0F19] border-l border-white/[0.08] shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col h-full z-10"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-[#0E1424] flex flex-col gap-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center border shadow-inner shrink-0",
                  criticalCount > 0 
                    ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                    : "bg-indigo-500/15 border-indigo-500/30 text-indigo-400"
                )}>
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Notification Center</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white font-mono">
                        {unreadCount} new
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real-time stock, debts, repairs & system telemetry
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-1.5 text-slate-400">
                {/* Database Verification Audit Button */}
                <button
                  type="button"
                  onClick={handleAudit}
                  title="Verify alerts against live database records & prune ghost items"
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5 text-emerald-400", isAuditing && "animate-spin")} />
                  <span className="hidden sm:inline">{isAuditing ? 'Syncing...' : 'Verify DB'}</span>
                </button>

                {/* Settings Button */}
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    openSettings();
                  }}
                  title="Notification Settings"
                  className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-white transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>

                {/* Close Drawer Button */}
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    closeCenter();
                  }}
                  className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-white transition-colors ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search Input Bar */}
            <div>
              <SearchInput
                value={filterState.searchQuery}
                onChangeValue={(val) => setSearchQuery(val)}
                placeholder="Search alerts, customers, IMEI, SKU, debts..."
                size="sm"
              />
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isActive = filterState.category === cat.id;
                const unread = unreadByCategory[cat.id] || 0;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setCategoryFilter(cat.id);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all border shrink-0 active:scale-95",
                      isActive
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20"
                        : "bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                    {unread > 0 && (
                      <span className={cn(
                        "px-1.5 py-0.2 text-[10px] font-black rounded-full font-mono",
                        isActive ? "bg-white/20 text-white" : "bg-indigo-500/20 text-indigo-300"
                      )}>
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Sub-Controls: Priority & Mark all read */}
          <div className="px-4 sm:px-5 py-2.5 bg-[#080C16] border-b border-white/[0.04] flex items-center justify-between gap-2 text-xs">
            {/* Status and Priority Filter chips */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter(filterState.status === 'unread' ? 'all' : 'unread')}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold border transition-colors",
                  filterState.status === 'unread'
                    ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                    : "bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-white"
                )}
              >
                Unread Only
              </button>

              <select
                value={filterState.priority}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                className="bg-[#070913] border border-white/[0.08] text-slate-300 rounded-lg px-2 py-1 text-xs focus:outline-none"
              >
                <option value="all">All Priorities</option>
                <option value="critical">🚨 Critical</option>
                <option value="high">⚠️ High</option>
                <option value="medium">ℹ️ Normal</option>
                <option value="low">📋 Low</option>
              </select>
            </div>

            {/* Batch actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="text-slate-400 hover:text-white flex items-center gap-1 font-semibold disabled:opacity-40 disabled:hover:text-slate-400 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Mark all read</span>
              </button>

              <button
                type="button"
                onClick={clearRead}
                title="Clear all read alerts"
                className="text-slate-400 hover:text-rose-400 flex items-center gap-1 font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear read</span>
              </button>
            </div>
          </div>

          {/* Notifications Scrollable List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {(filteredNotifications?.length || 0) === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-400 shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-white">Database Verified & Healthy</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1.5 leading-relaxed">
                  {filterState.searchQuery || filterState.category !== 'all' || filterState.priority !== 'all' || filterState.status !== 'all'
                    ? 'No alerts match your current filter criteria. Try resetting filters.'
                    : 'All inventory stock levels are healthy, and there are no overdue customer debts or pending installments in your database.'}
                </p>

                {(filterState.searchQuery || filterState.category !== 'all' || filterState.priority !== 'all' || filterState.status !== 'all') ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-4 px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Filters</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      type="button"
                      onClick={handleAudit}
                      className="px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-bold text-emerald-300 hover:text-white transition-all flex items-center gap-2 shadow-sm"
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5", isAuditing && "animate-spin")} />
                      <span>{isAuditing ? 'Auditing Database...' : 'Re-verify Database'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <NotificationCard
                  key={notif.id}
                  notification={notif}
                  onCloseCenter={closeCenter}
                />
              ))
            )}
          </div>

          {/* Footer Info & Sound Status Bar */}
          <div className="p-3 bg-[#080C16] border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400 px-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-time POS alert engine active</span>
            </div>

            <button
              type="button"
              onClick={() => {
                const next = !preferences.soundEnabled;
                updatePreferences({ soundEnabled: next });
                if (next) sound.playNotificationPing();
              }}
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
            >
              {preferences.soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Chimes On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                  <span>Muted</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
