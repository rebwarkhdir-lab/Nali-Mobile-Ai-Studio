import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {  
  Users, ShieldCheck, KeyRound, History, Plus, 
  Search, Filter, ShieldAlert, CheckCircle, Clock, 
  Smartphone, Building2, UserPlus, SlidersHorizontal, 
  Download, RefreshCw, Lock, Sparkles, Check, ChevronRight,
  Eye, EyeOff, Archive, HardDrive, Database, X,
  MonitorSmartphone 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AdminUser, UserStatus, AuditLog } from './types';
import UserTable from './UserTable';
import UserCardList from './UserCardList';
import UserEditModal from './UserEditModal';
import DeleteConfirmationModal, { DeleteModalTarget } from './DeleteConfirmationModal';
import RoleMatrix from './RoleMatrix';
import SecurityCenter from './SecurityCenter';
import ConnectedDevices from './ConnectedDevices';
import StorageCleanupModal from '../../components/common/StorageCleanupModal';
import CloudStatusBadge from '../../components/common/CloudStatusBadge';
import MigrationModal from '../../components/common/MigrationModal';
import { sound } from '../../lib/sound';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { 
  getStoredStaff, 
  saveStoredStaff, 
  getStoredAuditLogs, 
  saveStoredAuditLogs, 
  addAuditEntry, 
  saveUserCredential,
  registerStaffUser,
  INITIAL_ROLES, 
  getStoredRoles,
  INITIAL_BRANCHES, 
  INITIAL_SESSIONS,
  getStoredSessions,
  syncAdminWithCloud,
  syncStaffAccountToSupabase,
  syncStaffAndCredentialsFromCloud,
  omitStaffAccountFromCloud,
  upsertStaffAccountToCloud
} from './adminStore';
import { useToast } from '../../components/common/Toast';
import { SearchInput } from '../../components/common/SearchInput';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';

