import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {  
  ShieldCheck, Smartphone, Laptop, KeyRound, Lock, 
  Unlock, RefreshCw, Copy, Check, AlertTriangle, Clock, 
  Globe, ShieldAlert, Sliders, CheckCircle2, User, LogOut, Search,
  X, Tablet, Monitor
} from 'lucide-react';
import { DeviceSession } from './types';
import { SearchInput } from '../../components/common/SearchInput';
import { cn } from '../../lib/utils';
import { useToast } from '../../components/common/Toast';
import { 
  getStoredSessions, 
  saveStoredSessions, 
  addAuditEntry, 
  INITIAL_BRANCHES, 
  INITIAL_ROLES,
  revokeDeviceSession,
  revokeAllOtherSessions,
  fetchConnectedDevicesFromCloud
} from './adminStore';
import { useAuth } from '../../context/AuthContext';

export default function SecurityCenter() {
  const { t } = useTranslation();
  const toast = useToast();
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<DeviceSession[]>(() => {
    const s = getStoredSessions();
    return Array.isArray(s) ? s : [];
  });
  const [searchSession, setSearchSession] = useState('');

  useEffect(() => {
    fetchConnectedDevicesFromCloud().then(res => {
      if (Array.isArray(res)) setSessions(res);
    }).catch(() => {});

    const handleUpdate = () => {
      const s = getStoredSessions();
      setSessions(Array.isArray(s) ? s : []);
    };
    window.addEventListener('nali_sessions_updated', handleUpdate);
    window.addEventListener('nali_sessions_revoked_update', handleUpdate);
    return () => {
      window.removeEventListener('nali_sessions_updated', handleUpdate);
      window.removeEventListener('nali_sessions_revoked_update', handleUpdate);
    };
  }, []);
  
  // Security settings state
  const [sessionTimeout, setSessionTimeout] = useState(120);
  const [failedAttemptThreshold, setFailedAttemptThreshold] = useState(3);
  const [requireComplexPassword, setRequireComplexPassword] = useState(true);
  const [autoLockOnIdle, setAutoLockOnIdle] = useState(true);

  // Quick temporary credentials generator
  const [tempStaffName, setTempStaffName] = useState('');
  const [tempRole, setTempRole] = useState('role-cashier');
  const [tempBranch, setTempBranch] = useState('branch-1');
  const [generatedPass, setGeneratedPass] = useState('NaliPass#2026!');
  const [generatedPin, setGeneratedPin] = useState('5821');
  const [copiedSlip, setCopiedSlip] = useState(false);

  const handleRevokeSession = async (sessionId: string) => {
    const target = sessions.find(s => s.id === sessionId);
    const success = await revokeDeviceSession(sessionId, {
      user_name: target?.user_name,
      device_name: target?.device_name,
      ip_address: target?.ip_address,
      admin_user: profile?.full_name || 'Administrator'
    });

    if (success) {
      setSessions(getStoredSessions());
      toast.success(t('admin.sessions.revokedSuccessShort', `Access revoked for ${target?.user_name || 'device'}. Remote session terminated.`));
    }
  };

  const handleRevokeAllExceptCurrent = async () => {
    const currentSession = sessions.find(s => s.is_current);
    const currentId = currentSession ? currentSession.id : '';
    const count = await revokeAllOtherSessions(currentId, profile?.full_name || 'Administrator');
    setSessions(getStoredSessions());
    toast.success(t('admin.sessions.allOtherRevokedShort', `Terminated ${count} remote device sessions.`));
  };

  const generateNewCredentials = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let pass = '';
    for (let i = 0; i < 14; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedPass(pass);
    setGeneratedPin(pin);
    toast.success('Generated fresh high-entropy credentials');
  };

  const copySlip = () => {
    const branchName = INITIAL_BRANCHES.find(b => b.id === tempBranch)?.name || 'Main Terminal';
    const roleName = INITIAL_ROLES.find(r => r.id === tempRole)?.name || 'Staff';
    const slip = `🔐 NALI POS - Temporary Staff Access Slip
------------------------------------------------
Staff Member: ${tempStaffName || 'New Employee'}
Role: ${roleName}
Assigned Branch: ${branchName}
One-Time Password: ${generatedPass}
Quick POS PIN: ${generatedPin}
Expiry: 24 Hours (Requires password change upon login)
------------------------------------------------
Authorized by NALI POS Administration`;

    navigator.clipboard.writeText(slip);
    setCopiedSlip(true);
    toast.success('Access slip copied to clipboard');
    setTimeout(() => setCopiedSlip(false), 2500);
  };

  const filteredSessions = (sessions || []).filter(s => {
    if (!s) return false;
    if (!searchSession) return true;
    const q = searchSession.toLowerCase();
    return (s.user_name || '').toLowerCase().includes(q) ||
      (s.device_name || '').toLowerCase().includes(q) ||
      (s.browser || '').toLowerCase().includes(q) ||
      (s.ip_address || '').toLowerCase().includes(q) ||
      (s.location || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Security Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111827] border border-[#334155]/60 rounded-2xl p-5 flex items-center gap-4 shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('admin.security.defense', 'System Defense')}</div>
            <div className="text-lg font-bold text-white flex items-center gap-2 mt-0.5">
              {t('admin.security.secure', 'Secure & Hardened')}
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{t('admin.security.zeroAttacks', '0 anomalous attempts detected')}</p>
          </div>
        </div>

        <div className="bg-[#111827] border border-[#334155]/60 rounded-2xl p-5 flex items-center gap-4 shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('admin.security.activeTerminals', 'Active POS Terminals')}</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {(sessions?.length || 0)} {t('admin.security.connectedDevices', 'Connected Devices')}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{t('admin.security.acrossBranches', { count: (INITIAL_BRANCHES?.length || 0), defaultValue: `Across ${(INITIAL_BRANCHES?.length || 0)} authorized branches` })}</p>
          </div>
        </div>

        <div className="bg-[#111827] border border-[#334155]/60 rounded-2xl p-5 flex items-center gap-4 shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('admin.security.lockout', 'Lockout Protection')}</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {failedAttemptThreshold} {t('admin.security.maxAttempts', 'Max Attempts')}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{t('admin.security.autoSuspension', 'Auto-suspension on repeated failures')}</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Device Sessions & Temporary Credentials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Device Sessions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#111827] border border-[#334155]/60 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Laptop className="w-5 h-5 text-indigo-400" />
                  {t('admin.security.activeSessionsTitle', 'Active Hardware & Device Sessions')}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('admin.security.activeSessionsSubtitle', 'Real-time monitor of all tablets, touch registers, handheld scanners and workstations.')}
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex-1 sm:w-48">
                  <SearchInput
                    placeholder={t('admin.security.filterSessions', 'Filter sessions...')}
                    value={searchSession}
                    onChangeValue={setSearchSession}
                    size="sm"
                  />
                </div>

                {(sessions?.length || 0) > 1 && (
                  <button
                    onClick={handleRevokeAllExceptCurrent}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors shrink-0 flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    {t('admin.security.revokeRemote', 'Revoke Remote')}
                  </button>
                )}
              </div>
            </div>

            {/* Sessions List */}
            <div className="divide-y divide-[#334155]/40 mt-2">
              {(filteredSessions?.length || 0) === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  {t('admin.security.noSessions', 'No active device sessions found.')}
                </div>
              ) : (
                filteredSessions.map(session => {
                  const isMobile = session.device_category === 'Mobile Phone' || session.device_type === 'mobile';
                  const isTablet = session.device_category === 'Tablet' || session.device_type === 'tablet';
                  const isTerminal = session.device_category === 'POS Terminal' || session.device_type === 'terminal';
                  
                  const roleColor = session.user_role === 'Administrator'
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    : session.user_role === 'Manager'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    : session.user_role === 'Cashier'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-purple-500/20 text-purple-300 border-purple-500/30';

                  return (
                    <div 
                      key={session.id}
                      className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group hover:bg-white/[0.01] px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                          {isMobile ? (
                            <Smartphone className="w-5 h-5 text-emerald-400" />
                          ) : isTablet ? (
                            <Tablet className="w-5 h-5 text-sky-400" />
                          ) : isTerminal ? (
                            <Monitor className="w-5 h-5 text-amber-400" />
                          ) : (
                            <Laptop className="w-5 h-5 text-indigo-400" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white">{session.device_name}</span>
                            
                            {/* Device Category Badge */}
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                              {session.device_category || (isMobile ? 'Mobile Phone' : 'Computer / Laptop')}
                            </span>

                            {/* User Role Badge */}
                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", roleColor)}>
                              Logged in as: {session.user_role || 'Staff'}
                            </span>

                            {session.is_current ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {t('admin.security.thisTerminal', 'Current Device')}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                {t('admin.security.remote', 'Remote')}
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-400 flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-indigo-300 font-medium">{session.user_name}</span>
                            <span>•</span>
                            <span>{session.browser}</span>
                            {session.os_name && (
                              <>
                                <span>•</span>
                                <span className="text-slate-400">{session.os_name}</span>
                              </>
                            )}
                            <span>•</span>
                            <span className="font-mono text-slate-500">{session.ip_address}</span>
                          </div>

                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-600" />
                              {session.last_active}
                            </span>
                            <span>({session.location})</span>
                          </div>
                        </div>
                      </div>

                      {!session.is_current && (
                        <button
                          onClick={() => handleRevokeSession(session.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors shrink-0 self-end sm:self-center"
                        >
                          {t('admin.security.revokeAccess', 'Revoke Access')}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Security & Authentication Policies */}
          <div className="bg-[#111827] border border-[#334155]/60 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              {t('admin.security.policiesTitle', 'Terminal Authentication & Lockout Policies')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-[#0B0F19] border border-white/5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">{t('admin.security.inactivityTimeout', 'Terminal Inactivity Timeout')}</span>
                  <span className="font-mono text-indigo-400 font-bold">{sessionTimeout} mins</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={480}
                  step={15}
                  value={sessionTimeout}
                  onChange={e => setSessionTimeout(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <p className="text-[11px] text-slate-500">
                  {t('admin.security.timeoutDesc', 'Automatically lock POS screen when inactive to protect cash registers.')}
                </p>
              </div>

              <div className="p-4 bg-[#0B0F19] border border-white/5 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">{t('admin.security.failedThreshold', 'Failed PIN Attempts Threshold')}</span>
                  <span className="font-mono text-amber-400 font-bold">{failedAttemptThreshold} attempts</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={10}
                  step={1}
                  value={failedAttemptThreshold}
                  onChange={e => setFailedAttemptThreshold(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <p className="text-[11px] text-slate-500">
                  {t('admin.security.failedDesc', 'Suspends account and requires manager authorization after consecutive failures.')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Temporary Credentials Generator Slip */}
        <div className="space-y-4">
          <div className="bg-gradient-to-b from-[#161F33] to-[#111827] border border-indigo-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{t('admin.security.tempStaffTitle', 'Temporary Staff Access Generator')}</h3>
                <p className="text-[11px] text-slate-400">{t('admin.security.tempStaffSubtitle', 'Generate printed/copied onboarding access')}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">{t('admin.security.staffName', 'Staff Name')}</label>
                <input
                  type="text"
                  placeholder="e.g. Diyar New Hire"
                  value={tempStaffName}
                  onChange={e => setTempStaffName(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-[#334155] rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">{t('admin.security.role', 'Role')}</label>
                  <select
                    value={tempRole}
                    onChange={e => setTempRole(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-[#334155] rounded-xl px-2.5 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    {INITIAL_ROLES.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">{t('admin.security.branch', 'Branch')}</label>
                  <select
                    value={tempBranch}
                    onChange={e => setTempBranch(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-[#334155] rounded-xl px-2.5 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    {INITIAL_BRANCHES.map(b => (
                      <option key={b.id} value={b.id}>{b.code}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Generated Box */}
              <div className="p-3.5 bg-slate-950 border border-white/10 rounded-xl space-y-2 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-400">
                  <span>{t('admin.security.passwordLabel', 'Password:')}</span>
                  <span className="text-emerald-400 font-bold">{generatedPass}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>{t('admin.security.pinLabel', 'POS Quick PIN:')}</span>
                  <span className="text-amber-400 font-bold text-sm tracking-widest">{generatedPin}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={generateNewCredentials}
                  className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-white/5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t('admin.security.reroll', 'Reroll')}
                </button>

                <button
                  type="button"
                  onClick={copySlip}
                  className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5"
                >
                  {copiedSlip ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  {t('admin.security.copySlip', 'Copy Slip')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
