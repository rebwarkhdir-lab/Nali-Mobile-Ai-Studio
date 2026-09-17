import * as htmlToImage from 'html-to-image';
import jsPDF from 'jspdf';
import { 
  InvoiceDocument, 
  InvoiceItem, 
  InvoiceCustomer, 
  InvoiceDocumentType, 
  InvoiceStatus,
  BusinessInvoiceSettings,
  CustomerStatementTransaction
} from '../types/invoice';
import { POSReceiptData } from '../components/pos/POSReceiptModal';
import { Debt, DebtPayment } from '../types/debt';
import { InstallmentPlan, InstallmentScheduleItem } from '../types/installment';
import { formatCurrency, convertCurrency, formatDualPrice } from './utils';
import { sound } from './sound';

/**
 * Clean and format phone number for WhatsApp API
 * Converts local Iraqi numbers (e.g. 07501234567) to international format (9647501234567)
 */
export function cleanPhoneForWhatsApp(phone: string | undefined | null): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.slice(2);
  }
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '964' + cleaned.slice(1);
  } else if (!cleaned.startsWith('964') && (cleaned.length === 10 || cleaned.length === 9)) {
    cleaned = '964' + cleaned;
  }
  return cleaned;
}

/**
 * Text Isolation for RTL to guarantee IMEIs, Numbers, Phones, and Barcodes are never flipped
 */
export function isolateBidi(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '';
  return `\u202A${val}\u202C`; // Left-to-Right Embedding
}

/**
 * Generate Secure & Clean Verification Payload for QR Code
 */
export function generateInvoiceVerificationPayload(doc: InvoiceDocument): string {
  const meta = {
    app: 'Nali Mobile',
    docNo: doc.documentNumber,
    type: doc.documentType,
    date: doc.issueDate,
    total: doc.grandTotal,
    paid: doc.paidAmount,
    balance: doc.remainingBalance,
    cur: doc.currency,
    cust: doc.customer?.name || 'Walk-in',
    v: '1.0'
  };
  return JSON.stringify(meta);
}

/**
 * Generate WhatsApp Message formatted in Kurdish Sorani or English
 */
