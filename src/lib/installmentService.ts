import { supabase, isSupabaseConfigured } from './supabase';
import { InstallmentPlan, InstallmentScheduleItem } from '../types/installment';
import { idb } from './idbService';

const LOCAL_STORAGE_KEY = 'nali_installments_data';

export function calculateScheduleStatus(
  due: number,
  paid: number,
  dueDate: string,
  currentStatus?: string
): InstallmentScheduleItem['status'] {
  if (paid >= due - 0.01) return 'paid';
  if (paid > 0) return 'partially_paid';

  const today = new Date().toISOString().split('T')[0];
  if (dueDate < today) return 'overdue';
  
  // If within 7 days from now, consider it 'due'
  const diffDays = (new Date(dueDate).getTime() - new Date().getTime()) / 86400000;
  if (diffDays <= 7) return 'due';

  return 'upcoming';
}

export function mapInstallmentToDb(plan: InstallmentPlan) {
  return {
    id: plan.id,
    contract_number: plan.contractNumber,
    customer_name: plan.customerName,
    customer_phone: plan.customerPhone || null,
    customer_id_card: plan.customerIdCard || null,
    customer_address: plan.customerAddress || null,
    guarantor_name: plan.guarantorName || null,
    guarantor_phone: plan.guarantorPhone || null,
    guarantor_id_card: plan.guarantorIdCard || null,
    guarantor_address: plan.guarantorAddress || null,
    invoice_id: plan.invoiceId || null,
    invoice_number: plan.invoiceNumber || null,
    product_summary: plan.productSummary || null,
    principal_amount: Number(plan.principalAmount || 0),
    additional_fee: Number(plan.additionalFee || 0),
    total_amount: Number(plan.totalAmount || 0),
    down_payment: Number(plan.downPayment || 0),
    remaining_amount: Number(plan.remainingAmount || 0),
    paid_amount: Number(plan.paidAmount || 0),
    balance_remaining: Number(plan.balanceRemaining || 0),
    currency: plan.currency || 'USD',
    duration_months: Number(plan.durationMonths || 6),
    monthly_payment: Number(plan.monthlyPayment || 0),
    start_date: plan.startDate || new Date().toISOString().split('T')[0],
    first_due_date: plan.firstDueDate,
    frequency: plan.frequency || 'monthly',
    status: plan.status || 'active',
    notes: plan.notes || null,
    created_at: plan.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export function mapScheduleToDb(s: InstallmentScheduleItem, installmentId: string) {
  return {
    id: s.id,
    installment_id: installmentId,
    month_number: Number(s.monthNumber || 1),
    due_date: s.dueDate,
    amount_due: Number(s.amountDue || 0),
    amount_paid: Number(s.amountPaid || 0),
    status: s.status || 'upcoming',
    paid_date: s.paidDate || null,
    payment_method: s.paymentMethod || null,
    receipt_number: s.receiptNumber || null,
    notes: s.notes || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export function mapDbToInstallment(item: any, schedulesList?: any[]): InstallmentPlan {
  const rawSchedules = (schedulesList || item.schedules || []).map((s: any) => ({
    id: s.id,
    installmentId: s.installment_id || s.installmentId || item.id,
    monthNumber: Number(s.month_number ?? s.monthNumber ?? 1),
    dueDate: s.due_date || s.dueDate,
    amountDue: Number(s.amount_due ?? s.amountDue ?? 0),
    amountPaid: Number(s.amount_paid ?? s.amountPaid ?? 0),
    status: calculateScheduleStatus(
      Number(s.amount_due ?? s.amountDue ?? 0),
      Number(s.amount_paid ?? s.amountPaid ?? 0),
      s.due_date || s.dueDate,
      s.status
    ),
    paidDate: s.paid_date || s.paidDate,
    paymentMethod: s.payment_method || s.paymentMethod,
    receiptNumber: s.receipt_number || s.receiptNumber,
    notes: s.notes,
    snoozedUntil: s.snoozed_until || s.snoozedUntil
  })).sort((a: any, b: any) => a.monthNumber - b.monthNumber);

  const totalPaidSchedules = rawSchedules.reduce((acc: number, sc: any) => acc + sc.amountPaid, 0);
  const downPmt = Number(item.down_payment ?? item.downPayment ?? 0);
  const totalAmt = Number(item.total_amount ?? item.totalAmount ?? 0);
  const totalPaid = downPmt + totalPaidSchedules;
  const balanceRem = Math.max(0, totalAmt - totalPaid);

  const hasOverdue = rawSchedules.some((s: any) => s.status === 'overdue');
  const isCompleted = balanceRem <= 0.01;
  const planStatus: InstallmentPlan['status'] = isCompleted ? 'completed' : (hasOverdue ? 'overdue' : (item.status || 'active'));

  return {
    id: item.id,
    contractNumber: item.contract_number || item.contractNumber || '',
    customerName: item.customer_name || item.customerName || '',
    customerPhone: item.customer_phone || item.customerPhone,
    customerIdCard: item.customer_id_card || item.customerIdCard,
    customerAddress: item.customer_address || item.customerAddress,
    guarantorName: item.guarantor_name || item.guarantorName,
    guarantorPhone: item.guarantor_phone || item.guarantorPhone,
    guarantorIdCard: item.guarantor_id_card || item.guarantorIdCard,
    guarantorAddress: item.guarantor_address || item.guarantorAddress,
    invoiceId: item.invoice_id || item.invoiceId,
    invoiceNumber: item.invoice_number || item.invoiceNumber,
    productSummary: item.product_summary || item.productSummary,
    principalAmount: Number(item.principal_amount ?? item.principalAmount ?? 0),
    additionalFee: Number(item.additional_fee ?? item.additionalFee ?? 0),
    totalAmount: totalAmt,
    downPayment: downPmt,
    remainingAmount: Number(item.remaining_amount ?? item.remainingAmount ?? (totalAmt - downPmt)),
    paidAmount: totalPaid,
    balanceRemaining: balanceRem,
    currency: item.currency || 'USD',
    durationMonths: Number(item.duration_months ?? item.durationMonths ?? 6),
    monthlyPayment: Number(item.monthly_payment ?? item.monthlyPayment ?? 0),
    startDate: item.start_date || item.startDate || new Date().toISOString().split('T')[0],
    firstDueDate: item.first_due_date || item.firstDueDate,
    frequency: item.frequency || 'monthly',
    status: planStatus,
    schedules: rawSchedules,
    notes: item.notes,
    createdAt: item.created_at || item.createdAt || new Date().toISOString(),
    updatedAt: item.updated_at || item.updatedAt || new Date().toISOString()
  };
}

// Helper to generate schedule items
export function generateScheduleItems(
  installmentId: string,
  totalToFinance: number,
  months: number,
  firstDueDateStr: string,
  frequency: 'monthly' | 'biweekly' | 'weekly' = 'monthly'
): InstallmentScheduleItem[] {
  const schedules: InstallmentScheduleItem[] = [];
  const monthlyAmount = Math.round((totalToFinance / months) * 100) / 100;
  
  const baseDate = new Date(firstDueDateStr || Date.now());

  for (let i = 1; i <= months; i++) {
    const dueDate = new Date(baseDate);
    if (frequency === 'monthly') {
      dueDate.setMonth(baseDate.getMonth() + (i - 1));
    } else if (frequency === 'biweekly') {
      dueDate.setDate(baseDate.getDate() + (i - 1) * 14);
    } else {
      dueDate.setDate(baseDate.getDate() + (i - 1) * 7);
    }

    const isLastMonth = i === months;
    // Adjust last month for any rounding differences
    const amount = isLastMonth 
      ? Math.round((totalToFinance - (monthlyAmount * (months - 1))) * 100) / 100
      : monthlyAmount;

    schedules.push({
      id: `sch_${installmentId}_m${i}`,
      installmentId,
      monthNumber: i,
      dueDate: dueDate.toISOString().split('T')[0],
      amountDue: amount,
      amountPaid: 0,
      status: 'upcoming'
    });
  }

  return schedules;
}

// Initial sample data
const INITIAL_SAMPLE_INSTALLMENTS: InstallmentPlan[] = [
  {
    id: 'ins_plan_001',
    contractNumber: 'INS-2026-001',
    customerName: 'Shakar Botan',
    customerPhone: '+964 750 888 1122',
    customerIdCard: 'IQ-NAT-449102',
    customerAddress: 'Erbil, Dream City, Villa 42',
    guarantorName: 'Rawand Botan',
    guarantorPhone: '+964 750 999 3344',
    guarantorIdCard: 'IQ-NAT-881290',
    invoiceNumber: 'INV-2026-1015',
    productSummary: 'iPhone 16 Pro Max 256GB (Desert Titanium) + 20W Adapter + Clear Case',
    principalAmount: 1250,
    additionalFee: 150,
    totalAmount: 1400,
    downPayment: 400,
    remainingAmount: 1000,
    paidAmount: 700, // 400 down + 300 (Month 1 & 2 paid)
    balanceRemaining: 700,
    currency: 'USD',
    durationMonths: 6,
    monthlyPayment: 166.67,
    startDate: new Date(Date.now() - 75 * 86400000).toISOString().split('T')[0],
    firstDueDate: new Date(Date.now() - 45 * 86400000).toISOString().split('T')[0],
    frequency: 'monthly',
    status: 'active',
    notes: 'Approved with verified employment certificate and guarantor.',
    schedules: [
      {
        id: 'sch_ins_plan_001_m1',
        installmentId: 'ins_plan_001',
        monthNumber: 1,
        dueDate: new Date(Date.now() - 45 * 86400000).toISOString().split('T')[0],
        amountDue: 166.67,
        amountPaid: 166.67,
        status: 'paid',
        paidDate: new Date(Date.now() - 44 * 86400000).toISOString().split('T')[0],
        paymentMethod: 'cash',
        receiptNumber: 'REC-INS-001',
        notes: 'Paid at cash counter on time'
      },
      {
        id: 'sch_ins_plan_001_m2',
        installmentId: 'ins_plan_001',
        monthNumber: 2,
        dueDate: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0],
        amountDue: 166.67,
        amountPaid: 166.67,
        status: 'paid',
        paidDate: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
        paymentMethod: 'card',
        receiptNumber: 'REC-INS-002',
        notes: 'Paid with FIB Mastercard'
      },
      {
        id: 'sch_ins_plan_001_m3',
        installmentId: 'ins_plan_001',
        monthNumber: 3,
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        amountDue: 166.67,
        amountPaid: 0,
        status: 'due'
      },
      {
        id: 'sch_ins_plan_001_m4',
        installmentId: 'ins_plan_001',
        monthNumber: 4,
        dueDate: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
        amountDue: 166.67,
        amountPaid: 0,
        status: 'upcoming'
      },
      {
        id: 'sch_ins_plan_001_m5',
        installmentId: 'ins_plan_001',
        monthNumber: 5,
        dueDate: new Date(Date.now() + 75 * 86400000).toISOString().split('T')[0],
        amountDue: 166.67,
        amountPaid: 0,
        status: 'upcoming'
      },
      {
        id: 'sch_ins_plan_001_m6',
        installmentId: 'ins_plan_001',
        monthNumber: 6,
        dueDate: new Date(Date.now() + 105 * 86400000).toISOString().split('T')[0],
        amountDue: 166.65,
        amountPaid: 0,
        status: 'upcoming'
      }
    ],
    createdAt: new Date(Date.now() - 75 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 14 * 86400000).toISOString()
  },
  {
    id: 'ins_plan_002',
    contractNumber: 'INS-2026-002',
    customerName: 'Bamo Sirwan',
    customerPhone: '+964 770 555 7788',
    customerIdCard: 'IQ-NAT-551920',
    customerAddress: 'Sulaymaniyah, Bakrajo, House 110',
    guarantorName: 'Sirwan Latif',
    guarantorPhone: '+964 770 223 9911',
    invoiceNumber: 'INV-2026-1055',
    productSummary: 'Samsung Galaxy Z Fold 5 512GB (Phantom Black)',
    principalAmount: 1350000,
    additionalFee: 150000,
    totalAmount: 1500000,
    downPayment: 300000,
    remainingAmount: 1200000,
    paidAmount: 300000,
    balanceRemaining: 1200000,
    currency: 'IQD',
    durationMonths: 6,
    monthlyPayment: 200000,
    startDate: new Date(Date.now() - 40 * 86400000).toISOString().split('T')[0],
    firstDueDate: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
    frequency: 'monthly',
    status: 'overdue',
    notes: 'Month 1 installment is currently overdue by 10 days.',
    schedules: [
      {
        id: 'sch_ins_plan_002_m1',
        installmentId: 'ins_plan_002',
        monthNumber: 1,
        dueDate: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
        amountDue: 200000,
        amountPaid: 0,
        status: 'overdue',
        notes: 'Sent automated SMS reminder'
      },
      {
        id: 'sch_ins_plan_002_m2',
        installmentId: 'ins_plan_002',
        monthNumber: 2,
        dueDate: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
        amountDue: 200000,
        amountPaid: 0,
        status: 'upcoming'
      },
      {
        id: 'sch_ins_plan_002_m3',
        installmentId: 'ins_plan_002',
        monthNumber: 3,
        dueDate: new Date(Date.now() + 50 * 86400000).toISOString().split('T')[0],
        amountDue: 200000,
        amountPaid: 0,
        status: 'upcoming'
      },
      {
        id: 'sch_ins_plan_002_m4',
        installmentId: 'ins_plan_002',
        monthNumber: 4,
        dueDate: new Date(Date.now() + 80 * 86400000).toISOString().split('T')[0],
        amountDue: 200000,
        amountPaid: 0,
        status: 'upcoming'
      },
      {
        id: 'sch_ins_plan_002_m5',
        installmentId: 'ins_plan_002',
        monthNumber: 5,
        dueDate: new Date(Date.now() + 110 * 86400000).toISOString().split('T')[0],
        amountDue: 200000,
        amountPaid: 0,
        status: 'upcoming'
      },
      {
        id: 'sch_ins_plan_002_m6',
        installmentId: 'ins_plan_002',
        monthNumber: 6,
        dueDate: new Date(Date.now() + 140 * 86400000).toISOString().split('T')[0],
        amountDue: 200000,
        amountPaid: 0,
        status: 'upcoming'
      }
    ],
    createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 86400000).toISOString()
  }
];

export function getLocalInstallments(): InstallmentPlan[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse installments from localStorage:', e);
  }
  return [];
}

export function saveLocalInstallments(plans: InstallmentPlan[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(plans));
  } catch (e) {
    console.error('Failed to save installments to localStorage:', e);
  }
}

