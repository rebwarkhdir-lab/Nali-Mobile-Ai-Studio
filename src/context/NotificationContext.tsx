import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  AppNotification, 
  NotificationCategory, 
  NotificationPriority, 
  NotificationPreferences, 
  NotificationFilterState,
  NotificationTargetRole
} from '../types/notification';
import { notificationService, getNotificationDedupeKey, isSeedOrGhostNotification } from '../lib/notificationService';
import { useAuth } from './AuthContext';

export interface ToastItem {
  id: string;
  notification: AppNotification;
  timeoutId?: any;
  addedAt: number;
}

interface NotificationContextType {
  notifications: AppNotification[];
  filteredNotifications: AppNotification[];
  unreadCount: number;
  criticalCount: number;
  preferences: NotificationPreferences;
  filterState: NotificationFilterState;
  isCenterOpen: boolean;
  isSettingsOpen: boolean;
  isSimulatorOpen: boolean;
  toasts: ToastItem[];
  
  // UI Controls
  openCenter: () => void;
  closeCenter: () => void;
  toggleCenter: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openSimulator: () => void;
  closeSimulator: () => void;
  
  // Filter actions
  setCategoryFilter: (cat: NotificationCategory) => void;
  setPriorityFilter: (priority: 'all' | NotificationPriority) => void;
  setStatusFilter: (status: 'all' | 'unread' | 'read' | 'snoozed') => void;
  setSearchQuery: (query: string) => void;
  setRoleFilter: (role: 'all' | NotificationTargetRole) => void;
  resetFilters: () => void;

  // Notification CRUD / State Actions
  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  markAllAsRead: () => void;
  clearRead: () => void;
  deleteNotification: (id: string) => void;
  snoozeNotification: (id: string, duration?: number | { hours?: number; days?: number; untilDate?: string }) => void;
  unsnoozeNotification: (id: string) => void;
  updatePreferences: (newPrefs: Partial<NotificationPreferences>) => void;
  resetToDefaults: () => void;
  purgeUnverifiedNotifications: () => void;
  triggerDatabaseAudit: () => void;