export function generateWhatsAppMessage(doc: InvoiceDocument, lang: 'ku' | 'en' = 'ku'): string {
  const isKu = lang === 'ku';
  const cur = doc.currency;
  const storeName = isKu ? (doc.businessInfo?.businessNameKu || 'نالی مۆبایل') : (doc.businessInfo?.businessNameEn || 'Nali Mobile');
  const storePhone = doc.businessInfo?.businessPhone || '+964 750 123 4567';
  const customerName = doc.customer?.name || (isKu ? 'کڕیاری بەڕێز' : 'Valued Customer');

  if (doc.documentType === 'debt_receipt' || doc.documentType === 'installment_receipt') {
    const pmt = doc.paymentReceiptDetails;
    if (isKu) {
      return `*${storeName} - پسوڵەی وەرگرتنی پارە*
━━━━━━━━━━━━━━━━━━━━
👤 *بەڕێز:* ${customerName}
📄 *ژمارەی وەسڵ:* ${doc.documentNumber}
📅 *بەروار:* ${doc.issueDate} ${doc.issueTime || ''}
${pmt?.originalInvoiceNumber ? `🏷️ *پسوڵەی سەرەکی:* ${pmt.originalInvoiceNumber}\n` : ''}${pmt?.installmentMonthNumber ? `🗓️ *قیستی مانگی:* ${pmt.installmentMonthNumber}\n` : ''}━━━━━━━━━━━━━━━━━━━━
💰 *بڕی پارەی دراو:* ${formatCurrency(doc.paidAmount, cur)}
💵 *باڵانسی پێشوو:* ${formatCurrency(doc.previousBalance || 0, cur)}
🔴 *باڵانسی ماوە:* ${formatCurrency(doc.remainingBalance, cur)}
${pmt?.nextDueDate ? `⏰ *بەرواری قیستی داهاتوو:* ${pmt.nextDueDate}\n` : ''}━━━━━━━━━━━━━━━━━━━━
📎 *فایلی فەرمی:* هاوپێچی PDF لەگەڵ ئەم نامەیە نێردراوە
━━━━━━━━━━━━━━━━━━━━
سوپاس بۆ متمانەتان بە ${storeName}
📞 پەیوەندی: ${storePhone}`;
    } else {
      return `*${storeName} - Official Payment Receipt*
━━━━━━━━━━━━━━━━━━━━
👤 *Customer:* ${customerName}
📄 *Receipt No:* ${doc.documentNumber}
📅 *Date:* ${doc.issueDate} ${doc.issueTime || ''}
${pmt?.originalInvoiceNumber ? `🏷️ *Reference Invoice:* ${pmt.originalInvoiceNumber}\n` : ''}${pmt?.installmentMonthNumber ? `🗓️ *Installment Month:* ${pmt.installmentMonthNumber}\n` : ''}━━━━━━━━━━━━━━━━━━━━
💰 *Amount Paid:* ${formatCurrency(doc.paidAmount, cur)}
💵 *Previous Balance:* ${formatCurrency(doc.previousBalance || 0, cur)}
🔴 *Remaining Balance:* ${formatCurrency(doc.remainingBalance, cur)}
${pmt?.nextDueDate ? `⏰ *Next Due Date:* ${pmt.nextDueDate}\n` : ''}━━━━━━━━━━━━━━━━━━━━
📎 *Attachment:* Official PDF Receipt attached
━━━━━━━━━━━━━━━━━━━━
Thank you for choosing ${storeName}!
📞 Contact: ${storePhone}`;
    }
  }

  if (doc.documentType === 'installment_invoice') {
    const ins = doc.installmentDetails;
    if (isKu) {
      return `*${storeName} - پسوڵە و گرێبەستی فەرمی قیست*
━━━━━━━━━━━━━━━━━━━━
👤 *کڕیار:* ${customerName}
📄 *ژمارەی گرێبەست:* ${doc.documentNumber}
📅 *بەرواری دەستپێک:* ${doc.issueDate}
📱 *ئامێر / کاڵا:* ${doc.items?.map(i => i.name).join(', ') || 'ئامێری مۆبایل'}
━━━━━━━━━━━━━━━━━━━━
💵 *کۆی گشتی بە قازانجەوە:* ${formatCurrency(doc.grandTotal, cur)}
▫️ *پێشەکی دراو:* ${formatCurrency(doc.paidAmount, cur)}
▫️ *قیستی مانگانە:* ${formatCurrency(ins?.monthlyPayment || 0, cur)}
▫️ *ماوەی قیست:* ${ins?.durationMonths || 0} مانگ
▫️ *کۆی باڵانسی ماوە:* ${formatCurrency(doc.remainingBalance, cur)}
▫️ *یەکەم بەرواری قیست:* ${ins?.firstDueDate || doc.issueDate}
━━━━━━━━━━━━━━━━━━━━
📎 *فایلی فەرمی:* فایلی واژووکراوی گرێبەست و خشتەی قیستەکان (PDF) هاوپێچە
━━━━━━━━━━━━━━━━━━━━
سوپاس بۆ متمانە و مامەڵەکردنتان لەگەڵ ${storeName}
📞 پەیوەندی: ${storePhone}`;
    } else {
      return `*${storeName} - Official Installment Agreement & Invoice*
━━━━━━━━━━━━━━━━━━━━
👤 *Customer:* ${customerName}
📄 *Contract No:* ${doc.documentNumber}
📅 *Start Date:* ${doc.issueDate}
📱 *Item(s):* ${doc.items?.map(i => i.name).join(', ') || 'Mobile Device'}
━━━━━━━━━━━━━━━━━━━━
💵 *Total Amount (with fee):* ${formatCurrency(doc.grandTotal, cur)}
▫️ *Down Payment Paid:* ${formatCurrency(doc.paidAmount, cur)}
▫️ *Monthly Installment:* ${formatCurrency(ins?.monthlyPayment || 0, cur)}
▫️ *Duration:* ${ins?.durationMonths || 0} Months
▫️ *Remaining Balance:* ${formatCurrency(doc.remainingBalance, cur)}
▫️ *First Due Date:* ${ins?.firstDueDate || doc.issueDate}
━━━━━━━━━━━━━━━━━━━━
📎 *Attached File:* Official PDF Agreement & Monthly Schedule
━━━━━━━━━━━━━━━━━━━━
Thank you for choosing ${storeName}!
📞 Contact: ${storePhone}`;
    }
  }

  if (doc.documentType === 'debt_invoice') {
    const debt = doc.debtDetails;
    if (isKu) {
      return `*${storeName} - پسوڵەی فەرمی فرۆشتنی قەرز*
━━━━━━━━━━━━━━━━━━━━
👤 *کڕیار:* ${customerName}
📄 *ژمارەی پسوڵە:* ${doc.documentNumber}
📅 *بەرواری دەرچوون:* ${doc.issueDate}
📱 *کاڵاکان:* ${doc.items?.map(i => i.name).join(', ') || 'کەلوپەل و ئامێر'}
━━━━━━━━━━━━━━━━━━━━
💵 *کۆی پسوڵەی قەرز:* ${formatCurrency(doc.grandTotal, cur)}
▫️ *بڕی پارەی دراو (نەقد):* ${formatCurrency(doc.paidAmount, cur)}
▫️ *قەرزی ماوەی کڕیار:* ${formatCurrency(doc.remainingBalance, cur)}
▫️ *بەرواری دیاریکراوی دانەوە:* ${debt?.dueDate || 'دیارینەکراوە'}
━━━━━━━━━━━━━━━━━━━━
📎 *فایلی فەرمی:* فایلی PDF ی پسوڵەی قەرز هاوپێچە
━━━━━━━━━━━━━━━━━━━━
سوپاس بۆ متمانەتان بە ${storeName}
📞 پەیوەندی: ${storePhone}`;
    } else {
      return `*${storeName} - Official Credit / Debt Sale Invoice*
━━━━━━━━━━━━━━━━━━━━
👤 *Customer:* ${customerName}
📄 *Invoice No:* ${doc.documentNumber}
📅 *Date:* ${doc.issueDate}
📱 *Items:* ${doc.items?.map(i => i.name).join(', ') || 'Purchased Items'}
━━━━━━━━━━━━━━━━━━━━
💵 *Total Amount:* ${formatCurrency(doc.grandTotal, cur)}
▫️ *Down Payment Paid:* ${formatCurrency(doc.paidAmount, cur)}
▫️ *Remaining Debt Balance:* ${formatCurrency(doc.remainingBalance, cur)}
▫️ *Payment Due Date:* ${debt?.dueDate || 'Open'}
━━━━━━━━━━━━━━━━━━━━
📎 *Attached Document:* Official Signed Debt Invoice PDF
━━━━━━━━━━━━━━━━━━━━
Thank you for choosing ${storeName}!
📞 Contact: ${storePhone}`;
    }
  }

  if (doc.documentType === 'customer_statement') {
    const stm = doc.statementDetails;
    if (isKu) {
      return `*${storeName} - کەشفی فەرمی هەژماری کڕیار*
━━━━━━━━━━━━━━━━━━━━
👤 *بەڕێز:* ${customerName}
📄 *ژمارەی کەشف:* ${doc.documentNumber}
📅 *بەروار:* ${doc.issueDate}
━━━━━━━━━━━━━━━━━━━━
💵 *کۆی کڕین و قەرزەکان:* ${formatCurrency(stm?.totalDebits || 0, cur)}
💰 *کۆی دراو و پارەدانەکان:* ${formatCurrency(stm?.totalCredits || 0, cur)}
🔴 *باڵانسی ماوە (قەرزی ئێستا):* ${formatCurrency(doc.remainingBalance, cur)}
━━━━━━━━━━━━━━━━━━━━
📎 *هاوپێچ:* کەشفی تەواوی جوڵەی دارایی بە شێوازی فایلی PDF
━━━━━━━━━━━━━━━━━━━━
سوپاس بۆ مامەڵەکردنتان لەگەڵ ${storeName}
📞 پەیوەندی: ${storePhone}`;
    } else {
      return `*${storeName} - Official Customer Account Statement*
━━━━━━━━━━━━━━━━━━━━
👤 *Customer:* ${customerName}
📄 *Statement Ref:* ${doc.documentNumber}
📅 *Date:* ${doc.issueDate}
━━━━━━━━━━━━━━━━━━━━
💵 *Total Debits:* ${formatCurrency(stm?.totalDebits || 0, cur)}
💰 *Total Credits / Paid:* ${formatCurrency(stm?.totalCredits || 0, cur)}
🔴 *Outstanding Balance:* ${formatCurrency(doc.remainingBalance, cur)}
━━━━━━━━━━━━━━━━━━━━
📎 *Attachment:* Full Account Ledger Statement PDF
━━━━━━━━━━━━━━━━━━━━
Thank you for your business with ${storeName}!
📞 Contact: ${storePhone}`;
    }
  }

  // Standard Cash / Card Sales Invoice
  if (isKu) {
    return `*${storeName} - پسوڵەی فرۆشتن*
━━━━━━━━━━━━━━━━━━━━
👤 *کڕیار:* ${customerName}
📄 *ژمارەی پسوڵە:* ${doc.documentNumber}
📅 *بەروار:* ${doc.issueDate} ${doc.issueTime || ''}
${Array.isArray(doc.items) && doc.items.length > 0 ? `🛍️ *کاڵاکان:*\n${(doc.items || []).map(i => `• ${i.name} (x${i.quantity}) - ${formatCurrency(i.total, cur)}`).join('\n')}\n` : ''}━━━━━━━━━━━━━━━━━━━━
💰 *کۆی گشتی:* ${formatCurrency(doc.grandTotal, cur)}
✅ *بڕی پارەی دراو:* ${formatCurrency(doc.paidAmount, cur)}
${doc.remainingBalance > 0 ? `🔴 *ماوە:* ${formatCurrency(doc.remainingBalance, cur)}\n` : ''}━━━━━━━━━━━━━━━━━━━━
📎 *هاوپێچ:* فایلی فەرمی پسوڵەی فرۆشتن (PDF)
━━━━━━━━━━━━━━━━━━━━
سوپاس بۆ کڕینەکەتان لە ${storeName}
📞 پەیوەندی: ${storePhone}`;
  } else {
    return `*${storeName} - Sales Receipt*
━━━━━━━━━━━━━━━━━━━━
👤 *Customer:* ${customerName}
📄 *Invoice No:* ${doc.documentNumber}
📅 *Date:* ${doc.issueDate} ${doc.issueTime || ''}
${Array.isArray(doc.items) && doc.items.length > 0 ? `🛍️ *Purchased Items:*\n${(doc.items || []).map(i => `• ${i.name} (x${i.quantity}) - ${formatCurrency(i.total, cur)}`).join('\n')}\n` : ''}━━━━━━━━━━━━━━━━━━━━
💰 *Grand Total:* ${formatCurrency(doc.grandTotal, cur)}
✅ *Paid Amount:* ${formatCurrency(doc.paidAmount, cur)}
${doc.remainingBalance > 0 ? `🔴 *Balance Due:* ${formatCurrency(doc.remainingBalance, cur)}\n` : ''}━━━━━━━━━━━━━━━━━━━━
📎 *Attachment:* Official Sales Receipt PDF
━━━━━━━━━━━━━━━━━━━━
Thank you for shopping at ${storeName}!
📞 Contact: ${storePhone}`;
  }
}

