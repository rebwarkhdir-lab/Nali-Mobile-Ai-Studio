import { Link, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { 
  Smartphone, 
  ShoppingCart, 
  Headphones, 
  Coins, 
  Calendar, 
  Camera, 
  Search, 
  MoreHorizontal, 
  X, 
  Sparkles, 
  Layers, 
  Settings, 
  Plus, 
  Building2, 
  BarChart3, 
  Palette,
  Sun,
  Moon,
  Zap,
  Sliders,
  Check,
  ShieldAlert,
  Barcode as BarcodeIcon,
  LogOut
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import { sound } from '../../lib/sound';
import { useDesignSystem } from '../../context/DesignContext';
import { useAuth } from '../../context/AuthContext';
import { THEME_PALETTES, ThemePalette, AppearanceMode } from '../../types/design';
import SyncStatusBadge from '../common/SyncStatusBadge';

interface BottomNavigationProps {
  onOpenCommand: () => void;
  onOpenSettings: () => void;
  onOpenDesignSettings?: () => void;
  onOpenOfflineSync?: () => void;
  onOpenSignOutModal?: () => void;
  onOpenIPhoneWidgets?: () => void;
}

export default function BottomNavigation({ 
  onOpenCommand, 
  onOpenSettings, 
  onOpenDesignSettings, 
  onOpenOfflineSync,
  onOpenSignOutModal,
  onOpenIPhoneWidgets 
}: BottomNavigationProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [isToolsSheetOpen, setIsToolsSheetOpen] = useState(false);
  const { activeThemeInfo, settings, updateSettings } = useDesignSystem();
  const { hasPermission, isTechnician } = useAuth();

  // Tailored mobile navigation tabs according to RBAC role
  const navTabs = isTechnician ? [
    {
      id: 'mobiles',
      label: t('bottomNav.mobiles', t('nav.mobiles', 'Mobiles')),
      path: '/mobiles',
      icon: Smartphone
    },
    {
      id: 'accessories',
      label: t('bottomNav.accessories', t('nav.accessories', 'Accessories')),
      path: '/accessories',
      icon: Headphones
    },
    {
      id: 'returns',
      label: 'RMA Claim',
      path: '/returns',
      icon: ShieldAlert,
      isPrimaryAction: true
    },
    {
      id: 'screen-protectors',
      label: 'Protectors',
      path: '/screen-protectors',
      icon: Layers
    },
    {
      id: 'barcodes',
      label: 'Labels',
      path: '/barcodes',
      icon: BarcodeIcon
    }
  ] : [
    {
      id: 'mobiles',
      label: t('bottomNav.mobiles', t('nav.mobiles', 'Mobiles')),
      path: '/mobiles',
      icon: Smartphone
    },
    {
      id: 'accessories',
      label: t('bottomNav.accessories', t('nav.accessories', 'Accessories')),
      path: '/accessories',
      icon: Headphones
    },
    {
      id: 'pos',
      label: 'POS',
      path: '/pos',
      icon: ShoppingCart,
      isPrimaryAction: true
    },
    {
      id: 'debts',
      label: t('bottomNav.debts', t('nav.debts', 'Debts')),
      path: '/debts',
      icon: Coins
    },
    {
      id: 'installments',
      label: t('bottomNav.installments', t('nav.installments', 'Installments')),
      path: '/installments',
      icon: Calendar
    }
  ];

  const isCurrentActive = (path?: string, matchExact?: boolean) => {
    if (!path) return false;
    if (matchExact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleTabClick = (tab: typeof navTabs[0]) => {
    try {
      sound.playClick();
    } catch {}
    setIsToolsSheetOpen(false);
  };

  const handleThemeSelect = (themeId: ThemePalette) => {
    sound.playClick();
    updateSettings({ theme: themeId });
  };

  const handleAppearanceSelect = (mode: AppearanceMode) => {
    sound.playClick();
    updateSettings({ appearance: mode });
  };

  return (
    <>
      {/* Quick Settings & Navigation Bottom Sheet on Mobile/Tablet */}
      {isToolsSheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
            onClick={() => {
              sound.playClick();
              setIsToolsSheetOpen(false);
            }}
          />

          {/* Bottom Sheet Modal Container */}
          <div className="relative bg-[#0c101d] border-t border-slate-700/80 rounded-t-3xl p-5 shadow-2xl z-10 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-250 pb-[calc(max(env(safe-area-inset-bottom),1rem)+1.5rem)]">
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-slate-700/60 rounded-full mx-auto -mt-1 mb-2"></div>

            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Settings & Quick Tools</h3>
                  <p className="text-[11px] text-slate-400">Design studio, hardware, and shop utilities</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  sound.playClick();
                  setIsToolsSheetOpen(false);
                }}
                className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white active:scale-95 transition-all"
                aria-label="Close tools menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Spotlight Card: Design & Theme Studio */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/70 via-[#131a2e] to-slate-900/90 border border-indigo-500/30 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-white">Live Design & Theme</span>
                </div>
                {onOpenDesignSettings && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      setIsToolsSheetOpen(false);
                      onOpenDesignSettings();
                    }}
                    className="text-[11px] px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1 active:scale-95"
                  >
                    <span>Full Studio</span>
                    <Sparkles className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Quick 1-Tap Theme Swatches */}
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Color Themes
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {THEME_PALETTES.slice(0, 4).map((p) => {
                    const isSelected = settings.theme === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleThemeSelect(p.id)}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2 rounded-xl border text-[10px] font-medium transition-all active:scale-95 relative",
                          isSelected 
                            ? "bg-slate-800 border-indigo-500/80 text-white shadow-sm ring-1 ring-indigo-500/50" 
                            : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200"
                        )}
                      >
                        <span className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: p.primaryColor }} />
                        <span className="truncate max-w-full leading-tight text-[9px]">{p.name.split(' ')[0]}</span>
                        {isSelected && (
                          <Check className="w-2.5 h-2.5 text-indigo-400 absolute top-1 end-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Appearance Mode (Dark / OLED / Light) */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Appearance Mode
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'dark' as AppearanceMode, label: 'Dark', icon: Moon },
                    { id: 'oled' as AppearanceMode, label: 'OLED Black', icon: Zap },
                    { id: 'light' as AppearanceMode, label: 'Light', icon: Sun }
                  ].map((m) => {
                    const isSelected = (settings.appearance || 'dark') === m.id;
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleAppearanceSelect(m.id)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl border text-xs font-semibold transition-all active:scale-95",
                          isSelected
                            ? "bg-indigo-600/30 border-indigo-500 text-white shadow-sm"
                            : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200"
                        )}
                      >
                        <Icon className="w-3 h-3 text-indigo-400" />
                        <span className="text-[10px]">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* iPhone Live Widgets Card */}
            {onOpenIPhoneWidgets && (
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setIsToolsSheetOpen(false);
                  onOpenIPhoneWidgets();
                }}
                className="flex items-center justify-between w-full p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-slate-900/90 border border-indigo-500/30 text-start text-slate-300 hover:bg-slate-800/90 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      iPhone Live Widgets
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    </div>
                    <div className="text-[10px] text-slate-400">Direct sales, debts due & stock thresholds</div>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-1 rounded bg-indigo-600/30 border border-indigo-500/50 text-indigo-200 font-semibold">
                  iOS Widgets
                </span>
              </button>
            )}

            {/* Cloud Sync & Offline Engine Status Card */}
            {onOpenOfflineSync && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  sound.playClick();
                  setIsToolsSheetOpen(false);
                  onOpenOfflineSync();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    sound.playClick();
                    setIsToolsSheetOpen(false);
                    onOpenOfflineSync();
                  }
                }}
                className="flex items-center justify-between w-full p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/30 text-start text-slate-300 hover:bg-slate-800/90 transition-all active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      Cloud Sync & IndexedDB
                    </div>
                    <div className="text-[10px] text-slate-400">Real-time cloud database backup & offline sync queue</div>
                  </div>
                </div>
                <SyncStatusBadge onClick={() => {
                  setIsToolsSheetOpen(false);
                  onOpenOfflineSync();
                }} />
              </div>
            )}

            {/* Hardware & Camera Settings Button */}
            <button
              onClick={() => {
                sound.playClick();
                setIsToolsSheetOpen(false);
                onOpenSettings();
              }}
              className="flex items-center justify-between w-full p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-start text-slate-300 hover:bg-slate-800/90 transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    Camera & Barcode Scanner Setup
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>
                  <div className="text-[10px] text-slate-400">Select lens, rear/front cameras, and scanner speed</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                Configure
              </span>
            </button>

            {/* Navigation Grid for other modules */}
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase font-bold text-slate-500 px-1 tracking-wider">
                Store Financial & Operations Hub
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    sound.playClick();
                    setIsToolsSheetOpen(false);
                    navigate('/screen-protectors');
                  }}
                  className={cn(
                    "flex items-center gap-2.5 p-3 rounded-xl border text-start transition-all",
                    location.pathname === '/screen-protectors' 
                      ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300" 
                      : "bg-slate-900/80 border-slate-800/80 text-slate-300 hover:bg-slate-800"
                  )}
                >
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Screen Protectors</div>
                    <div className="text-[9px] text-slate-400">Glass compatibility</div>
                  </div>
                </button>

                {hasPermission('inventory_accessories', 'view') && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      setIsToolsSheetOpen(false);
                      navigate('/barcodes');
                    }}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-xl border text-start transition-all",
                      location.pathname === '/barcodes' 
                        ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300" 
                        : "bg-slate-900/80 border-slate-800/80 text-slate-300 hover:bg-slate-800"
                    )}
                  >
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                      <BarcodeIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Barcode Studio</div>
                      <div className="text-[9px] text-slate-400">Thermal Labels</div>
                    </div>
                  </button>
                )}

                {hasPermission('reports_finance', 'view') && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      setIsToolsSheetOpen(false);
                      navigate('/reports');
                    }}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-xl border text-start transition-all",
                      location.pathname === '/reports' 
                        ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300" 
                        : "bg-slate-900/80 border-slate-800/80 text-slate-300 hover:bg-slate-800"
                    )}
                  >
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Reports & Profit</div>
                      <div className="text-[9px] text-slate-400">Valuation & dual currency</div>
                    </div>
                  </button>
                )}

                {hasPermission('suppliers', 'view') && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      setIsToolsSheetOpen(false);
                      navigate('/suppliers');
                    }}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-xl border text-start transition-all",
                      location.pathname === '/suppliers' 
                        ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300" 
                        : "bg-slate-900/80 border-slate-800/80 text-slate-300 hover:bg-slate-800"
                    )}
                  >
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Suppliers & Debts</div>
                      <div className="text-[9px] text-slate-400">Wholesalers & payables</div>
                    </div>
                  </button>
                )}

                {hasPermission('debts_installments', 'view') && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      setIsToolsSheetOpen(false);
                      navigate('/debts');
                    }}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-xl border text-start transition-all",
                      location.pathname === '/debts' 
                        ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300" 
                        : "bg-slate-900/80 border-slate-800/80 text-slate-300 hover:bg-slate-800"
                    )}
                  >
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                      <Coins className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Customer Debts</div>
                      <div className="text-[9px] text-slate-400">Receivables & dues</div>
                    </div>
                  </button>
                )}

                {hasPermission('debts_installments', 'view') && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      setIsToolsSheetOpen(false);
                      navigate('/installments');
                    }}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-xl border text-start transition-all",
                      location.pathname === '/installments' 
                        ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300" 
                        : "bg-slate-900/80 border-slate-800/80 text-slate-300 hover:bg-slate-800"
                    )}
                  >
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Installments</div>
                      <div className="text-[9px] text-slate-400">Monthly schedules</div>
                    </div>
                  </button>
                )}

                {hasPermission('admin_users', 'view') && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      setIsToolsSheetOpen(false);
                      navigate('/admin');
                    }}
                    className={cn(
                      "flex items-center gap-2.5 p-3 rounded-xl border text-start transition-all",
                      location.pathname.startsWith('/admin') 
                        ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300" 
                        : "bg-slate-900/80 border-slate-800/80 text-slate-300 hover:bg-slate-800"
                    )}
                  >
                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Administration</div>
                      <div className="text-[9px] text-slate-400">Security & Roles</div>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Smart Command Search Shortcut */}
            <button
              onClick={() => {
                sound.playClick();
                setIsToolsSheetOpen(false);
                onOpenCommand();
              }}
              className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-slate-400 hover:text-white text-xs transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                <span>Search Inventory, IMEI & Commands</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 border border-slate-700 rounded text-slate-400">
                ⌘K
              </kbd>
            </button>

            {/* Mobile Sign Out / Switch Account button */}
            {onOpenSignOutModal && (
              <button
                id="btn-mobile-signout"
                onClick={() => {
                  sound.playClick();
                  setIsToolsSheetOpen(false);
                  onOpenSignOutModal();
                }}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-semibold transition-all active:scale-[0.99]"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('signOutModal.title', 'Sign Out / Switch Account')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#080c16]/95 backdrop-blur-xl border-t border-slate-800/80 shadow-[0_-8px_30px_rgba(0,0,0,0.6)] px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.65rem)]">
        <nav className="grid grid-cols-5 w-full max-w-lg mx-auto">
          {navTabs.map((tab) => {
            const isActive = isCurrentActive(tab.path);

            if (tab.isPrimaryAction) {
              return (
                <div key={tab.id} className="col-span-1 flex justify-center">
                  <Link
                    to={tab.path}
                    onClick={() => handleTabClick(tab)}
                    className="relative -top-4 flex flex-col items-center group focus:outline-none cursor-pointer"
                    aria-label={isTechnician ? 'RMA Claims' : 'POS Register'}
                  >
                    <div className={cn(
                      "w-13 h-13 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95",
                      isTechnician
                        ? "bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-400 text-white shadow-rose-500/40 ring-4 ring-[#080c16]"
                        : (isActive
                          ? "bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white shadow-indigo-500/40 ring-4 ring-[#080c16]"
                          : "bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-indigo-600/30 ring-4 ring-[#080c16]")
                    )}>
                      <tab.icon className="w-6 h-6" />
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold mt-1 tracking-tight",
                      isActive ? "text-cyan-400" : "text-slate-300 group-hover:text-white"
                    )}>
                      {tab.label}
                    </span>
                  </Link>
                </div>
              );
            }

            const Icon = tab.icon;
            return (
              <Link
                key={tab.id}
                to={tab.path}
                onClick={() => handleTabClick(tab)}
                className={cn(
                  "col-span-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 touch-manipulation relative cursor-pointer",
                  isActive ? "text-indigo-400" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <div className="relative">
                  <Icon className={cn("w-5 h-5 transition-transform", isActive ? "scale-110 text-indigo-400" : "text-slate-400")} />
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400" />
                  )}
                </div>
                <span className={cn(
                  "text-[10px] mt-1 font-medium tracking-tight truncate w-full text-center px-1",
                  isActive ? "text-indigo-300 font-semibold" : "text-slate-400"
                )}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
