import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Calendar, 
  DollarSign, 
  Layers, 
  Package, 
  Tag, 
  Barcode as BarcodeIcon, 
  Building2, 
  Sparkles, 
  Upload, 
  Image as ImageIcon, 
  ShieldCheck, 
  MapPin, 
  Info,
  RefreshCw,
  Box,
  Bell,
  BellOff,
  RotateCcw,
  Search
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cameraService, CameraDeviceInfo } from '../../lib/cameraService';
import CameraScannerModal from '../common/CameraScannerModal';
import { sound } from '../../lib/sound';
import { formatCurrency, formatNumberWithCommas, parseFormattedNumber, cn } from '../../lib/utils';
import { Accessory, CurrencyType } from '../../types/accessory';
import { getCategoryTranslation, getWarrantyTranslation } from '../../lib/accessoryTranslations';
import { 
  getSyncAccessorySuppliers, 
  fetchAllAccessorySuppliers, 
  ACCESSORY_OPTIONS_CHANGED_EVENT, 
  ACCESSORY_OPTIONS_KEY,
  DEFAULT_ACCESSORY_SUPPLIERS 
} from '../../lib/accessorySuppliers';
import CurrencyPriceInput from '../common/CurrencyPriceInput';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useModalScrollLock } from '../../lib/modalLock';

interface AddAccessoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Accessory | null;
  onSave: (accessoryData: Omit<Accessory, 'id' | 'createdAt' | 'updatedAt'>) => void;
  existingAccessories?: Accessory[];
}

// Initial default options for fast selection
export const INITIAL_OPTIONS = {
  brand: [
    'Anker', 
    'Apple', 
    'Samsung', 
    'Baseus', 
    'Joyroom', 
    'JBL', 
    'Sony', 
    'Belkin', 
    'LDNIO', 
    'Xiaomi', 
    'Oraimo', 
    'Green Lion', 
    'Remax', 
    'UGREEN',
    'Generic / OEM'
  ],
  category: [
    'Chargers & Adapters', 
    'Cables & Adapters', 
    'Wireless Earbuds', 
    'Headphones & Audio', 
    'Power Banks', 
    'Screen Protectors & Glass', 
    'Protective Cases & Covers', 
    'Smartwatch Accessories', 
    'Car Mounts & Holders', 
    'Bluetooth Speakers', 
    'Storage & Flash Drives', 
    'Cleaning & Tool Kits',
    'Gaming Triggers & Coolers'
  ],
  company: [
    'Thomas Walkers',
    'Anker Official Regional Hub', 
    'Dubai Wholesale Trading', 
    'Erbil Mobile Distribution', 
    'Direct Factory Import', 
    'Al-Rayan Tech Supply', 
    'Local Wholesaler', 
    'TechZone Accessories'
  ],
  warranty: [
    '12 Months Official Replacement', 
    '6 Months Store Warranty', 
    '3 Months Testing Warranty', 
    '1 Month Warranty', 
    'No Warranty'
  ]
};

export function getStoredSupplierCompanies(): string[] {
  return getSyncAccessorySuppliers();
}

