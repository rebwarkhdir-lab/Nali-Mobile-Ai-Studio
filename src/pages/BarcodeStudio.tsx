import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  Wand2, 
  Barcode as BarcodeIcon, 
  QrCode, 
  Layers, 
  Smartphone, 
  Headphones, 
  Search, 
  Filter, 
  Plus, 
  Minus, 
  Eye, 
  RotateCcw, 
  Share2, 
  Settings2, 
  Tag, 
  CheckCircle2, 
  DollarSign, 
  Sliders, 
  SlidersHorizontal,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Save,
  Type,
  Maximize2,
  Package,
  Cable
} from 'lucide-react';
import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { useDesignSystem } from '../context/DesignContext';
import BarcodePrintLabel, { LabelData, LabelPrintConfig, DEFAULT_LABEL_CONFIG } from '../components/barcode/BarcodePrintLabel';
import BarcodeSettingsPanel from '../components/barcode/BarcodeSettingsPanel';
import BarcodeView, { BarcodeFormat } from '../components/barcode/BarcodeView';
import { 
  LABEL_SIZES, 
  LabelSizeOption, 
  generateEAN13, 
  generateCode128, 
  printLabelContainer, 
  BARCODE_SETTINGS_STORAGE_KEY,
  getLabelDimensions,
  injectThermalPrintStyles 
} from '../lib/barcodeUtils';
import { Mobile } from '../types/mobile';
import { Accessory } from '../types/accessory';
import { ScreenProtectorGroup } from '../types/screenProtector';
import { formatCurrency, formatNumberWithCommas, cn } from '../lib/utils';
import { SearchInput } from '../components/common/SearchInput';
import { sound } from '../lib/sound';
import { useToast } from '../components/common/Toast';
import { supabase } from '../lib/supabase';
import { screenProtectorService } from '../lib/screenProtectorService';

