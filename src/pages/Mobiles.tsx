import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Database,
  RefreshCcw,
  Filter, 
  Smartphone, 
  Tablet, 
  Edit3, 
  Trash2, 
  ShoppingBag, 
  Eye, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Check, 
  DollarSign, 
  TrendingUp, 
  User, 
  Calendar,
  Layers,
  ArrowUpDown,
  X,
  Barcode as BarcodeIcon,
  Printer,
  Sparkles as SparklesIcon,
  RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { SearchInput } from '../components/common/SearchInput';
import { useTranslation } from 'react-i18next';
import { formatCurrency, cn, getCurrencyColor } from '../lib/utils';
import AddMobileDrawer from '../components/mobiles/AddMobileDrawer';
import MobileDetailsModal from '../components/mobiles/MobileDetailsModal';
import MarkAsSoldModal from '../components/mobiles/MarkAsSoldModal';
import ReturnMobileModal from '../components/mobiles/ReturnMobileModal';
import { Mobile, MobileStatus } from '../types/mobile';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { sound } from '../lib/sound';
import { useToast } from '../components/common/Toast';

import { idb } from '../lib/idbService';
import { recycleBinService } from '../lib/recycleBinService';
import { useAuth } from '../context/AuthContext';
import { CostProfitGuard } from '../components/common/PermissionGuard';
import MigrationModal from '../components/common/MigrationModal';
import CameraScannerModal from '../components/common/CameraScannerModal';
import { Pagination } from '../components/common/Pagination';

const STORAGE_KEY = 'nali_mobiles_inventory_v1';

