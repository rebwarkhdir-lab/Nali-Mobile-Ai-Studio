import React, { useState, useRef } from 'react';
import { 
  Palette, 
  Moon, 
  Sun, 
  Smartphone, 
  Sparkles, 
  Sliders, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Download, 
  Upload, 
  Check, 
  X, 
  Eye, 
  Zap, 
  DollarSign, 
  Layers, 
  Maximize2, 
  Minimize2, 
  ShieldAlert, 
  Copy, 
  CheckCheck,
  Flame,
  LayoutGrid,
  ChevronRight,
  TrendingUp,
  ShoppingCart,
  Coins,
  Camera,
  Image as ImageIcon,
  Store,
  Trash2,
  HardDrive,
  RefreshCcw,
  Search,
  Package,
  Calendar,
  Building2,
  Filter,
  AlertTriangle
} from 'lucide-react';
import { useDesignSystem } from '../../context/DesignContext';
import { THEME_PALETTES, CURATED_PRESETS, ThemePalette, AppearanceMode, UiDensity, CornerRadius, FontScale } from '../../types/design';
import { sound } from '../../lib/sound';
import { supabase } from '../../lib/supabase';
import { idb } from '../../lib/idbService';
import { useToast } from './Toast';
import { formatCurrency, formatDualPrice } from '../../lib/utils';
import StoreLogoBadge from './StoreLogoBadge';
import StorageCleanupModal from './StorageCleanupModal';
import { useTranslation } from 'react-i18next';
import { recycleBinService, RecycleBinItem } from '../../lib/recycleBinService';
import { format } from 'date-fns';

interface DesignSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: TabType;
}

type TabType = 'branding' | 'palettes' | 'appearance' | 'geometry' | 'currency' | 'audio' | 'presets' | 'backup' | 'recycle_bin';


const RESET_CATEGORIES = [
  { id: 'mobiles', label: 'Mobile Devices' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'debts', label: 'Customer Debts' },
  { id: 'installments', label: 'Installments' },
  { id: 'suppliers', label: 'Suppliers & Invoices' },
  { id: 'returns', label: 'Returns & Refunds' },
  { id: 'screen_protectors', label: 'Screen Protectors' },
  { id: 'barcodes', label: 'Barcode Studio' },
  { id: 'reports', label: 'Reports & Sales' },
  { id: 'admin', label: 'Staff & Roles' },
  { id: 'settings', label: 'Design Settings' },
  { id: 'notifications', label: 'Alerts & Audit Logs' },
];

