import { generateInvoicePDF, InvoicePDFData, InvoiceItemPDF, InvoiceSchedulePDFItem } from './pdfInvoiceGenerator';
import { formatCurrency } from '../lib/utils';
import { Debt } from '../types/debt';
import { InstallmentPlan, InstallmentScheduleItem } from '../types/installment';
import { AppNotification } from '../types/notification';

export interface WhatsAppShareResult {
  mode: 'web_share' | 'desktop_download';
  success: boolean;
  filename?: string;
  error?: string;
}

/**
 * Standardizes any local Iraqi or international phone number to E.164 without leading plus
 * e.g. 07501234567 -> 9647501234567
 * e.g. +964 770 123 4567 -> 9647701234567
 */
export function formatIraqiPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  let clean = phone.replace(/[^0-9]/g, '');
  
  // If starts with 00964, replace with 964
  if (clean.startsWith('00964')) {
    clean = clean.substring(2);
  }
  
  // If starts with 07XX (standard Iraqi 11 digits: 0750, 0770, 0780, 0790)
  if (clean.startsWith('07') && clean.length === 11) {
    clean = '964' + clean.substring(1);
  } else if (clean.startsWith('7') && clean.length === 10) {
    clean = '964' + clean;
  }
  
  return clean;
}

/**
 * Generates an executive WhatsApp message text for debt or installment reminders
 */
export function buildWhatsAppReminderMessage(data: InvoicePDFData): string {
  const customerName = data.customer.name || 'Valued Customer';
  const currency = data.financials.currency;
  const balance = formatCurrency(data.financials.remainingBalance, currency);
  const total = formatCurrency(data.financials.totalAmount, currency);
  const dueDate = data.dueDate ? `📅 Due Date: ${data.dueDate}` : '';
  const invoiceNo = data.invoiceNumber;

  let headerTitle = '📄 *NALI POS & MOBILE CENTER - INVOICE NOTICE*';
  if (data.type === 'installment_reminder' || data.type === 'installment_invoice') {
    headerTitle = '📅 *NALI MOBILE - INSTALLMENT PAYMENT REMINDER*';
  } else if (data.type === 'debt_reminder' || data.type === 'debt_invoice') {
    headerTitle = '💰 *NALI MOBILE - ACCOUNT BALANCE REMINDER*';
  }

  const message = [
    headerTitle,
    `----------------------------------`,
    `Dear *${customerName}*,`,
    `This is a statement notice regarding your account balance with NALI Mobile.`,
    ``,
    `*Invoice / Contract:* #${invoiceNo}`,
    `*Total Agreement:* ${total}`,
    `*Remaining Balance:* *${balance}*`,
    dueDate,
    ``,
    `💳 *Payment Options:*`,
    `• FastPay: 0750 123 4567`,
    `• FIB Account: 9647501234567`,
    `• ZainCash: 0780 123 4567`,
    `• Cash at store: Sultan Muthafar St, Erbil`,
    ``,
    `📎 *Your official PDF invoice has been generated.*`,
    `----------------------------------`,
    `سڵاو بەڕێز ${customerName}، ئاگادارییەکی باوەڕپێکراو بۆ وادەی پارەدان بە بڕی ${balance}.`,
    `سوپاس بۆ مامەڵەکردنتان لەگەڵ NALI Mobile.`
  ].filter(Boolean).join('\n');

  return message;
}

/**
 * Triggers Dual-Mode Sharing:
 * 1. Mobile / Web Share API (native share dialog with attached PDF file)
 * 2. Desktop Fallback (automatically saves the PDF to Downloads and opens WhatsApp Web with prefilled message)
 */
export async function shareInvoiceViaWhatsApp(data: InvoicePDFData): Promise<WhatsAppShareResult> {
  const { file, filename } = generateInvoicePDF(data);
  const rawPhone = data.customer.phone || '';
  const cleanPhone = formatIraqiPhoneNumber(rawPhone);
  const messageText = buildWhatsAppReminderMessage(data);

  // Check if Web Share API with files is supported (primarily mobile browsers)
  if (
    typeof navigator !== 'undefined' &&
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        title: `NALI Invoice ${data.invoiceNumber} - ${data.customer.name}`,
        text: messageText,
        files: [file]
      });
      return { mode: 'web_share', success: true, filename };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled the share dialog
        return { mode: 'web_share', success: false, error: 'Share cancelled by user' };
      }
      console.warn('[WhatsAppShareService] Web Share failed, falling back to desktop mode', err);
    }
  }

  // Desktop Fallback:
  // 1. Trigger local download of PDF file
  try {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (e) {
    console.error('Failed to download PDF locally', e);
  }

  // 2. Open WhatsApp Web with formatted number and pre-filled message
  const waUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
    : `https://wa.me/?text=${encodeURIComponent(messageText)}`;
  
  window.open(waUrl, '_blank', 'noopener,noreferrer');

  return {
    mode: 'desktop_download',
    success: true,
    filename
  };
}

/**
 * Adapter: Convert a Debt object to InvoicePDFData and share/download
 */
