import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Save, 
  Plus, 
  Settings2, 
  Trash2, 
  ScanLine, 
  Edit2, 
  Check, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  History, 
  Calendar, 
  DollarSign, 
  User, 
  Smartphone,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Zap,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { cameraService, CameraDeviceInfo } from '../../lib/cameraService';
import CameraScannerModal from '../common/CameraScannerModal';
import { sound } from '../../lib/sound';
import { formatCurrency, formatNumberWithCommas, parseFormattedNumber, cn } from '../../lib/utils';
import { Mobile } from '../../types/mobile';
import CurrencyPriceInput from '../common/CurrencyPriceInput';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { fetchSmartBatteryCapacity, getKnownBatteryCapacity } from '../../lib/mobileSpecsDatabase';
import { ModelCombobox } from './ModelCombobox';
import { BoughtFromCombobox } from './BoughtFromCombobox';
import { getSyncAccessorySuppliers, subscribeToSupplierChanges } from '../../lib/accessorySuppliers';
import { useModalScrollLock } from '../../lib/modalLock';

interface AddMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Mobile | null;
  onSave?: (mobileData: any, bulkUpdateIds?: string[], newSellPrice?: number) => void;
  existingMobiles?: Mobile[];
}

const MOBILE_OPTIONS_KEY = 'nali_mobile_options_v1';

// Initial mock data for combo boxes
const INITIAL_OPTIONS = {
  brand: ['Apple', 'Samsung', 'Xiaomi', 'Google', 'OnePlus', 'Nokia', 'iPad / Tablet'],
  storage: ['64GB', '128GB', '256GB', '512GB', '1TB'],
  ram: ['4GB', '6GB', '8GB', '12GB', '16GB'],
  color: ['Black', 'White', 'Silver', 'Gold', 'Titanium', 'Blue', 'Green', 'Space Gray', 'Purple'],
  condition: ['Brand New', 'Mint (Used)', 'Good (Used)', 'Fair (Used)'],
  currency: ['USD', 'IQD'],
  accessories: ['All', 'None', 'Only Cable', 'Only Adapter', 'Only Carton', 'Cable and Adapter', 'Cable and Carton', 'Adapter and Carton']
};