/**
 * Open WhatsApp with prefilled message
 */
export function openWhatsAppWithMessage(phone: string | undefined | null, message: string): void {
  const cleanPhone = cleanPhoneForWhatsApp(phone);
  const encoded = encodeURIComponent(message);
  if (cleanPhone) {
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
  } else {
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }
}

/**
 * Generate PDF Document Blob & jsPDF Instance from an HTML Element
 */
export async function generateInvoicePDFBlob(
  elementId: string
): Promise<{ success: boolean; blob?: Blob; pdf?: jsPDF; error?: string }> {
  const element = document.getElementById(elementId);
  if (!element) {
    return { success: false, error: `Document element #${elementId} not found` };
  }

  try {
    const dataUrl = await htmlToImage.toPng(element, {
      pixelRatio: 2.5,
      cacheBust: true,
      backgroundColor: '#ffffff',
      style: {
        borderRadius: '0px',
        boxShadow: 'none'
      }
    });

    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgHeight = (img.height * pdfWidth) / img.width;

    if (imgHeight <= pdfHeight) {
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
    } else {
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }
    }

    const blob = pdf.output('blob');
    return { success: true, blob, pdf };
  } catch (err: any) {
    console.error('PDF Blob generation failure:', err);
    return { success: false, error: err?.message || 'Failed to generate PDF document' };
  }
}

/**
 * High Resolution PDF Download
 */
