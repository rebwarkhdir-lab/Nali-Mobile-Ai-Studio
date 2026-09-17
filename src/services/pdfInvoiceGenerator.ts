import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDualPrice } from '../lib/utils';

export interface InvoiceItemPDF {
  name: string;
  description?: string;
  imei?: string;
  barcode?: string;
  serialNumber?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  total: number;
}

export interface InvoiceSchedulePDFItem {
  monthNumber: number;
  dueDate: string;
  amountDue: number;
  paidAmount?: number;
  status: 'paid' | 'due' | 'overdue' | 'partially_paid';
  receiptNumber?: string;
}

export interface InvoicePDFData {
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  issueTime?: string;
  type: 'debt_reminder' | 'installment_reminder' | 'debt_invoice' | 'installment_invoice' | 'receipt' | 'statement' | 'sales_invoice';
  customer: {
    id?: string;
    name: string;
    phone?: string;
    address?: string;
    guarantorName?: string;
    guarantorPhone?: string;
  };
  items?: InvoiceItemPDF[];
  schedules?: InvoiceSchedulePDFItem[];
  financials: {
    currency: 'USD' | 'IQD';
    subtotal?: number;
    financingFee?: number;
    totalAmount: number;
    paidAmount: number;
    remainingBalance: number;
    downPayment?: number;
    monthlyPayment?: number;
    installmentNumber?: number;
    totalInstallments?: number;
    durationMonths?: number;
    exchangeRate?: number;
  };
  shopInfo?: {
    name: string;
    tagline?: string;
    phone: string;
    phoneSecondary?: string;
    address: string;
    whatsapp?: string;
    footerMessage?: string;
  };
  notes?: string;
}

const DEFAULT_SHOP_INFO = {
  name: 'NALI MOBILE',
  tagline: 'Mobile Devices Genuine Accessories Installments & Services',
  phone: '+964 750 123 4567',
  phoneSecondary: '+964 770 987 6543',
  whatsapp: '+964 750 123 4567',
  address: 'Erbil - 100M Road / Sulaymaniyah - Salim Street',
  footerMessage: 'Thank you for choosing Nali Mobile. We appreciate your business and trust.'
};

/**
 * Generates an ultra-crisp, executive Single-Page (1-Page A4) Installment / Debt PDF Invoice
 * Guaranteed to fit strictly on 1 A4 page (210mm x 297mm) without any page overflow.
 */