export async function shareDebtInvoicePDF(debt: Debt, exchangeRate: number = 1500): Promise<WhatsAppShareResult> {
  const pdfData: InvoicePDFData = {
    invoiceNumber: debt.invoiceNumber || `DEBT-${debt.id.substring(0, 8).toUpperCase()}`,
    date: debt.startDate || new Date().toISOString().split('T')[0],
    dueDate: debt.dueDate,
    type: 'debt_invoice',
    customer: {
      id: debt.customerIdCard || debt.id,
      name: debt.customerName,
      phone: debt.customerPhone,
      address: debt.customerAddress,
      guarantorName: debt.guarantorName,
      guarantorPhone: debt.guarantorPhone
    },
    items: [
      {
        name: debt.productSummary || 'General Mobile & Accessories Credit Sale',
        quantity: 1,
        unitPrice: debt.originalAmount,
        total: debt.originalAmount
      }
    ],
    financials: {
      currency: debt.currency,
      subtotal: debt.originalAmount,
      totalAmount: debt.originalAmount,
      paidAmount: debt.paidAmount,
      remainingBalance: debt.remainingAmount,
      exchangeRate: exchangeRate
    },
    notes: `Debt Status: ${debt.status.toUpperCase()}. Registered: ${debt.startDate}.`
  };

  return shareInvoiceViaWhatsApp(pdfData);
}

/**
 * Adapter: Convert an InstallmentPlan and optional specific schedule item to InvoicePDFData and share/download
 */
export async function shareInstallmentInvoicePDF(
  plan: InstallmentPlan, 
  schedule?: InstallmentScheduleItem, 
  exchangeRate: number = 1500
): Promise<WhatsAppShareResult> {
  const schedules: InvoiceSchedulePDFItem[] = (plan.schedules || []).map((s) => ({
    monthNumber: s.monthNumber,
    dueDate: s.dueDate,
    amountDue: s.amountDue,
    paidAmount: s.amountPaid || (s.status === 'paid' ? s.amountDue : 0),
    status: s.status === 'upcoming' ? 'due' : s.status,
    receiptNumber: s.receiptNumber
  }));

  const items: InvoiceItemPDF[] = [
    {
      name: plan.productSummary || 'Financed Mobile Smartphone Package',
      description: `Contract: ${plan.contractNumber} (${plan.durationMonths} Months Installment Plan)`,
      quantity: 1,
      unitPrice: plan.principalAmount || (plan.totalAmount - (plan.additionalFee || 0)),
      total: plan.principalAmount || (plan.totalAmount - (plan.additionalFee || 0))
    }
  ];

  const pdfData: InvoicePDFData = {
    invoiceNumber: plan.contractNumber,
    date: plan.startDate || new Date().toISOString().split('T')[0],
    dueDate: schedule ? schedule.dueDate : plan.firstDueDate,
    type: 'installment_invoice',
    customer: {
      id: plan.customerIdCard || plan.id,
      name: plan.customerName,
      phone: plan.customerPhone,
      address: plan.customerAddress,
      guarantorName: plan.guarantorName,
      guarantorPhone: plan.guarantorPhone
    },
    items: items,
    schedules: schedules,
    financials: {
      currency: plan.currency,
      subtotal: plan.principalAmount || (plan.totalAmount - (plan.additionalFee || 0)),
      financingFee: plan.additionalFee || 0,
      totalAmount: plan.totalAmount,
      paidAmount: plan.paidAmount,
      remainingBalance: plan.balanceRemaining,
      downPayment: plan.downPayment,
      monthlyPayment: plan.monthlyPayment,
      installmentNumber: schedule ? schedule.monthNumber : 1,
      totalInstallments: plan.durationMonths,
      durationMonths: plan.durationMonths,
      exchangeRate: exchangeRate
    },
    notes: `POS Installment Agreement. Down Payment Paid: ${formatCurrency(plan.downPayment, plan.currency)}.`
  };

  return shareInvoiceViaWhatsApp(pdfData);
}

/**
 * Adapter: Convert a Notification item to InvoicePDFData and share/download
 */
export async function shareNotificationInvoicePDF(
  notification: AppNotification, 
  exchangeRate: number = 1500
): Promise<WhatsAppShareResult> {
  const meta = notification.metadata || {};
  const customerName = meta.customerName || 'Customer';
  const customerPhone = meta.customerPhone || '';
  const amountDue = meta.amountDue || 0;
  const currency = (meta.currency as 'USD' | 'IQD') || 'USD';
  const dueDate = meta.dueDate;

  const pdfData: InvoicePDFData = {
    invoiceNumber: meta.debtId || meta.ticketNumber || `NOTIF-${notification.id.substring(0, 8).toUpperCase()}`,
    date: new Date().toISOString().split('T')[0],
    dueDate: dueDate,
    type: notification.category === 'debt' ? 'debt_reminder' : 'installment_reminder',
    customer: {
      name: customerName,
      phone: customerPhone
    },
    items: [
      {
        name: notification.title,
        description: notification.message,
        quantity: 1,
        unitPrice: amountDue,
        total: amountDue
      }
    ],
    financials: {
      currency: currency,
      totalAmount: amountDue,
      paidAmount: 0,
      remainingBalance: amountDue,
      exchangeRate: exchangeRate
    },
    notes: `Priority: ${notification.priority.toUpperCase()}. Automated alert generated by NALI POS Notification Engine.`
  };

  return shareInvoiceViaWhatsApp(pdfData);
}