export async function exportInvoiceToPDF(
  elementId: string, 
  customFilename?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await generateInvoicePDFBlob(elementId);
    if (!result.success || !result.pdf) {
      return { success: false, error: result.error || 'Failed to generate PDF' };
    }

    const filename = customFilename || `NaliMobile-Invoice-${Date.now()}.pdf`;
    result.pdf.save(filename);
    return { success: true };
  } catch (err: any) {
    console.error('PDF export failure:', err);
    return { success: false, error: err?.message || 'Failed to download PDF document' };
  }
}

/**
 * Universal WhatsApp PDF Sharing
 * 1. Checks if browser supports native file sharing (Web Share API with files).
 * 2. If supported, triggers native share with the generated PDF file + WhatsApp message text.
 * 3. If not supported (e.g. desktop browsers without file share), automatically downloads the PDF,
 *    copies the WhatsApp message to clipboard, and opens the WhatsApp chat with customer.
 */
export async function shareInvoicePDFToWhatsApp(
  elementId: string,
  doc: InvoiceDocument,
  lang: 'ku' | 'en' = 'ku'
): Promise<{
  success: boolean;
  mode: 'native_file_share' | 'download_and_whatsapp' | 'error';
  filename?: string;
  error?: string;
}> {
  try {
    const pdfRes = await generateInvoicePDFBlob(elementId);
    if (!pdfRes.success || !pdfRes.blob) {
      return { success: false, mode: 'error', error: pdfRes.error || 'Could not generate PDF' };
    }

    const safeDocNumber = doc.documentNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `NaliMobile_${doc.documentType.toUpperCase()}_${safeDocNumber}.pdf`;
    const messageText = generateWhatsAppMessage(doc, lang);
    const title = `${doc.businessInfo?.businessNameEn || 'Nali Mobile'} - ${doc.documentNumber}`;

    // Test Web Share API with File support
    const pdfFile = new File([pdfRes.blob], filename, { type: 'application/pdf' });

    if (
      navigator.canShare && 
      navigator.canShare({ files: [pdfFile] }) &&
      navigator.share
    ) {
      try {
        await navigator.share({
          files: [pdfFile],
          title,
          text: messageText
        });
        return { success: true, mode: 'native_file_share', filename };
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') {
          return { success: true, mode: 'native_file_share', filename };
        }
        console.warn('Native file share failed, falling back to download + WhatsApp redirect:', shareErr);
      }
    }

    // Fallback Workflow: Download PDF + Copy Caption + Open WhatsApp Chat
    if (pdfRes.pdf) {
      pdfRes.pdf.save(filename);
    } else {
      const url = URL.createObjectURL(pdfRes.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    // Copy formatted text to clipboard
    try {
      await navigator.clipboard.writeText(messageText);
    } catch {
      // Ignore clipboard failure
    }

    // Open WhatsApp Chat
    openWhatsAppWithMessage(doc.customer?.phone, messageText);

    return { 
      success: true, 
      mode: 'download_and_whatsapp', 
      filename 
    };
  } catch (err: any) {
    console.error('Share to WhatsApp failure:', err);
    return { success: false, mode: 'error', error: err?.message || 'Failed to share PDF to WhatsApp' };
  }
}

/**
 * Native Device Share API (Text/Link only)
 */
export async function shareViaDevice(doc: InvoiceDocument, lang: 'ku' | 'en' = 'ku'): Promise<boolean> {
  const text = generateWhatsAppMessage(doc, lang);
  const title = `${doc.businessInfo?.businessNameEn || 'Nali Mobile'} - ${doc.documentNumber}`;
  
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text
      });
      return true;
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.warn('Share error:', e);
      }
    }
  }
  return false;
}

/**
 * Convert POS receipt data to universal InvoiceDocument
 */
