import { useState, useCallback, useMemo, useEffect } from 'react';
import { StockAlert, OrderItem, PurchaseOrder, AlertSeverity } from '../types/stockOrder';
import { Accessory } from '../types/accessory';
import { stockOrderService, RestockOptions } from '../lib/stockOrderService';
import { useToast } from '../components/common/Toast';
import { sound } from '../lib/sound';

export function useStockOrderManager(accessories: Accessory[], globalThreshold: number = 3) {
  const { success, error: toastError, info } = useToast();
  const [activeOrderItems, setActiveOrderItems] = useState<OrderItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('nali_active_po_items');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });
  const [orderHistory, setOrderHistory] = useState<PurchaseOrder[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Keep active order items saved to localStorage so user doesn't lose their work
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nali_active_po_items', JSON.stringify(activeOrderItems || []));
      } catch {}
    }
  }, [activeOrderItems]);

  // Load saved purchase orders from service
  const loadOrderHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const orders = await stockOrderService.getAllPurchaseOrders();
      setOrderHistory(Array.isArray(orders) ? orders : []);
    } catch (err) {
      console.warn('Failed to load purchase orders:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadOrderHistory();
  }, [loadOrderHistory]);

  // Generate alerts smartly for ALL under-stock items
  const alertItems = useMemo(() => {
    const alerts: StockAlert[] = [];

    (accessories || []).forEach(acc => {
      // If the user explicitly configured a notify threshold, use it.
      // If it's undefined or null, we assume they did not enable notifications for this item.
      const hasNotify = acc.notifyThreshold !== undefined && acc.notifyThreshold !== null;
      if (!hasNotify) return; // Skip items where notify is not enabled

      const threshold = acc.notifyThreshold!;
      if (threshold <= 0) return; // Skip if threshold is 0

      const currentStock = Number(acc.quantity) || 0;

      // Every item where currentStock <= threshold is an under-stock item
      if (currentStock <= threshold) {
        let severity: AlertSeverity = 'low';
        if (currentStock === 0) {
          severity = 'out_of_stock';
        } else if (currentStock <= Math.max(1, Math.floor(threshold / 2))) {
          severity = 'critical';
        }

        const deficit = Math.max(1, threshold - currentStock);
        // Smart suggested restock: bring stock up to threshold * 3 or minimum 10
        const targetHealthyLevel = Math.max(10, threshold * 3);
        const suggestedRestock = Math.max(5, targetHealthyLevel - currentStock);

        alerts.push({
          id: acc.id,
          accessoryId: acc.id,
          name: acc.name,
          brand: acc.brand || '',
          sku: acc.barcode || acc.sku || '',
          barcode: acc.barcode || '',
          category: acc.category || 'Accessories',
          currentStock,
          alertThreshold: threshold,
          deficit,
          suggestedRestock,
          supplier: acc.company || 'Thomas Walkers',
          estimatedCost: Number(acc.buyPrice) || 0,
          currency: acc.currency || 'USD',
          severity,
          image: acc.image,
          isDefectiveFlag: false
        });
      }
    });

    // Sort by most urgent first: out_of_stock -> critical -> low, then by lowest current stock
    return alerts.sort((a, b) => {
      const severityOrder: Record<AlertSeverity, number> = {
        out_of_stock: 0,
        critical: 1,
        low: 2,
        healthy: 3
      };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return a.currentStock - b.currentStock;
    });
  }, [accessories, globalThreshold]);

  // High-level statistics
  const stats = useMemo(() => {
    const safeItems = Array.isArray(alertItems) ? alertItems : [];
    const outOfStockCount = safeItems.filter(i => i.severity === 'out_of_stock').length;
    const criticalCount = safeItems.filter(i => i.severity === 'critical').length;
    const lowCount = safeItems.filter(i => i.severity === 'low').length;
    const totalDeficitUnits = safeItems.reduce((sum, i) => sum + (i?.deficit || 0), 0);

    const estCostUSD = safeItems
      .filter(i => i.currency === 'USD')
      .reduce((sum, i) => sum + ((i.suggestedRestock || 0) * (i.estimatedCost || 0)), 0);

    const estCostIQD = safeItems
      .filter(i => i.currency === 'IQD')
      .reduce((sum, i) => sum + ((i.suggestedRestock || 0) * (i.estimatedCost || 0)), 0);

    return {
      totalUnderStock: safeItems?.length || 0,
      outOfStockCount,
      criticalCount,
      lowCount,
      totalDeficitUnits,
      estCostUSD,
      estCostIQD
    };
  }, [alertItems]);

  const addToOrder = useCallback((item: OrderItem) => {
    setActiveOrderItems(prev => {
      const matchIndex = prev.findIndex(i => 
        (i.accessoryId && item.accessoryId && i.accessoryId === item.accessoryId) ||
        (i.sku && item.sku && i.sku === item.sku) ||
        (i.name.toLowerCase() === item.name.toLowerCase() && !item.isCustom)
      );

      if (matchIndex >= 0) {
        const copy = [...prev];
        copy[matchIndex] = {
          ...copy[matchIndex],
          quantity: copy[matchIndex].quantity + item.quantity,
          unitCost: item.unitCost || copy[matchIndex].unitCost
        };
        return copy;
      }
      return [...prev, item];
    });
  }, []);

  const addMultipleToOrder = useCallback((items: OrderItem[]) => {
    items.forEach(item => addToOrder(item));
  }, [addToOrder]);

  const updateOrderQty = useCallback((sku: string, id: string, qty: number) => {
    setActiveOrderItems(prev => prev.map(item => {
      if ((sku && item.sku === sku) || (!sku && item.id === id) || (item.accessoryId && item.accessoryId === id)) {
        return { ...item, quantity: Math.max(1, qty) };
      }
      return item;
    }));
  }, []);

  const removeOrderItem = useCallback((sku: string, id: string) => {
    setActiveOrderItems(prev => prev.filter(item => {
      if (sku && item.sku) return item.sku !== sku;
      if (id) return item.id !== id && item.accessoryId !== id;
      return true;
    }));
  }, []);

  const clearOrder = useCallback(() => {
    setActiveOrderItems([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nali_active_po_items');
    }
  }, []);

  // Save as draft PO to Supabase and local storage
  const saveAsDraft = useCallback(async (notes?: string) => {
    if ((activeOrderItems?.length || 0) === 0) return;
    sound.playClick();

    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    const newOrder: PurchaseOrder = {
      id: crypto.randomUUID(),
      orderNumber: `PO-${year}-${random}`,
      status: 'draft',
      items: [...(activeOrderItems || [])],
      totalAmountUSD: (activeOrderItems || []).filter(i => i.currency === 'USD').reduce((sum, i) => sum + (i.quantity * i.unitCost), 0),
      totalAmountIQD: (activeOrderItems || []).filter(i => i.currency === 'IQD').reduce((sum, i) => sum + (i.quantity * i.unitCost), 0),
      totalUnits: (activeOrderItems || []).reduce((sum, i) => sum + i.quantity, 0),
      notes: notes || 'Restock draft purchase order',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await stockOrderService.savePurchaseOrder(newOrder);
      await loadOrderHistory();
      sound.playSuccess();
      success(`Draft purchase order ${newOrder.orderNumber} saved to Supabase`);
      clearOrder();
    } catch (e: any) {
      toastError('Failed to save draft order');
    }
  }, [activeOrderItems, clearOrder, loadOrderHistory, success, toastError]);

  // Submit PO to Supabase
  const submitOrder = useCallback(async (notes?: string) => {
    if ((activeOrderItems?.length || 0) === 0) return;
    sound.playClick();

    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    const newOrder: PurchaseOrder = {
      id: crypto.randomUUID(),
      orderNumber: `PO-${year}-${random}`,
      status: 'submitted',
      items: [...(activeOrderItems || [])],
      totalAmountUSD: (activeOrderItems || []).filter(i => i.currency === 'USD').reduce((sum, i) => sum + (i.quantity * i.unitCost), 0),
      totalAmountIQD: (activeOrderItems || []).filter(i => i.currency === 'IQD').reduce((sum, i) => sum + (i.quantity * i.unitCost), 0),
      totalUnits: (activeOrderItems || []).reduce((sum, i) => sum + i.quantity, 0),
      notes: notes || 'Submitted purchase order',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submittedAt: new Date().toISOString()
    };

    try {
      await stockOrderService.savePurchaseOrder(newOrder);
      await loadOrderHistory();
      sound.playSuccess();
      success(`Purchase order ${newOrder.orderNumber} submitted & synced to Supabase`);
      clearOrder();
    } catch (e: any) {
      toastError('Failed to submit order');
    }
  }, [activeOrderItems, clearOrder, loadOrderHistory, success, toastError]);

  // Instant direct batch restock: Updates stock in Supabase and marks PO as received
  const restockAllOrderItems = useCallback(async (notes?: string): Promise<boolean> => {
    if ((activeOrderItems?.length || 0) === 0) return false;
    sound.playClick();

    const totalUnits = (activeOrderItems || []).reduce((sum, i) => sum + i.quantity, 0);
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    const poNumber = `RCV-${year}-${random}`;

    try {
      // 1. Batch restock accessories in Supabase & cache
      const res = await stockOrderService.batchRestockFromOrder(activeOrderItems, poNumber);

      // 2. Save completed purchase order record
      const newOrder: PurchaseOrder = {
        id: crypto.randomUUID(),
        orderNumber: poNumber,
        status: 'received',
        items: [...activeOrderItems],
        totalAmountUSD: activeOrderItems.filter(i => i.currency === 'USD').reduce((sum, i) => sum + (i.quantity * i.unitCost), 0),
        totalAmountIQD: activeOrderItems.filter(i => i.currency === 'IQD').reduce((sum, i) => sum + (i.quantity * i.unitCost), 0),
        totalUnits,
        notes: notes || 'Stock received and replenished directly to inventory',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        receivedAt: new Date().toISOString()
      };

      await stockOrderService.savePurchaseOrder(newOrder);
      await loadOrderHistory();

      sound.playSuccess();
      success(`Successfully restocked ${totalUnits} units across ${res.updatedCount} products into Supabase inventory!`);
      clearOrder();
      return true;
    } catch (e: any) {
      console.error('Batch restock failed:', e);
      toastError('Failed to replenish inventory in Supabase');
      return false;
    }
  }, [activeOrderItems, clearOrder, loadOrderHistory, success, toastError]);

  // Quick direct single item restock
  const quickRestockItem = useCallback(async (
    accessoryId: string, 
    qtyToAdd: number, 
    options?: RestockOptions
  ): Promise<{ success: boolean; newQuantity: number }> => {
    const res = await stockOrderService.restockAccessory(accessoryId, qtyToAdd, options);
    if (res.success) {
      sound.playSuccess();
      success(`Restocked +${qtyToAdd} units. New stock: ${res.newQuantity}`);
    } else {
      sound.playError();
      toastError(res.error || 'Failed to update stock');
    }
    return res;
  }, [success, toastError]);

  // Update item threshold
  const updateThreshold = useCallback(async (accessoryId: string, newThreshold: number) => {
    const ok = await stockOrderService.updateItemThreshold(accessoryId, newThreshold);
    if (ok) {
      sound.playSuccess();
      info(`Reorder threshold updated to ${newThreshold}`);
    } else {
      toastError('Failed to update threshold');
    }
    return ok;
  }, [info, toastError]);

  return {
    alertItems,
    stats,
    activeOrderItems,
    orderHistory,
    isLoadingHistory,
    loadOrderHistory,
    addToOrder,
    addMultipleToOrder,
    updateOrderQty,
    removeOrderItem,
    clearOrder,
    saveAsDraft,
    submitOrder,
    restockAllOrderItems,
    quickRestockItem,
    updateThreshold
  };
}
