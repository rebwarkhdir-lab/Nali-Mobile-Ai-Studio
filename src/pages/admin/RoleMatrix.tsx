import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Plus,
  Check,
  Search,
  RefreshCw,
  Sliders,
  Users,
  Trash2,
  X,
  Eye,
  Edit3,
  DollarSign,
  Percent,
  Download,
  AlertTriangle,
  Info,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  CheckCheck,
  Ban,
  ShoppingCart,
  Smartphone,
  FileSpreadsheet,
  Building2,
  BarChart3,
  Wrench,
  KeyRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Role } from './types';
import { SearchInput } from '../../components/common/SearchInput';
import { cn } from '../../lib/utils';
import { useToast } from '../../components/common/Toast';
import { sound } from '../../lib/sound';
import {
  INITIAL_ROLES,
  getStoredRBACMatrices,
  saveStoredRBACMatrices,
  resetRBACMatricesToDefault,
  addAuditEntry
} from './adminStore';
import {
  CanonicalRole,
  RBACModule,
  RBACAction,
  RolePermissionMatrix,
  RBAC_MODULES,
  RBAC_ACTIONS,
  CANONICAL_ROLES,
  DEFAULT_CANONICAL_MATRICES,
  normalizeCanonicalRole,
  normalizeRBACModule,
  isActionAllowedInMatrix
} from '../../types/roles';
import { useAuth } from '../../context/AuthContext';
import DeleteConfirmationModal, { DeleteModalTarget } from './DeleteConfirmationModal';

interface RoleMatrixProps {
  staffListCountByRole?: Record<string, number>;
}

// Module icon mapping
const MODULE_ICONS: Record<string, React.ReactNode> = {
  sales: <ShoppingCart className="w-4 h-4 text-emerald-400" />,
  inventory_mobiles: <Smartphone className="w-4 h-4 text-blue-400" />,
  inventory_accessories: <Layers className="w-4 h-4 text-cyan-400" />,
  debts_installments: <FileSpreadsheet className="w-4 h-4 text-amber-400" />,
  suppliers: <Building2 className="w-4 h-4 text-purple-400" />,
  reports_finance: <BarChart3 className="w-4 h-4 text-indigo-400" />,
  rma_returns: <Wrench className="w-4 h-4 text-rose-400" />,
  admin_users: <Users className="w-4 h-4 text-teal-400" />,
  admin_security: <KeyRound className="w-4 h-4 text-red-400" />,
};

// Action icon mapping
const ACTION_ICONS: Record<RBACAction, React.ReactNode> = {
  view: <Eye className="w-3.5 h-3.5" />,
  create: <Plus className="w-3.5 h-3.5" />,
  edit: <Edit3 className="w-3.5 h-3.5" />,
  delete: <Trash2 className="w-3.5 h-3.5" />,
  view_cost_profit: <DollarSign className="w-3.5 h-3.5" />,
  apply_discount: <Percent className="w-3.5 h-3.5" />,
  export: <Download className="w-3.5 h-3.5" />,
};

