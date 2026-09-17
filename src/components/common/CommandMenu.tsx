import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Smartphone, Headphones, ShoppingCart, ShieldAlert, 
  Plus, ArrowRight, X, Sparkles, Hash, Tag, Coins, Calendar, Camera, Settings, Building2, BarChart3, Palette, Sun, Moon, Zap, Layers, Bell, HardDrive, Trash2
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { Mobile } from '../../types/mobile';
import { Accessory } from '../../types/accessory';
import { formatCurrency } from '../../lib/utils';
import { sound } from '../../lib/sound';

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  mobiles?: Mobile[];
  accessories?: Accessory[];
  onSelectMobile?: (mobile: Mobile) => void;
  onSelectAccessory?: (acc: Accessory) => void;
  onOpenSettings?: () => void;
  onOpenDesignSettings?: () => void;
}

export default function CommandMenu({
  isOpen,
  onClose,
  mobiles = [],
  accessories = [],
  onSelectMobile,
  onSelectAccessory,
  onOpenSettings,
  onOpenDesignSettings
}: CommandMenuProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const { openCenter, openSettings: openNotificationSettings, openSimulator } = useNotifications();

  // Read caches if props are empty
  const allMobiles: Mobile[] = (mobiles?.length || 0) > 0 
    ? mobiles 
    : (() => {
        try {
          return JSON.parse(localStorage.getItem('nali_mobiles_cache') || '[]');
        } catch {
          return [];
        }
      })();

  const allAccessories: Accessory[] = (accessories?.length || 0) > 0 
    ? accessories 
    : (() => {
        try {
          return JSON.parse(localStorage.getItem('nali_accessories_cache') || '[]');
        } catch {
          return [];
        }
      })();

  // Filter items
  const q = query.trim().toLowerCase();

  const matchedActions = [
    { id: 'nav-notifications', title: t('notifications.title', 'Notification & Alert Center'), subtitle: t('settings.notifications.subtitle', 'View real-time stock alerts, debts, repairs and security notices'), icon: Bell, isNotificationCenter: true },
    { id: 'nav-notif-simulator', title: t('notifications.simulatorTitle', 'Real-Time Alert Simulator'), subtitle: t('notifications.simulatorSubtitle', 'Test automated business alerts, audio chimes and toast popups'), icon: Sparkles, isNotificationSimulator: true },
    { id: 'nav-notif-settings', title: t('settings.notifications.title', 'Notification & Audio Preferences'), subtitle: t('settings.notifications.subtitle', 'Configure synthesizer volume, toast durations and RBAC routing'), icon: Settings, isNotificationSettings: true },
    { id: 'nav-pos', title: t('settings.commandMenu.goToPos', 'Open POS Register'), subtitle: t('pos.scanPrompt', 'Start a new sale or scan barcode'), icon: ShoppingCart, path: '/pos' },
    { id: 'nav-screen-protectors', title: t('settings.commandMenu.goToScreenProtectors', 'Screen Protector Compatibility Finder'), subtitle: t('screenProtectors.subtitle', 'Find shared glass sizes, die-cuts & phone model matches'), icon: Layers, path: '/screen-protectors' },
    { id: 'nav-design', title: t('deviceSettings.designStudio', 'Design & Theme Studio'), subtitle: t('deviceSettings.designStudioDesc', 'Customize color themes, dark/light/OLED mode, UI density, radius & sound effects'), icon: Palette, isDesignSettings: true },
    { id: 'nav-reports', title: t('settings.commandMenu.goToReports', 'Financial Reports & Profit Valuation'), subtitle: t('reports.subtitle', 'Today, month, year profits, in-stock cost valuation (USD & IQD) & balance sheet'), icon: BarChart3, path: '/reports' },
    { id: 'nav-mobiles', title: t('settings.commandMenu.goToMobiles', 'Manage Mobiles & Tablets'), subtitle: t('mobiles.subtitle', 'View phone inventory, IMEIs and specs'), icon: Smartphone, path: '/mobiles' },
    { id: 'nav-acc', title: t('settings.commandMenu.goToAccessories', 'Manage Accessories'), subtitle: t('accessories.subtitle', 'View cases, chargers, audio & stock'), icon: Headphones, path: '/accessories' },
    { id: 'nav-suppliers', title: t('settings.commandMenu.goToSuppliers', 'Companies & Suppliers Management'), subtitle: t('suppliers.subtitle', 'Vendor directory, company debts, purchase bills & vouchers'), icon: Building2, path: '/suppliers' },
    { id: 'nav-camera', title: t('settings.commandMenu.openDevice', 'Camera & Hardware Scanner Settings'), subtitle: t('deviceSettings.cameraAuthDesc', 'Permanent camera authorization, device selection and testing'), icon: Camera, isSettings: true },
    { id: 'nav-debts', title: t('settings.commandMenu.goToDebts', 'Customer Debts & Receivables'), subtitle: t('debts.subtitle', 'Track customer credit, dues and receipts'), icon: Coins, path: '/debts' },
    { id: 'nav-installments', title: t('settings.commandMenu.goToInstallments', 'Installment Plans & Contracts'), subtitle: t('installments.subtitle', 'Monthly financing schedules and agreements'), icon: Calendar, path: '/installments' },
    { id: 'nav-returns', title: t('settings.commandMenu.goToReturns', 'Defective Returns & RMA (Warranty)'), subtitle: t('returns.subtitle', 'Track faulty items, replacements, and supplier balance credits'), icon: ShieldAlert, path: '/returns' },
    { id: 'nav-recycle-bin', title: 'Recycle Bin & Safe Data Recovery', subtitle: 'View, recover or permanently purge deleted mobiles, accessories, debts, or suppliers', icon: Trash2, isRecycleBin: true },
    { id: 'nav-storage-cleanup', title: t('storageCleanup.modalTitle', 'Supabase Storage & Database Cleanup Utility'), subtitle: t('storageCleanup.modalSubtitle', 'Scan for orphaned media assets and stale logs to reclaim cloud storage'), icon: HardDrive, isStorageCleanup: true },
  ].filter(a => !q || a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q));

  const matchedMobiles = allMobiles
    .filter(m => {
      if (!q) return false;
      return (
        m.model.toLowerCase().includes(q) ||
        m.brand.toLowerCase().includes(q) ||
        (m.imei && m.imei.toLowerCase().includes(q)) ||
        (m.color && m.color.toLowerCase().includes(q)) ||
        (m.storage && m.storage.toLowerCase().includes(q))
      );
    })
    .slice(0, 5);

  const matchedAccessories = allAccessories
    .filter(a => {
      if (!q) return false;
      return (
        a.name.toLowerCase().includes(q) ||
        a.brand.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        (a.barcode && a.barcode.toLowerCase().includes(q))
      );
    })
    .slice(0, 5);

  // Combine items for keyboard navigation
  const allResults = [
    ...matchedActions.map(item => ({ type: 'action', item })),
    ...matchedMobiles.map(item => ({ type: 'mobile', item })),
    ...matchedAccessories.map(item => ({ type: 'accessory', item })),
  ];

  const handleSelect = (idx: number) => {
    const target = allResults[idx];
    if (!target) return;
    sound.playClick();

    if (target.type === 'action') {
      const act = target.item as any;
      if (act.isNotificationCenter) {
        openCenter();
      } else if (act.isNotificationSimulator) {
        openSimulator();
      } else if (act.isNotificationSettings) {
        openNotificationSettings();
      } else if (act.isDesignSettings) {
        if (onOpenDesignSettings) {
          onOpenDesignSettings();
        }
      } else if (act.isSettings) {
        if (onOpenSettings) {
          onOpenSettings();
        }
      } else if (act.isStorageCleanup) {
        window.dispatchEvent(new CustomEvent('open-storage-cleanup'));
      } else if (act.isRecycleBin) {
        window.dispatchEvent(new CustomEvent('open-recycle-bin'));
      } else if (act.path) {
        navigate(act.path);
      }
      onClose();
    } else if (target.type === 'mobile') {
      if (onSelectMobile) {
        onSelectMobile(target.item as Mobile);
      } else {
        navigate('/mobiles');
      }
      onClose();
    } else if (target.type === 'accessory') {
      if (onSelectAccessory) {
        onSelectAccessory(target.item as Accessory);
      } else {
        navigate('/accessories');
      }
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, allResults?.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (allResults?.length || 0)) % Math.max(1, allResults?.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(selectedIndex);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-2xl bg-[#121827] border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80vh]"
        >
          {/* Search Input Bar */}
          <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-[#0f1422]">
            <Search className="w-5 h-5 text-indigo-400 shrink-0 me-3" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder={t('settings.commandMenu.searchPlaceholder', 'Type a command or search modules...')}
              className="flex-1 bg-transparent text-white placeholder-slate-500 text-base focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="flex items-center justify-center w-5 h-5 rounded-full text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 transition-all active:scale-90 me-2 cursor-pointer"
                title={t('common.cancel', 'Clear search')}
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold text-slate-400 bg-slate-800 border border-slate-700 rounded-md">
              ESC
            </kbd>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-800/40">
            {(allResults?.length || 0) === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-600 animate-pulse" />
                <p className="text-sm">{t('settings.commandMenu.noResults', 'No commands found matching "{{query}}"', { query })}</p>
                <p className="text-xs text-slate-600 mt-1">{t('common.search', 'Try searching by model, brand, barcode, or IMEI')}</p>
              </div>
            ) : (
              <div className="py-1 space-y-1">
                {/* Actions / Navigation */}
                {(matchedActions?.length || 0) > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {t('settings.commandMenu.navigation', 'Navigation & Modules')}
                    </div>
                    {matchedActions.map((action, idx) => {
                      const isSelected = selectedIndex === idx;
                      const Icon = action.icon;
                      return (
                        <div
                          key={action.id}
                          onClick={() => handleSelect(idx)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30' : 'text-slate-300 hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">{action.title}</div>
                              <div className="text-xs text-slate-400">{action.subtitle}</div>
                            </div>
                          </div>
                          <ArrowRight className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-600'}`} />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Mobiles */}
                {(matchedMobiles?.length || 0) > 0 && (
                  <div className="pt-2">
                    <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                      {t('nav.mobiles', 'Mobile Devices')} ({matchedMobiles?.length || 0})
                    </div>
                    {matchedMobiles.map((mobile, mIdx) => {
                      const itemGlobalIdx = (matchedActions?.length || 0) + mIdx;
                      const isSelected = selectedIndex === itemGlobalIdx;
                      return (
                        <div
                          key={mobile.id}
                          onClick={() => handleSelect(itemGlobalIdx)}
                          onMouseEnter={() => setSelectedIndex(itemGlobalIdx)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                            isSelected ? 'bg-cyan-600/20 text-cyan-200 border border-cyan-500/30' : 'text-slate-300 hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'}`}>
                              <Smartphone className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <div className="text-sm font-medium text-white flex items-center gap-2">
                                <span className="truncate">{mobile.brand} {mobile.model}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                  mobile.status === 'in_stock' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {mobile.status === 'in_stock' ? t('common.inStock', 'In Stock') : t('common.sold', 'Sold')}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                {mobile.imei && <span className="font-mono text-slate-500 flex items-center gap-1"><Hash className="w-3 h-3" />{mobile.imei}</span>}
                                {mobile.storage && <span>• {mobile.storage}</span>}
                                {mobile.color && <span>• {mobile.color}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <div className="text-sm font-bold text-white">${mobile.sellPrice}</div>
                            <div className="text-[11px] text-slate-500">{mobile.currency || 'USD'}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Accessories */}
                {(matchedAccessories?.length || 0) > 0 && (
                  <div className="pt-2">
                    <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Headphones className="w-3.5 h-3.5 text-amber-400" />
                      {t('nav.accessories', 'Accessories')} ({matchedAccessories?.length || 0})
                    </div>
                    {matchedAccessories.map((acc, aIdx) => {
                      const itemGlobalIdx = (matchedActions?.length || 0) + (matchedMobiles?.length || 0) + aIdx;
                      const isSelected = selectedIndex === itemGlobalIdx;
                      return (
                        <div
                          key={acc.id}
                          onClick={() => handleSelect(itemGlobalIdx)}
                          onMouseEnter={() => setSelectedIndex(itemGlobalIdx)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                            isSelected ? 'bg-amber-600/20 text-amber-200 border border-amber-500/30' : 'text-slate-300 hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                              <Headphones className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <div className="text-sm font-medium text-white flex items-center gap-2">
                                <span className="truncate">{acc.name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                  {acc.quantity} {t('common.inStock', 'in stock')}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                {acc.barcode && <span className="font-mono text-slate-500 flex items-center gap-1"><Tag className="w-3 h-3" />{acc.barcode}</span>}
                                {acc.category && <span>• {acc.category}</span>}
                                {acc.brand && <span>• {acc.brand}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <div className="text-sm font-bold text-white">${acc.sellPrice}</div>
                            <div className="text-[11px] text-slate-500">{acc.currency || 'USD'}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Shortcuts hint */}
          <div className="px-4 py-2.5 border-t border-slate-800 bg-[#0c101c] flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400">↓</kbd>
                {t('deviceSettings.toNavigate', 'to navigate')}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400">↵</kbd>
                {t('deviceSettings.toSelect', 'to select')}
              </span>
            </div>
            <span className="text-slate-400 font-medium">{t('deviceSettings.smartAssistant', 'Nali Smart Assistant')}</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
