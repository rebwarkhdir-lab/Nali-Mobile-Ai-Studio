import React, { useEffect, useRef, useCallback } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { debtService } from '../../lib/debtService';
import { installmentService } from '../../lib/installmentService';
import { notificationService, getNotificationDedupeKey } from '../../lib/notificationService';
import { reportService } from '../../lib/reportService';
import { supplierService } from '../../lib/supplierService';
import { iosWidgetService } from '../../lib/iosWidgetService';

export function triggerDatabaseAudit() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('scan_reminders'));
  }
}

export function ReminderScanner() {
  const { notifications, dispatchNotification } = useNotifications();
  const notificationsRef = useRef(notifications);
  const dispatchRef = useRef(dispatchNotification);
  const isScanningRef = useRef(false);

  // Keep fresh refs for current scans
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    dispatchRef.current = dispatchNotification;
  }, [dispatchNotification]);

  const performScan = useCallback(async () => {
    if (isScanningRef.current) return;
    isScanningRef.current = true;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      // 1. Fetch live records across all active domain collections
      const [debts, installments, accessories, supplierInvoices] = await Promise.all([
        debtService.getAllDebts().catch(() => []),
        installmentService.getAllInstallments().catch(() => []),
        reportService.getAllAccessories().catch(() => []),
        supplierService.getAllInvoices().catch(() => [])
      ]);

      const safeDebts = Array.isArray(debts) ? debts : [];
      const safeInstallments = Array.isArray(installments) ? installments : [];
      const safeAccessories = Array.isArray(accessories) ? accessories : [];
      const safeSupplierInvoices = Array.isArray(supplierInvoices) ? supplierInvoices : [];

      const activeDebtIds = new Set<string>();
      const activeInstallmentIds = new Set<string>();
      const activeScheduleIds = new Set<string>();
      const activeLowStockProductIds = new Set<string>();
      const activeSupplierInvoiceIds = new Set<string>();

      const allCurrentNotifs = [...(notificationsRef.current || []), ...(notificationService.getAll() || [])];
      const dispatchedInCurrentScan = new Set<string>();

      const isAlreadyTrackedOrSnoozed = (candidateParams: any) => {
        const candidateKey = getNotificationDedupeKey(candidateParams);
        if (!candidateKey) return false;
        if (dispatchedInCurrentScan.has(candidateKey)) return true;

        return allCurrentNotifs.some(n => {
          if (!n || n.isPaid || n.archived) return false;
          const key = getNotificationDedupeKey(n);
          if (key !== candidateKey) return false;
          if (n.snoozedUntil && new Date(n.snoozedUntil).getTime() > Date.now()) {
            return true;
          }
          // If an active alert for this entity is already registered (read or unread), it is tracked!
          return true;
        });
      };

      const safelyDispatch = (params: any) => {
        const dedupeKey = getNotificationDedupeKey(params);
        if (dedupeKey) {
          if (dispatchedInCurrentScan.has(dedupeKey)) return;
          dispatchedInCurrentScan.add(dedupeKey);
        }
        dispatchRef.current(params);
      };

      // -------------------------------------------------------------
      // 2. Scan Real Customer Debts
      // -------------------------------------------------------------
      const seenDebtIds = new Set<string>();
      safeDebts.forEach(debt => {
        if (!debt || !debt.id || seenDebtIds.has(debt.id)) return;
        seenDebtIds.add(debt.id);
        if (debt.status === 'paid') return;

        const remaining = debt.remainingAmount !== undefined
          ? debt.remainingAmount
          : ((debt.originalAmount || 0) - (debt.paidAmount || 0));

        if (remaining <= 0) return;

        const debtDate = new Date(debt.dueDate || debt.createdAt || Date.now());
        const daysOld = Math.floor((today.getTime() - debtDate.getTime()) / (1000 * 3600 * 24));
        const isOverdue = debt.dueDate ? (debt.dueDate < todayStr) : (daysOld >= 30);

        if (isOverdue) {
          activeDebtIds.add(debt.id);

          // Respect debtor snoozing
          if (debt.snoozedUntil && debt.snoozedUntil > todayStr) return;

          const notifParams = {
            targetRole: 'Cashier' as const,
            category: 'debt' as const,
            priority: 'critical' as const,
            title: `Overdue Customer Debt: ${debt.customerName}`,
            message: `Customer ${debt.customerName} has an overdue balance of ${remaining.toLocaleString()} ${debt.currency || 'USD'}.`,
            metadata: {
              customerName: debt.customerName,
              customerPhone: debt.customerPhone,
              amountDue: remaining,
              currency: debt.currency as any,
              dueDate: debt.dueDate || debtDate.toISOString().split('T')[0],
              daysOverdue: Math.max(1, Math.abs(daysOld)),
              debtId: debt.id
            },
            actionUrl: `/debts?search=${encodeURIComponent(debt.customerName)}`
          };

          if (isAlreadyTrackedOrSnoozed(notifParams)) return;
          safelyDispatch(notifParams);
        }
      });

      // -------------------------------------------------------------
      // 3. Scan Real Customer Installment Plans
      // -------------------------------------------------------------
      const seenScheduleIds = new Set<string>();
      safeInstallments.forEach(plan => {
        if (!plan || !plan.id) return;
        if (plan.status === 'completed' || (plan.balanceRemaining !== undefined && plan.balanceRemaining <= 0)) return;

        const schedules = Array.isArray(plan.schedules) ? plan.schedules : [];
        schedules.forEach(schedule => {
          if (!schedule || !schedule.id || seenScheduleIds.has(schedule.id) || schedule.status === 'paid') return;
          seenScheduleIds.add(schedule.id);

          const remaining = (schedule.amountDue || 0) - (schedule.amountPaid || 0);
          if (remaining <= 0) return;

          const dueDate = new Date(schedule.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

          // Trigger if due in <= 3 days or already overdue
          if (daysDiff <= 3) {
            activeInstallmentIds.add(plan.id);
            activeScheduleIds.add(schedule.id);

            if (schedule.snoozedUntil && schedule.snoozedUntil > todayStr) return;

            const isOverdue = daysDiff < 0;
            const notifParams = {
              targetRole: 'Cashier' as const,
              category: 'debt' as const,
              priority: isOverdue ? ('critical' as const) : ('high' as const),
              title: isOverdue ? `Overdue Installment: ${plan.customerName}` : `Upcoming Installment: ${plan.customerName}`,
              message: `Customer ${plan.customerName} (Month #${schedule.monthNumber}) has ${remaining.toLocaleString()} ${plan.currency} ${isOverdue ? 'overdue by ' + Math.abs(daysDiff) + ' day(s)' : 'due in ' + daysDiff + ' day(s)'}.`,
              metadata: {
                customerName: plan.customerName,
                customerPhone: plan.customerPhone,
                amountDue: remaining,
                currency: plan.currency as any,
                dueDate: schedule.dueDate,
                daysOverdue: isOverdue ? Math.abs(daysDiff) : 0,
                installmentId: plan.id,
                scheduleId: schedule.id,
                monthNumber: schedule.monthNumber
              },
              actionUrl: `/installments?search=${encodeURIComponent(plan.customerName)}`
            };

            if (isAlreadyTrackedOrSnoozed(notifParams)) return;
            safelyDispatch(notifParams);
          }
        });
      });

      // -------------------------------------------------------------
      // 4. Scan Real Inventory (Accessories & Parts)
      // -------------------------------------------------------------
      const seenAccessoryKeys = new Set<string>();
      safeAccessories.forEach(acc => {
        if (!acc || !acc.id) return;
        const dedupeId = acc.id;
        const skuId = acc.barcode || acc.sku || '';

        // Prevent processing the same accessory item twice in a single scan
        if (seenAccessoryKeys.has(dedupeId) || (skuId && seenAccessoryKeys.has(skuId))) return;
        seenAccessoryKeys.add(dedupeId);
        if (skuId) seenAccessoryKeys.add(skuId);

        const qty = Number(acc.quantity) || 0;
        const threshold = acc.notifyThreshold !== undefined && acc.notifyThreshold > 0 ? acc.notifyThreshold : 2;

        if (qty <= 0) {
          activeLowStockProductIds.add(acc.id);

          const notifParams = {
            targetRole: 'Inventory' as const,
            category: 'inventory' as const,
            priority: 'critical' as const,
            title: `Out of Stock: ${acc.name}`,
            message: `${acc.name} (${acc.brand || acc.category || 'Accessory'}) is completely depleted (0 units).`,
            metadata: {
              productId: acc.id,
              productName: acc.name,
              sku: acc.barcode || acc.sku || '',
              currentStock: 0,
              minReorderLevel: threshold,
              reorderQuantity: 10,
              itemCategory: (acc.category || 'accessory') as any,
              supplierName: acc.company || ''
            },
            actionUrl: `/accessories?search=${encodeURIComponent(acc.name)}`
          };

          if (isAlreadyTrackedOrSnoozed(notifParams)) return;
          safelyDispatch(notifParams);
        } else if (qty <= threshold) {
          activeLowStockProductIds.add(acc.id);

          const notifParams = {
            targetRole: 'Inventory' as const,
            category: 'inventory' as const,
            priority: 'high' as const,
            title: `Low Stock Alert: ${acc.name}`,
            message: `${acc.name} has reached low threshold (${qty} unit${qty > 1 ? 's' : ''} left; minimum: ${threshold}).`,
            metadata: {
              productId: acc.id,
              productName: acc.name,
              sku: acc.barcode || acc.sku || '',
              currentStock: qty,
              minReorderLevel: threshold,
              reorderQuantity: 10,
              itemCategory: (acc.category || 'accessory') as any,
              supplierName: acc.company || ''
            },
            actionUrl: `/accessories?search=${encodeURIComponent(acc.name)}`
          };

          if (isAlreadyTrackedOrSnoozed(notifParams)) return;
          safelyDispatch(notifParams);
        }
      });

      // -------------------------------------------------------------
      // 5. Scan Real Supplier Payables
      // -------------------------------------------------------------
      const seenInvoiceIds = new Set<string>();
      safeSupplierInvoices.forEach(inv => {
        if (!inv || !inv.id || seenInvoiceIds.has(inv.id)) return;
        seenInvoiceIds.add(inv.id);
        if (inv.paymentStatus === 'paid') return;

        const unpaid = inv.remainingAmount !== undefined
          ? inv.remainingAmount
          : ((inv.totalAmount || 0) - (inv.paidAmount || 0));

        if (unpaid <= 0) return;

        if (inv.dueDate && inv.dueDate < todayStr) {
          activeSupplierInvoiceIds.add(inv.id);

          const notifParams = {
            targetRole: 'Administrator' as const,
            category: 'supplier' as const,
            priority: 'high' as const,
            title: `Overdue Supplier Payable: ${inv.supplierName || 'Vendor'}`,
            message: `Purchase invoice #${inv.invoiceNumber || inv.id.slice(0, 8)} for ${inv.supplierName || 'Supplier'} has an overdue balance of ${unpaid.toLocaleString()} ${inv.currency || 'USD'} (Due: ${inv.dueDate}).`,
            metadata: {
              invoiceId: inv.id,
              supplierName: inv.supplierName,
              amountDue: unpaid,
              currency: (inv.currency as any) || 'USD',
              dueDate: inv.dueDate
            },
            actionUrl: `/suppliers`
          };

          if (isAlreadyTrackedOrSnoozed(notifParams)) return;
          safelyDispatch(notifParams);
        }
      });

      // -------------------------------------------------------------
      // 6. Cross-Reconcile Notifications with Database
      // Prunes any alerts whose debt, installment, product or invoice
      // no longer exists, was paid, was restocked, or is fictitious.
      // -------------------------------------------------------------
      notificationService.reconcileWithDatabase({
        activeDebtIds,
        activeInstallmentIds,
        activeScheduleIds,
        activeLowStockProductIds,
        activeSupplierInvoiceIds
      });

      // Keep iPhone widgets in sync with the database audit using already-loaded data
      const syncWidgets = async () => {
        try {
          await iosWidgetService.syncWithDatabase({
            debts: safeDebts,
            installments: safeInstallments,
            accessories: safeAccessories
          });
        } catch (err) {}
      };
      syncWidgets();

    } catch (err) {
      console.warn('[ReminderScanner] Error during database audit:', err);
    } finally {
      isScanningRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Initial scan with brief settle delay for databases
    const initialTimer = setTimeout(() => {
      performScan();
    }, 1500);

    // Event listeners to trigger scans on mutations
    const handleScanEvent = () => performScan();
    const handleStockEvent = (e: any) => {
      const detail = e?.detail || {};
      if (detail.productId && detail.newQuantity !== undefined) {
        notificationService.handleStockUpdated(detail);
      }
      performScan();
    };

    window.addEventListener('scan_reminders', handleScanEvent);
    window.addEventListener('debts_updated', handleScanEvent);
    window.addEventListener('installments_updated', handleScanEvent);
    window.addEventListener('accessories_updated', handleScanEvent);
    window.addEventListener('suppliers_updated', handleScanEvent);
    window.addEventListener('stock_updated', handleStockEvent);

    return () => {
      clearTimeout(initialTimer);
      window.removeEventListener('scan_reminders', handleScanEvent);
      window.removeEventListener('debts_updated', handleScanEvent);
      window.removeEventListener('installments_updated', handleScanEvent);
      window.removeEventListener('accessories_updated', handleScanEvent);
      window.removeEventListener('suppliers_updated', handleScanEvent);
      window.removeEventListener('stock_updated', handleStockEvent);
    };
  }, [performScan]);

  return null;
}
