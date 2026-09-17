import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import {  Search, Filter, Download, Activity, Users as UsersIcon, Calendar, ArrowUpRight , X } from 'lucide-react';
import { useToast } from '../../components/common/Toast';
import { SearchInput } from '../../components/common/SearchInput';
import { cn } from '../../lib/utils';

export default function AuditLogs() {
  const { t } = useTranslation();
  const toast = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    uniqueUsers: 0
  });

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*, user:profiles(full_name)')
          .order('created_at', { ascending: false })
          .limit(100); // For demo, we limit to 100
        
        if (error) throw error;
        setLogs(data || []);
        
        const users = new Set(data?.map(l => l.user_id));
        setStats({
          total: data?.length || 0, // Should be count from DB but for now using array length
          uniqueUsers: users.size
        });
      } catch (err) {
        toast.error(t('admin.audit.loadError', 'Failed to load audit logs'));
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, []);

  const filteredLogs = (logs || []).filter(log => {
    const term = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(term) ||
      log.module.toLowerCase().includes(term) ||
      (log.user?.full_name?.toLowerCase().includes(term)) ||
      (log.target?.toLowerCase().includes(term))
    );
  });

  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-[#121827] border border-white/5 rounded-2xl p-5 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-medium text-slate-400">{t('admin.audit.totalTracked', 'Total Tracked Events')}</p>
            <h3 className="text-3xl font-bold text-white mt-1">{stats.total}+</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Activity className="w-6 h-6 text-indigo-400" />
          </div>
        </div>
        
        <div className="bg-[#121827] border border-white/5 rounded-2xl p-5 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-medium text-slate-400">{t('admin.audit.activeActors', 'Active Actors')}</p>
            <h3 className="text-3xl font-bold text-emerald-400 mt-1">{stats.uniqueUsers}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <UsersIcon className="w-6 h-6 text-emerald-400" />
          </div>
        </div>
        
        <div className="bg-[#121827] border border-white/5 rounded-2xl p-5 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-medium text-slate-400">{t('admin.audit.latestEvent', 'Latest Event')}</p>
            <h3 className="text-sm font-bold text-amber-400 mt-1 truncate max-w-[120px]">
              {logs[0]?.action || t('common.na', 'N/A')}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-amber-400" />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="max-w-md w-full">
          <SearchInput
            placeholder={t('admin.audit.searchPlaceholder', 'Search logs by action, user, or module...')}
            value={search}
            onChangeValue={setSearch}
          />
        </div>
        
        <button className="flex items-center gap-2 bg-[#121827] hover:bg-slate-800 text-slate-300 border border-white/10 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm whitespace-nowrap">
          <Download className="w-4 h-4" />
          {t('admin.audit.exportCsv', 'Export CSV')}
        </button>
      </div>

      <div className="bg-[#121827] border border-white/10 rounded-2xl overflow-hidden shadow-sm flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0b0f1a] text-slate-400 sticky top-0 z-10 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-medium">{t('admin.audit.timestamp', 'Timestamp')}</th>
                <th className="px-6 py-4 font-medium">{t('admin.audit.user', 'User')}</th>
                <th className="px-6 py-4 font-medium">{t('admin.audit.action', 'Action')}</th>
                <th className="px-6 py-4 font-medium">{t('admin.audit.moduleTarget', 'Module / Target')}</th>
                <th className="px-6 py-4 font-medium">{t('admin.audit.details', 'Details')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex justify-center mb-3">
                      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    {t('admin.audit.loading', 'Loading audit trail...')}
                  </td>
                </tr>
              ) : (filteredLogs?.length || 0) === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                     <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800/50 mb-3">
                      <Search className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-slate-300 font-medium">{t('admin.audit.noLogs', 'No log entries found')}</p>
                    <p className="text-slate-500 text-sm mt-1">{t('admin.audit.noLogsDesc', 'Try adjusting your search criteria.')}</p>
                  </td>
                </tr>
              ) : (
                (filteredLogs || []).map(log => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-3">
                      <div className="flex flex-col">
                        <span className="text-slate-300 font-medium">{new Date(log.created_at).toLocaleDateString()}</span>
                        <span className="text-slate-500 text-xs">{new Date(log.created_at).toLocaleTimeString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                          {log.user?.full_name?.substring(0, 1) || 'S'}
                        </div>
                        <span className="text-slate-300 font-medium">{log.user?.full_name || t('admin.audit.system', 'System')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col">
                        <span className="text-slate-300">{log.module}</span>
                        {log.target && <span className="text-slate-500 text-xs font-mono">ID: {log.target}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <button className="text-slate-500 hover:text-indigo-400 p-1.5 rounded bg-white/5 hover:bg-white/10 transition-colors">
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