export default function RoleMatrix({ staffListCountByRole }: RoleMatrixProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const { profile, reloadPermissions } = useAuth();

  // Roles list (including custom roles)
  const [roles, setRoles] = useState<Role[]>(() => {
    try {
      const saved = localStorage.getItem('nali_pos_custom_roles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load custom roles', e);
    }
    return INITIAL_ROLES;
  });

  const [selectedRoleId, setSelectedRoleId] = useState<string>('role-manager');
  const [matrices, setMatrices] = useState<Record<string, RolePermissionMatrix>>(() => getStoredRBACMatrices());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'store' | 'finance' | 'service' | 'admin'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Custom role creation state
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleBase, setNewRoleBase] = useState<CanonicalRole>('cashier');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<DeleteModalTarget | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset confirmation modal state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetScope, setResetScope] = useState<'current' | 'all'>('current');

  // Find selected role metadata
  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0] || INITIAL_ROLES[0];
  const canonicalRoleKey = normalizeCanonicalRole(selectedRole.id || selectedRole.name);
  const isSystemAdmin = canonicalRoleKey === 'admin';
  const roleMeta = CANONICAL_ROLES[canonicalRoleKey] || CANONICAL_ROLES.cashier;

  // Active matrix for selected role
  const currentMatrix: RolePermissionMatrix = useMemo(() => {
    return (
      matrices[canonicalRoleKey] ||
      matrices[selectedRoleId] ||
      DEFAULT_CANONICAL_MATRICES[canonicalRoleKey] || {
        role: selectedRoleId,
        permissions: []
      }
    );
  }, [matrices, canonicalRoleKey, selectedRoleId]);

  // Calculate total supported permissions vs granted permissions
  const totalSupportedPerms = useMemo(() => {
    return RBAC_MODULES.reduce((acc, m) => acc + (m.supportedActions?.length || 0), 0);
  }, []);

  const getGrantedCountForMatrix = (matrix: RolePermissionMatrix, roleId: string) => {
    const cRole = normalizeCanonicalRole(roleId);
    if (cRole === 'admin') return totalSupportedPerms;
    let count = 0;
    RBAC_MODULES.forEach(m => {
      const p = matrix?.permissions?.find(perm => normalizeRBACModule(perm.module) === m.id);
      if (p && Array.isArray(p.actions) && Array.isArray(m.supportedActions)) {
        m.supportedActions.forEach(act => {
          if (p.actions.includes(act)) count++;
        });
      }
    });
    return count;
  };

  // Filter modules by category and search
  const filteredModules = useMemo(() => {
    return RBAC_MODULES.filter(m => {
      if (selectedCategory !== 'all' && m.category !== selectedCategory) {
        return false;
      }
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.label.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
      );
    });
  }, [selectedCategory, searchQuery]);

  // Save changes to storage and notify runtime
  const updateMatrices = (newMatrices: Record<string, RolePermissionMatrix>) => {
    setMatrices(newMatrices);
    saveStoredRBACMatrices(newMatrices);
    reloadPermissions();
  };

  // Check if an action is allowed for a module in current role
  const isActionGranted = (moduleId: RBACModule, action: RBACAction): boolean => {
    if (isSystemAdmin) return true;
    return isActionAllowedInMatrix(currentMatrix, moduleId, action);
  };

  // Handle single action toggle
  const handleToggleAction = (moduleId: RBACModule, action: RBACAction) => {
    sound.playClick();

    // 1. Root admin protection
    if (isSystemAdmin) {
      toast.error('The Administrator role has permanent unconstrained root privileges.');
      return;
    }

    // 2. Strict segregation validation
    if (canonicalRoleKey === 'cashier') {
      if (action === 'view_cost_profit') {
        toast.error('Strict Segregation of Duties: Cashier role is strictly forbidden from viewing confidential wholesale buy costs and profit margins.');
        return;
      }
      if (action === 'delete') {
        toast.error('Strict Segregation of Duties: Cashier role cannot delete or purge catalog and customer records.');
        return;
      }
      if (action === 'edit' && moduleId !== 'sales') {
        toast.error('Strict Segregation of Duties: Cashiers have read-only inventory lookup and cannot edit product data.');
        return;
      }
      if (moduleId === 'reports_finance' || moduleId === 'suppliers' || moduleId === 'admin_users' || moduleId === 'admin_security') {
        toast.error('Strict Segregation of Duties: Cashiers are blocked from administrative, supplier, and financial ledger suites.');
        return;
      }
    }

    if (canonicalRoleKey === 'technician') {
      if (action === 'view_cost_profit') {
        toast.error('Strict Segregation of Duties: Service Technicians cannot view wholesale buy prices or profit margins.');
        return;
      }
      if (moduleId === 'sales' || moduleId === 'debts_installments' || moduleId === 'suppliers' || moduleId === 'reports_finance' || moduleId === 'admin_users' || moduleId === 'admin_security') {
        toast.error('Strict Segregation of Duties: Hardware Technicians are restricted from financial ledgers, cash checkout, and user accounts.');
        return;
      }
    }

    // Update matrix
    const currentPerms = [...(currentMatrix.permissions || [])];
    const modPermIndex = currentPerms.findIndex(p => normalizeRBACModule(p.module) === moduleId);

    let updatedPerms = [...currentPerms];
    let isNowGranted = false;

    if (modPermIndex >= 0) {
      const modPerm = currentPerms[modPermIndex];
      const hasAction = modPerm.actions.includes(action);
      isNowGranted = !hasAction;

      const newActions = hasAction
        ? modPerm.actions.filter(a => a !== action)
        : [...modPerm.actions, action];

      updatedPerms[modPermIndex] = {
        ...modPerm,
        actions: newActions
      };
    } else {
      isNowGranted = true;
      updatedPerms.push({
        module: moduleId,
        actions: [action]
      });
    }

    const updatedMatrix: RolePermissionMatrix = {
      ...currentMatrix,
      role: canonicalRoleKey || selectedRoleId,
      permissions: updatedPerms
    };

    const newMatrices = {
      ...matrices,
      [canonicalRoleKey]: updatedMatrix,
      [selectedRoleId]: updatedMatrix
    };

    updateMatrices(newMatrices);

    const actionDef = RBAC_ACTIONS.find(a => a.id === action);
    const modDef = RBAC_MODULES.find(m => m.id === moduleId);

    toast.success(`${isNowGranted ? 'Granted' : 'Revoked'}: ${modDef?.label || moduleId} > ${actionDef?.label || action}`);

    addAuditEntry({
      user_name: profile?.full_name || 'Nali Admin',
      user_role: profile?.role?.name || 'Administrator',
      action: `${isNowGranted ? 'Granted' : 'Revoked'} permission "${actionDef?.label}" on module "${modDef?.label}" for role "${selectedRole.name}"`,
      module: 'Administration / RBAC',
      target: selectedRole.name,
      severity: actionDef?.isSensitive ? 'warning' : 'info'
    });
  };

  // Toggle all supported actions for a single module
  const handleToggleAllForModule = (moduleId: RBACModule, enableAll: boolean) => {
    sound.playClick();
    if (isSystemAdmin) {
      toast.error('The Administrator role has permanent root privileges.');
      return;
    }

    const modDef = RBAC_MODULES.find(m => m.id === moduleId);
    if (!modDef) return;

    let targetActions: RBACAction[] = [];
    if (enableAll) {
      // Filter out actions blocked by strict segregation
      targetActions = modDef.supportedActions.filter(act => {
        if (canonicalRoleKey === 'cashier') {
          if (act === 'view_cost_profit' || act === 'delete') return false;
          if (act === 'edit' && moduleId !== 'sales') return false;
          if (moduleId === 'reports_finance' || moduleId === 'suppliers' || moduleId.startsWith('admin_')) return false;
        }
        if (canonicalRoleKey === 'technician') {
          if (act === 'view_cost_profit') return false;
          if (moduleId === 'sales' || moduleId === 'debts_installments' || moduleId === 'suppliers' || moduleId === 'reports_finance' || moduleId.startsWith('admin_')) return false;
        }
        return true;
      });
    }

    const currentPerms = [...(currentMatrix.permissions || [])];
    const modPermIndex = currentPerms.findIndex(p => normalizeRBACModule(p.module) === moduleId);

    let updatedPerms = [...currentPerms];
    if (modPermIndex >= 0) {
      updatedPerms[modPermIndex] = {
        module: moduleId,
        actions: targetActions
      };
    } else {
      updatedPerms.push({
        module: moduleId,
        actions: targetActions
      });
    }

    const updatedMatrix: RolePermissionMatrix = {
      ...currentMatrix,
      role: canonicalRoleKey || selectedRoleId,
      permissions: updatedPerms
    };

    const newMatrices = {
      ...matrices,
      [canonicalRoleKey]: updatedMatrix,
      [selectedRoleId]: updatedMatrix
    };

    updateMatrices(newMatrices);
    toast.success(`${enableAll ? 'Granted all allowed' : 'Revoked all'} permissions for ${modDef.label}`);

    addAuditEntry({
      user_name: profile?.full_name || 'Nali Admin',
      user_role: profile?.role?.name || 'Administrator',
      action: `${enableAll ? 'Granted all allowed' : 'Revoked all'} permissions on module "${modDef.label}" for role "${selectedRole.name}"`,
      module: 'Administration / RBAC',
      target: selectedRole.name,
      severity: 'warning'
    });
  };

  // Toggle category
  const handleToggleCategory = (category: string, enableAll: boolean) => {
    sound.playClick();
    if (isSystemAdmin) {
      toast.error('Administrator role has permanent access to all categories.');
      return;
    }

    const categoryModules = RBAC_MODULES.filter(m => m.category === category);
    const currentPerms = [...(currentMatrix.permissions || [])];
    let updatedPerms = [...currentPerms];

    categoryModules.forEach(modDef => {
      let targetActions: RBACAction[] = [];
      if (enableAll) {
        targetActions = modDef.supportedActions.filter(act => {
          if (canonicalRoleKey === 'cashier') {
            if (act === 'view_cost_profit' || act === 'delete') return false;
            if (act === 'edit' && modDef.id !== 'sales') return false;
            if (modDef.id === 'reports_finance' || modDef.id === 'suppliers' || modDef.id.startsWith('admin_')) return false;
          }
          if (canonicalRoleKey === 'technician') {
            if (act === 'view_cost_profit') return false;
            if (modDef.id === 'sales' || modDef.id === 'debts_installments' || modDef.id === 'suppliers' || modDef.id === 'reports_finance' || modDef.id.startsWith('admin_')) return false;
          }
          return true;
        });
      }

      const modIndex = updatedPerms.findIndex(p => normalizeRBACModule(p.module) === modDef.id);
      if (modIndex >= 0) {
        updatedPerms[modIndex] = {
          module: modDef.id,
          actions: targetActions
        };
      } else {
        updatedPerms.push({
          module: modDef.id,
          actions: targetActions
        });
      }
    });

    const updatedMatrix: RolePermissionMatrix = {
      ...currentMatrix,
      role: canonicalRoleKey || selectedRoleId,
      permissions: updatedPerms
    };

    const newMatrices = {
      ...matrices,
      [canonicalRoleKey]: updatedMatrix,
      [selectedRoleId]: updatedMatrix
    };

    updateMatrices(newMatrices);
    toast.success(`${enableAll ? 'Enabled' : 'Disabled'} all permissions in ${category.toUpperCase()}`);

    addAuditEntry({
      user_name: profile?.full_name || 'Nali Admin',
      user_role: profile?.role?.name || 'Administrator',
      action: `${enableAll ? 'Granted' : 'Revoked'} category "${category}" permissions for role "${selectedRole.name}"`,
      module: 'Administration / RBAC',
      target: selectedRole.name,
      severity: 'warning'
    });
  };

  // Reset to Canonical Defaults
  const handleConfirmReset = () => {
    sound.playClick();
    if (resetScope === 'current') {
      const defaultMatrix = DEFAULT_CANONICAL_MATRICES[canonicalRoleKey] || DEFAULT_CANONICAL_MATRICES.cashier;
      const newMatrices = {
        ...matrices,
        [canonicalRoleKey]: defaultMatrix,
        [selectedRoleId]: defaultMatrix
      };
      updateMatrices(newMatrices);
      toast.success(`Reset ${selectedRole.name} matrix to canonical defaults.`);

      addAuditEntry({
        user_name: profile?.full_name || 'Nali Admin',
        user_role: profile?.role?.name || 'Administrator',
        action: `Reset role "${selectedRole.name}" permissions to canonical system defaults`,
        module: 'Administration / RBAC',
        target: selectedRole.name,
        severity: 'warning'
      });
    } else {
      const resetAll = resetRBACMatricesToDefault();
      setMatrices(resetAll);
      reloadPermissions();
      toast.success('Reset all canonical matrices to factory defaults.');

      addAuditEntry({
        user_name: profile?.full_name || 'Nali Admin',
        user_role: profile?.role?.name || 'Administrator',
        action: 'Factory reset all organizational RBAC matrices to system defaults',
        module: 'Administration / RBAC',
        target: 'All Roles',
        severity: 'danger'
      });
    }

    setShowResetConfirm(false);
  };

  // Create new custom role
  const handleCreateNewRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      toast.error('Role name is required.');
      return;
    }

    const newId = `role-${Date.now()}`;
    const baseTemplate = DEFAULT_CANONICAL_MATRICES[newRoleBase] || DEFAULT_CANONICAL_MATRICES.cashier;

    const newRole: Role = {
      id: newId,
      name: newRoleName.trim(),
      description: newRoleDesc.trim() || 'Custom organizational permission group',
      is_system: false,
      color: '#3B82F6',
      user_count: 0
    };

    const updatedRoles = [...roles, newRole];
    setRoles(updatedRoles);
    try {
      localStorage.setItem('nali_pos_custom_roles', JSON.stringify(updatedRoles));
    } catch (err) {
      console.error(err);
    }

    const newMatrices = {
      ...matrices,
      [newId]: {
        role: newId,
        permissions: JSON.parse(JSON.stringify(baseTemplate.permissions))
      }
    };

    updateMatrices(newMatrices);
    setSelectedRoleId(newId);
    setIsCreatingRole(false);
    setNewRoleName('');
    setNewRoleDesc('');

    toast.success(`Role "${newRole.name}" created from ${newRoleBase.toUpperCase()} template!`);

    addAuditEntry({
      user_name: profile?.full_name || 'Nali Admin',
      user_role: profile?.role?.name || 'Administrator',
      action: `Created new custom role "${newRole.name}" cloned from template "${newRoleBase}"`,
      module: 'Administration / RBAC',
      target: newRole.name,
      severity: 'info'
    });
  };

  // Delete custom role
  const handleOpenDeleteRole = (role: Role) => {
    if (role.is_system || role.id === 'role-admin' || role.id === 'role-cashier' || role.id === 'role-manager' || role.id === 'role-technician') {
      toast.error(`Canonical role "${role.name}" is protected and cannot be deleted.`);
      return;
    }

    const assignedCount = staffListCountByRole ? (staffListCountByRole[role.id] ?? role.user_count ?? 0) : (role.user_count ?? 0);
    setDeleteTarget({
      type: 'role',
      role,
      assignedCount
    });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteRole = async (target: DeleteModalTarget) => {
    if (target.type !== 'role') return;
    const roleToDelete = target.role;

    setIsDeleting(true);
    try {
      const updatedRoles = roles.filter(r => r.id !== roleToDelete.id);
      setRoles(updatedRoles);
      try {
        localStorage.setItem('nali_pos_custom_roles', JSON.stringify(updatedRoles));
      } catch (e) {
        console.error('Failed to save roles', e);
      }

      const updatedMatrices = { ...matrices };
      delete updatedMatrices[roleToDelete.id];
      updateMatrices(updatedMatrices);

      setSelectedRoleId('role-manager');
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);

      toast.success(`Role "${roleToDelete.name}" deleted successfully.`);

      addAuditEntry({
        user_name: profile?.full_name || 'Nali Admin',
        user_role: profile?.role?.name || 'Administrator',
        action: `Deleted custom security role "${roleToDelete.name}"`,
        module: 'Administration / RBAC',
        target: roleToDelete.name,
        severity: 'danger'
      });
    } catch (err: any) {
      toast.error(`Failed to delete role: ${err.message || 'Error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-36 md:pb-24">
      {/* 1. TOP ROLE SELECTOR CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
        {roles.map(role => {
          const isSelected = selectedRoleId === role.id;
          const cKey = normalizeCanonicalRole(role.id || role.name);
          const rMeta = CANONICAL_ROLES[cKey] || CANONICAL_ROLES.cashier;
          const roleMatrix = matrices[cKey] || matrices[role.id] || DEFAULT_CANONICAL_MATRICES[cKey];
          const grantedCount = getGrantedCountForMatrix(roleMatrix, role.id);
          const percent = Math.round((grantedCount / totalSupportedPerms) * 100);
          const staffCount = staffListCountByRole ? (staffListCountByRole[role.id] ?? role.user_count ?? 0) : (role.user_count ?? 0);

          return (
            <div
              key={role.id}
              onClick={() => {
                sound.playClick();
                setSelectedRoleId(role.id);
              }}
              className={cn(
                "p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between group cursor-pointer",
                isSelected
                  ? "bg-[#161F33] border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)] ring-1 ring-indigo-500/60"
                  : "bg-[#111827] border-[#334155]/60 hover:border-white/20 hover:bg-[#141C2E]"
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0",
                      cKey === 'admin' ? "bg-indigo-500/20 text-indigo-300" :
                      cKey === 'manager' ? "bg-blue-500/20 text-blue-300" :
                      cKey === 'cashier' ? "bg-emerald-500/20 text-emerald-300" :
                      cKey === 'technician' ? "bg-amber-500/20 text-amber-300" :
                      "bg-purple-500/20 text-purple-300"
                    )}>
                      {role.is_system || cKey === 'admin' ? <Lock className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                    </span>
                    <span className={cn(
                      "text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono",
                      cKey === 'admin' ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                      cKey === 'manager' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                      cKey === 'cashier' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      cKey === 'technician' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    )}>
                      {rMeta.badge}
                    </span>
                  </div>

                  {!role.is_system && cKey !== 'admin' && cKey !== 'manager' && cKey !== 'cashier' && cKey !== 'technician' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDeleteRole(role);
                      }}
                      className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                      title={t('admin.roles.deleteRole', 'Delete Custom Role')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <h4 className={cn(
                  "font-bold text-sm leading-snug truncate",
                  isSelected ? "text-white" : "text-slate-200"
                )}>
                  {role.name}
                </h4>

                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <span className="font-semibold text-slate-300">{staffCount} staff</span>
                  <span>•</span>
                  <span className="font-mono text-[11px] text-indigo-400 font-bold">{percent}% access</span>
                </div>
              </div>

              {/* Progress bar and discount badge */}
              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 font-mono">
                  Max Disc: <strong className="text-white">{rMeta.maxDiscountPercentage}%</strong>
                </span>
                <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden shrink-0">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      isSelected ? "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" : "bg-slate-600"
                    )}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. ROLE DETAILS & CONTROL BANNER */}
      <div className="bg-[#111827] border border-[#334155]/60 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
              <span>{selectedRole.name}</span>
              <span className="text-xs font-normal text-slate-400">({t('admin.roles.matrixSub', 'RBAC Matrix Engine')})</span>
            </h3>

            {isSystemAdmin ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider flex items-center gap-1 font-mono">
                <Lock className="w-3 h-3" /> {t('admin.roles.rootLocked', 'Root Unconstrained')}
              </span>
            ) : (
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono border",
                canonicalRoleKey === 'manager' ? "bg-blue-500/10 text-blue-300 border-blue-500/30" :
                canonicalRoleKey === 'cashier' ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" :
                canonicalRoleKey === 'technician' ? "bg-amber-500/10 text-amber-300 border-amber-500/30" :
                "bg-purple-500/10 text-purple-300 border-purple-500/30"
              )}>
                {roleMeta.badge}
              </span>
            )}

            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-white/5 text-slate-300 border border-white/5">
              Discount Authority: <strong className="text-indigo-300">{roleMeta.maxDiscountPercentage}%</strong>
            </span>
          </div>

          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            {selectedRole.description || roleMeta.description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-end">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#0B0F19] border border-[#334155] rounded-xl p-1 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                "p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors",
                viewMode === 'table' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              )}
              title="Matrix Table Grid View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={cn(
                "p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors",
                viewMode === 'cards' ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              )}
              title="Detailed Module Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>

          {/* Reset Defaults Button */}
          <button
            type="button"
            onClick={() => {
              setResetScope('current');
              setShowResetConfirm(true);
            }}
            disabled={isSystemAdmin}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-[#334155] text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none shrink-0"
            title="Restore canonical defaults for this role"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Reset Defaults</span>
          </button>

          {/* New Custom Role Button */}
          <button
            type="button"
            onClick={() => setIsCreatingRole(true)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('admin.roles.newRole', 'New Role')}</span>
          </button>
        </div>
      </div>

      {/* 3. STRICT SEGREGATION WARNING BANNERS */}
      {isSystemAdmin && (
        <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 flex items-center gap-3 text-indigo-200 text-xs">
          <Info className="w-5 h-5 text-indigo-400 shrink-0" />
          <span>
            <strong>Root Administrator Protection Active:</strong> All 7 functional operations across all 9 modules are permanently locked for the Administrator / Superuser role to guarantee administrative continuity and protect against accidental lockout.
          </span>
        </div>
      )}

      {canonicalRoleKey === 'cashier' && (
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 text-amber-200 text-xs">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <span>
            <strong>Cashier Strict Segregation Policy:</strong> Front-desk cashiers are strictly blocked from inspecting wholesale purchase buy costs, profit margins, and catalog/ticket deletions. Maximum manual cart discount authority is permanently capped at <strong>5%</strong>.
          </span>
        </div>
      )}

      {canonicalRoleKey === 'technician' && (
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 text-amber-200 text-xs">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <span>
            <strong>Service Technician Segregation Policy:</strong> Hardware & RMA technicians have specialized access to RMA returns, phone testing diagnostics, and hydrogel screen protector cutters, with strictly zero access to financial ledgers, debts, or wholesale costs.
          </span>
        </div>
      )}

      {/* 4. FILTER BAR & CATEGORY TABS */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {[
            { id: 'all', label: 'All Modules', count: (RBAC_MODULES?.length || 0) },
            { id: 'store', label: 'Store Operations', count: 3 },
            { id: 'finance', label: 'Finance & Ledgers', count: 3 },
            { id: 'service', label: 'Service & RMA', count: 1 },
            { id: 'admin', label: 'System & Admin', count: 2 },
          ].map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id as any)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                selectedCategory === cat.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-[#111827] text-slate-400 hover:text-white hover:bg-[#1E293B] border border-white/5"
              )}
            >
              <span>{cat.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 font-mono">
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Filter */}
        <div className="w-full md:w-72">
          <SearchInput
            placeholder="Search modules, routes, actions..."
            value={searchQuery}
            onChangeValue={setSearchQuery}
            size="sm"
          />
        </div>
      </div>

      {/* 5. MATRIX VIEW: TABLE GRID VIEW */}
      {viewMode === 'table' ? (
        <div className="bg-[#111827] border border-[#334155]/60 rounded-2xl overflow-hidden shadow-xl mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0B0F19] border-b border-[#334155]/60 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 min-w-[220px]">
                    {t('admin.matrix.module', 'Module & Route')}
                  </th>
                  {RBAC_ACTIONS.map(act => (
                    <th key={act.id} className="py-3.5 px-3 text-center min-w-[105px]">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1 text-slate-300">
                          {ACTION_ICONS[act.id]}
                          <span>{act.label}</span>
                        </div>
                        {act.isSensitive && (
                          <span className="text-[8px] px-1 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25 tracking-wider uppercase font-mono">
                            Sensitive
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="py-3.5 px-3 text-center min-w-[90px]">
                    {t('admin.matrix.quick', 'Quick Actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredModules.map(mod => {
                  const isSupportedInMod = (act: RBACAction) => mod.supportedActions.includes(act);

                  return (
                    <tr 
                      key={mod.id} 
                      className="hover:bg-[#161F33]/60 transition-colors group"
                    >
                      {/* Module Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-white/5 border border-white/10 shrink-0 mt-0.5">
                            {MODULE_ICONS[mod.id] || <Layers className="w-4 h-4 text-slate-400" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-100 flex items-center gap-1.5 text-sm">
                              <span>{mod.label}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-snug line-clamp-1 mt-0.5">
                              {mod.description}
                            </p>
                            <span className="inline-block mt-1 text-[10px] font-mono text-cyan-400/80 bg-cyan-950/30 px-1.5 py-0.2 rounded border border-cyan-500/20">
                              {mod.route}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 7 Action Columns */}
                      {RBAC_ACTIONS.map(act => {
                        const supported = isSupportedInMod(act.id);
                        const granted = supported && isActionGranted(mod.id, act.id);

                        // Strict segregation blocks check
                        let isBlockedByPolicy = false;
                        let blockReason = '';

                        if (canonicalRoleKey === 'cashier') {
                          if (act.id === 'view_cost_profit') {
                            isBlockedByPolicy = true;
                            blockReason = 'Cashiers cannot inspect confidential buy costs or margins.';
                          } else if (act.id === 'delete') {
                            isBlockedByPolicy = true;
                            blockReason = 'Cashiers cannot delete records.';
                          } else if (act.id === 'edit' && mod.id !== 'sales') {
                            isBlockedByPolicy = true;
                            blockReason = 'Cashiers have read-only lookup outside sales checkout.';
                          } else if (mod.id === 'reports_finance' || mod.id === 'suppliers' || mod.id.startsWith('admin_')) {
                            isBlockedByPolicy = true;
                            blockReason = 'Administrative & Financial ledgers restricted.';
                          }
                        } else if (canonicalRoleKey === 'technician') {
                          if (act.id === 'view_cost_profit') {
                            isBlockedByPolicy = true;
                            blockReason = 'Technicians cannot inspect wholesale costs.';
                          } else if (mod.id === 'sales' || mod.id === 'debts_installments' || mod.id === 'suppliers' || mod.id === 'reports_finance' || mod.id.startsWith('admin_')) {
                            isBlockedByPolicy = true;
                            blockReason = 'Service role restricted from accounting and checkout.';
                          }
                        }

                        return (
                          <td key={act.id} className="py-3.5 px-3 text-center">
                            {!supported ? (
                              <div className="flex items-center justify-center">
                                <span className="text-slate-600 font-mono text-xs select-none">—</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleAction(mod.id, act.id)}
                                disabled={isSystemAdmin || isBlockedByPolicy}
                                className={cn(
                                  "w-8 h-8 rounded-xl border flex items-center justify-center mx-auto transition-all cursor-pointer select-none",
                                  granted
                                    ? act.isSensitive
                                      ? "bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-sm"
                                      : "bg-indigo-600/30 border-indigo-500 text-indigo-300 shadow-sm"
                                    : "bg-[#0B0F19] border-white/10 text-slate-600 hover:border-white/30 hover:text-slate-300",
                                  isSystemAdmin && "cursor-default opacity-80",
                                  isBlockedByPolicy && "opacity-25 cursor-not-allowed border-dashed border-rose-500/40 text-rose-500/50 hover:border-rose-500/40"
                                )}
                                title={
                                  isBlockedByPolicy
                                    ? `Blocked by policy: ${blockReason}`
                                    : isSystemAdmin
                                      ? 'Permanently granted for Administrator'
                                      : `${granted ? 'Revoke' : 'Grant'} ${act.label} on ${mod.label}`
                                }
                              >
                                {isBlockedByPolicy ? (
                                  <Ban className="w-3.5 h-3.5 text-rose-400" />
                                ) : granted ? (
                                  <Check className="w-4 h-4 stroke-[3]" />
                                ) : (
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                )}
                              </button>
                            )}
                          </td>
                        );
                      })}

                      {/* Quick Module Actions */}
                      <td className="py-3.5 px-3 text-center">
                        {!isSystemAdmin && (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleAllForModule(mod.id, true)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                              title={`Grant all supported actions for ${mod.label}`}
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleAllForModule(mod.id, false)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title={`Revoke all actions for ${mod.label}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* 6. MATRIX VIEW: CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {filteredModules.map(mod => {
            const actionsList = mod?.supportedActions || [];
            const isSupportedInMod = (act: RBACAction) => actionsList.includes(act);
            const grantedCount = actionsList.filter(act => isActionGranted(mod.id, act)).length;

            return (
              <div
                key={mod.id}
                className="bg-[#111827] border border-[#334155]/60 rounded-2xl p-5 flex flex-col justify-between shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shrink-0">
                        {MODULE_ICONS[mod.id] || <Layers className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">{mod.label}</h4>
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-1.5 py-0.2 rounded border border-cyan-500/20">
                          {mod.route}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20">
                      {grantedCount} / {mod.supportedActions?.length || 0}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {mod.description}
                  </p>

                  {/* Actions Chips Grid */}
                  <div className="flex flex-wrap gap-2">
                    {(mod.supportedActions || []).map(actId => {
                      const actDef = RBAC_ACTIONS.find(a => a.id === actId);
                      const granted = isActionGranted(mod.id, actId);

                      // Check segregation block
                      let isBlocked = false;
                      if (canonicalRoleKey === 'cashier') {
                        if (actId === 'view_cost_profit' || actId === 'delete') isBlocked = true;
                        if (actId === 'edit' && mod.id !== 'sales') isBlocked = true;
                        if (mod.id === 'reports_finance' || mod.id === 'suppliers' || mod.id.startsWith('admin_')) isBlocked = true;
                      } else if (canonicalRoleKey === 'technician') {
                        if (actId === 'view_cost_profit') isBlocked = true;
                        if (mod.id === 'sales' || mod.id === 'debts_installments' || mod.id === 'suppliers' || mod.id === 'reports_finance' || mod.id.startsWith('admin_')) isBlocked = true;
                      }

                      return (
                        <button
                          key={actId}
                          type="button"
                          onClick={() => handleToggleAction(mod.id, actId)}
                          disabled={isSystemAdmin || isBlocked}
                          className={cn(
                            "px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer select-none",
                            granted
                              ? actDef?.isSensitive
                                ? "bg-amber-500/20 border-amber-500/40 text-amber-200"
                                : "bg-indigo-600/30 border-indigo-500/50 text-indigo-200"
                              : "bg-[#0B0F19] border-white/10 text-slate-400 hover:text-white hover:border-white/20",
                            isSystemAdmin && "cursor-default opacity-80",
                            isBlocked && "opacity-30 cursor-not-allowed border-dashed border-rose-500/40 text-rose-400"
                          )}
                        >
                          {ACTION_ICONS[actId]}
                          <span>{actDef?.label}</span>
                          {granted && <Check className="w-3 h-3 stroke-[3]" />}
                          {isBlocked && <Ban className="w-3 h-3 text-rose-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Module Footer Actions */}
                {!isSystemAdmin && (
                  <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">Quick Module Override</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleAllForModule(mod.id, true)}
                        className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
                      >
                        Grant All
                      </button>
                      <span className="text-slate-700">•</span>
                      <button
                        type="button"
                        onClick={() => handleToggleAllForModule(mod.id, false)}
                        className="text-[11px] font-semibold text-rose-400 hover:text-rose-300"
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 7. RESET CONFIRMATION MODAL */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetConfirm(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#0F172A] border border-[#334155] rounded-3xl p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center gap-3 text-amber-400">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Reset RBAC Permission Matrix?
                  </h3>
                  <p className="text-xs text-slate-400">
                    This will revert modified permission policies back to the canonical standard.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-white/10 bg-slate-900/50 cursor-pointer">
                  <input
                    type="radio"
                    name="resetScope"
                    checked={resetScope === 'current'}
                    onChange={() => setResetScope('current')}
                    className="text-indigo-600 focus:ring-0"
                  />
                  <div>
                    <div className="text-xs font-bold text-white">Reset only {selectedRole.name}</div>
                    <div className="text-[11px] text-slate-400">Reverts {selectedRole.name} back to standard {roleMeta.badge} rules.</div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-rose-500/20 bg-rose-950/20 cursor-pointer">
                  <input
                    type="radio"
                    name="resetScope"
                    checked={resetScope === 'all'}
                    onChange={() => setResetScope('all')}
                    className="text-rose-600 focus:ring-0"
                  />
                  <div>
                    <div className="text-xs font-bold text-rose-300">Factory Reset All 4 Canonical Roles</div>
                    <div className="text-[11px] text-slate-400">Restores Admin, Shop Manager, Cashier, and Technician to defaults.</div>
                  </div>
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30"
                >
                  Confirm Reversion
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. NEW CUSTOM ROLE MODAL */}
      <AnimatePresence>
        {isCreatingRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreatingRole(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#0F172A] border border-[#334155] rounded-3xl p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-400" />
                  <span>{t('admin.roles.createCustomRole', 'Create Custom Security Role')}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingRole(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateNewRole} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('admin.roles.roleTitle', 'Role Title')} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Senior Shift Supervisor"
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                    className="w-full bg-[#111827] border border-[#334155] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Base Permission Template
                  </label>
                  <select
                    value={newRoleBase}
                    onChange={e => setNewRoleBase(e.target.value as CanonicalRole)}
                    className="w-full bg-[#111827] border border-[#334155] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="cashier">Cashier / POS Operator (Front-Desk Baseline)</option>
                    <option value="manager">Shop Manager (Operations Oversight Baseline)</option>
                    <option value="technician">Technician / RMA Specialist (Service Baseline)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    {t('admin.roles.roleDesc', 'Role Description')}
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe the operational responsibilities and scope..."
                    value={newRoleDesc}
                    onChange={e => setNewRoleDesc(e.target.value)}
                    className="w-full bg-[#111827] border border-[#334155] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsCreatingRole(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
                  >
                    {t('admin.roles.createRoleBtn', 'Create Role & Open Matrix')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. ROLE DELETION MODAL */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        target={deleteTarget}
        onConfirm={handleConfirmDeleteRole}
        isLoading={isDeleting}
      />
    </div>
  );
}