export default function AdminDashboard({ initialTab }: { initialTab?: 'users' | 'roles' | 'security' | 'audit' | 'devices' }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { profile, user: authUser } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'security' | 'audit' | 'devices'>(initialTab || 'users');
  const [staffList, setStaffList] = useState<AdminUser[]>(() => getStoredStaff());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => getStoredAuditLogs());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [hideArchived, setHideArchived] = useState(true);

  // User Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<'profile' | 'security' | 'sessions'>('profile');

  // Deletion Modal State
  const [deleteTarget, setDeleteTarget] = useState<DeleteModalTarget | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Audit filters
  const [auditSearch, setAuditSearch] = useState('');
  const [auditSeverity, setAuditSeverity] = useState('ALL');

  // Supabase Storage & Database Cleanup Modal State
  const [isStorageCleanupOpen, setIsStorageCleanupOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isSyncingAdmin, setIsSyncingAdmin] = useState(false);

  // Initial cloud sync & real-time updates
  React.useEffect(() => {
    const runCloudSync = async () => {
      setIsSyncingAdmin(true);
      await syncAdminWithCloud();
      setStaffList(getStoredStaff());
      setAuditLogs(getStoredAuditLogs());
      setIsSyncingAdmin(false);
    };
    runCloudSync();

    const handleSync = () => {
      setStaffList(getStoredStaff());
      setAuditLogs(getStoredAuditLogs());
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('nali_staff_updated', handleSync);
    window.addEventListener('nali_roles_updated', handleSync);
    window.addEventListener('nali_rbac_updated', handleSync);
    window.addEventListener('nali_audit_log_added', handleSync);

    if (!isSupabaseConfigured()) {
      return () => {
        window.removeEventListener('storage', handleSync);
        window.removeEventListener('nali_staff_updated', handleSync);
        window.removeEventListener('nali_roles_updated', handleSync);
        window.removeEventListener('nali_rbac_updated', handleSync);
        window.removeEventListener('nali_audit_log_added', handleSync);
      };
    }

    // Real-time Postgres subscriptions for admin settings and audit_logs
    const channel = supabase
      .channel('public:admin_center_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'key=eq.nali_pos_admin_staff_v1' }, () => {
        syncAdminWithCloud().then(() => {
          setStaffList(getStoredStaff());
          setAuditLogs(getStoredAuditLogs());
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: 'key=eq.nali_pos_admin_roles_v1' }, () => {
        syncAdminWithCloud().then(() => {
          setStaffList(getStoredStaff());
          setAuditLogs(getStoredAuditLogs());
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => {
        syncAdminWithCloud().then(() => {
          setAuditLogs(getStoredAuditLogs());
        });
      })
      .subscribe();

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('nali_staff_updated', handleSync);
      window.removeEventListener('nali_roles_updated', handleSync);
      window.removeEventListener('nali_rbac_updated', handleSync);
      window.removeEventListener('nali_audit_log_added', handleSync);
      supabase.removeChannel(channel);
    };
  }, []);

  // Role staff count map for RoleMatrix
  const staffCountByRole = useMemo(() => {
    const counts: Record<string, number> = {};
    staffList.forEach(u => {
      // Only count active non-deleted staff for roles
      if (u.is_active !== false && !u.deleted_at && u.status !== 'inactive') {
        const roleId = u.role_id || u.role?.id || '';
        if (roleId) {
          counts[roleId] = (counts[roleId] || 0) + 1;
        }
      }
    });
    return counts;
  }, [staffList]);

  // Filter staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter(user => {
      // Archived / Soft-Deleted filter
      const isArchived = user.is_active === false || !!user.deleted_at || user.status === 'inactive';
      if (hideArchived && isArchived && selectedStatusFilter !== 'inactive') {
        return false;
      }

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = user.full_name?.toLowerCase().includes(q);
        const matchEmail = user.email?.toLowerCase().includes(q);
        const matchUsername = user.username?.toLowerCase().includes(q);
        const matchPhone = user.phone?.toLowerCase().includes(q);
        const matchRole = user.role?.name?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchUsername && !matchPhone && !matchRole) {
          return false;
        }
      }

      // Role filter
      if (selectedRoleFilter !== 'ALL' && user.role_id !== selectedRoleFilter && user.role?.name !== selectedRoleFilter && user.role?.id !== selectedRoleFilter) {
        return false;
      }

      // Branch filter
      if (selectedBranchFilter !== 'ALL' && user.branch_id !== selectedBranchFilter && user.branch?.id !== selectedBranchFilter) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter !== 'ALL') {
        if (selectedStatusFilter === 'inactive') {
          if (!isArchived) return false;
        } else if (user.status !== selectedStatusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [staffList, searchQuery, selectedRoleFilter, selectedBranchFilter, selectedStatusFilter, hideArchived]);

  // Summary Metrics calculations
  const activeStaffRecords = (staffList || []).filter(u => u && u.is_active !== false && !u.deleted_at && u.status !== 'inactive');
  const totalStaffCount = (activeStaffRecords?.length || 0);
  const archivedStaffCount = ((staffList || []).length) - (activeStaffRecords?.length || 0);
  const activeStaffNowCount = (activeStaffRecords || []).filter(
    u => u && u.status === 'active' && u.last_activity_at && (Date.now() - new Date(u.last_activity_at).getTime() < 1000 * 60 * 15)
  )?.length || 0;
  const pendingResetCount = (activeStaffRecords || []).filter(u => u && u.must_change_password)?.length || 0;

  const [activeSessionsCount, setActiveSessionsCount] = useState<number>(() => {
    const s = getStoredSessions();
    return Array.isArray(s) ? s.length : (INITIAL_SESSIONS?.length || 0);
  });

  useEffect(() => {
    const updateCount = () => {
      const s = getStoredSessions();
      setActiveSessionsCount(Array.isArray(s) ? s.length : 0);
    };
    window.addEventListener('storage', updateCount);
    window.addEventListener('nali_sessions_updated', updateCount);
    window.addEventListener('nali_sessions_revoked_update', updateCount);
    return () => {
      window.removeEventListener('storage', updateCount);
      window.removeEventListener('nali_sessions_updated', updateCount);
      window.removeEventListener('nali_sessions_revoked_update', updateCount);
    };
  }, []);

  // Handlers
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setModalInitialTab('profile');
    setIsEditModalOpen(true);
  };

  const handleEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setModalInitialTab('profile');
    setIsEditModalOpen(true);
  };

  const handleResetPassword = (user: AdminUser) => {
    setEditingUser(user);
    setModalInitialTab('security');
    setIsEditModalOpen(true);
  };

  const handleRevokeUserSessions = (user: AdminUser) => {
    setEditingUser(user);
    setModalInitialTab('sessions');
    setIsEditModalOpen(true);
  };

  const handleToggleStatus = (user: AdminUser, newStatus: UserStatus) => {
    // Prevent locking out last Admin
    if (user.role?.name === 'Administrator' && newStatus !== 'active') {
      const activeAdminCount = (staffList || []).filter(
        u => u && u.role?.name === 'Administrator' && u.status === 'active' && u.is_active !== false && !u.deleted_at
      ).length;
      if (activeAdminCount <= 1) {
        toast.error('Cannot suspend or deactivate the only active Administrator.');
        return;
      }
    }

    const updated = staffList.map(u => u.id === user.id ? { ...u, status: newStatus } : u);
    setStaffList(updated);
    saveStoredStaff(updated);
    const targetUser = updated.find(u => u.id === user.id);
    if (targetUser) {
      upsertStaffAccountToCloud(targetUser).catch(() => {});
    }
    toast.success(`Account for ${user.full_name} is now ${newStatus}`);

    addAuditEntry({
      user_name: profile?.full_name || 'Nali Admin',
      user_role: profile?.role?.name || 'Administrator',
      action: `Changed account status to "${newStatus}" for user "${user.full_name}"`,
      module: 'Administration',
      target: user.full_name,
      severity: newStatus === 'active' ? 'info' : 'warning'
    });
  };

  const handleBulkStatusChange = (userIds: string[], newStatus: UserStatus) => {
    const updated = staffList.map(u => userIds.includes(u.id) ? { ...u, status: newStatus } : u);
    setStaffList(updated);
    saveStoredStaff(updated);
    toast.success(`Updated ${(userIds?.length || 0)} staff accounts to ${newStatus}`);

    addAuditEntry({
      user_name: profile?.full_name || 'Nali Admin',
      user_role: profile?.role?.name || 'Administrator',
      action: `Bulk updated ${(userIds?.length || 0)} staff statuses to "${newStatus}"`,
      module: 'Administration',
      severity: 'warning'
    });
  };

  // Restore Soft-Deleted Staff
  const handleRestoreUser = async (user: AdminUser) => {
    const updated = staffList.map(u => 
      u.id === user.id 
        ? { ...u, is_active: true, deleted_at: null, status: 'active' as UserStatus } 
        : u
    );
    setStaffList(updated);
    saveStoredStaff(updated);
    const restored = updated.find(u => u.id === user.id);
    if (restored) {
      await upsertStaffAccountToCloud(restored);
    }
    toast.success(`Staff account for ${user.full_name} has been restored and reactivated.`);

    addAuditEntry({
      user_name: profile?.full_name || 'Nali Admin',
      user_role: profile?.role?.name || 'Administrator',
      action: `Restored archived staff account "${user.full_name}"`,
      module: 'Administration',
      target: user.full_name,
      severity: 'info'
    });
  };

  // Open Delete Confirmation Modal
  const handleDeleteUserClick = (user: AdminUser) => {
    // Safety check: Prevent self-deletion if logged in
    if (profile?.id === user.id || (profile?.email && profile.email === user.email)) {
      toast.error('You cannot delete or deactivate your own active logged-in administrator account.');
      return;
    }

    // Safety check: Prevent deleting last administrator
    if (user.role?.name === 'Administrator') {
      const activeAdmins = staffList.filter(
        u => u.role?.name === 'Administrator' && u.status === 'active' && u.is_active !== false && !u.deleted_at
      );
      if ((activeAdmins?.length || 0) <= 1) {
        toast.error('Cannot remove or deactivate the only remaining active Administrator in the system.');
        return;
      }
    }

    // Pass target user to modal
    setDeleteTarget({
      type: 'user',
      user
    });
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete Handler (Soft Delete or Permanent Purge with Optimistic State Update)
  const handleConfirmDelete = async (target: DeleteModalTarget, mode: 'soft' | 'permanent') => {
    if (target.type !== 'user') return;
    const user = target.user;

    setIsDeleting(true);
    const previousStaffList = [...staffList];

    try {
      if (mode === 'soft') {
        // Safe Soft-Delete: Set is_active = false, deleted_at = timestamp, status = inactive
        const now = new Date().toISOString();
        const updated = staffList.map(u => 
          u.id === user.id 
            ? { 
                ...u, 
                is_active: false, 
                deleted_at: now, 
                status: 'inactive' as UserStatus 
              } 
            : u
        );

        // Optimistic UI state update
        setStaffList(updated);
        saveStoredStaff(updated);

        // Close modal immediately
        setIsDeleteModalOpen(false);
        setDeleteTarget(null);

        // Omit in independent Supabase table
        await omitStaffAccountFromCloud(user.id, 'soft');

        toast.success(`Staff account for ${user.full_name} deactivated & archived safely. Sales records preserved.`);

        addAuditEntry({
          user_name: profile?.full_name || 'Nali Admin',
          user_role: profile?.role?.name || 'Administrator',
          action: `Safe Soft-Delete (Deactivated & Archived) staff account "${user.full_name}"`,
          module: 'Administration',
          target: user.full_name,
          severity: 'warning'
        });
      } else {
        // Permanent Purge: Filter out completely
        const updated = staffList.filter(u => u.id !== user.id);

        // Optimistic UI state update
        setStaffList(updated);
        saveStoredStaff(updated);

        // Close modal immediately
        setIsDeleteModalOpen(false);
        setDeleteTarget(null);

        // Omit permanently in independent Supabase table
        await omitStaffAccountFromCloud(user.id, 'permanent');

        toast.success(`Permanently removed staff account for ${user.full_name}.`);

        addAuditEntry({
          user_name: profile?.full_name || 'Nali Admin',
          user_role: profile?.role?.name || 'Administrator',
          action: `Permanently purged staff account "${user.full_name}"`,
          module: 'Administration',
          target: user.full_name,
          severity: 'danger'
        });
      }
    } catch (error: any) {
      console.error('Error during deletion:', error);
      // Revert optimistic update on failure
      setStaffList(previousStaffList);
      saveStoredStaff(previousStaffList);
      toast.error(`Database rejection: ${error?.message || 'Failed to remove user account'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveUser = async (userData: Partial<AdminUser>, password?: string, pin?: string) => {
    if (editingUser) {
      // Update existing
      const updated = staffList.map(u => u.id === editingUser.id ? { ...u, ...userData } : u);
      setStaffList(updated);
      saveStoredStaff(updated);

      if (password || pin) {
        saveUserCredential(editingUser.id, password, pin, userData.must_change_password);
      }

      const updatedUser = updated.find(u => u.id === editingUser.id);
      if (updatedUser) {
        await upsertStaffAccountToCloud(updatedUser, password, pin);
      } else {
        await syncStaffAccountToSupabase(updated);
      }

      addAuditEntry({
        user_name: profile?.full_name || 'Nali Admin',
        user_role: profile?.role?.name || 'Administrator',
        action: `Updated profile details for staff member "${userData.full_name}"`,
        module: 'Administration',
        target: userData.full_name,
        severity: 'info'
      });
      toast.success(t('admin.users.updatedSuccess', `Staff member "${userData.full_name}" updated successfully (Cloud Synced)`));
    } else {
      // Create new user using unified registration
      const newUser = registerStaffUser({
        full_name: userData.full_name || 'New Staff',
        username: userData.username,
        email: userData.email,
        phone: userData.phone,
        role_id: userData.role_id || 'role-cashier',
        branch_id: userData.branch_id || 'branch-1',
        password: password || 'cashier123',
        pin: pin || '1234',
        notes: userData.notes
      });

      const updated = getStoredStaff();
      setStaffList(updated);
      await upsertStaffAccountToCloud(newUser, password || 'cashier123', pin || '1234');
      toast.success(t('admin.users.createdSuccess', `Account for "${newUser.full_name}" created as ${newUser.role?.name} (Cloud Synced)`));
    }
  };

  // Filter audit logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (auditSearch) {
        const q = auditSearch.toLowerCase();
        const m1 = log.user_name?.toLowerCase().includes(q);
        const m2 = log.action?.toLowerCase().includes(q);
        const m3 = log.target?.toLowerCase().includes(q);
        const m4 = log.module?.toLowerCase().includes(q);
        if (!m1 && !m2 && !m3 && !m4) return false;
      }
      if (auditSeverity !== 'ALL' && log.severity !== auditSeverity) {
        return false;
      }
      return true;
    });
  }, [auditLogs, auditSearch, auditSeverity]);

  const exportAuditToCSV = () => {
    const headers = ['Timestamp', 'User', 'Role', 'Action', 'Module', 'Target', 'Severity', 'IP Address'];
    const rows = filteredAuditLogs.map(l => [
      l.created_at,
      `"${l.user_name || ''}"`,
      `"${l.user_role || ''}"`,
      `"${l.action || ''}"`,
      `"${l.module || ''}"`,
      `"${l.target || ''}"`,
      l.severity,
      l.ip_address || ''
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NALI_POS_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${(filteredAuditLogs?.length || 0)} audit records`);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 p-3 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111827] border border-[#334155]/60 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1 z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <ShieldCheck className="w-7 h-7 text-indigo-400" />
              {t('admin.header.title', 'Administration & Security Center')}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {t('admin.header.systemSecure', 'System Secure • 0 Threats')}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            {t('admin.header.subtitle', 'Configure staff accounts, role permissions (RBAC), terminal hardware authorization & security audit logs.')}
          </p>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center flex-wrap gap-2.5 z-10">
          <CloudStatusBadge
            onRefresh={async () => {
              setIsSyncingAdmin(true);
              await syncAdminWithCloud();
              setStaffList(getStoredStaff());
              setAuditLogs(getStoredAuditLogs());
              setIsSyncingAdmin(false);
              toast.success('Admin roles, staff & audit logs synced with cloud');
            }}
            tableName="audit_logs"
            isRefreshing={isSyncingAdmin}
          />

          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setIsMigrationModalOpen(true);
            }}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-cyan-400 rounded-2xl text-xs font-medium border border-slate-700 transition-all cursor-pointer shadow-md"
            title="Database Schema & SQL Migration"
          >
            <Database className="w-4 h-4" />
          </button>

          <button
            id="btn-storage-cleanup-admin"
            type="button"
            onClick={() => {
              sound.playClick();
              setIsStorageCleanupOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white text-sm font-bold border border-slate-700 transition-all flex items-center gap-2 shadow-md cursor-pointer"
            title={t('storageCleanup.modalTitle', 'Supabase Storage & Database Cleanup Utility')}
          >
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <span>{t('storageCleanup.reclaimableSpace', 'Storage Cleanup')}</span>
          </button>

          <button
            id="add-staff-top-btn"
            onClick={handleOpenAddUser}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('admin.header.addStaff', 'Add Staff Member')}</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics Bar (4 Stat Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Staff */}
        <div className="bg-[#111827] border border-[#334155]/60 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('admin.metrics.activeStaff', 'Active Staff')}</span>
            <span className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">{totalStaffCount}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-slate-500" />
                <span>{t('admin.metrics.acrossBranches', { count: (INITIAL_BRANCHES?.length || 0), defaultValue: `Across ${(INITIAL_BRANCHES?.length || 0)} branch stores` })}</span>
              </span>
              {archivedStaffCount > 0 && (
                <span className="text-slate-500">{t('admin.metrics.archivedCount', { count: archivedStaffCount, defaultValue: `(${archivedStaffCount} archived)` })}</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Active Now */}
        <div className="bg-[#111827] border border-[#334155]/60 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('admin.metrics.activeOnline', 'Active Online')}</span>
            <span className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono flex items-center gap-2">
              {activeStaffNowCount}
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-emerald-500/70" />
              <span>{t('admin.metrics.checkedIn15m', 'Checked-in within 15m')}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Role Breakdown */}
        <div className="bg-[#111827] border border-[#334155]/60 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('admin.metrics.roleGroups', 'Role Groups')}</span>
            <span className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <SlidersHorizontal className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">{(INITIAL_ROLES?.length || 0)}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 truncate">
              <span>{t('admin.metrics.roleGroupsDesc', 'Admin, POS, Tech, Stock')}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Security & Credentials */}
        <div 
          onClick={() => setActiveTab('devices')}
          className="bg-[#111827] border border-[#334155]/60 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-all cursor-pointer"
          title="View and manage connected devices"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('admin.metrics.activeTerminals', 'Active Terminals')}</span>
            <span className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Smartphone className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">{activeSessionsCount}</div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
              <span>{t('admin.metrics.tempPasswords', { count: pendingResetCount, defaultValue: `${pendingResetCount} temp passwords active` })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[#334155]/60 pb-3 overflow-x-auto no-scrollbar">
        <button
          id="admin-tab-staff"
          onClick={() => setActiveTab('users')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 select-none",
            activeTab === 'users'
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "bg-[#111827] text-slate-400 hover:text-white hover:bg-[#1E293B] border border-white/5"
          )}
        >
          <Users className="w-4 h-4" />
          <span>{t('admin.tabs.staff', 'Staff Management')}</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono">
            {totalStaffCount}
          </span>
        </button>

        <button
          id="admin-tab-roles"
          onClick={() => setActiveTab('roles')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 select-none",
            activeTab === 'roles'
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "bg-[#111827] text-slate-400 hover:text-white hover:bg-[#1E293B] border border-white/5"
          )}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{t('admin.tabs.roles', 'Roles & Permissions (RBAC)')}</span>
        </button>

        <button
          id="admin-tab-security"
          onClick={() => setActiveTab('security')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 select-none",
            activeTab === 'security'
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "bg-[#111827] text-slate-400 hover:text-white hover:bg-[#1E293B] border border-white/5"
          )}
        >
          <KeyRound className="w-4 h-4" />
          <span>{t('admin.tabs.security', 'Password & Security Center')}</span>
        </button>

        <button
          id="admin-tab-devices"
          onClick={() => setActiveTab('devices')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 select-none",
            activeTab === 'devices'
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "bg-[#111827] text-slate-400 hover:text-white hover:bg-[#1E293B] border border-white/5"
          )}
        >
          <MonitorSmartphone className="w-4 h-4" />
          <span>{t('admin.tabs.connectedDevices', 'Connected Devices')}</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono">
            {activeSessionsCount}
          </span>
        </button>

        <button
          id="admin-tab-audit"
          onClick={() => setActiveTab('audit')}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 select-none",
            activeTab === 'audit'
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "bg-[#111827] text-slate-400 hover:text-white hover:bg-[#1E293B] border border-white/5"
          )}
        >
          <History className="w-4 h-4" />
          <span>{t('admin.tabs.audit', 'Audit & Activity Logs')}</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono">
            {(auditLogs?.length || 0)}
          </span>
        </button>
      </div>

      {/* TAB 1: Staff Directory (Responsive Table for Desktop, Card List for Mobile) */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-[#111827] border border-[#334155]/60 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
            {/* Search Input */}
            <div className="flex-1 min-w-[240px]">
              <SearchInput
                id="staff-search-input"
                placeholder={t('admin.filters.searchPlaceholder', 'Search staff by name, @username, email, or role...')}
                value={searchQuery}
                onChangeValue={setSearchQuery}
              />
            </div>

            {/* Role Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedRoleFilter}
                onChange={e => setSelectedRoleFilter(e.target.value)}
                className="bg-[#0B0F19] border border-[#334155] rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">{t('admin.filters.allRoles', 'All Roles')}</option>
                {getStoredRoles().map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>

              {/* Branch Filter */}
              <select
                value={selectedBranchFilter}
                onChange={e => setSelectedBranchFilter(e.target.value)}
                className="bg-[#0B0F19] border border-[#334155] rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">{t('admin.filters.allBranches', 'All Branches')}</option>
                {INITIAL_BRANCHES.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={e => setSelectedStatusFilter(e.target.value)}
                className="bg-[#0B0F19] border border-[#334155] rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">{t('admin.filters.allStatuses', 'All Statuses')}</option>
                <option value="active">{t('admin.table.active', 'Active')}</option>
                <option value="suspended">{t('admin.table.locked', 'Locked')}</option>
                <option value="pending">{t('admin.table.tempPass', 'Temp Password')}</option>
                <option value="inactive">{t('admin.filters.inactiveArchived', 'Inactive / Archived')}</option>
              </select>

              {/* Hide Archived Toggle */}
              <label className="flex items-center gap-2 px-3 py-2 bg-[#0B0F19] border border-[#334155] rounded-xl text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideArchived}
                  onChange={e => setHideArchived(e.target.checked)}
                  className="rounded border-slate-600 text-indigo-600 focus:ring-0"
                />
                <span>{hideArchived ? t('admin.filters.hideArchived', 'Hide Archived') : t('admin.filters.showArchived', 'Show Archived')}</span>
              </label>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <UserTable
              users={filteredStaff}
              onEditUser={handleEditUser}
              onResetPassword={handleResetPassword}
              onToggleStatus={handleToggleStatus}
              onDeleteUser={handleDeleteUserClick}
              onRestoreUser={handleRestoreUser}
              onRevokeSessions={handleRevokeUserSessions}
              onBulkStatusChange={handleBulkStatusChange}
            />
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden">
            <UserCardList
              users={filteredStaff}
              onEditUser={handleEditUser}
              onResetPassword={handleResetPassword}
              onToggleStatus={handleToggleStatus}
              onDeleteUser={handleDeleteUserClick}
              onRestoreUser={handleRestoreUser}
              onRevokeSessions={handleRevokeUserSessions}
            />
          </div>
        </div>
      )}

      {/* TAB 2: Roles & Permissions Matrix */}
      {activeTab === 'roles' && (
        <RoleMatrix staffListCountByRole={staffCountByRole} />
      )}

      {/* TAB 3: Password & Security Center */}
      {activeTab === 'security' && (
        <SecurityCenter />
      )}

      {/* TAB 4: Audit & Activity Logs */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-[#111827] border border-[#334155]/60 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
            {/* Search Input */}
            <div className="flex-1 min-w-[240px]">
              <SearchInput
                id="audit-search-input"
                placeholder={t('admin.audit.searchLogs', 'Search logs by action, target or staff name...')}
                value={auditSearch}
                onChangeValue={setAuditSearch}
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={auditSeverity}
                onChange={e => setAuditSeverity(e.target.value)}
                className="bg-[#0B0F19] border border-[#334155] rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">{t('admin.audit.allSeverities', 'All Severities')}</option>
                <option value="info">{t('admin.audit.info', 'Info')}</option>
                <option value="warning">{t('admin.audit.warning', 'Warning')}</option>
                <option value="danger">{t('admin.audit.danger', 'Critical / Danger')}</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setIsStorageCleanupOpen(true);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
              >
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('storageCleanup.purgeLogsBtn', 'Purge Stale Logs / Storage')}</span>
              </button>

              <button
                onClick={exportAuditToCSV}
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                {t('admin.audit.exportCsv', 'Export Audit CSV')}
              </button>
            </div>
          </div>

          {/* Audit Logs List */}
          <div className="bg-[#111827] border border-[#334155]/60 rounded-2xl overflow-hidden shadow-xl divide-y divide-[#334155]/40">
            {(filteredAuditLogs?.length || 0) === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                {t('admin.audit.noLogs', 'No matching audit logs found.')}
              </div>
            ) : (
              filteredAuditLogs.map(log => (
                <div 
                  key={log.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-white/[0.01] transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <span className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                      log.severity === 'danger' ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                      log.severity === 'warning' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      log.severity === 'success' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    )}>
                      {log.severity === 'danger' ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                    </span>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{log.action}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/5 text-slate-400 border border-white/5">
                          {log.module}
                        </span>
                      </div>

                      {log.target && (
                        <div className="text-xs text-indigo-300 font-medium mt-0.5">
                          Target: {log.target}
                        </div>
                      )}

                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-1">
                        <span className="font-semibold text-slate-300">{log.user_name}</span>
                        <span>({log.user_role})</span>
                        {log.ip_address && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-slate-500">{log.ip_address}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 text-xs text-slate-500 self-end sm:self-center font-mono">
                    {new Date(log.created_at).toLocaleString([], {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: Connected Devices & Remote Session Revocation */}
      {activeTab === 'devices' && <ConnectedDevices />}

      {/* Floating Action Button for Mobile */}
      {activeTab === 'users' && (
        <button
          id="mobile-add-staff-fab"
          onClick={handleOpenAddUser}
          className="fixed bottom-6 right-6 md:hidden z-40 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-600/60 flex items-center justify-center border-2 border-indigo-400 active:scale-95 transition-all"
          aria-label="Add Staff"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* User Edit & Credentials Modal */}
      <UserEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={editingUser}
        initialTab={modalInitialTab}
        onSaveUser={handleSaveUser}
      />

      {/* Deletion & Soft-Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        target={deleteTarget}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />

      {/* Supabase Storage & Database Cleanup Modal */}
      <StorageCleanupModal
        isOpen={isStorageCleanupOpen}
        onClose={() => setIsStorageCleanupOpen(false)}
        onScanComplete={() => {
          setAuditLogs(getStoredAuditLogs());
        }}
      />

      {/* Supabase SQL Migration Modal */}
      <MigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
      />
    </div>
  );
}