export default function Mobiles() {
  const { t } = useTranslation();
  const { success, error: toastError, info } = useToast();
  const navigate = useNavigate();
  const { hasPermission, canViewCostAndProfit } = useAuth();
  
  const [mobiles, setMobiles] = useState<Mobile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [schemaError, setSchemaError] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Load and sync real-time from Supabase
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      // 1. Check IDB first
      try {
        const idbData = await idb.getAll<Mobile>('mobiles');
        if (Array.isArray(idbData) && idbData.length > 0 && isMounted) {
          setMobiles(idbData);
          setIsLoading(false);
          return;
        }
      } catch (e) {}

      // 2. Check localStorage
      const cached = localStorage.getItem('nali_mobiles_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0 && isMounted) {
            setMobiles(parsed);
            setIsLoading(false);
            return;
          }
        } catch (e) {}
      }

      // 3. Default to empty array if no data found
      if (isMounted) {
        setMobiles([]);
        setIsLoading(false);
      }
    };

    loadInitialData();

    const fetchMobiles = async () => {
      try {
        const { data, error } = await supabase.from('nali_mobiles').select('*');
        if (error) {
          if (error.code !== 'PGRST205') console.warn('Supabase mobiles fetch notice:', error);
          if (error.code === 'PGRST205' && isMounted) {
            setSchemaError(true);
          }
        } else if (isMounted && data !== null && data !== undefined) {
          const freshMobiles = Array.isArray(data) ? (data as Mobile[]) : [];
          setMobiles(freshMobiles);
          localStorage.setItem('nali_mobiles_cache', JSON.stringify(freshMobiles));
          try {
            await idb.clear('mobiles');
            if (Array.isArray(freshMobiles) && freshMobiles.length > 0) {
              await idb.bulkPut('mobiles', freshMobiles);
            }
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Failed to load mobiles from cloud:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchMobiles();

    const channel = supabase
      .channel('public:nali_mobiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nali_mobiles' }, async (payload) => {
        if (!isMounted) return;
        if (payload.eventType === 'INSERT') {
          const newMob = payload.new as Mobile;
          setMobiles(prev => {
            if (prev.some(m => m.id === newMob.id)) return prev;
            const updated = [newMob, ...prev];
            localStorage.setItem('nali_mobiles_cache', JSON.stringify(updated));
            return updated;
          });
          try {
            await idb.put('mobiles', newMob);
          } catch (e) {}
        } else if (payload.eventType === 'UPDATE') {
          const updatedMob = payload.new as Mobile;
          setMobiles(prev => {
            const updated = prev.map(m => m.id === updatedMob.id ? updatedMob : m);
            localStorage.setItem('nali_mobiles_cache', JSON.stringify(updated));
            return updated;
          });
          try {
            await idb.put('mobiles', updatedMob);
          } catch (e) {}
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old?.id;
          if (deletedId) {
            setMobiles(prev => {
              const updated = prev.filter(m => m.id !== deletedId);
              localStorage.setItem('nali_mobiles_cache', JSON.stringify(updated));
              return updated;
            });
            try {
              await idb.delete('mobiles', deletedId);
            } catch (e) {}
          } else {
            // If primary key missing in payload, re-fetch to ensure exact sync
            fetchMobiles();
          }
        }
      })
      .subscribe();

    const handleConfigChange = () => fetchMobiles();
    const handleDataReload = () => fetchMobiles();

    window.addEventListener('supabase_config_changed', handleConfigChange);
    window.addEventListener('supabase_data_reload', handleDataReload);

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      window.removeEventListener('supabase_config_changed', handleConfigChange);
      window.removeEventListener('supabase_data_reload', handleDataReload);
    };
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [showSold, setShowSold] = useState<boolean>(false);
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  
  // Drawer & Modals State
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [editingMobile, setEditingMobile] = useState<Mobile | null>(null);
  const [viewingMobile, setViewingMobile] = useState<Mobile | null>(null);
  const [mobileToDelete, setMobileToDelete] = useState<Mobile | null>(null);
  const [soldTargetMobile, setSoldTargetMobile] = useState<Mobile | null>(null);
  const [returnTargetMobile, setReturnTargetMobile] = useState<Mobile | null>(null);
  
  // No longer needing localStorage save, useSupabaseSync handles it

  // Counts
  const inStockCount = (mobiles || []).filter(m => m.status === 'in_stock').length;
  const soldCount = (mobiles || []).filter(m => m.status === 'sold').length;

  // Dynamically extract unique brand options
  const uniqueBrands = Array.from(
    new Set([
      'Apple',
      'Samsung',
      'Xiaomi',
      'Google',
      'OnePlus',
      'iPad / Tablet',
      ...(mobiles || []).map(m => m.brand).filter(Boolean)
    ])
  );

  // Check if any filters are active
  const hasActiveFilters = searchTerm !== '' || selectedBrand !== 'all' || minPrice !== '' || maxPrice !== '';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedBrand('all');
    setMinPrice('');
    setMaxPrice('');
  };

  // Filtered mobiles
  const filteredMobiles = (mobiles || []).filter((mobile) => {
    // Sold ON/OFF filter: ON = Sold only, OFF = In stock only
    if (showSold) {
      if (mobile.status !== 'sold') return false;
    } else {
      if (mobile.status !== 'in_stock') return false;
    }

    // Brand filter combo box
    if (selectedBrand !== 'all') {
      if (selectedBrand === 'iPad / Tablet') {
        const isTabletMatch = 
          mobile.brand.toLowerCase().includes('ipad') || 
          mobile.brand.toLowerCase().includes('tablet') || 
          mobile.model.toLowerCase().includes('ipad') || 
          mobile.model.toLowerCase().includes('tablet');
        if (!isTabletMatch) return false;
      } else if (mobile.brand.toLowerCase() !== selectedBrand.toLowerCase()) {
        return false;
      }
    }

    // Price range filter (Min to Max)
    const effectivePrice = showSold && mobile.soldPrice !== undefined ? mobile.soldPrice : mobile.sellPrice;
    if (minPrice !== '') {
      const parsedMin = parseFloat(minPrice);
      if (!isNaN(parsedMin) && effectivePrice < parsedMin) {
        return false;
      }
    }
    if (maxPrice !== '') {
      const parsedMax = parseFloat(maxPrice);
      if (!isNaN(parsedMax) && effectivePrice > parsedMax) {
        return false;
      }
    }

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchBrand = mobile.brand.toLowerCase().includes(q);
      const matchModel = mobile.model.toLowerCase().includes(q);
      const matchImei = mobile.imei.toLowerCase().includes(q);
      const matchColor = (mobile.color || '').toLowerCase().includes(q);
      const matchCustomer = (mobile.soldToCustomer || '').toLowerCase().includes(q);
      const matchSupplier = (mobile.boughtFrom || '').toLowerCase().includes(q);
      if (!matchBrand && !matchModel && !matchImei && !matchColor && !matchCustomer && !matchSupplier) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => {
    // Sort from newest (most recently registered) to oldest in date and time
    const parseTime = (item: Mobile) => {
      if (item.createdAt) {
        const t = new Date(item.createdAt).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      if (item.purchaseDate) {
        const t = new Date(item.purchaseDate).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      return 0;
    };
    const timeA = parseTime(a);
    const timeB = parseTime(b);
    return timeB - timeA;
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset pagination when search, filters, or showSold changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBrand, minPrice, maxPrice, showSold]);

  const totalPages = Math.max(1, Math.ceil((filteredMobiles?.length || 0) / pageSize));
  const paginatedMobiles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return (filteredMobiles || []).slice(start, start + pageSize);
  }, [filteredMobiles, currentPage, pageSize]);

  // Action handlers
  const handleSaveMobile = async (mobileData: any, bulkUpdateIds?: string[], newSellPrice?: number) => {
    sound.playScanSuccess();
    if (editingMobile) {
      // Optimistic update
      const updated = { ...editingMobile, ...mobileData };
      setMobiles(prev => {
        const next = prev.map(m => m.id === editingMobile.id ? updated : m);
        localStorage.setItem('nali_mobiles_cache', JSON.stringify(next));
        return next;
      });
      try { await idb.put('mobiles', updated); } catch (e) {}
      success(`Updated "${mobileData.brand} ${mobileData.model}" successfully`);
      
      const { error } = await supabase.from('nali_mobiles').update(mobileData).eq('id', editingMobile.id);
      if (error) if (error.code !== 'PGRST205') console.error('Update failed', error);
      
      if (Array.isArray(bulkUpdateIds) && bulkUpdateIds.length > 0 && newSellPrice !== undefined) {
         setMobiles(prev => {
           const next = prev.map(m => (bulkUpdateIds || []).includes(m.id) ? { ...m, sellPrice: newSellPrice } : m);
           localStorage.setItem('nali_mobiles_cache', JSON.stringify(next));
           return next;
         });
         await supabase.from('nali_mobiles').update({ sellPrice: newSellPrice }).in('id', bulkUpdateIds);
      }
      setEditingMobile(null);
    } else {
      const newId = crypto.randomUUID();
      const newMobile = {
        ...mobileData,
        id: newId,
        status: 'in_stock',
        createdAt: new Date().toISOString()
      };

      // Optimistic insert immediately
      setMobiles(prev => {
        const next = [newMobile, ...prev.filter(m => m.id !== newId)];
        localStorage.setItem('nali_mobiles_cache', JSON.stringify(next));
        return next;
      });
      try { await idb.put('mobiles', newMobile); } catch (e) {}

      success(`Registered "${newMobile.brand} ${newMobile.model}" to inventory`);
      
      const { data, error } = await supabase.from('nali_mobiles').insert(newMobile).select().single();
      
      if (error) {
         if (error.code !== 'PGRST205' && isSupabaseConfigured()) {
            console.warn('[Mobiles] Supabase cloud sync deferred, item safely saved in local offline database.');
         }
      } else if (data) {
         const savedItem = data as Mobile;
         setMobiles(prev => {
           const next = prev.map(m => m.id === newId ? savedItem : m);
           localStorage.setItem('nali_mobiles_cache', JSON.stringify(next));
           return next;
         });
         try { await idb.put('mobiles', savedItem); } catch (e) {}
         
         if (Array.isArray(bulkUpdateIds) && bulkUpdateIds.length > 0 && newSellPrice !== undefined) {
           setMobiles(prev => {
             const next = prev.map(m => (bulkUpdateIds || []).includes(m.id) ? { ...m, sellPrice: newSellPrice } : m);
             localStorage.setItem('nali_mobiles_cache', JSON.stringify(next));
             return next;
           });
           await supabase.from('nali_mobiles').update({ sellPrice: newSellPrice }).in('id', bulkUpdateIds);
         }
      }
    }
    
    // Automatically scroll to the top of the page so the user can quickly start another registration
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
      document.body.scrollTo({ top: 0, behavior: 'smooth' });
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDeleteMobile = async (id: string) => {
    sound.playAlert();
    const mobileToBin = mobiles.find(m => m.id === id);
    if (mobileToBin) {
      await recycleBinService.moveToBin({
        id: mobileToBin.id,
        type: 'mobile',
        name: `${mobileToBin.brand} ${mobileToBin.model}`,
        data: mobileToBin
      });
    }

    setMobiles(prev => {
      const next = prev.filter(m => m.id !== id);
      localStorage.setItem('nali_mobiles_cache', JSON.stringify(next));
      return next;
    });
    try { await idb.delete('mobiles', id); } catch (e) {}
    if (viewingMobile?.id === id) setViewingMobile(null);
    setMobileToDelete(null);
    info("Mobile moved to Recycle Bin");
    const { error } = await supabase.from('nali_mobiles').delete().eq('id', id);
    if (error) if (error.code !== 'PGRST205') console.error('Delete failed', error);
  };

  const handleOpenEdit = (mobile: Mobile) => {
    setEditingMobile(mobile);
    setIsAddDrawerOpen(true);
  };

  const handleToggleStatus = async (mobile: Mobile) => {
    if (mobile.status === 'in_stock') {
      // Open mark as sold modal
      setSoldTargetMobile(mobile);
    } else {
      // Revert back to in_stock
      setMobiles(prev => prev.map(m => m.id === mobile.id ? { 
        ...m, 
        status: 'in_stock',
        soldDate: undefined,
        soldPrice: undefined,
        soldToCustomer: undefined,
        soldNotes: undefined
      } : m));
      
      await supabase.from('nali_mobiles').update({
        status: 'in_stock',
        soldDate: null,
        soldPrice: null,
        soldToCustomer: null,
        soldNotes: null
      }).eq('id', mobile.id);
      if (viewingMobile?.id === mobile.id) {
        setViewingMobile(prev => prev ? { ...prev, status: 'in_stock' } : null);
      }
    }
  };

  const handleConfirmSold = async (mobileId: string, soldData: { soldPrice: number; soldDate: string; soldToCustomer: string; soldNotes: string }) => {
    sound.playPaymentSuccess();
    setMobiles(prev => prev.map(m => m.id === mobileId ? {
      ...m,
      status: 'sold',
      soldPrice: soldData.soldPrice,
      soldDate: soldData.soldDate,
      soldToCustomer: soldData.soldToCustomer,
      soldNotes: soldData.soldNotes
    } : m));
    
    success('Device marked as sold!');

    await supabase.from('nali_mobiles').update({
      status: 'sold',
      soldPrice: soldData.soldPrice,
      soldDate: soldData.soldDate,
      soldToCustomer: soldData.soldToCustomer,
      soldNotes: soldData.soldNotes
    }).eq('id', mobileId);

    if (viewingMobile?.id === mobileId) {
      setViewingMobile(prev => prev ? {
        ...prev,
        status: 'sold',
        soldPrice: soldData.soldPrice,
        soldDate: soldData.soldDate,
        soldToCustomer: soldData.soldToCustomer,
        soldNotes: soldData.soldNotes
      } : null);
    }
  };

  const handleConfirmReturn = async (mobileId: string, returnReason?: string) => {
    sound.playPaymentSuccess();
    const target = mobiles.find(m => m.id === mobileId);
    const updatedNotes = returnReason 
      ? (target?.notes ? `${target.notes}\n[Returned to Stock: ${returnReason}]` : `[Returned to Stock: ${returnReason}]`)
      : target?.notes;

    setMobiles(prev => prev.map(m => m.id === mobileId ? {
      ...m,
      status: 'in_stock',
      soldDate: undefined,
      soldPrice: undefined,
      soldToCustomer: undefined,
      soldNotes: undefined,
      notes: updatedNotes
    } : m));

    success(`${target ? `${target.brand} ${target.model}` : 'Mobile'} returned to in-stock mobile list!`);

    await supabase.from('nali_mobiles').update({
      status: 'in_stock',
      soldDate: null,
      soldPrice: null,
      soldToCustomer: null,
      soldNotes: null,
      notes: updatedNotes
    }).eq('id', mobileId);

    // Sync to local storage and IndexedDB
    const updatedList = mobiles.map(m => m.id === mobileId ? {
      ...m,
      status: 'in_stock' as MobileStatus,
      soldDate: undefined,
      soldPrice: undefined,
      soldToCustomer: undefined,
      soldNotes: undefined,
      notes: updatedNotes
    } : m);
    localStorage.setItem('nali_mobiles_cache', JSON.stringify(updatedList));
    idb.bulkPut('mobiles', updatedList);

    if (viewingMobile?.id === mobileId) {
      setViewingMobile(prev => prev ? {
        ...prev,
        status: 'in_stock',
        soldDate: undefined,
        soldPrice: undefined,
        soldToCustomer: undefined,
        soldNotes: undefined,
        notes: updatedNotes
      } : null);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Schema Setup Notice Banner (Non-blocking) */}
      {schemaError && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Database Table Setup Recommended</h4>
              <p className="text-xs text-slate-300">
                The cloud table <code className="text-amber-300 font-mono">nali_mobiles</code> is pending setup in Supabase. Your app is running safely in offline-first mode.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMigrationModalOpen(true)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>View Migration SQL</span>
            </button>
            <button
              type="button"
              onClick={() => setSchemaError(false)}
              className="px-2.5 py-1.5 text-slate-400 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <span>{t('nav.mobiles')}</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold font-mono">
              {inStockCount} {t('inventory.inStock')}
            </span>
          </h1>
        </div>

        {hasPermission('inventory_mobiles', 'create') && (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setEditingMobile(null);
                setIsAddDrawerOpen(true);
              }}
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all cursor-pointer"
            >
              <Plus className="mr-2 h-4 w-4 rtl:mr-0 rtl:ml-2" />
              {t('inventory.addMobile')}
            </button>
          </div>
        )}
      </div>

      {/* Control Banner: Show Sold On/Off Switch */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#121727] border border-slate-800/80 shadow-md">
        
        {/* On/Off Switch for Sold vs In-Stock */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={showSold}
              onClick={() => setShowSold(!showSold)}
              className={cn(
                "relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner",
                "w-[52px] h-[28px]",
                showSold ? "bg-amber-600" : "bg-slate-700"
              )}
              title={showSold ? t('mobiles.turnOffSoldTooltip', 'Turn off to view In-Stock devices') : t('mobiles.turnOnSoldTooltip', 'Turn on to view Sold devices')}
            >
              <span
                className={cn(
                  "absolute top-0 flex items-center justify-center rounded-full bg-white shadow-md transition-all duration-200 ease-in-out text-[10px] font-bold",
                  "w-[24px] h-[24px]",
                  showSold ? "left-[24px] rtl:left-auto rtl:right-[24px] text-amber-700" : "left-0 rtl:left-auto rtl:right-0 text-slate-600"
                )}
              >
                {showSold ? t('mobiles.on', 'ON') : t('mobiles.off', 'OFF')}
              </span>
            </button>

            <div>
              <div className="text-sm font-semibold text-white">
                {showSold ? t('inventory.hideSold') : t('inventory.showSold')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Inventory Card */}
      <div className="bg-[#161c2c] rounded-2xl border border-slate-800/60 shadow-xl flex flex-col overflow-hidden">
        
        {/* Filter Toolbar: Search + Brand Combo Box + Price Min-Max */}
        <div className="p-4 border-b border-slate-800/60 bg-[#080b14]/40 flex flex-col lg:flex-row gap-3.5 items-stretch lg:items-start justify-between">
          
          {/* Search Box */}
          <div className="flex-1 min-w-[240px] max-w-sm">
            <SearchInput
              placeholder={t('inventory.search')}
              value={searchTerm}
              onChangeValue={setSearchTerm}
              onScan={() => setIsScanning(true)}
              scanTitle={t('mobiles.scanBarcode', 'Scan IMEI / Barcode')}
            />
          </div>

          {/* Filter Controls: Brand Combo Box + Price Range */}
          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* Brand Combo Box */}
            <div className="relative min-w-[150px]">
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/70 py-2 ps-3 pe-8 text-xs text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 appearance-none font-medium cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-slate-200">{t('mobiles.allBrands', 'All Brands')}</option>
                {uniqueBrands.map(b => (
                  <option key={b} value={b} className="bg-slate-900 text-slate-200">{b}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <ArrowUpDown className="w-3 h-3" />
              </div>
            </div>

            {/* Price Filter: Min & Max */}
            <div className="flex items-center gap-1.5 bg-slate-900/70 border border-slate-700 rounded-xl px-2.5 py-1">
              <span className="text-[11px] font-medium text-slate-400 mr-0.5 rtl:mr-0 rtl:ml-0.5">{t('common.price', 'Price')}:</span>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min="0"
                  placeholder={t('mobiles.minPrice', 'Min $')}
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-16 bg-transparent text-xs text-white placeholder:text-slate-600 focus:outline-none font-mono py-1 pe-4"
                />
                {minPrice && (
                  <button
                    type="button"
                    onClick={() => setMinPrice('')}
                    className="absolute end-0.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 p-0.5 rounded transition-colors"
                    title={t('mobiles.clearMinPrice', 'Clear min price')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <span className="text-slate-600 text-xs">-</span>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min="0"
                  placeholder={t('mobiles.maxPrice', 'Max $')}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-16 bg-transparent text-xs text-white placeholder:text-slate-600 focus:outline-none font-mono py-1 pe-4"
                />
                {maxPrice && (
                  <button
                    type="button"
                    onClick={() => setMaxPrice('')}
                    className="absolute end-0.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 p-0.5 rounded transition-colors"
                    title={t('mobiles.clearMaxPrice', 'Clear max price')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Reset Filters button */}
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/30 transition-colors"
                title={t('mobiles.resetFilters', 'Reset Filters')}
              >
                {t('mobiles.resetFilters', 'Reset Filters')}
              </button>
            )}
          </div>
        </div>

        {/* Inventory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-sm whitespace-nowrap">
            <thead className="bg-[#080b14]/70 text-slate-400 uppercase tracking-wider text-xs font-semibold border-b border-slate-800/80">
              <tr>
                <th className="px-6 py-4">{t('inventory.brand')} / {t('inventory.model')}</th>
                <th className="px-6 py-4">{t('mobiles.specifications', 'Specifications')}</th>
                <th className="px-6 py-4">
                  {showSold ? t('mobiles.soldPriceProfit', 'Sold Price & Realized Profit') : t('inventory.price')}
                </th>
                {showSold && (
                  <th className="px-6 py-4">{t('mobiles.buyerSoldDate', 'Buyer & Sold Date')}</th>
                )}
                <th className="px-6 py-4">{t('inventory.status')}</th>
                <th className="px-6 py-4 text-right rtl:text-left">{t('inventory.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 bg-transparent">
              {(filteredMobiles?.length || 0) === 0 ? (
                <tr>
                  <td colSpan={showSold ? 6 : 5} className="px-6 py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center border border-slate-700/50 mb-3 text-slate-400">
                        {showSold ? <ShoppingBag className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
                      </div>
                      <p className="text-slate-300 font-semibold text-base">{t('mobiles.noDevicesFound', 'No devices found')}</p>
                      <p className="text-slate-500 text-xs mt-1">
                        {hasActiveFilters 
                          ? t('mobiles.noFilterMatch', 'No results match your active filter criteria. Try adjusting or resetting filters.') 
                          : showSold 
                            ? t('mobiles.noSoldDevices', 'No devices have been marked as sold yet.') 
                            : t('mobiles.noDevicesInStock', 'No devices currently in stock. Click "Add Mobile" to register one.')}
                      </p>
                      {hasActiveFilters ? (
                        <button
                          onClick={handleResetFilters}
                          className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                        >
                          {t('mobiles.clearFilters', 'Clear Filters')}
                        </button>
                      ) : !showSold ? (
                        <button
                          onClick={() => {
                            setEditingMobile(null);
                            setIsAddDrawerOpen(true);
                          }}
                          className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors"
                        >
                          {t('mobiles.registerFirstMobile', '+ Register First Mobile')}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedMobiles.map((mobile) => {
                  const isSold = mobile.status === 'sold';
                  const isTablet = mobile.brand.toLowerCase().includes('ipad') || mobile.brand.toLowerCase().includes('tablet') || mobile.model.toLowerCase().includes('ipad');
                  const margin = mobile.sellPrice - mobile.buyPrice;
                  const profitRealized = isSold && mobile.soldPrice ? mobile.soldPrice - mobile.buyPrice : margin;

                  return (
                    <tr 
                      key={mobile.id} 
                      onClick={() => setViewingMobile(mobile)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      {/* Device & Details */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className={cn(
                            "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center border transition-colors",
                            isTablet 
                              ? "bg-purple-500/10 border-purple-500/20 text-purple-400" 
                              : isSold 
                                ? "bg-amber-500/10 border-amber-500/20 text-amber-400" 
                                : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                          )}>
                            {isTablet ? <Tablet className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
                          </div>
                          <div>
                            <div className="font-semibold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-2">
                              <span>{mobile.brand} {mobile.model}</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 font-mono">
                              IMEI: {mobile.imei}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Specs */}
                      <td className="px-6 py-4">
                        <div className="text-slate-200 text-xs font-medium">
                          {mobile.storage && mobile.ram ? (
                            <>{mobile.storage} <span className="text-slate-600">•</span> {mobile.ram}</>
                          ) : (
                            mobile.storage || mobile.ram || '—'
                          )}
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5 flex items-center gap-1.5">
                          <span>{mobile.color || t('mobiles.standard', 'Standard')}</span>
                          {mobile.battery ? (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="text-emerald-400 font-mono">{mobile.battery}</span>
                            </>
                          ) : null}
                        </div>
                      </td>

                      {/* Price & Financials */}
                      <td className="px-6 py-4">
                        {isSold ? (
                          <div>
                            <div className={cn("font-mono font-bold text-sm", getCurrencyColor(mobile.currency))}>
                              {formatCurrency(mobile.soldPrice || mobile.sellPrice, mobile.currency)}
                            </div>
                            {canViewCostAndProfit('inventory_mobiles') ? (
                              <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 mt-0.5">
                                <TrendingUp className="w-3 h-3" />
                                <span>+{formatCurrency(profitRealized, mobile.currency)} {t('mobiles.profit', 'profit')}</span>
                              </div>
                            ) : (
                              <div className="mt-1">
                                <CostProfitGuard module="inventory_mobiles" inline />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className={cn("font-mono font-bold text-sm", getCurrencyColor(mobile.currency))}>
                              {formatCurrency(mobile.sellPrice, mobile.currency)}
                            </div>
                            {canViewCostAndProfit('inventory_mobiles') ? (
                              <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                                {t('mobiles.cost', 'Cost')}: {formatCurrency(mobile.buyPrice, mobile.currency)}
                              </div>
                            ) : (
                              <div className="mt-1">
                                <CostProfitGuard module="inventory_mobiles" inline />
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Sold Info (if showSold is ON) */}
                      {showSold && (
                        <td className="px-6 py-4">
                          <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            <span>{mobile.soldToCustomer || t('mobiles.walkInBuyer', 'Walk-in Buyer')}</span>
                          </div>
                          <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{t('mobiles.soldOn', { date: mobile.soldDate || t('mobiles.recent', 'Recent'), defaultValue: `Sold on ${mobile.soldDate || 'Recent'}` })}</span>
                          </div>
                        </td>
                      )}

                      {/* Condition / Status */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          {isSold ? (
                            <span className="inline-flex items-center rounded-lg px-2.5 py-0.5 text-[11px] font-semibold border bg-amber-500/10 text-amber-400 border-amber-500/30">
                              {t('common.sold', 'Sold')}
                            </span>
                          ) : null}
                          <span className="text-xs text-slate-300 font-medium">
                            {mobile.condition || t('mobiles.brandNew', 'Brand New')}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right rtl:text-left" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end rtl:justify-start gap-1.5">
                          {hasPermission('inventory_mobiles', 'edit') && (
                            isSold ? (
                              <button
                                type="button"
                                onClick={() => setReturnTargetMobile(mobile)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                                title={t('mobiles.returnToStockTooltip', 'Return device to mobile list')}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>{t('mobiles.returnToStock', 'Return to Stock')}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSoldTargetMobile(mobile)}
                                className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                                title={t('mobiles.markAsSold', 'Mark device as sold')}
                              >
                                <ShoppingBag className="w-4 h-4" />
                              </button>
                            )
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              navigate('/barcodes', { state: { itemType: 'mobile', itemId: mobile.id } });
                            }}
                            className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors cursor-pointer"
                            title={t('common.printLabel', 'Print Label')}
                          >
                            <BarcodeIcon className="w-4 h-4" />
                          </button>
                          {hasPermission('inventory_mobiles', 'edit') && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(mobile)}
                              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                              title={t('mobiles.editMobile', 'Edit mobile')}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('inventory_mobiles', 'delete') && (
                            <button
                              type="button"
                              onClick={() => setMobileToDelete(mobile)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              title={t('mobiles.deleteMobile', 'Delete mobile')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Status Footer */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredMobiles?.length || 0}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          itemLabel={showSold ? t('common.soldDevices', 'sold devices') : t('common.mobiles', 'mobiles')}
        />
      </div>

      {/* Add / Edit Mobile Slide-over Drawer */}
      <AddMobileDrawer 
        isOpen={isAddDrawerOpen} 
        onClose={() => {
          setIsAddDrawerOpen(false);
          setEditingMobile(null);
        }}
        initialData={editingMobile}
        onSave={handleSaveMobile}
        existingMobiles={mobiles}
      />

      {/* Mobile Details Modal (Row Click) */}
      <MobileDetailsModal
        isOpen={!!viewingMobile}
        mobile={viewingMobile}
        onClose={() => setViewingMobile(null)}
        onOpenBarcodeStudio={() => {
          navigate('/barcodes', { state: { itemType: 'mobile', itemId: viewingMobile?.id } });
        }}
        onReturnToStock={(mob) => setReturnTargetMobile(mob)}
        onMarkAsSold={(mob) => setSoldTargetMobile(mob)}
      />

      {/* Mark As Sold Modal */}
      <MarkAsSoldModal
        isOpen={!!soldTargetMobile}
        mobile={soldTargetMobile}
        onClose={() => setSoldTargetMobile(null)}
        onConfirmSold={handleConfirmSold}
      />

      {/* Return Mobile to Stock Modal */}
      <ReturnMobileModal
        isOpen={!!returnTargetMobile}
        mobile={returnTargetMobile}
        onClose={() => setReturnTargetMobile(null)}
        onConfirmReturn={handleConfirmReturn}
      />

      {/* Delete Confirmation Modal */}
      {mobileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#141b2d] border border-slate-700/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400 mb-2">
              <div className="p-2 rounded-xl bg-rose-500/10">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-100">{t('mobiles.removeMobile', 'Remove Mobile')}</h3>
            </div>
            
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
              {t('mobiles.confirmRemoveMobile', { name: `${mobileToDelete.brand} ${mobileToDelete.model}`, imei: mobileToDelete.imei, defaultValue: `Are you sure you want to permanently remove "${mobileToDelete.brand} ${mobileToDelete.model}" (IMEI: ${mobileToDelete.imei}) from inventory?` })}
            </div>
            
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800/60">
              <button
                type="button"
                onClick={() => setMobileToDelete(null)}
                className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMobile(mobileToDelete.id)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('common.delete', 'Confirm Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Central Database Migration Modal */}
      <MigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
      />

      {/* Camera Scanner for Search */}
      <CameraScannerModal
        isOpen={isScanning}
        onClose={() => setIsScanning(false)}
        onScan={(code) => {
          setSearchTerm(code.trim());
          setIsScanning(false);
          sound.playSuccess();
        }}
        title={t('mobiles.scanBarcode', 'Scan IMEI / Barcode')}
        subtitle={t('mobiles.scanBarcodeSubtitle', 'Scan device IMEI or barcode to search')}
      />
    </div>
  );
}

