import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Settings, 
  Volume2, 
  VolumeX, 
  Bell, 
  Layers, 
  ShieldCheck, 
  Play, 
  RotateCcw,
  CheckCircle2,
  Sliders,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '../../context/NotificationContext';
import { NotificationTargetRole, NotificationPriority } from '../../types/notification';
import { sound } from '../../lib/sound';
import { cn } from '../../lib/utils';

export default function NotificationSettingsModal() {
  const { t } = useTranslation();
  const { 
    isSettingsOpen, 
    closeSettings, 
    preferences, 
    updatePreferences, 
    resetToDefaults 
  } = useNotifications();

  if (!isSettingsOpen) return null;

  const roles: Array<{ id: NotificationTargetRole; label: string; desc: string }> = [
    { id: 'All', label: t('settings.notifications.allRoles', 'All Staff Broadcast (Global)'), desc: t('settings.notifications.allStaffDesc', 'Show all notifications regardless of role routing') },
    { id: 'Administrator', label: t('settings.notifications.adminRole', 'Administrator / Super Admin'), desc: t('settings.notifications.adminDesc', 'Financial discrepancies, price overrides, security events, all alerts') },
    { id: 'Cashier', label: t('settings.notifications.cashierRole', 'Cashier / Sales'), desc: t('settings.notifications.cashierDesc', 'Debt due dates, credit limit warnings, ready repair tickets') },
    { id: 'Technician', label: t('settings.notifications.techRole', 'Technician / Lab'), desc: t('settings.notifications.techDesc', 'Assigned repair jobs and approved spare parts') },
    { id: 'Inventory', label: t('settings.notifications.inventoryRole', 'Inventory Clerk / Stock'), desc: t('settings.notifications.inventoryDesc', 'Low stock alerts, 0 stock depletion, spare parts requests') },
  ];

  const handleTestChime = () => {
    sound.setVolume(preferences.soundVolume);
    sound.playNotificationPing();
  };

  const handleTestCritical = () => {
    sound.setVolume(preferences.soundVolume);
    sound.playCriticalAlarm();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            sound.playClick();
            closeSettings();
          }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Settings Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-[#0F172A] border border-[#334155] rounded-3xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] z-10 overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {t('settings.notifications.title', 'Notification & Audio Preferences')}
                </h3>
                <p className="text-xs text-slate-400">
                  {t('settings.notifications.subtitle', 'Configure audio chimes, toast alerts & role-based routing')}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                closeSettings();
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto py-4 space-y-5">
            {/* Audio Synthesis & Chime Section */}
            <div className="p-4 rounded-2xl bg-[#111827] border border-[#334155]/60 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {preferences.soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-500" />
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-white">{t('settings.notifications.audioAlertSynth', 'Audio Alert Synthesizer')}</h4>
                    <p className="text-[11px] text-slate-400">{t('settings.notifications.audioAlertSynthDesc', 'Hardware Web Audio synthesizer for incoming notifications')}</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.soundEnabled}
                    onChange={(e) => updatePreferences({ soundEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {preferences.soundEnabled && (
                <div className="space-y-3 pt-2 border-t border-white/[0.04]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{t('settings.notifications.chimeVolume', 'Chime Volume')}</span>
                    <span className="font-bold text-white font-mono">{preferences.soundVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={preferences.soundVolume}
                    onChange={(e) => updatePreferences({ soundVolume: Number(e.target.value) })}
                    className="w-full accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer h-1.5"
                  />

                  {/* Sound Test Triggers */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleTestChime}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>{t('settings.notifications.testStandardChime', 'Test Standard Chime')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestCritical}
                      className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>{t('settings.notifications.testCriticalChime', 'Test Critical Alarm')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Real-Time Toast Popups Section */}
            <div className="p-4 rounded-2xl bg-[#111827] border border-[#334155]/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">{t('settings.notifications.toastTitle', 'Floating Real-Time Toasts')}</h4>
                  <p className="text-[11px] text-slate-400">{t('settings.notifications.toastDesc', 'Display floating actionable cards when critical events fire')}</p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.toastNotifications}
                    onChange={(e) => updatePreferences({ toastNotifications: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {preferences.toastNotifications && (
                <div className="space-y-3 pt-2 border-t border-white/[0.04] text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{t('settings.notifications.autoDismiss', 'Auto-dismiss timeout')}</span>
                    <span className="font-bold text-white font-mono">{preferences.toastAutoDismissSeconds}s</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="12"
                    value={preferences.toastAutoDismissSeconds}
                    onChange={(e) => updatePreferences({ toastAutoDismissSeconds: Number(e.target.value) })}
                    className="w-full accent-indigo-500 bg-slate-800 rounded-lg cursor-pointer h-1.5"
                  />
                </div>
              )}
            </div>

            {/* Role-Based Routing (RBAC) Preview Simulator */}
            <div className="p-4 rounded-2xl bg-[#111827] border border-[#334155]/60 space-y-3">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{t('settings.notifications.rbacTitle', 'RBAC Role Routing View')}</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  {t('settings.notifications.rbacDesc', 'Switch view role to test how notifications are filtered for different staff roles')}
                </p>
              </div>

              <div className="space-y-1.5">
                {roles.map((role) => (
                  <label
                    key={role.id}
                    className={cn(
                      "flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all",
                      preferences.activeRoleFilter === role.id
                        ? "bg-indigo-950/40 border-indigo-500/80 text-white"
                        : "bg-black/20 border-white/[0.04] text-slate-400 hover:border-white/10 hover:text-slate-200"
                    )}
                  >
                    <input
                      type="radio"
                      name="roleFilter"
                      checked={preferences.activeRoleFilter === role.id}
                      onChange={() => updatePreferences({ activeRoleFilter: role.id })}
                      className="mt-1 accent-indigo-500"
                    />
                    <div>
                      <div className="text-xs font-bold">{role.label}</div>
                      <div className="text-[11px] text-slate-400 leading-snug">{role.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Category Subscriptions Toggles */}
            <div className="p-4 rounded-2xl bg-[#111827] border border-[#334155]/60 space-y-3">
              <h4 className="text-xs font-bold text-white">{t('settings.notifications.categoryTitle', 'Category Subscriptions')}</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'inventory', label: t('settings.notifications.catInventory', 'Inventory & Stock') },
                  { key: 'debt', label: t('settings.notifications.catDebt', 'Debts & Installments') },
                  { key: 'supplier', label: t('settings.notifications.catSupplier', 'Suppliers & Vendors') },
                  { key: 'repair', label: t('settings.notifications.catRepair', 'Repairs & Maintenance') },
                  { key: 'security', label: t('settings.notifications.catSecurity', 'Security & Audit') },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 p-2 rounded-xl bg-black/20 border border-white/[0.04] text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.categories[key as keyof typeof preferences.categories]}
                      onChange={(e) => updatePreferences({
                        categories: {
                          ...preferences.categories,
                          [key]: e.target.checked
                        }
                      })}
                      className="accent-indigo-500 rounded"
                    />
                    <span className="truncate">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
            <button
              type="button"
              onClick={resetToDefaults}
              className="text-xs font-semibold text-slate-400 hover:text-rose-400 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t('settings.notifications.resetDefaults', 'Reset Defaults')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                closeSettings();
              }}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              {t('settings.notifications.saveChanges', 'Save Preferences')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
