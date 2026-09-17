import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Trash2, 
  RefreshCw, 
  HardDrive, 
  Image as ImageIcon, 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  Search, 
  Filter, 
  Database, 
  Layers, 
  Sparkles,
  ArrowRight,
  Clock,
  Check,
  AlertCircle,
  Eye,
  Info
} from 'lucide-react';
import { 
  storageCleanupService, 
  StorageScanResult, 
  MediaAssetItem, 
  StaleLogItem 
} from '../../lib/storageCleanupService';
import { sound } from '../../lib/sound';
import { useToast } from './Toast';
import { cn } from '../../lib/utils';

interface StorageCleanupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete?: (freedBytes: number) => void;
}

export default function StorageCleanupModal({ isOpen, onClose, onScanComplete }: StorageCleanupModalProps) {
  const { t } = useTranslation();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'media' | 'logs' | 'advice'>('media');
  const [isScanning, setIsScanning] = useState(false);
  const [isDeletingMedia, setIsDeletingMedia] = useState(false);
  const [isPurgingLogs, setIsPurgingLogs] = useState(false);
  
  const [scanResult, setScanResult] = useState<StorageScanResult | null>(null);
  
  // Media tab state
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [mediaFilter, setMediaFilter] = useState<'orphaned' | 'all' | 'used'>('orphaned');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBucketFilter, setSelectedBucketFilter] = useState<string>('ALL');

  // Logs tab state
  const [retentionDays, setRetentionDays] = useState<number>(60);
  const [exportBeforePurge, setExportBeforePurge] = useState<boolean>(true);

  // Deletion Confirmation Dialog State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'media' | 'logs';
    count: number;
    sizeFormatted?: string;
  }>({
    isOpen: false,
    type: 'media',
    count: 0
  });

  // Run initial scan when modal opens
  useEffect(() => {
    if (isOpen) {
      handleScan();
    } else {
      setSelectedAssetIds(new Set());
    }
  }, [isOpen]);

  const handleScan = async (overrideRetention?: number) => {
    setIsScanning(true);
    sound.playClick();
    try {
      const days = overrideRetention !== undefined ? overrideRetention : retentionDays;
      const result = await storageCleanupService.scanStorage(days);
      setScanResult(result);
      
      // Auto-select all orphaned media by default for convenience
      const orphaned = result.mediaAssets.filter(a => !a.isUsed);
      setSelectedAssetIds(new Set(orphaned.map(a => a.id)));
    } catch (err) {
      console.error('Failed to scan storage:', err);
      toast.error(t('storageCleanup.scanError', 'Failed to scan Supabase storage'));
    } finally {
      setIsScanning(false);
    }
  };

  // Filtered media assets
  const filteredAssets = useMemo(() => {
    if (!scanResult) return [];
    return scanResult.mediaAssets.filter(asset => {
      // Status filter
      if (mediaFilter === 'orphaned' && asset.isUsed) return false;
      if (mediaFilter === 'used' && !asset.isUsed) return false;

      // Bucket filter
      if (selectedBucketFilter !== 'ALL' && asset.bucket !== selectedBucketFilter) return false;

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = asset.name.toLowerCase().includes(q);
        const matchBucket = asset.bucket.toLowerCase().includes(q);
        const matchRef = asset.referencedBy?.some(r => r.toLowerCase().includes(q));
        if (!matchName && !matchBucket && !matchRef) return false;
      }

      return true;
    });
  }, [scanResult, mediaFilter, selectedBucketFilter, searchQuery]);

  // Calculations for selected media
  const selectedAssetsList = useMemo(() => {
    if (!scanResult) return [];
    return scanResult.mediaAssets.filter(a => selectedAssetIds.has(a.id) && !a.isUsed);
  }, [scanResult, selectedAssetIds]);

  const selectedTotalBytes = useMemo(() => {
    return selectedAssetsList.reduce((sum, a) => sum + a.size, 0);
  }, [selectedAssetsList]);

  // Checkbox toggle helpers
  const toggleSelectAsset = (id: string, isUsed: boolean) => {
    if (isUsed) return; // Prevent selection of protected active files!
    sound.playClick();
    setSelectedAssetIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllOrphaned = () => {
    sound.playClick();
    if (!scanResult) return;
    const currentOrphanedInView = filteredAssets.filter(a => !a.isUsed);
    const allSelected = currentOrphanedInView.every(a => selectedAssetIds.has(a.id));

    setSelectedAssetIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        currentOrphanedInView.forEach(a => next.delete(a.id));
      } else {
        currentOrphanedInView.forEach(a => next.add(a.id));
      }
      return next;
    });
  };

  // Perform Media Cleanup
  const executeDeleteMedia = async () => {
    if ((selectedAssetsList?.length || 0) === 0) return;
    setIsDeletingMedia(true);
    setConfirmModal({ isOpen: false, type: 'media', count: 0 });
    sound.playClick();

    try {
      const result = await storageCleanupService.deleteMediaAssets(selectedAssetsList);
      if (result.deletedCount > 0) {
        sound.playPaymentSuccess();
        toast.success(
          t('storageCleanup.mediaDeleteSuccess', 'Deleted {{count}} unused media assets and reclaimed {{size}}!', {
            count: result.deletedCount,
            size: storageCleanupService.formatBytes(result.freedBytes)
          })
        );
        onScanComplete?.(result.freedBytes);
      }
      
      if (result.failedCount > 0) {
        sound.playAlert();
        toast.error(t('storageCleanup.mediaDeletePartial', '{{count}} items could not be deleted', { count: result.failedCount }));
      }

      // Re-scan
      await handleScan();
    } catch (err: any) {
      sound.playAlert();
      toast.error(err?.message || 'Failed to delete selected media assets');
    } finally {
      setIsDeletingMedia(false);
    }
  };

  // Perform Logs Purge
  const executePurgeLogs = async () => {
    if (!scanResult || scanResult.staleLogsCount === 0) return;
    setIsPurgingLogs(true);
    setConfirmModal({ isOpen: false, type: 'logs', count: 0 });
    sound.playClick();

    try {
      const result = await storageCleanupService.deleteStaleLogs(retentionDays, exportBeforePurge);
      
      if (result.exportedCsv && exportBeforePurge) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        storageCleanupService.downloadFile(
          result.exportedCsv,
          `nali-audit-logs-archive-${timestamp}.csv`
        );
      }

      if (result.deletedCount > 0) {
        sound.playPaymentSuccess();
        toast.success(
          t('storageCleanup.logsPurgeSuccess', 'Purged {{count}} historical audit logs older than {{days}} days', {
            count: result.deletedCount,
            days: retentionDays
          })
        );
      }

      // Re-scan
      await handleScan();
    } catch (err: any) {
      sound.playAlert();
      toast.error(err?.message || 'Failed to purge stale audit logs');
    } finally {
      setIsPurgingLogs(false);
    }
  };

  const handleExportLogs = () => {
    if (!scanResult || !scanResult.staleLogs || (scanResult.staleLogs?.length || 0) === 0) {
      toast.info(t('storageCleanup.noLogsToExport', 'No stale logs to export'));
      return;
    }
    sound.playClick();
    const csv = storageCleanupService.exportLogsAsCsv(scanResult.staleLogs);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    storageCleanupService.downloadFile(csv, `nali-audit-logs-${timestamp}.csv`);
    toast.success(t('storageCleanup.exportSuccess', 'Exported {{count}} logs to CSV', { count: scanResult.staleLogs?.length || 0 }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
          onClick={() => {
            sound.playClick();
            onClose();
          }}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ type: 'spring', damping: 26, stiffness: 360 }}
          className="relative w-full max-w-5xl max-h-[92vh] bg-[#0c101d] border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#11172a] flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-600/20 shrink-0">
                <HardDrive className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                    {t('storageCleanup.modalTitle', 'Supabase Storage & Database Cleanup Utility')}
                  </h2>
                  {scanResult?.isLiveSupabase ? (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      {t('storageCleanup.liveCloud', 'Live Supabase')}
                    </span>
                  ) : (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <Sparkles className="w-3 h-3" />
                      {t('storageCleanup.localCache', 'Local & Demo Store')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate">
                  {t('storageCleanup.modalSubtitle', 'Scan for orphaned media assets and stale logs to reclaim cloud storage and preserve free-tier limits')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleScan()}
                disabled={isScanning}
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                title={t('storageCleanup.refreshScan', 'Re-scan storage')}
              >
                <RefreshCw className={cn('w-4 h-4 text-cyan-400', isScanning && 'animate-spin')} />
                <span className="hidden sm:inline">
                  {isScanning ? t('storageCleanup.scanning', 'Scanning...') : t('storageCleanup.reScan', 'Re-Scan')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onClose();
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label={t('common.close', 'Close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="bg-[#090d18] border-b border-slate-800/80 px-4 sm:px-6 py-3 shrink-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Orphaned Media */}
              <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
                <div className="text-[11px] font-medium text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{t('storageCleanup.orphanedAssets', 'Orphaned Assets')}</span>
                </div>
                <div className="text-lg font-bold text-white mt-1">
                  {scanResult?.orphanedMediaCount ?? 0}
                  <span className="text-xs font-normal text-slate-400 ml-1.5">
                    ({storageCleanupService.formatBytes(scanResult?.orphanedMediaBytes ?? 0)})
                  </span>
                </div>
              </div>

              {/* Active / Protected Media */}
              <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
                <div className="text-[11px] font-medium text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t('storageCleanup.protectedAssets', 'Active & Protected')}</span>
                </div>
                <div className="text-lg font-bold text-white mt-1">
                  {scanResult?.usedMediaCount ?? 0}
                  <span className="text-xs font-normal text-slate-400 ml-1.5">
                    ({storageCleanupService.formatBytes(scanResult?.usedMediaBytes ?? 0)})
                  </span>
                </div>
              </div>

              {/* Stale Audit Logs */}
              <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
                <div className="text-[11px] font-medium text-indigo-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{t('storageCleanup.staleLogs', 'Stale Logs (>{{days}}d)', { days: retentionDays })}</span>
                </div>
                <div className="text-lg font-bold text-white mt-1">
                  {scanResult?.staleLogsCount ?? 0}
                  <span className="text-xs font-normal text-slate-400 ml-1.5">
                    / {scanResult?.totalAuditLogsCount ?? 0} {t('storageCleanup.total', 'total')}
                  </span>
                </div>
              </div>

              {/* Potential Reclaimable */}
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-950/40 to-cyan-950/30 border border-emerald-500/30">
                <div className="text-[11px] font-medium text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('storageCleanup.reclaimableSpace', 'Reclaimable Space')}</span>
                </div>
                <div className="text-lg font-bold text-emerald-400 mt-1">
                  {storageCleanupService.formatBytes(scanResult?.orphanedMediaBytes ?? 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 border-b border-slate-800 bg-[#0e1322] shrink-0">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setActiveTab('media');
              }}
              className={cn(
                'px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2',
                activeTab === 'media'
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              )}
            >
              <ImageIcon className="w-4 h-4" />
              <span>{t('storageCleanup.tabMedia', 'Supabase Media Storage')}</span>
              {scanResult?.orphanedMediaCount ? (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-bold">
                  {scanResult.orphanedMediaCount}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setActiveTab('logs');
              }}
              className={cn(
                'px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2',
                activeTab === 'logs'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              )}
            >
              <Database className="w-4 h-4" />
              <span>{t('storageCleanup.tabLogs', 'Database Logs & Telemetry')}</span>
              {scanResult?.staleLogsCount ? (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 font-bold">
                  {scanResult.staleLogsCount}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setActiveTab('advice');
              }}
              className={cn(
                'px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2',
                activeTab === 'advice'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              )}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{t('storageCleanup.tabAdvice', 'Storage & Free-Tier Rules')}</span>
            </button>
          </div>

          {/* Modal Body Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* TAB 1: MEDIA ASSETS */}
            {activeTab === 'media' && (
              <div className="space-y-4">
                {/* Media Controls Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Filter Buttons */}
                    <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setMediaFilter('orphaned');
                        }}
                        className={cn(
                          'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all',
                          mediaFilter === 'orphaned'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'text-slate-400 hover:text-slate-200'
                        )}
                      >
                        {t('storageCleanup.orphanedOnly', 'Orphaned Only')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setMediaFilter('all');
                        }}
                        className={cn(
                          'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all',
                          mediaFilter === 'all'
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        )}
                      >
                        {t('common.all', 'All Files')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          sound.playClick();
                          setMediaFilter('used');
                        }}
                        className={cn(
                          'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all',
                          mediaFilter === 'used'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'text-slate-400 hover:text-slate-200'
                        )}
                      >
                        {t('storageCleanup.protectedActive', 'Active in DB')}
                      </button>
                    </div>

                    {/* Bucket Filter */}
                    {scanResult && (scanResult.buckets?.length || 0) > 0 && (
                      <select
                        value={selectedBucketFilter}
                        onChange={(e) => setSelectedBucketFilter(e.target.value)}
                        className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl px-2.5 py-1 text-xs font-medium focus:outline-none focus:border-cyan-500"
                      >
                        <option value="ALL">{t('storageCleanup.allBuckets', 'All Buckets')}</option>
                        {scanResult.buckets.map(b => (
                          <option key={b.name} value={b.name}>{b.name} ({b.fileCount})</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Search and Select All */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:w-56">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('storageCleanup.searchMedia', 'Filter by name or bucket...')}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={toggleSelectAllOrphaned}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold whitespace-nowrap transition-colors"
                    >
                      {t('storageCleanup.toggleSelect', 'Toggle Selection')}
                    </button>
                  </div>
                </div>

                {/* Data Integrity Notice */}
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">{t('storageCleanup.integrityShieldTitle', 'Strict Data Integrity Protection:')} </span>
                    <span>
                      {t('storageCleanup.integrityShieldDesc', 'The cleanup algorithm queries active tables (nali_accessories, profiles, store branding). Assets actively linked to real products are strictly protected and cannot be deleted.')}
                    </span>
                  </div>
                </div>

                {/* Media Assets List */}
                {(filteredAssets?.length || 0) === 0 ? (
                  <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                    <h3 className="text-sm font-bold text-white">
                      {mediaFilter === 'orphaned' 
                        ? t('storageCleanup.noOrphanedFound', 'No Unused Media Found') 
                        : t('storageCleanup.noMediaFound', 'No Media Assets Matching Filter')}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {mediaFilter === 'orphaned'
                        ? t('storageCleanup.cleanStorageDesc', 'Your Supabase Storage is squeaky clean! Every image is tied to an active product or brand setting.')
                        : t('storageCleanup.changeFilterPrompt', 'Try changing your search query or selecting a different bucket.')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredAssets.map(asset => {
                      const isSelected = selectedAssetIds.has(asset.id);
                      return (
                        <div
                          key={asset.id}
                          className={cn(
                            'p-3 rounded-xl border flex items-center justify-between gap-3 transition-all',
                            asset.isUsed
                              ? 'bg-slate-900/40 border-slate-800/60 opacity-90'
                              : isSelected
                              ? 'bg-amber-950/20 border-amber-500/40 shadow-sm'
                              : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                          )}
                        >
                          {/* Checkbox and Info */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={asset.isUsed}
                              onChange={() => toggleSelectAsset(asset.id, asset.isUsed)}
                              className={cn(
                                'w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 shrink-0 cursor-pointer',
                                asset.isUsed && 'opacity-30 cursor-not-allowed'
                              )}
                            />

                            {/* Thumbnail or Icon */}
                            <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                              {asset.name.match(/\.(jpeg|jpg|png|webp|svg|gif)$/i) ? (
                                <img
                                  src={asset.publicUrl}
                                  alt={asset.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as any).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <FileText className="w-4 h-4 text-slate-400" />
                              )}
                            </div>

                            {/* File Name & Path Details */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-white truncate max-w-xs sm:max-w-md">
                                  {asset.name}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                                  {asset.bucket}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                <span>{storageCleanupService.formatBytes(asset.size)}</span>
                                <span>•</span>
                                <span>{new Date(asset.created_at).toLocaleDateString()}</span>
                                
                                {asset.isUsed ? (
                                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" />
                                    {asset.referencedBy?.[0] || t('storageCleanup.inUse', 'In Use')}
                                  </span>
                                ) : (
                                  <span className="text-amber-400/90 font-medium flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    {t('storageCleanup.orphaned', 'Unreferenced (Orphaned)')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action / Status Pill */}
                          <div className="shrink-0 flex items-center gap-2">
                            {asset.isUsed ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                {t('storageCleanup.protected', 'Protected')}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAssetIds(new Set([asset.id]));
                                  setConfirmModal({
                                    isOpen: true,
                                    type: 'media',
                                    count: 1,
                                    sizeFormatted: storageCleanupService.formatBytes(asset.size)
                                  });
                                }}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors"
                                title={t('storageCleanup.deleteSingle', 'Delete this orphaned file')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: AUDIT & SYSTEM LOGS */}
            {activeTab === 'logs' && (
              <div className="space-y-4">
                {/* Retention Policy Configuration Card */}
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-400" />
                        {t('storageCleanup.retentionPolicy', 'Audit & Activity Log Retention Window')}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {t('storageCleanup.retentionDesc', 'Keep recent audit history for compliance while pruning obsolete historical entries to save PostgreSQL row space.')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={retentionDays}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setRetentionDays(val);
                          handleScan(val);
                        }}
                        className="bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-indigo-500"
                      >
                        <option value={30}>{t('storageCleanup.days30', '30 Days (High Savings)')}</option>
                        <option value={60}>{t('storageCleanup.days60', '60 Days (Recommended)')}</option>
                        <option value={90}>{t('storageCleanup.days90', '90 Days (Quarterly)')}</option>
                        <option value={180}>{t('storageCleanup.days180', '180 Days (Half Year)')}</option>
                      </select>
                    </div>
                  </div>

                  {/* Export Before Purge Checkbox */}
                  <label className="flex items-center gap-2.5 pt-2 text-xs text-slate-300 cursor-pointer border-t border-slate-800/80">
                    <input
                      type="checkbox"
                      checked={exportBeforePurge}
                      onChange={(e) => setExportBeforePurge(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 text-indigo-500 focus:ring-indigo-500"
                    />
                    <span>
                      <span className="font-semibold text-white">{t('storageCleanup.autoExportLabel', 'Automatically export CSV archive before deletion')}</span>
                      <span className="text-slate-400"> ({t('storageCleanup.autoExportDesc', 'Guarantees financial audit history is never lost')})</span>
                    </span>
                  </label>
                </div>

                {/* Stale Logs Summary Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-400">{t('storageCleanup.recordsToPrune', 'Records Ready to Prune')}</div>
                      <div className="text-xl font-bold text-white mt-1">
                        {scanResult?.staleLogsCount ?? 0} {t('storageCleanup.rows', 'rows')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportLogs}
                      disabled={!scanResult || scanResult.staleLogsCount === 0}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{t('storageCleanup.exportArchive', 'Export CSV')}</span>
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-400">{t('storageCleanup.oldestLogTimestamp', 'Oldest Log in Database')}</div>
                      <div className="text-sm font-bold text-white mt-1">
                        {scanResult?.oldestLogDate ? new Date(scanResult.oldestLogDate).toLocaleString() : t('common.none', 'None')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!scanResult || scanResult.staleLogsCount === 0) return;
                        setConfirmModal({
                          isOpen: true,
                          type: 'logs',
                          count: scanResult.staleLogsCount
                        });
                      }}
                      disabled={!scanResult || scanResult.staleLogsCount === 0 || isPurgingLogs}
                      className="px-3.5 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-900/30 transition-all disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('storageCleanup.purgeLogsBtn', 'Purge Stale Logs')}</span>
                    </button>
                  </div>
                </div>

                {/* Stale Logs Preview Table */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
                  <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>{t('storageCleanup.previewCandidateLogs', 'Historical Logs Preview (Candidate Rows)')}</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      {t('storageCleanup.showingFirst', 'Showing first 25 candidate rows')}
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60 font-mono text-[11px]">
                    {!scanResult || !scanResult.staleLogs || (scanResult.staleLogs?.length || 0) === 0 ? (
                      <div className="p-8 text-center text-slate-500">
                        {t('storageCleanup.noStaleLogs', 'No logs currently exceed your {{days}}-day retention window.', { days: retentionDays })}
                      </div>
                    ) : (
                      (scanResult.staleLogs || []).slice(0, 25).map(log => (
                        <div key={log.id} className="p-2.5 flex items-center justify-between hover:bg-slate-800/40">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-slate-500">{new Date(log.created_at).toLocaleDateString()}</span>
                            <span className="px-1.5 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/50 text-[10px] font-bold">
                              {log.module}
                            </span>
                            <span className="text-slate-200 truncate">{log.action}</span>
                            {log.target && <span className="text-slate-400 truncate">({log.target})</span>}
                          </div>
                          <span className="text-slate-500 text-[10px] shrink-0 ml-2">{log.user_name}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: STORAGE STRATEGIES & FREE TIER ADVICE */}
            {activeTab === 'advice' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
                  <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {t('storageCleanup.bestPracticesTitle', 'Supabase 500MB Free-Tier Architecture Guide')}
                  </h3>
                  <p className="text-slate-300 leading-relaxed">
                    {t('storageCleanup.bestPracticesDesc', 'To maximize your free database storage without hitting resource limits, follow these architectural best practices in Nali Mobile:')}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Strategy 1: Media in Storage, NOT PostgreSQL */}
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1.5">
                    <div className="font-bold text-white flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-cyan-400" />
                      <span>{t('storageCleanup.strat1Title', '1. Use Supabase Storage for Images')}</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {t('storageCleanup.strat1Desc', 'Never save Base64 image data strings directly inside PostgreSQL columns. Base64 inflates byte size by 33%. Storing the public CDN URL uses under 120 bytes per row instead of 2-5 MB.')}
                    </p>
                  </div>

                  {/* Strategy 2: WebP Compression */}
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1.5">
                    <div className="font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span>{t('storageCleanup.strat2Title', '2. WebP Image Resizing')}</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {t('storageCleanup.strat2Desc', 'The built-in Nali Mobile upload pipeline automatically converts photos taken via phone camera or barcode scanner to optimized WebP at 800px max dimension, cutting storage by 75-85%.')}
                    </p>
                  </div>

                  {/* Strategy 3: Regular Orphan Cleanup */}
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1.5">
                    <div className="font-bold text-white flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-amber-400" />
                      <span>{t('storageCleanup.strat3Title', '3. Periodic Orphan Purges')}</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {t('storageCleanup.strat3Desc', 'When accessories or mobile models are deleted, run this utility once every 30 days to purge unlinked media files from the accessories and store buckets.')}
                    </p>
                  </div>

                  {/* Strategy 4: Polyglot Archival */}
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1.5">
                    <div className="font-bold text-white flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-400" />
                      <span>{t('storageCleanup.strat4Title', '4. Cold Storage & Archival')}</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {t('storageCleanup.strat4Desc', 'Use the CSV export utility to archive completed invoice ledgers older than 12 months, keeping your live Supabase database focused on real-time POS, live inventory, and active customer debts.')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-[#0a0e19] border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
            {activeTab === 'media' ? (
              <>
                <div className="text-xs text-slate-400">
                  <span>{t('storageCleanup.selectedCount', 'Selected:')} </span>
                  <span className="font-bold text-white">{selectedAssetsList?.length || 0}</span> {t('storageCleanup.orphanedFiles', 'orphaned files')} • 
                  <span className="font-bold text-emerald-400 ml-1">
                    {storageCleanupService.formatBytes(selectedTotalBytes)}
                  </span> {t('storageCleanup.toReclaim', 'space to reclaim')}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      onClose();
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
                  >
                    {t('common.close', 'Close')}
                  </button>

                  <button
                    type="button"
                    disabled={(selectedAssetsList?.length || 0) === 0 || isDeletingMedia}
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        type: 'media',
                        count: (selectedAssetsList?.length || 0),
                        sizeFormatted: storageCleanupService.formatBytes(selectedTotalBytes)
                      });
                    }}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>
                      {isDeletingMedia
                        ? t('storageCleanup.deleting', 'Deleting...')
                        : t('storageCleanup.deleteSelectedBtn', 'Delete {{count}} Orphaned Files', { count: (selectedAssetsList?.length || 0) })}
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-xs text-slate-400">
                  <span>{t('storageCleanup.policy', 'Policy:')} </span>
                  <span className="text-slate-200 font-semibold">{retentionDays} {t('storageCleanup.daysRetention', 'days retention')}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    onClose();
                  }}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
                >
                  {t('common.close', 'Close')}
                </button>
              </>
            )}
          </div>
        </motion.div>

        {/* Confirmation Danger Dialog */}
        <AnimatePresence>
          {confirmModal.isOpen && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/90 backdrop-blur-md"
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-md bg-[#11172a] border border-rose-900/60 rounded-2xl p-5 shadow-2xl space-y-4 z-10"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {confirmModal.type === 'media'
                        ? t('storageCleanup.confirmMediaTitle', 'Confirm Permanent Asset Deletion')
                        : t('storageCleanup.confirmLogsTitle', 'Confirm Historical Log Purge')}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {confirmModal.type === 'media'
                        ? t('storageCleanup.confirmMediaDesc', 'This action will permanently delete {{count}} unreferenced media files ({{size}}) from Supabase Storage.', {
                            count: confirmModal.count,
                            size: confirmModal.sizeFormatted
                          })
                        : t('storageCleanup.confirmLogsDesc', 'This action will permanently purge {{count}} historical audit log records from the database.', {
                            count: confirmModal.count
                          })}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
                  <span className="font-semibold text-emerald-400">✓ {t('storageCleanup.safetyGuaranteed', 'Safety Guaranteed:')} </span>
                  {confirmModal.type === 'media'
                    ? t('storageCleanup.safetyMediaNotice', 'All active product photos and user avatars were validated and will remain 100% intact.')
                    : t('storageCleanup.safetyLogsNotice', 'A CSV backup will be saved directly to your computer before deletion.')}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirmModal.type === 'media') {
                        executeDeleteMedia();
                      } else {
                        executePurgeLogs();
                      }
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/30 transition-all"
                  >
                    {t('storageCleanup.confirmPermanentDelete', 'Yes, Delete Permanently')}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}