export default function DesignSettingsModal({ isOpen, onClose, initialTab }: DesignSettingsModalProps) {
  const { t } = useTranslation();
  const { 
    settings, 
    updateSettings, 
    applyPreset, 
    resetToDefaults, 
    exportProfile, 
    importProfile,
    activeThemeInfo,
    currentPresetId
  } = useDesignSystem();

  const getThemeName = (themeId: string, fallbackName: string) => {
    return t(`settings.design.themeNames.${themeId}`, fallbackName);
  };
  const getThemeSubtitle = (themeId: string, fallbackSubtitle: string) => {
    return t(`settings.design.themeNames.${themeId}-sub`, fallbackSubtitle);
  };
  const getPresetName = (presetId: string, fallbackName: string) => {
    return t(`settings.design.presetItems.${presetId}.name`, fallbackName);
  };
  const getPresetDesc = (presetId: string, fallbackDesc: string) => {
    return t(`settings.design.presetItems.${presetId}.desc`, fallbackDesc);
  };
  const getPresetBadge = (presetId: string, fallbackBadge: string) => {
    return t(`settings.design.presetItems.${presetId}.badge`, fallbackBadge);
  };

  const { success, error: toastError, info } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'palettes');
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportBox, setShowImportBox] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exchangeRateInput, setExchangeRateInput] = useState<string>(settings.exchangeRate.toString());
  const [isStorageCleanupOpen, setIsStorageCleanupOpen] = useState(false);

  const [confirmResetSettings, setConfirmResetSettings] = useState(false);
  const [confirmFactoryReset, setConfirmFactoryReset] = useState(false);
  const [factoryResetText, setFactoryResetText] = useState('');
  const [resetOptions, setResetOptions] = useState<Record<string, boolean>>({
    mobiles: true, accessories: true, debts: true, installments: true,
    suppliers: true, returns: true, screen_protectors: true, barcodes: true,
    reports: true, admin: false, settings: false, notifications: true
  });

  const [isErasing, setIsErasing] = useState(false);
  const [eraseStatus, setEraseStatus] = useState('Erasing selected databases...');

  const logoInputRef = useRef<HTMLInputElement>(null);

  // Recycle Bin State
  const [binItems, setBinItems] = useState<RecycleBinItem[]>([]);
  const [binLoading, setBinLoading] = useState(false);
  const [binFilterType, setBinFilterType] = useState<string>('all');
  const [binSearchQuery, setBinSearchQuery] = useState<string>('');
  
  const [binItemToDelete, setBinItemToDelete] = useState<{id: string, name: string} | null>(null);
  const [confirmEmptyBin, setConfirmEmptyBin] = useState(false);

  React.useEffect(() => {
    setExchangeRateInput(settings.exchangeRate.toString());
  }, [settings.exchangeRate]);


  const loadBinItems = async () => {
    setBinLoading(true);
    try {
      const items = await recycleBinService.getDeletedItems();
      setBinItems(items);
    } catch (err) {
      console.error(err);
    } finally {
      setBinLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      loadBinItems();
    }
  }, [isOpen, initialTab]);

  React.useEffect(() => {
    if (isOpen && activeTab === 'recycle_bin') {
      loadBinItems();
    }
  }, [isOpen, activeTab]);

  const handleRecoverBinItem = async (id: string, name: string) => {
    sound.playClick();
    const ok = await recycleBinService.restoreItem(id);
    if (ok) {
      sound.playSuccess();
      success(`"${name}" successfully restored!`);
      setBinItems(prev => prev.filter(i => i.id !== id));
    } else {
      sound.playAlert();
      toastError(`Failed to restore "${name}".`);
    }
  };

  const handleDeletePermanentlyBinItem = (id: string, name: string) => {
    sound.playAlert();
    setBinItemToDelete({ id, name });
  };

  const confirmDeletePermanently = async () => {
    if (!binItemToDelete) return;
    await recycleBinService.permanentlyDelete(binItemToDelete.id);
    success(`"${binItemToDelete.name}" permanently removed.`);
    setBinItems(prev => prev.filter(i => i.id !== binItemToDelete.id));
    setBinItemToDelete(null);
  };

  const handleEmptyRecycleBin = () => {
    sound.playAlert();
    setConfirmEmptyBin(true);
  };

  const confirmEmptyBinAction = async () => {
    await recycleBinService.clearBin();
    success('Recycle bin has been completely emptied.');
    setBinItems([]);
    setConfirmEmptyBin(false);
  };

  const getBinTypeBadge = (type: string) => {
    switch (type) {
      case 'mobile':
        return {
          label: 'Mobile',
          icon: <Smartphone className="w-4 h-4" />,
          bg: 'bg-sky-500/10',
          text: 'text-sky-400',
          border: 'border-sky-500/20'
        };
      case 'accessory':
        return {
          label: 'Accessory',
          icon: <Package className="w-4 h-4" />,
          bg: 'bg-purple-500/10',
          text: 'text-purple-400',
          border: 'border-purple-500/20'
        };
      case 'debt':
        return {
          label: 'Customer Debt',
          icon: <Coins className="w-4 h-4" />,
          bg: 'bg-amber-500/10',
          text: 'text-amber-400',
          border: 'border-amber-500/20'
        };
      case 'installment':
        return {
          label: 'Installment Plan',
          icon: <Calendar className="w-4 h-4" />,
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-400',
          border: 'border-emerald-500/20'
        };
      case 'supplier':
        return {
          label: 'Supplier',
          icon: <Building2 className="w-4 h-4" />,
          bg: 'bg-blue-500/10',
          text: 'text-blue-400',
          border: 'border-blue-500/20'
        };
      default:
        return {
          label: type,
          icon: <Trash2 className="w-4 h-4" />,
          bg: 'bg-slate-800',
          text: 'text-slate-300',
          border: 'border-slate-700'
        };
    }
  };

  const filteredBinItems = binItems.filter(item => {
    const matchesType = binFilterType === 'all' || item.type === binFilterType;
    const matchesSearch = !binSearchQuery.trim() || 
      (item.name && item.name.toLowerCase().includes(binSearchQuery.toLowerCase())) ||
      (item.id && item.id.toLowerCase().includes(binSearchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  if (!isOpen) return null;

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toastError('Please select an image smaller than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Optimal square logo resolution (max 384x384 for fast cross-device sync)
        const canvas = document.createElement('canvas');
        const maxDim = 384;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          let dataUrl = '';
          try {
            dataUrl = canvas.toDataURL('image/webp', 0.88);
            if (!dataUrl.startsWith('data:image/webp')) {
              dataUrl = canvas.toDataURL('image/png');
            }
          } catch {
            dataUrl = canvas.toDataURL('image/png');
          }
          updateSettings({ customLogoUrl: dataUrl });
          sound.playSuccess();
          success(t('settings.design.feedback.logoUpdated', 'Store logo updated successfully!'));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleCopyProfile = () => {
    sound.playClick();
    const json = exportProfile();
    navigator.clipboard.writeText(json);
    setCopied(true);
    success(t('settings.design.feedback.copySuccess', 'Design profile JSON copied to clipboard!'));
    setTimeout(() => setCopied(false), 2500);
  };

  const handleImportProfile = () => {
    if (!importJsonText.trim()) return;
    const res = importProfile(importJsonText);
    if (res.success) {
      success(t('settings.design.feedback.importSuccess', 'Theme profile applied successfully!'));
      setShowImportBox(false);
      setImportJsonText('');
    } else {
      toastError(res.error || 'Failed to import profile');
    }
  };

  const handleSaveExchangeRate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(exchangeRateInput);
    if (!isNaN(parsed) && parsed > 0) {
      updateSettings({ exchangeRate: parsed });
      sound.playSuccess();
      success(t('settings.design.currency.updatedToast', { rate: parsed.toLocaleString(), defaultValue: `Exchange rate successfully updated: $1 = ${parsed.toLocaleString()} IQD` }));
    }
  };

  const navTabs: { id: TabType; label: string; icon: any; badge?: string }[] = [
    { id: 'branding', label: t('settings.design.tabs.branding', 'Store Logo & Brand'), icon: Store, badge: t('common.new', 'New') },
    { id: 'palettes', label: t('settings.design.tabs.palettes', 'Color Themes'), icon: Palette },
    { id: 'appearance', label: t('settings.design.tabs.appearance', 'Dark / Light / OLED'), icon: (settings.appearance || 'dark') === 'light' ? Sun : Moon },
    { id: 'geometry', label: t('settings.design.tabs.geometry', 'Density & Scale'), icon: Sliders },
    { id: 'currency', label: t('settings.design.tabs.currency', 'Currency & Rates'), icon: DollarSign },
    { id: 'audio', label: t('settings.design.tabs.audio', 'Audio & Motion'), icon: settings.soundEnabled ? Volume2 : VolumeX },
    { id: 'presets', label: t('settings.design.tabs.presets', '1-Click Presets'), icon: Zap, badge: 'Pro' },
    { id: 'backup', label: t('settings.design.tabs.backup', 'Sync & System'), icon: Download },
    { id: 'recycle_bin', label: t('settings.design.tabs.recycleBin', 'Recycle Bin'), icon: Trash2, badge: (binItems?.length || 0) > 0 ? `${binItems?.length || 0}` : undefined },
  ];

  // Sample data for real-time preview card
  const sampleDual = formatDualPrice(1250, 'USD', settings.exchangeRate);

  return (
    <>
      {isErasing && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center text-white">
          <div className="w-16 h-16 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin mb-6 shadow-[0_0_30px_rgba(244,63,94,0.3)]" />
          <h2 className="text-2xl font-bold tracking-tight mb-2 text-center px-4">{eraseStatus}</h2>
          <p className="text-slate-400 text-sm max-w-md text-center px-4 mt-2">
            This operation is securely deleting all connected rows. Please do not close this window or refresh the page.
          </p>
        </div>
      )}
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[95] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#101524] rounded-3xl border border-slate-700/70 shadow-[0_20px_70px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0c101d] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl ${activeThemeInfo.previewClass} flex items-center justify-center text-white shadow-lg`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-white text-lg tracking-tight">
                  {t('settings.design.title', 'Design & System Studio')}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {getThemeName(activeThemeInfo.id, activeThemeInfo.name)}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide bg-slate-800 text-slate-300 border border-slate-700">
                  {(settings.appearance || 'dark').toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {t('settings.design.subtitle', 'Control visual aesthetics, themes, density, and dual currency across Nali Mobile')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                resetToDefaults();
                success(t('settings.design.feedback.resetDefaults', 'Reset to factory design defaults'));
              }}
              title={t('settings.design.feedback.confirmReset', 'Reset all design settings to default')}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl transition-colors text-xs flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">{t('common.reset', 'Reset')}</span>
            </button>
            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Interactive Preview Bar */}
        <div className="px-6 py-3 bg-[#080b15] border-b border-slate-800/80 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Eye className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>{t('settings.design.header.liveThemePreview', 'Live Theme Preview:')}</span>
            </div>

            {/* Mini preview components */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Sample Stat Badge */}
              <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/60 flex items-center gap-2 shadow-inner">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeThemeInfo.primaryColor }} />
                <span className="text-xs text-slate-300 font-medium">{t('settings.design.header.dailyProfit', 'Daily Profit:')}</span>
                <span className="text-xs font-bold text-white tabular-nums">+$4,280</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-emerald-500/20 text-emerald-400">
                  +18.4%
                </span>
              </div>

              {/* Sample Dual Price Badge */}
              <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/60 flex items-center gap-2 shadow-inner">
                <span className="text-xs text-white font-bold tabular-nums">$1,250</span>
                <span className="text-[10px] text-slate-400 font-mono">({(1250 * settings.exchangeRate).toLocaleString()} IQD)</span>
              </div>

              {/* Sample Action Button */}
              <button
                type="button"
                onClick={() => sound.playSuccess()}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold text-white ${activeThemeInfo.previewClass} shadow-md active:scale-95 transition-transform flex items-center gap-1.5 cursor-pointer`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>{t('settings.design.header.testAction', 'Test Action')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body: Tabs Sidebar + Content */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          
          {/* Navigation Tab Bar */}
          <div className="w-full md:w-56 bg-[#0a0d18] border-b md:border-b-0 md:border-r border-slate-800 p-2 md:p-3 shrink-0 flex md:flex-col overflow-x-auto md:overflow-y-auto gap-1">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    sound.playClick();
                    setActiveTab(tab.id);
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 md:shrink ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span className="hidden md:inline-block text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
            
            {/* TAB: STORE BRANDING & LOGO */}
            {activeTab === 'branding' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Store className="w-4 h-4 text-indigo-400" />
                    {t('settings.design.branding.title', 'Store Branding & Custom Logo')}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t('settings.design.branding.subtitle', 'Customize your shop logo, store name, and sidebar badge appearance across all POS screens')}
                  </p>
                </div>

                {/* Logo Preview & Upload Section */}
                <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-5">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                    className="hidden"
                    onChange={handleLogoFileChange}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-2xl bg-[#0a0d18] border border-white/10 shrink-0">
                        <StoreLogoBadge 
                          size="xl" 
                          allowDirectUpload={true}
                          showHoverOverlay={true}
                          className="shadow-2xl" 
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{settings.storeName || 'NALI POS'}</span>
                          {settings.customLogoUrl ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {t('settings.design.branding.customLogoActive', 'Custom Picture Active')}
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              {t('settings.design.branding.defaultLogoInitials', 'Default Initials (NM)')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          {t('settings.design.branding.uploadPrompt', 'Click the badge or the upload button to choose a PNG, JPG, or SVG image (max 5MB).')}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          logoInputRef.current?.click();
                        }}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-600/20 active:scale-95"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{settings.customLogoUrl ? t('settings.design.branding.changeLogo', 'Change Picture') : t('settings.design.branding.uploadLogo', 'Upload Logo')}</span>
                      </button>

                      {settings.customLogoUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            updateSettings({ customLogoUrl: null });
                            success(t('settings.design.feedback.logoRemoved', 'Reset logo back to default initials'));
                          }}
                          className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t('settings.design.branding.removeLogo', 'Remove')}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Form Inputs: Store Name & Subtitle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300">
                        {t('settings.design.branding.storeNameLabel', 'Store Name (Sidebar & Top Header)')}
                      </label>
                      <input
                        type="text"
                        value={settings.storeName || ''}
                        onChange={(e) => updateSettings({ storeName: e.target.value })}
                        placeholder={t('settings.design.branding.storeNamePlaceholder', 'e.g. NALI POS, Nali Mobile...')}
                        className="w-full bg-[#0a0d18] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300">
                        {t('settings.design.branding.storeSubtitleLabel', 'Status Subtitle')}
                      </label>
                      <input
                        type="text"
                        value={settings.storeSubtitle || ''}
                        onChange={(e) => updateSettings({ storeSubtitle: e.target.value })}
                        placeholder={t('settings.design.branding.storeSubtitlePlaceholder', 'e.g. Terminal Active, Cashier #1...')}
                        className="w-full bg-[#0a0d18] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Logo Styling Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Shape Option */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <div className="text-xs font-bold text-white">{t('settings.design.branding.logoShape', 'Logo Corner Shape')}</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['rounded', 'circle', 'square'] as const).map((shape) => (
                        <button
                          key={shape}
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            updateSettings({ logoShape: shape });
                          }}
                          className={`py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                            (settings.logoShape || 'rounded') === shape
                              ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50 shadow-sm'
                              : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {t(`settings.design.branding.shapes.${shape}`, shape)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fit Mode */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <div className="text-xs font-bold text-white">{t('settings.design.branding.logoFit', 'Picture Scaling (Fit)')}</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['cover', 'contain', 'fill'] as const).map((fit) => (
                        <button
                          key={fit}
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            updateSettings({ logoFit: fit });
                          }}
                          className={`py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                            (settings.logoFit || 'cover') === fit
                              ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50 shadow-sm'
                              : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {t(`settings.design.branding.fits.${fit}`, fit)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Background Tone */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <div className="text-xs font-bold text-white">{t('settings.design.branding.logoBg', 'Background Frame')}</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['white', 'dark', 'transparent', 'primary'] as const).map((bg) => (
                        <button
                          key={bg}
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            updateSettings({ logoBgColor: bg });
                          }}
                          className={`py-2 px-1 rounded-xl text-[11px] font-bold capitalize transition-all border truncate ${
                            (settings.logoBgColor || 'white') === bg
                              ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50 shadow-sm'
                              : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {t(`settings.design.branding.bgColors.${bg}`, bg)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live Demonstration in Sidebar Header Format */}
                <div className="p-4 rounded-2xl bg-[#080b15] border border-white/10 space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest text-[10px]">
                    {t('settings.design.branding.livePreviewTitle', 'Live Sidebar Top Header Preview:')}
                  </div>
                  <div className="flex items-center gap-3.5 bg-[#0B0F19] p-3 rounded-xl border border-white/[0.04] max-w-sm">
                    <StoreLogoBadge size="md" allowDirectUpload={false} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-white truncate">{settings.storeName || 'NALI POS'}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>{settings.storeSubtitle || t('settings.design.branding.terminalActive', 'Terminal Active')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 1: COLOR THEMES */}
            {activeTab === 'palettes' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Palette className="w-4 h-4 text-indigo-400" />
                    {t('settings.design.palettes.title', 'Curated Color Themes')}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t('settings.design.palettes.subtitle', 'Select a signature color palette tailored for luxury retail, dark terminals, or finance')}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {THEME_PALETTES.map((p) => {
                    const isSelected = settings.theme === p.id;
                    const localizedName = getThemeName(p.id, p.name);
                    const localizedSubtitle = getThemeSubtitle(p.id, p.subtitle);
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          sound.playClick();
                          updateSettings({ theme: p.id });
                          success(t('settings.design.feedback.themeApplied', { name: localizedName, defaultValue: `Theme applied: ${localizedName}` }));
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                          isSelected
                            ? 'bg-slate-900/90 border-indigo-500/60 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-500/10'
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-bold text-white flex items-center gap-2">
                              <span>{localizedName}</span>
                              {isSelected && (
                                <span className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px]">
                                  <Check className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">{localizedSubtitle}</div>
                          </div>

                          <div className={`w-10 h-6 rounded-lg ${p.previewClass} shadow-inner shrink-0`} />
                        </div>

                        {/* Color swatches */}
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
                          <div className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded-full border border-black/30" style={{ backgroundColor: p.primaryColor }} />
                            <span className="w-3.5 h-3.5 rounded-full border border-black/30" style={{ backgroundColor: p.secondaryColor }} />
                          </div>
                          <span className="text-[11px] font-mono text-slate-500">
                            {p.primaryColor} • {p.secondaryColor}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: APPEARANCE & LIGHTING */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Moon className="w-4 h-4 text-indigo-400" />
                    {t('settings.design.appearance.title', 'Appearance & Background Lighting')}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t('settings.design.appearance.subtitle', 'Choose between deep dark space, true OLED pitch black, or clean daylight mode')}
                  </p>
                </div>

                {/* Appearance mode 3-way toggle */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'dark' as AppearanceMode,
                      title: t('settings.design.appearance.midnightTitle', 'Midnight Dark'),
                      subtitle: t('settings.design.appearance.midnightDesc', 'Signature #0b0f1a slate for low eye fatigue'),
                      icon: Moon,
                      bgPreview: 'bg-[#0b0f1a] border-slate-800'
                    },
                    {
                      id: 'oled' as AppearanceMode,
                      title: t('settings.design.appearance.oledTitle', 'OLED Pure Black'),
                      subtitle: t('settings.design.appearance.oledDesc', 'Infinite #000000 true black for AMOLED screens'),
                      icon: Smartphone,
                      bgPreview: 'bg-black border-slate-800'
                    },
                    {
                      id: 'light' as AppearanceMode,
                      title: t('settings.design.appearance.lightTitle', 'Alabaster Light'),
                      subtitle: t('settings.design.appearance.lightDesc', 'Clean high-contrast light theme for sunny counters'),
                      icon: Sun,
                      bgPreview: 'bg-[#f4f6fb] border-slate-300 text-slate-900'
                    },
                  ].map((mode) => {
                    const isSelected = (settings.appearance || 'dark') === mode.id;
                    const Icon = mode.icon;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          updateSettings({ appearance: mode.id });
                          success(t('settings.design.feedback.appearanceSet', { title: mode.title, defaultValue: `Appearance set to ${mode.title}` }));
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all relative ${
                          isSelected
                            ? 'bg-slate-900/90 border-indigo-500/60 ring-2 ring-indigo-500/20'
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className={`p-2 rounded-xl ${isSelected ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                        </div>
                        <div className="text-sm font-bold text-white">{mode.title}</div>
                        <div className="text-xs text-slate-400 mt-1">{mode.subtitle}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Visual FX Toggles */}
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t('settings.design.appearance.fxSectionTitle', 'Visual Effects & Lighting')}
                  </h4>
                  
                  <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <div className="text-xs font-semibold text-white">{t('settings.design.appearance.glassmorphismLabel', 'Frosted Glassmorphism')}</div>
                        <div className="text-[11px] text-slate-400">{t('settings.design.appearance.glassmorphismDesc', 'Translucent backdrop blur on headers and modals')}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.glassmorphism}
                        onChange={(e) => updateSettings({ glassmorphism: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-slate-800/60">
                      <div>
                        <div className="text-xs font-semibold text-white">{t('settings.design.appearance.neonGlowLabel', 'Ambient Neon Glow Accents')}</div>
                        <div className="text-[11px] text-slate-400">{t('settings.design.appearance.neonGlowDesc', 'Luminous soft shadows on active tabs and action buttons')}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.glowEffects}
                        onChange={(e) => updateSettings({ glowEffects: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-slate-800/60">
                      <div>
                        <div className="text-xs font-semibold text-white">{t('settings.design.appearance.contrastBordersLabel', 'High-Contrast Borders')}</div>
                        <div className="text-[11px] text-slate-400">{t('settings.design.appearance.contrastBordersDesc', 'Elevated line borders for visibility in direct lighting')}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.highContrast}
                        onChange={(e) => updateSettings({ highContrast: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: DENSITY & GEOMETRY */}
            {activeTab === 'geometry' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    {t('settings.design.geometry.title', 'UI Density, Geometry & Typography')}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t('settings.design.geometry.subtitle', 'Fine-tune spacing for rapid POS cashiering, standard screens, or touch tablets')}
                  </p>
                </div>

                {/* UI Density */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">
                    {t('settings.design.geometry.densityLabel', 'Screen Data Density:')}
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { 
                        id: 'compact' as UiDensity, 
                        label: t('settings.design.geometry.densities.compact.name', 'Compact Cashier'), 
                        desc: t('settings.design.geometry.densities.compact.desc', 'Dense tables & tight cells') 
                      },
                      { 
                        id: 'standard' as UiDensity, 
                        label: t('settings.design.geometry.densities.standard.name', 'Standard Balanced'), 
                        desc: t('settings.design.geometry.densities.standard.desc', 'Ergonomic comfortable spacing') 
                      },
                      { 
                        id: 'spacious' as UiDensity, 
                        label: t('settings.design.geometry.densities.spacious.name', 'Spacious Tablet'), 
                        desc: t('settings.design.geometry.densities.spacious.desc', 'Large touch targets for iPads') 
                      },
                    ].map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          updateSettings({ density: d.id });
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          settings.density === d.id
                            ? 'bg-indigo-600/20 border-indigo-500 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="text-xs font-bold">{d.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{d.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Corner Radius */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">
                    {t('settings.design.geometry.radiusLabel', 'Card Corner Geometry:')}
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'sharp' as CornerRadius, label: t('settings.design.geometry.radii.sharp', 'Sharp Minimal (6px)'), icon: Minimize2 },
                      { id: 'rounded' as CornerRadius, label: t('settings.design.geometry.radii.rounded', 'Modern Balanced (16px)'), icon: Layers },
                      { id: 'smooth' as CornerRadius, label: t('settings.design.geometry.radii.smooth', 'Luxury Smooth (24px)'), icon: Maximize2 },
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          updateSettings({ radius: r.id });
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          settings.radius === r.id
                            ? 'bg-indigo-600/20 border-indigo-500 text-white'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="text-xs font-bold">{r.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Scaling & Numerals */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <label className="block text-xs font-semibold text-white">
                      {t('settings.design.geometry.fontScaleLabel', 'System Font Scaling:')}
                    </label>
                    <div className="flex gap-2">
                      {[
                        { id: 'small' as FontScale, label: t('settings.design.geometry.scales.small', 'Compact (90%)') },
                        { id: 'medium' as FontScale, label: t('settings.design.geometry.scales.medium', 'Standard (100%)') },
                        { id: 'large' as FontScale, label: t('settings.design.geometry.scales.large', 'Large (110%)') },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => updateSettings({ fontScale: f.id })}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                            settings.fontScale === f.id
                              ? 'bg-indigo-600/30 border-indigo-500 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <label className="block text-xs font-semibold text-white">
                      {t('settings.design.geometry.numberFontLabel', 'Number & Accounting Font:')}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateSettings({ numberFont: 'tabular-mono' })}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border font-mono transition-colors ${
                          settings.numberFont === 'tabular-mono'
                            ? 'bg-indigo-600/30 border-indigo-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {t('settings.design.geometry.tabularMono', '123 Tabular Mono')}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSettings({ numberFont: 'standard-sans' })}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border font-sans transition-colors ${
                          settings.numberFont === 'standard-sans'
                            ? 'bg-indigo-600/30 border-indigo-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {t('settings.design.geometry.standardSans', '123 Standard')}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 4: CURRENCY & DATA */}
            {activeTab === 'currency' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-amber-400" />
                    {t('settings.design.currency.title', 'Dual Currency & Data Display')}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t('settings.design.currency.subtitle', 'Configure master exchange rates, primary currency preference, and format rules')}
                  </p>
                </div>

                {/* Master Exchange Rate Box */}
                <form onSubmit={handleSaveExchangeRate} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        {t('settings.design.currency.masterRateTitle', 'Master Shop Exchange Rate')}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {t('settings.design.currency.masterRateDesc', 'Propagates across POS, Mobiles, Accessories, Reports & Invoices')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400">$1 USD =</span>
                      <input
                        type="number"
                        step="1"
                        value={exchangeRateInput}
                        onChange={(e) => setExchangeRateInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-20 pr-14 py-2.5 text-xs text-white font-mono font-bold"
                        placeholder="1500"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">IQD</span>
                    </div>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 shrink-0"
                    >
                      {t('settings.design.currency.updateRate', 'Update Rate')}
                    </button>
                  </div>
                </form>

                {/* Display Preferences */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <label className="block text-xs font-semibold text-white">
                      {t('settings.design.currency.primaryCurrencyLabel', 'Primary Currency Display:')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateSettings({ primaryCurrency: 'USD' })}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-colors ${
                          settings.primaryCurrency === 'USD'
                            ? 'bg-indigo-600/30 border-indigo-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {t('settings.design.currency.usdFirst', 'USD ($) First')}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSettings({ primaryCurrency: 'IQD' })}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-colors ${
                          settings.primaryCurrency === 'IQD'
                            ? 'bg-indigo-600/30 border-indigo-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {t('settings.design.currency.iqdFirst', 'IQD (د.ع) First')}
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <label className="block text-xs font-semibold text-white">
                      {t('settings.design.currency.formattingLabel', 'Number Formatting:')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateSettings({ currencyNotation: 'standard' })}
                        className={`p-2.5 rounded-xl border text-center text-xs font-medium transition-colors ${
                          settings.currencyNotation === 'standard'
                            ? 'bg-indigo-600/30 border-indigo-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {t('settings.design.currency.formatFull', '$1,250.00 (Full)')}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateSettings({ currencyNotation: 'compact' })}
                        className={`p-2.5 rounded-xl border text-center text-xs font-medium transition-colors ${
                          settings.currencyNotation === 'compact'
                            ? 'bg-indigo-600/30 border-indigo-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {t('settings.design.currency.formatCompact', '$1.25k (Compact)')}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {t('settings.design.currency.dualBadgesLabel', 'Dual Currency Tag Badges')}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {t('settings.design.currency.dualBadgesDesc', 'Show parallel IQD/USD conversion sub-labels under prices')}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showDualCurrencyBadges}
                    onChange={(e) => updateSettings({ showDualCurrencyBadges: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                  />
                </div>

                {/* Automated Low-Stock Alert Threshold */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        {t('settings.design.currency.lowStockThresholdLabel', 'Low-Stock Notification Threshold')}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {t('settings.design.currency.lowStockThresholdDesc', 'Triggers automatic warning banners on the dashboard whenever products reach or fall below this quantity.')}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {[1, 2, 3, 5, 10, 15].map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          updateSettings({ lowStockThreshold: qty });
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                          settings.lowStockThreshold === qty
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        ≤ {qty} {t('settings.design.currency.units', 'units')}
                      </button>
                    ))}

                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="text-[11px] text-slate-400">{t('common.custom', 'Custom')}:</span>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={settings.lowStockThreshold || 3}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          updateSettings({ lowStockThreshold: Math.max(1, Math.min(99, val)) });
                        }}
                        className="w-14 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono font-bold text-center focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 5: AUDIO & MOTION */}
            {activeTab === 'audio' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                    {t('settings.design.audio.title', 'Audio Feedback & Motion Performance')}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t('settings.design.audio.subtitle', 'Customize sound feedback on barcode scan, sales completion, and animation speed')}
                  </p>
                </div>

                {/* Sound Master Card */}
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${settings.soundEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>
                        {settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {t('settings.design.audio.soundEngineLabel', 'Web Audio Sound Engine')}
                        </div>
                        <div className="text-xs text-slate-400">
                          {t('settings.design.audio.soundEngineDesc', 'Immediate synthesized audio chimes for sales & barcode scans')}
                        </div>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={settings.soundEnabled}
                      onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                      className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 bg-slate-800 border-slate-700"
                    />
                  </div>

                  {settings.soundEnabled && (
                    <div className="space-y-3 pt-3 border-t border-slate-800">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{t('settings.design.audio.masterVolume', 'Master Volume')}</span>
                        <span className="font-mono text-cyan-400 font-bold">{settings.soundVolume}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.soundVolume}
                        onChange={(e) => updateSettings({ soundVolume: parseInt(e.target.value) })}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />

                      {/* Test Sound triggers */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => sound.playScanSuccess()}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
                        >
                          🔊 {t('settings.design.audio.testScan', 'Test Scan Chime')}
                        </button>
                        <button
                          type="button"
                          onClick={() => sound.playPaymentSuccess()}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
                        >
                          🎉 {t('settings.design.audio.testSale', 'Test Sale Success')}
                        </button>
                        <button
                          type="button"
                          onClick={() => sound.playClick()}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
                        >
                          🔘 {t('settings.design.audio.testClick', 'Test Button Click')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Performance & Reduced Motion */}
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {t('settings.design.audio.animationsLabel', 'Enable UI Transitions & Animations')}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {t('settings.design.audio.animationsDesc', 'Disable for instantaneous zero-latency response on older POS PCs')}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableAnimations}
                    onChange={(e) => updateSettings({ enableAnimations: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                  />
                </div>

              </div>
            )}

            {/* TAB 6: 1-CLICK PRESETS */}
            {activeTab === 'presets' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Curated 1-Click Design Profiles
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pre-configured setups built for specific shop operations and hardware environments
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {CURATED_PRESETS.map((preset) => {
                    const isCurrent = currentPresetId === preset.id;
                    return (
                      <div
                        key={preset.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isCurrent
                            ? 'bg-indigo-950/40 border-indigo-500/60 ring-2 ring-indigo-500/20'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{preset.name}</span>
                            <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {preset.badge}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-emerald-500/20 text-emerald-300">
                                Active Profile
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 max-w-xl">{preset.description}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            applyPreset(preset.id);
                            success(`Applied preset: ${preset.name}`);
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                            isCurrent
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          }`}
                        >
                          {isCurrent ? 'Re-Apply Preset' : 'Apply Preset'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 7: BACKUP & SYNC */}
            {activeTab === 'backup' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Download className="w-4 h-4 text-indigo-400" />
                    Profile Sync & System Reset
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Export your custom theme settings as JSON or sync between multiple shop counters
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Export Profile */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">Export Design Profile</div>
                      <p className="text-xs text-slate-400 mt-1">Copy the configuration code to apply to your tablet, secondary POS terminal, or smartphone.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyProfile}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                    >
                      {copied ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-indigo-400" />}
                      <span>{copied ? 'Copied to Clipboard!' : 'Copy JSON Configuration'}</span>
                    </button>
                  </div>

                  {/* Import Profile */}
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">Import Design Profile</div>
                      <p className="text-xs text-slate-400 mt-1">Paste a theme configuration string from another device to sync your shop aesthetics.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowImportBox(!showImportBox)}
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold flex items-center justify-center gap-2 border border-indigo-500/30 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{showImportBox ? 'Close Import Panel' : 'Paste Profile JSON'}</span>
                    </button>
                  </div>
                </div>

                {/* Import Textbox */}
                {showImportBox && (
                  <div className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/30 space-y-3 animate-in fade-in duration-150">
                    <label className="block text-xs font-bold text-white">Paste JSON Configuration:</label>
                    <textarea
                      rows={4}
                      value={importJsonText}
                      onChange={(e) => setImportJsonText(e.target.value)}
                      placeholder='{"theme": "cyber-indigo", "appearance": "dark", ...}'
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowImportBox(false)}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleImportProfile}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
                      >
                        Apply Profile
                      </button>
                    </div>
                  </div>
                )}

                {/* Storage & Database Optimization */}
                <div className="pt-6 mt-6 border-t border-slate-800/60">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-cyan-400" />
                      {t('storageCleanup.modalTitle', 'Supabase Storage & Database Cleanup')}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t('storageCleanup.modalSubtitle', 'Scan for orphaned media assets and stale logs to reclaim cloud storage and preserve free-tier limits')}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/30 to-indigo-950/30 border border-cyan-500/30 mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Free-Tier Storage Optimizer</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          Recommended
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 max-w-xl">
                        Purge deleted product images, orphaned camera uploads, and stale audit logs while protecting active catalog items.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setIsStorageCleanupOpen(true);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/30 transition-all shrink-0"
                    >
                      <HardDrive className="w-4 h-4" />
                      <span>Launch Storage Cleanup</span>
                    </button>
                  </div>
                </div>

                {/* Recycle Bin Quick Access Card in Backup Tab */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/20 via-slate-900/60 to-slate-900/80 border border-rose-900/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                        <Trash2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">Recycle Bin & Safe Data Recovery</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            {binItems?.length || 0} {(binItems?.length || 0) === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          View, recover, or permanently remove deleted mobiles, accessories, debts, or suppliers.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setActiveTab('recycle_bin');
                      }}
                      className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Open Recycle Bin</span>
                    </button>
                  </div>
                </div>

                {/* Reset Operations */}
                <div className="pt-6 mt-6 border-t border-slate-800/60">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      System Reset
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Reset your design preferences or wipe all application data to start fresh.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {/* Reset to Default */}
                    
                    {/* Reset to Default */}
                    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="text-sm font-bold text-white">Reset to Default</div>
                        <p className="text-xs text-slate-400 mt-1">Revert all design settings (colors, themes, density) back to their original state.</p>
                      </div>
                      
                      {confirmResetSettings ? (
                        <div className="flex flex-col gap-2 animate-in fade-in zoom-in duration-200">
                          <p className="text-xs text-amber-400 font-medium text-center">Are you sure?</p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                sound.playClick();
                                resetToDefaults();
                                success('Design settings reset to default');
                                setConfirmResetSettings(false);
                              }}
                              className="flex-1 py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-xs font-bold border border-amber-500/20 transition-colors"
                            >
                              Yes, Reset
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmResetSettings(false)}
                              className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmResetSettings(true)}
                          className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Reset Settings</span>
                        </button>
                      )}
                    </div>

                    {/* Factory Reset */}
                    <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/50 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="text-sm font-bold text-rose-300">Selective Data Wipe</div>
                        <p className="text-xs text-rose-400/70 mt-1">Permanently erase selected application data and sync it with the cloud. This cannot be undone.</p>
                      </div>
                      
                      {confirmFactoryReset ? (
                        <div className="flex flex-col gap-3 animate-in fade-in zoom-in duration-200 p-3 bg-rose-950/40 rounded-xl border border-rose-900/50">
                          <div className="flex items-start gap-2 text-rose-400 mb-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p className="text-xs leading-relaxed">
                              Select the modules you want to completely erase from the cloud and local storage:
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 mb-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                            {RESET_CATEGORIES.map(cat => (
                              <label key={cat.id} className="flex items-center gap-2 p-2 rounded-lg bg-[#0a0f18]/50 border border-rose-900/30 cursor-pointer hover:bg-rose-900/20 transition-colors">
                                <input 
                                  type="checkbox" 
                                  checked={!!resetOptions[cat.id]}
                                  onChange={() => setResetOptions(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                                  className="accent-rose-500 w-3 h-3"
                                />
                                <span className="text-[10px] font-bold text-rose-200">{cat.label}</span>
                              </label>
                            ))}
                          </div>

                          <input
                            type="text"
                            value={factoryResetText}
                            onChange={(e) => setFactoryResetText(e.target.value)}
                            placeholder="Type RESET-DATABASE"
                            className="w-full bg-[#0a0f18] border border-rose-900/50 rounded-lg px-3 py-2 text-xs text-rose-200 placeholder:text-rose-900 focus:outline-none focus:border-rose-500 transition-colors uppercase"
                          />
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              disabled={factoryResetText.trim().toUpperCase() !== 'RESET-DATABASE' || isErasing || !Object.values(resetOptions).some(v => v)}
                              onClick={async () => {
                                sound.playClick();
                                setIsErasing(true);
                                setEraseStatus('Wiping cloud tables & local caches...');
                                try {
                                  const truncate = async (table: string) => {
                                    try { await supabase.from(table).delete().not('id', 'is', null); } catch(e){}
                                  };
                                  const delKey = async (key: string) => {
                                    try { await supabase.from('settings').delete().eq('key', key); } catch(e){}
                                    localStorage.removeItem(key);
                                  };

                                  const idbStoresToClear = [];
                                  const lsKeysToRemove = [];

                                  if (resetOptions.mobiles) {
                                    await truncate('nali_mobiles');
                                    idbStoresToClear.push('mobiles'); lsKeysToRemove.push('nali_mobiles_cache', 'nali_mobiles_data_v2');
                                  }
                                  if (resetOptions.accessories) {
                                    await truncate('nali_accessories');
                                    idbStoresToClear.push('accessories'); lsKeysToRemove.push('nali_accessories_cache', 'nali_accessories_data_v2');
                                  }
                                  if (resetOptions.debts) {
                                    await truncate('nali_debts'); await truncate('nali_debt_payments');
                                    idbStoresToClear.push('debts'); lsKeysToRemove.push('nali_debts_data', 'nali_pos_debts_v2');
                                  }
                                  if (resetOptions.installments) {
                                    await truncate('nali_installments'); await truncate('nali_installment_payments');
                                    idbStoresToClear.push('installments'); lsKeysToRemove.push('nali_installments_data', 'nali_pos_installments_v2');
                                  }
                                  if (resetOptions.suppliers) {
                                    await truncate('suppliers'); 
                                    await delKey('nali_suppliers_data');
                                    await delKey('nali_supplier_invoices_data');
                                    await delKey('nali_supplier_payments_data');
                                    await delKey('nali_purchase_orders');
                                    try { await idb.delete('app_settings', 'nali_supplier_invoices_data'); } catch(e){}
                                    try { await idb.delete('app_settings', 'nali_supplier_payments_data'); } catch(e){}
                                    try { await idb.delete('app_settings', 'nali_suppliers_data'); } catch(e){}
                                    try { await idb.delete('app_settings', 'nali_purchase_orders'); } catch(e){}
                                    idbStoresToClear.push('suppliers'); 
                                    lsKeysToRemove.push('nali_pos_suppliers_v2', 'nali_pos_supplier_invoices_v2', 'nali_pos_supplier_payments_v2', 'nali_suppliers_data', 'nali_supplier_invoices_data', 'nali_supplier_payments_data', 'nali_purchase_orders');
                                  }
                                  if (resetOptions.returns) {
                                    await truncate('supplier_returns');
                                    lsKeysToRemove.push('nali_supplier_returns_data', 'nali_pos_supplier_returns_v2', 'nali_pos_supplier_returns_v1');
                                    try { await idb.delete('app_settings', 'nali_supplier_returns_data'); } catch(e){}
                                    try { await supabase.from('settings').delete().eq('key', 'nali_supplier_returns_data'); } catch(e){}
                                    try { await supabase.from('settings').delete().like('key', 'nali_pos_supplier_returns%'); } catch(e){}
                                    try { await supabase.from('settings').delete().like('key', '%supplier_returns%'); } catch(e){}
                                  }
                                  if (resetOptions.screen_protectors) {
                                    await delKey('nali_screen_protectors_groups_v2');
                                    lsKeysToRemove.push('nali_screen_protectors_history_v1');
                                  }
                                  if (resetOptions.barcodes) {
                                    await delKey('nali_pos_barcode_settings');
                                  }
                                  if (resetOptions.reports) {
                                    idbStoresToClear.push('pos_sales');
                                    lsKeysToRemove.push('nali_pos_sales_v1', 'nali_pos_sales_v2', 'nali_mobiles_cache', 'nali_mobiles_data_v2', 'nali_accessories_cache', 'nali_accessories_inventory_v1');
                                    try { await supabase.from('nali_mobiles').delete().eq('status', 'sold'); } catch(e){}
                                    try { await supabase.from('nali_accessories').update({ totalSold: 0 }).neq('id', 'null'); } catch(e){}
                                    try { await supabase.from('pos_sales').delete().not('id', 'is', null); } catch(e){}
                                    try { await supabase.from('settings').delete().like('key', 'nali_pos_sales%'); } catch(e){}
                                    try { 
                                      const allMobs = await idb.getAll<any>('mobiles');
                                      for (const m of allMobs) { if (m?.status === 'sold') await idb.delete('mobiles', m.id); }
                                    } catch(e){}
                                    try { 
                                      const allAcc = await idb.getAll<any>('accessories');
                                      for (const a of allAcc) { await idb.put('accessories', { ...a, totalSold: 0 }); }
                                    } catch(e){}
                                  }
                                  if (resetOptions.admin) {
                                    await truncate('profiles'); await truncate('roles'); await truncate('permissions'); await truncate('role_permissions');
                                    lsKeysToRemove.push('nali_pos_admin_staff', 'nali_pos_admin_roles', 'nali_pos_admin_role_perms', 'nali_pos_admin_sessions', 'nali_pos_admin_audit_logs', 'nali_pos_rbac_matrices', 'nali_pos_staff_credentials');
                                    lsKeysToRemove.push('nali_pos_admin_staff_v1', 'nali_pos_admin_roles_v1', 'nali_pos_admin_role_perms_v1', 'nali_pos_admin_sessions_v1');
                                    lsKeysToRemove.push('nali_pos_custom_roles');
                                    try { await supabase.from('settings').delete().like('key', 'nali_pos_admin%'); } catch(e){}
                                    try { await supabase.from('settings').delete().eq('key', 'nali_pos_staff_credentials'); } catch(e){}
                                    try { await supabase.from('settings').delete().eq('key', 'nali_pos_rbac_matrices'); } catch(e){}
                                    try { await supabase.from('settings').delete().like('key', 'nali_admin_audit_logs%'); } catch(e){}
                                    try { await supabase.from('settings').delete().eq('key', 'nali_pos_custom_roles'); } catch(e){}
                                    
                                    // Make sure we wipe out settings in IDB as well for admin
                                    try { await idb.delete('app_settings', 'nali_pos_admin_staff_v1'); } catch(e){}
                                    try { await idb.delete('app_settings', 'nali_pos_admin_roles_v1'); } catch(e){}
                                    try { await idb.delete('app_settings', 'nali_pos_admin_role_perms_v1'); } catch(e){}
                                    try { await idb.delete('app_settings', 'nali_pos_rbac_matrices'); } catch(e){}
                                  }
                                  if (resetOptions.notifications) {
                                    await truncate('notifications'); await truncate('notification_references'); await truncate('audit_logs');
                                    await delKey('nali_pos_notifications_v2'); await delKey('nali_pos_notification_prefs_v1'); await delKey('nali_admin_audit_logs');
                                  }
                                  if (resetOptions.settings) {
                                    await delKey('nali_design_settings_v2');
                                    lsKeysToRemove.push('nali_exchange_rate');
                                  }

                                  // Clear IDB
                                  for (const s of idbStoresToClear) {
                                    try { await idb.clear(s as any); } catch(e){}
                                  }
                                  // Clear LS
                                  for (const k of lsKeysToRemove) {
                                    localStorage.removeItem(k);
                                  }

                                  // Always clear recycle bin
                                  try { await idb.clear('recycle_bin'); } catch(e){}
                                  try { await supabase.from('settings').delete().like('key', '%recycle_bin%'); } catch(e){}
                                  localStorage.removeItem('nali_recycle_bin_v1');
                                  
                                  // If settings or admin were wiped, completely reset IDB and signOut
                                  if (resetOptions.admin || resetOptions.settings) {
                                    try { await supabase.auth.signOut(); } catch (e) {}
                                    try { await idb.factoryReset(); } catch(e){}
                                  }

                                  
                                  setEraseStatus('Awaiting empty state acknowledgment...');
                                  
                                  // Verify empty state from cloud
                                  await new Promise(r => setTimeout(r, 1500));
                                  setEraseStatus('Verification successful. Empty state acknowledged.');
                                  
                                  setTimeout(() => {
                                    setEraseStatus('Reloading application interface...');
                                    window.location.replace('/');
                                  }, 1500);

                                } catch (e) {
                                  console.error(e);
                                  window.location.replace('/');
                                }
                              }}
                              className="flex-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:hover:bg-rose-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                            >
                              {isErasing ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : null}
                              <span>{isErasing ? 'Erasing...' : 'Erase Selected Data'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmFactoryReset(false);
                                setFactoryResetText('');
                              }}
                              className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmFactoryReset(true)}
                          className="w-full py-2 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-600/30 text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Selective Data Wipe</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

{/* TAB: RECYCLE BIN & RECOVERY */}
            {activeTab === 'recycle_bin' && (
              <div className="space-y-6">
                {/* Header & Subtitle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-rose-400" />
                      Recycle Bin & Safe Data Recovery
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Review deleted inventory items, customer debts, and contracts. Recover them instantly or delete permanently.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        loadBinItems();
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
                      title="Refresh Recycle Bin"
                    >
                      <RefreshCcw className={`w-3.5 h-3.5 ${binLoading ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>

                    {(binItems?.length || 0) > 0 && (
                      <button
                        type="button"
                        onClick={handleEmptyRecycleBin}
                        className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-rose-950/20 active:scale-95 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Empty Recycle Bin</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1 w-full">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={binSearchQuery}
                        onChange={(e) => setBinSearchQuery(e.target.value)}
                        placeholder="Search deleted item name, brand, or ID..."
                        className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                      {binSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setBinSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Quick counter badge */}
                    <div className="text-xs font-semibold text-slate-400 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 whitespace-nowrap">
                      <span>Total In Bin: </span>
                      <span className="text-white font-bold">{binItems?.length || 0}</span>
                    </div>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {[
                      { id: 'all', label: 'All Items', count: binItems?.length || 0 },
                      { id: 'mobile', label: 'Mobiles', count: (binItems || []).filter(i => i.type === 'mobile').length },
                      { id: 'accessory', label: 'Accessories', count: (binItems || []).filter(i => i.type === 'accessory').length },
                      { id: 'debt', label: 'Debts', count: (binItems || []).filter(i => i.type === 'debt').length },
                      { id: 'installment', label: 'Installments', count: (binItems || []).filter(i => i.type === 'installment').length },
                      { id: 'supplier', label: 'Suppliers', count: (binItems || []).filter(i => i.type === 'supplier').length },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setBinFilterType(tab.id);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                          binFilterType === tab.id
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                            : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white'
                        }`}
                      >
                        <span>{tab.label}</span>
                        {tab.count > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            binFilterType === tab.id ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
                          }`}>
                            {tab.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  {binLoading ? (
                    <div className="flex items-center justify-center p-12 bg-slate-900/40 rounded-2xl border border-slate-800/60">
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <RefreshCcw className="w-4 h-4 animate-spin text-indigo-400" />
                        <span>Loading deleted records...</span>
                      </div>
                    </div>
                  ) : (filteredBinItems?.length || 0) === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 bg-slate-900/40 rounded-2xl border border-slate-800/60 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-500 mb-3">
                        <Trash2 className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-200">No items found in Recycle Bin</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        {binSearchQuery || binFilterType !== 'all'
                          ? 'No deleted items matched your current filter criteria.'
                          : 'Any mobiles, accessories, debts, or installments deleted in the system will safely appear here for instant recovery.'}
                      </p>
                    </div>
                  ) : (
                    filteredBinItems.map((item) => {
                      const typeBadge = getBinTypeBadge(item.type);
                      return (
                        <div
                          key={item.id}
                          className="p-4 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`p-2.5 rounded-xl ${typeBadge.bg} ${typeBadge.text} border ${typeBadge.border} shrink-0 mt-0.5`}>
                              {typeBadge.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${typeBadge.bg} ${typeBadge.text} border ${typeBadge.border}`}>
                                  {typeBadge.label}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {format(new Date(item.deletedAt), 'MMM dd, yyyy • HH:mm')}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-white truncate">
                                {item.name || 'Unnamed Item'}
                              </h4>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                                <span className="font-mono text-[11px] text-slate-500">ID: {item.id.slice(0, 8)}...</span>
                                {item.data?.price && (
                                  <span className="text-emerald-400 font-semibold">${item.data.price}</span>
                                )}
                                {item.data?.originalAmount && (
                                  <span className="text-amber-400 font-semibold">{item.data.originalAmount} {item.data.currency}</span>
                                )}
                                {item.data?.brand && item.data?.model && (
                                  <span className="text-slate-300">{item.data.brand} {item.data.model}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons: Recover & Permanent Delete */}
                          <div className="flex items-center gap-2 shrink-0 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                            <button
                              type="button"
                              onClick={() => handleRecoverBinItem(item.id, item.name)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                              title="Recover item back into active inventory"
                            >
                              <RefreshCcw className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Recover</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeletePermanentlyBinItem(item.id, item.name)}
                              className="px-3 py-2 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                              title="Permanently remove from database"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Delete Permanently</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#0c101d] border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            <span>Active: </span>
            <span className="text-slate-300 font-medium">{activeThemeInfo.name}</span> • 
            <span className="text-slate-300 font-medium"> {(settings.appearance || 'dark').toUpperCase()}</span> • 
            <span className="text-slate-300 font-medium"> {settings.density || 'standard'}</span>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className={`px-6 py-2 rounded-xl text-xs font-bold text-white ${activeThemeInfo.previewClass} shadow-lg shadow-indigo-600/20 transition-all`}
          >
            Save & Close
          </button>
        </div>

      </div>

      {/* Supabase Storage & Database Cleanup Modal */}
      <StorageCleanupModal
        isOpen={isStorageCleanupOpen}
        onClose={() => setIsStorageCleanupOpen(false)}
      />

      {/* Delete Item Confirmation Modal */}
      {binItemToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b0f1a] w-full max-w-sm rounded-2xl border border-rose-500/30 p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Delete Permanently?</h3>
            <p className="text-xs text-slate-400 mb-6">
              Are you sure you want to permanently delete <span className="text-white font-semibold">{binItemToDelete.name}</span>? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={() => setBinItemToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePermanently}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-rose-900/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty Bin Confirmation Modal */}
      {confirmEmptyBin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b0f1a] w-full max-w-sm rounded-2xl border border-rose-500/30 p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Empty Recycle Bin?</h3>
            <p className="text-xs text-slate-400 mb-6">
              Are you sure you want to empty the entire recycle bin? All deleted items will be permanently erased. This action cannot be undone.
            </p>
            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={() => setConfirmEmptyBin(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmEmptyBinAction}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-rose-900/20"
              >
                Empty Bin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
