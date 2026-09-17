import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  AlertTriangle, Trash2, ShieldAlert, Archive, CheckCircle2, 
  X, UserX, Shield, Building2, Mail, Info, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AdminUser, AdminRole, Role } from './types';
import { cn } from '../../lib/utils';

export interface DeleteModalTarget {
  type: 'user' | 'role';
  user?: AdminUser | null;
  role?: AdminRole | null;
  assignedCount?: number;
}

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: DeleteModalTarget | null;
  onConfirm?: (target: DeleteModalTarget, mode: 'soft' | 'permanent') => Promise<void> | void;
  onConfirmUserDelete?: (user: AdminUser, mode: 'soft' | 'permanent') => Promise<void> | void;
  onConfirmRoleDelete?: (role: AdminRole) => Promise<void> | void;
  isLoading?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  target,
  onConfirm,
  onConfirmUserDelete,
  onConfirmRoleDelete,
  isLoading
}: DeleteConfirmationModalProps) {
  const { t } = useTranslation();
  const [deleteMode, setDeleteMode] = useState<'soft' | 'permanent'>('soft');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmNameInput, setConfirmNameInput] = useState('');

  if (!isOpen || !target) return null;

  const isUser = target.type === 'user' && target.user;
  const isRole = target.type === 'role' && target.role;

  const user = target.user;
  const role = target.role;
  const isSystemRole = isRole && (role?.is_system || role?.id === 'role-admin');
  const hasAssignedUsers = isRole && (target.assignedCount || 0) > 0;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      if (onConfirm) {
        await onConfirm(target, deleteMode);
      } else if (isUser && user && onConfirmUserDelete) {
        await onConfirmUserDelete(user, deleteMode);
      } else if (isRole && role && onConfirmRoleDelete) {
        await onConfirmRoleDelete(role);
      }
      onClose();
    } catch (err) {
      console.error('[NALI POS Deletion Dialog Error]:', err);
    } finally {
      setIsProcessing(false);
      setConfirmNameInput('');
    }
  };

  const targetName = isUser ? user?.full_name : role?.name;
  const requiresTypeToConfirm = deleteMode === 'permanent' || isRole;
  const isConfirmDisabled = (requiresTypeToConfirm && confirmNameInput.trim().toLowerCase() !== (targetName || '').trim().toLowerCase()) || isSystemRole || hasAssignedUsers || isProcessing || isLoading;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isProcessing && !isLoading && onClose()}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-[#0F172A] border border-[#334155] rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(0,0,0,0.8)] z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3.5">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
                deleteMode === 'soft' && isUser 
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              )}>
                {isUser ? <UserX className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              </div>

              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {isUser 
                    ? (deleteMode === 'soft' ? t('admin.deleteModal.deactivateStaff', 'Deactivate & Archive Staff Member') : t('admin.deleteModal.purgeStaff', 'Permanently Delete Staff Member')) 
                    : t('admin.deleteModal.deleteRole', 'Delete Custom Role')}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isUser 
                    ? t('admin.deleteModal.manageCreds', 'Manage POS credentials, user status & database relations') 
                    : t('admin.deleteModal.removeRole', 'Remove security role and matrix privileges')}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isProcessing || isLoading}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User / Role Summary Card */}
          <div className="mt-5 p-4 rounded-2xl bg-[#111827] border border-[#334155]/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-300 shrink-0">
                {isUser ? user?.full_name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() : <Shield className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">{targetName}</div>
                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                  {isUser ? (
                    <>
                      <span>{user?.role?.name || t('admin.users.staff', 'Staff')}</span>
                      <span>•</span>
                      <span>{user?.branch?.name || t('admin.users.mainBranch', 'Main Branch')}</span>
                    </>
                  ) : (
                    <span>{t('admin.roles.assignedCount', { count: target?.assignedCount ?? role?.user_count ?? 0, defaultValue: `${target?.assignedCount ?? role?.user_count ?? 0} active staff members assigned` })}</span>
                  )}
                </div>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 text-slate-300 border border-white/5 uppercase tracking-wider shrink-0 font-mono">
              ID: {isUser ? user?.id : role?.id}
            </span>
          </div>

          {/* System Role Lock Warning */}
          {isSystemRole && (
            <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-200 text-xs leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <b className="font-semibold text-amber-300">{t('admin.deleteModal.protectedTitle', 'Protected System Role:')}</b> {t('admin.deleteModal.protectedDesc', 'This is a core factory role required for POS operational integrity and cannot be deleted.')}
              </div>
            </div>
          )}

          {/* Role has assigned staff warning */}
          {hasAssignedUsers && !isSystemRole && (
            <div className="mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-200 text-xs leading-relaxed">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <b className="font-semibold text-rose-300">{t('admin.deleteModal.reassignTitle', 'Foreign Key Restriction:')}</b> {t('admin.deleteModal.reassignDesc', 'There are active staff members assigned to this role. You must reassign those staff members to another role before this role can be removed.')}
              </div>
            </div>
          )}

          {/* Mode Selector (For Users: Soft Delete vs Permanent Delete) */}
          {isUser && (
            <div className="mt-5 space-y-3">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {t('admin.deleteModal.selectStrategy', 'Select Removal Strategy')}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Soft Delete (Recommended) */}
                <div
                  onClick={() => setDeleteMode('soft')}
                  className={cn(
                    "p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between",
                    deleteMode === 'soft'
                      ? "bg-amber-950/30 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/50"
                      : "bg-[#111827] border-[#334155]/60 hover:border-white/20 hover:bg-[#141C2E]"
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                      <Archive className="w-3.5 h-3.5 text-amber-400" />
                      {t('admin.deleteModal.softDelete', 'Soft-Delete (Archive)')}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 uppercase">
                      {t('admin.deleteModal.recommended', 'Recommended')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {t('admin.deleteModal.softDeleteDesc', 'Deactivates credentials immediately while safely preserving historical sales, cashier receipts, invoices & audit tickets.')}
                  </p>
                </div>

                {/* Option 2: Permanent Purge */}
                <div
                  onClick={() => setDeleteMode('permanent')}
                  className={cn(
                    "p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between",
                    deleteMode === 'permanent'
                      ? "bg-rose-950/30 border-rose-500/80 shadow-[0_0_15px_rgba(239,68,68,0.15)] ring-1 ring-rose-500/50"
                      : "bg-[#111827] border-[#334155]/60 hover:border-white/20 hover:bg-[#141C2E]"
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      {t('admin.deleteModal.permanentPurge', 'Permanent Purge')}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 uppercase">
                      {t('admin.deleteModal.highRisk', 'High Risk')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {t('admin.deleteModal.permanentDesc', 'Completely destroys user row. Should only be used for test accounts or mistaken duplicate entries.')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Database Integrity Notice & Explanation */}
          <div className="mt-4 p-3.5 rounded-2xl bg-slate-900/80 border border-white/5 flex items-start gap-2.5 text-xs text-slate-400">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              {deleteMode === 'soft' && isUser ? (
                <span>
                  <b>{t('admin.deleteModal.safetyTitle', 'Foreign Key Safety:')}</b> {t('admin.deleteModal.safetyDesc', 'Soft-deleting marks user as inactive and sets archive timestamp. Existing transaction logs remain untouched.')}
                </span>
              ) : (
                <span>
                  <b>{t('admin.deleteModal.cautionTitle', 'Caution:')}</b> {t('admin.deleteModal.cautionDesc', 'Permanent deletion removes the record entirely. If this user has processed sales, database constraints may reject hard-deletion.')}
                </span>
              )}
            </div>
          </div>

          {/* Type Name to Confirm Input (when in permanent mode or role deletion) */}
          {requiresTypeToConfirm && !isSystemRole && !hasAssignedUsers && (
            <div className="mt-4 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                {t('admin.deleteModal.typeToConfirm', 'To confirm permanent deletion, type')} <span className="text-rose-400 font-mono font-bold select-all">"{targetName}"</span> {t('admin.deleteModal.below', 'below:')}
              </label>
              <input
                type="text"
                value={confirmNameInput}
                onChange={e => setConfirmNameInput(e.target.value)}
                placeholder={`${t('admin.deleteModal.typePlaceholder', 'Type')} "${targetName}"`}
                className="w-full bg-[#111827] border border-[#334155] rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing || isLoading}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              {t('common.cancel', 'Cancel')}
            </button>

            <button
              id="confirm-remove-action-btn"
              type="button"
              onClick={handleConfirm}
              disabled={isConfirmDisabled}
              className={cn(
                "px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-lg flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none active:scale-95",
                deleteMode === 'soft' && isUser 
                  ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/30" 
                  : "bg-rose-600 hover:bg-rose-500 shadow-rose-600/30"
              )}
            >
              {(isProcessing || isLoading) ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('admin.deleteModal.processing', 'Processing Deletion...')}</span>
                </>
              ) : (
                <>
                  {deleteMode === 'soft' && isUser ? <Archive className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>
                    {isUser 
                      ? (deleteMode === 'soft' ? t('admin.deleteModal.confirmSoft', 'Confirm Deactivate & Archive') : t('admin.deleteModal.confirmHard', 'Confirm Permanent Remove')) 
                      : t('admin.deleteModal.confirmRole', 'Confirm Remove Role')}
                  </span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