export function convertPOSReceiptToInvoiceDoc(
  receipt: POSReceiptData,
  settings?: any
): InvoiceDocument {
  const isDebt = receipt.sellType === 'debt';
  const isInstallment = receipt.sellType === 'installment';

  const docType: InvoiceDocumentType = isInstallment 
    ? 'installment_invoice' 
    : isDebt 
      ? 'debt_invoice' 
      : 'cash_invoice';

  let status: InvoiceStatus = 'paid';
  let paidAmount = receipt.total;
  let remainingBalance = 0;

  if (isDebt) {
    paidAmount = receipt.debtDownPayment || 0;
    remainingBalance = Math.max(0, receipt.total - paidAmount);
    status = remainingBalance <= 0 ? 'paid' : (paidAmount > 0 ? 'partially_paid' : 'debt');
  } else if (isInstallment) {
    const fee = receipt.installmentAdditionalFee || 0;
    const grandTotal = receipt.total + fee;
    paidAmount = receipt.installmentDownPayment || 0;
    remainingBalance = Math.max(0, grandTotal - paidAmount);
    status = remainingBalance <= 0 ? 'paid' : 'installment';
  }

  const items: InvoiceItem[] = (receipt.items || []).map((item, idx) => ({
    id: item.id || `item_${idx}`,
    type: item.type || 'general',
    name: item.name,
    barcode: item.barcode,
    quantity: item.quantity,
    unitPrice: item.price,
    currency: item.currency,
    discount: item.discount || 0,
    total: (item.price * item.quantity) - (item.discount || 0),
    accessories: item.detail
  }));

  const customer: InvoiceCustomer = {
    name: receipt.customer?.name || 'Walk-in Customer',
    phone: receipt.customer?.phone,
    idCard: receipt.customer?.idCard,
    address: receipt.customer?.address,
    guarantorName: receipt.customer?.guarantorName,
    guarantorPhone: receipt.customer?.guarantorPhone
  };

  const invoiceDoc: InvoiceDocument = {
    documentId: `doc_${receipt.invoiceNo}`,
    documentNumber: receipt.invoiceNo,
    documentType: docType,
    issueDate: receipt.date || new Date().toISOString().split('T')[0],
    issueTime: receipt.time || new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }),
    currency: receipt.checkoutCurrency || 'USD',
    exchangeRate: receipt.exchangeRate || settings?.exchangeRate || 1500,
    subtotal: receipt.subtotal,
    discount: receipt.discount || 0,
    tax: receipt.tax || 0,
    grandTotal: isInstallment ? (receipt.total + (receipt.installmentAdditionalFee || 0)) : receipt.total,
    paidAmount,
    remainingBalance,
    paymentMethod: receipt.sellType,
    cashTendered: receipt.cashTendered,
    cashChange: receipt.cashChange,
    cardProvider: receipt.cardProvider,
    cardRef: receipt.cardRef,
    status,
    notes: receipt.notes,
    customer,
    items,
    businessInfo: settings ? {
      businessNameEn: settings.businessNameEn,
      businessNameKu: settings.businessNameKu,
      businessTaglineEn: settings.businessTaglineEn,
      businessTaglineKu: settings.businessTaglineKu,
      businessAddressEn: settings.businessAddressEn,
      businessAddressKu: settings.businessAddressKu,
      businessPhone: settings.businessPhone,
      businessPhoneSecondary: settings.businessPhoneSecondary,
      businessWhatsApp: settings.businessWhatsApp,
      businessEmail: settings.businessEmail,
      businessTaxNumber: settings.businessTaxNumber,
      logoUrl: settings.customLogoUrl || '/nali-logo.png',
      invoiceFooterMessageEn: settings.invoiceFooterMessageEn,
      invoiceFooterMessageKu: settings.invoiceFooterMessageKu,
      invoiceTermsEn: settings.invoiceTermsEn,
      invoiceTermsKu: settings.invoiceTermsKu,
      invoiceShowQR: settings.invoiceShowQR !== false,
      invoiceShowDualCurrency: settings.invoiceShowDualCurrency !== false
    } : undefined
  };

  if (isInstallment) {
    const months = receipt.installmentMonths || 6;
    const fee = receipt.installmentAdditionalFee || 0;
    const grandTotal = receipt.total + fee;
    const financed = Math.max(0, grandTotal - (receipt.installmentDownPayment || 0));
    const monthly = receipt.installmentMonthlyPayment || (financed > 0 ? parseFloat((financed / months).toFixed(2)) : 0);

    invoiceDoc.installmentDetails = {
      contractNumber: `INS-${receipt.invoiceNo}`,
      principalAmount: receipt.total,
      additionalFee: fee,
      totalAmount: grandTotal,
      downPayment: receipt.installmentDownPayment || 0,
      financedAmount: financed,
      monthlyPayment: monthly,
      durationMonths: months,
      frequency: 'monthly',
      startDate: receipt.date,
      firstDueDate: receipt.installmentFirstDueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      paidSchedulesCount: 0,
      totalSchedulesCount: months,
      paidAmount: receipt.installmentDownPayment || 0,
      balanceRemaining: financed,
      schedules: (receipt.installmentSchedule || []).map((s) => ({
        monthNumber: s.month,
        dueDate: s.dueDate,
        amountDue: s.amount,
        amountPaid: 0,
        status: 'upcoming'
      })),
      guarantorName: receipt.customer?.guarantorName,
      guarantorPhone: receipt.customer?.guarantorPhone
    };
  }

  if (isDebt) {
    invoiceDoc.debtDetails = {
      originalAmount: receipt.total,
      downPayment: receipt.debtDownPayment || 0,
      paidAmount: receipt.debtDownPayment || 0,
      remainingAmount: Math.max(0, receipt.total - (receipt.debtDownPayment || 0)),
      startDate: receipt.date,
      dueDate: receipt.debtDueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: remainingBalance <= 0 ? 'paid' : 'outstanding',
      payments: receipt.debtDownPayment ? [
        {
          id: `pmt_pos_${receipt.invoiceNo}`,
          amount: receipt.debtDownPayment,
          currency: receipt.checkoutCurrency,
          paymentDate: receipt.date,
          paymentMethod: 'cash',
          receiptNumber: `REC-POS-${receipt.invoiceNo}`,
          notes: 'Down payment at POS'
        }
      ] : [],
      guarantorName: receipt.customer?.guarantorName,
      guarantorPhone: receipt.customer?.guarantorPhone
    };
  }

  return invoiceDoc;
}

/**
 * Convert Debt model to universal InvoiceDocument
 */
