import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Layers, 
  Smartphone, 
  CheckCircle2, 
  MapPin, 
  Filter, 
  Download, 
  Upload, 
  RefreshCw, 
  Sparkles, 
  ShieldCheck, 
  X,
  SlidersHorizontal,
  Info,
  Database,
  Package
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { screenProtectorService } from '../lib/screenProtectorService';
import { ScreenProtectorGroup, ScreenProtectorSearchResult, NotchType } from '../types/screenProtector';
import { Accessory } from '../types/accessory';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { idb } from '../lib/idbService';
import ScreenProtectorCard, { getNotchLabel } from '../components/screenProtector/ScreenProtectorCard';
import ScreenProtectorGroupModal from '../components/screenProtector/ScreenProtectorGroupModal';
import ScreenProtectorLabelModal from '../components/screenProtector/ScreenProtectorLabelModal';
import ScreenProtectorQuickStockModal from '../components/screenProtector/ScreenProtectorQuickStockModal';
import { CloudStatusBadge } from '../components/common/CloudStatusBadge';
import MigrationModal from '../components/common/MigrationModal';
import { sound } from '../lib/sound';
import { useToast } from '../components/common/Toast';
import { SearchInput } from '../components/common/SearchInput';
import { useNavigate } from 'react-router';

const POPULAR_BRANDS = [
  'All',
  'Apple',
  'Samsung',
  'Xiaomi',
  'Poco',
  'Realme',
  'Oppo',
  'Infinix',
  'Tecno',
  'Honor',
  'Huawei',
  'Google Pixel',
  'OnePlus',
  'Vivo'
];

const NOTCH_FILTER_OPTIONS: { id: string }[] = [
  { id: 'all' },
  { id: 'waterdrop' },
  { id: 'punch_hole_center' },
  { id: 'punch_hole_left' },
  { id: 'dynamic_island' },
  { id: 'wide_notch' },
  { id: 'curved_edge' }
];

