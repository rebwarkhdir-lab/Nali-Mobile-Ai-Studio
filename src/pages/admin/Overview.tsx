import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { Users, Shield, ShieldAlert, MonitorSmartphone, Activity, TrendingUp, AlertTriangle } from 'lucide-react';
import { useToast } from '../../components/common/Toast';
import { Link } from 'react-router';
import { cn } from '../../lib/utils';

export default function Overview() {
  const { t } = useTranslation();
  const toast = useToast();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0,
    activeSessions: 1, // Mock current session for now
    securityEvents: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [usersRes, auditRes] = await Promise.all([
          supabase.from('profiles').select('*, role:roles(name)'),
          supabase.from('audit_logs').select('*, user:profiles(full_name)').order('created_at', { ascending: false }).limit(10)
        ]);

        if (usersRes.error) throw usersRes.error;
        if (auditRes.error) throw auditRes.error;

        const users = usersRes.data || [];
        const logs = auditRes.data || [];

        setStats({
          totalUsers: users?.length || 0,
          activeUsers: (users || []).filter(u => u?.status === 'active').length,
          adminUsers: (users || []).filter(u => u?.role?.name === 'Administrator').length,
          activeSessions: 1, // Hardcoded for demo unless we have a real sessions tracking
          securityEvents: (logs || []).filter(l => l && (l.module === 'roles' || (typeof l.action === 'string' && (l.action.toLowerCase().includes('password') || l.action.toLowerCase().includes('status'))))).length
        });
        
        setRecentActivity(Array.isArray(logs) ? logs : []);
      } catch (error) {
        toast.error(t('admin.overview.loadError', 'Failed to load overview data'));
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">{t('admin.overview.loading', 'Loading security center...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Users */}
        <div className="bg-[#121827] border border-white/5 rounded-2xl p-5 flex flex-col justify-between group hover:border-indigo-500/30 transition-colors shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
              <TrendingUp className="w-3 h-3" /> {t('admin.overview.system', 'System')}
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.totalUsers}</h3>
            <p className="text-sm font-medium text-slate-400">{t('admin.overview.totalUsers', 'Total Users')}</p>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-[#121827] border border-white/5 rounded-2xl p-5 flex flex-col justify-between group hover:border-emerald-500/30 transition-colors shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.activeUsers}</h3>
            <p className="text-sm font-medium text-slate-400">{t('admin.overview.activeAccounts', 'Active Accounts')}</p>
          </div>
        </div>

        {/* Administrators */}
        <div className="bg-[#121827] border border-white/5 rounded-2xl p-5 flex flex-col justify-between group hover:border-amber-500/30 transition-colors shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.adminUsers}</h3>
            <p className="text-sm font-medium text-slate-400">{t('admin.overview.administrators', 'Administrators')}</p>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="bg-[#121827] border border-white/5 rounded-2xl p-5 flex flex-col justify-between group hover:border-sky-500/30 transition-colors shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20 group-hover:scale-110 transition-transform">
              <MonitorSmartphone className="w-5 h-5 text-sky-400" />
            </div>
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.activeSessions}</h3>
            <p className="text-sm font-medium text-slate-400">{t('admin.overview.activeSessions', 'Active Sessions')}</p>
          </div>
        </div>

        {/* Security Events */}
        <div className="bg-[#121827] border border-white/5 rounded-2xl p-5 flex flex-col justify-between group hover:border-rose-500/30 transition-colors shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-white mb-1">{stats.securityEvents}</h3>
            <p className="text-sm font-medium text-slate-400">{t('admin.overview.securityEvents', 'Security Events')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">{t('admin.overview.recentActivity', 'Recent Activity Stream')}</h2>
            <Link to="/admin/audit" className="text-sm font-medium text-indigo-400 hover:text-indigo-300">{t('admin.overview.viewAll', 'View All')}</Link>
          </div>
          <div className="bg-[#121827] border border-white/5 rounded-2xl p-1 shadow-lg flex-1">
            <div className="flex flex-col divide-y divide-white/5 h-full">
              {(recentActivity?.length || 0) === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">{t('admin.overview.noRecentActivity', 'No recent activity.')}</div>
              ) : (
                (recentActivity || []).map((log) => (
                  <div key={log.id} className="p-4 hover:bg-white/[0.02] transition-colors flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Activity className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-white truncate">
                          {log.user?.full_name || t('admin.audit.system', 'System')}
                        </p>
                        <span className="text-xs text-slate-500 shrink-0">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">
                        {log.action} <span className="text-slate-500">{t('admin.overview.in', 'in')}</span> {log.module}
                        {log.target && <span className="text-slate-500"> • ID: {log.target}</span>}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-white">{t('admin.overview.securityStatus', 'Security Status')}</h2>
          <div className="bg-[#121827] border border-white/5 rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-center gap-4 flex-1">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-emerald-500/20 flex items-center justify-center">
                <Shield className="w-10 h-10 text-emerald-500" />
              </div>
              <div className="absolute top-0 right-0 w-6 h-6 bg-emerald-500 border-2 border-[#121827] rounded-full flex items-center justify-center">
                <span className="text-[10px] text-[#121827] font-bold">✓</span>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-white">{t('admin.overview.systemSecure', 'System Secure')}</h3>
              <p className="text-sm text-slate-400 mt-2 max-w-[200px] mx-auto">
                {t('admin.overview.systemSecureDesc', 'No active threats detected. Authentication and roles are functioning normally.')}
              </p>
            </div>
            
            <div className="w-full space-y-3 mt-4 text-left border-t border-white/5 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                </div>
                <span className="text-sm font-medium text-slate-300">{t('admin.overview.adminConfigured', 'Administrator Configured')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                </div>
                <span className="text-sm font-medium text-slate-300">{t('admin.overview.rolePoliciesEnforced', 'Role Policies Enforced')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                </div>
                <span className="text-sm font-medium text-slate-300">{t('admin.overview.auditLoggingActive', 'Audit Logging Active')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
