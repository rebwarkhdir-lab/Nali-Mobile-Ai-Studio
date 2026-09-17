import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { authService, UserProfile } from '../../lib/authService';
import { 
  Search, Plus, MoreVertical, Edit2, ShieldAlert, 
  Trash2, Lock, Unlock, Mail, Phone, Calendar, Users as UsersIcon, ChevronDown, Filter, X
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';
import { SearchInput } from '../../components/common/SearchInput';
import { cn } from '../../lib/utils';
import UserModal from './UserModal';

export default function Users() {
  const { t } = useTranslation();
  const toast = useToast();
  const { hasPermission, profile } = useAuth();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Modals state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
    danger?: boolean;
  }>({ isOpen: false, title: '', message: '', action: async () => {} });

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('*, role:roles(id, name, is_system)').order('created_at', { ascending: false }),
        supabase.from('roles').select('*').order('name')
      ]);
      
      if (usersRes.data) setUsers(usersRes.data);
      if (rolesRes.data) setRoles(rolesRes.data);
    } catch (err) {
      toast.error(t('admin.users.loadError', 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Close dropdown on outside click
    const handleClickOutside = () => setActiveDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleStatusChange = async (user: UserProfile, newStatus: string) => {
    if (user.id === profile?.id && newStatus !== 'active') {
      toast.error(t('admin.users.cannotDeactivateSelf', 'You cannot deactivate your own account.'));
      return;
    }
    
    // Check if modifying the last admin
    if (user.role?.name === 'Administrator' && newStatus !== 'active') {
      const activeAdmins = (users || []).filter(u => u && u.role?.name === 'Administrator' && u.status === 'active');
      if ((activeAdmins?.length || 0) <= 1) {
        toast.error(t('admin.users.cannotDeactivateLastAdmin', 'Cannot deactivate the last active administrator.'));
        return;
      }
    }

    try {
      const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', user.id);
      if (error) throw error;
      
      await authService.logAudit(profile!.id, `Changed user status to ${newStatus}`, 'profiles', user.id);
      toast.success(t('admin.users.statusChanged', 'User status changed to {{status}}', { status: newStatus }));
      loadData();
    } catch (err: any) {
      toast.error(err.message || t('admin.users.statusUpdateError', 'Failed to update user status'));
    }
  };

  const confirmAction = (title: string, message: string, action: () => Promise<void>, danger = false) => {
    setConfirmState({ isOpen: true, title, message, action, danger });
  };

  const executeConfirm = async () => {
    try {
      await confirmState.action();
    } finally {
      setConfirmState(prev => ({ ...prev, isOpen: false }));
    }
  };

  const filteredUsers = (users || []).filter(u => {
    const term = search.toLowerCase();
    const matchesSearch = !search || 
      (u.full_name?.toLowerCase().includes(term)) ||
      (u.email?.toLowerCase().includes(term)) ||
      (u.username?.toLowerCase().includes(term));
      
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    const matchesRole = roleFilter === 'all' || u.role_id === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex-1 sm:w-64">
            <SearchInput
              placeholder={t('admin.users.searchPlaceholder', 'Search users...')}
              value={search}
              onChangeValue={setSearch}
              size="sm"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#121827] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="all">{t('admin.users.allStatus', 'All Status')}</option>
              <option value="active">{t('admin.users.active', 'Active')}</option>
              <option value="suspended">{t('admin.users.suspended', 'Suspended')}</option>
              <option value="inactive">{t('admin.users.inactive', 'Inactive')}</option>
            </select>
            
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-[#121827] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="all">{t('admin.users.allRoles', 'All Roles')}</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        {hasPermission('Administration', 'edit_users') && (
          <button 
            onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t('admin.users.createUser', 'Create User')}
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-[#121827] border border-white/10 rounded-xl overflow-hidden shadow-sm flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0b0f1a] text-slate-400 sticky top-0 z-10">
              <tr>
                <th className="px-5 py-3 font-medium border-b border-white/5">{t('admin.users.userCol', 'User')}</th>
                <th className="px-5 py-3 font-medium border-b border-white/5">{t('admin.users.roleCol', 'Role')}</th>
                <th className="px-5 py-3 font-medium border-b border-white/5">{t('admin.users.statusCol', 'Status')}</th>
                <th className="px-5 py-3 font-medium border-b border-white/5">{t('admin.users.lastLoginCol', 'Last Login')}</th>
                <th className="px-5 py-3 font-medium border-b border-white/5">{t('admin.users.createdCol', 'Created')}</th>
                <th className="px-5 py-3 font-medium border-b border-white/5 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    <div className="flex justify-center mb-2">
                      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    {t('admin.users.loadingUsers', 'Loading users...')}
                  </td>
                </tr>
              ) : (filteredUsers?.length || 0) === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800/50 mb-3">
                      <Search className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-slate-300 font-medium">{t('admin.users.noUsersFound', 'No users found')}</p>
                    <p className="text-slate-500 text-sm mt-1">{t('admin.users.noUsersFoundDesc', 'Try adjusting your search or filters.')}</p>
                  </td>
                </tr>
              ) : (
                (filteredUsers || []).map(user => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                          <span className="text-indigo-300 font-bold text-xs">{user.full_name?.substring(0,2).toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="font-medium text-slate-200">{user.full_name}</div>
                          <div className="text-xs text-slate-500">{user.email || user.username || t('admin.users.noEmail', 'No email')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {user.role?.name || t('admin.users.noRole', 'No Role')}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border",
                        user.status === 'active' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        user.status === 'suspended' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                        "bg-slate-800 text-slate-400 border-slate-700"
                      )}>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          user.status === 'active' ? "bg-emerald-500" :
                          user.status === 'suspended' ? "bg-rose-500" :
                          "bg-slate-500"
                        )}></span>
                        {user.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">
                      {user.last_login_at ? new Date(user.last_login_at).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      }) : t('admin.users.never', 'Never')}
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">
                      {new Date(user.created_at).toLocaleString(undefined, {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {hasPermission('Administration', 'edit_users') && (
                        <div className="relative inline-block text-left" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdown(activeDropdown === user.id ? null : user.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors focus:outline-none cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          
                          {activeDropdown === user.id && (
                            <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-[#1e293b] border border-slate-700 ring-1 ring-black ring-opacity-5 z-50 divide-y divide-slate-700/50">
                              <div className="py-1">
                                <button
                                  onClick={() => { setActiveDropdown(null); setEditingUser(user); setIsUserModalOpen(true); }}
                                  className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" /> {t('admin.users.editUser', 'Edit User')}
                                </button>
                              </div>
                              <div className="py-1">
                                {user.status === 'active' ? (
                                  <button
                                    onClick={() => {
                                      setActiveDropdown(null);
                                      confirmAction(
                                        t('admin.users.suspendUserTitle', 'Suspend User'), 
                                        t('admin.users.suspendUserPrompt', 'Are you sure you want to suspend {{name}}? They will lose access immediately.', { name: user.full_name }), 
                                        () => handleStatusChange(user, 'suspended'), 
                                        true
                                      );
                                    }}
                                    className="w-full text-left px-4 py-2 text-xs text-amber-400 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Lock className="w-3.5 h-3.5" /> {t('admin.users.suspendAccount', 'Suspend Account')}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setActiveDropdown(null);
                                      confirmAction(
                                        t('admin.users.activateUserTitle', 'Activate User'), 
                                        t('admin.users.activateUserPrompt', 'Are you sure you want to activate {{name}}?', { name: user.full_name }), 
                                        () => handleStatusChange(user, 'active')
                                      );
                                    }}
                                    className="w-full text-left px-4 py-2 text-xs text-emerald-400 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Unlock className="w-3.5 h-3.5" /> {t('admin.users.activateAccount', 'Activate Account')}
                                  </button>
                                )}
                              </div>
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    setActiveDropdown(null);
                                    confirmAction(
                                      t('admin.users.deleteUserTitle', 'Delete User'), 
                                      t('admin.users.deleteUserPrompt', 'WARNING: Deleting {{name}} is a permanent action. Consider suspending them instead if they have historical records. Are you sure?', { name: user.full_name }), 
                                      () => handleStatusChange(user, 'deleted'), 
                                      true
                                    );
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs text-rose-400 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> {t('admin.users.deleteUser', 'Delete User')}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isUserModalOpen && (
        <UserModal 
          isOpen={isUserModalOpen} 
          onClose={() => setIsUserModalOpen(false)} 
          user={editingUser} 
          roles={roles}
          onSuccess={loadData}
        />
      )}

      {/* Confirmation Modal */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121827] border border-white/10 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className={cn("text-lg font-bold mb-2", confirmState.danger ? "text-rose-400" : "text-white")}>
              {confirmState.title}
            </h3>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              {confirmState.message}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-lg text-slate-300 hover:bg-white/5 text-sm font-medium transition-colors cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button 
                onClick={executeConfirm}
                className={cn(
                  "px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors cursor-pointer",
                  confirmState.danger 
                    ? "bg-rose-600 hover:bg-rose-500" 
                    : "bg-indigo-600 hover:bg-indigo-500"
                )}
              >
                {t('common.confirm', 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
