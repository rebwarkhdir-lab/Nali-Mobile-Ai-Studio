import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ArrowUpDown, ArrowUp, ArrowDown, Edit2, KeyRound, 
  Trash2, Lock, Unlock, Smartphone, Mail, Phone, 
  Building2, Shield, MoreHorizontal, CheckSquare, Square, 
  ChevronLeft, ChevronRight, Download, Filter, Search, Check, Copy, RotateCcw, Archive
} from 'lucide-react';
import { AdminUser, UserStatus } from './types';
import { cn } from '../../lib/utils';
import { useToast } from '../../components/common/Toast';

interface UserTableProps {
  users: AdminUser[];
  onEditUser: (user: AdminUser) => void;
  onResetPassword: (user: AdminUser) => void;
  onToggleStatus: (user: AdminUser, newStatus: UserStatus) => void;
  onDeleteUser: (user: AdminUser) => void;
  onRestoreUser?: (user: AdminUser) => void;
  onRevokeSessions: (user: AdminUser) => void;
  onBulkStatusChange?: (userIds: string[], status: UserStatus) => void;
}

type SortField = 'full_name' | 'role' | 'branch' | 'status' | 'last_login_at' | 'created_at';
type SortOrder = 'asc' | 'desc';

export default function UserTable({
  users = [],
  onEditUser,
  onResetPassword,
  onToggleStatus,
  onDeleteUser,
  onRestoreUser,
  onRevokeSessions,
  onBulkStatusChange
}: UserTableProps) {
  const safeUsers = Array.isArray(users) ? users : [];
  const { t } = useTranslation();
  const toast = useToast();
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = () => {
    if ((safeUsers?.length || 0) > 0 && (selectedUserIds?.length || 0) === (safeUsers?.length || 0)) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds((safeUsers || []).map(u => u.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Sort users
  const sortedUsers = [...safeUsers].sort((a, b) => {
    let aValue: any = a[sortField as keyof AdminUser] || '';
    let bValue: any = b[sortField as keyof AdminUser] || '';

    if (sortField === 'role') {
      aValue = a.role?.name || '';
      bValue = b.role?.name || '';
    } else if (sortField === 'branch') {
      aValue = a.branch?.name || '';
      bValue = b.branch?.name || '';
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil((sortedUsers?.length || 0) / pageSize));
  const paginatedUsers = (sortedUsers || []).slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusBadge = (user: AdminUser) => {
    if (user.deleted_at || user.status === 'inactive') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800/90 text-slate-400 border border-slate-700">
          <Archive className="w-3 h-3 text-slate-400" />
          {t('admin.filters.inactiveArchived', 'Deactivated')}
        </span>
      );
    }

    switch (user.status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse" />
            {t('admin.table.active', 'Active')}
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {t('admin.table.tempPass', 'Suspended')}
          </span>
        );
      case 'locked':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            {t('admin.table.locked', 'Locked')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            {t('admin.table.inactive', 'Inactive')}
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

  const exportSelectedToCSV = () => {
    const dataToExport = sortedUsers.filter(u => selectedUserIds.includes(u.id));
    if ((dataToExport?.length || 0) === 0) {
      toast.error('No rows selected for export');
      return;
    }
    const headers = ['ID', 'Full Name', 'Username', 'Email', 'Phone', 'Role', 'Branch', 'Status', 'Deleted At', 'Created At'];
    const rows = dataToExport.map(u => [
      u.id,
      `"${u.full_name}"`,
      u.username || '',
      u.email || '',
      u.phone || '',
      u.role?.name || '',
      u.branch?.name || '',
      u.status,
      u.deleted_at || '',
      u.created_at
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NALI_POS_Staff_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${(dataToExport?.length || 0)} staff records to CSV`);
  };

  return (
    <div className="flex flex-col bg-[#111827] border border-[#334155]/60 rounded-2xl overflow-hidden shadow-xl">
      {/* Batch Action Toolbar */}
      {(selectedUserIds?.length || 0) > 0 && (
        <div className="bg-indigo-950/70 border-b border-indigo-500/30 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-sm text-indigo-200 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">
              {(selectedUserIds?.length || 0)}
            </span>
            <span>staff members selected</span>
          </div>

          <div className="flex items-center gap-2">
            {onBulkStatusChange && (
              <>
                <button
                  onClick={() => {
                    onBulkStatusChange(selectedUserIds, 'active');
                    setSelectedUserIds([]);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors flex items-center gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Activate Selected
                </button>
                <button
                  onClick={() => {
                    onBulkStatusChange(selectedUserIds, 'suspended');
                    setSelectedUserIds([]);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/30 transition-colors flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Suspend Selected
                </button>
              </>
            )}

            <button
              onClick={exportSelectedToCSV}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>

            <button
              onClick={() => setSelectedUserIds([])}
              className="text-xs text-indigo-300 hover:text-white px-2 py-1 transition-colors"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Responsive Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#0B0F19] text-slate-400 border-b border-[#334155]/60 text-xs uppercase tracking-wider select-none">
            <tr>
              <th className="px-5 py-4 w-12 text-center">
                <button 
                  onClick={handleSelectAll}
                  className="p-1 hover:text-white transition-colors focus:outline-none"
                  aria-label="Select all rows"
                >
                  {(selectedUserIds?.length || 0) === (safeUsers?.length || 0) && (safeUsers?.length || 0) > 0 ? (
                    <CheckSquare className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500" />
                  )}
                </button>
              </th>

              <th 
                onClick={() => handleSort('full_name')}
                className="px-5 py-4 font-semibold text-slate-300 hover:text-white cursor-pointer group transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>{t('admin.table.thStaff', 'Staff Member')}</span>
                  {sortField === 'full_name' ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                  )}
                </div>
              </th>

              <th 
                onClick={() => handleSort('role')}
                className="px-5 py-4 font-semibold text-slate-300 hover:text-white cursor-pointer group transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>{t('admin.table.thRole', 'Role & Access')}</span>
                  {sortField === 'role' ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                  )}
                </div>
              </th>

              <th 
                onClick={() => handleSort('branch')}
                className="px-5 py-4 font-semibold text-slate-300 hover:text-white cursor-pointer group transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>{t('admin.table.thBranch', 'Branch')}</span>
                  {sortField === 'branch' ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                  )}
                </div>
              </th>

              <th 
                onClick={() => handleSort('status')}
                className="px-5 py-4 font-semibold text-slate-300 hover:text-white cursor-pointer group transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>{t('admin.table.thSecurity', 'Security Status')}</span>
                  {sortField === 'status' ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                  )}
                </div>
              </th>

              <th 
                onClick={() => handleSort('last_login_at')}
                className="px-5 py-4 font-semibold text-slate-300 hover:text-white cursor-pointer group transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>{t('admin.table.thLastActive', 'Last Active')}</span>
                  {sortField === 'last_login_at' ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-400" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-400" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                  )}
                </div>
              </th>

              <th className="px-5 py-4 font-semibold text-slate-300 text-right">{t('admin.table.thActions', 'Actions')}</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#334155]/40 text-slate-300">
            {(paginatedUsers?.length || 0) === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-800/80 border border-white/5 mb-3 text-slate-400">
                    <Search className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">No Matching Staff Members</h4>
                  <p className="text-xs text-slate-500 mt-1">Try resetting filters or adding a new team member.</p>
                </td>
              </tr>
            ) : (
              paginatedUsers.map(user => {
                const isSelected = selectedUserIds.includes(user.id);
                const initials = getInitials(user.full_name);
                const isOnline = user.status === 'active' && user.last_activity_at && (Date.now() - new Date(user.last_activity_at).getTime() < 1000 * 60 * 15);
                const isDeactivated = !!user.deleted_at || user.status === 'inactive';

                return (
                  <tr 
                    key={user.id}
                    className={cn(
                      "hover:bg-[#1E293B]/60 transition-colors group",
                      isSelected && "bg-indigo-950/30",
                      isDeactivated && "opacity-60 hover:opacity-100 bg-slate-900/40"
                    )}
                  >
                    {/* Checkbox */}
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => handleToggleSelect(user.id)}
                        className="p-1 hover:text-white transition-colors focus:outline-none"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                        )}
                      </button>
                    </td>

                    {/* Staff info */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-inner border border-white/10 shrink-0",
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
                              title="Online now"
                              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#111827] rounded-full shadow-[0_0_6px_rgba(16,185,129,0.8)]"
                            />
                          )}
                        </div>

                        <div>
                          <div className="font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
                            <span className={cn(isDeactivated && "line-through text-slate-400")}>{user.full_name}</span>
                            {(user.is_new || (user.created_at && Date.now() - new Date(user.created_at).getTime() < 24 * 60 * 60 * 1000)) && (
                              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                                NEW
                              </span>
                            )}
                            {user.must_change_password && !isDeactivated && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20" title="Temporary Password Active">
                                Reset Required
                              </span>
                            )}
                            {isDeactivated && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">
                                Archived
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{user.username ? `@${user.username}` : user.email || 'No username'}</span>
                            {user.phone && <span>• {user.phone}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border",
                        getRoleColor(user.role?.name)
                      )}>
                        <Shield className="w-3 h-3 shrink-0" />
                        {user.role?.name || 'Standard Staff'}
                      </span>
                    </td>

                    {/* Branch */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                        <div>
                          <div className="font-medium text-xs text-slate-200">{user.branch?.name || 'Main Terminal (Erbil)'}</div>
                          <div className="text-[10px] text-slate-500">{user.branch?.code || 'EBL-HQ'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      {getStatusBadge(user)}
                    </td>

                    {/* Last Login & Device */}
                    <td className="px-5 py-3.5">
                      <div className="text-xs text-slate-300 font-medium">
                        {user.last_login_at ? new Date(user.last_login_at).toLocaleString([], {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : 'Never logged in'}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Smartphone className="w-3 h-3 shrink-0 text-slate-600" />
                        <span className="truncate max-w-[140px]">{user.last_device || 'Terminal'}</span>
                      </div>
                    </td>

                    {/* Action buttons */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        {isDeactivated && onRestoreUser ? (
                          <button
                            id={`restore-staff-btn-${user.id}`}
                            onClick={() => onRestoreUser(user)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                            title="Restore and Reactivate Account"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restore</span>
                          </button>
                        ) : (
                          <>
                            <button
                              id={`edit-staff-btn-${user.id}`}
                              onClick={() => onEditUser(user)}
                              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-indigo-600/20 text-slate-400 hover:text-indigo-300 border border-white/5 hover:border-indigo-500/30 transition-colors"
                              title="Edit Profile & Branch"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              id={`reset-pwd-btn-${user.id}`}
                              onClick={() => onResetPassword(user)}
                              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-blue-600/20 text-slate-400 hover:text-blue-300 border border-white/5 hover:border-blue-500/30 transition-colors"
                              title="Generate Password / PIN"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>

                            <button
                              id={`sessions-btn-${user.id}`}
                              onClick={() => onRevokeSessions(user)}
                              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-purple-600/20 text-slate-400 hover:text-purple-300 border border-white/5 hover:border-purple-500/30 transition-colors"
                              title="Device Sessions & Force Sign Out"
                            >
                              <Smartphone className="w-4 h-4" />
                            </button>

                            {user.status === 'active' ? (
                              <button
                                id={`suspend-btn-${user.id}`}
                                onClick={() => onToggleStatus(user, 'suspended')}
                                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-amber-600/20 text-slate-400 hover:text-amber-300 border border-white/5 hover:border-amber-500/30 transition-colors"
                                title="Suspend Account"
                              >
                                <Lock className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                id={`activate-btn-${user.id}`}
                                onClick={() => onToggleStatus(user, 'active')}
                                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-emerald-600/20 text-slate-400 hover:text-emerald-300 border border-white/5 hover:border-emerald-500/30 transition-colors"
                                title="Activate Account"
                              >
                                <Unlock className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}

                        <button
                          id={`delete-btn-${user.id}`}
                          onClick={() => onDeleteUser(user)}
                          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-rose-600/20 text-slate-400 hover:text-rose-300 border border-white/5 hover:border-rose-500/30 transition-colors"
                          title={isDeactivated ? "Permanently Purge Record" : "Remove / Deactivate Staff"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="bg-[#0B0F19] px-6 py-3.5 border-t border-[#334155]/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span>Showing <b>{(currentPage - 1) * pageSize + ((paginatedUsers?.length || 0) > 0 ? 1 : 0)}</b> to <b>{Math.min(currentPage * pageSize, sortedUsers?.length || 0)}</b> of <b>{sortedUsers?.length || 0}</b> staff accounts</span>
          
          <div className="hidden sm:flex items-center gap-1.5 ml-4">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-[#1E293B] border border-white/10 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg bg-[#1E293B] hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-white/5"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-2 font-medium text-slate-300">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg bg-[#1E293B] hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-white/5"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