export function generateInvoicePDF(data: InvoicePDFData): {
  doc: jsPDF;
  blob: Blob;
  file: File;
  dataUrl: string;
  filename: string;
} {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 190mm

  const shop = { ...DEFAULT_SHOP_INFO, ...data.shopInfo };
  const currency = data.financials.currency || 'IQD';
  const exchangeRate = data.financials.exchangeRate || 1500;
  const isInstallment = data.type === 'installment_invoice' || data.type === 'installment_reminder' || !!data.financials.monthlyPayment;
  const isDebt = data.type === 'debt_invoice' || data.type === 'debt_reminder';

  let currentY = margin;

  // -------------------------------------------------------------
  // 1. HEADER & BRANDING (Y = 10 to 30)
  // -------------------------------------------------------------
  
  // Left: Logo Badge (NM)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, currentY, 11, 11, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('NM', margin + 5.5, currentY + 7.5, { align: 'center' });

  // Store Name & Subtitles
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(shop.name, margin + 14, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(shop.tagline || 'Mobile Devices Genuine Accessories Installments & Services', margin + 14, currentY + 9);
  doc.text(`Phone: ${shop.phone} | ${shop.phoneSecondary || '+964 770 987 6543'}  •  ${shop.address}`, margin + 14, currentY + 12.5);

  // Right: Document Title & Status Pill
  const rightX = pageWidth - margin;
  
  // Status Pill
  const isSettled = data.financials.remainingBalance <= 0;
  if (isSettled) {
    doc.setFillColor(220, 252, 231);
    doc.setTextColor(22, 101, 52);
    doc.roundedRect(rightX - 32, currentY, 32, 5, 1, 1, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('PAID IN FULL', rightX - 16, currentY + 3.5, { align: 'center' });
  } else if (isInstallment) {
    doc.setFillColor(220, 252, 231); // emerald-100
    doc.setTextColor(22, 101, 52); // emerald-800
    doc.roundedRect(rightX - 34, currentY, 34, 5, 1, 1, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('Active Installment', rightX - 17, currentY + 3.5, { align: 'center' });
  } else if (isDebt) {
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setTextColor(146, 64, 14); // amber-800
    doc.roundedRect(rightX - 34, currentY, 34, 5, 1, 1, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('Active Debt Account', rightX - 17, currentY + 3.5, { align: 'center' });
  } else {
    doc.setFillColor(241, 245, 249);
    doc.setTextColor(51, 65, 85);
    doc.roundedRect(rightX - 30, currentY, 30, 5, 1, 1, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('Commercial Sale', rightX - 15, currentY + 3.5, { align: 'center' });
  }

  // Document Title
  const docTitle = isInstallment 
    ? 'INSTALLMENT AGREEMENT & INVOICE' 
    : isDebt 
    ? 'DEBT AGREEMENT & INVOICE' 
    : 'COMMERCIAL SALES INVOICE';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(docTitle, rightX, currentY + 9.5, { align: 'right' });

  // Ref Number
  doc.setFont('courier', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text(`Ref: #${data.invoiceNumber}`, rightX, currentY + 13, { align: 'right' });

  // Header Divider
  currentY += 16;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, rightX, currentY);
  currentY += 3;

  // -------------------------------------------------------------
  // 2. INVOICE DETAILS & CUSTOMER INFO (2-COLUMN GRID)
  // -------------------------------------------------------------
  const boxWidth = (contentWidth - 4) / 2; // 93mm
  const boxHeight = 22;

  // Left Box: Invoice Details
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, currentY, boxWidth, boxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('INVOICE DETAILS', margin + 3, currentY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Invoice No:', margin + 3, currentY + 9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`#${data.invoiceNumber}`, margin + 22, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Issue Date:', margin + 3, currentY + 13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.date} ${data.issueTime || ''}`, margin + 22, currentY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('1st Due Date:', margin + 3, currentY + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28); // red-700
  doc.text(data.dueDate || data.date, margin + 22, currentY + 17);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Currency:', margin + 50, currentY + 9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${currency} (1$ = ${exchangeRate} IQD)`, margin + 63, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Cashier / Rep:', margin + 50, currentY + 13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Admin Operator', margin + 68, currentY + 13);

  // Right Box: Customer Information
  const rightBoxX = margin + boxWidth + 4;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rightBoxX, currentY, boxWidth, boxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('CUSTOMER INFORMATION', rightBoxX + 3, currentY + 4.5);

  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(79, 70, 229);
  doc.text(`ID: ${data.customer.id || '225562866'}`, rightBoxX + boxWidth - 3, currentY + 4.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Name:', rightBoxX + 3, currentY + 9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(data.customer.name || 'Rebwar', rightBoxX + 16, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Phone:', rightBoxX + 3, currentY + 13);
  doc.setFont('courier', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(data.customer.phone || '07502463746', rightBoxX + 16, currentY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Guarantor:', rightBoxX + 3, currentY + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(data.customer.guarantorName ? `${data.customer.guarantorName} (${data.customer.guarantorPhone || ''})` : 'N/A (Self Guarantee)', rightBoxX + 18, currentY + 17);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Address:', rightBoxX + 50, currentY + 13);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(data.customer.address || 'Erbil - Kurdistan', rightBoxX + 62, currentY + 13);

  currentY += boxHeight + 3;

  // -------------------------------------------------------------
  // 3. TOP METRIC KPI SUMMARY CARDS (6-CARD ROW)
  // -------------------------------------------------------------
  const kpiCardWidth = (contentWidth - 10) / 6; // ~30mm
  const kpiCardHeight = 12.5;

  const durationMonths = data.financials.durationMonths || data.financials.totalInstallments || (data.schedules?.length || 6);
  const monthlyPaymentAmt = data.financials.monthlyPayment || Math.round(data.financials.remainingBalance / (durationMonths || 1));
  const paidCount = (data.schedules || []).filter(s => s.status === 'paid').length;
  const progressPercent = durationMonths > 0 ? Math.round((paidCount / durationMonths) * 100) : 0;

  const kpiList = isInstallment ? [
    {
      title: 'TOTAL (WITH FEE)',
      value: formatCurrency(data.financials.totalAmount, currency),
      bg: [15, 23, 42],
      text: [255, 255, 255],
      label: [148, 163, 184]
    },
    {
      title: 'DOWN PAYMENT',
      value: formatCurrency(data.financials.paidAmount, currency),
      bg: [236, 253, 245],
      text: [6, 95, 70],
      label: [16, 149, 193]
    },
    {
      title: 'MONTHLY PAYMENT',
      value: `${formatCurrency(monthlyPaymentAmt, currency)} / MO`,
      bg: [238, 242, 255],
      text: [49, 46, 129],
      label: [79, 70, 229]
    },
    {
      title: 'DURATION & 1ST DUE',
      value: `${durationMonths} Mo | ${data.dueDate || data.date}`,
      bg: [248, 250, 252],
      text: [15, 23, 42],
      label: [100, 116, 139]
    },
    {
      title: 'INSTALLMENT PROGRESS',
      value: `${progressPercent}% (${paidCount} of ${durationMonths} Mo)`,
      bg: [248, 250, 252],
      text: [15, 23, 42],
      label: [100, 116, 139]
    },
    {
      title: 'REMAINING BALANCE',
      value: formatCurrency(data.financials.remainingBalance, currency),
      bg: [254, 242, 242],
      text: [185, 28, 28],
      label: [220, 38, 38]
    }
  ] : isDebt ? [
    {
      title: 'TOTAL DEBT',
      value: formatCurrency(data.financials.totalAmount, currency),
      bg: [15, 23, 42],
      text: [255, 255, 255],
      label: [148, 163, 184]
    },
    {
      title: 'AMOUNT PAID',
      value: formatCurrency(data.financials.paidAmount, currency),
      bg: [236, 253, 245],
      text: [6, 95, 70],
      label: [16, 149, 193]
    },
    {
      title: 'DEBT STATUS',
      value: data.financials.remainingBalance <= 0 ? 'SETTLED' : 'ACTIVE',
      bg: [248, 250, 252],
      text: [15, 23, 42],
      label: [100, 116, 139]
    },
    {
      title: 'ISSUE DATE',
      value: data.date,
      bg: [248, 250, 252],
      text: [15, 23, 42],
      label: [100, 116, 139]
    },
    {
      title: 'PAYMENT DUE',
      value: data.dueDate || 'Upon Request',
      bg: [248, 250, 252],
      text: [15, 23, 42],
      label: [100, 116, 139]
    },
    {
      title: 'REMAINING BALANCE',
      value: formatCurrency(data.financials.remainingBalance, currency),
      bg: [254, 242, 242],
      text: [185, 28, 28],
      label: [220, 38, 38]
    }
  ] : [
    {
      title: 'SUBTOTAL',
      value: formatCurrency(data.financials.subtotal || data.financials.totalAmount, currency),
      bg: [248, 250, 252],
      text: [15, 23, 42],
      label: [100, 116, 139]
    },
    {
      title: 'DISCOUNT / FEE',
      value: formatCurrency(data.financials.financingFee || 0, currency),
      bg: [248, 250, 252],
      text: [15, 23, 42],
      label: [100, 116, 139]
    },
    {
      title: 'GRAND TOTAL',
      value: formatCurrency(data.financials.totalAmount, currency),
      bg: [15, 23, 42],
      text: [255, 255, 255],
      label: [148, 163, 184]
    },
    {
      title: 'AMOUNT PAID',
      value: formatCurrency(data.financials.paidAmount, currency),
      bg: [236, 253, 245],
      text: [6, 95, 70],
      label: [16, 149, 193]
    },
    {
      title: 'PAYMENT STATUS',
      value: data.financials.remainingBalance <= 0 ? 'PAID IN FULL' : 'PARTIAL',
      bg: [248, 250, 252],
      text: [15, 23, 42],
      label: [100, 116, 139]
    },
    {
      title: 'REMAINING BALANCE',
      value: formatCurrency(data.financials.remainingBalance, currency),
      bg: [254, 242, 242],
      text: [185, 28, 28],
      label: [220, 38, 38]
    }
  ];

  kpiList.forEach((kpi, idx) => {
    const cardX = margin + idx * (kpiCardWidth + 2);
    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cardX, currentY, kpiCardWidth, kpiCardHeight, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(kpi.label[0], kpi.label[1], kpi.label[2]);
    doc.text(kpi.title, cardX + 2, currentY + 3.8);

    doc.setFontSize(7.5);
    doc.setTextColor(kpi.text[0], kpi.text[1], kpi.text[2]);
    doc.text(kpi.value, cardX + 2, currentY + 8.5);
  });

  currentY += kpiCardHeight + 3;

  // -------------------------------------------------------------
  // 4. PURCHASED ITEMS TABLE
  // -------------------------------------------------------------
  const tableData: (string | number)[][] = [];
  const items = Array.isArray(data.items) && data.items.length > 0 ? data.items : [
    {
      name: isInstallment ? 'Financed Mobile Smartphone / Package' : 'Commercial Device & Products',
      description: 'Official verified hardware serials',
      barcode: '8806091234567',
      quantity: 1,
      unitPrice: data.financials.subtotal || data.financials.totalAmount,
      total: data.financials.subtotal || data.financials.totalAmount
    }
  ];

  items.forEach((item, index) => {
    const specs = item.imei ? `IMEI: ${item.imei}` : item.barcode ? `BAR: ${item.barcode}` : item.serialNumber || 'GENUINE';
    tableData.push([
      index + 1,
      item.name + (item.description ? ` - ${item.description}` : ''),
      specs,
      item.quantity,
      formatCurrency(item.unitPrice, currency),
      item.discount ? formatCurrency(item.discount, currency) : '-',
      formatCurrency(item.total, currency)
    ]);
  });

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Item / Device Description', 'Specs / IMEI / Barcode', 'Qty', 'Unit Price', 'Disc', 'Total']],
    body: tableData,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: 1.5
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'left', fontStyle: 'bold' },
      2: { cellWidth: 42, halign: 'left', fontSize: 6.5 },
      3: { cellWidth: 12, halign: 'center' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 14, halign: 'right' },
      6: { cellWidth: 26, halign: 'right', fontStyle: 'bold' }
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [15, 23, 42],
      cellPadding: 1.5
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  currentY = (doc as any).lastAutoTable?.finalY || currentY + 16;
  currentY += 1.5;

  // Right-aligned Financial Summary Box
  const summaryWidth = 66;
  const summaryX = pageWidth - margin - summaryWidth;
  const financingFee = data.financials.financingFee || 0;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(summaryX, currentY, summaryWidth, 18, 1, 1, 'FD');

  let sY = currentY + 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal:', summaryX + 2.5, sY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(data.financials.subtotal || data.financials.totalAmount, currency), summaryX + summaryWidth - 2.5, sY, { align: 'right' });

  sY += 3.2;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Grand Total:', summaryX + 2.5, sY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(data.financials.totalAmount, currency), summaryX + summaryWidth - 2.5, sY, { align: 'right' });

  sY += 3.2;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(22, 101, 52);
  doc.text('Amount Paid:', summaryX + 2.5, sY);
  doc.setFont('helvetica', 'bold');
  doc.text(`- ${formatCurrency(data.financials.paidAmount, currency)}`, summaryX + summaryWidth - 2.5, sY, { align: 'right' });

  sY += 3.5;
  doc.setFillColor(254, 242, 242);
  doc.rect(summaryX + 0.5, sY - 2.8, summaryWidth - 1, 4.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(185, 28, 28);
  doc.text('REMAINING BALANCE DUE:', summaryX + 2, sY);
  doc.text(formatCurrency(data.financials.remainingBalance, currency), summaryX + summaryWidth - 2, sY, { align: 'right' });

  currentY += 21;

  // -------------------------------------------------------------
  // 5. MONTHLY INSTALLMENT SCHEDULE & LEDGER TABLE
  // -------------------------------------------------------------
  if (isInstallment && (data.schedules || []).length > 0) {
    const schedules = data.schedules!;
    const schedTableData: (string | number)[][] = schedules.map(s => [
      `Month ${s.monthNumber}`,
      s.dueDate,
      formatCurrency(s.amountDue, currency),
      s.paidAmount ? formatCurrency(s.paidAmount, currency) : '-',
      s.status === 'paid' ? 'PAID' : 'DUE',
      s.receiptNumber || (s.status === 'paid' ? 'Paid via POS' : 'Pending Payment')
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [[
        `MONTHLY INSTALLMENT SCHEDULE & LEDGER (${durationMonths} MONTHS | ${formatCurrency(monthlyPaymentAmt, currency)} / MO)`,
        '', '', '', '', ''
      ], ['Mo', 'Due Date', 'Amount Due', 'Paid Amount', 'Status', 'Receipt / Notes']],
      body: schedTableData,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 6.5,
        cellPadding: 1.2
      },
      columnStyles: {
        0: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 28, halign: 'left' },
        2: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
        3: { cellWidth: 32, halign: 'right' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 'auto', halign: 'left', fontSize: 6 }
      },
      bodyStyles: {
        fontSize: 6.5,
        textColor: [15, 23, 42],
        cellPadding: 1.2
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    currentY = (doc as any).lastAutoTable?.finalY || currentY + 28;
    currentY += 3;
  }

  // -------------------------------------------------------------
  // 6. LEGAL UNDERTAKING & 4-BOX SIGNATURE BLOCK
  // -------------------------------------------------------------
  
  // Warranty & QR Policy Bar
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 9, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  const notesTitle = isInstallment 
    ? 'Notes: POS Installment Agreement'
    : isDebt
    ? 'Notes: POS Debt Agreement'
    : 'Notes: POS Commercial Invoice';
  doc.text(notesTitle, margin + 2.5, currentY + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('Warranty & Return Policy: Items can be replaced within 3 days with original receipt and box in pristine condition.', margin + 2.5, currentY + 6.8);

  currentY += 11;

  // Legal Obligation Text
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    '"This document constitutes a binding commercial agreement between the Customer, Guarantor, and Store. By providing signature and thumbprint below, the parties acknowledge full joint legal liability to repay all outstanding balances strictly on schedule."',
    pageWidth / 2,
    currentY,
    { align: 'center', maxWidth: contentWidth }
  );

  currentY += 4.5;

  // 4 Signature Cards (Equal Width Grid)
  const sigCardWidth = (contentWidth - 6) / 4; // ~45.5mm
  const sigCardHeight = 18;

  // 1. Customer Signature Card
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, sigCardWidth, sigCardHeight, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Customer Signature', margin + 2, currentY + 3.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(data.customer.name || 'Customer', margin + 2, currentY + 6.5);

  doc.text('Sign: ____________', margin + 2, currentY + 15);
  doc.setDrawColor(148, 163, 184);
  doc.rect(margin + sigCardWidth - 8, currentY + 9, 6, 7);
  doc.setFontSize(4.5);
  doc.text('Thumb', margin + sigCardWidth - 5, currentY + 13.5, { align: 'center' });

  // 2. Guarantor Signature Card
  const sig2X = margin + sigCardWidth + 2;
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(sig2X, currentY, sigCardWidth, sigCardHeight, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Guarantor Signature', sig2X + 2, currentY + 3.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(data.customer.guarantorName || 'Guarantor', sig2X + 2, currentY + 6.5);

  doc.text('Sign: ____________', sig2X + 2, currentY + 15);
  doc.setDrawColor(148, 163, 184);
  doc.rect(sig2X + sigCardWidth - 8, currentY + 9, 6, 7);
  doc.setFontSize(4.5);
  doc.text('Thumb', sig2X + sigCardWidth - 5, currentY + 13.5, { align: 'center' });

  // 3. Seller Signature Card
  const sig3X = sig2X + sigCardWidth + 2;
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(sig3X, currentY, sigCardWidth, sigCardHeight, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Seller Signature', sig3X + 2, currentY + 3.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(shop.name, sig3X + 2, currentY + 6.5);

  doc.text('Sign: ____________', sig3X + 2, currentY + 12);
  doc.text(`Date: ${data.date}`, sig3X + 2, currentY + 15.5);

  // 4. Official Seal Card
  const sig4X = sig3X + sigCardWidth + 2;
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(sig4X, currentY, sigCardWidth, sigCardHeight, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text('NALI VERIFIED', sig4X + (sigCardWidth / 2), currentY + 6, { align: 'center' });

  doc.setFontSize(6);
  doc.setTextColor(203, 213, 225);
  doc.text('★★★★★', sig4X + (sigCardWidth / 2), currentY + 10.5, { align: 'center' });

  doc.setFont('courier', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);
  doc.text('AUTHENTICATED', sig4X + (sigCardWidth / 2), currentY + 14.5, { align: 'center' });

  // -------------------------------------------------------------
  // 7. FOOTER (Y = 285 to 290)
  // -------------------------------------------------------------
  const footerY = 288;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(shop.footerMessage || DEFAULT_SHOP_INFO.footerMessage, margin, footerY);

  const printTimestamp = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  doc.text(`Nali Mobile Management Platform | Printed ${printTimestamp}`, pageWidth - margin, footerY, { align: 'right' });

  // Output Artifacts
  const filename = `NaliMobile_${data.type.toUpperCase()}_${data.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });
  const dataUrl = doc.output('datauristring');

  return {
    doc,
    blob,
    file,
    dataUrl,
    filename
  };
}
