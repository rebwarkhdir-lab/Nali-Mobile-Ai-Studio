import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  MoreVertical, Edit3, KeyRound, ShieldAlert, ShieldCheck, 
  Trash2, Phone, Mail, Building2, Smartphone, Lock, Unlock, 
  CheckCircle, AlertCircle, Clock, Copy, Check, RotateCcw, Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AdminUser, UserStatus } from './types';
import { cn } from '../../lib/utils';
import { useToast } from '../../components/common/Toast';

interface UserCardListProps {
  users: AdminUser[];
  onEditUser: (user: AdminUser) => void;
  onResetPassword: (user: AdminUser) => void;
  onToggleStatus: (user: AdminUser, newStatus: UserStatus) => void;
  onDeleteUser: (user: AdminUser) => void;
  onRestoreUser?: (user: AdminUser) => void;
  onRevokeSessions: (user: AdminUser) => void;
}

export default function UserCardList({
  users = [],
  onEditUser,
  onResetPassword,
  onToggleStatus,
  onDeleteUser,
  onRestoreUser,
  onRevokeSessions
}: UserCardListProps) {
  const safeUsers = Array.isArray(users) ? users : [];
  const { t } = useTranslation();
  const toast = useToast();
  const [selectedUserForSheet, setSelectedUserForSheet] = useState<AdminUser | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast.success(t('admin.copiedToClipboard', 'Copied {{label}} to clipboard', { label }));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadge = (user: AdminUser) => {
    if (user.deleted_at || user.status === 'inactive') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800/90 text-slate-400 border border-slate-700">
          <Archive className="w-3 h-3 text-slate-400" />
          {t('admin.users.deactivated', 'Deactivated')}
        </span>
      );
    }

    switch (user.status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse" />
            {t('admin.users.active', 'Active')}
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {t('admin.users.suspended', 'Suspended')}
          </span>
        );
      case 'locked':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            {t('admin.users.locked', 'Locked')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            {t('admin.users.inactive', 'Inactive')}
          </span>
        );
    }
  };

  const getRoleColor = (roleName?: string) => {
    if (!roleName) return 'bg-slate-800 text-slate-300 border-slate-700';
    if (roleName.includes('Admin')) return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
    if (roleName.includes('Manager')) return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
    if (roleName.includes('Cashier') || roleName.includes('POS')) return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
    if (roleName.includes('Tech') || roleName.includes('Repair')) return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
  };

  const getInitials = (name?: string) => {
    if (!name || typeof name !== 'string') return '??';
    return name
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  if ((safeUsers?.length || 0) === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[#111827] border border-[#334155]/40 rounded-2xl text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-white/5 flex items-center justify-center mb-3">
          <ShieldAlert className="w-7 h-7 text-slate-400" />
        </div>
        <h4 className="text-base font-semibold text-white">{t('admin.users.noStaffFound', 'No Staff Accounts Found')}</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          {t('admin.users.noStaffFoundDesc', 'No team members match your current search and filter criteria.')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-24">
      {safeUsers.map(user => {
        const initials = getInitials(user.full_name);
        const isOnline = user.status === 'active' && user.last_activity_at && (Date.now() - new Date(user.last_activity_at).getTime() < 1000 * 60 * 15);
        const isDeactivated = !!user.deleted_at || user.status === 'inactive';

        return (
          <motion.div
            key={user.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "bg-[#111827] hover:bg-[#151D30] border border-[#334155]/50 rounded-2xl p-4 transition-all shadow-lg relative overflow-hidden",
              isDeactivated && "opacity-65 bg-slate-900/60"
            )}
          >
            {/* Top row: Avatar, Name, Role Badge, 3-dot */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-inner border border-white/10",
                    user.role?.name?.includes('Admin') ? "bg-gradient-to-br from-indigo-600 to-indigo-900" :
                    user.role?.name?.includes('Manager') ? "bg-gradient-to-br from-blue-600 to-blue-900" :
                    user.role?.name?.includes('Cashier') ? "bg-gradient-to-br from-emerald-600 to-emerald-900" :
                    user.role?.name?.includes('Tech') ? "bg-gradient-to-br from-amber-600 to-amber-900" :
                    "bg-gradient-to-br from-slate-700 to-slate-900"
                  )}>
                    {initials}
                  </div>
                  {isOnline && (
                    <span 
                      title={t('admin.users.activeRightNow', 'Active right now')}
                      className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#111827] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={cn("text-sm font-bold text-white truncate", isDeactivated && "line-through text-slate-400")}>
                      {user.full_name}
                    </h3>
                    {(user.is_new || (user.created_at && Date.now() - new Date(user.created_at).getTime() < 24 * 60 * 60 * 1000)) && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                        NEW
                      </span>
                    )}
                    {getStatusBadge(user)}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[11px] font-semibold border tracking-tight",
                      getRoleColor(user.role?.name)
                    )}>
                      {user.role?.name || t('admin.users.staffMember', 'Staff Member')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Trigger */}
              <button
                id={`staff-action-sheet-trigger-${user.id}`}
                onClick={() => setSelectedUserForSheet(user)}
                className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/10 active:scale-95 border border-white/5 flex items-center justify-center text-slate-300 hover:text-white transition-all shrink-0 cursor-pointer"
                aria-label="User Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            {/* Info Grid */}
            <div className="mt-3.5 pt-3 border-t border-white/[0.06] grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400 truncate">
                <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{user.branch?.name || t('admin.users.mainTerminalHQ', 'Main Terminal (HQ)')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 truncate">
                <Smartphone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{user.last_device || t('admin.users.terminal01', 'Terminal 01')}</span>
              </div>
            </div>

            {/* Contact & Activity pill */}
            <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-1 truncate">
                <Clock className="w-3 h-3 text-slate-600 shrink-0" />
                <span className="truncate">
                  {user.last_login_at ? `${t('admin.users.seen', 'Seen')} ${new Date(user.last_login_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : t('admin.users.noLoginYet', 'No login yet')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {user.email && (
                  <button
                    onClick={() => copyToClipboard(user.email!, 'Email')}
                    className="p-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title={user.email}
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </button>
                )}
                {user.phone && (
                  <a
                    href={`tel:${user.phone}`}
                    className="p-1 text-slate-400 hover:text-emerald-400 transition-colors"
                    title={user.phone}
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Mobile Action Sheet Modal */}
      <AnimatePresence>
        {selectedUserForSheet && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUserForSheet(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-[#0F172A] border-t sm:border border-[#334155] rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl z-10 overflow-hidden"
            >
              {/* Drag handle */}
              <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

              {/* User Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold">
                    {getInitials(selectedUserForSheet.full_name)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base leading-tight">
                      {selectedUserForSheet.full_name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedUserForSheet.role?.name || t('admin.users.staff', 'Staff')} • {selectedUserForSheet.branch?.name || t('admin.users.mainBranch', 'Main Branch')}
                    </p>
                  </div>
                </div>

                {getStatusBadge(selectedUserForSheet)}
              </div>

              {/* Actions List */}
              <div className="py-3 space-y-1.5">
                {(selectedUserForSheet.deleted_at || selectedUserForSheet.status === 'inactive') && onRestoreUser ? (
                  <button
                    id="mobile-action-restore-account"
                    onClick={() => {
                      const target = selectedUserForSheet;
                      setSelectedUserForSheet(null);
                      onRestoreUser(target);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-emerald-300 text-sm font-medium transition-colors border border-emerald-500/30 cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div className="text-left flex-1">
                      <div className="text-white font-semibold">{t('admin.users.restoreAccount', 'Restore Staff Account')}</div>
                      <div className="text-xs text-emerald-300/80">{t('admin.users.restoreAccountDesc', 'Reactivate login and clear archived status')}</div>
                    </div>
                  </button>
                ) : (
                  <>
                    <button
                      id="mobile-action-edit-profile"
                      onClick={() => {
                        const target = selectedUserForSheet;
                        setSelectedUserForSheet(null);
                        onEditUser(target);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/10 text-slate-200 text-sm font-medium transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                        <Edit3 className="w-4 h-4" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="text-white font-semibold">{t('admin.users.editProfile', 'Edit Staff Profile')}</div>
                        <div className="text-xs text-slate-400">{t('admin.users.editProfileDesc', 'Change role, branch assignment, name & contact')}</div>
                      </div>
                    </button>

                    <button
                      id="mobile-action-reset-password"
                      onClick={() => {
                        const target = selectedUserForSheet;
                        setSelectedUserForSheet(null);
                        onResetPassword(target);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/10 text-slate-200 text-sm font-medium transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="text-white font-semibold">{t('admin.users.resetPasswordSec', 'Reset Password & Security')}</div>
                        <div className="text-xs text-slate-400">{t('admin.users.resetPasswordSecDesc', 'Generate secure PIN or temporary credentials')}</div>
                      </div>
                    </button>

                    <button
                      id="mobile-action-revoke-sessions"
                      onClick={() => {
                        const target = selectedUserForSheet;
                        setSelectedUserForSheet(null);
                        onRevokeSessions(target);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/10 text-slate-200 text-sm font-medium transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="text-white font-semibold">{t('admin.users.activeDeviceSessions', 'Active Device Sessions')}</div>
                        <div className="text-xs text-slate-400">{t('admin.users.activeDeviceSessionsDesc', 'Revoke terminal authorization & force sign out')}</div>
                      </div>
                    </button>

                    {selectedUserForSheet.status === 'active' ? (
                      <button
                        id="mobile-action-suspend-account"
                        onClick={() => {
                          const target = selectedUserForSheet;
                          setSelectedUserForSheet(null);
                          onToggleStatus(target, 'suspended');
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 text-amber-300 text-sm font-medium transition-colors border border-amber-500/20 cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div className="text-left flex-1">
                          <div className="text-amber-300 font-semibold">{t('admin.users.suspendAccount', 'Suspend Account')}</div>
                          <div className="text-xs text-amber-400/70">{t('admin.users.suspendAccountDesc', 'Block login immediately without deleting data')}</div>
                        </div>
                      </button>
                    ) : (
                      <button
                        id="mobile-action-activate-account"
                        onClick={() => {
                          const target = selectedUserForSheet;
                          setSelectedUserForSheet(null);
                          onToggleStatus(target, 'active');
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-300 text-sm font-medium transition-colors border border-emerald-500/20 cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                          <Unlock className="w-4 h-4" />
                        </div>
                        <div className="text-left flex-1">
                          <div className="text-emerald-300 font-semibold">{t('admin.users.activateAccount', 'Activate Account')}</div>
                          <div className="text-xs text-emerald-400/70">{t('admin.users.activateAccountDesc', 'Restore access and permit terminal check-in')}</div>
                        </div>
                      </button>
                    )}
                  </>
                )}

                <button
                  id="mobile-action-delete-user"
                  onClick={() => {
                    const target = selectedUserForSheet;
                    setSelectedUserForSheet(null);
                    onDeleteUser(target);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 text-sm font-medium transition-colors border border-rose-500/20 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-rose-400 font-semibold">
                      {selectedUserForSheet.deleted_at || selectedUserForSheet.status === 'inactive' ? t('admin.users.purgeRecord', 'Purge Record') : t('admin.users.removeDeactivate', 'Remove / Deactivate')}
                    </div>
                    <div className="text-xs text-rose-400/70">
                      {selectedUserForSheet.deleted_at || selectedUserForSheet.status === 'inactive' ? t('admin.users.purgeRecordDesc', 'Permanently remove user') : t('admin.users.removeDeactivateDesc', 'Soft-delete and revoke access')}
                    </div>
                  </div>
                </button>
              </div>

              {/* Close Sheet button */}
              <button
                onClick={() => setSelectedUserForSheet(null)}
                className="w-full mt-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold transition-colors cursor-pointer"
              >
                {t('admin.users.dismiss', 'Dismiss')}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