export default function AddMobileDrawer({ isOpen, onClose, initialData, onSave, existingMobiles = [] }: AddMobileDrawerProps) {
  const { t, i18n } = useTranslation();
  
  // State for combo box options
  const [options, setOptions] = useState(() => {
    try {
      const saved = localStorage.getItem(MOBILE_OPTIONS_KEY);
      return saved ? { ...INITIAL_OPTIONS, ...JSON.parse(saved) } : INITIAL_OPTIONS;
    } catch {
      return INITIAL_OPTIONS;
    }
  });

  // Pull from Supabase on mount
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const fetchOptions = async () => {
      try {
        const { data, error } = await supabase.from('settings').select('value').eq('key', MOBILE_OPTIONS_KEY).single();
        if (!error && data?.value) {
          const merged = { ...INITIAL_OPTIONS, ...(data.value as any) };
          setOptions(merged);
          localStorage.setItem(MOBILE_OPTIONS_KEY, JSON.stringify(merged));
        }
      } catch (err) {}
    };
    fetchOptions();
  }, []);

  // Save options on change to local & cloud
  const prevMobileOptionsRef = useRef(JSON.stringify(options));
  useEffect(() => {
    const currentJson = JSON.stringify(options);
    if (currentJson === prevMobileOptionsRef.current) return;
    prevMobileOptionsRef.current = currentJson;

    localStorage.setItem(MOBILE_OPTIONS_KEY, currentJson);
    if (isSupabaseConfigured()) {
      const saveOptions = async () => {
        try {
          await supabase.from('settings').upsert({ key: MOBILE_OPTIONS_KEY, value: options as any }, { onConflict: 'key' });
        } catch (err) {}
      };
      saveOptions();
    }
  }, [options]);
  
  // Manage Options Modal State
  const [manageModal, setManageModal] = useState<{
    isOpen: boolean;
    type: keyof typeof INITIAL_OPTIONS | null;
    title: string;
  }>({ isOpen: false, type: null, title: '' });
  const [newItemText, setNewItemText] = useState('');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<CameraDeviceInfo[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>(() => {
    return cameraService.getPreferredDeviceId() || '';
  });

  // IMEI Duplicate / Sold Alert Modals State
  const [soldAlertMobile, setSoldAlertMobile] = useState<Mobile | null>(null);
  const [inStockAlertMobile, setInStockAlertMobile] = useState<Mobile | null>(null);

  // Bulk Sell Price Update Alert State
  const [bulkPriceAlert, setBulkPriceAlert] = useState<{
    isOpen: boolean;
    matchingMobiles: Mobile[];
    newPrice: number;
    currency: string;
  } | null>(null);

  // Auto-filled banner state
  const [autoFilledFrom, setAutoFilledFrom] = useState<Mobile | null>(null);

  const isEditMode = !!initialData;

  // Scroll container ref to ensure form always opens at top
  const formScrollContainerRef = useRef<HTMLDivElement>(null);

  // Store known suppliers for Bought From suggestions
  const [knownSuppliers, setKnownSuppliers] = useState<string[]>(() => getSyncAccessorySuppliers());

  useEffect(() => {
    const unsub = subscribeToSupplierChanges((updated) => {
      setKnownSuppliers(updated);
    });
    return () => unsub();
  }, []);

  // Professional Scroll-To-Top Enforcement
  // Guarantees the drawer always starts at the top (Brand, Model, IMEI) every time it opens
  const resetDrawerScrollToTop = () => {
    if (formScrollContainerRef.current) {
      formScrollContainerRef.current.scrollTop = 0;
      formScrollContainerRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    modelName: '',
    brand: '',
    imei: '',
    storage: '',
    ram: '',
    color: '',
    battery: '',
    boughtFrom: '',
    date: new Date().toISOString().split('T')[0],
    currency: 'USD',
    buyPrice: '',
    sellPrice: '',
    condition: '',
    accessories: '',
    note: ''
  });

  // Sync form data when initialData changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setSoldAlertMobile(null);
      setInStockAlertMobile(null);
      setBulkPriceAlert(null);
      setAutoFilledFrom(null);

      // Force drawer scroll position to 0 immediately and in animation ticks
      resetDrawerScrollToTop();
      const rAF = requestAnimationFrame(resetDrawerScrollToTop);
      const t1 = setTimeout(resetDrawerScrollToTop, 40);
      const t2 = setTimeout(resetDrawerScrollToTop, 120);
      const t3 = setTimeout(resetDrawerScrollToTop, 320);

      if (initialData) {
        setFormData({
          modelName: initialData.model || '',
          brand: initialData.brand || '',
          imei: initialData.imei || '',
          storage: initialData.storage || '',
          ram: initialData.ram || '',
          color: initialData.color || '',
          battery: initialData.battery || '',
          boughtFrom: initialData.boughtFrom || '',
          date: initialData.purchaseDate || new Date().toISOString().split('T')[0],
          currency: initialData.currency || 'USD',
          buyPrice: initialData.buyPrice !== undefined ? formatNumberWithCommas(initialData.buyPrice) : '',
          sellPrice: initialData.sellPrice !== undefined ? formatNumberWithCommas(initialData.sellPrice) : '',
          condition: initialData.condition || '',
          accessories: initialData.accessories || '',
          note: initialData.notes || ''
        });
      } else {
        setFormData({
          modelName: '',
          brand: '',
          imei: '',
          storage: '',
          ram: '',
          color: '',
          battery: '',
          boughtFrom: '',
          date: new Date().toISOString().split('T')[0],
          currency: 'USD',
          buyPrice: '',
          sellPrice: '',
          condition: '',
          accessories: '',
          note: ''
        });
      }

      return () => {
        cancelAnimationFrame(rAF);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isOpen, initialData]);

  // Detect Brand Type
  const normalizedBrand = (formData.brand || '').trim().toLowerCase();
  const isApple = normalizedBrand === 'apple';
  const isNokia = normalizedBrand === 'nokia';

  // Extract previous unique models for the selected brand
  const brandRecentModels = useMemo(() => {
    if (!formData.brand) return [];
    const matched = (existingMobiles || [])
      .filter(m => m.brand && m.brand.trim().toLowerCase() === formData.brand.trim().toLowerCase() && m.model)
      .map(m => m.model.trim());
    return Array.from(new Set(matched));
  }, [formData.brand, existingMobiles]);

  // Helper to find the most recent matching mobile for auto-fill
  const findPreviousMobile = (brand: string, modelName: string) => {
    if (!brand.trim() || !modelName.trim() || (existingMobiles?.length || 0) === 0) return null;
    return existingMobiles.find(
      m => m.brand && m.brand.trim().toLowerCase() === brand.trim().toLowerCase() &&
           m.model && m.model.trim().toLowerCase() === modelName.trim().toLowerCase()
    ) || null;
  };

  // Auto-fill logic when brand or model name is entered
  const triggerAutoFill = (modelName: string, brandName: string) => {
    if (isEditMode) return;
    const match = findPreviousMobile(brandName, modelName);
    const instantKnownBattery = getKnownBatteryCapacity(brandName, modelName);

    // Set matched data immediately for instant UX speed
    if (match) {
      const matchBrandNorm = (brandName || match.brand || '').trim().toLowerCase();
      const matchIsApple = matchBrandNorm === 'apple';
      const matchIsNokia = matchBrandNorm === 'nokia';

      setFormData(prev => ({
        ...prev,
        brand: brandName || match.brand,
        modelName: modelName,
        storage: matchIsNokia ? '' : (match.storage || prev.storage),
        ram: (matchIsApple || matchIsNokia) ? '' : (match.ram || prev.ram),
        color: match.color || prev.color,
        battery: matchIsNokia ? '' : (match.battery || prev.battery || instantKnownBattery),
        condition: match.condition || prev.condition,
        boughtFrom: match.boughtFrom || prev.boughtFrom,
        currency: match.currency || prev.currency,
        buyPrice: match.buyPrice !== undefined ? formatNumberWithCommas(match.buyPrice) : prev.buyPrice,
        sellPrice: match.sellPrice !== undefined ? formatNumberWithCommas(match.sellPrice) : prev.sellPrice,
        accessories: matchIsNokia ? '' : (match.accessories || prev.accessories),
        note: match.notes || prev.note
      }));
      setAutoFilledFrom(match);
    } else {
      setAutoFilledFrom(null);
      if (instantKnownBattery) {
        setFormData(prev => ({
          ...prev,
          battery: prev.battery || instantKnownBattery
        }));
      }
    }
  };

  // Debounced battery capacity auto-detection for models needing background check
  useEffect(() => {
    if (isEditMode) return;
    const b = (formData.brand || '').trim();
    const m = (formData.modelName || '').trim();
    if (!b || !m || m.length < 2) return;

    const bLower = b.toLowerCase();
    if (bLower === 'apple' || bLower === 'nokia') return;

    // If battery is already populated, do not overwrite
    if (formData.battery && formData.battery.trim() !== '') return;

    const timer = setTimeout(async () => {
      try {
        const capacity = await fetchSmartBatteryCapacity(b, m);
        if (capacity && capacity.trim() !== '') {
          setFormData(prev => {
            if (prev.battery && prev.battery.trim() !== '') return prev;
            return { ...prev, battery: capacity };
          });
        }
      } catch {
        // Non-blocking background catch
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [formData.brand, formData.modelName, formData.battery, isEditMode]);

  // Detect duplicate device from existing inventory
  const trimmedImei = formData.imei.trim();
  const matchedDuplicate = (trimmedImei && (existingMobiles?.length || 0) > 0)
    ? existingMobiles.find(
        m => m.imei && m.imei.trim().toLowerCase() === trimmedImei.toLowerCase() && 
             (!initialData || m.id !== initialData.id)
      )
    : null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'brand') {
      const norm = value.trim().toLowerCase();
      setFormData(prev => ({
        ...prev,
        brand: value,
        ...(norm === 'apple' ? { ram: '' } : {}),
        ...(norm === 'nokia' ? { ram: '', storage: '', battery: '', accessories: '' } : {})
      }));

      if (!isEditMode && formData.modelName) {
        triggerAutoFill(formData.modelName, value);
      }
      return;
    }

    if (name === 'buyPrice' || name === 'sellPrice') {
      const formatted = formatNumberWithCommas(value);
      setFormData(prev => ({ ...prev, [name]: formatted }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));

    if (!isEditMode) {
      if (name === 'modelName') {
        triggerAutoFill(value, formData.brand);
      }
    }
  };

  const handleSelectSuggestedModel = (modelName: string) => {
    setFormData(prev => ({ ...prev, modelName }));
    triggerAutoFill(modelName, formData.brand);
  };

  const handleClearAutoFill = () => {
    setAutoFilledFrom(null);
    setFormData(prev => ({
      ...prev,
      storage: '',
      ram: '',
      color: '',
      battery: '',
      condition: '',
      boughtFrom: '',
      buyPrice: '',
      sellPrice: '',
      accessories: '',
      note: ''
    }));
  };

  const executeSave = (bulkUpdateIds?: string[], newSellPrice?: number) => {
    const payload = {
      ...(initialData ? { id: initialData.id, status: initialData.status } : {}),
      brand: formData.brand,
      model: formData.modelName,
      imei: formData.imei.trim(),
      storage: isNokia ? '' : formData.storage,
      ram: (isApple || isNokia) ? '' : formData.ram,
      color: formData.color,
      battery: isNokia ? '' : formData.battery,
      condition: formData.condition,
      boughtFrom: formData.boughtFrom,
      purchaseDate: formData.date,
      currency: formData.currency,
      buyPrice: parseFormattedNumber(formData.buyPrice),
      sellPrice: parseFormattedNumber(formData.sellPrice),
      accessories: isNokia ? '' : formData.accessories,
      notes: formData.note
    };

    if (onSave) {
      onSave(payload, bulkUpdateIds, newSellPrice);
    }
    setSoldAlertMobile(null);
    setInStockAlertMobile(null);
    setBulkPriceAlert(null);
    resetDrawerScrollToTop();
    onClose();

    // Automatically scroll up to the beginning of the page in order to start another register
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
      document.body.scrollTo({ top: 0, behavior: 'smooth' });
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Check if IMEI already exists in inventory
    if (matchedDuplicate) {
      if (matchedDuplicate.status === 'in_stock') {
        // Block active stock duplicate
        setInStockAlertMobile(matchedDuplicate);
        return;
      } else if (matchedDuplicate.status === 'sold') {
        // Show sold confirmation dialog with historical sales details
        setSoldAlertMobile(matchedDuplicate);
        return;
      }
    }

    // 2. Check if sell price was changed and there are other matching in-stock devices
    const currentSellPriceNum = parseFormattedNumber(formData.sellPrice);
    const isPriceModified = isEditMode 
      ? (initialData && initialData.sellPrice !== currentSellPriceNum)
      : true;

    if (isPriceModified && currentSellPriceNum > 0) {
      const matchingOtherInStock = (existingMobiles || []).filter(m => 
        (!initialData || m.id !== initialData.id) &&
        m.status === 'in_stock' &&
        m.brand && m.brand.trim().toLowerCase() === formData.brand.trim().toLowerCase() &&
        m.model && m.model.trim().toLowerCase() === formData.modelName.trim().toLowerCase() &&
        (isNokia || (m.storage || '').trim().toLowerCase() === formData.storage.trim().toLowerCase()) &&
        (isApple || isNokia || (m.ram || '').trim().toLowerCase() === formData.ram.trim().toLowerCase()) &&
        m.sellPrice !== currentSellPriceNum
      );

      if ((matchingOtherInStock?.length || 0) > 0) {
        setBulkPriceAlert({
          isOpen: true,
          matchingMobiles: matchingOtherInStock,
          newPrice: currentSellPriceNum,
          currency: formData.currency
        });
        return;
      }
    }

    executeSave();
  };

  const openManageModal = (type: keyof typeof INITIAL_OPTIONS, title: string) => {
    setManageModal({ isOpen: true, type, title });
    setNewItemText('');
    setEditingItem(null);
    setEditingText('');
  };

  const closeManageModal = () => {
    setManageModal({ isOpen: false, type: null, title: '' });
    setEditingItem(null);
    setEditingText('');
  };

  const handleAddOption = () => {
    const trimmed = newItemText.trim();
    if (!trimmed || !manageModal.type) return;

    if (!options[manageModal.type].includes(trimmed)) {
      setOptions(prev => ({
        ...prev,
        [manageModal.type!]: [...prev[manageModal.type!], trimmed]
      }));
    }

    // Auto-select the newly added option in the form
    setFormData(prev => ({
      ...prev,
      [manageModal.type!]: trimmed
    }));

    setNewItemText('');
  };

  const handleStartEdit = (item: string) => {
    setEditingItem(item);
    setEditingText(item);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditingText('');
  };

  const handleSaveEdit = (oldItem: string) => {
    const trimmed = editingText.trim();
    if (!trimmed || !manageModal.type) return;

    if (trimmed !== oldItem) {
      setOptions(prev => ({
        ...prev,
        [manageModal.type!]: prev[manageModal.type!].map(item => item === oldItem ? trimmed : item)
      }));

      // If the currently selected form value was the old item, update it to the new name
      if (formData[manageModal.type as keyof typeof formData] === oldItem) {
        setFormData(prev => ({ ...prev, [manageModal.type!]: trimmed }));
      }
    }

    setEditingItem(null);
    setEditingText('');
  };

  const handleDeleteOption = (itemToRemove: string) => {
    if (!manageModal.type) return;
    setOptions(prev => ({
      ...prev,
      [manageModal.type!]: prev[manageModal.type!].filter(item => item !== itemToRemove)
    }));
    // If the currently selected form value is deleted, reset it
    if (formData[manageModal.type as keyof typeof formData] === itemToRemove) {
      setFormData(prev => ({ ...prev, [manageModal.type!]: '' }));
    }
  };

  const handleSelectOption = (item: string) => {
    if (!manageModal.type) return;
    setFormData(prev => ({
      ...prev,
      [manageModal.type!]: item
    }));
  };

  // Global Hardware Barcode Gun listener when drawer is open
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = cameraService.subscribeHardwareScanner((result) => {
      sound.playScan();
      setFormData(prev => ({ ...prev, imei: result.code.trim() }));
    });
    return () => unsubscribe();
  }, [isOpen]);

  // Helper component for Combo Box with Manage Button
  const ComboBox = ({ 
    label, 
    name, 
    typeTitle, 
    typeKey,
    required = false,
    disabled = false,
    disabledPlaceholder
  }: { 
    label: string; 
    name: keyof typeof formData; 
    typeTitle: string; 
    typeKey: keyof typeof INITIAL_OPTIONS;
    required?: boolean;
    disabled?: boolean;
    disabledPlaceholder?: string;
  }) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className={cn("block text-xs font-medium", disabled ? "text-slate-500" : "text-slate-400")}>
          {label} {required && !disabled && <span className="text-rose-500">*</span>}
        </label>
        {disabled && (
          <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-500 border border-slate-700/50">
            Disabled
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <select
          name={name}
          value={disabled ? '' : formData[name]}
          onChange={handleChange}
          required={required && !disabled}
          disabled={disabled}
          className={cn(
            "flex-1 h-11 py-2.5 leading-normal rounded-xl border bg-slate-900/50 px-3.5 text-sm transition-colors",
            disabled
              ? "border-slate-800/80 bg-slate-900/30 text-slate-500 cursor-not-allowed"
              : "border-slate-700 text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          )}
        >
          <option value="" disabled>{disabled ? (disabledPlaceholder || 'Not applicable') : `Select ${label}`}</option>
          {!disabled && options[typeKey].map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={disabled}
          onClick={() => openManageModal(typeKey, typeTitle)}
          className={cn(
            "shrink-0 flex items-center justify-center w-11 h-11 rounded-xl border transition-colors",
            disabled
              ? "border-slate-800 bg-slate-900/30 text-slate-700 cursor-not-allowed"
              : "border-slate-700 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer"
          )}
          title={`Manage ${typeTitle}`}
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // Lock background scrolling when drawer or any of its sub-modals are open
  useModalScrollLock(isOpen || !!manageModal.isOpen || isScanning || !!soldAlertMobile, 'add-mobile-drawer');

  return (
    <>
      {/* Drawer Overlay */}
      <div 
        data-modal-backdrop="true"
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 touch-none overscroll-contain",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none invisible"
        )}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div 
        data-drawer="true"
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed inset-y-0 right-0 rtl:right-auto rtl:left-0 z-50 w-full max-w-2xl bg-[#0b0f1a] border-l rtl:border-l-0 rtl:border-r border-slate-800/50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out font-sans",
          isOpen ? "translate-x-0" : "translate-x-full rtl:-translate-x-full pointer-events-none invisible"
        )}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/50 bg-[#080b14]/50">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {isEditMode ? t('drawer.editMobileTitle') : t('drawer.addMobileTitle')}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isEditMode ? t('drawer.editMobileSubtitle') : t('drawer.addMobileSubtitle')}
            </p>
          </div>
          <button 
            onClick={() => {
              resetDrawerScrollToTop();
              onClose();
            }}
            className="p-2 text-slate-500 hover:text-white hover:bg-slate-800/50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div ref={formScrollContainerRef} data-modal-scrollable="true" className="flex-1 overflow-y-auto p-6 custom-scrollbar overscroll-contain">
          <form 
            id="add-mobile-form" 
            onSubmit={handleSave} 
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                e.preventDefault();
              }
            }}
            className="space-y-8"
          >
            
            {/* Section 1: Device Details */}
            <div>
              <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                {t('drawer.deviceInfo')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <ComboBox label={t('drawer.brand')} name="brand" typeTitle="Brands" typeKey="brand" required />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-slate-400">
                      {t('drawer.model')} <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <ModelCombobox
                    value={formData.modelName}
                    brand={formData.brand}
                    existingMobiles={existingMobiles}
                    onChange={(val) => {
                      setFormData(prev => ({ ...prev, modelName: val }));
                      if (!isEditMode) {
                        triggerAutoFill(val, formData.brand);
                      }
                    }}
                    onSelectModel={handleSelectSuggestedModel}
                    onSelectBrand={(b) => {
                      handleChange({ target: { name: 'brand', value: b } } as any);
                    }}
                    placeholder={t('drawer.modelPlaceholder')}
                    required
                  />
                </div>

                {/* Auto-filled Notification Banner */}
                {autoFilledFrom && !isEditMode && (
                  <div className="md:col-span-2 p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between gap-3 text-xs text-indigo-200 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-white flex items-center gap-1.5">
                          {t('drawer.autoFilledTitle')}
                          <span className="px-1.5 py-0.2 rounded bg-indigo-500/30 text-[10px] font-mono text-indigo-200">
                            {autoFilledFrom.storage || 'Standard'} • {autoFilledFrom.ram || 'RAM'}
                          </span>
                        </p>
                        <p className="text-slate-300 text-[11px] mt-0.5">
                          {t('drawer.autoFilledDesc1')}{formatCurrency(autoFilledFrom.buyPrice || 0, autoFilledFrom.currency)}{t('drawer.autoFilledDesc2')}{formatCurrency(autoFilledFrom.sellPrice || 0, autoFilledFrom.currency)}{t('drawer.autoFilledDesc3')} <strong className="text-white">{autoFilledFrom.brand} {autoFilledFrom.model}</strong>.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearAutoFill}
                      className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700 transition-colors cursor-pointer"
                    >
                      {t('drawer.clear')}
                    </button>
                  </div>
                )}

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-slate-400">{t('drawer.imei')} <span className="text-rose-500">*</span></label>
                  </div>
                  <div className="relative flex items-center w-full group">
                    <input
                      type="text"
                      id="input-mobile-imei"
                      name="imei"
                      required
                      value={formData.imei}
                      onChange={handleChange}
                      placeholder={t('drawer.imeiPlaceholder')}
                      className={cn(
                        "w-full h-11 py-2.5 leading-normal rounded-xl border bg-slate-900/50 ps-3.5 pe-20 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none transition-all font-mono rtl:text-right text-left",
                        matchedDuplicate?.status === 'in_stock'
                          ? "border-rose-500/70 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                          : matchedDuplicate?.status === 'sold'
                          ? "border-amber-500/70 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                          : "border-slate-700 hover:border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      )}
                    />

                    {/* Inside-Input Actions Tray */}
                    <div className="absolute inset-y-0 end-1.5 flex items-center gap-1.5 z-10">
                      {formData.imei && (
                        <>
                          <button
                            type="button"
                            id="btn-drawer-clear-imei"
                            onClick={() => setFormData(prev => ({ ...prev, imei: '' }))}
                            className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors focus:outline-none cursor-pointer"
                            title={t('drawer.clear')}
                            aria-label={t('drawer.clear')}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <div className="w-px h-4 bg-slate-700/80" />
                        </>
                      )}

                      <button
                        type="button"
                        id="btn-drawer-scan-imei"
                        onClick={() => setIsScanning(true)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 active:bg-indigo-500/35 text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-400/50 transition-all cursor-pointer shadow-sm group/scan active:scale-95 shrink-0"
                        title={t('drawer.scan')}
                        aria-label={t('drawer.scan')}
                      >
                        <ScanLine className="w-4 h-4 text-indigo-400 group-hover/scan:text-indigo-300 group-hover/scan:scale-110 transition-transform" />
                      </button>
                    </div>
                  </div>

                  {/* Real-time Inline Feedback for Duplicate In-Stock */}
                  {matchedDuplicate && matchedDuplicate.status === 'in_stock' && (
                    <div className="mt-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in duration-200">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-rose-200">{t('drawer.duplicateInStockTitle')}</p>
                        <p className="text-slate-300 mt-0.5 leading-relaxed">
                          {t('drawer.duplicateInStockDesc1')} <strong className="text-white">{matchedDuplicate.brand} {matchedDuplicate.model}</strong> ({matchedDuplicate.storage || 'N/A'}, {matchedDuplicate.color || 'N/A'}). {t('drawer.duplicateInStockDesc2')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Real-time Inline Feedback for Sold Device Match */}
                  {matchedDuplicate && matchedDuplicate.status === 'sold' && (
                    <div className="mt-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3 text-xs text-amber-300 animate-in fade-in duration-200">
                      <div className="flex items-start gap-2.5">
                        <History className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-amber-200 flex items-center gap-2">
                            {t('drawer.previouslySoldTitle')}
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[10px] font-mono border border-amber-500/30 text-amber-300 font-bold">
                              {t('drawer.soldRecord')}
                            </span>
                          </p>
                          <p className="text-slate-300 mt-0.5 leading-relaxed">
                            {t('drawer.previouslySoldDesc1')} <strong className="text-white">{matchedDuplicate.soldDate || 'Unknown Date'}</strong> {t('drawer.previouslySoldDesc2')} <strong className="text-emerald-400 font-mono">{formatCurrency(matchedDuplicate.soldPrice || 0, matchedDuplicate.currency)}</strong> {matchedDuplicate.soldToCustomer ? `${t('drawer.previouslySoldDesc3')} ${matchedDuplicate.soldToCustomer}` : ''}.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSoldAlertMobile(matchedDuplicate)}
                        className="shrink-0 px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-semibold border border-amber-500/30 transition-colors cursor-pointer"
                      >
                        {t('drawer.viewHistory')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Specifications */}
            <div>
              <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                {t('drawer.specifications')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <ComboBox 
                  label={t('drawer.storage')} 
                  name="storage" 
                  typeTitle={t('drawer.storageOptions')} 
                  typeKey="storage" 
                  required={!isNokia}
                  disabled={isNokia}
                  disabledPlaceholder={t('drawer.disabledForNokia')}
                />
                <ComboBox 
                  label={t('drawer.ram')} 
                  name="ram" 
                  typeTitle={t('drawer.ramOptions')} 
                  typeKey="ram" 
                  required={!isApple && !isNokia}
                  disabled={isApple || isNokia}
                  disabledPlaceholder={isApple ? "N/A (Apple Devices)" : t('drawer.disabledForNokia')}
                />
                <ComboBox label={t('drawer.color')} name="color" typeTitle={t('drawer.colorOptions')} typeKey="color" required />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={cn("block text-xs font-medium", isNokia ? "text-slate-500" : "text-slate-400")}>
                      {isApple 
                        ? t('drawer.batteryApple') 
                        : isNokia 
                        ? t('drawer.batteryNokia') 
                        : t('drawer.batteryAndroid')}
                    </label>
                    {isNokia ? (
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-500 border border-slate-700/50">
                        {t('drawer.disabledForNokia')}
                      </span>
                    ) : isApple ? (
                      <span className="text-[10px] text-emerald-400 font-mono font-medium">
                        {t('drawer.healthPct')}
                      </span>
                    ) : (
                      <span className="text-[10px] text-cyan-400 font-mono font-medium">
                        {t('drawer.capacityMah')}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      name="battery"
                      disabled={isNokia}
                      value={isNokia ? '' : formData.battery}
                      onChange={handleChange}
                      placeholder={
                        isApple 
                          ? t('drawer.batteryApplePlaceholder') 
                          : isNokia 
                          ? t('drawer.batteryNokiaPlaceholder') 
                          : t('drawer.batteryAndroidPlaceholder')
                      }
                      className={cn(
                        "w-full h-11 rounded-xl border ps-3.5 pe-10 text-sm transition-colors text-left rtl:text-right font-mono",
                        isNokia
                          ? "border-slate-800/80 bg-slate-900/30 text-slate-500 cursor-not-allowed placeholder:text-slate-700"
                          : "border-slate-700 bg-slate-900/50 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      )}
                    />
                    {!isNokia && formData.battery && (
                      <div className="absolute inset-y-0 end-0 flex items-center pe-2.5 pointer-events-none">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, battery: '' }))}
                          className="pointer-events-auto flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
                          title={t('drawer.clear')}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <ComboBox label={t('drawer.condition')} name="condition" typeTitle={t('drawer.conditionOptions')} typeKey="condition" required />
                </div>
              </div>
            </div>

            {/* Section 3: Financials & Procurement */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {t('drawer.pricing')}
                </h3>
                {/* Currency Selector */}
                <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, currency: 'USD' }))}
                    className={cn(
                      "px-3 py-1 text-xs font-semibold rounded-lg transition-colors",
                      formData.currency === 'USD'
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    USD ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, currency: 'IQD' }))}
                    className={cn(
                      "px-3 py-1 text-xs font-semibold rounded-lg transition-colors",
                      formData.currency === 'IQD'
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    IQD (د.ع)
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">{t('drawer.boughtFrom')}</label>
                  <BoughtFromCombobox
                    value={formData.boughtFrom}
                    existingMobiles={existingMobiles}
                    knownSuppliers={knownSuppliers}
                    onChange={(val) => {
                      setFormData(prev => ({ ...prev, boughtFrom: val }));
                    }}
                    placeholder={t('drawer.boughtFromPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">{t('drawer.dateOfPurchase')}</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full h-11 py-2.5 leading-normal rounded-xl border border-slate-700 bg-slate-900/50 px-3.5 text-sm text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors [color-scheme:dark]"
                  />
                </div>

                {/* Buy Price */}
                <CurrencyPriceInput
                  name="buyPrice"
                  label={t('drawer.buyPrice')}
                  required
                  value={formData.buyPrice}
                  currency={formData.currency}
                  onChange={handleChange}
                  onClear={() => setFormData(prev => ({ ...prev, buyPrice: '' }))}
                  onCurrencyToggle={() => setFormData(prev => ({ ...prev, currency: prev.currency === 'USD' ? 'IQD' : 'USD' }))}
                  accent="indigo"
                />

                {/* Target Sell Price */}
                <CurrencyPriceInput
                  name="sellPrice"
                  label={t('drawer.targetSellPrice')}
                  required
                  value={formData.sellPrice}
                  currency={formData.currency}
                  onChange={handleChange}
                  onClear={() => setFormData(prev => ({ ...prev, sellPrice: '' }))}
                  onCurrencyToggle={() => setFormData(prev => ({ ...prev, currency: prev.currency === 'USD' ? 'IQD' : 'USD' }))}
                  accent="emerald"
                />

                {/* Real-time Financial Margin Preview */}
                {(() => {
                  const buyNum = parseFormattedNumber(formData.buyPrice);
                  const sellNum = parseFormattedNumber(formData.sellPrice);
                  if (buyNum > 0 && sellNum > 0) {
                    const profit = sellNum - buyNum;
                    const marginPct = (profit / buyNum) * 100;
                    return (
                      <div className={cn(
                        "col-span-1 md:col-span-2 rounded-xl px-4 py-2.5 flex items-center justify-between border text-xs font-mono transition-all",
                        profit >= 0
                          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                          : "bg-rose-500/10 border-rose-500/25 text-rose-300"
                      )}>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            profit >= 0 ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                          )} />
                          <span className="font-semibold text-slate-200">
                            {profit >= 0 ? t('drawer.expectedProfit', 'Target Margin / Unit Profit') : t('drawer.sellingLoss', 'Selling at Loss')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-semibold">
                          <span>
                            {profit >= 0 ? '+' : ''}{formatCurrency(profit, formData.currency)}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                            profit >= 0
                              ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                              : "bg-rose-500/20 border-rose-500/30 text-rose-300"
                          )}>
                            {profit >= 0 ? '+' : ''}{marginPct.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            {/* Section 4: Extras */}
            <div>
              <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                {t('drawer.extras')}
              </h3>
              <div className="space-y-5">
                <ComboBox 
                  label={t('drawer.accessories')} 
                  name="accessories" 
                  typeTitle={t('drawer.accessoriesOptions')} 
                  typeKey="accessories" 
                  disabled={isNokia}
                  disabledPlaceholder={t('drawer.disabledForNokia')}
                />
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">{t('drawer.additionalNotes')}</label>
                  <div className="relative">
                    <textarea
                      name="note"
                      value={formData.note}
                      onChange={handleChange}
                      rows={3}
                      placeholder={t('drawer.notesPlaceholder')}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/50 py-2.5 ps-3.5 pe-10 text-sm text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
                    ></textarea>
                    {formData.note && (
                      <div className="absolute top-2.5 end-2.5 pointer-events-none">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, note: '' }))}
                          className="pointer-events-auto flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
                          title={t('drawer.clear')}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-800/50 bg-[#080b14]/50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-700 bg-transparent text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            {t('drawer.cancel')}
          </button>
          <button
            type="submit"
            form="add-mobile-form"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all"
          >
            <Save className="w-4 h-4" />
            {isEditMode ? t('drawer.updateMobile') : t('drawer.saveMobile')}
          </button>
        </div>
      </div>

      {/* Manage Options Modal */}
      {manageModal.isOpen && manageModal.type && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#161c2c] rounded-2xl border border-slate-700 shadow-2xl flex flex-col font-sans overflow-hidden scale-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-800/50 bg-[#080b14]/50 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white tracking-wide">{t('drawer.manageTitle')} {manageModal.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{t('drawer.manageSubtitle')}</p>
              </div>
              <button onClick={closeManageModal} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5">
              {/* Add New Option Form */}
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1 flex items-center">
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
                    placeholder={t('drawer.addNew')}
                    className="w-full h-11 py-2.5 leading-normal rounded-xl border border-slate-700 bg-slate-900/50 ps-3.5 pe-10 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  {newItemText && (
                    <div className="absolute inset-y-0 end-0 flex items-center pe-2.5 pointer-events-none z-10">
                      <button
                        type="button"
                        onClick={() => setNewItemText('')}
                        className="pointer-events-auto flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
                        title={t('drawer.clear')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleAddOption}
                  disabled={!newItemText.trim()}
                  className="shrink-0 flex items-center justify-center px-4 h-11 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-indigo-500/20"
                >
                  <Plus className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0" /> {t('drawer.add')}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 mb-2 px-1">
                <span>{t('drawer.availableOptions')} ({options[manageModal.type]?.length || 0})</span>
                <span>{t('drawer.clickToSelect')}</span>
              </div>

              {/* Options List with Inline Edit & Delete */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1 rtl:pr-0 rtl:pl-1">
                {(options[manageModal.type]?.length || 0) === 0 ? (
                  <div className="text-center text-slate-500 text-sm py-8 border border-dashed border-slate-800 rounded-xl">
                    {t('drawer.noOptions')}
                  </div>
                ) : (
                  (options[manageModal.type] || []).map(opt => {
                    const isSelected = formData[manageModal.type as keyof typeof formData] === opt;
                    const isCurrentlyEditing = editingItem === opt;

                    if (isCurrentlyEditing) {
                      return (
                        <div key={opt} className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-indigo-500/50 shadow-inner">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              autoFocus
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(opt);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              className="w-full h-9 rounded-lg border border-slate-700 bg-slate-800/80 ps-2.5 pe-8 text-sm text-white focus:border-indigo-500 focus:outline-none"
                              placeholder={t('drawer.optionName')}
                            />
                            {editingText && (
                              <div className="absolute inset-y-0 end-0 flex items-center pe-1.5 pointer-events-none">
                                <button
                                  type="button"
                                  onClick={() => setEditingText('')}
                                  className="pointer-events-auto flex items-center justify-center w-6 h-6 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition-colors focus:outline-none"
                                  title={t('drawer.clear')}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(opt)}
                            className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shrink-0"
                            title="Save changes"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors shrink-0"
                            title="Cancel edit"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={opt}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-xl border transition-all group cursor-pointer",
                          isSelected 
                            ? "bg-indigo-950/40 border-indigo-500/40 text-indigo-200" 
                            : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/80 hover:border-slate-600 text-slate-200"
                        )}
                        onClick={() => handleSelectOption(opt)}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          {isSelected ? (
                            <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0 group-hover:border-slate-400" />
                          )}
                          <span className="text-sm font-medium truncate">{opt}</span>
                          {isSelected && (
                            <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              Selected
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(opt)}
                            className="text-slate-400 hover:text-indigo-400 hover:bg-slate-700/60 p-1.5 rounded-lg transition-colors"
                            title="Edit / Rename option"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOption(opt)}
                            className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors"
                            title="Delete option"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-800/50 bg-[#080b14]/50 flex items-center justify-between">
              <span className="text-xs text-slate-500">Changes apply immediately</span>
              <button
                onClick={closeManageModal}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors shadow-sm shadow-indigo-500/20"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#161c2c] rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-800/50 bg-[#080b14]/50 flex items-center justify-between">
              <h3 className="font-semibold text-white tracking-wide flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-indigo-400" />
                Scan IMEI / Barcode
              </h3>
              <button onClick={() => setIsScanning(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Permanent camera access</span>
                </div>
                {(cameraDevices?.length || 0) > 1 && (
                  <select
                    value={activeCameraId}
                    onChange={(e) => {
                      setActiveCameraId(e.target.value);
                      cameraService.setPreferredDeviceId(e.target.value);
                    }}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none"
                  >
                    {(cameraDevices || []).map((c, i) => (
                      <option key={c.deviceId || i} value={c.deviceId}>
                        {c.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div id="qr-reader" className="w-full rounded-xl overflow-hidden border border-slate-800/50 bg-black min-h-[160px]"></div>
              <p className="text-center text-slate-400 text-xs">Point your camera at the IMEI or barcode</p>
            </div>
          </div>
        </div>
      )}

      {/* Previously Sold Mobile Alert & Decision Modal */}
      {soldAlertMobile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#111625] rounded-3xl border border-amber-500/40 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-sans">
            
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-[#111625] border-b border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base tracking-tight">{t('drawer.soldAlertTitle')}</h3>
                  <p className="text-xs text-amber-300 font-medium">{t('drawer.soldAlertSubtitle')}</p>
                </div>
              </div>
              <button 
                onClick={() => setSoldAlertMobile(null)} 
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="text-sm text-slate-200 leading-relaxed">
                {t('drawer.soldAlertBody')} <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">{soldAlertMobile.imei}</span> {t('drawer.soldAlertBody2')}
              </div>

              {/* Historical Record Box */}
              <div className="p-4 rounded-2xl bg-[#090d18] border border-slate-800 space-y-3.5 shadow-inner">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-white text-sm">
                      {soldAlertMobile.brand} {soldAlertMobile.model}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    {t('drawer.soldRecord')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3.5 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> {t('drawer.soldDate')}
                    </span>
                    <p className="font-bold text-white font-mono">{soldAlertMobile.soldDate || 'Unknown Date'}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                      <DollarSign className="w-3.5 h-3.5 text-amber-400" /> {t('drawer.soldPrice')}
                    </span>
                    <p className="font-extrabold text-amber-400 font-mono text-sm">
                      {formatCurrency(soldAlertMobile.soldPrice || 0, soldAlertMobile.currency)}
                    </p>
                  </div>

                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                      <User className="w-3.5 h-3.5 text-cyan-400" /> {t('drawer.soldTo')}
                    </span>
                    <p className="font-semibold text-slate-200 truncate">
                      {soldAlertMobile.soldToCustomer || t('drawer.walkIn')}
                    </p>
                  </div>

                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                      <History className="w-3.5 h-3.5 text-indigo-400" /> {t('drawer.originalCost')}
                    </span>
                    <p className="font-semibold text-slate-300 font-mono">
                      {formatCurrency(soldAlertMobile.buyPrice || 0, soldAlertMobile.currency)}
                    </p>
                  </div>

                  {soldAlertMobile.soldNotes && (
                    <div className="col-span-2 pt-2 border-t border-slate-800/60 text-slate-400 text-[11px]">
                      <span className="font-medium text-slate-300">{t('drawer.previousNote')}</span> {soldAlertMobile.soldNotes}
                    </div>
                  )}
                </div>
              </div>

              {/* Trade-in / Decision Prompt */}
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2.5">
                <RefreshCw className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {t('drawer.tradeInPrompt')}
                </p>
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="px-6 py-4 bg-[#080b14]/80 border-t border-slate-800/80 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSoldAlertMobile(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors"
              >
                {t('drawer.cancelOrChange')}
              </button>
              <button
                type="button"
                onClick={executeSave}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {t('drawer.continueAndRegister')}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Duplicate Active In-Stock Alert Modal */}
      {inStockAlertMobile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#111625] rounded-3xl border border-rose-500/40 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-sans">
            
            {/* Header */}
            <div className="px-6 py-5 bg-rose-950/30 border-b border-rose-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base tracking-tight">{t('drawer.inStockAlertTitle')}</h3>
                  <p className="text-xs text-rose-300 font-medium">{t('drawer.inStockAlertSubtitle')}</p>
                </div>
              </div>
              <button 
                onClick={() => setInStockAlertMobile(null)} 
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('drawer.inStockAlertBody')} <span className="font-mono font-bold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">{inStockAlertMobile.imei}</span> {t('drawer.inStockAlertBody2')}
              </p>

              <div className="p-4 rounded-2xl bg-[#090d18] border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span className="font-bold text-white">{inStockAlertMobile.brand} {inStockAlertMobile.model}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    In Stock
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
                  <div><span className="text-slate-400">{t('drawer.colorLabel')}</span> {inStockAlertMobile.color || 'N/A'}</div>
                  <div><span className="text-slate-400">{t('drawer.storageLabel')}</span> {inStockAlertMobile.storage || 'N/A'}</div>
                  <div><span className="text-slate-400">{t('drawer.purchasedLabel')}</span> {inStockAlertMobile.purchaseDate || 'N/A'}</div>
                  <div><span className="text-slate-400">{t('drawer.targetPriceLabel')}</span> <span className="text-emerald-400 font-semibold">{formatCurrency(inStockAlertMobile.sellPrice, inStockAlertMobile.currency)}</span></div>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {t('drawer.inStockAlertFooter')}
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-[#080b14]/70 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setInStockAlertMobile(null)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
              >
                {t('drawer.understood')}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Bulk Sell Price Update Modal */}
      {bulkPriceAlert && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#111625] rounded-3xl border border-indigo-500/40 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-sans">
            
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-indigo-950/40 via-indigo-900/20 to-[#111625] border-b border-indigo-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base tracking-tight">{t('drawer.bulkUpdateTitle')}</h3>
                  <p className="text-xs text-indigo-300 font-medium">{t('drawer.bulkUpdateSubtitle')}</p>
                </div>
              </div>
              <button 
                onClick={() => setBulkPriceAlert(null)} 
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="text-sm text-slate-200 leading-relaxed">
                {t('drawer.bulkUpdateBody1')} <strong className="text-white">{formData.brand} {formData.modelName}</strong> ({formData.storage || 'N/A'}, {formData.ram || 'N/A'}) {t('drawer.bulkUpdateBody2')} <strong className="text-emerald-400 font-mono text-base">{formatCurrency(bulkPriceAlert.newPrice, bulkPriceAlert.currency)}</strong>.
              </div>

              <div className="p-4 rounded-2xl bg-[#090d18] border border-slate-800 space-y-3 shadow-inner">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/80">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span>{t('drawer.otherInStock')} ({bulkPriceAlert.matchingMobiles?.length || 0})</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {t('drawer.sameModel')}
                  </span>
                </div>

                <div className="max-h-44 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {(bulkPriceAlert.matchingMobiles || []).map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
                      <div>
                        <div className="font-mono font-medium text-slate-200">{m.imei || 'No IMEI'}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{m.color || 'Standard'} • Purchased {m.purchaseDate || 'N/A'}</div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-slate-500 line-through text-[11px]">
                            {formatCurrency(m.sellPrice, m.currency)}
                          </span>
                          <ArrowRight className="w-3 h-3 text-indigo-400 rtl:rotate-180" />
                          <span className="font-bold text-emerald-400">
                            {formatCurrency(bulkPriceAlert.newPrice, bulkPriceAlert.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {t('drawer.bulkUpdateFooter')} <strong className="text-white">{bulkPriceAlert.matchingMobiles?.length || 0}</strong> {t('drawer.bulkUpdateFooter2')}
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-[#080b14]/80 border-t border-slate-800/80 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setBulkPriceAlert(null);
                  executeSave();
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
              >
                {t('drawer.updateOnlyThis')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const bulkIds = (bulkPriceAlert.matchingMobiles || []).map(m => m.id);
                  setBulkPriceAlert(null);
                  executeSave(bulkIds, bulkPriceAlert.newPrice);
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {t('drawer.updateAll')} ({(bulkPriceAlert.matchingMobiles?.length || 0) + 1}) {t('drawer.devices')}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* IMEI Live Camera Scanner Modal */}
      <CameraScannerModal
        isOpen={isScanning}
        onClose={() => setIsScanning(false)}
        onScan={(code) => {
          setFormData(prev => ({ ...prev, imei: code.trim() }));
        }}
        title={t('drawer.scanTitle')}
        subtitle={t('drawer.scanSubtitle')}
        placeholder={t('drawer.imeiPlaceholder')}
        continuousMode={false}
      />
    </>
  );
}