  // Real-time dispatchers & simulator triggers
  dispatchNotification: (notif: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => AppNotification;
  dismissToast: (id: string, markRead?: boolean) => void;
  rotateToastQueue: (direction: 'next' | 'prev') => void;
  simulateTrigger: (type: 'out_of_stock' | 'low_stock' | 'overdue_debt' | 'upcoming_installment' | 'repair_ready' | 'spare_part' | 'register_discrepancy' | 'security_login') => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const userRole = profile?.role?.name || 'Administrator';

  const [allNotifications, setAllNotifications] = useState<AppNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(notificationService.getPreferences());
  const [isCenterOpen, setIsCenterOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [filterState, setFilterState] = useState<NotificationFilterState>({
    category: 'all',
    priority: 'all',
    status: 'all',
    searchQuery: '',
    role: 'all',
  });

  // Sync state with service
  const syncState = useCallback(() => {
    setAllNotifications(notificationService.getAll());
    setPreferences(notificationService.getPreferences());
  }, []);

  useEffect(() => {
    syncState();
    const unsubscribe = notificationService.subscribe(syncState);
    return () => unsubscribe();
  }, [syncState]);

  // Listen to payment recorded to immediately remove paid items from toast queue and ring
  useEffect(() => {
    const handlePaymentRecorded = (e: any) => {
      const detail = e?.detail || {};
      setToasts(prev => prev.filter(t => {
        const notif = t.notification;
        if (detail.debtId && notif.metadata?.debtId === detail.debtId) return false;
        if (detail.installmentId && notif.metadata?.installmentId === detail.installmentId) {
          if (!detail.scheduleId || notif.metadata?.scheduleId === detail.scheduleId) return false;
        }
        if (detail.scheduleId && notif.metadata?.scheduleId === detail.scheduleId) return false;
        return true;
      }));
    };

    window.addEventListener('payment_recorded', handlePaymentRecorded);
    return () => window.removeEventListener('payment_recorded', handlePaymentRecorded);
  }, []);

  // Handle toast popping into queue
  const addToast = useCallback((notification: AppNotification) => {
    const prefs = notificationService.getPreferences();
    if (!prefs.toastNotifications || !prefs.channels.pushToasts) return;

    // Do not pop toast if already paid, snoozed, or already read
    if (notification.isPaid || notification.isRead || notificationService.isNotificationSnoozed(notification)) return;

    const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
    const minPriorityVal = priorityOrder[prefs.minimumPriorityForToast] || 2;
    const notifPriorityVal = priorityOrder[notification.priority] || 1;

    if (notifPriorityVal < minPriorityVal) return;

    const notifKey = getNotificationDedupeKey(notification);
    const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    setToasts(prev => {
      // Prevent duplicate notification for the same entity in queue
      const exists = prev.some(t => 
        t.notification.id === notification.id || 
        (notifKey && getNotificationDedupeKey(t.notification) === notifKey)
      );
      if (exists) return prev;

      // Append to queue so they are viewed one by one in chronological / priority sequence
      return [...prev, { id: toastId, notification, addedAt: Date.now() }];
    });
  }, []);

  const dismissToast = useCallback((id: string, markRead: boolean = true) => {
    setToasts(prev => {
      const target = prev.find(t => t.id === id);
      if (target && markRead) {
        const notifId = target.notification.id;
        setTimeout(() => {
          notificationService.markAsRead(notifId);
        }, 0);
      }
      return prev.filter(t => t.id !== id);
    });
  }, []);

  const rotateToastQueue = useCallback((direction: 'next' | 'prev') => {
    setToasts(prev => {
      if (!Array.isArray(prev) || (prev?.length || 0) <= 1) return prev;
      if (direction === 'next') {
        return [...prev.slice(1), prev[0]];
      } else {
        return [prev[prev.length - 1], ...prev.slice(0, prev.length - 1)];
      }
    });
  }, []);

  // Filtered notifications computation with strict deduplication
  const deduplicatedRoleList = useMemo(() => {
    const roleFilteredList = notificationService.getFilteredNotifications(userRole, true);
    const seen = new Map<string, AppNotification>();
    for (const n of (roleFilteredList || [])) {
      if (!n || n.isPaid || n.archived || isSeedOrGhostNotification(n)) continue;
      const key = getNotificationDedupeKey(n);
      if (!seen.has(key)) {
        seen.set(key, n);
      } else {
        const existing = seen.get(key)!;
        const existingTime = new Date(existing.readAt || existing.createdAt || 0).getTime();
        const nTime = new Date(n.readAt || n.createdAt || 0).getTime();
        const newer = nTime >= existingTime ? n : existing;
        const older = newer === n ? existing : n;
        const isUnread = (!existing.isRead || !n.isRead);

        seen.set(key, {
          ...older,
          ...newer,
          isRead: !isUnread,
          snoozedUntil: (newer.snoozedUntil && new Date(newer.snoozedUntil).getTime() > Date.now())
            ? newer.snoozedUntil
            : (older.snoozedUntil && new Date(older.snoozedUntil).getTime() > Date.now() ? older.snoozedUntil : undefined),
          metadata: { ...older.metadata, ...newer.metadata }
        });
      }
    }
    return Array.from(seen.values());
  }, [userRole, allNotifications]);

  const filteredNotifications = useMemo(() => {
    return deduplicatedRoleList.filter(n => {
      // 1. Category Filter
      if (filterState.category !== 'all' && n.category !== filterState.category) {
        return false;
      }
      // 2. Priority Filter
      if (filterState.priority !== 'all' && n.priority !== filterState.priority) {
        return false;
      }
      // 3. Status Filter (read/unread/snoozed)
      const isSnoozed = notificationService.isNotificationSnoozed(n);
      if (filterState.status === 'unread' && (n.isRead || isSnoozed)) return false;
      if (filterState.status === 'read' && (!n.isRead || isSnoozed)) return false;
      if (filterState.status === 'snoozed' && !isSnoozed) return false;

      // 4. Role Filter Override
      if (filterState.role !== 'all' && n.targetRole !== 'All' && n.targetRole !== filterState.role) {
        return false;
      }

      // 5. Search Query
      if (filterState.searchQuery.trim()) {
        const q = filterState.searchQuery.toLowerCase();
        const matchTitle = n.title.toLowerCase().includes(q);
        const matchMsg = n.message.toLowerCase().includes(q);
        const matchMeta = JSON.stringify(n.metadata || {}).toLowerCase().includes(q);
        return matchTitle || matchMsg || matchMeta;
      }

      return true;
    });
  }, [deduplicatedRoleList, filterState]);

  const { unreadCount, criticalCount } = useMemo(() => {
    let unread = 0;
    let critical = 0;
    for (const n of deduplicatedRoleList) {
      if (!n.isRead && !n.isPaid && !n.archived && !notificationService.isNotificationSnoozed(n)) {
        unread++;
        if (n.priority === 'critical' || n.priority === 'high') {
          critical++;
        }
      }
    }
    return { unreadCount: unread, criticalCount: critical };
  }, [deduplicatedRoleList]);

  // Action methods
  const markAsRead = useCallback((id: string) => notificationService.markAsRead(id), []);
  const markAsUnread = useCallback((id: string) => notificationService.markAsUnread(id), []);
  const markAllAsRead = useCallback(() => notificationService.markAllAsRead(userRole), [userRole]);
  const clearRead = useCallback(() => notificationService.clearRead(userRole), [userRole]);
  const deleteNotification = useCallback((id: string) => notificationService.deleteNotification(id), []);
  const snoozeNotification = useCallback((id: string, duration?: number | { hours?: number; days?: number; untilDate?: string }) => {
    notificationService.snoozeNotification(id, duration);
    // Also remove from active toast queue if present
    setToasts(prev => prev.filter(t => t.notification.id !== id));
  }, []);
  const unsnoozeNotification = useCallback((id: string) => notificationService.unsnoozeNotification(id), []);
  const updatePreferences = useCallback((newPrefs: Partial<NotificationPreferences>) => notificationService.updatePreferences(newPrefs), []);
  const resetToDefaults = useCallback(() => notificationService.resetToDefaults(), []);
  const purgeUnverifiedNotifications = useCallback(() => notificationService.purgeUnverifiedNotifications(), []);
  const triggerDatabaseAudit = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('scan_reminders'));
    }
  }, []);

  const dispatchNotification = useCallback((notif: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => {
    const isAlreadyPresent = notificationService.hasActiveNotification(notif);
    const created = notificationService.dispatchNotification(notif);
    // ONLY pop toast if this is a newly dispatched alert, preventing dual alerts on re-scans!
    if (!isAlreadyPresent) {
      addToast(created);
    }
    return created;
  }, [addToast]);

  // Preset Simulation Triggers
  const simulateTrigger = useCallback((type: 'out_of_stock' | 'low_stock' | 'overdue_debt' | 'upcoming_installment' | 'repair_ready' | 'spare_part' | 'register_discrepancy' | 'security_login') => {
    switch (type) {
      case 'out_of_stock':
        dispatchNotification({
          targetRole: 'Inventory',
          category: 'inventory',
          priority: 'critical',
          title: 'CRITICAL: Stock Depleted (0 Units)',
          message: 'Samsung Galaxy S24 Ultra Original Display Panel is now OUT OF STOCK (0 units left). Sales blocked.',
          metadata: {
            productId: 'part-s24u-disp',
            productName: 'Samsung Galaxy S24 Ultra Original Display Panel',
            sku: 'PART-SAM-S24U-DISP',
            currentStock: 0,
            minReorderLevel: 3,
            reorderQuantity: 10,
            itemCategory: 'spare_part',
            supplierName: 'Erbil Tech Parts Co.'
          },
          actionUrl: '/accessories',
        });
        break;

      case 'low_stock':
        dispatchNotification({
          targetRole: 'Inventory',
          category: 'inventory',
          priority: 'high',
          title: 'Low Stock Alert: Anker 65W GaN Charger',
          message: 'Anker PowerPort 65W Fast Charger is down to 2 units (Minimum threshold: 6 units).',
          metadata: {
            productId: 'acc-anker-65w',
            productName: 'Anker 65W GaN Fast Charger',
            sku: 'ACC-ANK-65W',
            currentStock: 2,
            minReorderLevel: 6,
            reorderQuantity: 24,
            itemCategory: 'accessory',
            supplierName: 'Anker Regional Dist.'
          },
          actionUrl: '/accessories',
        });
        break;

      case 'overdue_debt':
        dispatchNotification({
          targetRole: 'Cashier',
          category: 'debt',
          priority: 'critical',
          title: 'Urgent Overdue Debt: Hemn Farhad',
          message: 'Customer Hemn Farhad has an overdue balance of $620 USD (7 days past promised settlement date).',
          metadata: {
            customerId: 'cust-hemn-99',
            customerName: 'Hemn Farhad',
            customerPhone: '+9647504433221',
            amountDue: 620,
            currency: 'USD',
            dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            daysOverdue: 7,
            debtId: 'debt-hemn-99'
          },
          actionUrl: '/debts',
        });
        break;

      case 'upcoming_installment':
        dispatchNotification({
          targetRole: 'Cashier',
          category: 'debt',
          priority: 'medium',
          title: 'Upcoming Installment: Lanja Omer',
          message: 'Customer Lanja Omer has installment #3 of 6 ($150 USD) due in 24 hours.',
          metadata: {
            customerId: 'cust-lanja-03',
            customerName: 'Lanja Omer',
            customerPhone: '+9647701122334',
            amountDue: 150,
            currency: 'USD',
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            daysOverdue: 0,
            installmentId: 'inst-lanja-03'
          },
          actionUrl: '/installments',
        });
        break;

      case 'repair_ready':
        dispatchNotification({
          targetRole: 'Cashier',
          category: 'repair',
          priority: 'medium',
          title: 'Device Repair Ready: iPhone 13 Pro',
          message: 'Ticket #REP-3104 for iPhone 13 Pro (Battery Replaced & Recalibrated) is verified by Technician Zana.',
          metadata: {
            ticketId: 'rep-3104',
            ticketNumber: 'REP-3104',
            customerName: 'Aland Sardar',
            customerPhone: '+9647508877665',
            deviceModel: 'iPhone 13 Pro 256GB',
            technicianName: 'Zana Tech Master',
            repairStatus: 'ready',
            amountDue: 65,
            currency: 'USD'
          },
          actionUrl: '/pos',
        });
        break;

      case 'spare_part':
        dispatchNotification({
          targetRole: 'Inventory',
          category: 'repair',
          priority: 'high',
          title: 'Technician Part Request: iPad Air 5 Glass',
          message: 'Technician Dastan requested 1x iPad Air 5 Digitizer Glass for job #REP-3107.',
          metadata: {
            ticketId: 'rep-3107',
            ticketNumber: 'REP-3107',
            partRequired: 'iPad Air 5 Digitizer Front Glass',
            deviceModel: 'iPad Air 5 (10.9")',
            technicianName: 'Dastan Lab',
            repairStatus: 'part_requested'
          },
          actionUrl: '/accessories',
        });
        break;

      case 'register_discrepancy':
        dispatchNotification({
          targetRole: 'Administrator',
          category: 'security',
          priority: 'high',
          title: 'Cash Drawer Variance Detected',
          message: 'Mid-shift register check for Terminal #2 has a -$45.00 USD cash variance.',
          metadata: {
            registerId: 'POS-TERM-02',
            cashierName: 'Shwan POS',
            expectedAmount: 890,
            actualAmount: 845,
            discrepancyAmount: -45,
            currency: 'USD',
            eventType: 'register_close'
          },
          actionUrl: '/reports',
        });
        break;

      case 'security_login':
        dispatchNotification({
          targetRole: 'Administrator',
          category: 'security',
          priority: 'low',
          title: 'Admin Session from New IP',
          message: 'Administrator session initiated from IP 185.120.45.12 (Sulaymaniyah, IQ).',
          metadata: {
            userName: 'Nali Administrator',
            ipAddress: '185.120.45.12',
            deviceName: 'Apple Safari on macOS',
            eventType: 'login'
          },
          actionUrl: '/admin/security',
        });
        break;
    }
  }, [dispatchNotification]);

  // Stable callbacks for UI controls
  const openCenter = useCallback(() => setIsCenterOpen(true), []);
  const closeCenter = useCallback(() => setIsCenterOpen(false), []);
  const toggleCenter = useCallback(() => setIsCenterOpen(prev => !prev), []);
  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);
  const openSimulator = useCallback(() => setIsSimulatorOpen(true), []);
  const closeSimulator = useCallback(() => setIsSimulatorOpen(false), []);
  const setCategoryFilter = useCallback((category: any) => setFilterState(prev => ({ ...prev, category })), []);
  const setPriorityFilter = useCallback((priority: any) => setFilterState(prev => ({ ...prev, priority })), []);
  const setStatusFilter = useCallback((status: any) => setFilterState(prev => ({ ...prev, status })), []);
  const setSearchQuery = useCallback((searchQuery: string) => setFilterState(prev => ({ ...prev, searchQuery })), []);
  const setRoleFilter = useCallback((role: any) => setFilterState(prev => ({ ...prev, role })), []);
  const resetFilters = useCallback(() => setFilterState({ category: 'all', priority: 'all', status: 'all', searchQuery: '', role: 'all' }), []);

  const contextValue = useMemo(() => ({
    notifications: deduplicatedRoleList,
    filteredNotifications,
    unreadCount,
    criticalCount,
    preferences,
    filterState,
    isCenterOpen,
    isSettingsOpen,
    isSimulatorOpen,
    toasts,
    openCenter,
    closeCenter,
    toggleCenter,
    openSettings,
    closeSettings,
    openSimulator,
    closeSimulator,
    setCategoryFilter,
    setPriorityFilter,
    setStatusFilter,
    setSearchQuery,
    setRoleFilter,
    resetFilters,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    clearRead,
    deleteNotification,
    snoozeNotification,
    unsnoozeNotification,
    updatePreferences,
    resetToDefaults,
    purgeUnverifiedNotifications,
    triggerDatabaseAudit,
    dispatchNotification,
    dismissToast,
    rotateToastQueue,
    simulateTrigger,
  }), [
    deduplicatedRoleList,
    filteredNotifications,
    unreadCount,
    criticalCount,
    preferences,
    filterState,
    isCenterOpen,
    isSettingsOpen,
    isSimulatorOpen,
    toasts,
    openCenter,
    closeCenter,
    toggleCenter,
    openSettings,
    closeSettings,
    openSimulator,
    closeSimulator,
    setCategoryFilter,
    setPriorityFilter,
    setStatusFilter,
    setSearchQuery,
    setRoleFilter,
    resetFilters,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    clearRead,
    deleteNotification,
    snoozeNotification,
    unsnoozeNotification,
    updatePreferences,
    resetToDefaults,
    purgeUnverifiedNotifications,
    triggerDatabaseAudit,
    dispatchNotification,
    dismissToast,
    rotateToastQueue,
    simulateTrigger,
  ]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