export default function BarcodeStudio() {
  const { settings } = useDesignSystem();
  const { success, info, error: toastError } = useToast();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';

  const [mobiles, setMobiles] = useState<Mobile[]>([]);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [screenProtectors, setScreenProtectors] = useState<ScreenProtectorGroup[]>([]);

  useEffect(() => {
    try {
      const cachedMobiles = localStorage.getItem('nali_mobiles_cache');
      if (cachedMobiles) {
        const parsed = JSON.parse(cachedMobiles);
        if (Array.isArray(parsed)) setMobiles(parsed);
      }
      const cachedAccessories = localStorage.getItem('nali_accessories_cache');
      if (cachedAccessories) {
        const parsed = JSON.parse(cachedAccessories);
        if (Array.isArray(parsed)) setAccessories(parsed);
      }
      
      setScreenProtectors(screenProtectorService.getAllGroups() || []);
    } catch {
      // Ignore
    }
  }, []);

  // Active Tab: 'single' | 'batch' | 'quick' | 'settings'
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'quick' | 'settings'>('single');
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);

  // Label Configuration with LocalStorage persistence
  const [config, setConfig] = useState<LabelPrintConfig>(DEFAULT_LABEL_CONFIG);

  // Initialize single item empty by default for the standalone page
  const [singleItemData, setSingleItemData] = useState<LabelData>({
    itemType: 'mobile',
    title: 'iPhone 15 Pro Max',
    brand: 'Apple',
    barcode: '354890123456789',
    price: 1199,
    currency: 'USD',
    specs: ['256GB', '8GB RAM', '100% Bat', 'Brand New'],
    warranty: '1-Yr Warranty',
    date: new Date().toISOString().split('T')[0],
    storeName: 'NALI MOBILE'
  });

  // Settings Tab Preview Item Switcher
  const [settingsPreviewType, setSettingsPreviewType] = useState<'mobile' | 'accessory' | 'cable'>('mobile');

  // Tracking if current single item came from a real DB record
  const [currentDbItem, setCurrentDbItem] = useState<{ type: string; id: string } | null>(null);
  const [isSavingBarcode, setIsSavingBarcode] = useState(false);

  // Batch Printing State: item selection map { itemKey: quantity }
  const [batchSelection, setBatchSelection] = useState<Record<string, number>>({});
  const [batchSearchTerm, setBatchSearchTerm] = useState('');
  const [batchCategoryFilter, setBatchCategoryFilter] = useState<'all' | 'mobiles' | 'accessories' | 'screen_protectors'>('all');

  // Quick Generator State
  const [quickGenCount, setQuickGenCount] = useState(12);
  const [quickGenPrefix, setQuickGenPrefix] = useState('20');
  const [quickGenFormat, setQuickGenFormat] = useState<'EAN13' | 'CODE128'>('EAN13');
  const [quickGeneratedList, setQuickGeneratedList] = useState<string[]>([]);
  const [quickGenTitle, setQuickGenTitle] = useState('Store Item');
  const [quickGenPrice, setQuickGenPrice] = useState(10);
  const [quickGenCurrency, setQuickGenCurrency] = useState<'USD' | 'IQD'>('USD');

  // Copy state
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Load saved configuration and exchange rate from localStorage
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem(BARCODE_SETTINGS_STORAGE_KEY);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfig(prev => ({ ...DEFAULT_LABEL_CONFIG, ...parsed }));
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    if (settings.exchangeRate) {
      setConfig(prev => ({ ...prev, exchangeRate: settings.exchangeRate }));
    }
  }, [settings.exchangeRate]);

  // Initialize from first mobile or location state
  useEffect(() => {
    if ((mobiles?.length || 0) === 0 && (accessories?.length || 0) === 0) return;

    // Check if we came from another page with a specific item requested
    if (location.state && location.state.itemType && location.state.itemId) {
      const { itemType, itemId } = location.state;
      
      if (itemType === 'mobile') {
        const mobile = (mobiles || []).find(m => m.id === itemId);
        if (mobile) {
          setSingleItemData({
            id: mobile.id,
            itemType: 'mobile',
            title: `${mobile.brand} ${mobile.model}`,
            brand: mobile.brand,
            barcode: mobile.imei || '354890123456789',
            price: Number(mobile.sellPrice) || 0,
            currency: (mobile.currency as 'USD' | 'IQD') || 'USD',
            specs: [mobile.storage, mobile.ram ? `${mobile.ram} RAM` : undefined, mobile.condition].filter(Boolean) as string[],
            warranty: 'Store Verified',
            date: new Date().toISOString().split('T')[0],
            storeName: 'NALI MOBILE'
          });
          setCurrentDbItem({ type: 'mobile', id: mobile.id });
          return;
        }
      } else if (itemType === 'accessory') {
        const accessory = (accessories || []).find(a => a.id === itemId);
        if (accessory) {
          setSingleItemData({
            id: accessory.id,
            itemType: 'accessory',
            title: accessory.name,
            brand: accessory.brand,
            barcode: accessory.barcode || generateEAN13(),
            price: Number(accessory.sellPrice) || 0,
            currency: (accessory.currency as 'USD' | 'IQD') || 'USD',
            specs: [accessory.category, accessory.compatibility].filter(Boolean) as string[],
            warranty: 'Standard',
            date: new Date().toISOString().split('T')[0],
            storeName: 'NALI MOBILE'
          });
          setCurrentDbItem({ type: 'accessory', id: accessory.id });
          return;
        }
      }
    }

    // Default to first mobile if no specific item was requested and we haven't loaded anything yet
    if ((mobiles?.length || 0) > 0 && singleItemData.barcode === '354890123456789') {
      const firstMob = (mobiles || []).find(m => m.status === 'in_stock') || mobiles[0];
      if (firstMob) {
        setSingleItemData({
          id: firstMob.id,
          itemType: 'mobile',
          title: `${firstMob.brand} ${firstMob.model}`,
          brand: firstMob.brand,
          barcode: firstMob.imei || '354890123456789',
          price: Number(firstMob.sellPrice) || 0,
          currency: (firstMob.currency as 'USD' | 'IQD') || 'USD',
          specs: [firstMob.storage, firstMob.ram ? `${firstMob.ram} RAM` : undefined, firstMob.condition].filter(Boolean) as string[],
          warranty: 'Store Verified',
          date: new Date().toISOString().split('T')[0],
          storeName: 'NALI MOBILE'
        });
        setCurrentDbItem({ type: 'mobile', id: firstMob.id });
      }
    }
  }, [mobiles, accessories, location.state]);

  // Handle Smart Barcode Generation
  const handleAutoGenerateBarcode = (formatType: 'EAN13' | 'CODE128' = 'EAN13') => {
    sound.playClick();
    const newCode = formatType === 'EAN13' ? generateEAN13() : generateCode128('NALI');
    setSingleItemData(prev => ({ ...prev, barcode: newCode }));
    setConfig(prev => ({ ...prev, barcodeFormat: formatType }));
    info(`Generated new ${formatType} barcode: ${newCode}`);
  };

  // Save Barcode back to Supabase DB if user modified it
  const handleSaveBarcodeToDb = async () => {
    if (!currentDbItem) {
      info(t('barcodeStudio.single.itemCustomReady'));
      return;
    }

    setIsSavingBarcode(true);
    sound.playClick();
    try {
      if (currentDbItem.type === 'mobile') {
        const { error } = await supabase
          .from('nali_mobiles')
          .update({ imei: singleItemData.barcode })
          .eq('id', currentDbItem.id);
        if (error) throw error;
      } else if (currentDbItem.type === 'accessory') {
        const { error } = await supabase
          .from('nali_accessories')
          .update({ barcode: singleItemData.barcode })
          .eq('id', currentDbItem.id);
        if (error) throw error;
      }

      success(t('barcodeStudio.single.savedToDb'));
    } catch (err) {
      console.error(err);
      toastError(t('barcodeStudio.single.saveFailed'));
    } finally {
      setIsSavingBarcode(false);
    }
  };

  // Copy Barcode value to clipboard
  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(singleItemData.barcode);
    setCopied(true);
    sound.playClick();
    success(t('barcodeStudio.single.copied', { code: singleItemData.barcode }));
    setTimeout(() => setCopied(false), 2000);
  };

  // Dynamic print CSS injection: ensures on-screen preset changes immediately update @page rules
  useEffect(() => {
    const { widthMm, heightMm } = getLabelDimensions(config);
    injectThermalPrintStyles(widthMm, heightMm);
  }, [config.sizeId, config.customWidthMm, config.customHeightMm]);

  // Print Action
  const handlePrint = () => {
    // Open new tab immediately to bypass popup blockers in iframes
    const printWindow = window.self !== window.top ? window.open('', '_blank') : null;

    setIsPrinting(true);
    sound.playClick();
    setTimeout(() => {
      printLabelContainer('printable-label-area', config, printWindow);
      setIsPrinting(false);
    }, 150);
  };

  // Keyboard shortcut for printing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        // Prevent printing if in batch mode and no labels are selected
        if (activeTab === 'batch' && Object.values(batchSelection).reduce((sum: number, q) => sum + (Number(q) || 0), 0) === 0) {
          return;
        }
        if (!isPrinting) {
          handlePrint();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPrinting, activeTab, batchSelection]);

  // Generate Quick Barcodes list
  const handleGenerateQuickBatch = () => {
    sound.playClick();
    const list: string[] = [];
    for (let i = 0; i < quickGenCount; i++) {
      if (quickGenFormat === 'EAN13') {
        list.push(generateEAN13(quickGenPrefix || '20'));
      } else {
        list.push(generateCode128(quickGenPrefix || 'NL'));
      }
    }
    setQuickGeneratedList(list);
    success(t('barcodeStudio.quick.generatedSuccess', { count: (list?.length || 0) }));
  };

  // Sample data used for live previews in the Settings panel
  const samplePreviewData: Record<'mobile' | 'accessory' | 'cable', LabelData> = useMemo(() => ({
    mobile: {
      itemType: 'mobile',
      title: 'iPhone 15 Pro Max',
      brand: 'Apple',
      barcode: '354890123456789',
      price: 1199,
      currency: 'USD',
      specs: ['256GB', '8GB RAM', 'Brand New'],
      warranty: '1-Yr Warranty',
      date: new Date().toISOString().split('T')[0],
      storeName: config.storeNameText || 'NALI MOBILE'
    },
    accessory: {
      itemType: 'accessory',
      title: '20W USB-C Fast Charger',
      brand: 'Anker',
      barcode: '2084920194821',
      price: 25,
      currency: 'USD',
      specs: ['PowerPort III', 'USB-C'],
      warranty: '6-Mo Warranty',
      date: new Date().toISOString().split('T')[0],
      storeName: config.storeNameText || 'NALI MOBILE'
    },
    cable: {
      itemType: 'accessory',
      title: 'Braided Lightning Cable 2M',
      brand: 'Apple',
      barcode: 'NL-94820194',
      price: 15,
      currency: 'USD',
      specs: ['2 Meter', 'Fast Charge'],
      warranty: 'Store Verified',
      date: new Date().toISOString().split('T')[0],
      storeName: config.storeNameText || 'NALI MOBILE'
    }
  }), [config.storeNameText]);

  // Filtered inventory list for batch selection
  const filteredInventoryItems = useMemo(() => {
    const term = batchSearchTerm.toLowerCase().trim();
    const result: Array<{
      key: string;
      id: string;
      type: 'mobile' | 'accessory' | 'screen_protector';
      title: string;
      subtitle: string;
      brand: string;
      barcode: string;
      price: number;
      currency: 'USD' | 'IQD';
      stock: number;
      specs: string[];
    }> = [];

    // Mobiles
    if (batchCategoryFilter === 'all' || batchCategoryFilter === 'mobiles') {
      mobiles.forEach(m => {
        const title = `${m.brand} ${m.model}`;
        if (!term || title.toLowerCase().includes(term) || m.imei?.includes(term)) {
          result.push({
            key: `mob_${m.id}`,
            id: m.id,
            type: 'mobile',
            title,
            subtitle: `${m.storage || ''} ${m.color || ''} • ${m.condition || ''}`.trim(),
            brand: m.brand,
            barcode: m.imei || '',
            price: Number(m.sellPrice) || 0,
            currency: (m.currency as 'USD' | 'IQD') || 'USD',
            stock: m.status === 'in_stock' ? 1 : 0,
            specs: [m.storage, m.ram ? `${m.ram} RAM` : undefined, m.battery ? `${m.battery}` : undefined, m.condition].filter(Boolean) as string[]
          });
        }
      });
    }

    // Accessories
    if (batchCategoryFilter === 'all' || batchCategoryFilter === 'accessories') {
      accessories.forEach(a => {
        const title = a.name;
        if (!term || title.toLowerCase().includes(term) || a.barcode?.toLowerCase().includes(term) || a.brand?.toLowerCase().includes(term)) {
          result.push({
            key: `acc_${a.id}`,
            id: a.id,
            type: 'accessory',
            title,
            subtitle: `${a.brand || ''} • ${a.category || 'Accessory'}`.trim(),
            brand: a.brand || '',
            barcode: a.barcode || '',
            price: Number(a.sellPrice) || 0,
            currency: (a.currency as 'USD' | 'IQD') || 'USD',
            stock: a.quantity || 0,
            specs: [a.category, a.compatibility, a.warranty].filter(Boolean) as string[]
          });
        }
      });
    }

    return result;
  }, [mobiles, accessories, batchSearchTerm, batchCategoryFilter]);

  // Batch toggle helpers
  const handleBatchItemQuantity = (key: string, qty: number) => {
    setBatchSelection(prev => {
      const next = { ...prev };
      if (qty <= 0) {
        delete next[key];
      } else {
        next[key] = qty;
      }
      return next;
    });
  };

  const handleSelectAllFilteredBatch = () => {
    sound.playClick();
    const next: Record<string, number> = { ...batchSelection };
    filteredInventoryItems.forEach(item => {
      if (!next[item.key]) {
        next[item.key] = item.type === 'mobile' ? 1 : Math.min(item.stock || 1, 5);
      }
    });
    setBatchSelection(next);
  };

  const handleClearBatchSelection = () => {
    sound.playClick();
    setBatchSelection({});
  };

  const totalBatchLabelsCount = useMemo(() => {
    return Object.values(batchSelection).reduce((sum: number, q: number) => sum + (Number(q) || 0), 0);
  }, [batchSelection]);

  return (
    <div dir={isKu ? 'rtl' : 'ltr'} className="flex-1 w-full flex flex-col min-h-0 bg-[#070913]">
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="w-full max-w-7xl mx-auto bg-[#0f1424] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0a0e1a]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-900/20">
                <BarcodeIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {t('barcodeStudio.title')}
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                    {t('barcodeStudio.thermalEngineBadge')}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {t('barcodeStudio.subtitle')}
                </p>
              </div>
            </div>

            {/* Global Print Action */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                disabled={isPrinting || (activeTab === 'batch' && totalBatchLabelsCount === 0)}
                className="group relative flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 shadow-indigo-500/25 border border-indigo-400/30 overflow-hidden cursor-pointer"
              >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%] group-hover:animate-shimmer" />
                <Printer className="w-5 h-5 text-indigo-100 group-hover:text-white relative z-10" />
                <span className="relative z-10 tracking-wide">
                  {isPrinting ? t('barcodeStudio.printing') : activeTab === 'batch' ? t('barcodeStudio.printCountLabels', { count: totalBatchLabelsCount }) : t('barcodeStudio.printLabels')}
                </span>
                
                {/* Hotkey Hint */}
                <div className="relative z-10 hidden sm:flex items-center gap-0.5 ml-2 px-2 py-1 rounded border border-white/10 bg-black/20 text-[9px] font-mono font-bold text-indigo-100/70 uppercase tracking-widest shadow-inner">
                  {t('barcodeStudio.hotkeyHint')}
                </div>
              </button>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center justify-between px-6 py-2.5 border-b border-slate-800/80 bg-[#12182c]">
            <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setActiveTab('single');
                }}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer",
                  activeTab === 'single'
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>{t('barcodeStudio.tabs.single')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setActiveTab('batch');
                }}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer",
                  activeTab === 'batch'
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{t('barcodeStudio.tabs.batch')}</span>
                {totalBatchLabelsCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-950 text-cyan-300 font-mono font-bold">
                    {totalBatchLabelsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setActiveTab('quick');
                }}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer",
                  activeTab === 'quick'
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>{t('barcodeStudio.tabs.quick')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setActiveTab('settings');
                }}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer",
                  activeTab === 'settings'
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>{t('barcodeStudio.tabs.settings')}</span>
                <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-slate-800 text-cyan-300 font-mono font-semibold">
                  {config.sizeId === 'custom' ? `${config.customWidthMm || 50}×${config.customHeightMm || 30}mm` : config.sizeId}
                </span>
              </button>
            </div>

            {/* Quick Thermal Size Presets */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium text-[11px] hidden sm:inline">{t('barcodeStudio.size')}</span>
              <select
                value={config.sizeId}
                onChange={(e) => setConfig(prev => ({ ...prev, sizeId: e.target.value as any }))}
                className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none focus:border-cyan-500"
              >
                {LABEL_SIZES.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              {/* Quick Settings Drawer Toggle */}
              {activeTab !== 'settings' && (
                <button
                  type="button"
                  onClick={() => setIsQuickSettingsOpen(!isQuickSettingsOpen)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer",
                    isQuickSettingsOpen 
                      ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                      : "bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                  )}
                  title="Customize sticker size, fonts, and field visibility"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('barcodeStudio.customizeSticker')}</span>
                  {isQuickSettingsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>

          {/* Quick Settings Expandable Accordion for Single/Batch Views */}
          {isQuickSettingsOpen && activeTab !== 'settings' && (
            <div className="px-6 py-4 bg-slate-950/90 border-b border-cyan-500/30">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                  {t('barcodeStudio.liveCustomizerTitle')}
                </span>
                <button
                  type="button"
                  onClick={() => setIsQuickSettingsOpen(false)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  {t('barcodeStudio.closeCustomizer')}
                </button>
              </div>

              <BarcodeSettingsPanel
                config={config}
                onChange={setConfig}
                onSaveAsDefault={() => success(t('barcodeStudio.settings.savedSuccess'))}
                onResetDefaults={() => {
                  setConfig(DEFAULT_LABEL_CONFIG);
                  info(t('barcodeStudio.settings.resetSuccess'));
                }}
              />
            </div>
          )}

          {/* Body Content based on Tab */}
          <div className="flex-1 overflow-y-auto p-6">
            
            {/* TAB 1: SINGLE ITEM STUDIO */}
            {activeTab === 'single' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Form Controls (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  
                  {/* Quick Pick or Item Switcher */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-cyan-400" />
                        {t('barcodeStudio.single.targetItemBarcode')}
                      </span>
                      {currentDbItem && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {t('barcodeStudio.single.linkedToInventory', { type: currentDbItem.type })}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 mb-1 block">{t('barcodeStudio.single.itemTitle')}</label>
                        <input
                          type="text"
                          value={singleItemData.title}
                          onChange={(e) => setSingleItemData(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                          placeholder={t('barcodeStudio.single.itemTitlePlaceholder')}
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 mb-1 block">{t('barcodeStudio.single.brand')}</label>
                        <input
                          type="text"
                          value={singleItemData.brand || ''}
                          onChange={(e) => setSingleItemData(prev => ({ ...prev, brand: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                          placeholder={t('barcodeStudio.single.brandPlaceholder')}
                        />
                      </div>
                    </div>

                    {/* Barcode Value & Magic Auto-Gen Buttons */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-400">
                          {t('barcodeStudio.single.barcodeLabel')}
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleAutoGenerateBarcode('EAN13')}
                            className="px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-[10px] font-bold text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{t('barcodeStudio.single.autoEan13')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAutoGenerateBarcode('CODE128')}
                            className="px-2 py-0.5 rounded bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-[10px] font-bold text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{t('barcodeStudio.single.autoCode128')}</span>
                          </button>
                        </div>
                      </div>

                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={singleItemData.barcode}
                          onChange={(e) => setSingleItemData(prev => ({ ...prev, barcode: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                          placeholder={t('barcodeStudio.single.barcodePlaceholder')}
                        />
                        <button
                          type="button"
                          onClick={handleCopyBarcode}
                          className="absolute end-2 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          title={t('barcodeStudio.single.copyTooltip')}
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Pricing & Currency */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 mb-1 block">{t('barcodeStudio.single.sellingPrice')}</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={singleItemData.price || ''}
                            onChange={(e) => setSingleItemData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                            placeholder={t('barcodeStudio.single.pricePlaceholder')}
                          />
                          <select
                            value={singleItemData.currency}
                            onChange={(e) => setSingleItemData(prev => ({ ...prev, currency: e.target.value as 'USD' | 'IQD' }))}
                            className="absolute end-1.5 top-1.5 bottom-1.5 bg-slate-800 text-[11px] font-bold text-cyan-400 rounded px-2 border-0 focus:outline-none"
                          >
                            <option value="USD">{t('barcodeStudio.single.currencyUsd')}</option>
                            <option value="IQD">{t('barcodeStudio.single.currencyIqd')}</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 mb-1 block">{t('barcodeStudio.single.warranty')}</label>
                        <input
                          type="text"
                          value={singleItemData.warranty || ''}
                          onChange={(e) => setSingleItemData(prev => ({ ...prev, warranty: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                          placeholder={t('barcodeStudio.single.warrantyPlaceholder')}
                        />
                      </div>
                    </div>

                  </div>

                  {/* Print Customizer Options */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                      {t('barcodeStudio.single.layoutElements')}
                    </span>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                      {/* Barcode Type */}
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">{t('barcodeStudio.single.symbology')}</label>
                        <select
                          value={config.barcodeFormat}
                          onChange={(e) => setConfig(prev => ({ ...prev, barcodeFormat: e.target.value as BarcodeFormat }))}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value="CODE128">Code 128 (Standard)</option>
                          <option value="EAN13">EAN-13 (13 Digits)</option>
                          <option value="UPC">UPC-A</option>
                          <option value="QR">QR Code (2D)</option>
                        </select>
                      </div>

                      {/* Store Name Header */}
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">{t('barcodeStudio.single.storeHeader')}</label>
                        <input
                          type="text"
                          value={config.storeNameText}
                          onChange={(e) => setConfig(prev => ({ ...prev, storeNameText: e.target.value }))}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      {/* Copies */}
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">{t('barcodeStudio.single.printCopies')}</label>
                        <input
                          type="number"
                          min={1}
                          max={500}
                          value={config.copies}
                          onChange={(e) => setConfig(prev => ({ ...prev, copies: Math.max(1, parseInt(e.target.value) || 1) }))}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    {/* Toggle Chips */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, showStoreName: !prev.showStoreName }))}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer",
                          config.showStoreName 
                            ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                            : "bg-slate-950 border-slate-800 text-slate-500"
                        )}
                      >
                        {config.showStoreName ? '✓' : '✕'} {t('barcodeStudio.single.toggleStoreName')}
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, showPrice: !prev.showPrice }))}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer",
                          config.showPrice 
                            ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                            : "bg-slate-950 border-slate-800 text-slate-500"
                        )}
                      >
                        {config.showPrice ? '✓' : '✕'} {t('barcodeStudio.single.togglePrice')}
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, showDualCurrency: !prev.showDualCurrency }))}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer",
                          config.showDualCurrency 
                            ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                            : "bg-slate-950 border-slate-800 text-slate-500"
                        )}
                      >
                        {config.showDualCurrency ? '✓' : '✕'} {t('barcodeStudio.single.toggleDualCurrency')}
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, showSpecs: !prev.showSpecs }))}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer",
                          config.showSpecs 
                            ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                            : "bg-slate-950 border-slate-800 text-slate-500"
                        )}
                      >
                        {config.showSpecs ? '✓' : '✕'} {t('barcodeStudio.single.toggleSpecs')}
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, showWarranty: !prev.showWarranty }))}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer",
                          config.showWarranty 
                            ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
                            : "bg-slate-950 border-slate-800 text-slate-500"
                        )}
                      >
                        {config.showWarranty ? '✓' : '✕'} {t('barcodeStudio.single.toggleWarranty')}
                      </button>
                    </div>

                  </div>

                </div>

                {/* Right Realistic Thermal Label Preview (5 cols) */}
                <div className="lg:col-span-5 flex flex-col space-y-4">
                  {/* Preset Selector Bar */}
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                        {t('barcodeStudio.single.rollSizePresets')}
                      </span>
                      {(() => {
                        const dim = getLabelDimensions(config);
                        return (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-bold">
                            {dim.widthMm} × {dim.heightMm} mm
                          </span>
                        );
                      })()}
                    </div>

                    {/* Standard Thermal Size Chips */}
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-xs">
                      {[
                        { id: '50x30', label: '50×30 mm', desc: 'Default' },
                        { id: '40x30', label: '40×30 mm', desc: 'Compact' },
                        { id: '50x25', label: '50×25 mm', desc: 'Slim' },
                        { id: '38x25', label: '38×25 mm', desc: 'Mini' },
                        { id: 'custom', label: 'Custom mm', desc: 'Custom' }
                      ].map((preset) => {
                        const isSelected = config.sizeId === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setConfig(prev => ({ ...prev, sizeId: preset.id }))}
                            className={cn(
                              "px-2 py-1.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center",
                              isSelected
                                ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-200 shadow-sm ring-1 ring-cyan-500/30 font-bold"
                                : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                            )}
                          >
                            <span className="text-[11px] leading-tight">{preset.label}</span>
                            <span className="text-[9px] opacity-70 leading-none mt-0.5">{preset.desc}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Width & Height Inputs if 'custom' is active */}
                    {config.sizeId === 'custom' && (
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">{t('barcodeStudio.single.widthMm')}</label>
                          <input
                            type="number"
                            min={15}
                            max={150}
                            value={config.customWidthMm || 50}
                            onChange={(e) => setConfig(prev => ({ 
                              ...prev, 
                              customWidthMm: Math.max(15, Math.min(150, parseInt(e.target.value) || 50)) 
                            }))}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono text-center focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">{t('barcodeStudio.single.heightMm')}</label>
                          <input
                            type="number"
                            min={10}
                            max={150}
                            value={config.customHeightMm || 30}
                            onChange={(e) => setConfig(prev => ({ 
                              ...prev, 
                              customHeightMm: Math.max(10, Math.min(150, parseInt(e.target.value) || 30)) 
                            }))}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono text-center focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex-1 flex flex-col items-center justify-between">
                    
                    <div className="w-full flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        {t('barcodeStudio.single.previewTitle')}
                      </span>
                      {(() => {
                        const dim = getLabelDimensions(config);
                        return (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {t('barcodeStudio.single.safeBuffer', { ratio: (dim.widthMm / dim.heightMm).toFixed(2) })}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Label Mock Display on Thermal Paper Canvas */}
                    <div className="w-full py-8 px-4 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-center min-h-[220px]">
                      <div className="shadow-2xl hover:scale-105 transition-transform duration-200">
                        <BarcodePrintLabel
                          data={singleItemData}
                          config={config}
                          className="shadow-xl ring-1 ring-black/10"
                        />
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="w-full space-y-2 mt-4">
                      <button
                        type="button"
                        onClick={handlePrint}
                        disabled={!singleItemData || isPrinting}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>{t('barcodeStudio.single.printCurrent')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: BATCH PRINTING */}
            {activeTab === 'batch' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  {/* Search Bar */}
                  <div className="w-full sm:w-96">
                    <SearchInput
                      placeholder={t('barcodeStudio.batch.searchPlaceholder')}
                      value={batchSearchTerm}
                      onChangeValue={setBatchSearchTerm}
                      size="sm"
                    />
                  </div>
                  {/* Category Filter */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setBatchCategoryFilter('all')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                        batchCategoryFilter === 'all' ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:text-white"
                      )}
                    >
                      {t('barcodeStudio.batch.filterAll')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchCategoryFilter('mobiles')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                        batchCategoryFilter === 'mobiles' ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:text-white"
                      )}
                    >
                      {t('barcodeStudio.batch.filterMobiles')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchCategoryFilter('accessories')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                        batchCategoryFilter === 'accessories' ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:text-white"
                      )}
                    >
                      {t('barcodeStudio.batch.filterAccessories')}
                    </button>
                  </div>

                  {/* Batch Selection Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllFilteredBatch}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                    >
                      {t('barcodeStudio.batch.selectAll')}
                    </button>
                    {totalBatchLabelsCount > 0 && (
                      <button
                        type="button"
                        onClick={handleClearBatchSelection}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-rose-300 border border-slate-700 transition-colors cursor-pointer"
                      >
                        {t('barcodeStudio.batch.clear')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Items Selection Grid / Table */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pe-1">
                  {filteredInventoryItems.map(item => {
                    const selectedQty = batchSelection[item.key] || 0;
                    const isSelected = selectedQty > 0;

                    return (
                      <div
                        key={item.key}
                        className={cn(
                          "p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5",
                          isSelected
                            ? "bg-cyan-950/25 border-cyan-500/50 shadow-md shadow-cyan-950/50"
                            : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={cn(
                                "px-1.5 py-0.2 text-[9px] font-bold rounded uppercase",
                                item.type === 'mobile' ? "bg-indigo-500/20 text-indigo-300" : "bg-cyan-500/20 text-cyan-300"
                              )}>
                                {item.type}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {t('barcodeStudio.batch.stock', { count: item.stock })}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-white truncate max-w-[200px]">
                              {item.title}
                            </h4>
                            <p className="text-[11px] text-slate-400 truncate">
                              {item.subtitle}
                            </p>
                          </div>

                          <div className="text-right">
                            <div className="text-xs font-bold text-cyan-400">
                              {item.currency === 'USD' ? '$' : ''}{formatNumberWithCommas(item.price)}
                            </div>
                            <div className="text-[9px] font-mono text-slate-500 truncate max-w-[80px]">
                              {item.barcode || t('barcodeStudio.batch.noCode')}
                            </div>
                          </div>
                        </div>

                        {/* Quantity picker */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                          <span className="text-[11px] text-slate-400 font-medium">{t('barcodeStudio.batch.copiesToPrint')}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleBatchItemQuantity(item.key, selectedQty - 1)}
                              className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-8 text-center text-xs font-bold font-mono text-white">
                              {selectedQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleBatchItemQuantity(item.key, selectedQty + 1)}
                              className="w-6 h-6 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Batch Print Summary Bar */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Printer className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {t('barcodeStudio.batch.totalQueued', { count: totalBatchLabelsCount })}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {t('barcodeStudio.batch.targetFormat', { size: config.sizeId })}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePrint}
                    disabled={totalBatchLabelsCount === 0 || isPrinting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{t('barcodeStudio.batch.printAll', { count: totalBatchLabelsCount })}</span>
                  </button>
                </div>

              </div>
            )}

            {/* TAB 3: QUICK CODE GENERATOR */}
            {activeTab === 'quick' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                <div className="lg:col-span-6 space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      {t('barcodeStudio.quick.settingsTitle')}
                    </span>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">{t('barcodeStudio.quick.prefix')}</label>
                        <input
                          type="text"
                          value={quickGenPrefix}
                          onChange={(e) => setQuickGenPrefix(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                          placeholder={t('barcodeStudio.quick.prefixPlaceholder')}
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">{t('barcodeStudio.quick.quantity')}</label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={quickGenCount}
                          onChange={(e) => setQuickGenCount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">{t('barcodeStudio.quick.symbology')}</label>
                        <select
                          value={quickGenFormat}
                          onChange={(e) => setQuickGenFormat(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value="EAN13">{t('barcodeStudio.quick.ean13Option')}</option>
                          <option value="CODE128">{t('barcodeStudio.quick.code128Option')}</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">{t('barcodeStudio.quick.defaultTitle')}</label>
                        <input
                          type="text"
                          value={quickGenTitle}
                          onChange={(e) => setQuickGenTitle(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGenerateQuickBatch}
                      className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>{t('barcodeStudio.quick.generateBtn', { count: quickGenCount })}</span>
                    </button>
                  </div>
                </div>

                {/* Generated Codes List */}
                <div className="lg:col-span-6 flex flex-col">
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-cyan-400" />
                        {t('barcodeStudio.quick.generatedTitle', { count: quickGeneratedList?.length || 0 })}
                      </span>
                      {(quickGeneratedList?.length || 0) > 0 && (
                        <button
                          type="button"
                          onClick={handlePrint}
                          className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold border border-cyan-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>{t('barcodeStudio.quick.printSheet')}</span>
                        </button>
                      )}
                    </div>

                    <div className="flex-1 max-h-[280px] overflow-y-auto space-y-2 pe-1">
                      {(quickGeneratedList?.length || 0) === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                          <Wand2 className="w-8 h-8 text-slate-600 mb-2" />
                          <span>{t('barcodeStudio.quick.emptyText')}</span>
                        </div>
                      ) : (
                        quickGeneratedList.map((code, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-mono text-slate-500">#{idx + 1}</span>
                              <span className="font-mono text-xs font-bold text-cyan-300">{code}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(code);
                                success(t('barcodeStudio.quick.copied', { code }));
                              }}
                              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                              title={t('barcodeStudio.quick.copyTooltip')}
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                  </div>
                </div>

              </div>
            )}

            {/* TAB 4: SETTINGS & LABEL CUSTOMIZER */}
            {activeTab === 'settings' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Controls (7 cols): BarcodeSettingsPanel */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Settings2 className="w-4 h-4 text-cyan-400" />
                          {t('barcodeStudio.settings.headerTitle')}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {t('barcodeStudio.settings.headerDesc')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            localStorage.setItem(BARCODE_SETTINGS_STORAGE_KEY, JSON.stringify(config));
                            success(t('barcodeStudio.settings.savedSuccess'));
                          } catch {
                            toastError(t('barcodeStudio.settings.saveFailed'));
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-500/20"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{t('barcodeStudio.settings.saveDefaults')}</span>
                      </button>
                    </div>

                    <BarcodeSettingsPanel
                      config={config}
                      onChange={setConfig}
                      onSaveAsDefault={() => success(t('barcodeStudio.settings.savedSuccess'))}
                      onResetDefaults={() => {
                        setConfig(DEFAULT_LABEL_CONFIG);
                        info(t('barcodeStudio.settings.resetSuccess'));
                      }}
                    />
                  </div>
                </div>

                {/* Right Live Interactive Preview (5 cols) */}
                <div className="lg:col-span-5 flex flex-col space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex-1 flex flex-col justify-between">
                    
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          {t('barcodeStudio.settings.livePreview')}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          {config.sizeId === 'custom' 
                            ? `${config.customWidthMm || 50}×${config.customHeightMm || 30}mm`
                            : LABEL_SIZES.find(s => s.id === config.sizeId)?.name || config.sizeId}
                        </span>
                      </div>

                      {/* Mock Item Switcher (Mobile vs Accessory vs Cable) */}
                      <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800 mb-4">
                        <button
                          type="button"
                          onClick={() => setSettingsPreviewType('mobile')}
                          className={cn(
                            "flex-1 py-1 px-2 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                            settingsPreviewType === 'mobile'
                              ? "bg-slate-800 text-cyan-300 shadow-sm"
                              : "text-slate-400 hover:text-slate-200"
                          )}
                        >
                          <Smartphone className="w-3 h-3" />
                          <span>{t('barcodeStudio.settings.phoneItem')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSettingsPreviewType('accessory')}
                          className={cn(
                            "flex-1 py-1 px-2 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                            settingsPreviewType === 'accessory'
                              ? "bg-slate-800 text-cyan-300 shadow-sm"
                              : "text-slate-400 hover:text-slate-200"
                          )}
                        >
                          <Package className="w-3 h-3" />
                          <span>{t('barcodeStudio.settings.accessory')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSettingsPreviewType('cable')}
                          className={cn(
                            "flex-1 py-1 px-2 rounded text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                            settingsPreviewType === 'cable'
                              ? "bg-slate-800 text-cyan-300 shadow-sm"
                              : "text-slate-400 hover:text-slate-200"
                          )}
                        >
                          <Cable className="w-3 h-3" />
                          <span>{t('barcodeStudio.settings.cablePart')}</span>
                        </button>
                      </div>

                      {/* Realistic Thermal Label Preview Canvas */}
                      <div className="w-full py-8 px-4 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-center min-h-[220px]">
                        <div className="shadow-2xl hover:scale-105 transition-transform duration-200">
                          <BarcodePrintLabel
                            data={samplePreviewData[settingsPreviewType]}
                            config={config}
                            className="shadow-2xl ring-1 ring-black/20"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Summary stats & Test Print */}
                    <div className="space-y-3 mt-4 pt-3 border-t border-slate-800">
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                          <span className="text-slate-500 block text-[10px]">{t('barcodeStudio.settings.fontScale')}</span>
                          <span className="font-semibold text-slate-300">
                            T: {config.fontSizeTitle || 'md'} • P: {config.fontSizePrice || 'md'}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                          <span className="text-slate-500 block text-[10px]">{t('barcodeStudio.settings.borderStyle')}</span>
                          <span className="font-semibold text-slate-300 capitalize">
                            {config.borderStyle || 'none'} {config.textAlign ? `• ${config.textAlign}` : ''}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handlePrint}
                        disabled={isPrinting}
                        className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>{t('barcodeStudio.settings.printTestSample')}</span>
                      </button>
                    </div>

                  </div>
                </div>

              </div>
            )}

          </div>

          {/* Off-screen Print Container specifically targeted by print utility (avoids display:none layout collapse) */}
          <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none print:opacity-100 print:pointer-events-auto print:static print:left-0 print:z-50">
            {(() => {
              const { widthMm, heightMm } = getLabelDimensions(config);
              const labelPageStyle: React.CSSProperties = {
                width: `${widthMm}mm`,
                height: `${heightMm}mm`,
                maxWidth: `${widthMm}mm`,
                maxHeight: `${heightMm}mm`,
                pageBreakInside: 'avoid',
                breakInside: 'avoid',
                pageBreakAfter: 'always',
                breakAfter: 'page',
                display: 'block',
                boxSizing: 'border-box',
                overflow: 'hidden',
                margin: 0,
                padding: 0
              };

              return (
                <div id="printable-label-area">
                  {activeTab === 'single' && (
                    Array.from({ length: config.copies }).map((_, i) => (
                      <div key={i} className="label-page" style={labelPageStyle}>
                        <BarcodePrintLabel
                          data={singleItemData}
                          config={config}
                        />
                      </div>
                    ))
                  )}

                  {activeTab === 'batch' && (
                    Object.entries(batchSelection).map(([key, qty]) => {
                      const item = filteredInventoryItems.find(i => i.key === key);
                      if (!item) return null;

                      const labelData: LabelData = {
                        itemType: item.type,
                        title: item.title,
                        brand: item.brand,
                        barcode: item.barcode || generateCode128(),
                        price: item.price,
                        currency: item.currency,
                        specs: item.specs,
                        storeName: config.storeNameText
                      };

                      return Array.from({ length: Number(qty) || 1 }).map((_, copyIdx) => (
                        <div key={`${key}_${copyIdx}`} className="label-page" style={labelPageStyle}>
                          <BarcodePrintLabel
                            data={labelData}
                            config={config}
                          />
                        </div>
                      ));
                    })
                  )}

                  {activeTab === 'quick' && (
                    quickGeneratedList.map((code, i) => {
                      const labelData: LabelData = {
                        itemType: 'custom',
                        title: quickGenTitle,
                        barcode: code,
                        price: quickGenPrice,
                        currency: quickGenCurrency,
                        storeName: config.storeNameText
                      };

                      return (
                        <div key={i} className="label-page" style={labelPageStyle}>
                          <BarcodePrintLabel
                            data={labelData}
                            config={{ ...config, barcodeFormat: quickGenFormat }}
                          />
                        </div>
                      );
                    })
                  )}

                  {activeTab === 'settings' && (
                    <div className="label-page" style={labelPageStyle}>
                      <BarcodePrintLabel
                        data={samplePreviewData[settingsPreviewType]}
                        config={config}
                      />
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

        </div>
      </div>
    </div>
  );
}
