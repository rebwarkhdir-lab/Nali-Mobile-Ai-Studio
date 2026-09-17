export type NotificationCategory = 'all' | 'inventory' | 'debt' | 'supplier' | 'repair' | 'security' | 'system';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export type NotificationTargetRole = 'All' | 'Administrator' | 'Manager' | 'Cashier' | 'Technician' | 'Inventory';

export interface NotificationMetadata {
  // Inventory Alert Metadata
  productId?: string;
  productName?: string;
  sku?: string;
  currentStock?: number;
  minReorderLevel?: number;
  reorderQuantity?: number;
  itemCategory?: 'mobile' | 'accessory' | 'screen_protector' | 'spare_part';
  supplierName?: string;
  daysInStock?: number;

  // Debt & Installment Metadata
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  debtId?: string;
  installmentId?: string;
  scheduleId?: string;
  amountDue?: number;
  currency?: 'USD' | 'IQD';
  dueDate?: string;
  daysOverdue?: number;
  creditLimit?: number;
  currentTotalDebt?: number;

  // Repair / Maintenance Ticket Metadata
  ticketId?: string;
  ticketNumber?: string;
  deviceModel?: string;
  imei?: string;
  technicianName?: string;
  technicianId?: string;
  partRequired?: string;
  repairStatus?: 'pending' | 'in_progress' | 'part_requested' | 'ready' | 'delivered';
  promisedDate?: string;

  // Admin & Security Metadata
  registerId?: string;
  cashierName?: string;
  expectedAmount?: number;
  actualAmount?: number;
  discrepancyAmount?: number;
  discountApplied?: number;
  priceOverrideAmount?: number;
  ipAddress?: string;
  deviceName?: string;
  eventType?: 'login' | 'password_reset' | 'permission_change' | 'register_close' | 'price_override';
  auditLogId?: string;

  // Generic custom data
  [key: string]: any;
}

export interface AppNotification {
  id: string;
  recipientUserId?: string | null; // null for role-broadcast
  targetRole: NotificationTargetRole;
  category: 'inventory' | 'debt' | 'supplier' | 'repair' | 'security' | 'system';
  priority: NotificationPriority;
  title: string;
  message: string;
  metadata?: NotificationMetadata;
  isRead: boolean;
  readAt?: string | null;
  actionUrl?: string;
  createdAt: string;
  snoozedUntil?: string | null;
  archived?: boolean;
  isPaid?: boolean;
  paidAt?: string | null;
}

export interface NotificationPreferences {
  soundEnabled: boolean;
  soundVolume: number; // 0-100
  toastNotifications: boolean;
  toastAutoDismissSeconds: number; // 3 - 10
  minimumPriorityForToast: NotificationPriority;
  activeRoleFilter: NotificationTargetRole; // For RBAC viewing & simulation
  categories: {
    inventory: boolean;
    debt: boolean;
    supplier?: boolean;
    repair: boolean;
    security: boolean;
    system: boolean;
  };
  channels: {
    inAppBell: boolean;
    pushToasts: boolean;
    soundChimes: boolean;
  };
}

export interface NotificationFilterState {
  category: NotificationCategory;
  priority: 'all' | NotificationPriority;
  status: 'all' | 'unread' | 'read' | 'snoozed';
  searchQuery: string;
  role: 'all' | NotificationTargetRole;
}
