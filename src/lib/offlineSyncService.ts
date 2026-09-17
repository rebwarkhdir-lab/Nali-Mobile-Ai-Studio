import { supabase } from './supabase';
import { screenProtectorService } from './screenProtectorService';
import { idb, SyncQueueItem, SyncLogItem } from './idbService';
import { Mobile } from '../types/mobile';
import { Accessory } from '../types/accessory';
import { Debt } from '../types/debt';
import { InstallmentPlan } from '../types/installment';
import { POSReceiptData } from '../components/pos/POSReceiptModal';
import { convertCurrency, formatCurrency } from './utils';
import { debtService, mapDebtToDb, mapPaymentToDb } from './debtService';
import { installmentService, mapInstallmentToDb, mapScheduleToDb } from './installmentService';
import { supplierService } from './supplierService';

export type SyncStatusListener = (status: {
  isOnline: boolean;
  isSimulatingOffline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  lastError: string | null;
}) => void;

class OfflineSyncService {
  private isOnlineInternal: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSimulatingOfflineInternal: boolean = false;
  private isSyncingInternal: boolean = false;
  private pendingCountInternal: number = 0;
  private lastSyncTimeInternal: string | null = null;
  private lastErrorInternal: string | null = null;
  private listeners: Set<SyncStatusListener> = new Set();
  private syncIntervalId: any = null;
  private pingIntervalId: any = null;

  constructor() {
    this.init();
  }

