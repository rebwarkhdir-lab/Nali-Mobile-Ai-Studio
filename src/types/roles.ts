// Centralized Role-Based Access Control (RBAC) definitions
// Project: Nali Mobile POS & Inventory Management System

export type CanonicalRole = 'admin' | 'manager' | 'cashier' | 'technician';

export type RBACModule =
  | 'sales'
  | 'inventory_mobiles'
  | 'inventory_accessories'
  | 'debts_installments'
  | 'suppliers'
  | 'reports_finance'
  | 'admin_users'
  | 'admin_security'
  | 'rma_returns';

export type RBACAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'view_cost_profit'
  | 'apply_discount'
  | 'export';

export interface ModulePermission {
  module: RBACModule | string;
  actions: RBACAction[];
}

export interface RolePermissionMatrix {
  role: CanonicalRole | string;
  permissions: ModulePermission[];
}

export interface ModuleDefinition {
  id: RBACModule;
  label: string;
  labelKey: string;
  description: string;
  category: 'store' | 'finance' | 'service' | 'admin';
  route: string;
  supportedActions: RBACAction[];
}

export interface ActionDefinition {
  id: RBACAction;
  label: string;
  description: string;
  isSensitive?: boolean;
}

export const RBAC_ACTIONS: ActionDefinition[] = [
  { id: 'view', label: 'View', description: 'Read records, search inventory, access module interface' },
  { id: 'create', label: 'Create', description: 'Create new records, checkout sales, register inventory' },
  { id: 'edit', label: 'Edit', description: 'Modify records, update specs, change prices or terms' },
  { id: 'delete', label: 'Delete', description: 'Permanently remove or archive records from the system', isSensitive: true },
  { id: 'view_cost_profit', label: 'Cost & Profit', description: 'View supplier buy costs and profit margin calculations', isSensitive: true },
  { id: 'apply_discount', label: 'Discount', description: 'Apply price reductions and cart/item discounts' },
  { id: 'export', label: 'Export', description: 'Export records to CSV, Excel, or PDF sheets' },
];

export const RBAC_MODULES: ModuleDefinition[] = [
  {
    id: 'sales',
    label: 'Sales & POS Terminal',
    labelKey: 'rbac.module.sales',
    description: 'Point-of-sale terminal checkout, barcode scanning, cart calculation, and thermal receipts',
    category: 'store',
    route: '/pos',
    supportedActions: ['view', 'create', 'edit', 'delete', 'view_cost_profit', 'apply_discount', 'export'],
  },
  {
    id: 'inventory_mobiles',
    label: 'Mobiles Inventory',
    labelKey: 'rbac.module.inventory_mobiles',
    description: 'Smartphone & tablet stock, IMEI tracking, storage/battery grading, and device lookup',
    category: 'store',
    route: '/mobiles',
    supportedActions: ['view', 'create', 'edit', 'delete', 'view_cost_profit', 'export'],
  },
  {
    id: 'inventory_accessories',
    label: 'Accessories & Protectors',
    labelKey: 'rbac.module.inventory_accessories',
    description: 'Accessory stock, barcode studio, hydrogel screen protectors, and restock alerts',
    category: 'store',
    route: '/accessories',
    supportedActions: ['view', 'create', 'edit', 'delete', 'view_cost_profit', 'export'],
  },
  {
    id: 'debts_installments',
    label: 'Customer Debts & Installments',
    labelKey: 'rbac.module.debts_installments',
    description: 'Credit balances (Qarz), monthly installment schedules (Eqsat), and payments',
    category: 'finance',
    route: '/debts',
    supportedActions: ['view', 'create', 'edit', 'delete', 'view_cost_profit', 'export'],
  },
  {
    id: 'suppliers',
    label: 'Suppliers & Purchases',
    labelKey: 'rbac.module.suppliers',
    description: 'Supplier directory, wholesale purchase invoices, and vendor account payables',
    category: 'finance',
    route: '/suppliers',
    supportedActions: ['view', 'create', 'edit', 'delete', 'view_cost_profit', 'export'],
  },
  {
    id: 'reports_finance',
    label: 'Financial Analytics & Profit',
    labelKey: 'rbac.module.reports_finance',
    description: 'Daily cash revenue, profit margins, dual-currency P&L reports, and tax statements',
    category: 'finance',
    route: '/reports',
    supportedActions: ['view', 'export'],
  },
  {
    id: 'rma_returns',
    label: 'Defective Returns & RMA',
    labelKey: 'rbac.module.rma_returns',
    description: 'Customer returns, warranty claims, defective device inspection, and technician diagnostics',
    category: 'service',
    route: '/returns',
    supportedActions: ['view', 'create', 'edit', 'delete', 'export'],
  },
  {
    id: 'admin_users',
    label: 'Staff Accounts & Roles',
    labelKey: 'rbac.module.admin_users',
    description: 'Staff profiles, role assignment, credential slips, and branch allocation',
    category: 'admin',
    route: '/admin/users',
    supportedActions: ['view', 'create', 'edit', 'delete', 'export'],
  },
  {
    id: 'admin_security',
    label: 'Security & Audit Logs',
    labelKey: 'rbac.module.admin_security',
    description: 'Terminal hardware authorization, device sessions, security policies, and audit trails',
    category: 'admin',
    route: '/admin/security',
    supportedActions: ['view', 'edit', 'delete', 'export'],
  },
];

