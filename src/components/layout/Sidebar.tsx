import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { 
  ShoppingCart, 
  Smartphone, 
  Headphones, 
  Layers, 
  Building2, 
  Coins, 
  Calendar, 
  BarChart3, 
  Search, 
  LogOut, 
  X, 
  PanelLeftClose,
  PanelLeft,
  Volume2,
  VolumeX,
  Settings,
  Command,
  Camera,
  ShieldAlert,
  Barcode
} from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { sound } from '../../lib/sound';
import { useDesignSystem } from '../../context/DesignContext';
import { useAuth } from '../../context/AuthContext';
import StoreLogoBadge from '../common/StoreLogoBadge';
import { useModalScrollLock } from '../../lib/modalLock';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenCommand: () => void;
  onOpenDesignSettings: (tab?: string) => void;
  onOpenDeviceSettings: () => void;
  onOpenOfflineSync: () => void;
  onOpenSignOutModal: () => void;
  onOpenIPhoneInstall?: () => void;
}

interface NavItem {
  nameKey: string;
  href: string;
  icon: React.ElementType;
  shortcut: string;
  badge?: string;
  isPrimary?: boolean;
  module?: string;
  action?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Store',
    items: [
      { nameKey: 'nav.pos', href: '/pos', icon: ShoppingCart, shortcut: '⌘1', badge: 'LIVE', isPrimary: true, module: 'sales', action: 'view' },
      { nameKey: 'nav.mobiles', href: '/mobiles', icon: Smartphone, shortcut: '⌘3', module: 'inventory_mobiles', action: 'view' },
      { nameKey: 'nav.accessories', href: '/accessories', icon: Headphones, shortcut: '⌘4', module: 'inventory_accessories', action: 'view' }
    ]
  },
  {
    title: 'Finance & Tools',
    items: [
      { nameKey: 'nav.debts', href: '/debts', icon: Coins, shortcut: '⌘7', module: 'debts_installments', action: 'view' },
      { nameKey: 'nav.installments', href: '/installments', icon: Calendar, shortcut: '⌘8', module: 'debts_installments', action: 'view' },
      { nameKey: 'nav.suppliers', href: '/suppliers', icon: Building2, shortcut: '⌘6', module: 'suppliers', action: 'view' },
      { nameKey: 'nav.returns', href: '/returns', icon: ShieldAlert, shortcut: '⌘2', module: 'rma_returns', action: 'view' },
      { nameKey: 'nav.screenProtectors', href: '/screen-protectors', icon: Layers, shortcut: '⌘5', module: 'inventory_accessories', action: 'view' },
      { nameKey: 'nav.barcodeStudio', href: '/barcodes', icon: Barcode, shortcut: '⌘B', module: 'inventory_accessories', action: 'view' },
      { nameKey: 'nav.reports', href: '/reports', icon: BarChart3, shortcut: '⌘9', module: 'reports_finance', action: 'view' }
    ]
  },
  {
    title: 'System',
    items: [
      { nameKey: 'nav.administration', href: '/admin', icon: ShieldAlert, shortcut: '⌘A', module: 'admin_users', action: 'view' }
    ]
  }
];

