export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  currency: 'USD' | 'IQD';
  paymentDate: string; // ISO string or YYYY-MM-DD
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'other';
  receiptNumber: string;
  notes?: string;
  snoozedUntil?: string;
  receivedBy?: string;
  createdAt: string;
}

export interface Debt {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerIdCard?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  productSummary?: string;
  originalAmount: number;
  downPayment: number;
  paidAmount: number;
  remainingAmount: number;
  currency: 'USD' | 'IQD';
  startDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  status: 'outstanding' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  snoozedUntil?: string;
  payments?: DebtPayment[];
  createdAt: string;
  updatedAt: string;
}
