import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { RBACModule, RBACAction } from '../../types/roles';
import { Lock, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PermissionGuardProps {
  module?: RBACModule | string;
  action?: RBACAction | string;
  fallback?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Conditionally renders children if the authenticated user has the specified permission.
 */
export function PermissionGuard({ module, action = 'view', fallback = null, children }: PermissionGuardProps) {
  const { hasPermission, can } = useAuth();

  const isAllowed = module ? hasPermission(module, action) : can(action);

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children || null}</>;
}

interface CostProfitGuardProps {
  module?: RBACModule | string;
  fallback?: React.ReactNode;
  children?: React.ReactNode;
  inline?: boolean;
}

/**
 * Dedicated visual component lock for sensitive buy prices, costs, and profit margins.
 * For Cashiers and Technicians, strictly conceals financial margins.
 */
export function CostProfitGuard({ 
  module = 'sales', 
  fallback, 
  children,
  inline = false 
}: CostProfitGuardProps) {
  const { canViewCostAndProfit } = useAuth();
  const allowed = canViewCostAndProfit(module);

  if (allowed) {
    return <>{children || null}</>;
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  if (inline) {
    return (
      <span 
        className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/40 select-none cursor-not-allowed"
        title="Cost and profit margin confidential (Restricted to Managers & Admins)"
      >
        <Lock className="w-2.5 h-2.5 text-slate-400" />
        <span>••••</span>
      </span>
    );
  }

  return (
    <div 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-400 bg-slate-800/40 border border-slate-700/50 select-none"
      title="Restricted by RBAC policy: Buy Price & Profit visible to Managers and Admins only"
    >
      <EyeOff className="w-3.5 h-3.5 text-slate-500" />
      <span className="text-[11px]">Restricted</span>
    </div>
  );
}

/**
 * Visual lock badge for disabled action buttons (e.g. Delete, Custom Discounts).
 */
export function ActionLockBadge({ 
  label = 'Requires Admin Approval',
  className
}: { 
  label?: string;
  className?: string;
}) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20",
      className
    )}>
      <Lock className="w-3 h-3 text-amber-400" />
      <span>{label}</span>
    </span>
  );
}
