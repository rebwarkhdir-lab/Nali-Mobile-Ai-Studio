import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { 
  Plus, 
  Search, 
  X, 
  Package, 
  AlertTriangle, 
  DollarSign, 
  Building2, 
  Tag, 
  Eye, 
  Edit3, 
  Trash2, 
  PlusCircle, 
  MinusCircle, 
  Layers, 
  ArrowUpDown, 
  MapPin, 
  RefreshCw, 
  Sparkles,
  Barcode as BarcodeIcon,
  Printer,
  ShoppingBag,
  RotateCcw,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { formatNumberWithCommas, cn, getCurrencyColor } from '../lib/utils';
import { SearchInput } from '../components/common/SearchInput';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Database } from 'lucide-react';
import { Accessory, AccessoryStatus } from '../types/accessory';
import AddAccessoryDrawer from '../components/accessories/AddAccessoryDrawer';
import AccessoryDetailsModal from '../components/accessories/AccessoryDetailsModal';
import MarkAccessorySoldModal from '../components/accessories/MarkAccessorySoldModal';
import ReturnAccessoryModal from '../components/accessories/ReturnAccessoryModal';
import CreateSupplierReturnModal from '../components/suppliers/CreateSupplierReturnModal';
import { supplierService } from '../lib/supplierService';
import { Supplier } from '../types/supplier';
import { sound } from '../lib/sound';
import { useToast } from '../components/common/Toast';

import { idb } from '../lib/idbService';
import { recycleBinService } from '../lib/recycleBinService';
import { useTranslation } from 'react-i18next';
import { getCategoryTranslation, getStatusTranslation } from '../lib/accessoryTranslations';
import { useAuth } from '../context/AuthContext';
import { CostProfitGuard } from '../components/common/PermissionGuard';
import CameraScannerModal from '../components/common/CameraScannerModal';
import { Pagination } from '../components/common/Pagination';

