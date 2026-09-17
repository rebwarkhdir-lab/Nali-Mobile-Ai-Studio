export interface InstallmentScheduleItem {
  id: string;
  installmentId: string;
  monthNumber: number; // 1, 2, 3...
  dueDate: string; // YYYY-MM-DD
  amountDue: number;
  amountPaid: number;
  status: 'upcoming' | 'due' | 'paid' | 'partially_paid' | 'overdue';
  paidDate?: string;
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'other';
  receiptNumber?: string;
  notes?: string;
  snoozedUntil?: string;
}

export interface InstallmentPlan {
  id: string;
  contractNumber: string; // e.g. "INS-2026-001"
  customerName: string;
  customerPhone?: string;
  customerIdCard?: string;
  customerAddress?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorIdCard?: string;
  guarantorAddress?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  productSummary?: string;
  
  principalAmount: number; // base price
  additionalFee: number; // interest / fee added
  totalAmount: number; // principalAmount + additionalFee
  downPayment: number;
  remainingAmount: number; // totalAmount - downPayment
  paidAmount: number; // downPayment + total schedule payments
  balanceRemaining: number; // totalAmount - paidAmount
  
  currency: 'USD' | 'IQD';
  durationMonths: number;
  monthlyPayment: number;
  startDate: string; // YYYY-MM-DD
  firstDueDate: string; // YYYY-MM-DD
  frequency: 'monthly' | 'biweekly' | 'weekly';
  status: 'active' | 'completed' | 'overdue' | 'cancelled';
  schedules: InstallmentScheduleItem[];
  notes?: string;
  snoozedUntil?: string;
  createdAt: string;
  updatedAt: string;
}