export function convertDebtToInvoiceDoc(
  debt: Debt,
  activePayment?: DebtPayment,
  settings?: any
): InvoiceDocument {
  const isPaymentReceipt = !!activePayment;
  const docType: InvoiceDocumentType = isPaymentReceipt ? 'debt_receipt' : 'debt_invoice';

  const doc: InvoiceDocument = {
    documentId: isPaymentReceipt ? `rec_${activePayment.id}` : `debt_${debt.id}`,
    documentNumber: isPaymentReceipt ? activePayment.receiptNumber : (debt.invoiceNumber || `DEBT-${debt.id.slice(-6).toUpperCase()}`),
    documentType: docType,
    issueDate: isPaymentReceipt ? (activePayment.paymentDate.split('T')[0]) : debt.startDate,
    issueTime: isPaymentReceipt ? new Date(activePayment.paymentDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : undefined,
    currency: debt.currency,
    exchangeRate: settings?.exchangeRate || 1500,
    subtotal: debt.originalAmount,
    discount: 0,
    tax: 0,
    grandTotal: debt.originalAmount,
    paidAmount: isPaymentReceipt ? activePayment.amount : debt.paidAmount,
    previousBalance: isPaymentReceipt ? (debt.remainingAmount + activePayment.amount) : debt.originalAmount,
    remainingBalance: debt.remainingAmount,
    paymentMethod: isPaymentReceipt ? activePayment.paymentMethod : 'debt',
    status: debt.status === 'paid' ? 'paid' : (debt.status === 'overdue' ? 'overdue' : (debt.paidAmount > 0 ? 'partially_paid' : 'debt')),
    notes: isPaymentReceipt ? activePayment.notes : debt.notes,
    customer: {
      name: debt.customerName,
      phone: debt.customerPhone,
      address: debt.customerAddress,
      idCard: debt.customerIdCard,
      guarantorName: debt.guarantorName,
      guarantorPhone: debt.guarantorPhone,
      previousBalance: debt.originalAmount - debt.paidAmount,
      totalOutstandingBalance: debt.remainingAmount
    },
    items: debt.productSummary ? [
      {
        id: `item_summary_${debt.id}`,
        type: 'general',
        name: debt.productSummary,
        quantity: 1,
        unitPrice: debt.originalAmount,
        currency: debt.currency,
        total: debt.originalAmount
      }
    ] : [],
    debtDetails: {
      originalAmount: debt.originalAmount,
      downPayment: debt.downPayment,
      paidAmount: debt.paidAmount,
      remainingAmount: debt.remainingAmount,
      startDate: debt.startDate,
      dueDate: debt.dueDate,
      status: debt.status,
      payments: (debt.payments || []).map(p => ({
        id: p.id,
        debtId: p.debtId,
        amount: p.amount,
        currency: p.currency,
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        receiptNumber: p.receiptNumber,
        notes: p.notes,
        receivedBy: p.receivedBy
      })),
      guarantorName: debt.guarantorName,
      guarantorPhone: debt.guarantorPhone
    },
    businessInfo: settings ? {
      businessNameEn: settings.businessNameEn,
      businessNameKu: settings.businessNameKu,
      businessTaglineEn: settings.businessTaglineEn,
      businessTaglineKu: settings.businessTaglineKu,
      businessAddressEn: settings.businessAddressEn,
      businessAddressKu: settings.businessAddressKu,
      businessPhone: settings.businessPhone,
      businessPhoneSecondary: settings.businessPhoneSecondary,
      businessWhatsApp: settings.businessWhatsApp,
      businessEmail: settings.businessEmail,
      businessTaxNumber: settings.businessTaxNumber,
      logoUrl: settings.customLogoUrl || '/nali-logo.png',
      invoiceFooterMessageEn: settings.invoiceFooterMessageEn,
      invoiceFooterMessageKu: settings.invoiceFooterMessageKu,
      invoiceTermsEn: settings.invoiceTermsEn,
      invoiceTermsKu: settings.invoiceTermsKu,
      invoiceShowQR: settings.invoiceShowQR !== false,
      invoiceShowDualCurrency: settings.invoiceShowDualCurrency !== false
    } : undefined
  };

  if (isPaymentReceipt && activePayment) {
    doc.paymentReceiptDetails = {
      receiptNumber: activePayment.receiptNumber,
      originalInvoiceNumber: debt.invoiceNumber || debt.id,
      paymentType: 'debt',
      paymentDate: activePayment.paymentDate.split('T')[0],
      paymentTime: new Date(activePayment.paymentDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      amountPaid: activePayment.amount,
      currency: activePayment.currency,
      paymentMethod: activePayment.paymentMethod,
      previousBalance: debt.remainingAmount + activePayment.amount,
      remainingBalance: debt.remainingAmount,
      receivedBy: activePayment.receivedBy || 'Cashier',
      notes: activePayment.notes
    };
  }

  return doc;
}

/**
 * Convert Installment Plan to universal InvoiceDocument
 */
export function convertInstallmentToInvoiceDoc(
  plan: InstallmentPlan,
  activeScheduleId?: string,
  settings?: any
): InvoiceDocument {
  const activeSchedule = activeScheduleId 
    ? plan.schedules.find(s => s.id === activeScheduleId) 
    : undefined;

  const isScheduleReceipt = !!activeSchedule && activeSchedule.status === 'paid';
  const docType: InvoiceDocumentType = isScheduleReceipt 
    ? 'installment_receipt' 
    : 'installment_invoice';

  const paidCount = (plan.schedules || []).filter(s => s.status === 'paid').length;
  const totalCount = plan.schedules?.length || plan.durationMonths || 1;

  const doc: InvoiceDocument = {
    documentId: isScheduleReceipt ? `rec_${activeSchedule.id}` : `ins_${plan.id}`,
    documentNumber: isScheduleReceipt ? (activeSchedule.receiptNumber || `REC-${plan.contractNumber}-M${activeSchedule.monthNumber}`) : plan.contractNumber,
    documentType: docType,
    issueDate: isScheduleReceipt ? (activeSchedule.paidDate || new Date().toISOString().split('T')[0]) : plan.startDate,
    currency: plan.currency,
    exchangeRate: settings?.exchangeRate || 1500,
    subtotal: plan.principalAmount,
    discount: 0,
    tax: 0,
    grandTotal: plan.totalAmount,
    paidAmount: isScheduleReceipt ? (activeSchedule.amountPaid || activeSchedule.amountDue) : plan.paidAmount,
    previousBalance: isScheduleReceipt ? (plan.balanceRemaining + (activeSchedule.amountPaid || activeSchedule.amountDue)) : plan.totalAmount,
    remainingBalance: plan.balanceRemaining,
    paymentMethod: isScheduleReceipt ? (activeSchedule.paymentMethod || 'cash') : 'installment',
    status: plan.status === 'completed' ? 'paid' : (plan.status === 'overdue' ? 'overdue' : 'installment'),
    notes: isScheduleReceipt ? activeSchedule.notes : plan.notes,
    customer: {
      name: plan.customerName,
      phone: plan.customerPhone,
      idCard: plan.customerIdCard,
      address: plan.customerAddress,
      guarantorName: plan.guarantorName,
      guarantorPhone: plan.guarantorPhone,
      guarantorIdCard: plan.guarantorIdCard,
      guarantorAddress: plan.guarantorAddress,
      totalOutstandingBalance: plan.balanceRemaining
    },
    items: plan.productSummary ? [
      {
        id: `item_ins_${plan.id}`,
        type: 'mobile',
        name: plan.productSummary,
        quantity: 1,
        unitPrice: plan.principalAmount,
        currency: plan.currency,
        total: plan.principalAmount
      }
    ] : [],
    installmentDetails: {
      contractNumber: plan.contractNumber,
      principalAmount: plan.principalAmount,
      additionalFee: plan.additionalFee,
      totalAmount: plan.totalAmount,
      downPayment: plan.downPayment,
      financedAmount: plan.remainingAmount,
      monthlyPayment: plan.monthlyPayment,
      durationMonths: plan.durationMonths,
      frequency: plan.frequency,
      startDate: plan.startDate,
      firstDueDate: plan.firstDueDate,
      paidSchedulesCount: paidCount,
      totalSchedulesCount: totalCount,
      paidAmount: plan.paidAmount,
      balanceRemaining: plan.balanceRemaining,
      schedules: (plan.schedules || []).map(s => ({
        monthNumber: s.monthNumber,
        dueDate: s.dueDate,
        amountDue: s.amountDue,
        amountPaid: s.amountPaid,
        paidDate: s.paidDate,
        paymentMethod: s.paymentMethod,
        status: s.status,
        receiptNumber: s.receiptNumber,
        notes: s.notes
      })),
      guarantorName: plan.guarantorName,
      guarantorPhone: plan.guarantorPhone,
      guarantorIdCard: plan.guarantorIdCard,
      guarantorAddress: plan.guarantorAddress
    },
    businessInfo: settings ? {
      businessNameEn: settings.businessNameEn,
      businessNameKu: settings.businessNameKu,
      businessTaglineEn: settings.businessTaglineEn,
      businessTaglineKu: settings.businessTaglineKu,
      businessAddressEn: settings.businessAddressEn,
      businessAddressKu: settings.businessAddressKu,
      businessPhone: settings.businessPhone,
      businessPhoneSecondary: settings.businessPhoneSecondary,
      businessWhatsApp: settings.businessWhatsApp,
      businessEmail: settings.businessEmail,
      businessTaxNumber: settings.businessTaxNumber,
      logoUrl: settings.customLogoUrl || '/nali-logo.png',
      invoiceFooterMessageEn: settings.invoiceFooterMessageEn,
      invoiceFooterMessageKu: settings.invoiceFooterMessageKu,
      invoiceTermsEn: settings.invoiceTermsEn,
      invoiceTermsKu: settings.invoiceTermsKu,
      invoiceShowQR: settings.invoiceShowQR !== false,
      invoiceShowDualCurrency: settings.invoiceShowDualCurrency !== false
    } : undefined
  };

  if (isScheduleReceipt && activeSchedule) {
    const nextSchedule = plan.schedules.find(s => s.monthNumber === activeSchedule.monthNumber + 1 && s.status !== 'paid');
    doc.paymentReceiptDetails = {
      receiptNumber: activeSchedule.receiptNumber || `REC-${plan.contractNumber}-M${activeSchedule.monthNumber}`,
      originalInvoiceNumber: plan.contractNumber,
      paymentType: 'installment',
      paymentDate: activeSchedule.paidDate || new Date().toISOString().split('T')[0],
      amountPaid: activeSchedule.amountPaid || activeSchedule.amountDue,
      currency: plan.currency,
      paymentMethod: activeSchedule.paymentMethod || 'cash',
      previousBalance: plan.balanceRemaining + (activeSchedule.amountPaid || activeSchedule.amountDue),
      remainingBalance: plan.balanceRemaining,
      installmentMonthNumber: activeSchedule.monthNumber,
      totalInstallmentMonths: totalCount,
      nextDueDate: nextSchedule ? nextSchedule.dueDate : undefined,
      notes: activeSchedule.notes
    };
  }

  return doc;
}

/**
 * Generate Unified Customer Statement / Account Ledger across all historical transactions
 */
export function generateCustomerStatementDoc(
  customer: InvoiceCustomer,
  debts: Debt[],
  installments: InstallmentPlan[],
  currency: 'USD' | 'IQD' = 'USD',
  exchangeRate: number = 1500,
  settings?: any,
  dateRange?: { start?: string; end?: string }
): InvoiceDocument {
  const transactions: CustomerStatementTransaction[] = [];
  let runningBalance = 0;
  let totalDebits = 0;
  let totalCredits = 0;

  // 1. Process Debts & Payments
  debts.forEach((debt) => {
    // Initial Debt creation
    const initialDebit = debt.originalAmount;
    totalDebits += initialDebit;
    runningBalance += initialDebit;

    transactions.push({
      id: `tx_debt_orig_${debt.id}`,
      date: debt.startDate,
      type: 'debt_added',
      referenceNo: debt.invoiceNumber || `DEBT-${debt.id.slice(-4)}`,
      description: `Debt Sale: ${debt.productSummary || 'Goods & Devices'}`,
      debit: initialDebit,
      credit: 0,
      runningBalance,
      currency: debt.currency
    });

    // Down payment if any
    if (debt.downPayment > 0) {
      totalCredits += debt.downPayment;
      runningBalance -= debt.downPayment;
      transactions.push({
        id: `tx_debt_down_${debt.id}`,
        date: debt.startDate,
        type: 'down_payment',
        referenceNo: `DOWN-${debt.invoiceNumber || debt.id.slice(-4)}`,
        description: `Down Payment at POS (${debt.productSummary || 'Debt'})`,
        debit: 0,
        credit: debt.downPayment,
        runningBalance,
        currency: debt.currency
      });
    }

    // Subsequent Payments
    (debt.payments || []).forEach((p) => {
      // Don't duplicate down payment if it matches the POS down payment ID
      if (p.id === `pmt_pos_${debt.id}` && debt.downPayment > 0) return;

      totalCredits += p.amount;
      runningBalance -= p.amount;
      transactions.push({
        id: `tx_pmt_${p.id}`,
        date: p.paymentDate.split('T')[0],
        type: 'payment',
        referenceNo: p.receiptNumber,
        description: `Debt Payment Received (${p.paymentMethod}) ${p.notes ? '• ' + p.notes : ''}`,
        debit: 0,
        credit: p.amount,
        runningBalance,
        currency: p.currency
      });
    });
  });

  // 2. Process Installment Plans & Schedule Payments
  installments.forEach((plan) => {
    // Initial Plan total with fee
    const planDebit = plan.totalAmount;
    totalDebits += planDebit;
    runningBalance += planDebit;

    transactions.push({
      id: `tx_ins_plan_${plan.id}`,
      date: plan.startDate,
      type: 'installment_fee',
      referenceNo: plan.contractNumber,
      description: `Installment Contract: ${plan.productSummary || 'Mobile Device'} (${plan.durationMonths} Mo)`,
      debit: planDebit,
      credit: 0,
      runningBalance,
      currency: plan.currency
    });

    // Down payment
    if (plan.downPayment > 0) {
      totalCredits += plan.downPayment;
      runningBalance -= plan.downPayment;
      transactions.push({
        id: `tx_ins_down_${plan.id}`,
        date: plan.startDate,
        type: 'down_payment',
        referenceNo: `DOWN-${plan.contractNumber}`,
        description: `Installment Down Payment (${plan.productSummary || 'Device'})`,
        debit: 0,
        credit: plan.downPayment,
        runningBalance,
        currency: plan.currency
      });
    }

    // Schedule payments
    (plan.schedules || []).filter(s => s.status === 'paid').forEach((s) => {
      const amt = s.amountPaid || s.amountDue;
      totalCredits += amt;
      runningBalance -= amt;
      transactions.push({
        id: `tx_ins_sch_${s.id}`,
        date: s.paidDate || s.dueDate,
        type: 'payment',
        referenceNo: s.receiptNumber || `REC-${plan.contractNumber}-M${s.monthNumber}`,
        description: `Installment Month ${s.monthNumber} Payment (${s.paymentMethod || 'cash'})`,
        debit: 0,
        credit: amt,
        runningBalance,
        currency: plan.currency
      });
    });
  });

  // Sort chronologically
  transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Filter date range if specified
  const filteredTxs = transactions.filter(t => {
    if (dateRange?.start && t.date < dateRange.start) return false;
    if (dateRange?.end && t.date > dateRange.end) return false;
    return true;
  });

  const statementDoc: InvoiceDocument = {
    documentId: `statement_${customer.name.replace(/\s+/g, '_')}_${Date.now()}`,
    documentNumber: `STM-${Date.now().toString().slice(-6)}`,
    documentType: 'customer_statement',
    issueDate: new Date().toISOString().split('T')[0],
    currency,
    exchangeRate,
    subtotal: totalDebits,
    discount: 0,
    tax: 0,
    grandTotal: totalDebits,
    paidAmount: totalCredits,
    remainingBalance: Math.max(0, totalDebits - totalCredits),
    status: (totalDebits - totalCredits) <= 0 ? 'paid' : 'debt',
    customer: {
      ...customer,
      totalOutstandingBalance: Math.max(0, totalDebits - totalCredits)
    },
    statementDetails: {
      customer,
      periodStart: dateRange?.start,
      periodEnd: dateRange?.end,
      openingBalance: 0,
      totalDebits,
      totalCredits,
      closingBalance: Math.max(0, totalDebits - totalCredits),
      currency,
      transactions: filteredTxs
    },
    businessInfo: settings ? {
      businessNameEn: settings.businessNameEn,
      businessNameKu: settings.businessNameKu,
      businessTaglineEn: settings.businessTaglineEn,
      businessTaglineKu: settings.businessTaglineKu,
      businessAddressEn: settings.businessAddressEn,
      businessAddressKu: settings.businessAddressKu,
      businessPhone: settings.businessPhone,
      businessPhoneSecondary: settings.businessPhoneSecondary,
      businessWhatsApp: settings.businessWhatsApp,
      businessEmail: settings.businessEmail,
      businessTaxNumber: settings.businessTaxNumber,
      logoUrl: settings.customLogoUrl || '/nali-logo.png',
      invoiceFooterMessageEn: settings.invoiceFooterMessageEn,
      invoiceFooterMessageKu: settings.invoiceFooterMessageKu,
      invoiceTermsEn: settings.invoiceTermsEn,
      invoiceTermsKu: settings.invoiceTermsKu,
      invoiceShowQR: settings.invoiceShowQR !== false,
      invoiceShowDualCurrency: settings.invoiceShowDualCurrency !== false
    } : undefined
  };

  return statementDoc;
}