  public async init() {
    if (typeof window === 'undefined') return;

    // Load saved settings & state
    try {
      const savedLastSync = localStorage.getItem('nali_last_sync_timestamp');
      if (savedLastSync) this.lastSyncTimeInternal = savedLastSync;

      const savedSimulate = localStorage.getItem('nali_simulate_offline');
      if (savedSimulate === 'true') this.isSimulatingOfflineInternal = true;
    } catch (e) {}

    // Attach native network event listeners
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));

    // Update pending queue count
    await this.refreshQueueCount();

    // Start periodic background sync and heartbeat check
    this.startBackgroundWorkers();

    // Notify listeners
    this.notify();
  }

  // Determine if application is effectively online
  public get isOnline(): boolean {
    if (this.isSimulatingOfflineInternal) return false;
    return this.isOnlineInternal;
  }

  public get isSimulatingOffline(): boolean {
    return this.isSimulatingOfflineInternal;
  }

  public get isSyncing(): boolean {
    return this.isSyncingInternal;
  }

  public get pendingCount(): number {
    return this.pendingCountInternal;
  }

  public get lastSyncTime(): string | null {
    return this.lastSyncTimeInternal;
  }

  public get lastError(): string | null {
    return this.lastErrorInternal;
  }

  public subscribe(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getStatus() {
    return {
      isOnline: this.isOnline,
      isSimulatingOffline: this.isSimulatingOfflineInternal,
      isSyncing: this.isSyncingInternal,
      pendingCount: this.pendingCountInternal,
      lastSyncTime: this.lastSyncTimeInternal,
      lastError: this.lastErrorInternal
    };
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (e) {
        console.error(e);
      }
    });
  }

  public async setSimulateOffline(simulate: boolean) {
    this.isSimulatingOfflineInternal = simulate;
    try {
      localStorage.setItem('nali_simulate_offline', simulate ? 'true' : 'false');
    } catch (e) {}

    await this.addLog(
      simulate ? 'warning' : 'info',
      simulate ? 'Simulated Offline Mode Enabled' : 'Simulated Offline Mode Disabled',
      simulate ? 'POS and app will operate strictly in offline local cache mode.' : 'Online syncing restored.'
    );

    this.notify();

    if (!simulate && this.isOnlineInternal) {
      // Auto-trigger sync queue on going back online
      this.syncAll();
    }
  }

  private async handleNetworkChange(online: boolean) {
    this.isOnlineInternal = online;
    await this.addLog(
      online ? 'success' : 'warning',
      online ? 'Internet Connection Restored' : 'Internet Connection Lost',
      online ? 'Attempting automatic synchronization of pending transactions.' : 'Operating in offline local cache mode.'
    );
    this.notify();

    if (online && !this.isSimulatingOfflineInternal) {
      // Trigger instant queue synchronization
      setTimeout(() => {
        this.syncAll();
      }, 1000);
    }
  }

  private startBackgroundWorkers() {
    if (this.syncIntervalId) clearInterval(this.syncIntervalId);
    if (this.pingIntervalId) clearInterval(this.pingIntervalId);

    // Periodic queue check every 30 seconds only if there are pending items
    this.syncIntervalId = setInterval(() => {
      if (this.isOnline && !this.isSyncingInternal && this.pendingCountInternal > 0) {
        this.processSyncQueue();
      }
    }, 30000);
  }

  public async checkNetworkPing(): Promise<boolean> {
    if (this.isSimulatingOfflineInternal) return false;
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  // Refresh pending items count
  public async refreshQueueCount(): Promise<number> {
    const queue = await idb.getAll<SyncQueueItem>('sync_queue');
    const pending = (queue || []).filter((q) => q.status === 'pending' || q.status === 'failed');
    this.pendingCountInternal = pending?.length || 0;
    this.notify();
    return this.pendingCountInternal;
  }

  // Add Log Entry
  public async addLog(level: 'info' | 'success' | 'warning' | 'error', title: string, details?: string) {
    const logItem: SyncLogItem = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      level,
      title,
      details
    };
    await idb.put('sync_logs', logItem);
  }

  // Get Sync Logs
  public async getSyncLogs(): Promise<SyncLogItem[]> {
    const logs = await idb.getAll<SyncLogItem>('sync_logs');
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 100);
  }

  // Clear Sync Logs
  public async clearSyncLogs(): Promise<void> {
    await idb.clear('sync_logs');
  }

  // Enqueue a sync action
  public async enqueueAction(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'retryCount'>): Promise<string> {
    const id = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const queueItem: SyncQueueItem = {
      ...item,
      id,
      createdAt: now,
      updatedAt: now,
      status: 'pending',
      retryCount: 0
    };

    await idb.put('sync_queue', queueItem);
    await this.refreshQueueCount();

    await this.addLog('info', `Queued ${item.entityType.toUpperCase()}`, item.summary);

    // If online, attempt background flush right away
    if (this.isOnline && !this.isSyncingInternal) {
      setTimeout(() => this.processSyncQueue(), 200);
    }

    return id;
  }

  // POS Complete Checkout - Offline First Processor
  public async processPOSSaleOffline(
    receipt: POSReceiptData,
    cartItems: any[],
    exchangeRate: number
  ): Promise<{ success: boolean; isOfflineRecorded: boolean; invoiceNo: string }> {
    const now = new Date().toISOString();

    try {
      // 1. Save full receipt in offline sales history store
      await idb.put('pos_sales', receipt);

      // 2. Locally update Mobile inventory store (mark as sold)
      const currentMobiles = await idb.getAll<Mobile>('mobiles');
      for (const item of cartItems) {
        if (item.product.type === 'mobile') {
          const mob = currentMobiles.find((m) => m.id === item.product.id);
          if (mob) {
            const updatedMob: Mobile = {
              ...mob,
              status: 'sold',
              soldDate: receipt.date || now.split('T')[0],
              soldPrice: item.product.currency === 'USD' ? item.customPrice ?? item.product.price : convertCurrency(item.customPrice ?? item.product.price, 'IQD', 'USD', exchangeRate),
              soldToCustomer: receipt.customer?.name ? `${receipt.customer.name} ${receipt.customer.phone ? `(${receipt.customer.phone})` : ''}` : 'Walk-in Customer',
              soldNotes: `POS Sale #${receipt.invoiceNo} [${receipt.sellType.toUpperCase()}]`
            };
            await idb.put('mobiles', updatedMob);
          }
        } else if (item.product.type === 'accessory') {
          // 3. Locally update Accessory inventory store (deduct quantity)
          const currentAccs = await idb.getAll<Accessory>('accessories');
          const acc = currentAccs.find((a) => a.id === item.product.id);
          if (acc) {
            const newQty = Math.max(0, acc.quantity - item.quantity);
            const newStatus = newQty <= 0 ? 'out_of_stock' : (acc.notifyThreshold && newQty <= acc.notifyThreshold ? 'low_stock' : 'in_stock');
            const newSold = (acc.totalSold || 0) + item.quantity;
            const updatedAcc: Accessory = {
              ...acc,
              quantity: newQty,
              status: newStatus,
              totalSold: newSold,
              updatedAt: now
            };
            await idb.put('accessories', updatedAcc);
          }
        }
      }

      // 4. Create Local Debt or Installment Record if applicable
      if (receipt.sellType === 'debt') {
        const productSummary = receipt.items.map((i) => `${i.name} (x${i.quantity})`).join(', ');
        const down = receipt.debtDownPayment || 0;
        const orig = receipt.total;
        const rem = Math.max(0, orig - down);
        const debtId = `debt_${receipt.invoiceNo}_${Date.now().toString().slice(-4)}`;

        const localDebt: Debt = {
          id: debtId,
          customerName: receipt.customer?.name || 'Customer',
          customerPhone: receipt.customer?.phone || '',
          customerAddress: receipt.customer?.address || '',
          guarantorName: receipt.customer?.guarantorName || '',
          guarantorPhone: receipt.customer?.guarantorPhone || '',
          invoiceNumber: receipt.invoiceNo,
          productSummary,
          originalAmount: orig,
          downPayment: down,
          paidAmount: down,
          remainingAmount: rem,
          currency: receipt.checkoutCurrency,
          startDate: receipt.date || now.split('T')[0],
          dueDate: receipt.debtDueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          status: rem <= 0 ? 'paid' : 'outstanding',
          notes: receipt.notes || 'POS Sale Debt',
          payments: down > 0 ? [
            {
              id: `pmt_pos_${debtId}`,
              debtId: debtId,
              amount: down,
              currency: receipt.checkoutCurrency,
              paymentDate: now,
              paymentMethod: 'cash',
              receiptNumber: `REC-POS-${receipt.invoiceNo}`,
              notes: 'Initial Down Payment at POS',
              receivedBy: 'POS Cashier',
              createdAt: now
            }
          ] : [],
          createdAt: now,
          updatedAt: now
        };
        await idb.put('debts', localDebt);
        try {
          const localDebtsRaw = localStorage.getItem('nali_debts_data');
          const currentDebts = localDebtsRaw ? JSON.parse(localDebtsRaw) : [];
          localStorage.setItem('nali_debts_data', JSON.stringify([localDebt, ...currentDebts]));
        } catch(e) {}
      } else if (receipt.sellType === 'installment') {
        const productSummary = receipt.items.map((i) => `${i.name} (x${i.quantity})`).join(', ');
        const duration = receipt.installmentMonths || 6;
        const down = receipt.installmentDownPayment || 0;
        const fee = receipt.installmentAdditionalFee || 0;
        const totalWithFee = receipt.total + fee;
        const financed = Math.max(0, totalWithFee - down);
        const monthly = receipt.installmentMonthlyPayment || (financed > 0 ? (receipt.checkoutCurrency === 'USD' ? parseFloat((financed / duration).toFixed(2)) : Math.ceil(financed / duration)) : 0);
        const installmentId = `ins_${receipt.invoiceNo}_${Date.now().toString().slice(-4)}`;

        const localPlan: InstallmentPlan = {
          id: installmentId,
          contractNumber: `INS-${receipt.invoiceNo}`,
          customerName: receipt.customer?.name || 'Customer',
          customerPhone: receipt.customer?.phone || '',
          customerIdCard: receipt.customer?.idCard || '',
          customerAddress: receipt.customer?.address || '',
          guarantorName: receipt.customer?.guarantorName || '',
          guarantorPhone: receipt.customer?.guarantorPhone || '',
          productSummary,
          principalAmount: receipt.total,
          additionalFee: fee,
          totalAmount: totalWithFee,
          downPayment: down,
          remainingAmount: financed,
          durationMonths: duration,
          frequency: 'monthly',
          monthlyPayment: monthly,
          paidAmount: down,
          balanceRemaining: financed,
          currency: receipt.checkoutCurrency,
          startDate: receipt.date || now.split('T')[0],
          firstDueDate: receipt.installmentFirstDueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          status: financed <= 0 ? 'completed' : 'active',
          notes: receipt.notes || 'POS Installment Agreement',
          schedules: Array.from({ length: duration }).map((_, idx) => {
            const d = new Date(receipt.installmentFirstDueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
            d.setMonth(d.getMonth() + idx);
            return {
              id: `sch_${installmentId}_m${idx + 1}`,
              installmentId,
              monthNumber: idx + 1,
              dueDate: d.toISOString().split('T')[0],
              amountDue: monthly,
              amountPaid: 0,
              status: 'upcoming'
            };
          }),
          createdAt: now,
          updatedAt: now
        };
        await idb.put('installments', localPlan);
        try {
          const localPlansRaw = localStorage.getItem('nali_installments_data');
          const currentPlans = localPlansRaw ? JSON.parse(localPlansRaw) : [];
          localStorage.setItem('nali_installments_data', JSON.stringify([localPlan, ...currentPlans]));
        } catch(e) {}
      }

      // 5. Enqueue synchronization job
      await this.enqueueAction({
        entityType: 'pos_sale',
        action: 'pos_sale_transaction',
        payload: {
          receipt,
          cartItems,
          exchangeRate
        },
        idempotencyKey: `pos_sale_${receipt.invoiceNo}`,
        summary: `Sale #${receipt.invoiceNo} (${receipt.items?.length || 0} items, ${formatCurrency(receipt.total, receipt.checkoutCurrency)})`
      });

      return {
        success: true,
        isOfflineRecorded: !this.isOnline,
        invoiceNo: receipt.invoiceNo
      };
    } catch (err) {
      console.error('Error during processPOSSaleOffline:', err);
      throw err;
    }
  }

  // Process all pending items in sync queue
  public async processSyncQueue(): Promise<{ totalProcessed: number; failed: number }> {
    if (this.isSyncingInternal || !this.isOnline) {
      return { totalProcessed: 0, failed: 0 };
    }

    this.isSyncingInternal = true;
    this.lastErrorInternal = null;
    this.notify();

    let totalProcessed = 0;
    let failed = 0;

    try {
      const queue = await idb.getAll<SyncQueueItem>('sync_queue');
      const pendingItems = (queue || [])
        .filter((q) => q.status === 'pending' || q.status === 'failed')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      if ((pendingItems?.length || 0) === 0) {
        this.isSyncingInternal = false;
        this.notify();
        return { totalProcessed: 0, failed: 0 };
      }

      await this.addLog('info', `Sync Worker Started`, `Synchronizing ${pendingItems?.length || 0} queued transactions to Supabase.`);

      for (const item of pendingItems) {
        // Mark as syncing
        item.status = 'syncing';
        item.updatedAt = new Date().toISOString();
        await idb.put('sync_queue', item);

        try {
          // Execute sync based on action type
          await this.executeSyncItem(item);

          // Mark as successfully synced & remove from active queue
          item.status = 'synced';
          item.updatedAt = new Date().toISOString();
          await idb.put('sync_queue', item);
          await idb.delete('sync_queue', item.id); // Remove synced item from queue

          totalProcessed++;
          await this.addLog('success', `Synced: ${item.summary}`, `Action completed in Supabase.`);
        } catch (itemErr: any) {
          failed++;
          item.status = 'failed';
          item.retryCount = (item.retryCount || 0) + 1;
          item.lastError = itemErr?.message || String(itemErr);
          item.updatedAt = new Date().toISOString();
          await idb.put('sync_queue', item);

          console.warn(`Sync failed for queue item ${item.id}:`, itemErr);
          await this.addLog('warning', `Sync Failed: ${item.summary}`, `Retry #${item.retryCount}: ${item.lastError}`);
        }
      }

      this.lastSyncTimeInternal = new Date().toISOString();
      try {
        localStorage.setItem('nali_last_sync_timestamp', this.lastSyncTimeInternal);
      } catch (e) {}

      // Local items are already patched during executeSyncItem and checkout.
      // Do not perform a heavy multi-table cloud download after every sale.
      await this.refreshQueueCount();
      await this.addLog(
        failed === 0 ? 'success' : 'warning',
        `Sync Completed`,
        `Processed: ${totalProcessed}, Failures: ${failed}. Local cache refreshed.`
      );
    } catch (globalErr: any) {
      this.lastErrorInternal = globalErr?.message || 'Sync worker encountered an error';
      await this.addLog('error', `Sync Engine Error`, this.lastErrorInternal || undefined);
    } finally {
      this.isSyncingInternal = false;
      await this.refreshQueueCount();
      this.notify();
    }

    return { totalProcessed, failed };
  }

  // Execute single sync item against Supabase
  private async executeSyncItem(item: SyncQueueItem): Promise<void> {
    if (item.action === 'pos_sale_transaction') {
      const { receipt, cartItems, exchangeRate } = item.payload;

      // 1. Update Mobiles in Supabase
      for (const cartItem of cartItems) {
        if (cartItem.product.type === 'mobile') {
          let soldCustStr = receipt.customer?.name || 'Walk-in Customer';
          if (receipt.customer?.phone) soldCustStr += ` (${receipt.customer.phone})`;
          if (receipt.sellType === 'debt') soldCustStr = `[DEBT] ${soldCustStr}`;
          if (receipt.sellType === 'installment') soldCustStr = `[INSTALLMENT ${receipt.installmentMonths}M] ${soldCustStr}`;

          let noteDetails = `POS Sale #${receipt.invoiceNo} | Type: ${receipt.sellType.toUpperCase()}`;
          if (receipt.notes) noteDetails += ` | Note: ${receipt.notes}`;

          const activePrice = cartItem.customPrice !== undefined ? cartItem.customPrice : cartItem.product.price;
          const soldUSD = cartItem.product.currency === 'USD' ? activePrice : convertCurrency(activePrice, 'IQD', 'USD', exchangeRate);

          const { error } = await supabase
            .from('nali_mobiles')
            .update({
              status: 'sold',
              soldDate: receipt.date || new Date().toISOString().split('T')[0],
              soldPrice: soldUSD,
              soldToCustomer: soldCustStr,
              soldNotes: noteDetails
            })
            .eq('id', cartItem.product.id);

          if (error && error.code !== 'PGRST205') {
            console.warn(`Supabase mobile update error for ${cartItem.product.id}:`, error);
          }
        } else if (cartItem.product.type === 'accessory') {
          // 2. Fetch current accessory qty from database to prevent race condition, then deduct
          const { data: dbAcc } = await supabase
            .from('nali_accessories')
            .select('quantity, totalSold')
            .eq('id', cartItem.product.id)
            .maybeSingle();

          const currentQty = dbAcc?.quantity ?? cartItem.product.stock ?? 10;
          const newQty = Math.max(0, currentQty - cartItem.quantity);
          const newStatus = newQty <= 0 ? 'out_of_stock' : (cartItem.product.notifyThreshold && newQty <= cartItem.product.notifyThreshold ? 'low_stock' : 'in_stock');
          const newSold = (dbAcc?.totalSold ?? cartItem.product.totalSold ?? 0) + cartItem.quantity;

          const { error } = await supabase
            .from('nali_accessories')
            .update({
              quantity: newQty,
              status: newStatus,
              totalSold: newSold,
              updatedAt: new Date().toISOString()
            })
            .eq('id', cartItem.product.id);

          if (error && error.code !== 'PGRST205') {
            console.warn(`Supabase accessory update error for ${cartItem.product.id}:`, error);
          }
        }
      }

      // 3. Sync Debt record if debt
      if (receipt.sellType === 'debt') {
        const productSummary = receipt.items.map((i: any) => `${i.name} (x${i.quantity})`).join(', ');
        const down = receipt.debtDownPayment || 0;
        const orig = receipt.total;
        const rem = Math.max(0, orig - down);
        const dueDate = receipt.debtDueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

        const debtPayload = {
          customer_name: receipt.customer?.name || 'Customer',
          customer_phone: receipt.customer?.phone || null,
          customer_address: receipt.customer?.address || null,
          guarantor_name: receipt.customer?.guarantorName || null,
          guarantor_phone: receipt.customer?.guarantorPhone || null,
          invoice_number: receipt.invoiceNo,
          product_summary: productSummary,
          original_amount: orig,
          down_payment: down,
          paid_amount: down,
          remaining_amount: rem,
          currency: receipt.checkoutCurrency,
          start_date: receipt.date || new Date().toISOString().split('T')[0],
          due_date: dueDate,
          status: rem <= 0 ? 'paid' : (down > 0 ? 'partially_paid' : 'outstanding'),
          notes: receipt.notes || null
        };

        const { error } = await supabase.from('nali_debts').insert(debtPayload);
        if (error && error.code !== 'PGRST205') {
          console.warn('Supabase debt insert error:', error);
        }
      }

      // 4. Sync Installment Plan if installment
      if (receipt.sellType === 'installment') {
        const productSummary = receipt.items.map((i: any) => `${i.name} (x${i.quantity})`).join(', ');
        const duration = receipt.installmentMonths || 6;
        const down = receipt.installmentDownPayment || 0;
        const fee = receipt.installmentAdditionalFee || 0;
        const totalWithFee = receipt.total + fee;
        const financed = Math.max(0, totalWithFee - down);
        const monthly = receipt.installmentMonthlyPayment || (financed > 0 ? (receipt.checkoutCurrency === 'USD' ? parseFloat((financed / duration).toFixed(2)) : Math.ceil(financed / duration)) : 0);

        const installmentPayload = {
          id: `ins_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          contract_number: `INS-${receipt.invoiceNo}`,
          customer_name: receipt.customer?.name || 'Customer',
          customer_phone: receipt.customer?.phone || null,
          customer_id_card: receipt.customer?.idCard || null,
          customer_address: receipt.customer?.address || null,
          guarantor_name: receipt.customer?.guarantorName || null,
          guarantor_phone: receipt.customer?.guarantorPhone || null,
          product_summary: productSummary,
          principal_amount: receipt.total,
          additional_fee: fee,
          total_amount: totalWithFee,
          down_payment: down,
          remaining_amount: financed,
          paid_amount: down,
          balance_remaining: financed,
          duration_months: duration,
          frequency: 'monthly',
          monthly_payment: monthly,
          currency: receipt.checkoutCurrency,
          start_date: receipt.date || new Date().toISOString().split('T')[0],
          first_due_date: receipt.installmentFirstDueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          status: financed <= 0 ? 'completed' : 'active',
          notes: receipt.notes || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: insertedPlan, error } = await supabase.from('nali_installments').insert(installmentPayload).select('id').single();
        if (error && error.code !== 'PGRST205') {
          console.warn('Supabase installment insert error:', error);
        } else {
          const planId = insertedPlan?.id || installmentPayload.id;
          const schedulesToInsert = Array.from({ length: duration }).map((_, idx) => {
            const d = new Date(installmentPayload.first_due_date);
            d.setMonth(d.getMonth() + idx);
            return {
              id: `sch_${planId}_m${idx + 1}`,
              installment_id: planId,
              month_number: idx + 1,
              due_date: d.toISOString().split('T')[0],
              amount_due: monthly,
              amount_paid: 0,
              status: 'upcoming',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          });
          await supabase.from('nali_installment_schedules').insert(schedulesToInsert);
        }
      }

      // 5. Persist Sale Receipt to Supabase pos_sales table
      try {
        await supabase.from('pos_sales').upsert({
          invoice_no: receipt.invoiceNo,
          date: receipt.date || new Date().toISOString().split('T')[0],
          time: receipt.time || new Date().toLocaleTimeString(),
          sell_type: receipt.sellType,
          customer_name: receipt.customer?.name || null,
          customer_phone: receipt.customer?.phone || null,
          customer_id_card: receipt.customer?.idCard || null,
          customer_address: receipt.customer?.address || null,
          guarantor_name: receipt.customer?.guarantorName || null,
          guarantor_phone: receipt.customer?.guarantorPhone || null,
          items: receipt.items || [],
          subtotal: receipt.subtotal || 0,
          discount: receipt.discount || 0,
          tax: receipt.tax || 0,
          total: receipt.total || 0,
          checkout_currency: receipt.checkoutCurrency || 'USD',
          exchange_rate: receipt.exchangeRate || exchangeRate || 1500,
          payment_method: receipt.sellType,
          notes: receipt.notes || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'invoice_no' });
      } catch (saleErr) {
        console.warn('pos_sales sync notice:', saleErr);
      }
    } else if (item.entityType === 'mobile_update') {
      const { id, updates } = item.payload;
      await supabase.from('nali_mobiles').update(updates).eq('id', id);
    } else if (item.entityType === 'accessory_update') {
      const { id, updates } = item.payload;
      await supabase.from('nali_accessories').update(updates).eq('id', id);
    }
  }

  // Pull latest data down from Supabase into IndexedDB
  public async syncDownLatest(): Promise<void> {
    if (!this.isOnline) return;

    try {
      // 1. Sync Mobiles
      const { data: mobilesData, error: mobErr } = await supabase.from('nali_mobiles').select('*');
      if (!mobErr && Array.isArray(mobilesData)) {
        await idb.clear('mobiles');
        if (Array.isArray(mobilesData) && mobilesData.length > 0) {
          await idb.bulkPut('mobiles', mobilesData);
        }
        try {
          localStorage.setItem('nali_mobiles_cache', JSON.stringify(mobilesData));
          localStorage.setItem('nali_pos_mobiles_cache', JSON.stringify(mobilesData));
        } catch (e) {}
      }

      // 2. Sync Accessories
      const { data: accData, error: accErr } = await supabase.from('nali_accessories').select('*');
      if (!accErr && Array.isArray(accData)) {
        await idb.clear('accessories');
        if (Array.isArray(accData) && accData.length > 0) {
          await idb.bulkPut('accessories', accData);
        }
        try {
          localStorage.setItem('nali_accessories_cache', JSON.stringify(accData));
          localStorage.setItem('nali_pos_accessories_cache', JSON.stringify(accData));
        } catch (e) {}
      }

      // 3. Sync Debts
      const { data: debtData, error: debtErr } = await supabase.from('nali_debts').select('*');
      if (!debtErr && Array.isArray(debtData)) {
        await idb.clear('debts');
        if (Array.isArray(debtData) && debtData.length > 0) {
          await idb.bulkPut('debts', debtData);
        }
      }

      // 4. Sync Installments
      const { data: insData, error: insErr } = await supabase.from('nali_installments').select('*');
      if (!insErr && Array.isArray(insData)) {
        await idb.clear('installments');
        if (Array.isArray(insData) && insData.length > 0) {
          await idb.bulkPut('installments', insData);
        }
      }
      
      // 5. Sync Screen Protectors Settings table
      await screenProtectorService.syncWithCloud();

      // 6. Sync Suppliers & RMA Returns
      await supplierService.getAllSuppliers();
      await supplierService.getAllReturns();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('supabase_data_reload'));
      }
    } catch (err) {
      console.warn('syncDownLatest error:', err);
    }
  }

  // Push all local IndexedDB & cached data into Supabase (for initial sync or linking devices)
  public async syncUpAllLocalDataToCloud(): Promise<{ mobilesPushed: number; accessoriesPushed: number; debtsPushed: number; installmentsPushed: number }> {
    let mobilesPushed = 0;
    let accessoriesPushed = 0;
    let debtsPushed = 0;
    let installmentsPushed = 0;

    try {
      // 1. Upload Mobiles
      const localMobiles = await idb.getAll<Mobile>('mobiles');
      if (Array.isArray(localMobiles) && localMobiles.length > 0) {
        for (const m of localMobiles) {
          try {
            const { error } = await supabase.from('nali_mobiles').upsert(m);
            if (!error) mobilesPushed++;
          } catch {}
        }
      }

      // 2. Upload Accessories
      const localAcc = await idb.getAll<Accessory>('accessories');
      if (Array.isArray(localAcc) && localAcc.length > 0) {
        for (const a of localAcc) {
          try {
            const cleanAcc = {
              ...a,
              barcode: (a.barcode || '').trim() || ('BAR-' + Date.now()),
              company: (a.company || '').trim() || 'General Supplier'
            };
            const { error } = await supabase.from('nali_accessories').upsert(cleanAcc);
            if (!error) accessoriesPushed++;
          } catch {}
        }
      }

      // 3. Upload Debts
      const localDebts = await idb.getAll<Debt>('debts');
      if (Array.isArray(localDebts) && localDebts.length > 0) {
        for (const d of localDebts) {
          try {
            const dbDebt = mapDebtToDb(d);
            const { error } = await supabase.from('nali_debts').upsert(dbDebt);
            if (!error) {
              debtsPushed++;
              if (Array.isArray(d?.payments) && d.payments.length > 0) {
                for (const p of d.payments) {
                  const dbPmt = mapPaymentToDb(p);
                  await supabase.from('nali_debt_payments').upsert(dbPmt);
                }
              }
            }
          } catch {}
        }
      }

      // 4. Upload Installments
      const localIns = await idb.getAll<InstallmentPlan>('installments');
      if (Array.isArray(localIns) && localIns.length > 0) {
        for (const i of localIns) {
          try {
            const dbPlan = mapInstallmentToDb(i);
            const { error: planErr } = await supabase.from('nali_installments').upsert(dbPlan);
            if (!planErr) {
              installmentsPushed++;
              if (Array.isArray(i?.schedules) && i.schedules.length > 0) {
                const dbSchedules = i.schedules.map(s => mapScheduleToDb(s, i.id));
                await supabase.from('nali_installment_schedules').upsert(dbSchedules);
              }
            }
          } catch {}
        }
      }

      // 5. Upload Suppliers
      try {
        await supplierService.pushLocalSuppliersToCloud();
      } catch {}

      // 6. Upload Screen Protectors
      try {
        await screenProtectorService.saveGroups(true);
      } catch {}

      await this.addLog('success', 'Initial Cloud Push Complete', `Pushed ${mobilesPushed} mobiles, ${accessoriesPushed} accessories to Supabase.`);
      await this.syncDownLatest();
    } catch (e: any) {
      await this.addLog('warning', 'Cloud Push Partial', e?.message);
    }

    return { mobilesPushed, accessoriesPushed, debtsPushed, installmentsPushed };
  }

  // Manual Trigger to sync everything
  public async syncAll(): Promise<{ totalProcessed: number; failed: number }> {
    return this.processSyncQueue();
  }

  // Get all pending sync items
  public async getPendingItems(): Promise<SyncQueueItem[]> {
    const queue = await idb.getAll<SyncQueueItem>('sync_queue');
    return queue.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Retry specific queue item
  public async retryItem(id: string): Promise<void> {
    const item = await idb.get<SyncQueueItem>('sync_queue', id);
    if (item) {
      item.status = 'pending';
      item.updatedAt = new Date().toISOString();
      await idb.put('sync_queue', item);
      await this.refreshQueueCount();
      this.processSyncQueue();
    }
  }

  // Delete/Cancel item from queue
  public async deleteQueueItem(id: string): Promise<void> {
    await idb.delete('sync_queue', id);
    await this.refreshQueueCount();
    await this.addLog('info', 'Queue item removed manually', `ID: ${id}`);
  }

  // Get storage metrics for diagnostics
  public async getStorageStats(): Promise<{
    mobilesCount: number;
    accessoriesCount: number;
    debtsCount: number;
    installmentsCount: number;
    posSalesCount: number;
    queueCount: number;
    logsCount: number;
  }> {
    const [mobilesCount, accessoriesCount, debtsCount, installmentsCount, posSalesCount, queueCount, logsCount] = await Promise.all([
      idb.count('mobiles'),
      idb.count('accessories'),
      idb.count('debts'),
      idb.count('installments'),
      idb.count('pos_sales'),
      idb.count('sync_queue'),
      idb.count('sync_logs')
    ]);

    return {
      mobilesCount,
      accessoriesCount,
      debtsCount,
      installmentsCount,
      posSalesCount,
      queueCount,
      logsCount
    };
  }
}

export const offlineSyncService = new OfflineSyncService();