export default function Accessories() {
  const { t, i18n } = useTranslation();
  const isKurdish = i18n.language === 'ku';
  const { success, error: toastError, info } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, canViewCostAndProfit } = useAuth();
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [schemaError, setSchemaError] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [defectiveAccessoryForReturn, setDefectiveAccessoryForReturn] = useState<Accessory | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  
  // Sold vs In-Stock Mode and Modals
  const [showSold, setShowSold] = useState<boolean>(false);
  const [soldTargetAccessory, setSoldTargetAccessory] = useState<Accessory | null>(null);
  const [returnTargetAccessory, setReturnTargetAccessory] = useState<Accessory | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const idbData = await idb.getAll<Accessory>('accessories');
        if (Array.isArray(idbData) && idbData.length > 0 && isMounted) {
          setAccessories(idbData);
          setIsLoading(false);
          return;
        }
      } catch (e) {}

      const cached = localStorage.getItem('nali_accessories_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0 && isMounted) {
            setAccessories(parsed);
            setIsLoading(false);
            return;
          }
        } catch (e) {}
      }

      if (isMounted) {
        setAccessories([]);
        setIsLoading(false);
      }
    };

    loadInitialData();

    const fetchAccessories = async () => {
      try {
        const [accRes, supRes] = await Promise.all([
          supabase.from('nali_accessories').select('*'),
          supplierService.getAllSuppliers()
        ]);
        if (supRes && isMounted) setSuppliers(supRes);

        const { data, error } = accRes;
        if (error) {
          if (error.code !== 'PGRST205') console.warn('Supabase accessories notice:', error);
          if (error.code === 'PGRST205' && isMounted) {
            setSchemaError(true);
          }
        } else if (isMounted && data !== null && data !== undefined) {
          const freshAccessories = Array.isArray(data) ? (data as Accessory[]) : [];
          setAccessories(freshAccessories);
          localStorage.setItem('nali_accessories_cache', JSON.stringify(freshAccessories));
          try {
            await idb.clear('accessories');
            if (Array.isArray(freshAccessories) && freshAccessories.length > 0) {
              await idb.bulkPut('accessories', freshAccessories);
            }
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Failed to load accessories:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchAccessories();

    const channel = supabase
      .channel('public:nali_accessories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nali_accessories' }, async (payload) => {
        if (!isMounted) return;
        if (payload.eventType === 'INSERT') {
          const newAcc = payload.new as Accessory;
          setAccessories(prev => {
            if (prev.some(a => a.id === newAcc.id)) return prev;
            const updated = [newAcc, ...prev];
            localStorage.setItem('nali_accessories_cache', JSON.stringify(updated));
            return updated;
          });
          try { await idb.put('accessories', newAcc); } catch (e) {}
        } else if (payload.eventType === 'UPDATE') {
          const updatedAcc = payload.new as Accessory;
          setAccessories(prev => {
            const updated = prev.map(m => m.id === updatedAcc.id ? updatedAcc : m);
            localStorage.setItem('nali_accessories_cache', JSON.stringify(updated));
            return updated;
          });
          try { await idb.put('accessories', updatedAcc); } catch (e) {}
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old?.id;
          if (deletedId) {
            setAccessories(prev => {
              const updated = prev.filter(m => m.id !== deletedId);
              localStorage.setItem('nali_accessories_cache', JSON.stringify(updated));
              return updated;
            });
            try { await idb.delete('accessories', deletedId); } catch (e) {}
          } else {
            fetchAccessories();
          }
        }
      })
      .subscribe();

    const handleConfigChange = () => fetchAccessories();
    const handleDataReload = () => fetchAccessories();

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
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name-asc' | 'qty-asc' | 'qty-desc' | 'price-desc' | 'price-asc'>('recent');

  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [editingAccessory, setEditingAccessory] = useState<Accessory | null>(null);
  const [viewingAccessory, setViewingAccessory] = useState<Accessory | null>(null);

  useEffect(() => {
    if (!isLoading && location.state?.editAccessoryId) {
      const accessoryId = location.state.editAccessoryId;
      const target = accessories.find(a => a.id === accessoryId);
      if (target) {
        setEditingAccessory(target);
        setIsAddDrawerOpen(true);
        // Clear state so it doesn't trigger again on re-render
        navigate('.', { replace: true, state: {} });
      }
    }
  }, [isLoading, accessories, location.state, navigate]);
  const [accessoryToDelete, setAccessoryToDelete] = useState<Accessory | null>(null);

  // No longer needing localStorage save, useSupabaseSync handles it

  const uniqueBrands = useMemo(() => {
    const set = new Set<string>();
    (accessories || []).forEach(a => {
      if (a.brand?.trim()) set.add(a.brand.trim());
    });
    return Array.from(set).sort();
  }, [accessories]);

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    (accessories || []).forEach(a => {
      if (a.category?.trim()) set.add(a.category.trim());
    });
    return Array.from(set).sort();
  }, [accessories]);

  const uniqueCompanies = useMemo(() => {
    const set = new Set<string>();
    (accessories || []).forEach(a => {
      if (a.company?.trim()) set.add(a.company.trim());
    });
    return Array.from(set).sort();
  }, [accessories]);

  const stats = useMemo(() => {
    let totalUnits = 0;
    let lowStockAlertCount = 0;
    let outOfStockCount = 0;
    let totalCostUsd = 0;
    let totalCostIqd = 0;

    let totalSoldUnits = 0;
    let soldItemsCount = 0;
    let totalSoldRevenueUsd = 0;
    let totalSoldRevenueIqd = 0;
    let totalSoldProfitUsd = 0;
    let totalSoldProfitIqd = 0;

    (accessories || []).forEach(item => {
      totalUnits += item.quantity;
      const sold = item.totalSold || 0;
      if (sold > 0) {
        soldItemsCount++;
        totalSoldUnits += sold;
        const profitPerUnit = Math.max(0, item.sellPrice - item.buyPrice);
        if (item.currency === 'USD') {
          totalSoldRevenueUsd += item.sellPrice * sold;
          totalSoldProfitUsd += profitPerUnit * sold;
        } else {
          totalSoldRevenueIqd += item.sellPrice * sold;
          totalSoldProfitIqd += profitPerUnit * sold;
        }
      }

      if (item.quantity <= 0) {
        outOfStockCount++;
      } else if (
        item.notifyThreshold !== undefined && 
        item.notifyThreshold !== null && 
        item.notifyThreshold > 0 && 
        item.quantity <= item.notifyThreshold
      ) {
        lowStockAlertCount++;
      }

      if (item.currency === 'USD') {
        totalCostUsd += (item.buyPrice || 0) * item.quantity;
      } else {
        totalCostIqd += (item.buyPrice || 0) * item.quantity;
      }
    });

    return {
      totalUnits,
      lowStockAlertCount,
      outOfStockCount,
      totalCostUsd,
      totalCostIqd,
      totalSoldUnits,
      soldItemsCount,
      totalSoldRevenueUsd,
      totalSoldRevenueIqd,
      totalSoldProfitUsd,
      totalSoldProfitIqd
    };
  }, [accessories]);

  const filteredAccessories = useMemo(() => {
    return (accessories || []).filter(item => {
      // Filter by Sold vs In-Stock if showSold is active
      if (showSold && (item.totalSold || 0) <= 0) {
        return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesSearch = 
          item.name.toLowerCase().includes(query) ||
          item.brand.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query) ||
          item.barcode.toLowerCase().includes(query) ||
          item.company.toLowerCase().includes(query) ||
          (item.location && item.location.toLowerCase().includes(query)) ||
          (item.compatibility && item.compatibility.toLowerCase().includes(query)) ||
          (item.notes && item.notes.toLowerCase().includes(query));
        
        if (!matchesSearch) return false;
      }

      if (selectedBrand !== 'all' && item.brand !== selectedBrand) {
        return false;
      }

      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      if (selectedCompany !== 'all' && item.company !== selectedCompany) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'name-asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'qty-asc') {
        return a.quantity - b.quantity;
      }
      if (sortBy === 'qty-desc') {
        return b.quantity - a.quantity;
      }
      if (sortBy === 'price-desc') {
        return (b.sellPrice || 0) - (a.sellPrice || 0);
      }
      if (sortBy === 'price-asc') {
        return (a.sellPrice || 0) - (b.sellPrice || 0);
      }
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [accessories, showSold, searchTerm, selectedBrand, selectedCategory, selectedCompany, sortBy]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset pagination when search, filter, sort, or showSold changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBrand, selectedCategory, selectedCompany, sortBy, showSold]);

  const totalPages = Math.max(1, Math.ceil((filteredAccessories?.length || 0) / pageSize));
  const paginatedAccessories = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return (filteredAccessories || []).slice(start, start + pageSize);
  }, [filteredAccessories, currentPage, pageSize]);

  const handleSaveAccessory = async (accessoryData: Omit<Accessory, 'id' | 'createdAt' | 'updatedAt'>) => {
    sound.playScanSuccess();
    const hasNotify = accessoryData.notifyThreshold !== undefined && accessoryData.notifyThreshold !== null && accessoryData.notifyThreshold > 0;
    const newStatus: AccessoryStatus = 
      accessoryData.quantity <= 0 
        ? 'out_of_stock' 
        : (hasNotify && accessoryData.quantity <= accessoryData.notifyThreshold!)
          ? 'low_stock' 
          : 'in_stock';

    const safeBarcode = (accessoryData.barcode || '').trim() || ('BAR-' + Date.now());
    const safeCompany = (accessoryData.company || '').trim() || 'General Supplier';

    const cleanPayload = {
      ...accessoryData,
      barcode: safeBarcode,
      company: safeCompany,
      status: newStatus
    };

    if (editingAccessory) {
      // Optimistic update
      const updated: Accessory = {
        ...editingAccessory,
        ...cleanPayload,
        updatedAt: new Date().toISOString()
      };
      setAccessories(prev => {
        const next = prev.map(item => item.id === editingAccessory.id ? updated : item);
        localStorage.setItem('nali_accessories_cache', JSON.stringify(next));
        return next;
      });
      try { await idb.put('accessories', updated); } catch (e) {}
      if (viewingAccessory?.id === editingAccessory.id) {
        setViewingAccessory(updated);
      }
      success(t('accessories.toastUpdated', { name: cleanPayload.name, defaultValue: `Updated "${cleanPayload.name}" successfully` }));

      const { error } = await supabase.from('nali_accessories').update({
        ...cleanPayload,
        updatedAt: new Date().toISOString()
      }).eq('id', editingAccessory.id);
      
      if (error) {
        if (error.code !== 'PGRST205') console.error('Update failed', error);
      }
      setEditingAccessory(null);
    } else {
      const newId = crypto.randomUUID();
      const newAccessory: Accessory = {
        ...cleanPayload,
        id: newId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Optimistic add immediately
      setAccessories(prev => {
        const next = [newAccessory, ...prev.filter(a => a.id !== newId)];
        localStorage.setItem('nali_accessories_cache', JSON.stringify(next));
        return next;
      });
      try { await idb.put('accessories', newAccessory); } catch (e) {}

      success(t('accessories.toastAdded', { name: newAccessory.name, defaultValue: `Added "${newAccessory.name}" to accessories` }));

      const { data, error } = await supabase.from('nali_accessories').insert(newAccessory).select().single();
      
      if (error) {
        if (error.code !== 'PGRST205' && isSupabaseConfigured()) {
          console.warn('[Accessories] Supabase cloud sync deferred, item safely saved in local offline database.');
        }
      } else if (data) {
         const savedItem = data as Accessory;
         setAccessories(prev => {
           const next = prev.map(m => m.id === newId ? savedItem : m);
           localStorage.setItem('nali_accessories_cache', JSON.stringify(next));
           return next;
         });
         try { await idb.put('accessories', savedItem); } catch (e) {}
      }
    }
    
    // Automatically scroll to the top of the page so the user can quickly start another registration
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteAccessory = async (id: string) => {
    sound.playAlert();
    const deletedItem = accessories.find(item => item.id === id);
    
    if (deletedItem) {
      await recycleBinService.moveToBin({
        id: deletedItem.id,
        type: 'accessory',
        name: deletedItem.name || 'Unknown Accessory',
        data: deletedItem
      });
    }

    // Optimistic delete
    setAccessories(prev => {
      const next = prev.filter(item => item.id !== id);
      localStorage.setItem('nali_accessories_cache', JSON.stringify(next));
      return next;
    });
    try { await idb.delete('accessories', id); } catch (e) {}
    if (viewingAccessory?.id === id) setViewingAccessory(null);
    setAccessoryToDelete(null);
    info("Accessory moved to Recycle Bin");

    const { error } = await supabase.from('nali_accessories').delete().eq('id', id);
    if (error) {
       if (error.code !== 'PGRST205') console.error('Delete failed', error);
    }
  };

  const handleOpenEdit = (accessory: Accessory) => {
    sound.playClick();
    setEditingAccessory(accessory);
    setIsAddDrawerOpen(true);
  };

  const handleQuickAdjustStock = async (accessory: Accessory, amount: number) => {
    sound.playClick();
    const newQty = Math.max(0, accessory.quantity + amount);
    const hasNotify = accessory.notifyThreshold !== undefined && accessory.notifyThreshold !== null && accessory.notifyThreshold > 0;
    const newStatus: AccessoryStatus = 
      newQty <= 0 
        ? 'out_of_stock' 
        : (hasNotify && newQty <= accessory.notifyThreshold!)
          ? 'low_stock' 
          : 'in_stock';

    // Optimistic update
    setAccessories(prev => prev.map(item => {
      if (item.id === accessory.id) {
        const updated: Accessory = {
          ...item,
          quantity: newQty,
          status: newStatus,
          updatedAt: new Date().toISOString()
        };
        if (viewingAccessory?.id === item.id) {
          setViewingAccessory(updated);
        }
        return updated;
      }
      return item;
    }));

    if (amount > 0) {
      success(t('accessories.toastStockAdjusted', { name: accessory.name, qty: newQty, defaultValue: `${accessory.name}: +${amount} (Now ${newQty})` }));
    } else {
      info(t('accessories.toastStockAdjusted', { name: accessory.name, qty: newQty, defaultValue: `${accessory.name}: ${amount} (Now ${newQty})` }));
    }

    const { error } = await supabase.from('nali_accessories').update({
      quantity: newQty,
      status: newStatus,
      updatedAt: new Date().toISOString()
    }).eq('id', accessory.id);

    if (error) {
       if (error.code !== 'PGRST205') console.error('Quick adjust stock failed', error);
    }
  };

  const handleConfirmSoldAccessory = async (
    accessoryId: string, 
    soldData: { 
      quantitySold: number; 
      soldPrice: number; 
      soldDate: string; 
      soldToCustomer: string; 
      soldNotes: string 
    }
  ) => {
    sound.playPaymentSuccess();
    const target = accessories.find(a => a.id === accessoryId);
    if (!target) return;

    const sellQty = soldData.quantitySold;
    const newQty = Math.max(0, target.quantity - sellQty);
    const newTotalSold = (target.totalSold || 0) + sellQty;
    const hasNotify = target.notifyThreshold !== undefined && target.notifyThreshold !== null && target.notifyThreshold > 0;
    const newStatus: AccessoryStatus = 
      newQty <= 0 
        ? 'out_of_stock' 
        : (hasNotify && newQty <= target.notifyThreshold!)
          ? 'low_stock' 
          : 'in_stock';

    const updatedList = accessories.map(item => {
      if (item.id === accessoryId) {
        const updated: Accessory = {
          ...item,
          quantity: newQty,
          totalSold: newTotalSold,
          status: newStatus,
          updatedAt: new Date().toISOString()
        };
        if (viewingAccessory?.id === item.id) {
          setViewingAccessory(updated);
        }
        return updated;
      }
      return item;
    });

    setAccessories(updatedList);
    localStorage.setItem('nali_accessories_cache', JSON.stringify(updatedList));
    idb.bulkPut('accessories', updatedList);

    success(t('accessories.toastSold', { qty: sellQty, name: target.name, customer: soldData.soldToCustomer, defaultValue: `Recorded sale of ${sellQty} unit(s) of "${target.name}" (${soldData.soldToCustomer})` }));

    const { error } = await supabase.from('nali_accessories').update({
      quantity: newQty,
      totalSold: newTotalSold,
      status: newStatus,
      updatedAt: new Date().toISOString()
    }).eq('id', accessoryId);

    if (error && error.code !== 'PGRST205') {
      console.error('Supabase update failed', error);
    }
  };

  const handleConfirmReturnAccessory = async (accessoryId: string, returnQty: number, reason?: string) => {
    sound.playPaymentSuccess();
    const target = accessories.find(a => a.id === accessoryId);
    if (!target) return;

    const newQty = target.quantity + returnQty;
    const newTotalSold = Math.max(0, (target.totalSold || 0) - returnQty);
    const hasNotify = target.notifyThreshold !== undefined && target.notifyThreshold !== null && target.notifyThreshold > 0;
    const newStatus: AccessoryStatus = 
      newQty <= 0 
        ? 'out_of_stock' 
        : (hasNotify && newQty <= target.notifyThreshold!)
          ? 'low_stock' 
          : 'in_stock';

    const updatedList = accessories.map(item => {
      if (item.id === accessoryId) {
        const updated: Accessory = {
          ...item,
          quantity: newQty,
          totalSold: newTotalSold,
          status: newStatus,
          updatedAt: new Date().toISOString()
        };
        if (viewingAccessory?.id === item.id) {
          setViewingAccessory(updated);
        }
        return updated;
      }
      return item;
    });

    setAccessories(updatedList);
    localStorage.setItem('nali_accessories_cache', JSON.stringify(updatedList));
    idb.bulkPut('accessories', updatedList);

    success(t('accessories.toastReturned', { qty: returnQty, name: target.name, defaultValue: `Returned ${returnQty} unit(s) of "${target.name}" to inventory` }));

    const { error } = await supabase.from('nali_accessories').update({
      quantity: newQty,
      totalSold: newTotalSold,
      status: newStatus,
      updatedAt: new Date().toISOString()
    }).eq('id', accessoryId);

    if (error && error.code !== 'PGRST205') {
      console.error('Supabase update failed', error);
    }
  };

  const hasActiveFilters = searchTerm !== '' || selectedBrand !== 'all' || selectedCategory !== 'all' || selectedCompany !== 'all';

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedBrand('all');
    setSelectedCategory('all');
    setSelectedCompany('all');
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {t('accessories.title', 'Accessories')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            {t('accessories.subtitle', 'Manage inventory, stock levels, sales history, and barcode labeling')}
          </p>
        </div>

        <div className="flex flex-row flex-wrap items-center gap-2.5 sm:gap-3">
          <button 
            type="button"
            onClick={() => {
              sound.playClick();
              navigate('/restock-alerts');
            }}
            className="inline-flex items-center justify-center rounded-xl bg-amber-950/60 hover:bg-amber-900/60 border border-amber-500/40 hover:border-amber-500 px-3.5 py-2.5 sm:px-4 text-xs sm:text-sm font-semibold text-amber-300 shadow-sm transition-all cursor-pointer min-h-[44px]"
          >
            <AlertTriangle className="mr-2 rtl:mr-0 rtl:ml-2 h-4 w-4 text-amber-400 shrink-0" />
            <span className="truncate">{t('accessories.restockAlerts', 'Restock Alerts')}</span>
          </button>
          
          <button 
            type="button"
            onClick={() => {
              sound.playClick();
              navigate('/screen-protectors');
            }}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/40 hover:border-indigo-500 px-3.5 py-2.5 sm:px-4 text-xs sm:text-sm font-semibold text-indigo-300 shadow-sm transition-all cursor-pointer min-h-[44px]"
          >
            <Layers className="mr-2 rtl:mr-0 rtl:ml-2 h-4 w-4 text-indigo-400 shrink-0" />
            <span className="truncate">{t('accessories.glassCompatibility', 'Glass Compatibility')}</span>
          </button>

          {hasPermission('inventory_accessories', 'create') && (
            <button 
              onClick={() => {
                setEditingAccessory(null);
                setIsAddDrawerOpen(true);
              }}
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-medium text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all cursor-pointer min-h-[44px]"
            >
              <Plus className="mr-2 rtl:mr-0 rtl:ml-2 h-4 w-4 shrink-0" />
              <span>{t('accessories.addAccessory', 'Add Accessory')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Control Banner: Show Sold On/Off Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-[#121727] border border-slate-800/80 shadow-md">
        {/* On/Off Switch for Sold vs In-Stock */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={showSold}
            onClick={() => {
              sound.playClick();
              setShowSold(!showSold);
            }}
            className={cn(
              "relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner",
              "w-[52px] h-[28px]",
              showSold ? "bg-amber-600" : "bg-slate-700"
            )}
            title={showSold ? t('accessories.showSold', 'Turn off to view In-Stock accessories') : t('accessories.showSold', 'Turn on to view Sold accessories')}
          >
            <span
              className={cn(
                "absolute top-0 flex items-center justify-center rounded-full bg-white shadow-md transition-all duration-200 ease-in-out text-[10px] font-bold",
                "w-[24px] h-[24px]",
                showSold ? "left-[24px] rtl:left-auto rtl:right-[24px] text-amber-700" : "left-0 rtl:left-auto rtl:right-0 text-slate-600"
              )}
            >
              {showSold ? t('accessories.switchOn', 'ON') : t('accessories.switchOff', 'OFF')}
            </span>
          </button>

          <div>
            <div className="text-xs sm:text-sm font-semibold text-white">
              {showSold ? t('accessories.viewingSold', 'Viewing Sold Accessories') : t('accessories.showSold', 'Show Sold Accessories')}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-400">
              {showSold ? (
                <span className="text-amber-400 font-medium">
                  {t('accessories.soldInventoryDesc', { items: stats.soldItemsCount, sold: stats.totalSoldUnits, defaultValue: `${stats.soldItemsCount} items • ${stats.totalSoldUnits} total sold` })}
                </span>
              ) : (
                <span>
                  {t('accessories.activeInventoryDesc', { count: stats.totalUnits, defaultValue: `Active inventory (${stats.totalUnits} available units)` })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick summary pill */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 font-medium flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>{t('accessories.activePill', 'Active:')} <strong className="text-white font-mono">{stats.totalUnits}</strong></span>
          </span>
          <span className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{t('accessories.soldPill', 'Sold:')} <strong className="text-amber-200 font-mono">{stats.totalSoldUnits}</strong></span>
          </span>
        </div>
      </div>

      {/* Main Inventory Container */}
      <div className="bg-[#161c2c] rounded-2xl border border-slate-800/60 shadow-xl flex flex-col overflow-hidden">
        
        {/* Filter Toolbar: Search + Brand Combo + Category Combo + Supplier Combo + Sort */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800/60 bg-[#080b14]/40 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          
          {/* Search Box */}
          <div className="flex-1 w-full lg:max-w-xs">
            <SearchInput
              placeholder={t('accessories.searchPlaceholder', 'Search accessories, barcode, brand...')}
              value={searchTerm}
              onChangeValue={setSearchTerm}
              onScan={() => setIsScanning(true)}
              scanTitle={t('accessories.scanBarcode', 'Scan Accessory Barcode')}
            />
          </div>

          {/* Combo Dropdowns: Brand + Category + Supplier + Sort */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2 sm:gap-2.5">
            
            {/* Category Dropdown */}
            <div className="relative col-span-1 min-w-0 lg:min-w-[140px]">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-900/70 ps-3 pe-7 py-2 text-xs font-medium text-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer min-h-[40px]"
              >
                <option value="all">{t('accessories.allCategories', 'All Categories')}</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{getCategoryTranslation(cat, t)}</option>
                ))}
              </select>
              <Tag className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            </div>

            {/* Brand Dropdown */}
            <div className="relative col-span-1 min-w-0 lg:min-w-[130px]">
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-900/70 ps-3 pe-7 py-2 text-xs font-medium text-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer min-h-[40px]"
              >
                <option value="all">{t('accessories.allBrands', 'All Brands')}</option>
                {uniqueBrands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
              <Layers className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            </div>

            {/* Supplier / Company Dropdown */}
            <div className="relative col-span-1 min-w-0 lg:min-w-[140px]">
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-900/70 ps-3 pe-7 py-2 text-xs font-medium text-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer min-h-[40px]"
              >
                <option value="all">{t('accessories.allSuppliers', 'All Suppliers')}</option>
                {uniqueCompanies.map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
              <Building2 className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            </div>

            {/* Sort Dropdown */}
            <div className="relative col-span-1 min-w-0 lg:min-w-[140px]">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-900/70 ps-3 pe-7 py-2 text-xs font-medium text-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer min-h-[40px]"
              >
                <option value="recent">{t('accessories.recentlyAdded', 'Recently Added')}</option>
                <option value="name-asc">{t('accessories.sortNameAsc', 'Product (A-Z)')}</option>
                <option value="qty-desc">{t('accessories.sortQtyDesc', 'Highest Stock')}</option>
                <option value="qty-asc">{t('accessories.sortQtyAsc', 'Lowest Stock')}</option>
                <option value="price-desc">{t('accessories.sortPriceDesc', 'Highest Price')}</option>
                <option value="price-asc">{t('accessories.sortPriceAsc', 'Lowest Price')}</option>
              </select>
              <ArrowUpDown className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            </div>

            {/* Reset Filters button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="col-span-2 lg:col-span-1 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
                title={t('accessories.resetFilters', 'Reset filters')}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('accessories.resetFilters', 'Reset')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Accessory Items List: Responsive Card View on Mobile + Table View on Tablet/Desktop */}
        {(filteredAccessories?.length || 0) === 0 ? (
          <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center p-6">
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 mb-3 text-slate-400">
              <Package className="w-8 h-8 opacity-60" />
            </div>
            <p className="text-base font-semibold text-slate-300">{t('accessories.noAccessoriesFound', 'No accessories found')}</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {hasActiveFilters
                ? t('accessories.noAccessoriesAdjust', 'Try adjusting or clearing your search and filter criteria.')
                : t('accessories.noAccessoriesStart', 'Get started by clicking "+ Add Accessory" to register your first accessory item.')}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="mt-4 px-4 py-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30 text-xs font-medium transition-colors cursor-pointer"
              >
                {t('accessories.clearAllFilters', 'Clear All Filters')}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* 1. Mobile Cards View (Visible on screens < md) */}
            <div className="block md:hidden divide-y divide-slate-800/50">
              {filteredAccessories.map((accessory) => {
                const hasNotify = accessory.notifyThreshold !== undefined && accessory.notifyThreshold !== null && accessory.notifyThreshold > 0;
                const isLow = hasNotify && accessory.quantity > 0 && accessory.quantity <= accessory.notifyThreshold!;
                const isOut = accessory.quantity <= 0;
                const soldCount = accessory.totalSold || 0;
                const unitProfit = Math.max(0, accessory.sellPrice - accessory.buyPrice);
                const totalRealizedRevenue = accessory.sellPrice * soldCount;
                const totalRealizedProfit = unitProfit * soldCount;

                return (
                  <div 
                    key={accessory.id} 
                    className="p-4 space-y-3 hover:bg-slate-800/20 transition-colors"
                  >
                    {/* Top Row: Thumbnail + Title + Brand/Category */}
                    <div className="flex items-start gap-3">
                      {accessory.image ? (
                        <img 
                          src={accessory.image} 
                          alt={accessory.name}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-xl object-cover border border-slate-700 bg-slate-900 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 flex items-center justify-center shrink-0">
                          <Package className="w-6 h-6 text-indigo-400/70" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                            {accessory.brand}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                            isOut 
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              : isLow 
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          )}>
                            {isOut ? t('accessories.outOfStock', 'Out of Stock') : isLow ? t('accessories.lowStock', 'Low Stock') : t('accessories.inStock', 'In Stock')}
                          </span>
                        </div>

                        <h3 className="font-semibold text-slate-100 text-sm leading-snug line-clamp-2 mt-0.5">
                          {accessory.name}
                        </h3>

                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                          <span className="text-slate-300">{getCategoryTranslation(accessory.category, t)}</span>
                          {accessory.location && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-slate-400">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                {accessory.location}
                              </span>
                            </>
                          )}
                          {accessory.company && (
                            <>
                              <span>•</span>
                              <span className="text-slate-400 truncate max-w-[120px]">{accessory.company}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle Row: Stock adjustment controls & Pricing */}
                    <div className="grid grid-cols-2 gap-2.5 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                      {/* Stock Level Control */}
                      <div className="flex flex-col justify-center">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                          {showSold ? t('accessories.soldVsRemaining', 'Sold vs Remaining') : t('accessories.stockQuantity', 'Stock Quantity')}
                        </span>
                        {showSold ? (
                          <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-amber-300 text-sm">
                              {soldCount} {t('accessories.soldPill', 'Sold')}
                            </span>
                            <span className="text-slate-400 text-xs font-mono">
                              ({accessory.quantity} {t('accessories.inStock', 'in stock')})
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-1">
                            {hasPermission('inventory_accessories', 'edit') && (
                              <button
                                type="button"
                                onClick={() => handleQuickAdjustStock(accessory, -1)}
                                disabled={accessory.quantity <= 0}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                                title={t('accessories.decreaseUnit', 'Decrease 1 unit')}
                              >
                                <MinusCircle className="w-5 h-5" />
                              </button>
                            )}

                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border text-center min-w-[42px]",
                              isOut 
                                ? "bg-rose-500/15 text-rose-300 border-rose-500/40" 
                                : isLow 
                                  ? "bg-amber-500/15 text-amber-300 border-amber-500/40 animate-pulse" 
                                  : "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                            )}>
                              {accessory.quantity}
                            </span>

                            {hasPermission('inventory_accessories', 'edit') && (
                              <button
                                type="button"
                                onClick={() => handleQuickAdjustStock(accessory, 1)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                                title={t('accessories.increaseUnit', 'Increase 1 unit')}
                              >
                                <PlusCircle className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        )}
                        {isLow && !showSold && (
                          <span className="text-[10px] text-amber-400/90 font-medium mt-0.5">
                            {t('accessories.alertAt', { count: accessory.notifyThreshold, defaultValue: `Alert at ≤${accessory.notifyThreshold}` })}
                          </span>
                        )}
                      </div>

                      {/* Pricing Info */}
                      <div className="flex flex-col justify-center text-right rtl:text-left border-l rtl:border-l-0 rtl:border-r border-slate-800 ps-2.5 rtl:ps-0 rtl:pe-2.5">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                          {showSold 
                            ? (canViewCostAndProfit('inventory_accessories') ? t('accessories.revenueProfit', 'Revenue & Profit') : t('accessories.revenue', 'Revenue'))
                            : t('accessories.sellPrice', 'Sell Price')}
                        </span>
                        {showSold ? (
                          <div className="mt-1">
                            <div className="font-mono font-bold text-emerald-400 text-xs sm:text-sm">
                              {accessory.currency === 'USD' ? '$' : ''}
                              {formatNumberWithCommas(totalRealizedRevenue.toFixed(accessory.currency === 'USD' ? 2 : 0))}
                              {accessory.currency === 'IQD' ? ' د.ع' : ''}
                            </div>
                            {canViewCostAndProfit('inventory_accessories') ? (
                              <div className="text-[10px] font-mono text-cyan-400">
                                {t('accessories.profit', 'Profit')}: +{accessory.currency === 'USD' ? '$' : ''}
                                {formatNumberWithCommas(totalRealizedProfit.toFixed(accessory.currency === 'USD' ? 2 : 0))}
                                {accessory.currency === 'IQD' ? ' د.ع' : ''}
                              </div>
                            ) : (
                              <div className="mt-0.5">
                                <CostProfitGuard module="inventory_accessories" inline />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-1">
                            <div className={cn("font-mono font-bold text-sm", getCurrencyColor(accessory.currency))}>
                              {accessory.currency === 'USD' 
                                ? `$${accessory.sellPrice.toFixed(2)}` 
                                : `${formatNumberWithCommas(accessory.sellPrice)} د.ع`}
                            </div>
                            {canViewCostAndProfit('inventory_accessories') ? (
                              <div className="text-[10px] font-mono text-slate-400">
                                {t('accessories.cost', 'Cost')}: {accessory.currency === 'USD' 
                                  ? `$${accessory.buyPrice.toFixed(2)}` 
                                  : `${formatNumberWithCommas(accessory.buyPrice)} د.ع`}
                              </div>
                            ) : (
                              <div className="mt-0.5">
                                <CostProfitGuard module="inventory_accessories" inline />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions Toolbar */}
                    <div className="flex items-center justify-between pt-1 gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        {hasPermission('inventory_accessories', 'edit') && (
                          showSold ? (
                            <button
                              type="button"
                              onClick={() => setReturnTargetAccessory(accessory)}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer min-h-[36px]"
                              title={t('accessories.returnToStock', 'Return sold units to stock')}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>{t('accessories.returnToStock', 'Return to Stock')}</span>
                            </button>
                          ) : (
                            accessory.quantity > 0 && (
                              <button
                                type="button"
                                onClick={() => setSoldTargetAccessory(accessory)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer min-h-[36px]"
                                title={t('accessories.markSold', 'Mark accessory as sold')}
                              >
                                <ShoppingBag className="w-3.5 h-3.5" />
                                <span>{t('accessories.markSold', 'Mark Sold')}</span>
                              </button>
                            )
                          )
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            navigate('/barcodes', { state: { itemType: 'accessory', itemId: accessory.id } });
                          }}
                          className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-xl transition-colors cursor-pointer border border-cyan-500/20 min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title={t('accessories.printBarcode', 'Print Barcode Label')}
                        >
                          <BarcodeIcon className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingAccessory(accessory)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title={t('accessories.viewDetails', 'View Details')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {hasPermission('inventory_accessories', 'edit') && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(accessory)}
                            className="p-2 text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-xl transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                            title={t('accessories.edit', 'Edit')}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission('inventory_accessories', 'delete') && (
                          <button
                            type="button"
                            onClick={() => setAccessoryToDelete(accessory)}
                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                            title={t('accessories.delete', 'Delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. Tablet & Desktop Table View (Visible on screens >= md) */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left rtl:text-right border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-900/60 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4">{t('accessories.productDetails', 'Product Details')}</th>
                    <th className="py-3.5 px-4">{t('accessories.brandSupplier', 'Brand & Supplier')}</th>
                    {showSold ? (
                      <>
                        <th className="py-3.5 px-4 text-center">{t('accessories.soldUnits', 'Sold Units')}</th>
                        <th className="py-3.5 px-4 text-right rtl:text-left">{t('accessories.sellPrice', 'Sell Price')}</th>
                        <th className="py-3.5 px-4 text-right rtl:text-left">
                          {canViewCostAndProfit('inventory_accessories') 
                            ? t('accessories.realizedRevenueProfit', 'Realized Revenue & Profit') 
                            : t('accessories.realizedRevenue', 'Realized Revenue')}
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="py-3.5 px-4 text-center">{t('accessories.stockLevel', 'Stock Level')}</th>
                        <th className="py-3.5 px-4 text-right rtl:text-left">{t('accessories.buyPrice', 'Buy Price')}</th>
                        <th className="py-3.5 px-4 text-right rtl:text-left">{t('accessories.sellPrice', 'Sell Price')}</th>
                      </>
                    )}
                    <th className="py-3.5 px-4 text-right rtl:text-left">{t('accessories.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {paginatedAccessories.map((accessory) => {
                    const hasNotify = accessory.notifyThreshold !== undefined && accessory.notifyThreshold !== null && accessory.notifyThreshold > 0;
                    const isLow = hasNotify && accessory.quantity > 0 && accessory.quantity <= accessory.notifyThreshold!;
                    const isOut = accessory.quantity <= 0;
                    const soldCount = accessory.totalSold || 0;
                    const unitProfit = Math.max(0, accessory.sellPrice - accessory.buyPrice);
                    const totalRealizedRevenue = accessory.sellPrice * soldCount;
                    const totalRealizedProfit = unitProfit * soldCount;

                    return (
                      <tr 
                        key={accessory.id}
                        className="hover:bg-slate-800/20 transition-colors group"
                      >
                        {/* Product details */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {accessory.image ? (
                              <img 
                                src={accessory.image} 
                                alt={accessory.name}
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 rounded-xl object-cover border border-slate-700 bg-slate-900 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 flex items-center justify-center shrink-0">
                                <Package className="w-5 h-5 text-indigo-400/70" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-medium text-slate-100 truncate max-w-[200px] lg:max-w-xs">
                                {accessory.name}
                              </div>
                              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                <span className="text-indigo-400/90">{getCategoryTranslation(accessory.category, t)}</span>
                                {accessory.location && (
                                  <>
                                    <span>•</span>
                                    <span className="text-slate-500 flex items-center gap-0.5">
                                      <MapPin className="w-3 h-3 text-slate-500" />
                                      {accessory.location}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Brand & Supplier */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-200">
                            {accessory.brand}
                          </div>
                          <div className="text-xs text-slate-400 truncate max-w-[160px] mt-0.5">
                            {accessory.company || '—'}
                          </div>
                        </td>

                        {showSold ? (
                          <>
                            {/* Sold Units & Remaining in stock */}
                            <td className="py-3 px-4 text-center">
                              <div className="inline-flex flex-col items-center gap-1">
                                <span className="px-3 py-1 rounded-full text-xs font-bold font-mono border bg-amber-500/15 text-amber-300 border-amber-500/30">
                                  {soldCount} {t('accessories.soldPill', 'Sold')}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  ({accessory.quantity} {t('accessories.inStock', 'in stock')})
                                </span>
                              </div>
                            </td>

                            {/* Unit Sell Price */}
                            <td className={cn("py-3 px-4 text-right rtl:text-left font-mono font-bold", getCurrencyColor(accessory.currency))}>
                              {accessory.currency === 'USD' 
                                ? `$${accessory.sellPrice.toFixed(2)}` 
                                : `${formatNumberWithCommas(accessory.sellPrice)} د.ع`}
                            </td>

                            {/* Realized Revenue & Profit */}
                            <td className="py-3 px-4 text-right rtl:text-left">
                              <div className="font-mono font-bold text-emerald-400">
                                {accessory.currency === 'USD' ? '$' : ''}
                                {formatNumberWithCommas(totalRealizedRevenue.toFixed(accessory.currency === 'USD' ? 2 : 0))}
                                {accessory.currency === 'IQD' ? ' د.ع' : ''}
                              </div>
                              {canViewCostAndProfit('inventory_accessories') ? (
                                <div className="text-[11px] font-mono text-cyan-400 mt-0.5">
                                  {t('accessories.profit', 'Profit')}: +{accessory.currency === 'USD' ? '$' : ''}
                                  {formatNumberWithCommas(totalRealizedProfit.toFixed(accessory.currency === 'USD' ? 2 : 0))}
                                  {accessory.currency === 'IQD' ? ' د.ع' : ''}
                                </div>
                              ) : (
                                <div className="mt-0.5">
                                  <CostProfitGuard module="inventory_accessories" inline />
                                </div>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            {/* Stock Level + Quick +/- Adjustment */}
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-2">
                                {hasPermission('inventory_accessories', 'edit') && (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdjustStock(accessory, -1)}
                                    disabled={accessory.quantity <= 0}
                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                                    title={t('accessories.decreaseUnit', 'Decrease 1 unit')}
                                  >
                                    <MinusCircle className="w-4 h-4" />
                                  </button>
                                )}

                                <div className={cn(
                                  "px-2.5 py-1 rounded-full text-xs font-semibold font-mono border min-w-[56px] text-center",
                                  isOut 
                                    ? "bg-rose-500/10 text-rose-400 border-rose-500/30" 
                                    : isLow 
                                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse" 
                                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                )}>
                                  {accessory.quantity}
                                </div>

                                {hasPermission('inventory_accessories', 'edit') && (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAdjustStock(accessory, 1)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                                    title={t('accessories.increaseUnit', 'Increase 1 unit')}
                                  >
                                    <PlusCircle className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              {isLow && (
                                <div className="text-[10px] text-amber-400/80 text-center mt-1 font-medium">
                                  {t('accessories.thresholdAt', { count: accessory.notifyThreshold, defaultValue: `Threshold: ≤${accessory.notifyThreshold}` })}
                                </div>
                              )}
                            </td>

                            {/* Buy Price */}
                            <td className="py-3 px-4 text-right rtl:text-left font-mono text-slate-300">
                              {canViewCostAndProfit('inventory_accessories') ? (
                                accessory.currency === 'USD' 
                                  ? `$${accessory.buyPrice.toFixed(2)}` 
                                  : `${formatNumberWithCommas(accessory.buyPrice)} د.ع`
                              ) : (
                                <CostProfitGuard module="inventory_accessories" inline />
                              )}
                            </td>

                            {/* Sell Price */}
                            <td className={cn("py-3 px-4 text-right rtl:text-left font-mono font-bold", getCurrencyColor(accessory.currency))}>
                              {accessory.currency === 'USD' 
                                ? `$${accessory.sellPrice.toFixed(2)}` 
                                : `${formatNumberWithCommas(accessory.sellPrice)} د.ع`}
                            </td>
                          </>
                        )}

                        {/* Actions */}
                        <td className="py-3 px-4 text-right rtl:text-left">
                          <div className="flex items-center justify-end rtl:justify-start gap-1.5">
                            {hasPermission('inventory_accessories', 'edit') && (
                              showSold ? (
                                <button
                                  type="button"
                                  onClick={() => setReturnTargetAccessory(accessory)}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                                  title={t('accessories.returnToStock', 'Return sold accessory units to stock')}
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>{t('accessories.returnToStock', 'Return to Stock')}</span>
                                </button>
                              ) : (
                                accessory.quantity > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setSoldTargetAccessory(accessory)}
                                    className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                                    title={t('accessories.markSold', 'Mark accessory as sold')}
                                  >
                                    <ShoppingBag className="w-4 h-4" />
                                  </button>
                                )
                              )
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                navigate('/barcodes', { state: { itemType: 'accessory', itemId: accessory.id } });
                              }}
                              className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors cursor-pointer"
                              title={t('accessories.printBarcode', 'Print Barcode Label')}
                            >
                              <BarcodeIcon className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setViewingAccessory(accessory)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title={t('accessories.viewDetails', 'View full specs & info')}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {hasPermission('inventory_accessories', 'edit') && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(accessory)}
                                className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                                title={t('accessories.edit', 'Edit accessory')}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                            {hasPermission('inventory_accessories', 'delete') && (
                              <button
                                type="button"
                                onClick={() => setAccessoryToDelete(accessory)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                title={t('accessories.delete', 'Delete accessory')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination & Status Footer */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredAccessories?.length || 0}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          itemLabel={showSold ? t('common.soldAccessories', 'sold accessories') : t('common.accessories', 'accessories')}
        />
      </div>

      {/* Metric Cards Banner (Bottom Summary) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pt-1">
        {showSold ? (
          <>
            {/* Card 1: Total Sold Units */}
            <div className="p-4 rounded-2xl bg-[#121727] border border-slate-800/80 shadow-md flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {t('accessories.totalUnitsSold', 'Total Units Sold')}
                </div>
                <div className="text-xl font-bold text-white mt-0.5">
                  {formatNumberWithCommas(stats.totalSoldUnits)} {t('accessories.units', 'units')}
                </div>
              </div>
            </div>

            {/* Card 2: Sold Products Count */}
            <div className="p-4 rounded-2xl bg-[#121727] border border-slate-800/80 shadow-md flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {t('accessories.soldProductSkus', 'Sold Product SKUs')}
                </div>
                <div className="text-xl font-bold text-white mt-0.5">
                  {stats.soldItemsCount} {t('accessories.items', 'items')}
                </div>
              </div>
            </div>

            {/* Card 3: Realized Revenue */}
            <div className="p-4 rounded-2xl bg-[#121727] border border-slate-800/80 shadow-md flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {t('accessories.totalRealizedRevenue', 'Total Realized Revenue')}
                </div>
                <div className="text-xl font-bold text-emerald-400 mt-0.5">
                  ${formatNumberWithCommas(stats.totalSoldRevenueUsd.toFixed(2))}
                  {stats.totalSoldRevenueIqd > 0 && (
                    <span className="text-xs text-slate-400 ml-2 rtl:ml-0 rtl:mr-2 font-normal">
                      + {formatNumberWithCommas(stats.totalSoldRevenueIqd)} د.ع
                    </span>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Card 1: Total In-Stock Units */}
            <div className="p-4 rounded-2xl bg-[#121727] border border-slate-800/80 shadow-md flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {t('accessories.totalInStockUnits', 'Total In-Stock Units')}
                </div>
                <div className="text-xl font-bold text-white mt-0.5">
                  {formatNumberWithCommas(stats.totalUnits)}
                </div>
              </div>
            </div>

            {/* Card 2: Low Stock Alerts */}
            <div className="p-4 rounded-2xl bg-[#121727] border border-slate-800/80 shadow-md flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-xl border",
                stats.lowStockAlertCount > 0 
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-400" 
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              )}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {t('accessories.lowStockAlerts', 'Low Stock Alerts')}
                </div>
                <div className="text-xl font-bold text-white mt-0.5 flex items-center gap-2">
                  <span>{stats.lowStockAlertCount}</span>
                  {stats.outOfStockCount > 0 && (
                    <span className="text-xs font-normal text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                      {stats.outOfStockCount} {t('accessories.outOfStock', 'Out of Stock')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Card 3: Total Stock Valuation */}
            <div className="p-4 rounded-2xl bg-[#121727] border border-slate-800/80 shadow-md flex items-center gap-4">
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {t('accessories.stockValuation', 'Stock Valuation (Cost)')}
                </div>
                <div className="text-xl font-bold text-white mt-0.5">
                  ${formatNumberWithCommas(stats.totalCostUsd.toFixed(2))}
                  {stats.totalCostIqd > 0 && (
                    <span className="text-xs text-slate-400 ml-2 rtl:ml-0 rtl:mr-2 font-normal">
                      + {formatNumberWithCommas(stats.totalCostIqd)} د.ع
                    </span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Accessory Drawer */}
      <AddAccessoryDrawer
        isOpen={isAddDrawerOpen}
        onClose={() => {
          setIsAddDrawerOpen(false);
          setEditingAccessory(null);
        }}
        initialData={editingAccessory}
        onSave={handleSaveAccessory}
        existingAccessories={accessories}
      />

      {/* Accessory Details Modal */}
      <AccessoryDetailsModal
        isOpen={!!viewingAccessory}
        onClose={() => setViewingAccessory(null)}
        accessory={viewingAccessory}
        onQuickAdjustStock={handleQuickAdjustStock}
        onOpenPrintLabel={() => {
          navigate('/barcodes', { state: { itemType: 'accessory', itemId: viewingAccessory?.id } });
        }}
        onReportDefect={(acc) => {
          setDefectiveAccessoryForReturn(acc);
          setIsReturnModalOpen(true);
        }}
        onMarkAsSold={(acc) => setSoldTargetAccessory(acc)}
        onReturnSoldUnits={(acc) => setReturnTargetAccessory(acc)}
      />

      {/* Mark Accessory Sold Modal */}
      <MarkAccessorySoldModal
        isOpen={!!soldTargetAccessory}
        accessory={soldTargetAccessory}
        onClose={() => setSoldTargetAccessory(null)}
        onConfirmSold={handleConfirmSoldAccessory}
      />

      {/* Return Accessory Modal */}
      <ReturnAccessoryModal
        isOpen={!!returnTargetAccessory}
        accessory={returnTargetAccessory}
        onClose={() => setReturnTargetAccessory(null)}
        onConfirmReturn={handleConfirmReturnAccessory}
      />

      {/* Log Defective Return (RMA) Modal */}
      <CreateSupplierReturnModal
        isOpen={isReturnModalOpen}
        onClose={() => {
          setIsReturnModalOpen(false);
          setDefectiveAccessoryForReturn(null);
        }}
        suppliers={suppliers}
        initialItemType="accessory"
        initialAccessory={defectiveAccessoryForReturn || undefined}
        onSuccess={(saved) => {
          success(`RMA #${saved.rmaNumber} created for defective item`);
          navigate('/suppliers');
        }}
      />

      {/* Delete Confirmation Modal */}
      {accessoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#141b2d] border border-slate-700/80 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{t('accessories.deleteAccessory', 'Delete Accessory')}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{t('accessories.deleteCannotUndo', 'This action cannot be undone.')}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
              {t('accessories.deleteConfirmPrompt', { name: accessoryToDelete.name, brand: accessoryToDelete.brand, defaultValue: `Are you sure you want to permanently remove "${accessoryToDelete.name}" (${accessoryToDelete.brand}) from inventory?` })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAccessoryToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                {t('accessories.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAccessory(accessoryToDelete.id)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('accessories.confirmDelete', 'Confirm Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Scanner for Search */}
      <CameraScannerModal
        isOpen={isScanning}
        onClose={() => setIsScanning(false)}
        onScan={(code) => {
          setSearchTerm(code.trim());
          setIsScanning(false);
          sound.playSuccess();
        }}
        title={t('accessories.scanBarcode', 'Scan Accessory Barcode')}
        subtitle={t('accessories.scanBarcodeSubtitle', 'Scan barcode to filter accessories')}
      />
    </div>
  );
}
