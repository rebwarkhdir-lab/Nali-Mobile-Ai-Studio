import { Link, useLocation, Outlet } from 'react-router';
import { 
  ShoppingCart, 
  Settings, 
  Menu,
  X,
  Search, 
  Camera, 
  Palette,
  Layers,
  Sparkles,
  ChevronRight,
  Smartphone,
  Headphones,
  Building2,
  Coins,
  Calendar,
  BarChart3,
  Globe2,
  DollarSign,
  ShieldAlert,
  Barcode as BarcodeIcon
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './Sidebar';
import CommandMenu from '../common/CommandMenu';
import DeviceSettingsModal from '../common/DeviceSettingsModal';
import DesignSettingsModal from '../common/DesignSettingsModal';
import OfflineSyncModal from '../common/OfflineSyncModal';
import SignOutModal from '../common/SignOutModal';
import StorageCleanupModal from '../common/StorageCleanupModal';
import LiveExchangeRate from './LiveExchangeRate';
import PaymentAlerts from './PaymentAlerts';
import LanguageSelector from './LanguageSelector';
import BottomNavigation from './BottomNavigation';
import StoreLogoBadge from '../common/StoreLogoBadge';
import { 
  NotificationBell, 
  NotificationCenter, 
  ToastManager, 
  NotificationSettingsModal, 
  NotificationSimulatorModal 
} from '../notifications';
import IPhoneWidgetsModal from '../widgets/IPhoneWidgetsModal';
import IPhoneInstallModal from '../common/IPhoneInstallModal';
import { sound } from '../../lib/sound';
import { useDesignSystem } from '../../context/DesignContext';
import { useModalScrollLock } from '../../lib/modalLock';

const ROUTE_META: Record<string, { title: string; subtitle: string; icon: React.ElementType }> = {
  '/pos': { title: 'POS Terminal', subtitle: 'Live Register', icon: ShoppingCart },
  '/returns': { title: 'Defective Returns & RMA', subtitle: 'Warranty & Settlements', icon: ShieldAlert },
  '/mobiles': { title: 'Mobiles & Devices', subtitle: 'IMEI Inventory', icon: Smartphone },
  '/accessories': { title: 'Accessories', subtitle: 'Product Catalog', icon: Headphones },
  '/screen-protectors': { title: 'Screen Glass Finder', subtitle: 'Compatibility Matrix', icon: Layers },
  '/barcodes': { title: 'Barcode Studio', subtitle: 'Thermal Labels', icon: BarcodeIcon },
  '/suppliers': { title: 'Suppliers & Vendors', subtitle: 'Company Accounts', icon: Building2 },
  '/debts': { title: 'Customer Debts', subtitle: 'Credit Ledger', icon: Coins },
  '/installments': { title: 'Installments', subtitle: 'Payment Plans', icon: Calendar },
  '/reports': { title: 'Financial Reports', subtitle: 'P&L & Telemetry', icon: BarChart3 },
};

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isDeviceSettingsOpen, setIsDeviceSettingsOpen] = useState(false);
  const [isDesignSettingsOpen, setIsDesignSettingsOpen] = useState(false);
  const [designSettingsTab, setDesignSettingsTab] = useState<any>(undefined);
  const [isOfflineSyncOpen, setIsOfflineSyncOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isStorageCleanupOpen, setIsStorageCleanupOpen] = useState(false);
  const [isIPhoneWidgetsOpen, setIsIPhoneWidgetsOpen] = useState(false);
  const [isIPhoneInstallOpen, setIsIPhoneInstallOpen] = useState(false);
  const location = useLocation();
  const { activeThemeInfo, settings } = useDesignSystem();

  // Determine active route meta
  const currentPath = location.pathname;
  const activeMeta = Object.entries(ROUTE_META).find(([path]) => 
    currentPath.startsWith(path)
  )?.[1] || { title: 'POS Terminal', subtitle: 'Live Register', icon: ShoppingCart };

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        sound.playClick();
        setIsCommandOpen(prev => !prev);
      }
    };
    const handleOpenStorageCleanup = () => {
      sound.playClick();
      setIsStorageCleanupOpen(true);
    };
    const handleOpenRecycleBin = () => {
      sound.playClick();
      setDesignSettingsTab('recycle_bin');
      setIsDesignSettingsOpen(true);
    };
    const handleOpenIPhoneWidgets = () => {
      sound.playClick();
      setIsIPhoneWidgetsOpen(true);
    };
    const handleOpenIPhoneInstall = () => {
      sound.playClick();
      setIsIPhoneInstallOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-storage-cleanup', handleOpenStorageCleanup);
    window.addEventListener('open-recycle-bin', handleOpenRecycleBin);
    window.addEventListener('open-iphone-widgets', handleOpenIPhoneWidgets);
    window.addEventListener('open-iphone-install', handleOpenIPhoneInstall);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-storage-cleanup', handleOpenStorageCleanup);
      window.removeEventListener('open-recycle-bin', handleOpenRecycleBin);
      window.removeEventListener('open-iphone-widgets', handleOpenIPhoneWidgets);
      window.removeEventListener('open-iphone-install', handleOpenIPhoneInstall);
    };
  }, []);

  // Layout modals lock
  const isAnyLayoutModalOpen = 
    mobileMenuOpen || 
    isCommandOpen || 
    isDeviceSettingsOpen || 
    isDesignSettingsOpen || 
    isOfflineSyncOpen || 
    isSignOutModalOpen || 
    isStorageCleanupOpen || 
    isIPhoneWidgetsOpen ||
    isIPhoneInstallOpen;

  useModalScrollLock(isAnyLayoutModalOpen, 'layout-modals');

  return (
    <div className="min-h-screen bg-[#070913] text-slate-200 flex flex-col md:flex-row font-sans antialiased selection:bg-indigo-600 selection:text-white">
      
      {/* Mobile Top Header */}
      <div 
        id="app-mobile-header" 
        className="md:hidden bg-[#070913]/95 backdrop-blur-xl border-b border-white/[0.06] text-white px-3 sm:px-4 pb-2 sm:pb-2.5 flex items-center justify-between sticky top-0 z-30 gap-1.5 sm:gap-2 transition-all"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)'
        }}
      >
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
          <button 
            onClick={() => {
              sound.playClick();
              setMobileMenuOpen(!mobileMenuOpen);
            }} 
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white bg-white/[0.04] border border-white/[0.06] rounded-xl active:scale-95 transition-transform shrink-0"
            aria-label="Navigation Menu"
          >
            {mobileMenuOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
          
          <Link 
            to="/pos" 
            className="flex items-center gap-1.5 sm:gap-2 min-w-0 hover:opacity-90 transition-opacity flex-1 overflow-hidden" 
            onClick={() => sound.playClick()}
          >
            <StoreLogoBadge 
              size="sm" 
              allowDirectUpload={false} 
              showHoverOverlay={false}
              className="shrink-0"
            />
            <span className="font-extrabold text-[13px] sm:text-[15px] tracking-tight truncate text-white select-none">
              {settings.storeName || 'NALI MOBILE'}
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              setIsIPhoneInstallOpen(true);
            }}
            className="p-1.5 sm:p-2 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl active:scale-95 transition-all flex items-center justify-center"
            title="Install Nali Mobile Web App on iPhone / iPad"
            aria-label="Install on iPhone"
          >
            <Smartphone size={16} />
          </button>
          <LanguageSelector />
          <LiveExchangeRate />
          <NotificationBell />
        </div>
      </div>

      {/* Modern Ultra-Polished Sidebar */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenCommand={() => setIsCommandOpen(true)}
        onOpenDesignSettings={(tab?: any) => {
          setDesignSettingsTab(tab);
          setIsDesignSettingsOpen(true);
        }}
        onOpenDeviceSettings={() => setIsDeviceSettingsOpen(true)}
        onOpenOfflineSync={() => setIsOfflineSyncOpen(true)}
        onOpenSignOutModal={() => setIsSignOutModalOpen(true)}
        onOpenIPhoneInstall={() => setIsIPhoneInstallOpen(true)}
      />

      {/* Main App Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Desktop Top Header Utility Bar */}
        <header id="app-desktop-header" className="hidden md:flex items-center justify-between px-6 py-2.5 bg-[#070913]/80 border-b border-white/[0.06] backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-300">
              {activeMeta.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playClick();
                setIsIPhoneInstallOpen(true);
              }}
              className="px-2.5 py-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl active:scale-95 transition-all flex items-center gap-1.5"
              title="Install Nali Mobile Web App on iPhone / iPad"
            >
              <Smartphone size={14} />
              <span>Install Web App</span>
            </button>
            <LanguageSelector />
            <LiveExchangeRate />
            <NotificationBell showSoundToggle={true} />
          </div>
        </header>

        {/* Dynamic Page Router Container */}
        <main id="app-main-viewport" className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-7 pb-24 md:pb-8">
          <div id="app-page-content" className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Real-time Toast Alerts Manager */}
      <ToastManager />

      {/* Notification Center Slide-over Drawer */}
      <NotificationCenter />

      {/* Notification Settings Modal */}
      <NotificationSettingsModal />

      {/* Real-Time Alert Simulator Playground Modal */}
      <NotificationSimulatorModal />

      {/* Persistent Mobile & Tablet Bottom Navigation Bar */}
      <div id="app-bottom-nav">
        <BottomNavigation
          onOpenCommand={() => setIsCommandOpen(true)}
          onOpenSettings={() => setIsDeviceSettingsOpen(true)}
          onOpenDesignSettings={() => setIsDesignSettingsOpen(true)}
          onOpenOfflineSync={() => setIsOfflineSyncOpen(true)}
          onOpenSignOutModal={() => setIsSignOutModalOpen(true)}
          onOpenIPhoneWidgets={() => setIsIPhoneWidgetsOpen(true)}
        />
      </div>

      {/* Global Command Menu */}
      <CommandMenu
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onOpenSettings={() => setIsDeviceSettingsOpen(true)}
        onOpenDesignSettings={() => setIsDesignSettingsOpen(true)}
      />

      {/* Device & Camera Hardware Settings Modal */}
      <DeviceSettingsModal
        isOpen={isDeviceSettingsOpen}
        onClose={() => setIsDeviceSettingsOpen(false)}
        onOpenDesignSettings={() => {
          setIsDeviceSettingsOpen(false);
          setIsDesignSettingsOpen(true);
        }}
      />

      {/* Master Design & Theme Settings Studio Modal */}
      <DesignSettingsModal
        isOpen={isDesignSettingsOpen}
        onClose={() => {
          setIsDesignSettingsOpen(false);
          setDesignSettingsTab(undefined);
        }}
        initialTab={designSettingsTab}
      />

      {/* Offline & Sync Center Modal */}
      <OfflineSyncModal
        isOpen={isOfflineSyncOpen}
        onClose={() => setIsOfflineSyncOpen(false)}
      />

      {/* Sign Out / Switch Account Modal */}
      <SignOutModal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
      />

      {/* Supabase Storage & Database Cleanup Modal */}
      <StorageCleanupModal
        isOpen={isStorageCleanupOpen}
        onClose={() => setIsStorageCleanupOpen(false)}
      />

      {/* iPhone Live Widgets Hub & Simulator Modal */}
      <IPhoneWidgetsModal
        isOpen={isIPhoneWidgetsOpen}
        onClose={() => setIsIPhoneWidgetsOpen(false)}
      />

      {/* iPhone Standalone Web App Installation Modal */}
      <IPhoneInstallModal
        isOpen={isIPhoneInstallOpen}
        onClose={() => setIsIPhoneInstallOpen(false)}
      />
    </div>
  );
}