export default function ScreenProtectors() {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';
  const { success, error: toastError, info } = useToast();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedNotch, setSelectedNotch] = useState('all');
  const [inStockOnly, setInStockOnly] = useState(false);

  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [isLoadingAccessories, setIsLoadingAccessories] = useState(true);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);

  // Modals state
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isQuickStockModalOpen, setIsQuickStockModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ScreenProtectorGroup | null>(null);
  const [labelGroup, setLabelGroup] = useState<ScreenProtectorGroup | null>(null);

  // Subscribe to screen protector changes and sync on mount
  const [, setTrigger] = useState(0);
  useEffect(() => {
    const unsub = screenProtectorService.subscribe(() => {
      setTrigger(prev => prev + 1);
    });
    // Immediately pull latest from cloud
    screenProtectorService.syncWithCloud();
    return unsub;
  }, []);

  const fetchAccessories = async () => {
    if (!isSupabaseConfigured()) {
      setIsLoadingAccessories(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('nali_accessories')
        .select('id, name, brand, category, subCategory, quantity, sellPrice, currency, barcode, supplier, createdAt, updatedAt');
      if (!error && data) {
        setAccessories(data as unknown as Accessory[]);
        await idb.bulkPut('accessories', data);
      }
    } catch (e) {
      console.warn('Accessories fetch error in screen protector finder:', e);
    } finally {
      setIsLoadingAccessories(false);
    }
  };

  // Fetch shop inventory accessories to compute live stock
  useEffect(() => {
    // Load from local IDB cache first
    const loadFromLocalIDB = async () => {
      try {
        const cached = await idb.getAll<Accessory>('accessories');
        if (Array.isArray(cached) && cached.length > 0) {
          setAccessories(cached);
          setIsLoadingAccessories(false);
        }
      } catch (e) {}
    };
    loadFromLocalIDB();

    fetchAccessories();

    if (!isSupabaseConfigured()) return;

    // Granular Real-time listener for accessory inventory changes (settings are owned by screenProtectorService)
    const channel = supabase
      .channel('public:screen_protectors_accessories_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nali_accessories' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          const newAcc = payload.new as Accessory;
          setAccessories(prev => prev.some(a => a.id === newAcc.id) ? prev : [newAcc, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          const updatedAcc = payload.new as Accessory;
          setAccessories(prev => prev.map(a => a.id === updatedAcc.id ? { ...a, ...updatedAcc } : a));
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old?.id;
          if (deletedId) {
            setAccessories(prev => prev.filter(a => a.id !== deletedId));
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Search Results
  const searchResults: ScreenProtectorSearchResult[] = useMemo(() => {
    return screenProtectorService.searchCompatibilities(
      searchQuery,
      accessories,
      {
        brand: selectedBrand === 'All' ? undefined : selectedBrand,
        notchType: selectedNotch === 'all' ? undefined : selectedNotch,
        inStockOnly
      }
    );
  }, [searchQuery, selectedBrand, selectedNotch, inStockOnly, accessories]);

  // Total metrics
  const totalGroups = (screenProtectorService.getAllGroups() || []).length;
  const totalUniqueModels = useMemo(() => {
    const set = new Set<string>();
    const groups = screenProtectorService.getAllGroups() || [];
    groups.forEach(g => {
      if (g && Array.isArray(g.models)) {
        g.models.forEach(m => {
          if (m && m.brand && m.model) {
            set.add(`${m.brand} ${m.model}`.toLowerCase());
          }
        });
      }
    });
    return set.size;
  }, []);

  const totalInStockGroups = useMemo(() => {
    return (searchResults || []).filter(r => (r?.inStockCount || 0) > 0).length;
  }, [searchResults]);

  // Handlers
  const handleSaveGroup = async (groupData: Partial<ScreenProtectorGroup>) => {
    try {
      if (editingGroup) {
        await screenProtectorService.updateGroup(editingGroup.id, groupData);
        success(t('screenProtectorsPage.groupUpdated', { code: groupData.dieCode || '' }));
      } else {
        await screenProtectorService.addGroup(groupData as any);
        success(t('screenProtectorsPage.groupCreated', { code: groupData.dieCode || '' }));
      }
    } catch (e) {
      toastError(t('common.error'));
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await screenProtectorService.deleteGroup(groupId);
      success(t('screenProtectorsPage.groupDeleted'));
    } catch (e) {
      toastError(t('common.error'));
    }
  };

  const handleExportJSON = () => {
    sound.playClick();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(screenProtectorService.exportJSON());
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `nali_screen_protectors_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    success(t('screenProtectorsPage.exportSuccess'));
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const res = await screenProtectorService.importJSON(content);
        if (res.success) {
          success(t('screenProtectorsPage.importSuccess', { count: res.count }));
        } else {
          toastError(res.error || t('screenProtectorsPage.importError'));
        }
      } catch (err) {
        toastError(t('screenProtectorsPage.readFileError'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetDefaults = async () => {
    if (confirm(t('screenProtectorsPage.resetConfirm'))) {
      sound.playClick();
      await screenProtectorService.resetToDefaultDatabase();
      success(t('screenProtectorsPage.resetSuccess'));
    }
  };

  const handleAddToCart = (item: ScreenProtectorSearchResult['inventoryItems'][0]) => {
    sound.playClick();
    success(t('screenProtectorsPage.addedToPos', { name: item.name }));
    navigate('/pos');
  };

  const handleQuickStockSave = async (accessoryData: Omit<Accessory, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newId = crypto.randomUUID();
      const newAccessory: Accessory = {
        ...accessoryData,
        id: newId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Optimistic update locally
      setAccessories(prev => {
        const next = [newAccessory, ...prev];
        localStorage.setItem('nali_accessories_cache', JSON.stringify(next));
        return next;
      });
      try { await idb.put('accessories', newAccessory); } catch (e) {}

      success(t('accessories.toastAdded', { name: newAccessory.name, defaultValue: `Added stock for "${newAccessory.compatibility?.[0] || 'model'}"` }));

      // Sync to cloud
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('nali_accessories').insert(newAccessory).select().single();
        if (error && error.code !== 'PGRST205') {
          console.error('Insert quick stock failed', error);
          toastError(t('common.error'));
        }
      }
    } catch (err) {
      toastError(t('common.error'));
    }
  };

  return (
    <div 
      dir={isKu ? 'rtl' : 'ltr'} 
      className={`p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200 ${isKu ? 'font-sans' : ''}`}
    >
      
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-[#12182c] via-[#0f1424] to-[#0a0d18] p-5 md:p-6 rounded-3xl border border-indigo-500/20 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-inner shrink-0">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                {t('screenProtectorsPage.title')}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {t('screenProtectorsPage.badge')}
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {t('screenProtectorsPage.subtitle')}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2 relative z-10">
          <CloudStatusBadge
            onRefresh={async () => {
              setIsLoadingAccessories(true);
              await Promise.all([
                screenProtectorService.syncWithCloud(),
                fetchAccessories()
              ]);
              setIsLoadingAccessories(false);
            }}
            tableName="settings"
            isRefreshing={isLoadingAccessories}
          />

          <button
            onClick={() => {
              sound.playClick();
              setIsMigrationModalOpen(true);
            }}
            className="p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-cyan-400 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            title="Database Schema & SQL Migration"
          >
            <Database className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setIsQuickStockModalOpen(true);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
          >
            <Package className="w-4 h-4" />
            <span>{t('screenProtectorsPage.quickRegisterStock', { defaultValue: 'Register Stock' })}</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setEditingGroup(null);
              setIsGroupModalOpen(true);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('screenProtectorsPage.addGroup')}</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            title={t('screenProtectorsPage.exportJSON')}
          >
            <Download className="w-4 h-4" />
          </button>

          <label 
            className="p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            title={t('screenProtectorsPage.importJSON')}
          >
            <Upload className="w-4 h-4" />
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImportJSON} 
              className="hidden" 
            />
          </label>

          <button
            onClick={handleResetDefaults}
            className="p-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
            title={t('screenProtectorsPage.resetFactory')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white font-mono">{totalGroups}</div>
            <div className="text-xs text-slate-400 font-medium">{t('screenProtectorsPage.stats.glassGroups')}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white font-mono">{totalUniqueModels}</div>
            <div className="text-xs text-slate-400 font-medium">{t('screenProtectorsPage.stats.supportedModels')}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-400 font-mono">{totalInStockGroups}</div>
            <div className="text-xs text-slate-400 font-medium">{t('screenProtectorsPage.stats.inStockMatches')}</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-white font-mono">{t('screenProtectorsPage.stats.precisionValue')}</div>
            <div className="text-xs text-slate-400 font-medium">{t('screenProtectorsPage.stats.precisionDieCut')}</div>
          </div>
        </div>
      </div>

      {/* Smart Search & Filter Center */}
      <div className="p-5 rounded-3xl bg-[#0e1322] border border-slate-800 space-y-4 shadow-xl">
        
        {/* Universal Search Input */}
        <div>
          <SearchInput
            value={searchQuery}
            onChangeValue={(val) => {
              setSearchQuery(val);
            }}
            placeholder={t('screenProtectorsPage.search.placeholder')}
            size="lg"
            autoFocus
          />
        </div>

        {/* Brand Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1 shrink-0">
            {t('screenProtectorsPage.search.brand')}
          </span>
          {POPULAR_BRANDS.map(brand => {
            const isSelected = selectedBrand === brand;
            const label = brand === 'All' ? t('screenProtectorsPage.search.allBrands') : brand;
            return (
              <button
                key={brand}
                type="button"
                onClick={() => {
                  sound.playClick();
                  setSelectedBrand(brand);
                }}
                className={`px-3 py-1.5 rounded-xl font-semibold shrink-0 transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Secondary Filter Row */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-slate-800/80 text-xs">
          {/* Notch Select */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">{t('screenProtectorsPage.search.cutout')}</span>
            <select
              value={selectedNotch}
              onChange={e => {
                sound.playClick();
                setSelectedNotch(e.target.value);
              }}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {NOTCH_FILTER_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {t(`screenProtectorsPage.notches.${opt.id}`)}
                </option>
              ))}
            </select>
          </div>

          {/* In Stock Only Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={e => {
                sound.playClick();
                setInStockOnly(e.target.checked);
              }}
              className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
            />
            <span className="text-slate-300 font-semibold">
              {t('screenProtectorsPage.search.inStockOnly')}
            </span>
          </label>
        </div>
      </div>

      {/* Results Count Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div>
          {t('screenProtectorsPage.search.showing')} <span className="text-white font-bold">{(searchResults?.length || 0)}</span> {t('screenProtectorsPage.search.compatibilityGroups')}
          {searchQuery && <span> {t('screenProtectorsPage.search.matching')} &ldquo;<span className="text-indigo-400 font-medium">{searchQuery}</span>&rdquo;</span>}
        </div>
        {inStockOnly && (
          <span className="text-emerald-400 font-semibold">
            {t('screenProtectorsPage.search.filteredInStock')}
          </span>
        )}
      </div>

      {/* Cards Grid */}
      {(searchResults?.length || 0) === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto">
            <Smartphone className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">{t('screenProtectorsPage.empty.title')}</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {t('screenProtectorsPage.empty.description', { query: searchQuery || '' })}
          </p>
          <button
            onClick={() => {
              sound.playClick();
              setSearchQuery('');
              setSelectedBrand('All');
              setSelectedNotch('all');
              setInStockOnly(false);
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
          >
            {t('screenProtectorsPage.empty.clearFilters')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {searchResults.map(result => (
            <ScreenProtectorCard
              key={result.group.id}
              searchResult={result}
              highlightQuery={searchQuery}
              onEdit={grp => {
                setEditingGroup(grp);
                setIsGroupModalOpen(true);
              }}
              onPrintLabel={grp => {
                setLabelGroup(grp);
              }}
              onAddToCart={handleAddToCart}
              onAddModel={grp => {
                setEditingGroup(grp);
                setIsGroupModalOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Group Create/Edit Modal */}
      <ScreenProtectorGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onSave={handleSaveGroup}
        group={editingGroup}
        accessories={accessories}
        onDelete={handleDeleteGroup}
      />

      {/* Printable Label Modal */}
      <ScreenProtectorLabelModal
        isOpen={!!labelGroup}
        onClose={() => setLabelGroup(null)}
        group={labelGroup}
      />

      {/* SQL Migration Modal */}
      <MigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
      />

      <ScreenProtectorQuickStockModal
        isOpen={isQuickStockModalOpen}
        onClose={() => setIsQuickStockModalOpen(false)}
        onSave={handleQuickStockSave}
        existingAccessories={accessories}
      />
    </div>
  );
}

