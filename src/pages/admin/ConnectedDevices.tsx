import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Laptop, 
  Smartphone, 
  Tablet, 
  Monitor, 
  MonitorSmartphone,
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Globe, 
  RefreshCw, 
  LogOut, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  Check, 
  X, 
  Search, 
  Radio,
  Server,
  KeyRound,
  UserCheck
} from 'lucide-react';
import { DeviceSession } from './types';
import { 
  getStoredSessions, 
  fetchConnectedDevicesFromCloud, 
  revokeDeviceSession, 
  revokeAllOtherSessions 
} from './adminStore';
import { useToast } from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { SearchInput } from '../../components/common/SearchInput';
import { cn } from '../../lib/utils';
import { sound } from '../../lib/sound';

export default function ConnectedDevices() {
  const { t } = useTranslation();
  const toast = useToast();
  const { profile } = useAuth();

  const [sessions, setSessions] = useState<DeviceSession[]>(() => {
    const s = getStoredSessions();
    return Array.isArray(s) ? s : [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [deviceFilter, setDeviceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State for Revoking Single Session
  const [sessionToRevoke, setSessionToRevoke] = useState<DeviceSession | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Modal State for Revoking All Other Sessions
  const [isRevokeAllOpen, setIsRevokeAllOpen] = useState(false);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  // Clipboard copy state
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  const currentDeviceId = useMemo(() => {
    try {
      return localStorage.getItem('nali_device_session_id') || '';
    } catch {
      return '';
    }
  }, []);

  // Fetch active sessions from Supabase cloud logs & settings
  const loadCloudSessions = useCallback(async (showToast = false) => {
    setIsLoading(true);
    try {
      const freshSessions = await fetchConnectedDevicesFromCloud();
      setSessions(Array.isArray(freshSessions) ? freshSessions : getStoredSessions());
      setLastRefreshed(new Date());
      if (showToast) {
        toast.success(
          t('admin.sessions.syncedSuccess', 'Synced connected devices with Supabase authentication logs.')
        );
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setSessions(getStoredSessions());
      if (showToast) {
        toast.error(t('admin.sessions.syncFailed', 'Failed to retrieve cloud authentication logs.'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [t, toast]);

  // Initial load & real-time Postgres/broadcast subscription
  useEffect(() => {
    loadCloudSessions(false);

    const handleUpdate = () => {
      setSessions(getStoredSessions());
    };

    window.addEventListener('storage', handleUpdate);
    window.addEventListener('nali_sessions_updated', handleUpdate);
    window.addEventListener('nali_sessions_revoked_update', handleUpdate);

    // Subscribe to Supabase audit_logs and settings for live device connections
    let auditSubscription: any = null;
    let settingsSubscription: any = null;

    if (isSupabaseConfigured()) {
      auditSubscription = supabase
        .channel('public:admin_connected_devices_audit')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'audit_logs' },
          (payload: any) => {
            const row = payload.new;
            if (
              row &&
              (row.entity === 'Security & Sessions' ||
                row.entity === 'UserSession' ||
                row.action?.toLowerCase().includes('login') ||
                row.action?.toLowerCase().includes('session'))
            ) {
              loadCloudSessions(false);
            }
          }
        )
        .subscribe();

      settingsSubscription = supabase
        .channel('public:admin_connected_devices_settings')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'settings', filter: 'key=eq.nali_pos_admin_sessions_v1' },
          () => {
            loadCloudSessions(false);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'settings', filter: 'key=eq.nali_pos_revoked_sessions_v1' },
          () => {
            loadCloudSessions(false);
          }
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('nali_sessions_updated', handleUpdate);
      window.removeEventListener('nali_sessions_revoked_update', handleUpdate);
      if (auditSubscription) auditSubscription.unsubscribe();
      if (settingsSubscription) settingsSubscription.unsubscribe();
    };
  }, [loadCloudSessions]);

  // Handle single device revocation
  const handleConfirmRevoke = async () => {
    if (!sessionToRevoke) return;
    setIsRevoking(true);
    sound.playClick();

    const success = await revokeDeviceSession(sessionToRevoke.id, {
      user_name: sessionToRevoke.user_name,
      device_name: sessionToRevoke.device_name,
      ip_address: sessionToRevoke.ip_address,
      admin_user: profile?.full_name || profile?.username || 'Administrator'
    });

    setIsRevoking(false);
    setSessionToRevoke(null);

    if (success) {
      toast.success(
        t('admin.sessions.revokedSuccess', {
          device: sessionToRevoke.device_name,
          user: sessionToRevoke.user_name,
          defaultValue: `Revoked access for "${sessionToRevoke.device_name}" (${sessionToRevoke.user_name}). Remote session terminated.`
        })
      );
      // Reload sessions
      loadCloudSessions(false);
    } else {
      toast.error(t('admin.sessions.revokeFailed', 'Could not revoke session remotely.'));
    }
  };

  // Handle revoking all other sessions
  const handleConfirmRevokeAll = async () => {
    setIsRevokingAll(true);
    sound.playClick();

    const count = await revokeAllOtherSessions(
      currentDeviceId,
      profile?.full_name || profile?.username || 'Administrator'
    );

    setIsRevokingAll(false);
    setIsRevokeAllOpen(false);

    toast.success(
      t('admin.sessions.allOtherRevoked', {
        count,
        defaultValue: `Successfully revoked access for ${count} remote device(s).`
      })
    );
    loadCloudSessions(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIp(text);
    toast.success(t('admin.sessions.ipCopied', 'IP address copied to clipboard'));
    setTimeout(() => setCopiedIp(null), 2000);
  };

  // KPI calculations
  const safeSessions = useMemo(() => Array.isArray(sessions) ? sessions : [], [sessions]);
  const activeSessions = useMemo(() => safeSessions.filter(s => s && !s.revoked), [safeSessions]);
  const revokedSessions = useMemo(() => safeSessions.filter(s => s && s.revoked), [safeSessions]);
  const uniqueIps = useMemo(() => new Set(activeSessions.map(s => s?.ip_address)).size, [activeSessions]);
  const mobileTabletCount = useMemo(
    () => activeSessions.filter(s => s && (s.device_type === 'mobile' || s.device_type === 'tablet')).length,
    [activeSessions]
  );
  const otherActiveSessionsCount = useMemo(
    () => activeSessions.filter(s => s && s.id !== currentDeviceId && !s.is_current).length,
    [activeSessions, currentDeviceId]
  );

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return safeSessions.filter(session => {
      if (!session) return false;
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          session.user_name?.toLowerCase().includes(q) ||
          session.user_role?.toLowerCase().includes(q) ||
          session.device_name?.toLowerCase().includes(q) ||
          session.os_name?.toLowerCase().includes(q) ||
          session.browser?.toLowerCase().includes(q) ||
          session.ip_address?.toLowerCase().includes(q) ||
          session.location?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Device category filter
      if (deviceFilter !== 'ALL') {
        if (deviceFilter === 'desktop' && session.device_type !== 'desktop') return false;
        if (deviceFilter === 'mobile' && session.device_type !== 'mobile') return false;
        if (deviceFilter === 'tablet' && session.device_type !== 'tablet') return false;
        if (deviceFilter === 'terminal' && session.device_category !== 'POS Terminal') return false;
      }

      // Status filter
      if (statusFilter === 'active' && session.revoked) return false;
      if (statusFilter === 'revoked' && !session.revoked) return false;
      if (statusFilter === 'current' && !session.is_current && session.id !== currentDeviceId) return false;

      return true;
    });
  }, [sessions, searchQuery, deviceFilter, statusFilter, currentDeviceId]);

  // Helper for device icon
  const getDeviceIcon = (session: DeviceSession) => {
    const type = session.device_type;
    const cat = session.device_category || '';

    if (cat.includes('POS') || type === 'terminal') {
      return <Monitor className="w-5 h-5 text-indigo-400" />;
    }
    if (type === 'mobile' || cat.includes('Phone')) {
      return <Smartphone className="w-5 h-5 text-emerald-400" />;
    }
    if (type === 'tablet' || cat.includes('Tablet')) {
      return <Tablet className="w-5 h-5 text-amber-400" />;
    }
    return <Laptop className="w-5 h-5 text-cyan-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Cloud Sync Indicator */}
      <div className="bg-[#111827] border border-[#334155]/60 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <MonitorSmartphone className="w-6 h-6 text-indigo-400" />
              <span>{t('admin.sessions.connectedDevicesTitle', 'Connected Devices')}</span>
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t('admin.sessions.liveSync', 'Supabase Auth Logs Live')}</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            {t(
              'admin.sessions.connectedDevicesSubtitle',
              'Active hardware terminals, handheld scanners, and authenticated browser sessions retrieved in real-time from Supabase logs. Remotely terminate compromised or inactive devices.'
            )}
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          <button
            id="refresh-sessions-btn"
            type="button"
            onClick={() => {
              sound.playClick();
              loadCloudSessions(true);
            }}
            disabled={isLoading}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 bg-[#1E293B] hover:bg-[#334155] text-slate-200 border border-[#475569] rounded-xl text-xs font-bold transition-all disabled:opacity-50 w-[180px] shrink-0"
            title={t('admin.sessions.refreshTooltip', 'Refresh authentication sessions from Supabase')}
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-indigo-400 shrink-0", isLoading && "animate-spin")} />
            <span className="truncate w-full text-left">{isLoading ? t('common.syncing', 'Syncing...') : t('admin.sessions.fetchCloud', 'Fetch from Supabase')}</span>
          </button>

          {otherActiveSessionsCount > 0 && (
            <button
              id="revoke-all-other-sessions-btn"
              type="button"
              onClick={() => {
                sound.playClick();
                setIsRevokeAllOpen(true);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-all"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>{t('admin.sessions.revokeAllOther', 'Revoke All Remote ({{count}})', { count: otherActiveSessionsCount })}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Active Sessions */}
        <div className="bg-[#111827] border border-[#334155]/60 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t('admin.sessions.totalActive', 'Total Active Sessions')}
            </p>
            <h3 className="text-2xl font-bold text-white mt-1 flex items-baseline gap-2">
              <span>{(activeSessions?.length || 0)}</span>
              <span className="text-xs font-normal text-slate-500">
                {t('admin.sessions.terminalsOnline', 'terminals online')}
              </span>
            </h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <MonitorSmartphone className="w-5 h-5 text-indigo-400" />
          </div>
        </div>

        {/* Unique IP Addresses */}
        <div className="bg-[#111827] border border-[#334155]/60 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t('admin.sessions.uniqueIps', 'Unique IP Addresses')}
            </p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1 flex items-baseline gap-2">
              <span>{uniqueIps}</span>
              <span className="text-xs font-normal text-slate-500">
                {t('admin.sessions.gateways', 'network nodes')}
              </span>
            </h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Globe className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* Mobile & POS Terminals */}
        <div className="bg-[#111827] border border-[#334155]/60 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t('admin.sessions.mobileRegisters', 'Mobile / POS Tablets')}
            </p>
            <h3 className="text-2xl font-bold text-cyan-400 mt-1 flex items-baseline gap-2">
              <span>{mobileTabletCount}</span>
              <span className="text-xs font-normal text-slate-500">
                {t('admin.sessions.handhelds', 'handheld units')}
              </span>
            </h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Tablet className="w-5 h-5 text-cyan-400" />
          </div>
        </div>

        {/* Revoked & Quarantined Sessions */}
        <div className="bg-[#111827] border border-[#334155]/60 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {t('admin.sessions.revokedCount', 'Revoked Remotely')}
            </p>
            <h3 className="text-2xl font-bold text-rose-400 mt-1 flex items-baseline gap-2">
              <span>{(revokedSessions?.length || 0)}</span>
              <span className="text-xs font-normal text-slate-500">
                {t('admin.sessions.blockedAccess', 'access terminated')}
              </span>
            </h3>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-[#111827] border border-[#334155]/60 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 min-w-[260px]">
          <SearchInput
            id="devices-search-input"
            placeholder={t(
              'admin.sessions.searchDevicesPlaceholder',
              'Search by device name, staff name, role, IP address, OS, or location...'
            )}
            value={searchQuery}
            onChangeValue={setSearchQuery}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Device Type Select */}
          <select
            id="devices-type-filter"
            value={deviceFilter}
            onChange={e => setDeviceFilter(e.target.value)}
            className="bg-[#0B0F19] border border-[#334155] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">{t('admin.sessions.allDeviceTypes', 'All Device Hardware')}</option>
            <option value="desktop">{t('admin.sessions.typeDesktop', 'Computer / Laptop')}</option>
            <option value="tablet">{t('admin.sessions.typeTablet', 'Tablet / iPad POS')}</option>
            <option value="mobile">{t('admin.sessions.typeMobile', 'Mobile Phone')}</option>
            <option value="terminal">{t('admin.sessions.typeTerminal', 'POS Terminal Workstation')}</option>
          </select>

          {/* Status Select */}
          <select
            id="devices-status-filter"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-[#0B0F19] border border-[#334155] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">{t('admin.sessions.allStatuses', 'All Session Statuses')}</option>
            <option value="active">{t('admin.sessions.statusActiveOnly', 'Active Online Only')}</option>
            <option value="current">{t('admin.sessions.statusCurrentOnly', 'This Device (You)')}</option>
            <option value="revoked">{t('admin.sessions.statusRevokedOnly', 'Revoked Access')}</option>
          </select>

          {/* Refresh Timestamp Note */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 px-2 py-1 bg-[#0B0F19] rounded-lg border border-[#334155]/40 font-mono">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{lastRefreshed.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Connected Devices List */}
      <div className="bg-[#111827] border border-[#334155]/60 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-[#334155]/60 flex items-center justify-between bg-white/[0.01]">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>{t('admin.sessions.activeDevicesList', 'Authenticated Hardware Terminals')}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {(filteredSessions?.length || 0)}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('admin.sessions.activeDevicesListSubtitle', 'Active connections validated by Supabase Auth and session security tokens.')}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">{t('admin.sessions.monitoringActive', 'Real-time telemetry active')}</span>
          </div>
        </div>

        {(filteredSessions?.length || 0) === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#1E293B] border border-[#334155] flex items-center justify-center text-slate-400 mb-3">
              <MonitorSmartphone className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-200">
              {t('admin.sessions.noDevicesFound', 'No matching connected devices found')}
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery || deviceFilter !== 'ALL' || statusFilter !== 'ALL'
                ? t('admin.sessions.tryAdjustingFilters', 'Try adjusting your search criteria or hardware filters.')
                : t('admin.sessions.fetchTip', 'Click "Fetch from Supabase" above to query fresh authentication logs.')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#334155]/40">
            {filteredSessions.map((session, index) => {
              const isCurrent = session.is_current || session.id === currentDeviceId;
              const isRevoked = Boolean(session.revoked);

              return (
                <div
                  key={session.id || `sess-${index}`}
                  id={`device-row-${session.id}`}
                  className={cn(
                    "p-4 sm:p-5 transition-colors flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4",
                    isCurrent ? "bg-indigo-950/15" : "hover:bg-white/[0.02]",
                    isRevoked && "opacity-60 bg-rose-950/10"
                  )}
                >
                  {/* Left: Device & Staff Info */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 mt-0.5 shadow-md",
                        isRevoked
                          ? "bg-rose-500/10 border-rose-500/20"
                          : isCurrent
                          ? "bg-indigo-500/15 border-indigo-500/30"
                          : "bg-[#1E293B] border-[#334155]"
                      )}
                    >
                      {getDeviceIcon(session)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-white tracking-tight truncate">
                          {session.device_name || session.device_model || t('admin.sessions.unknownDevice', 'POS Terminal')}
                        </h4>

                        {/* Status Badges */}
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wide">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            {t('admin.sessions.currentDeviceYou', 'This Device (You)')}
                          </span>
                        )}

                        {isRevoked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 uppercase tracking-wide">
                            <ShieldAlert className="w-3 h-3" />
                            {t('admin.sessions.revoked', 'Access Revoked')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {session.auth_method || 'Supabase Cloud Auth'}
                          </span>
                        )}
                      </div>

                      {/* Staff & Hardware Subtitle */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1.5">
                        {/* Staff User */}
                        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{session.user_name || 'Staff User'}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-white/10 text-slate-300 font-normal">
                            {session.user_role || 'Cashier'}
                          </span>
                        </div>

                        <span className="text-slate-600 hidden sm:inline">•</span>

                        {/* OS & Browser */}
                        <span className="truncate">
                          {session.os_name ? `${session.os_name} • ` : ''}
                          {session.browser || 'Web Browser'}
                        </span>

                        <span className="text-slate-600 hidden sm:inline">•</span>

                        {/* Location */}
                        <span className="text-slate-400">{session.location || 'Main Store'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle / Right: Network & Activity details */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 lg:gap-6 shrink-0 text-xs w-full lg:w-auto justify-between lg:justify-end border-t border-[#334155]/40 lg:border-t-0 pt-3 lg:pt-0">
                    {/* IP Address */}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {t('admin.sessions.ipAddress', 'IP Address')}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(session.ip_address)}
                        className="flex items-center gap-1 font-mono text-slate-300 hover:text-white transition-colors group mt-0.5"
                        title={t('common.clickToCopy', 'Click to copy IP')}
                      >
                        <span>{session.ip_address || '192.168.1.1'}</span>
                        {copiedIp === session.ip_address ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </div>

                    {/* Last Active */}
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {t('admin.sessions.lastActive', 'Last Active')}
                      </span>
                      <span className="text-slate-300 flex items-center gap-1 font-medium mt-0.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{session.last_active || t('admin.sessions.justNow', 'Just now')}</span>
                      </span>
                    </div>

                    {/* Action Button */}
                    <div className="ml-auto lg:ml-0">
                      {isCurrent ? (
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold select-none">
                          {t('admin.sessions.activeSession', 'Active (You)')}
                        </div>
                      ) : isRevoked ? (
                        <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 text-slate-500 border border-slate-700/50 text-xs font-semibold select-none flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                          <span>{t('admin.sessions.revoked', 'Terminated')}</span>
                        </div>
                      ) : (
                        <button
                          id={`revoke-btn-${session.id}`}
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setSessionToRevoke(session);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-400" />
                          <span>{t('admin.sessions.revokeAccess', 'Revoke Access')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal: Revoke Single Device */}
      {sessionToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111827] border border-[#334155] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">
                  {t('admin.sessions.confirmRevokeTitle', 'Revoke Remote Device Access?')}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t(
                    'admin.sessions.confirmRevokeDesc',
                    'This will immediately terminate the authentication token on this device, forcing the staff member to log out immediately.'
                  )}
                </p>
              </div>
            </div>

            {/* Target device summary box */}
            <div className="bg-[#0B0F19] border border-[#334155]/60 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">{t('admin.sessions.device', 'Device')}:</span>
                <span className="font-semibold text-white">{sessionToRevoke.device_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t('admin.sessions.staffUser', 'Staff User')}:</span>
                <span className="font-semibold text-indigo-300">
                  {sessionToRevoke.user_name} ({sessionToRevoke.user_role})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t('admin.sessions.ipAddress', 'IP Address')}:</span>
                <span className="font-mono text-slate-300">{sessionToRevoke.ip_address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t('admin.sessions.location', 'Location')}:</span>
                <span className="text-slate-300">{sessionToRevoke.location}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSessionToRevoke(null)}
                disabled={isRevoking}
                className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-slate-300 text-xs font-bold transition-colors disabled:opacity-50"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={isRevoking}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                {isRevoking ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('admin.sessions.revoking', 'Revoking Access...')}</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t('admin.sessions.confirmRevokeBtn', 'Revoke Device Now')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Revoke All Other Devices */}
      {isRevokeAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111827] border border-[#334155] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">
                  {t('admin.sessions.confirmRevokeAllTitle', 'Revoke All Remote Devices?')}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t(
                    'admin.sessions.confirmRevokeAllDesc',
                    'Are you sure you want to terminate all remote sessions? All other tablets, smartphones, and workstations currently logged into this store will be signed out immediately.'
                  )}
                </p>
              </div>
            </div>

            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-300">
              {t(
                'admin.sessions.revokeAllNotice',
                'Your current session on this device will remain active. {{count}} external devices will be disconnected.',
                { count: otherActiveSessionsCount }
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRevokeAllOpen(false)}
                disabled={isRevokingAll}
                className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-slate-300 text-xs font-bold transition-colors disabled:opacity-50"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmRevokeAll}
                disabled={isRevokingAll}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                {isRevokingAll ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('admin.sessions.terminatingAll', 'Terminating Sessions...')}</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t('admin.sessions.revokeAllConfirmBtn', 'Revoke All Remote Sessions')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