export default function AddAccessoryDrawer({
  isOpen,
  onClose,
  initialData,
  onSave,
  existingAccessories = []
}: AddAccessoryDrawerProps) {
  const { t, i18n } = useTranslation();

  // Option lists with synchronized accessory suppliers
  const [options, setOptions] = useState(() => {
    try {
      const saved = localStorage.getItem(ACCESSORY_OPTIONS_KEY);
      const parsed = saved ? JSON.parse(saved) : INITIAL_OPTIONS;
      const syncedCompanies = getSyncAccessorySuppliers();
      return {
        ...INITIAL_OPTIONS,
        ...parsed,
        company: (syncedCompanies?.length || 0) > 0 ? syncedCompanies : INITIAL_OPTIONS.company
      };
    } catch {
      return {
        ...INITIAL_OPTIONS,
        company: getSyncAccessorySuppliers()
      };
    }
  });

  // Save options on change and broadcast to Quick Restock and other views (only when content actually changes)
  const prevOptionsJsonRef = useRef(JSON.stringify(options));
  useEffect(() => {
    const currentJson = JSON.stringify(options);
    if (currentJson === prevOptionsJsonRef.current) {
      return;
    }
    prevOptionsJsonRef.current = currentJson;

    try {
      localStorage.setItem(ACCESSORY_OPTIONS_KEY, currentJson);
      window.dispatchEvent(new CustomEvent(ACCESSORY_OPTIONS_CHANGED_EVENT, { 
        detail: { ...options, _source: 'AddAccessoryDrawer' } 
      }));
      
      // Sync to cloud so other devices see the custom accessory brands/categories
      if (isSupabaseConfigured()) {
        const saveOptions = async () => {
          try {
            await supabase.from('settings').upsert(
              { key: ACCESSORY_OPTIONS_KEY, value: options as any }, 
              { onConflict: 'key' }
            );
          } catch (err) {}
        };
        saveOptions();
      }
    } catch (e) {
      console.error(e);
    }
  }, [options]);

  // Pull from Supabase on mount to get cross-device brands/categories
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let isMounted = true;
    const fetchOptions = async () => {
      try {
        const { data, error } = await supabase.from('settings').select('value').eq('key', ACCESSORY_OPTIONS_KEY).single();
        if (!error && data?.value && isMounted) {
          const merged = { ...INITIAL_OPTIONS, ...(data.value as any) };
          const mergedJson = JSON.stringify(merged);
          setOptions(prev => {
            if (JSON.stringify(prev) === mergedJson) return prev;
            return merged;
          });
          localStorage.setItem(ACCESSORY_OPTIONS_KEY, mergedJson);
        }
      } catch (err) {}
    };
    fetchOptions();
    return () => { isMounted = false; };
  }, []);

  // Synchronize in real time when options change externally (e.g. supplier added in Quick Direct Restock)
  useEffect(() => {
    const handleUpdate = (e?: Event) => {
      // Ignore events dispatched by this component itself
      const customEv = e as CustomEvent;
      if (customEv?.detail?._source === 'AddAccessoryDrawer') {
        return;
      }

      try {
        const saved = localStorage.getItem(ACCESSORY_OPTIONS_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.company)) {
            setOptions(prev => {
              // Strict comparison: if array elements match, return same reference to prevent re-render
              if (
                Array.isArray(prev.company) &&
                prev.company.length === parsed.company.length &&
                prev.company.every((item: string, idx: number) => item === parsed.company[idx])
              ) {
                return prev;
              }
              return {
                ...prev,
                company: parsed.company
              };
            });
          }
        }
      } catch {}
    };

    window.addEventListener(ACCESSORY_OPTIONS_CHANGED_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(ACCESSORY_OPTIONS_CHANGED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Fetch full suppliers across DB and local caches whenever drawer is opened
  useEffect(() => {
    if (isOpen) {
      resetAccessoryScrollToTop();
      const rAF = requestAnimationFrame(resetAccessoryScrollToTop);
      const t1 = setTimeout(resetAccessoryScrollToTop, 40);
      const t2 = setTimeout(resetAccessoryScrollToTop, 120);
      const t3 = setTimeout(resetAccessoryScrollToTop, 320);

      let isMounted = true;
      fetchAllAccessorySuppliers().then(merged => {
        if (isMounted && merged && (merged?.length || 0) > 0) {
          setOptions(prev => {
            const currentSet = new Set(prev.company);
            let hasNew = false;
            merged.forEach(m => {
              if (!currentSet.has(m)) hasNew = true;
            });
            return hasNew ? { ...prev, company: merged } : prev;
          });
        }
      });
      return () => { 
        isMounted = false;
        cancelAnimationFrame(rAF);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isOpen]);

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const accessoryScrollRef = useRef<HTMLDivElement>(null);

  const resetAccessoryScrollToTop = () => {
    if (accessoryScrollRef.current) {
      accessoryScrollRef.current.scrollTop = 0;
      accessoryScrollRef.current.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  };

  const isEditMode = !!initialData;

  // Auto-fill & Suggestion State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autofilledItem, setAutofilledItem] = useState<Accessory | null>(null);
  const nameContainerRef = useRef<HTMLDivElement>(null);

  // Form State - All empty by default when adding
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: '',
    barcode: '',
    company: '',
    quantity: '',
    notifyEnabled: false,
    notifyThreshold: '',
    currency: 'USD' as CurrencyType,
    buyPrice: '',
    sellPrice: '',
    color: '',
    compatibility: '',
    warranty: '',
    location: '',
    image: '',
    notes: '',
    purchaseDate: ''
  });

  // Reset or Populate form on open/change
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const hasThreshold = initialData.notifyThreshold !== undefined && initialData.notifyThreshold !== null && initialData.notifyThreshold > 0;
        setFormData({
          name: initialData.name || '',
          brand: initialData.brand || '',
          category: initialData.category || '',
          barcode: initialData.barcode || '',
          company: initialData.company || '',
          quantity: String(initialData.quantity ?? ''),
          notifyEnabled: hasThreshold,
          notifyThreshold: hasThreshold ? String(initialData.notifyThreshold) : '',
          currency: initialData.currency || 'USD',
          buyPrice: initialData.buyPrice !== undefined && initialData.buyPrice !== null ? formatNumberWithCommas(initialData.buyPrice) : '',
          sellPrice: initialData.sellPrice !== undefined && initialData.sellPrice !== null ? formatNumberWithCommas(initialData.sellPrice) : '',
          color: initialData.color || '',
          compatibility: initialData.compatibility || '',
          warranty: initialData.warranty || '',
          location: initialData.location || '',
          image: initialData.image || '',
          notes: initialData.notes || '',
          purchaseDate: initialData.purchaseDate || ''
        });
        setAutofilledItem(null);
        setShowSuggestions(false);
      } else {
        // Brand new accessory: All fields empty as requested
        setFormData({
          name: '',
          brand: '',
          category: '',
          barcode: '',
          company: '',
          quantity: '',
          notifyEnabled: false,
          notifyThreshold: '',
          currency: 'USD',
          buyPrice: '',
          sellPrice: '',
          color: '',
          compatibility: '',
          warranty: '',
          location: '',
          image: '',
          notes: '',
          purchaseDate: ''
        });
        setAutofilledItem(null);
        setShowSuggestions(false);
      }
    }
  }, [isOpen, initialData]);

  // Click outside listener to dismiss suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (nameContainerRef.current && !nameContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Matching registered accessories for intelligent auto-complete
  const matchingSuggestions = useMemo(() => {
    if (!formData.name || !formData.name.trim() || formData.name.trim().length < 1 || isEditMode) return [];
    const query = formData.name.toLowerCase().trim();
    
    const seen = new Set<string>();
    const results: Accessory[] = [];
    
    for (const acc of existingAccessories) {
      const key = `${acc.name.toLowerCase()}--${(acc.brand || '').toLowerCase()}`;
      if (!seen.has(key) && (acc.name.toLowerCase().includes(query) || (acc.brand && acc.brand.toLowerCase().includes(query)))) {
        seen.add(key);
        results.push(acc);
        if ((results?.length || 0) >= 5) break;
      }
    }
    return results;
  }, [formData.name, existingAccessories, isEditMode]);

  // Apply Smart Auto-fill from a previously registered accessory
  const applyAutofill = (acc: Accessory) => {
    // Ensure any custom brand/category/company/warranty exist in options list
    setOptions(prev => {
      const next = { ...prev };
      let changed = false;
      if (acc.brand && !next.brand.includes(acc.brand)) {
        next.brand = [...next.brand, acc.brand];
        changed = true;
      }
      if (acc.category && !next.category.includes(acc.category)) {
        next.category = [...next.category, acc.category];
        changed = true;
      }
      if (acc.company && !next.company.includes(acc.company)) {
        next.company = [...next.company, acc.company];
        changed = true;
      }
      if (acc.warranty && !next.warranty.includes(acc.warranty)) {
        next.warranty = [...next.warranty, acc.warranty];
        changed = true;
      }
      return changed ? next : prev;
    });

    const hasThreshold = acc.notifyThreshold !== undefined && acc.notifyThreshold !== null && acc.notifyThreshold > 0;

    setFormData(prev => ({
      ...prev,
      name: acc.name,
      brand: acc.brand || '',
      category: acc.category || '',
      company: acc.company || '',
      buyPrice: acc.buyPrice !== undefined && acc.buyPrice !== null ? formatNumberWithCommas(acc.buyPrice) : '',
      sellPrice: acc.sellPrice !== undefined && acc.sellPrice !== null ? formatNumberWithCommas(acc.sellPrice) : '',
      currency: acc.currency || 'USD',
      color: acc.color || '',
      compatibility: acc.compatibility || '',
      warranty: acc.warranty || '',
      notifyEnabled: hasThreshold,
      notifyThreshold: hasThreshold ? String(acc.notifyThreshold) : '',
      location: acc.location || '',
      image: acc.image || '',
      notes: acc.notes || ''
    }));

    setAutofilledItem(acc);
    setShowSuggestions(false);
  };

  // Undo / Clear auto-fill
  const handleClearAutofill = () => {
    setFormData(prev => ({
      ...prev,
      brand: '',
      category: '',
      company: '',
      buyPrice: '',
      sellPrice: '',
      color: '',
      compatibility: '',
      warranty: '',
      notifyEnabled: false,
      notifyThreshold: '',
      location: '',
      image: '',
      notes: ''
    }));
    setAutofilledItem(null);
  };

  // Barcode Auto-Generator Helper
  function generateRandomBarcode() {
    const prefix = '890';
    const randomPart = Math.floor(100000000 + Math.random() * 900000000);
    return `${prefix}${randomPart}`;
  }

  const handleGenerateNewBarcode = () => {
    setFormData(prev => ({ ...prev, barcode: generateRandomBarcode() }));
  };

  // Global Hardware Barcode Gun listener when drawer is open
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = cameraService.subscribeHardwareScanner((result) => {
      sound.playScan();
      setFormData(prev => ({ ...prev, barcode: result.code.trim() }));
    });
    return () => unsubscribe();
  }, [isOpen]);

  // Handle Form Change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'name') {
      setFormData(prev => ({ ...prev, name: value }));
      setShowSuggestions(true);

      // Check if typed name exactly matches a previously registered accessory
      if (!isEditMode && value.trim().length > 1) {
        const exactMatch = existingAccessories.find(
          a => a.name.trim().toLowerCase() === value.trim().toLowerCase()
        );
        if (exactMatch && autofilledItem?.id !== exactMatch.id) {
          applyAutofill(exactMatch);
        }
      }
      return;
    }

    if (name === 'buyPrice' || name === 'sellPrice') {
      const formatted = formatNumberWithCommas(value);
      setFormData(prev => ({ ...prev, [name]: formatted }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Image Upload handler (Base64)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size exceeds 2MB limit. Please choose a smaller image.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Form Submissions
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Please enter product name');
      return;
    }
    if (!formData.barcode.trim()) {
      alert('Please enter or auto-generate a barcode');
      return;
    }

    const buyPriceNum = parseFormattedNumber(formData.buyPrice);
    const sellPriceNum = parseFormattedNumber(formData.sellPrice);
    const qtyNum = parseInt(formData.quantity) || 0;
    const notifyNum = formData.notifyEnabled ? (parseInt(formData.notifyThreshold) || undefined) : undefined;

    let status: Accessory['status'] = 'in_stock';
    if (qtyNum <= 0) {
      status = 'out_of_stock';
    } else if (notifyNum !== undefined && qtyNum <= notifyNum) {
      status = 'low_stock';
    }

    const payload: Omit<Accessory, 'id' | 'createdAt' | 'updatedAt'> = {
      name: formData.name.trim(),
      brand: formData.brand.trim() || 'Generic',
      category: formData.category.trim() || 'General',
      barcode: formData.barcode.trim(),
      company: formData.company.trim() || 'Local Wholesaler',
      quantity: qtyNum,
      notifyThreshold: notifyNum,
      currency: formData.currency,
      buyPrice: buyPriceNum,
      sellPrice: sellPriceNum,
      color: formData.color.trim() || undefined,
      compatibility: formData.compatibility.trim() || undefined,
      warranty: formData.warranty.trim() || undefined,
      location: formData.location.trim() || undefined,
      image: formData.image.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      purchaseDate: formData.purchaseDate || new Date().toISOString().split('T')[0],
      status,
      totalSold: initialData?.totalSold || 0
    };

    onSave(payload);
    onClose();
  };

  // Option Manager Handlers
  const handleAddOption = () => {
    if (!newItemText.trim() || !manageModal.type) return;
    const val = newItemText.trim();
    if (!options[manageModal.type].includes(val)) {
      setOptions(prev => ({
        ...prev,
        [manageModal.type!]: [...prev[manageModal.type!], val]
      }));
    }
    setNewItemText('');
  };

  const handleDeleteOption = (itemToDelete: string) => {
    if (!manageModal.type) return;
    setOptions(prev => ({
      ...prev,
      [manageModal.type!]: prev[manageModal.type!].filter(i => i !== itemToDelete)
    }));
  };

  const handleSaveEdit = (oldItem: string) => {
    if (!manageModal.type || !editingText.trim()) return;
    const newVal = editingText.trim();
    setOptions(prev => ({
      ...prev,
      [manageModal.type!]: prev[manageModal.type!].map(i => i === oldItem ? newVal : i)
    }));
    if (formData[manageModal.type as keyof typeof formData] === oldItem) {
      setFormData(prev => ({ ...prev, [manageModal.type!]: newVal }));
    }
    setEditingItem(null);
    setEditingText('');
  };

  // Check duplicate barcode in stock
  const isDuplicateBarcode = useMemo(() => {
    if (!formData.barcode.trim()) return false;
    return existingAccessories.some(
      a => a.barcode.toLowerCase() === formData.barcode.trim().toLowerCase() && a.id !== initialData?.id
    );
  }, [formData.barcode, existingAccessories, initialData]);

  // Lock background scroll when accessory drawer or scanner modal is open
  useModalScrollLock(isOpen || isScanning, 'add-accessory-drawer');

  return (
    <>
      <div 
        data-modal-backdrop="true"
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 touch-none overscroll-contain",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none invisible"
        )}
        onClick={onClose}
      />

      {/* Main Drawer Container */}
      <div 
        data-drawer="true"
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full sm:max-w-xl md:max-w-2xl bg-[#0b0f1a] border-l border-slate-800/50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out font-sans",
          isOpen ? "translate-x-0" : "translate-x-full pointer-events-none invisible"
        )}
      >
        
        {/* Drawer Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4.5 border-b border-slate-800/50 bg-[#0b0f1a] flex items-center justify-between shrink-0 relative z-10 shadow-sm">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-400 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 truncate">
                <span className="truncate">{isEditMode ? t('accessories.editAccessory', 'Edit Accessory') : t('accessories.addAccessory', 'Register Accessory')}</span>
                {isEditMode && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 text-[10px] sm:text-xs font-semibold shrink-0">
                    {t('accessories.editMode', 'Edit Mode')}
                  </span>
                )}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div ref={accessoryScrollRef} data-modal-scrollable="true" className="flex-1 overflow-y-auto custom-scrollbar p-3.5 sm:p-6 space-y-5 sm:space-y-6 relative overscroll-contain">
          <form 
            id="add-accessory-form" 
            onSubmit={handleSubmit} 
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                e.preventDefault();
              }
            }}
            className="space-y-4 sm:space-y-6"
          >
            
            {/* Sections Wrapper */}
            <div className="space-y-4 sm:space-y-6">
              {/* Section 1: Product Identification */}
            <div className="bg-[#121829] border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5 sm:space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold">
                  <Tag className="w-4 h-4" />
                  <span>{t('accessories.productIdentification', 'Product Identification')}</span>
                </div>
                <span className="text-[11px] text-slate-500">{t('accessories.essentialSpecs', 'Essential Specs')}</span>
              </div>

              {/* Product Name with Smart Auto-Fill & Suggestions */}
              <div ref={nameContainerRef} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-slate-300">
                    {t('accessories.productName', 'Product Name')} <span className="text-rose-500">*</span>
                  </label>
                  {autofilledItem && (
                    <button
                      type="button"
                      onClick={handleClearAutofill}
                      className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                      title={t('accessories.clearAutofill', 'Undo auto-filled fields')}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t('accessories.clearAutofill', 'Clear Auto-fill')}</span>
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    onFocus={() => {
                      if (formData.name.trim().length > 0) setShowSuggestions(true);
                    }}
                    placeholder={t('accessories.namePlaceholder', 'e.g. Anker 737 Power Bank 140W (PowerCore 24K)')}
                    className={cn(
                      "w-full h-11 py-2.5 leading-normal rounded-xl border bg-slate-900/60 ps-3.5 pe-10 text-sm text-white placeholder:text-slate-600 focus:outline-none transition-colors",
                      autofilledItem 
                        ? "border-cyan-500/60 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400" 
                        : "border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    )}
                  />
                  {formData.name && (
                    <div className="absolute inset-y-0 end-0 flex items-center pe-2.5 pointer-events-none z-10">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, name: '' }));
                          setAutofilledItem(null);
                          setShowSuggestions(false);
                        }}
                        className="pointer-events-auto flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
                        title={t('accessories.clearName', 'Clear product name')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Smart Autocomplete Dropdown List */}
                {showSuggestions && (matchingSuggestions?.length || 0) > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#141b2d] border border-indigo-500/40 rounded-xl shadow-2xl z-30 overflow-hidden animate-in fade-in-50 duration-150">
                    <div className="px-3 py-2 bg-indigo-950/40 border-b border-slate-800 flex items-center justify-between text-[11px] text-indigo-300 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        {t('accessories.previouslyRegistered', 'Previously Registered Products (Click to Auto-fill)')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSuggestions(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/60">
                      {matchingSuggestions.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => applyAutofill(item)}
                          className="w-full px-3.5 py-2.5 text-left rtl:text-right hover:bg-indigo-600/15 transition-colors flex items-center justify-between group cursor-pointer"
                        >
                          <div className="flex-1 min-w-0 pe-3">
                            <div className="text-xs font-semibold text-white group-hover:text-cyan-300 truncate">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span className="text-indigo-400">{item.brand}</span>
                              <span>•</span>
                              <span>{getCategoryTranslation(item.category, t)}</span>
                              {item.company && (
                                <>
                                  <span>•</span>
                                  <span className="truncate text-slate-400">{item.company}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right rtl:text-left shrink-0">
                            {item.sellPrice !== undefined && item.sellPrice !== null && (
                              <div className={cn("text-xs font-bold", item.currency === 'USD' ? "text-amber-400" : "text-sky-400")}>
                                {item.currency === 'USD' ? `$${item.sellPrice}` : `${formatNumberWithCommas(item.sellPrice)} د.ع`}
                              </div>
                            )}
                            <span className="text-[10px] text-cyan-400/80 group-hover:underline">{t('accessories.autoFill', 'Auto-fill ↵')}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Auto-filled Notification Badge */}
                {autofilledItem && (
                  <div className="mt-2 p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between gap-2 text-xs text-cyan-300 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="truncate">
                        {t('accessories.autofilledSpecs', { name: autofilledItem.name, brand: autofilledItem.brand, defaultValue: `Auto-filled specs & pricing from registered ${autofilledItem.name} (${autofilledItem.brand})` })}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearAutofill}
                      className="px-2 py-0.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-300 text-[11px] font-semibold shrink-0 transition-colors border border-cyan-500/30 cursor-pointer"
                    >
                      {t('accessories.resetSpecs', 'Reset Specs')}
                    </button>
                  </div>
                )}
              </div>

              {/* Brand & Category Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Brand */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-slate-300">
                      {t('accessories.brandManufacturer', 'Brand / Manufacturer')} <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setManageModal({ isOpen: true, type: 'brand', title: t('accessories.manageBrands', 'Manage Brands') })}
                      className="p-1 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      title={t('accessories.manageBrands', 'Manage Brands')}
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <select
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    className="w-full h-11 rounded-xl border border-slate-700 bg-slate-900/60 px-3.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer"
                  >
                    <option value="">{t('accessories.selectBrand', 'Select Brand...')}</option>
                    {options.brand.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-slate-300">
                      {t('accessories.category', 'Category')} <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setManageModal({ isOpen: true, type: 'category', title: t('accessories.manageCategories', 'Manage Categories') })}
                      className="p-1 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      title={t('accessories.manageCategories', 'Manage Categories')}
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full h-11 rounded-xl border border-slate-700 bg-slate-900/60 px-3.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer"
                  >
                    <option value="">{t('accessories.selectCategory', 'Select Category...')}</option>
                    {options.category.map(c => (
                      <option key={c} value={c}>{getCategoryTranslation(c, t)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Barcode & Scanning */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-slate-300">
                    {t('accessories.barcode', 'Barcode / SKU')} <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateNewBarcode}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> {t('accessories.generateBarcode', 'Auto-Generate')}
                  </button>
                </div>
                <div className="relative flex items-center w-full group">
                  <input
                    type="text"
                    id="input-accessory-barcode"
                    name="barcode"
                    required
                    value={formData.barcode}
                    onChange={handleChange}
                    placeholder={t('accessories.barcodePlaceholder', 'Scan, auto-generate, or enter barcode...')}
                    className={cn(
                      "w-full h-11 py-2.5 leading-normal rounded-xl border bg-slate-900/60 ps-3.5 pe-20 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none transition-all",
                      isDuplicateBarcode 
                        ? "border-amber-500/70 focus:border-amber-500 focus:ring-1 focus:ring-amber-500" 
                        : "border-slate-700 hover:border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    )}
                  />

                  {/* Inside-Input Actions Tray */}
                  <div className="absolute inset-y-0 end-1.5 flex items-center gap-1.5 z-10">
                    {formData.barcode && (
                      <>
                        <button
                          type="button"
                          id="btn-accessory-clear-barcode"
                          onClick={() => setFormData(prev => ({ ...prev, barcode: '' }))}
                          className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors focus:outline-none cursor-pointer"
                          title={t('accessories.clearBarcode', 'Clear barcode')}
                          aria-label={t('accessories.clearBarcode', 'Clear barcode')}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px h-4 bg-slate-700/80" />
                      </>
                    )}

                    <button
                      type="button"
                      id="btn-accessory-scan-barcode"
                      onClick={() => setIsScanning(true)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 active:bg-indigo-500/35 text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-400/50 transition-all cursor-pointer shadow-sm group/scan active:scale-95 shrink-0"
                      title={t('accessories.scanBarcode', 'Scan')}
                      aria-label={t('accessories.scanBarcode', 'Scan')}
                    >
                      <ScanLine className="w-4 h-4 text-indigo-400 group-hover/scan:text-indigo-300 group-hover/scan:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>

                {isDuplicateBarcode && (
                  <div className="mt-2 flex items-center gap-1.5 text-amber-400 text-xs bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{t('accessories.duplicateBarcodeBody', 'Warning: Another accessory with this barcode already exists in inventory.')}</span>
                  </div>
                )}
              </div>

              {/* Company / Supplier / Source (Converted to Combo Box) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-slate-300">
                    {t('accessories.supplierCompany', 'Company / Supplier / Source')} <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setManageModal({ isOpen: true, type: 'company', title: t('accessories.manageSuppliers', 'Manage Companies / Suppliers') })}
                    className="p-1 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors cursor-pointer"
                    title={t('accessories.manageSuppliers', 'Manage Companies / Suppliers')}
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <select
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full h-11 rounded-xl border border-slate-700 bg-slate-900/60 px-3.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer"
                >
                  <option value="">{t('accessories.selectCompany', 'Select Supplier / Company...')}</option>
                  {options.company.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Section 2: Inventory & Stock Management */}
            <div className="bg-[#121829] border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                  <Box className="w-4 h-4" />
                  <span>{t('accessories.stockLogistics', 'Stock & Inventory Levels')}</span>
                </div>
                
                {/* Low Stock Alert Toggle Switch */}
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, notifyEnabled: !prev.notifyEnabled }))}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer",
                    formData.notifyEnabled
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25"
                      : "bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800"
                  )}
                  title={formData.notifyEnabled ? t('accessories.alertsOn', 'Low stock alerts enabled') : t('accessories.alertsOff', 'Low stock alerts disabled')}
                >
                  {formData.notifyEnabled ? (
                    <>
                      <Bell className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t('accessories.alertsOn', 'Alerts: On')}</span>
                    </>
                  ) : (
                    <>
                      <BellOff className="w-3.5 h-3.5 text-slate-500" />
                      <span>{t('accessories.alertsOff', 'Alerts: Off')}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Quantity */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">
                    {t('accessories.quantityInStock', 'Stock Quantity')} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      name="quantity"
                      min="0"
                      required
                      value={formData.quantity}
                      onChange={handleChange}
                      placeholder="0"
                      className="w-full h-11 py-2.5 leading-normal rounded-xl border border-slate-700 bg-slate-900/60 px-3.5 text-sm text-white font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Notify Threshold */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-slate-300">
                      {t('accessories.lowStockThreshold', 'Notify Threshold')} {formData.notifyEnabled ? <span className="text-amber-400 text-[11px]">({t('accessories.lowStockAlert', 'Low Stock Alert')})</span> : <span className="text-slate-500 text-[11px]">({t('accessories.alertDisabled', 'Optional - Off')})</span>}
                    </label>
                  </div>
                  
                  {formData.notifyEnabled ? (
                    <div className="relative flex flex-col justify-center animate-in fade-in duration-150">
                      <input
                        type="number"
                        name="notifyThreshold"
                        min="1"
                        required={formData.notifyEnabled}
                        value={formData.notifyThreshold}
                        onChange={handleChange}
                        placeholder="e.g. 5"
                        className="w-full h-11 py-2.5 leading-normal rounded-xl border border-amber-500/40 bg-slate-900/80 px-3.5 text-sm text-amber-300 font-mono focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                      />
                      <div className="text-[11px] text-amber-400/80 mt-1 flex items-center gap-1">
                        <Bell className="w-3 h-3" />
                        <span>{t('accessories.thresholdNotice', 'Notifies when stock drops to or below this amount')}</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, notifyEnabled: true }))}
                      className="w-full h-11 rounded-xl border border-dashed border-slate-700 bg-slate-900/30 px-3.5 text-left rtl:text-right text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <BellOff className="w-3.5 h-3.5 text-slate-500" />
                        <span>{t('accessories.noThresholdSet', 'No notification threshold set')}</span>
                      </span>
                      <span className="text-indigo-400 font-medium text-[11px]">{t('accessories.enableAlert', 'Enable alert')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Pricing & Currency */}
            <div className="bg-[#121829] border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-cyan-400 text-sm font-semibold">
                  <DollarSign className="w-4 h-4" />
                  <span>{t('accessories.pricingMargins', 'Pricing & Currency')}</span>
                </div>
                
                {/* Currency Selector */}
                <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, currency: 'USD' }))}
                    className={cn(
                      "px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
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
                      "px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                      formData.currency === 'IQD'
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    )}
                  >
                    IQD (د.ع)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Buy Price */}
                <CurrencyPriceInput
                  name="buyPrice"
                  label={t('accessories.buyPriceCost', 'Buy Price (Cost per Unit)')}
                  required
                  value={formData.buyPrice}
                  currency={formData.currency}
                  onChange={handleChange}
                  onClear={() => setFormData(prev => ({ ...prev, buyPrice: '' }))}
                  onCurrencyToggle={() => setFormData(prev => ({ ...prev, currency: prev.currency === 'USD' ? 'IQD' : 'USD' }))}
                  accent="indigo"
                />

                {/* Sell Price */}
                <CurrencyPriceInput
                  name="sellPrice"
                  label={t('accessories.targetSellPrice', 'Target Sell Price (Retail)')}
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
                        "col-span-1 sm:col-span-2 rounded-xl px-4 py-2.5 flex items-center justify-between border text-xs font-mono transition-all",
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
                            {profit >= 0 ? t('accessories.projectedProfit', 'Unit Profit / Margin') : t('accessories.sellingLoss', 'Selling at Loss')}
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

            {/* Section 4: Specifications, Compatibility & Warranty */}
            <div className="bg-[#121829] border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-violet-400 text-sm font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t('accessories.specsWarranty', 'Attributes, Warranty & Compatibility')}</span>
                </div>
                <span className="text-[11px] text-slate-500">{t('accessories.optionalExtras', 'Extra Details')}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Color / Variant */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">
                    {t('accessories.colorFinish', 'Color / Finish')}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      name="color"
                      value={formData.color}
                      onChange={handleChange}
                      placeholder={t('accessories.colorPlaceholder', 'e.g. Matte Black, Titanium, Silver...')}
                      className="w-full h-11 py-2.5 leading-normal rounded-xl border border-slate-700 bg-slate-900/60 ps-3.5 pe-10 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    />
                    {formData.color && (
                      <div className="absolute inset-y-0 end-0 flex items-center pe-2.5 pointer-events-none z-10">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, color: '' }))}
                          className="pointer-events-auto flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
                          title={t('accessories.clear', 'Clear')}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Warranty */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-slate-300">
                      {t('accessories.warranty', 'Warranty Period')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setManageModal({ isOpen: true, type: 'warranty', title: t('accessories.manageWarranties', 'Manage Warranties') })}
                      className="p-1 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      title={t('accessories.manageWarranties', 'Manage Warranties')}
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <select
                    name="warranty"
                    value={formData.warranty}
                    onChange={handleChange}
                    className="w-full h-11 py-2.5 leading-normal rounded-xl border border-slate-700 bg-slate-900/60 px-3.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer"
                  >
                    <option value="">{t('accessories.selectWarranty', 'Select Warranty Period...')}</option>
                    {options.warranty.map(w => (
                      <option key={w} value={w}>{getWarrantyTranslation(w, t)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Compatibility */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  {t('accessories.deviceCompatibility', 'Device Compatibility')}
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    name="compatibility"
                    value={formData.compatibility}
                    onChange={handleChange}
                    placeholder={t('accessories.compatibilityPlaceholder', 'e.g. Type-C, iPhone 15/16 Series, MagSafe, Apple Watch 45mm...')}
                    className="w-full h-11 py-2.5 leading-normal rounded-xl border border-slate-700 bg-slate-900/60 ps-3.5 pe-10 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                  {formData.compatibility && (
                    <div className="absolute inset-y-0 end-0 flex items-center pe-2.5 pointer-events-none z-10">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, compatibility: '' }))}
                        className="pointer-events-auto flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
                        title={t('accessories.clear', 'Clear')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Section 5: Image & Media (Optional) */}
            <div className="bg-[#121829] border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
                  <ImageIcon className="w-4 h-4" />
                  <span>{t('accessories.productImage', 'Product Image (Optional)')}</span>
                </div>
                <span className="text-[11px] text-slate-500">{t('accessories.visualCatalog', 'Visual Catalog')}</span>
              </div>

              <div className="flex flex-col sm:row gap-4 items-start">
                {/* Image Preview Box */}
                <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/80 flex items-center justify-center relative overflow-hidden flex-shrink-0 group">
                  {formData.image ? (
                    <>
                      <img 
                        src={formData.image} 
                        alt="Product preview" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                        className="absolute top-1.5 right-1.5 rtl:right-auto rtl:left-1.5 p-1 bg-black/80 text-rose-400 rounded-lg hover:bg-rose-600 hover:text-white transition-colors"
                        title={t('accessories.removeImage', 'Remove Image')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center p-2 text-slate-500">
                      <ImageIcon className="w-7 h-7 mx-auto mb-1 opacity-50" />
                      <span className="text-[10px]">{t('accessories.noImage', 'No Image')}</span>
                    </div>
                  )}
                </div>

                {/* Upload or URL Controls */}
                <div className="flex-1 space-y-2.5 w-full">
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {t('accessories.uploadImage', 'Upload File')}
                    </button>
                  </div>

                  <div className="relative flex items-center">
                    <input
                      type="text"
                      name="image"
                      value={formData.image}
                      onChange={handleChange}
                      placeholder={t('accessories.pasteImageUrl', 'Or paste image URL (https://...)...')}
                      className="w-full h-11 py-2.5 leading-normal rounded-xl border border-slate-700 bg-slate-900/60 ps-3.5 pe-10 text-xs text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    />
                    {formData.image && (
                      <div className="absolute inset-y-0 end-0 flex items-center pe-2.5 pointer-events-none z-10">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                          className="pointer-events-auto flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer"
                          title={t('accessories.clear', 'Clear')}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 6: Additional Notes */}
            <div className="bg-[#121829] border border-slate-800/90 rounded-2xl p-5 shadow-sm space-y-3">
              <label className="block text-xs font-medium text-slate-300">
                {t('accessories.staffNotes', 'Additional Notes / Store Specifications')}
              </label>
              <div className="relative">
                <textarea
                  name="notes"
                  rows={2}
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder={t('accessories.notesPlaceholder', 'Special instructions, batch numbers, packaging details...')}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2.5 ps-3.5 pe-10 text-xs text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
                />
                {formData.notes && (
                  <div className="absolute top-2.5 end-2.5 pointer-events-none">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, notes: '' }))}
                      className="pointer-events-auto flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
                      title={t('accessories.clear', 'Clear')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            </div>

          </form>
        </div>

        {/* Drawer Footer Actions */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-800/50 bg-[#0b0f1a] flex flex-col-reverse xs:flex-row items-stretch xs:items-center justify-end gap-2.5 sm:gap-4 shrink-0 relative z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
          <button
            type="button"
            onClick={onClose}
            className="w-full xs:w-auto px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 text-sm font-semibold transition-colors cursor-pointer text-center"
          >
            {t('common.cancel', 'Cancel')}
          </button>

          <button
            type="submit"
            form="add-accessory-form"
            className="w-full xs:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isEditMode ? t('accessories.updateAccessory', 'Save Changes') : t('accessories.saveAccessory', 'Register Accessory')}</span>
          </button>
        </div>

      </div>

      {/* Manage Options Modal */}
      {manageModal.isOpen && manageModal.type && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-[#121829] border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-indigo-400" />
                {manageModal.title}
              </h3>
              <button
                type="button"
                onClick={() => setManageModal({ isOpen: false, type: null, title: '' })}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Add New Option */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
                    placeholder={t('accessories.addNewOption', 'Enter new option...')}
                    className="w-full h-11 rounded-xl border border-slate-700 bg-slate-900 ps-3.5 pe-10 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  {newItemText && (
                    <div className="absolute inset-y-0 end-0 flex items-center pe-2.5 pointer-events-none">
                      <button
                        type="button"
                        onClick={() => setNewItemText('')}
                        className="pointer-events-auto flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
                        title={t('accessories.clear', 'Clear')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleAddOption}
                  disabled={!newItemText.trim()}
                  className="shrink-0 px-4 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm shadow-indigo-500/20"
                >
                  <Plus className="w-4 h-4" /> {t('accessories.add', 'Add')}
                </button>
              </div>

              {/* Options List */}
              <div className="max-h-60 overflow-y-auto space-y-1.5 pe-1 custom-scrollbar">
                {options[manageModal.type].map((item) => (
                  <div key={item} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800 group">
                    {editingItem === item ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          autoFocus
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(item);
                            if (e.key === 'Escape') setEditingItem(null);
                          }}
                          className="flex-1 h-9 bg-slate-800 text-white text-xs px-2.5 rounded-lg border border-indigo-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item)}
                          className="w-8 h-8 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 rounded-lg cursor-pointer transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingItem(null)}
                          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs text-slate-200">
                          {manageModal.type === 'category' ? getCategoryTranslation(item, t) : (manageModal.type === 'warranty' ? getWarrantyTranslation(item, t) : item)}
                        </span>
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(item);
                              setEditingText(item);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-400 rounded cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOption(item)}
                            className="p-1 text-slate-400 hover:text-rose-400 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/50 flex justify-end">
              <button
                type="button"
                onClick={() => setManageModal({ isOpen: false, type: null, title: '' })}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white cursor-pointer"
              >
                {t('accessories.done', 'Done')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Camera Scanner Modal */}
      <CameraScannerModal
        isOpen={isScanning}
        onClose={() => setIsScanning(false)}
        onScan={(code) => {
          setFormData(prev => ({ ...prev, barcode: code.trim() }));
        }}
        title={t('accessories.scanBarcode', 'Scan Accessory Barcode / SKU')}
        subtitle={t('accessories.scanSubtitle', 'Point camera at product package or barcode label')}
        placeholder={t('accessories.barcodePlaceholder', 'Enter barcode or SKU...')}
        continuousMode={false}
      />
    </>
  );
}
