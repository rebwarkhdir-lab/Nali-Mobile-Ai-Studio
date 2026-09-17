import { supabase, isSupabaseConfigured } from './supabase';
import { Debt, DebtPayment } from '../types/debt';
import { idb } from './idbService';

const LOCAL_STORAGE_KEY = 'nali_debts_data';

export function calculateDebtStatus(
  remaining: number, 
  paid: number, 
  dueDate: string, 
  currentStatus?: string
): Debt['status'] {
  if (currentStatus === 'cancelled') return 'cancelled';
  if (remaining <= 0.01) return 'paid';
  
  const today = new Date().toISOString().split('T')[0];
  if (dueDate && dueDate < today) {
    return 'overdue';
  }
  
  if (paid > 0) {
    return 'partially_paid';
  }
  
  return 'outstanding';
}

export function mapDebtToDb(d: Debt) {
  return {
    id: d.id,
    customer_name: d.customerName,
    customer_phone: d.customerPhone || null,
    customer_address: d.customerAddress || null,
    customer_id_card: d.customerIdCard || null,
    guarantor_name: d.guarantorName || null,
    guarantor_phone: d.guarantorPhone || null,
    invoice_id: d.invoiceId || null,
    invoice_number: d.invoiceNumber || null,
    product_summary: d.productSummary || null,
    original_amount: Number(d.originalAmount || 0),
    down_payment: Number(d.downPayment || 0),
    paid_amount: Number(d.paidAmount || 0),
    remaining_amount: Number(d.remainingAmount || 0),
    currency: d.currency || 'USD',
    start_date: d.startDate || new Date().toISOString().split('T')[0],
    due_date: d.dueDate,
    status: d.status,
    notes: d.notes || null,
    created_at: d.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export function mapPaymentToDb(p: DebtPayment) {
  return {
    id: p.id,
    debt_id: p.debtId,
    amount: Number(p.amount || 0),
    currency: p.currency || 'USD',
    payment_date: p.paymentDate || new Date().toISOString(),
    payment_method: p.paymentMethod || 'cash',
    receipt_number: p.receiptNumber || null,
    notes: p.notes || null,
    received_by: p.receivedBy || 'Store Cashier',
    created_at: p.createdAt || new Date().toISOString()
  };
}

export function mapDbToDebt(row: any, paymentsList?: any[]): Debt {
  const payments: DebtPayment[] = (paymentsList || row.payments || []).map((p: any) => ({
    id: p.id,
    debtId: p.debt_id || p.debtId,
    amount: Number(p.amount || 0),
    currency: p.currency || 'USD',
    paymentDate: p.payment_date || p.paymentDate || new Date().toISOString(),
    paymentMethod: p.payment_method || p.paymentMethod || 'cash',
    receiptNumber: p.receipt_number || p.receiptNumber,
    notes: p.notes,
    receivedBy: p.received_by || p.receivedBy,
    createdAt: p.created_at || p.createdAt || new Date().toISOString()
  }));

  const orig = Number(row.original_amount ?? row.originalAmount ?? 0);
  const down = Number(row.down_payment ?? row.downPayment ?? 0);
  const paid = Number(row.paid_amount ?? row.paidAmount ?? 0);
  const remaining = Number(row.remaining_amount ?? row.remainingAmount ?? Math.max(0, orig - paid));
  const dueDate = row.due_date || row.dueDate;

  return {
    id: row.id,
    customerName: row.customer_name || row.customerName || '',
    customerPhone: row.customer_phone || row.customerPhone || '',
    customerAddress: row.customer_address || row.customerAddress || '',
    customerIdCard: row.customer_id_card || row.customerIdCard || '',
    guarantorName: row.guarantor_name || row.guarantorName || '',
    guarantorPhone: row.guarantor_phone || row.guarantorPhone || '',
    invoiceId: row.invoice_id || row.invoiceId,
    invoiceNumber: row.invoice_number || row.invoiceNumber,
    productSummary: row.product_summary || row.productSummary || '',
    originalAmount: orig,
    downPayment: down,
    paidAmount: paid,
    remainingAmount: remaining,
    currency: row.currency || 'USD',
    startDate: row.start_date || row.startDate || new Date().toISOString().split('T')[0],
    dueDate: dueDate,
    status: calculateDebtStatus(remaining, paid, dueDate, row.status),
    notes: row.notes || '',
    payments: payments,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString()
  };
}

// Initial sample data if storage is empty
const INITIAL_SAMPLE_DEBTS: Debt[] = [
  {
    id: 'debt_sample_001',
    customerName: 'Ahmad Mustafa',
    customerPhone: '+964 750 123 4567',
    customerAddress: 'Erbil, 100M Road, Near Empire World',
    customerIdCard: 'IQD-88921-99',
    guarantorName: 'Karwan Sleman',
    guarantorPhone: '+964 750 987 6543',
    invoiceNumber: 'INV-2026-1042',
    productSummary: 'iPhone 15 Pro 128GB (Natural Titanium)',
    originalAmount: 950,
    downPayment: 300,
    paidAmount: 300,
    remainingAmount: 650,
    currency: 'USD',
    startDate: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    status: 'outstanding',
    notes: 'Customer promised to settle by mid-month.',
    payments: [
      {
        id: 'pmt_001',
        debtId: 'debt_sample_001',
        amount: 300,
        currency: 'USD',
        paymentDate: new Date(Date.now() - 15 * 86400000).toISOString(),
        paymentMethod: 'cash',
        receiptNumber: 'REC-DEBT-001',
        notes: 'Initial down payment at POS',
        receivedBy: 'Store Cashier',
        createdAt: new Date(Date.now() - 15 * 86400000).toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 86400000).toISOString()
  },
  {
    id: 'debt_sample_002',
    customerName: 'Diyar Hawre',
    customerPhone: '+964 770 456 7890',
    customerAddress: 'Sulaymaniyah, Salim Street',
    customerIdCard: 'IQD-77312-01',
    guarantorName: 'Soran Ali',
    guarantorPhone: '+964 770 112 3344',
    invoiceNumber: 'INV-2026-1089',
    productSummary: 'AirPods Pro 2 + 20W Fast Charger + Case',
    originalAmount: 320000,
    downPayment: 100000,
    paidAmount: 100000,
    remainingAmount: 220000,
    currency: 'IQD',
    startDate: new Date(Date.now() - 40 * 86400000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
    status: 'overdue',
    notes: 'Due date passed, customer contacted via phone.',
    payments: [
      {
        id: 'pmt_002',
        debtId: 'debt_sample_002',
        amount: 100000,
        currency: 'IQD',
        paymentDate: new Date(Date.now() - 40 * 86400000).toISOString(),
        paymentMethod: 'cash',
        receiptNumber: 'REC-DEBT-002',
        notes: 'Down payment',
        receivedBy: 'Admin',
        createdAt: new Date(Date.now() - 40 * 86400000).toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 40 * 86400000).toISOString()
  },
  {
    id: 'debt_sample_003',
    customerName: 'Zana Qadir',
    customerPhone: '+964 750 333 4455',
    customerAddress: 'Duhok, KRO Street',
    invoiceNumber: 'INV-2026-1120',
    productSummary: 'Samsung Galaxy S24 Ultra 512GB (Titanium Gray)',
    originalAmount: 1150,
    downPayment: 500,
    paidAmount: 1150,
    remainingAmount: 0,
    currency: 'USD',
    startDate: new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0],
    status: 'paid',
    notes: 'Paid in full on time.',
    payments: [
      {
        id: 'pmt_003a',
        debtId: 'debt_sample_003',
        amount: 500,
        currency: 'USD',
        paymentDate: new Date(Date.now() - 60 * 86400000).toISOString(),
        paymentMethod: 'cash',
        receiptNumber: 'REC-DEBT-003',
        notes: 'Initial down payment',
        receivedBy: 'Store Cashier',
        createdAt: new Date(Date.now() - 60 * 86400000).toISOString()
      },
      {
        id: 'pmt_003b',
        debtId: 'debt_sample_003',
        amount: 650,
        currency: 'USD',
        paymentDate: new Date(Date.now() - 22 * 86400000).toISOString(),
        paymentMethod: 'card',
        receiptNumber: 'REC-DEBT-004',
        notes: 'Final balance settlement via POS card',
        receivedBy: 'Store Cashier',
        createdAt: new Date(Date.now() - 22 * 86400000).toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 22 * 86400000).toISOString()
  }
];

export function getLocalDebts(): Debt[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse debts from localStorage:', e);
  }
  return [];
}

export function saveLocalDebts(debts: Debt[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(debts));
    idb.bulkPut('debts', debts).catch(() => {});
  } catch (e) {
    console.error('Failed to save debts to localStorage:', e);
  }
}

export const debtService = {
  // Fetch all debts with live Supabase integration and offline fallback
  async getAllDebts(): Promise<Debt[]> {
    const local = getLocalDebts();

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('nali_debts')
          .select(`
            *,
            payments:nali_debt_payments(*)
          `)
          .order('created_at', { ascending: false });

        if (!error && data) {
          if (Array.isArray(data) && data.length > 0) {
            const mapped: Debt[] = data.map((d: any) => mapDbToDebt(d));
            saveLocalDebts(mapped);
            return mapped;
          } else {
            saveLocalDebts([]);
            try { await idb.clear('debts'); } catch (e) {}
            return [];
          }
        } else if (error) {
          console.warn('Supabase debts fetch error:', error);
        }
      } catch (e) {
        console.warn('Using local fallback for debts due to fetch exception:', e);
      }
    }

    return local;
  },

  // Push local debts into Supabase for initial sync or sync recovery
  async pushLocalDebtsToCloud(debtsToPush?: Debt[]): Promise<number> {
    if (!isSupabaseConfigured()) return 0;
    const debts = debtsToPush || getLocalDebts();
    let pushed = 0;

    for (const d of debts) {
      try {
        const dbDebt = mapDebtToDb(d);
        const { error: debtErr } = await supabase.from('nali_debts').upsert(dbDebt);
        if (!debtErr) {
          pushed++;
          if (Array.isArray(d?.payments) && d.payments.length > 0) {
            for (const p of d.payments) {
              const dbPmt = mapPaymentToDb(p);
              await supabase.from('nali_debt_payments').upsert(dbPmt);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to push debt to Supabase:', d.id, err);
      }
    }
    return pushed;
  },

  // Create new debt
  async createDebt(debtData: Omit<Debt, 'id' | 'createdAt' | 'updatedAt' | 'payments'> & { initialPaymentNotes?: string }): Promise<Debt> {
    const id = `debt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();
    const remaining = Math.max(0, debtData.originalAmount - debtData.downPayment);
    const status = calculateDebtStatus(remaining, debtData.downPayment, debtData.dueDate, debtData.status);

    const initialPayments: DebtPayment[] = [];
    if (debtData.downPayment > 0) {
      initialPayments.push({
        id: `pmt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        debtId: id,
        amount: debtData.downPayment,
        currency: debtData.currency,
        paymentDate: now,
        paymentMethod: 'cash',
        receiptNumber: `REC-DEBT-${Date.now().toString().slice(-4)}`,
        notes: debtData.initialPaymentNotes || 'Initial down payment',
        receivedBy: 'Store Cashier',
        createdAt: now
      });
    }

    const newDebt: Debt = {
      ...debtData,
      id,
      paidAmount: debtData.downPayment,
      remainingAmount: remaining,
      status,
      payments: initialPayments,
      createdAt: now,
      updatedAt: now
    };

    // Save locally first for instant optimistic response
    const current = getLocalDebts();
    const updated = [newDebt, ...current.filter(d => d.id !== id)];
    saveLocalDebts(updated);

    // Live sync to Supabase
    if (isSupabaseConfigured()) {
      try {
        const { error: debtErr } = await supabase.from('nali_debts').insert(mapDebtToDb(newDebt));
        if (debtErr) {
          console.warn('Supabase debt insert error:', debtErr);
        }

        if (Array.isArray(initialPayments) && initialPayments.length > 0) {
          const { error: pmtErr } = await supabase.from('nali_debt_payments').insert(mapPaymentToDb(initialPayments[0]));
          if (pmtErr) {
            console.warn('Supabase payment insert error:', pmtErr);
          }
        }
      } catch (e) {
        console.warn('Could not sync created debt to Supabase (offline mode):', e);
      }
    }

    return newDebt;
  },

  // Record a payment against an existing debt
  async recordPayment(
    debtId: string, 
    paymentData: { 
      amount: number; 
      paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'other'; 
      receiptNumber?: string; 
      notes?: string; 
      receivedBy?: string;
    }
  ): Promise<{ updatedDebt: Debt; payment: DebtPayment }> {
    const debts = getLocalDebts();
    const targetIndex = debts.findIndex(d => d.id === debtId);
    if (targetIndex === -1) {
      throw new Error('Debt record not found');
    }

    const currentDebt = debts[targetIndex];
    const now = new Date().toISOString();
    const receiptNumber = paymentData.receiptNumber || `REC-DEBT-${Date.now().toString().slice(-4)}`;

    const newPayment: DebtPayment = {
      id: `pmt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      debtId,
      amount: paymentData.amount,
      currency: currentDebt.currency,
      paymentDate: now,
      paymentMethod: paymentData.paymentMethod,
      receiptNumber,
      notes: paymentData.notes,
      receivedBy: paymentData.receivedBy || 'Store Cashier',
      createdAt: now
    };

    const newPaidAmount = currentDebt.paidAmount + paymentData.amount;
    const newRemaining = Math.max(0, currentDebt.originalAmount - newPaidAmount);
    const newStatus = calculateDebtStatus(newRemaining, newPaidAmount, currentDebt.dueDate, currentDebt.status);

    const updatedDebt: Debt = {
      ...currentDebt,
      paidAmount: newPaidAmount,
      remainingAmount: newRemaining,
      status: newStatus,
      payments: [newPayment, ...(currentDebt.payments || [])],
      updatedAt: now
    };

    debts[targetIndex] = updatedDebt;
    saveLocalDebts(debts);

    // Sync to Supabase
    if (isSupabaseConfigured()) {
      try {
        const { error: pmtErr } = await supabase.from('nali_debt_payments').insert(mapPaymentToDb(newPayment));
        if (pmtErr) {
          console.warn('Supabase debt payment insert error:', pmtErr);
        }

        const { error: updateErr } = await supabase.from('nali_debts').update({
          paid_amount: newPaidAmount,
          remaining_amount: newRemaining,
          status: newStatus,
          updated_at: now
        }).eq('id', debtId);

        if (updateErr) {
          console.warn('Supabase debt update error:', updateErr);
        }
      } catch (e) {
        console.warn('Could not sync payment to Supabase:', e);
      }
    }

    return { updatedDebt, payment: newPayment };
  },

  // Update debt details
  async updateDebt(debt: Debt): Promise<Debt> {
    const debts = getLocalDebts();
    const updated = debts.map(d => d.id === debt.id ? { ...debt, updatedAt: new Date().toISOString() } : d);
    saveLocalDebts(updated);

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('nali_debts').update({
          customer_name: debt.customerName,
          customer_phone: debt.customerPhone,
          customer_address: debt.customerAddress,
          customer_id_card: debt.customerIdCard,
          guarantor_name: debt.guarantorName,
          guarantor_phone: debt.guarantorPhone,
          due_date: debt.dueDate,
          notes: debt.notes,
          status: debt.status,
          updated_at: new Date().toISOString()
        }).eq('id', debt.id);

        if (error) {
          console.warn('Supabase update debt error:', error);
        }
      } catch (e) {
        console.warn('Could not sync updated debt to Supabase:', e);
      }
    }

    return debt;
  },

  // Delete debt
  async deleteDebt(debtId: string): Promise<void> {
    const debts = getLocalDebts().filter(d => d.id !== debtId);
    saveLocalDebts(debts);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('nali_debt_payments').delete().eq('debt_id', debtId);
        await supabase.from('nali_debts').delete().eq('id', debtId);
      } catch (e) {
        console.warn('Could not delete debt in Supabase:', e);
      }
    }
  }
};