export default function Sidebar({
  mobileOpen,
  onCloseMobile,
  onOpenCommand,
  onOpenDesignSettings,
  onOpenDeviceSettings,
  onOpenOfflineSync,
  onOpenSignOutModal,
  onOpenIPhoneInstall
}: SidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useDesignSystem();
  const { user, profile, hasPermission, logout } = useAuth();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nali_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  
  const authorizedItems = NAV_SECTIONS.flatMap(s => s.items).filter(item => {
    if (item.module && item.action) {
      return hasPermission(item.module, item.action);
    }
    return true; // if no permission specified, allow
  });

  const [isHovered, setIsHovered] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => sound.isEnabled());

  const isVisualCollapsed = isCollapsed && !isHovered;
  const isRTL = i18n.dir() === 'rtl' || i18n.language === 'ku';

  const toggleSound = () => {
    const next = !soundEnabled;
    sound.setEnabled(next);
    setSoundEnabled(next);
    if (next) sound.playClick();
  };

  const toggleCollapse = () => {
    sound.playClick();
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('nali_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (!isMeta) return;

      if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapse();
        return;
      }

      const keyMap: Record<string, string> = {
        '1': '/pos',
        '2': '/returns',
        '3': '/mobiles',
        '4': '/accessories',
        '5': '/screen-protectors',
        '6': '/suppliers',
        '7': '/debts',
        '8': '/installments',
        '9': '/reports'
      };

      if (keyMap[e.key]) {
        e.preventDefault();
        sound.playClick();
        navigate(keyMap[e.key]);
        if (mobileOpen) onCloseMobile();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onCloseMobile, navigate]);

  const handleSignOut = () => {
    sound.playClick();
    onOpenSignOutModal();
  };

  const getRoleDisplayName = (roleName?: string) => {
    if (!roleName) return 'nalimobile.com';
    const lower = roleName.toLowerCase();
    if (lower.includes('admin')) {
      return t('signOutModal.roleAdministrator', 'Administrator');
    }
    if (lower.includes('cashier')) {
      return t('signOutModal.roleCashier', 'Cashier POS');
    }
    return roleName;
  };

  const sidebarWidth = isVisualCollapsed ? 80 : 280;

  // Lock background scroll when mobile sidebar is open
  useModalScrollLock(mobileOpen, 'mobile-sidebar');

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            data-modal-backdrop="true"
            className="fixed inset-0 bg-black/60 z-40 md:hidden touch-none overscroll-contain"
            onClick={() => {
              sound.playClick();
              onCloseMobile();
            }}
          />
        )}
      </AnimatePresence>

      {/* Desktop Layout Spacer */}
      <div 
        className={cn(
          "hidden md:block shrink-0 transition-[width] duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] h-screen",
          isCollapsed ? "w-[80px]" : "w-[280px]"
        )}
      />

      <motion.aside
        data-drawer={mobileOpen ? "true" : undefined}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={false}
        animate={{ width: mobileOpen ? 280 : sidebarWidth }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex flex-col select-none group/sidebar",
          "bg-[#0B0F19] border-e border-white/[0.04] shadow-2xl md:shadow-none",
          "transition-[transform,box-shadow] duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 rtl:translate-x-full rtl:md:translate-x-0",
          isHovered && isCollapsed && "md:shadow-[30px_0_40px_rgba(0,0,0,0.6)] rtl:md:shadow-[-30px_0_40px_rgba(0,0,0,0.6)]" 
        )}
      >
        <div 
          className="relative flex items-center px-4 border-b border-white/[0.04] shrink-0 transition-all"
          style={{
            height: mobileOpen ? 'calc(72px + env(safe-area-inset-top, 0px))' : '72px',
            paddingTop: mobileOpen ? 'env(safe-area-inset-top, 0px)' : '0px'
          }}
        >
          <Link
            to="/pos"
            onClick={() => {
              sound.playClick();
              if (mobileOpen) onCloseMobile();
            }}
            className="flex items-center gap-3.5 group min-w-0 w-full cursor-pointer"
          >
            <StoreLogoBadge 
              size="md" 
              allowDirectUpload={false} 
              showHoverOverlay={false}
            />

            <AnimatePresence mode="popLayout" initial={false}>
              {!isVisualCollapsed && (
                <motion.div 
                  initial={{ opacity: 0, x: isRTL ? 15 : -15, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, x: isRTL ? 15 : -15, filter: 'blur(4px)' }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="flex-1 overflow-hidden min-w-0"
                >
                  <div className="flex items-center gap-1.5 leading-tight">
                    <span className="font-bold text-base tracking-tight text-white group-hover:text-indigo-300 transition-colors truncate">
                      {settings.storeName || 'NALI POS'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0" />
                    <span className="font-medium truncate">{settings.storeSubtitle || 'Terminal Active'}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>

          <button
            onClick={() => {
              sound.playClick();
              onCloseMobile();
            }}
            className="md:hidden absolute end-4 p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-4 shrink-0">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              sound.playClick();
              if (mobileOpen) onCloseMobile();
              onOpenCommand();
            }}
            className={cn(
              "w-full flex items-center bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-slate-400 rounded-xl transition-colors shadow-sm",
              isVisualCollapsed ? "h-11 justify-center" : "h-11 px-3 justify-between"
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Search className={cn("w-4 h-4 shrink-0", isVisualCollapsed ? "text-slate-300" : "text-slate-400")} />
              <AnimatePresence mode="popLayout" initial={false}>
                {!isVisualCollapsed && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm font-medium truncate"
                  >
                    Quick Search...
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            
            <AnimatePresence mode="popLayout" initial={false}>
              {!isVisualCollapsed && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="hidden lg:flex items-center gap-1 text-[10px] font-semibold tracking-widest text-slate-500"
                >
                  <Command className="w-3 h-3" />
                  <span>K</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        <div data-modal-scrollable="true" className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-6 space-y-1.5 scrollbar-none overscroll-contain">
          <LayoutGroup>
            {authorizedItems.map((item) => {
                  const isActive = item.href === '/' 
                    ? location.pathname === '/' 
                    : location.pathname.startsWith(item.href);

                  return (
                    <div 
                      key={item.nameKey} 
                      className="relative"
                      onMouseEnter={() => setHoveredItem(item.nameKey)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <Link
                        to={item.href}
                        onClick={() => {
                          sound.playClick();
                          if (mobileOpen) onCloseMobile();
                        }}
                        className={cn(
                          "relative flex items-center rounded-xl text-sm font-medium transition-colors outline-none cursor-pointer group",
                          isVisualCollapsed ? "h-11 justify-center" : "h-11 px-3 gap-3.5",
                          !isActive && "text-slate-400 hover:text-slate-200"
                        )}
                      >
                        {!isActive && (
                          <div className="absolute inset-0 rounded-xl bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                        )}
                        
                        {isActive && (
                          <motion.div
                            layoutId="sidebar-active-bg"
                            className="absolute inset-0 bg-white/[0.08] rounded-xl border border-white/[0.05]"
                            initial={false}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}

                        {isActive && (
                          <motion.div
                            layoutId="sidebar-active-pill"
                            className="absolute start-0 top-2.5 bottom-2.5 w-[3px] bg-white rounded-e-full shadow-[0_0_12px_rgba(255,255,255,0.4)]"
                            initial={false}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          />
                        )}

                        <div className="relative z-10 flex items-center justify-center shrink-0 w-5 h-5">
                          <item.icon className={cn(
                            "w-[18px] h-[18px] transition-all duration-300", 
                            isActive ? "text-white scale-110 drop-shadow-md" : "text-slate-400 group-hover:text-slate-200 group-hover:scale-110"
                          )} />
                        </div>

                        <AnimatePresence mode="popLayout" initial={false}>
                          {!isVisualCollapsed && (
                            <motion.div 
                              initial={{ opacity: 0, x: isRTL ? 10 : -10, filter: 'blur(2px)' }}
                              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                              exit={{ opacity: 0, x: isRTL ? 10 : -10, filter: 'blur(2px)' }}
                              transition={{ duration: 0.2 }}
                              className="flex-1 flex items-center justify-between min-w-0"
                            >
                              <span className={cn(
                                "truncate transition-colors duration-300",
                                isActive ? "text-white font-semibold" : "text-slate-400 group-hover:text-slate-200"
                              )}>
                                {t(item.nameKey)}
                              </span>
                              
                              {item.badge && (
                                <span className={cn(
                                  "px-2 py-0.5 rounded-md text-[9px] font-bold tracking-widest shrink-0 ms-2 transition-colors",
                                  isActive ? "bg-white text-black" : "bg-white/10 text-white"
                                )}>
                                  {item.badge}
                                </span>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Link>

                      <AnimatePresence>
                        {isVisualCollapsed && hoveredItem === item.nameKey && (
                          <motion.div 
                            initial={{ opacity: 0, x: isRTL ? -10 : 10, scale: 0.95, filter: 'blur(4px)' }}
                            animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, x: isRTL ? -10 : 10, scale: 0.95, filter: 'blur(4px)' }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="hidden md:flex absolute start-full ms-4 top-1/2 -translate-y-1/2 z-50 bg-[#1A1F2C] border border-white/10 text-white px-3.5 py-2.5 rounded-xl shadow-2xl items-center gap-3 pointer-events-none"
                          >
                            <span className="text-sm font-semibold whitespace-nowrap">{t(item.nameKey)}</span>
                            {item.shortcut && (
                              <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-black/40 px-1.5 py-0.5 rounded-md border border-white/5">
                                {item.shortcut.includes('⌘') && <Command className="w-2.5 h-2.5" />}
                                <span>{item.shortcut.replace('⌘', '')}</span>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
            })}
          </LayoutGroup>
        </div>

        <div className="p-4 border-t border-white/[0.04] shrink-0 bg-white/[0.01]">
          <div className={cn(
            "flex items-center gap-3 transition-all duration-300",
            isVisualCollapsed ? "flex-col" : "justify-between"
          )}>
            
            <AnimatePresence mode="popLayout" initial={false}>
              {!isVisualCollapsed ? (
                <motion.div 
                  initial={{ opacity: 0, filter: 'blur(2px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(2px)' }}
                  className="flex items-center gap-3 min-w-0"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
                    <span className="text-xs font-bold text-white">{profile?.full_name?.substring(0, 2).toUpperCase() || 'C1'}</span>
                  </div>
                  <div className="min-w-0 flex flex-col justify-center">
                    <div className="text-sm font-semibold text-white truncate leading-tight">{profile?.full_name || 'Cashier'}</div>
                    <div className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">{getRoleDisplayName(profile?.role?.name)}</div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center shrink-0 mb-3 shadow-inner cursor-pointer hover:border-white/20 transition-colors"
                  title="Expand Sidebar"
                >
                  <span className="text-xs font-bold text-white">{profile?.full_name?.substring(0, 2).toUpperCase() || 'C1'}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={cn(
              "flex items-center gap-1.5",
              isVisualCollapsed && "flex-col w-full"
            )}>
              {onOpenIPhoneInstall && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    sound.playClick();
                    onOpenIPhoneInstall();
                  }}
                  className={cn(
                    "rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors flex items-center justify-center border border-emerald-500/20",
                    isVisualCollapsed ? "w-10 h-10" : "w-8 h-8"
                  )}
                  title={t('layout.installIPhone', 'Install Nali Mobile Web App on iPhone / iPad')}
                >
                  <Smartphone className="w-4 h-4" />
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleSound}
                className={cn(
                  "rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center",
                  isVisualCollapsed ? "w-10 h-10" : "w-8 h-8"
                )}
                title={soundEnabled ? t('layout.muteInterface', 'Mute Interface') : t('layout.unmuteInterface', 'Unmute Interface')}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  sound.playClick();
                  onOpenDesignSettings();
                }}
                className={cn(
                  "rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center",
                  isVisualCollapsed ? "w-10 h-10" : "w-8 h-8"
                )}
                title={t('layout.designSystem', 'Settings & System Studio')}
              >
                <Settings className="w-4 h-4" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSignOut}
                className={cn(
                  "rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center justify-center",
                  isVisualCollapsed ? "w-10 h-10 mt-2 border border-white/5" : "w-8 h-8 ms-1"
                )}
                title={t('signOutModal.title', 'Sign Out / Switch Account')}
              >
                <LogOut className="w-4 h-4" />
              </motion.button>
            </div>

          </div>
        </div>
      </motion.aside>
    </>
  );
}