// Canonical Role Metadata
export interface RoleMetadata {
  id: CanonicalRole;
  displayName: string;
  badge: string;
  description: string;
  color: string;
  isSystem: boolean;
  maxDiscountPercentage: number;
}

export const CANONICAL_ROLES: Record<CanonicalRole, RoleMetadata> = {
  admin: {
    id: 'admin',
    displayName: 'Admin / Owner (Superuser)',
    badge: 'SUPERUSER',
    description: 'Full unconstrained read/write access to all financial ledgers, buy costs, profit margins, staff accounts, RBAC matrices, and audit logs.',
    color: '#6366F1',
    isSystem: true,
    maxDiscountPercentage: 100,
  },
  manager: {
    id: 'manager',
    displayName: 'Shop Manager',
    badge: 'OPERATIONS',
    description: 'Complete store oversight: Sales, inventory, stock adjustments, customer debts/installments, suppliers, and operational reports. Cannot alter admin passwords or purge audit logs.',
    color: '#3B82F6',
    isSystem: false,
    maxDiscountPercentage: 30,
  },
  cashier: {
    id: 'cashier',
    displayName: 'Cashier / POS Operator',
    badge: 'TERMINAL',
    description: 'Front-desk point of sale: scan barcodes/IMEIs, process customer sales, print receipts, and apply standard discounts up to 5%. Strictly blocked from buy costs, profit margins, product deletion, and admin routes.',
    color: '#10B981',
    isSystem: false,
    maxDiscountPercentage: 5,
  },
  technician: {
    id: 'technician',
    displayName: 'Technician / RMA Specialist',
    badge: 'SERVICE & RMA',
    description: 'Hardware diagnostics, defective returns, warranty RMA claims, screen protector cutting, and device testing workflows. Read-only inventory access without cost/profit exposure.',
    color: '#F59E0B',
    isSystem: false,
    maxDiscountPercentage: 0,
  },
};