export async function pushLocalInstallmentsToCloud(plansToPush?: InstallmentPlan[]): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const plans = plansToPush || getLocalInstallments();
    if (!plans || (plans?.length || 0) === 0) return true;

    for (const p of plans) {
      const dbPlan = mapInstallmentToDb(p);
      const { error: planErr } = await supabase.from('nali_installments').upsert(dbPlan);
      if (planErr) {
        console.warn('Failed to push installment plan to Supabase:', planErr);
        continue;
      }

      if (Array.isArray(p?.schedules) && p.schedules.length > 0) {
        const dbSchedules = p.schedules.map(s => mapScheduleToDb(s, p.id));
        const { error: schErr } = await supabase.from('nali_installment_schedules').upsert(dbSchedules);
        if (schErr) {
          console.warn('Failed to push installment schedules to Supabase:', schErr);
        }
      }
    }
    return true;
  } catch (err) {
    console.error('Error pushing local installments to cloud:', err);
    return false;
  }
}

export const installmentService = {
  // Get all installment plans
  async getAllInstallments(): Promise<InstallmentPlan[]> {
    const local = getLocalInstallments();

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('nali_installments')
          .select(`
            *,
            schedules:nali_installment_schedules(*)
          `)
          .order('created_at', { ascending: false });

        if (!error && data) {
          if (Array.isArray(data) && data.length > 0) {
            const mapped: InstallmentPlan[] = data.map((item: any) => mapDbToInstallment(item));
            saveLocalInstallments(mapped);
            try {
              for (const plan of mapped) {
                await idb.put('installments', plan);
              }
            } catch {}
            return mapped;
          } else {
            saveLocalInstallments([]);
            try { await idb.clear('installments'); } catch (e) {}
            return [];
          }
        } else if (error) {
          console.warn('Supabase query error for nali_installments:', error);
        }
      } catch (e) {
        console.warn('Using local fallback for installments:', e);
      }
    }

    // Try IndexedDB if localStorage is empty
    try {
      const idbPlans = await idb.getAll<InstallmentPlan>('installments');
      if (Array.isArray(idbPlans) && idbPlans.length > 0) {
        saveLocalInstallments(idbPlans);
        return idbPlans;
      }
    } catch {}

    return local;
  },

  // Create a new installment plan
  async createInstallmentPlan(
    planData: Omit<InstallmentPlan, 'id' | 'createdAt' | 'updatedAt' | 'schedules' | 'paidAmount' | 'balanceRemaining' | 'status'> & {
      customSchedules?: InstallmentScheduleItem[];
    }
  ): Promise<InstallmentPlan> {
    const id = `ins_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();
    const remainingToFinance = Math.max(0, planData.totalAmount - planData.downPayment);

    const schedules = Array.isArray(planData?.customSchedules) && planData.customSchedules.length > 0
      ? planData.customSchedules.map((s, idx) => ({
          ...s,
          id: s.id || `sch_${id}_m${idx + 1}`,
          installmentId: id
        }))
      : generateScheduleItems(
          id,
          remainingToFinance,
          planData.durationMonths,
          planData.firstDueDate,
          planData.frequency
        );

    const paidAmount = planData.downPayment;
    const balanceRemaining = remainingToFinance;
    const status: InstallmentPlan['status'] = balanceRemaining <= 0 ? 'completed' : 'active';

    const newPlan: InstallmentPlan = {
      ...planData,
      id,
      paidAmount,
      balanceRemaining,
      status,
      schedules,
      createdAt: now,
      updatedAt: now
    };

    // Save locally
    const current = getLocalInstallments();
    saveLocalInstallments([newPlan, ...current]);
    try {
      await idb.put('installments', newPlan);
    } catch {}

    // Sync to Supabase
    if (isSupabaseConfigured()) {
      try {
        const dbPlan = mapInstallmentToDb(newPlan);
        const { error: planErr } = await supabase.from('nali_installments').insert(dbPlan);
        if (planErr) {
          console.warn('Could not insert installment to Supabase:', planErr);
        }

        const dbSchedules = schedules.map(s => mapScheduleToDb(s, id));
        const { error: schErr } = await supabase.from('nali_installment_schedules').insert(dbSchedules);
        if (schErr) {
          console.warn('Could not insert installment schedules to Supabase:', schErr);
        }
      } catch (e) {
        console.warn('Could not sync installment to Supabase:', e);
      }
    }

    return newPlan;
  },

  // Record payment for a specific schedule row or custom amount
  async paySchedule(
    installmentId: string,
    scheduleId: string,
    payment: {
      amount: number;
      paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'other';
      receiptNumber?: string;
      notes?: string;
    }
  ): Promise<InstallmentPlan> {
    const plans = getLocalInstallments();
    const planIndex = plans.findIndex(p => p.id === installmentId);
    if (planIndex === -1) throw new Error('Installment plan not found');

    const plan = plans[planIndex];
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const receipt = payment.receiptNumber || `REC-INS-${Date.now().toString().slice(-4)}`;

    const updatedSchedules = plan.schedules.map(sch => {
      if (sch.id === scheduleId) {
        const newPaid = (sch.amountPaid || 0) + payment.amount;
        const isPaid = newPaid >= sch.amountDue - 0.01;
        return {
          ...sch,
          amountPaid: newPaid,
          status: (isPaid ? 'paid' : 'partially_paid') as InstallmentScheduleItem['status'],
          paidDate: today,
          paymentMethod: payment.paymentMethod,
          receiptNumber: receipt,
          notes: payment.notes || sch.notes
        };
      }
      return sch;
    });

    const totalSchedulePaid = updatedSchedules.reduce((acc, s) => acc + s.amountPaid, 0);
    const totalPaid = plan.downPayment + totalSchedulePaid;
    const balanceRemaining = Math.max(0, plan.totalAmount - totalPaid);

    const hasOverdue = updatedSchedules.some(s => s.status === 'overdue');
    const isCompleted = balanceRemaining <= 0.01;
    const newStatus: InstallmentPlan['status'] = isCompleted ? 'completed' : (hasOverdue ? 'overdue' : 'active');

    const updatedPlan: InstallmentPlan = {
      ...plan,
      paidAmount: totalPaid,
      balanceRemaining,
      status: newStatus,
      schedules: updatedSchedules,
      updatedAt: now
    };

    plans[planIndex] = updatedPlan;
    saveLocalInstallments(plans);
    try {
      await idb.put('installments', updatedPlan);
    } catch {}

    // Sync to Supabase
    if (isSupabaseConfigured()) {
      try {
        const sch = updatedSchedules.find(s => s.id === scheduleId);
        if (sch) {
          await supabase.from('nali_installment_schedules').update({
            amount_paid: sch.amountPaid,
            status: sch.status,
            paid_date: sch.paidDate,
            payment_method: sch.paymentMethod,
            receipt_number: sch.receiptNumber,
            notes: sch.notes,
            updated_at: now
          }).eq('id', scheduleId);
        }

        await supabase.from('nali_installments').update({
          paid_amount: totalPaid,
          balance_remaining: balanceRemaining,
          status: newStatus,
          updated_at: now
        }).eq('id', installmentId);
      } catch (e) {
        console.warn('Could not sync schedule payment to Supabase:', e);
      }
    }

    return updatedPlan;
  },

  async updateInstallmentPlan(plan: InstallmentPlan): Promise<InstallmentPlan> {
    const plans = getLocalInstallments();
    const updatedPlan = { ...plan, updatedAt: new Date().toISOString() };
    const updated = plans.map(p => p.id === plan.id ? updatedPlan : p);
    saveLocalInstallments(updated);
    try {
      await idb.put('installments', updatedPlan);
    } catch {}

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('nali_installments').update({
          notes: plan.notes,
          status: plan.status,
          updated_at: updatedPlan.updatedAt
        }).eq('id', plan.id);
      } catch (e) {
        console.warn('Supabase update failed for installment plan', e);
      }
    }
    return updatedPlan;
  },

  // Delete installment plan
  async deletePlan(installmentId: string): Promise<void> {
    const plans = getLocalInstallments().filter(p => p.id !== installmentId);
    saveLocalInstallments(plans);
    try {
      await idb.delete('installments', installmentId);
    } catch {}

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('nali_installment_schedules').delete().eq('installment_id', installmentId);
        await supabase.from('nali_installments').delete().eq('id', installmentId);
      } catch (e) {
        console.warn('Could not delete installment in Supabase:', e);
      }
    }
  }
};

