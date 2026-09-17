import React, { useState, useEffect } from 'react';
import { 
  X, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Database, 
  HardDrive, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Layers, 
  ArrowRight, 
  Radio, 
  Play, 
  Pause, 
  ShieldCheck, 
  Sparkles,
  RotateCcw,
  Activity,
  FileText,
  Cloud,
  Key,
  Globe,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Tablet,
  Smartphone,
  UploadCloud,
  Share2
} from 'lucide-react';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { offlineSyncService } from '../../lib/offlineSyncService';
import { idb } from '../../lib/idbService';
import { sound } from '../../lib/sound';
import { formatCurrency, cn } from '../../lib/utils';
import { useToast } from './Toast';
import { useTranslation } from 'react-i18next';
import { 
  getSupabaseConfig, 
  setSupabaseConfig, 
  testSupabaseConnection, 
  isSupabaseConfigured 
} from '../../lib/supabase';

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OfflineSyncModal({ isOpen, onClose }: OfflineSyncModalProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';

  const { 
    isOnline, 
    isSimulatingOffline, 
    isSyncing, 
    pendingCount, 
    lastSyncTime, 
    lastError,
    pendingItems,
    syncLogs,
    triggerSync,
    setSimulateOffline,
    retryItem,
    deleteQueueItem,
    clearSyncLogs,
    refreshData
  } = useOfflineSync();

  const { success, error: toastError, info } = useToast();
  
  const initialConfig = getSupabaseConfig();
  const [activeTab, setActiveTab] = useState<'cloud' | 'queue' | 'diagnostics' | 'logs'>(
    isSupabaseConfigured() ? 'queue' : 'cloud'
  );
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(
    initialConfig.supabaseUrl === 'https://placeholder.supabase.co' ? '' : initialConfig.supabaseUrl
  );
  const [supabaseAnonKeyInput, setSupabaseAnonKeyInput] = useState(
    initialConfig.supabaseAnonKey === 'placeholder' ? '' : initialConfig.supabaseAnonKey
  );
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; tablesFound?: string[] } | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isPushingLocal, setIsPushingLocal] = useState(false);
  const [pushResult, setPushResult] = useState<{ mobilesPushed: number; accessoriesPushed: number; debtsPushed: number; installmentsPushed: number } | null>(null);
  const [isConfiguredState, setIsConfiguredState] = useState(isSupabaseConfigured());
  const [copiedLink, setCopiedLink] = useState(false);

  const [isPullingData, setIsPullingData] = useState(false);
  const [storageStats, setStorageStats] = useState<{
    mobilesCount: number;
    accessoriesCount: number;
    debtsCount: number;
    installmentsCount: number;
    posSalesCount: number;
    queueCount: number;
    logsCount: number;
  }>({
    mobilesCount: 0,
    accessoriesCount: 0,
    debtsCount: 0,
    installmentsCount: 0,
    posSalesCount: 0,
    queueCount: 0,
    logsCount: 0
  });

  useEffect(() => {
    if (isOpen) {
      refreshData();
      offlineSyncService.getStorageStats().then(setStorageStats);
      const conf = getSupabaseConfig();
      setIsConfiguredState(isSupabaseConfigured());
      if (conf.supabaseUrl && !conf.supabaseUrl.includes('placeholder')) {
        setSupabaseUrlInput(conf.supabaseUrl);
      }
      if (conf.supabaseAnonKey && conf.supabaseAnonKey !== 'placeholder') {
        setSupabaseAnonKeyInput(conf.supabaseAnonKey);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSyncAll = async () => {
    sound.playClick();
    try {
      const result = await triggerSync();
      if (result.failed === 0) {
        sound.playPaymentSuccess();
        success(`Successfully synchronized ${result.totalProcessed} transactions to cloud.`);
      } else {
        sound.playAlert();
        toastError(`Synchronized ${result.totalProcessed}, but ${result.failed} items failed.`);
      }
      refreshData();
      offlineSyncService.getStorageStats().then(setStorageStats);
    } catch (err) {
      sound.playAlert();
      toastError('Failed to trigger synchronization');
    }
  };

  const handlePullFreshData = async () => {
    sound.playClick();
    setIsPullingData(true);
    try {
      await offlineSyncService.syncDownLatest();
      const stats = await offlineSyncService.getStorageStats();
      setStorageStats(stats);
      sound.playPaymentSuccess();
      success(`Local cache refreshed! (${stats.mobilesCount} mobiles, ${stats.accessoriesCount} accessories)`);
    } catch (e) {
      toastError('Failed to pull fresh catalog from cloud database');
    } finally {
      setIsPullingData(false);
    }
  };

  const handleToggleSimulation = (e: React.ChangeEvent<HTMLInputElement>) => {
    sound.playClick();
    const val = e.target.checked;
    setSimulateOffline(val);
    if (val) {
      info('Simulated Offline Mode turned ON. POS operations will save to local cache.');
    } else {
      success('Simulated Offline Mode turned OFF. Cloud syncing active.');
    }
  };

  const handleTestConnection = async () => {
    sound.playClick();
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(supabaseUrlInput, supabaseAnonKeyInput);
      setTestResult(res);
      if (res.success) {
        sound.playPaymentSuccess();
        success(res.message);
      } else {
        sound.playAlert();
        toastError(res.message);
      }
    } catch (e: any) {
      sound.playAlert();
      setTestResult({ success: false, message: e?.message || 'Connection test failed.' });
      toastError(e?.message || 'Connection test failed.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    sound.playClick();
    if (!supabaseUrlInput.trim() || !supabaseAnonKeyInput.trim()) {
      toastError('Please enter both Supabase Project URL and Anon API Key');
      return;
    }
    setIsSavingConfig(true);
    try {
      setSupabaseConfig(supabaseUrlInput.trim(), supabaseAnonKeyInput.trim(), true);
      setIsConfiguredState(true);
      sound.playPaymentSuccess();
      success('Supabase configured! Shared across iPad & Mobile.');
      const res = await testSupabaseConnection(supabaseUrlInput.trim(), supabaseAnonKeyInput.trim());
      setTestResult(res);
      await offlineSyncService.syncDownLatest();
      const stats = await offlineSyncService.getStorageStats();
      setStorageStats(stats);
    } catch (err: any) {
      sound.playAlert();
      toastError('Failed to save Supabase configuration');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handlePushLocalData = async () => {
    sound.playClick();
    setIsPushingLocal(true);
    setPushResult(null);
    try {
      const res = await offlineSyncService.syncUpAllLocalDataToCloud();
      setPushResult(res);
      sound.playPaymentSuccess();
      success(`Uploaded ${res.mobilesPushed} mobiles & ${res.accessoriesPushed} accessories to Supabase!`);
      const stats = await offlineSyncService.getStorageStats();
      setStorageStats(stats);
    } catch (err: any) {
      sound.playAlert();
      toastError('Failed to upload local records to cloud');
    } finally {
      setIsPushingLocal(false);
    }
  };

  const handleCopyShareLink = () => {
    sound.playClick();
    const shareUrl = `${window.location.origin}${window.location.pathname}?supabase_url=${encodeURIComponent(supabaseUrlInput.trim())}&supabase_key=${encodeURIComponent(supabaseAnonKeyInput.trim())}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    success('Connection link copied! Open this on your Mobile phone to connect automatically.');
    setTimeout(() => setCopiedLink(false), 3500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[90] flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-[#0f1423] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#0a0d18] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-2xl border",
              isOnline 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            )}>
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">{t('offlineSync.title', 'Offline POS & Local Sync Engine')}</h2>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[11px] font-bold border",
                  isOnline 
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" 
                    : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                )}>
                  {isSimulatingOffline 
                    ? t('offlineSync.simulatedOffline', 'Simulated Offline') 
                    : (isOnline ? t('offlineSync.onlineActive', 'Online (IndexedDB Active)') : t('offlineSync.offlineMode', 'Offline Mode'))}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('offlineSync.subtitle', 'Local-first caching keeps POS register, barcode scans, and debt records functional without network')}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Diagnostics & Action Bar */}
        <div className="p-4 bg-[#0c101d] border-b border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Status Metric Card */}
          <div className="bg-[#121829] p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{t('offlineSync.syncQueue', 'Sync Queue')}</span>
              <div className="text-xl font-black text-white mt-0.5 flex items-center gap-2">
                <span>{pendingCount}</span>
                <span className="text-xs font-semibold text-slate-400">{t('offlineSync.pending', 'pending')}</span>
              </div>
            </div>
            <button
              onClick={handleSyncAll}
              disabled={isSyncing || !isOnline || pendingCount === 0}
              className={cn(
                "p-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer",
                isSyncing || !isOnline || pendingCount === 0
                  ? "bg-slate-800/50 text-slate-500 border-slate-800 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-600/30 active:scale-95"
              )}
              title="Push pending transactions now"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")} />
              <span>{isSyncing ? t('offlineSync.syncing', 'Syncing...') : t('offlineSync.syncNow', 'Sync Now')}</span>
            </button>
          </div>

          {/* Last Sync Timestamp */}
          <div className="bg-[#121829] p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">{t('offlineSync.lastCloudSync', 'Last Cloud Sync')}</span>
              <div className="text-xs font-semibold text-slate-200 truncate mt-0.5">
                {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : t('offlineSync.ready', 'Ready')}
              </div>
            </div>
          </div>

          {/* Simulation Switch */}
          <div className="bg-[#121829] p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <span className="text-[11px] font-medium text-amber-400 uppercase tracking-wider block">{t('offlineSync.simulateOfflineTitle', 'Simulate Offline')}</span>
              <span className="text-[11px] text-slate-400 block truncate">{t('offlineSync.simulateOfflineDesc', 'Test offline POS flow')}</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isSimulatingOffline}
                onChange={handleToggleSimulation}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 bg-[#0a0d18] border-b border-slate-800 flex gap-2 overflow-x-auto">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('cloud');
            }}
            className={cn(
              "px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0",
              activeTab === 'cloud'
                ? "text-indigo-400 border-indigo-500 bg-slate-900/60"
                : "text-slate-400 border-transparent hover:text-slate-200"
            )}
          >
            <Cloud className="w-4 h-4" />
            <span>{t('offlineSync.tabCloud', 'Cloud & Multi-Device Sync')}</span>
            {!isConfiguredState ? (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold animate-pulse">
                Setup Needed
              </span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('queue');
            }}
            className={cn(
              "px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0",
              activeTab === 'queue'
                ? "text-indigo-400 border-indigo-500 bg-slate-900/60"
                : "text-slate-400 border-transparent hover:text-slate-200"
            )}
          >
            <Layers className="w-4 h-4" />
            <span>{t('offlineSync.tabQueue', 'Pending Sync Queue')} ({pendingCount})</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('diagnostics');
            }}
            className={cn(
              "px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0",
              activeTab === 'diagnostics'
                ? "text-indigo-400 border-indigo-500 bg-slate-900/60"
                : "text-slate-400 border-transparent hover:text-slate-200"
            )}
          >
            <Database className="w-4 h-4" />
            <span>{t('offlineSync.tabDiagnostics', 'IndexedDB Cache')}</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('logs');
            }}
            className={cn(
              "px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0",
              activeTab === 'logs'
                ? "text-indigo-400 border-indigo-500 bg-slate-900/60"
                : "text-slate-400 border-transparent hover:text-slate-200"
            )}
          >
            <Activity className="w-4 h-4" />
            <span>{t('offlineSync.tabLogs', 'Sync Audit Logs')}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* TAB 0: CLOUD & MULTI-DEVICE SETUP */}
          {activeTab === 'cloud' && (
            <div className="space-y-4">
              
              {/* Status Banner */}
              <div className={cn(
                "p-4 rounded-2xl border flex items-start gap-3.5 transition-all",
                isConfiguredState 
                  ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                  : "bg-amber-950/20 border-amber-500/30 text-amber-300"
              )}>
                <div className={cn(
                  "p-2.5 rounded-xl shrink-0 mt-0.5",
                  isConfiguredState 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                )}>
                  {isConfiguredState ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">
                      {isConfiguredState ? 'Supabase Connected & Multi-Device Sync Active' : 'Supabase Connection Needed (iPad ↔ Mobile)'}
                    </h3>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      isConfiguredState ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                    )}>
                      {isConfiguredState ? 'Live' : 'Action Required'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {isConfiguredState 
                      ? 'Both your iPad and mobile phone connect to this same Supabase database. When you add or sell an item on one device, it updates immediately on the other device via Supabase Realtime.'
                      : 'You ran the SQL queries in Supabase successfully! Now simply paste your Supabase Project URL and Anon Key below so your iPad and mobile phone can link to your database in real-time.'
                    }
                  </p>
                  {isConfiguredState && (
                    <div className="mt-2 text-[11px] font-mono text-slate-400 truncate bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800 inline-block">
                      URL: {supabaseUrlInput}
                    </div>
                  )}
                </div>
              </div>

              {/* Instructions on Where to find keys */}
              <div className="bg-[#121829] border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>How to get your Project URL & Anon Key from Supabase:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-300">
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                    <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 inline-flex items-center justify-center font-bold text-[11px] mr-2">1</span>
                    <span>Go to your <b>Nali Mobile</b> project in Supabase</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                    <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 inline-flex items-center justify-center font-bold text-[11px] mr-2">2</span>
                    <span>Click <b>Connect</b> at top right (or <b>⚙️ Settings → API</b>)</span>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
                    <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 inline-flex items-center justify-center font-bold text-[11px] mr-2">3</span>
                    <span>Copy <b>Project URL</b> & <b>anon public key</b></span>
                  </div>
                </div>
              </div>

              {/* Input Form */}
              <div className="bg-[#121829] border border-slate-800 rounded-2xl p-4 space-y-4">
                
                {/* Project URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Supabase Project URL</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-normal">e.g. https://xyzabcdefg.supabase.co</span>
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={supabaseUrlInput}
                      onChange={(e) => setSupabaseUrlInput(e.target.value)}
                      placeholder="https://your-project-ref.supabase.co"
                      className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    {supabaseUrlInput && (
                      <button
                        onClick={() => setSupabaseUrlInput('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                        title="Clear"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Anon Key */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Supabase Anon Public Key (anon / public)</span>
                    </span>
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showKey ? 'Hide' : 'Show'}</span>
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      value={supabaseAnonKeyInput}
                      onChange={(e) => setSupabaseAnonKeyInput(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    {supabaseAnonKeyInput && (
                      <button
                        onClick={() => setSupabaseAnonKeyInput('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                        title="Clear"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800">
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting || !supabaseUrlInput.trim() || !supabaseAnonKeyInput.trim()}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all cursor-pointer",
                      isTesting || !supabaseUrlInput.trim() || !supabaseAnonKeyInput.trim()
                        ? "bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:text-white"
                    )}
                  >
                    <Activity className={cn("w-3.5 h-3.5", isTesting && "animate-spin text-indigo-400")} />
                    <span>{isTesting ? 'Testing Connection...' : 'Test Connection'}</span>
                  </button>

                  <button
                    onClick={handleSaveConfig}
                    disabled={isSavingConfig || !supabaseUrlInput.trim() || !supabaseAnonKeyInput.trim()}
                    className={cn(
                      "px-5 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all cursor-pointer shadow-lg",
                      isSavingConfig || !supabaseUrlInput.trim() || !supabaseAnonKeyInput.trim()
                        ? "bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-indigo-600/30 active:scale-95"
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSavingConfig ? 'Saving...' : 'Save & Link Both Devices'}</span>
                  </button>
                </div>

                {/* Test Result Feedback */}
                {testResult && (
                  <div className={cn(
                    "p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in",
                    testResult.success 
                      ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                      : "bg-rose-950/30 border-rose-500/30 text-rose-300"
                  )}>
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />}
                    <div>
                      <div className="font-bold">{testResult.message}</div>
                      {testResult.tablesFound && testResult.tablesFound.length > 0 && (
                        <div className="text-[11px] text-emerald-400/90 mt-0.5">
                          ✓ Tables ready for real-time sync: {testResult.tablesFound.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Extra Tools when Connected: Push Local Data & Mobile Share Link */}
              {isConfiguredState && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Push Local Data to Cloud */}
                  <div className="bg-[#121829] border border-slate-800 rounded-2xl p-4 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                        <UploadCloud className="w-4 h-4 text-emerald-400" />
                        <span>Upload Local iPad Data to Cloud</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Push any inventory or debts entered locally on this iPad to your Supabase project so your phone can see them immediately.
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handlePushLocalData}
                        disabled={isPushingLocal || !isOnline}
                        className={cn(
                          "w-full py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer",
                          isPushingLocal || !isOnline
                            ? "bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed"
                            : "bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/30 active:scale-95"
                        )}
                      >
                        <UploadCloud className={cn("w-3.5 h-3.5", isPushingLocal && "animate-bounce")} />
                        <span>{isPushingLocal ? 'Uploading to Supabase...' : 'Upload Local Data to Cloud'}</span>
                      </button>
                      {pushResult && (
                        <div className="text-[11px] text-emerald-400 mt-1.5 text-center font-medium">
                          ✓ Pushed {pushResult.mobilesPushed} mobiles, {pushResult.accessoriesPushed} accessories!
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Share Connection Link to Mobile */}
                  <div className="bg-[#121829] border border-slate-800 rounded-2xl p-4 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                        <Share2 className="w-4 h-4 text-cyan-400" />
                        <span>Open on Mobile Phone</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Configuration is saved to the server. Simply open this app on your mobile phone and it connects automatically! Or copy the direct link:
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleCopyShareLink}
                        className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Copy Mobile Connect Link'}</span>
                      </button>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 1: QUEUE */}
          {activeTab === 'queue' && (
            <div className="space-y-3">
              {(pendingItems?.length || 0) === 0 ? (
                <div className="py-12 px-4 text-center rounded-2xl bg-slate-900/30 border border-slate-800/60 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white">{t('offlineSync.emptyQueueTitle', 'All Transactions Are Synced')}</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {t('offlineSync.emptyQueueDesc', 'There are no pending offline mutations. Any new sales processed while offline will automatically queue here and sync once online.')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span>{pendingItems?.length || 0} item(s) awaiting cloud synchronization</span>
                    <button
                      onClick={handleSyncAll}
                      disabled={isSyncing || !isOnline}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={cn("w-3 h-3", isSyncing && "animate-spin")} />
                      <span>Sync All Pending</span>
                    </button>
                  </div>

                  <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/40">
                    {pendingItems.map((item) => (
                      <div key={item.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                              item.status === 'failed' ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" :
                              item.status === 'syncing' ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse" :
                              "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            )}>
                              {item.status}
                            </span>
                            <span className="text-xs font-bold text-white truncate">{item.summary}</span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                            <span>Type: <strong className="text-slate-300">{item.entityType}</strong></span>
                            <span>•</span>
                            <span>Time: {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {item.retryCount > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-amber-400">Retries: {item.retryCount}</span>
                              </>
                            )}
                          </div>

                          {item.lastError && (
                            <p className="text-[11px] text-rose-400 font-mono bg-rose-500/10 p-1.5 rounded-lg border border-rose-500/20">
                              Error: {item.lastError}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => retryItem(item.id)}
                            disabled={isSyncing || !isOnline}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                            title="Retry syncing this record"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Retry</span>
                          </button>
                          <button
                            onClick={() => deleteQueueItem(item.id)}
                            className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
                            title="Remove from queue"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DIAGNOSTICS & STORAGE */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Mobiles Cached</span>
                  <span className="text-xl font-extrabold text-white mt-1 block">{storageStats.mobilesCount}</span>
                </div>
                <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Accessories</span>
                  <span className="text-xl font-extrabold text-white mt-1 block">{storageStats.accessoriesCount}</span>
                </div>
                <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Offline Sales</span>
                  <span className="text-xl font-extrabold text-white mt-1 block">{storageStats.posSalesCount}</span>
                </div>
                <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Active Debts</span>
                  <span className="text-xl font-extrabold text-white mt-1 block">{storageStats.debtsCount}</span>
                </div>
              </div>

              {/* Maintenance Tools */}
              <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Storage & Synchronization Tools</h3>
                
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    onClick={handlePullFreshData}
                    disabled={isPullingData || !isOnline}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={cn("w-4 h-4", isPullingData && "animate-spin")} />
                    <span>{isPullingData ? 'Refreshing Local Catalog...' : 'Force Refresh Catalog from Cloud'}</span>
                  </button>

                  <button
                    onClick={clearSyncLogs}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-slate-400" />
                    <span>Clear Audit Logs</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  IndexedDB engine provides instant catalog lookups and barcode scanning with zero latency. All local writes are durable and will not be wiped on browser tab reload.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Recent Sync Engine Events</span>
                <button
                  onClick={clearSyncLogs}
                  className="text-slate-400 hover:text-rose-400 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  Clear Logs
                </button>
              </div>

              {(syncLogs?.length || 0) === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No sync events logged yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60 border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/30 max-h-[300px] overflow-y-auto">
                  {syncLogs.map((log) => (
                    <div key={log.id} className="p-3 flex items-start gap-2.5 text-xs">
                      <div className="mt-0.5 shrink-0">
                        {log.level === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        {log.level === 'warning' && <AlertCircle className="w-3.5 h-3.5 text-amber-400" />}
                        {log.level === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                        {log.level === 'info' && <Activity className="w-3.5 h-3.5 text-cyan-400" />}
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">{log.title}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        {log.details && (
                          <p className="text-[11px] text-slate-400 leading-snug">{log.details}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0a0d18] border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>IndexedDB v2 Ready</span>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