// Canonical Default Matrices (Strict Segregation of Duties)
export const DEFAULT_CANONICAL_MATRICES: Record<CanonicalRole, RolePermissionMatrix> = {
  // 1. Admin / Owner: Full access to all 9 modules with all supported actions
  admin: {
    role: 'admin',
    permissions: RBAC_MODULES.map(m => ({
      module: m.id,
      actions: [...m.supportedActions],
    })),
  },

  // 2. Shop Manager: High-level operations; no security policy alteration or audit log purge
  manager: {
    role: 'manager',
    permissions: [
      { module: 'sales', actions: ['view', 'create', 'edit', 'delete', 'view_cost_profit', 'apply_discount', 'export'] },
      { module: 'inventory_mobiles', actions: ['view', 'create', 'edit', 'delete', 'view_cost_profit', 'export'] },
      { module: 'inventory_accessories', actions: ['view', 'create', 'edit', 'delete', 'view_cost_profit', 'export'] },
      { module: 'debts_installments', actions: ['view', 'create', 'edit', 'delete', 'view_cost_profit', 'export'] },
      { module: 'suppliers', actions: ['view', 'create', 'edit', 'delete', 'view_cost_profit', 'export'] },
      { module: 'reports_finance', actions: ['view', 'export'] },
      { module: 'rma_returns', actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { module: 'admin_users', actions: ['view'] },
      { module: 'admin_security', actions: ['view'] },
    ],
  },

  // 3. Cashier / POS Operator: Front-desk POS only; strictly no cost/profit, no deletion, no admin, max 5% discount
  cashier: {
    role: 'cashier',
    permissions: [
      { module: 'sales', actions: ['view', 'create', 'apply_discount'] },
      { module: 'inventory_mobiles', actions: ['view'] },
      { module: 'inventory_accessories', actions: ['view'] },
      { module: 'debts_installments', actions: ['view'] },
      { module: 'suppliers', actions: [] },
      { module: 'reports_finance', actions: [] },
      { module: 'rma_returns', actions: ['view', 'create'] },
      { module: 'admin_users', actions: [] },
      { module: 'admin_security', actions: [] },
    ],
  },

  // 4. Technician / RMA Specialist: Service, defective returns, screen protector finder, read-only inventory
  technician: {
    role: 'technician',
    permissions: [
      { module: 'rma_returns', actions: ['view', 'create', 'edit', 'delete', 'export'] },
      { module: 'inventory_mobiles', actions: ['view'] },
      { module: 'inventory_accessories', actions: ['view'] },
      { module: 'sales', actions: [] },
      { module: 'debts_installments', actions: [] },
      { module: 'suppliers', actions: [] },
      { module: 'reports_finance', actions: [] },
      { module: 'admin_users', actions: [] },
      { module: 'admin_security', actions: [] },
    ],
  },
};

// Module Normalizer to bridge UI / route strings to canonical RBACModule
export function normalizeRBACModule(raw: string): RBACModule {
  const lower = (raw || '').toLowerCase().trim();
  if (lower === 'sales' || lower === 'pos' || lower.includes('sale')) return 'sales';
  if (lower === 'mobiles' || lower.includes('mobile') || lower === 'inventory_mobiles') return 'inventory_mobiles';
  if (lower === 'accessories' || lower.includes('accessor') || lower === 'inventory_accessories' || lower.includes('screen') || lower.includes('barcode')) return 'inventory_accessories';
  if (lower === 'debts' || lower.includes('debt') || lower.includes('installment') || lower === 'debts_installments') return 'debts_installments';
  if (lower === 'suppliers' || lower.includes('supplier') || lower === 'dashboard') return 'suppliers';
  if (lower === 'reports' || lower.includes('report') || lower === 'reports_finance' || lower.includes('finance')) return 'reports_finance';
  if (lower === 'returns' || lower.includes('return') || lower.includes('rma') || lower === 'rma_returns') return 'rma_returns';
  if (lower.includes('security') || lower.includes('session') || lower.includes('audit')) return 'admin_security';
  if (lower === 'admin' || lower === 'administration' || lower.includes('user') || lower === 'admin_users') return 'admin_users';
  return 'sales';
}

// Role Normalizer to map user profile role strings to canonical roles
export function normalizeCanonicalRole(rawRoleIdOrName?: string): CanonicalRole {
  const str = (rawRoleIdOrName || '').toLowerCase().trim();
  if (str.includes('admin') || str === 'superuser' || str === 'owner') return 'admin';
  if (str.includes('manager') || str === 'branch_manager') return 'manager';
  if (str.includes('tech') || str.includes('repair') || str.includes('rma')) return 'technician';
  if (str.includes('cashier') || str.includes('pos')) return 'cashier';
  return 'cashier'; // Safe default
}

// Check matrix permission helper
export function isActionAllowedInMatrix(
  matrix: RolePermissionMatrix | undefined,
  module: RBACModule | string,
  action: RBACAction
): boolean {
  if (!matrix) return false;
  if (matrix.role === 'admin') return true; // Superuser bypass

  const canonicalMod = normalizeRBACModule(module);
  const modPerm = matrix.permissions?.find(p => normalizeRBACModule(p.module) === canonicalMod);
  if (!modPerm) return false;

  return modPerm.actions.includes(action);
}
