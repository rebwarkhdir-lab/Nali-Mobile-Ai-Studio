import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Smartphone, 
  ShieldCheck, 
  Phone, 
  MapPin, 
  Calendar, 
  User, 
  Receipt, 
  CreditCard, 
  DollarSign, 
  FileText,
  Layers,
  Banknote,
  Hash,
  Sparkles,
  Percent
} from 'lucide-react';
import { 
  InvoiceDocument, 
  InvoiceItem, 
  InvoiceStatus,
  InstallmentScheduleDocItem
} from '../../types/invoice';
import { formatCurrency, formatDualPrice, convertCurrency } from '../../lib/utils';
import { isolateBidi, generateInvoiceVerificationPayload } from '../../lib/invoiceUtils';
import { useDesignSystem } from '../../context/DesignContext';

interface ModernInvoiceDocumentProps {
  document: InvoiceDocument;
  language?: 'ku' | 'en';
  format?: 'a4' | 'thermal';
  className?: string;
  id?: string;
}

export default function ModernInvoiceDocument({
  document: doc,
  language = 'ku',
  format = 'a4',
  className = '',
  id = 'printable-invoice-master'
}: ModernInvoiceDocumentProps) {
  const { settings } = useDesignSystem();
  const isKu = language === 'ku';
  const isRtl = isKu;
  const isThermal = format === 'thermal';

  const cur = doc.currency;
  const exchangeRate = doc.exchangeRate || 1500;
  const dual = formatDualPrice(doc.grandTotal, cur, exchangeRate);
  const dualRemaining = formatDualPrice(doc.remainingBalance, cur, exchangeRate);
  const dualPaid = formatDualPrice(doc.paidAmount, cur, exchangeRate);

  // Business Information
  const info = doc.businessInfo || {};
  const customStoreName = isKu 
    ? (info.businessNameKu || info.businessNameEn || settings.businessNameKu || settings.businessNameEn)
    : (info.businessNameEn || info.businessNameKu || settings.businessNameEn || settings.businessNameKu);
  const storeName = customStoreName || (isKu ? 'نالی مۆبایل' : 'Nali Mobile');
  
  const customTagline = isKu
    ? (info.businessTaglineKu || info.businessTaglineEn || settings.businessTaglineKu || settings.businessTaglineEn)
    : (info.businessTaglineEn || info.businessTaglineKu || settings.businessTaglineEn || settings.businessTaglineKu);
  const storeTagline = customTagline || (isKu ? 'مۆبایل • ئێکسسواراتی ئەسڵی • قیست و خزمەتگوزاری' : 'Mobile Devices • Genuine Accessories • Installments & Services');
  
  const customAddress = isKu
    ? (info.businessAddressKu || info.businessAddressEn || settings.businessAddressKu || settings.businessAddressEn)
    : (info.businessAddressEn || info.businessAddressKu || settings.businessAddressEn || settings.businessAddressKu);
  const storeAddress = customAddress || (isKu ? 'هەولێر - شەقامی ١٠٠ مەتری / سلێمانی - شەقامی سالم' : 'Erbil - 100M Road / Sulaymaniyah - Salim Street');

  const storePhone = info.businessPhone || settings.businessPhone || '+964 750 123 4567';
  const storePhoneSecondary = info.businessPhoneSecondary || settings.businessPhoneSecondary;
  const storeWhatsApp = info.businessWhatsApp || settings.businessWhatsApp || storePhone;
  const storeEmail = info.businessEmail || settings.businessEmail;
  const storeLogo = info.logoUrl || settings.customLogoUrl || '/nali-logo.png';
  const showQR = info.invoiceShowQR !== false;
  const showDual = info.invoiceShowDualCurrency !== false;

  const footerMessage = isKu
    ? (doc.businessInfo?.invoiceFooterMessageKu || 'سوپاس بۆ متمانە و مامەڵەکردنتان لەگەڵ نالی مۆبایل.')
    : (doc.businessInfo?.invoiceFooterMessageEn || 'Thank you for choosing Nali Mobile. We appreciate your business and trust.');

  const terms = isKu
    ? (doc.businessInfo?.invoiceTermsKu || 'ئامێر و کەلوپەل دەگۆڕدرێتەوە لە ماوەی ٣ ڕۆژدا بە پێشکەشکردنی پسوڵەی ئەسڵی و کارتۆن بە بێ کێشە.')
    : (doc.businessInfo?.invoiceTermsEn || 'Items can be replaced within 3 days with original receipt and box in pristine condition.');

  // Document Title & Badge
  const getDocTitle = () => {
    switch (doc.documentType) {
      case 'debt_invoice':
        return isKu ? 'پسوڵەی فرۆشتنی قەرز' : 'Credit / Debt Sale Invoice';
      case 'installment_invoice':
        return isKu ? 'پسوڵە و گرێبەستی قیست' : 'Installment Agreement & Invoice';
      case 'debt_receipt':
        return isKu ? 'پسوڵەی وەرگرتنی پارەی قەرز' : 'Debt Payment Voucher';
      case 'installment_receipt':
        return isKu ? 'پسوڵەی پارەدانی قیست' : 'Installment Payment Receipt';
      case 'customer_statement':
        return isKu ? 'کەشفی هەژماری کڕیار' : 'Customer Account Statement';
      case 'cash_invoice':
      default:
        return isKu ? 'پسوڵەی فرۆشتن' : 'Official Sales Invoice';
    }
  };

  const getStatusBadge = () => {
    const s = doc.status;
    if (s === 'paid') {
      return {
        label: isKu ? 'پارەدراوە (نەقد)' : 'Paid in Full',
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-300'
      };
    }
    if (s === 'overdue') {
      return {
        label: isKu ? 'دواکەوتوو (Overdue)' : 'Overdue',
        bg: 'bg-rose-50 text-rose-800 border-rose-300'
      };
    }
    if (s === 'partially_paid') {
      return {
        label: isKu ? 'بەشەکی دراوە' : 'Partially Paid',
        bg: 'bg-amber-50 text-amber-800 border-amber-300'
      };
    }
    if (s === 'installment') {
      return {
        label: isKu ? 'قیستی چالاک' : 'Active Installment',
        bg: 'bg-indigo-50 text-indigo-800 border-indigo-300'
      };
    }
    if (s === 'debt') {
      return {
        label: isKu ? 'قەرز' : 'Outstanding Debt',
        bg: 'bg-amber-50 text-amber-800 border-amber-300'
      };
    }
    return {
      label: isKu ? 'تەواوکراو' : 'Completed',
      bg: 'bg-indigo-100 text-indigo-950 border-indigo-100'
    };
  };

  const statusBadge = getStatusBadge();
  const qrPayload = generateInvoiceVerificationPayload(doc);

  // -------------------------------------------------------------
  // RENDER: THERMAL RECEIPT (80mm) COMPACT SLIP
  // -------------------------------------------------------------
  if (isThermal) {
    return (
      <div 
        id={id}
        dir={isRtl ? 'rtl' : 'ltr'}
        className={`w-full max-w-[360px] mx-auto bg-white text-slate-900 font-sans p-4 shadow-md text-xs leading-relaxed print:p-0 print:shadow-none print:max-w-none print:w-full ${className}`}
      >
        {/* Thermal Header */}
        <div className="text-center pb-3 border-b border-dashed border-slate-400">
          {storeLogo && (
            <img src={storeLogo} alt="Logo" className="w-12 h-12 mx-auto mb-1.5 object-contain" />
          )}
          <h1 className="text-base font-black uppercase tracking-tight text-slate-950">
            {storeName}
          </h1>
          <p className="text-[10px] text-indigo-700 mt-0.5">{storeTagline}</p>
          <p className="text-[10px] text-indigo-500 font-mono mt-0.5" dir="ltr">{storePhone}</p>
          
          <div className="mt-2 inline-block px-2.5 py-0.5 border border-slate-900 text-slate-950 font-bold uppercase tracking-wider text-[10px]">
            {getDocTitle()}
          </div>
        </div>

        {/* Thermal Meta */}
        <div className="py-2 border-b border-dashed border-indigo-100 space-y-1 text-[11px]">
          <div className="flex justify-between items-center">
            <span className="text-indigo-500">{isKu ? 'ژمارە:' : 'Doc No:'}</span>
            <span className="font-mono font-bold text-slate-900" dir="ltr">{doc.documentNumber}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-indigo-500">{isKu ? 'بەروار:' : 'Date:'}</span>
            <span className="font-mono text-indigo-950" dir="ltr">{doc.issueDate} {doc.issueTime || ''}</span>
          </div>
          {doc.customer?.name && (
            <div className="flex justify-between items-center">
              <span className="text-indigo-500">{isKu ? 'کڕیار:' : 'Customer:'}</span>
              <span className="font-bold text-slate-900">{doc.customer.name}</span>
            </div>
          )}
          {doc.customer?.phone && (
            <div className="flex justify-between items-center">
              <span className="text-indigo-500">{isKu ? 'مۆبایل:' : 'Phone:'}</span>
              <span className="font-mono text-indigo-950" dir="ltr">{doc.customer.phone}</span>
            </div>
          )}
        </div>

        {/* Thermal Items */}
        {Array.isArray(doc.items) && doc.items.length > 0 && (
          <div className="py-2 border-b border-dashed border-indigo-100">
            <div className="flex justify-between text-[10px] font-bold text-indigo-500 uppercase pb-1 mb-1 border-b border-indigo-50">
              <span>{isKu ? 'کاڵا' : 'Item'}</span>
              <span>{isKu ? 'کۆ' : 'Total'}</span>
            </div>
            <div className="space-y-1.5">
              {(doc.items || []).map((item, idx) => (
                <div key={item.id || idx} className="text-[11px]">
                  <div className="flex justify-between font-semibold text-slate-900">
                    <span>{item.name} {item.quantity > 1 ? `x${item.quantity}` : ''}</span>
                    <span className="font-mono font-bold" dir="ltr">{formatCurrency(item.total, cur)}</span>
                  </div>
                  {item.imei && (
                    <div className="text-[10px] text-indigo-700 font-mono tracking-wider" dir="ltr">
                      IMEI: {item.imei}
                    </div>
                  )}
                  {item.discount && item.discount > 0 ? (
                    <div className="text-[10px] text-emerald-700">
                      {isKu ? 'داشکاندن:' : 'Disc:'} -{formatCurrency(item.discount, cur)}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Thermal Totals */}
        <div className="py-2 border-b border-dashed border-slate-400 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-700">
            <span>{isKu ? 'کۆی گشتی:' : 'Grand Total:'}</span>
            <span className="font-mono font-bold text-slate-900" dir="ltr">{formatCurrency(doc.grandTotal, cur)}</span>
          </div>
          <div className="flex justify-between text-emerald-800 font-semibold">
            <span>{isKu ? 'بڕی پارەی دراو:' : 'Paid Amount:'}</span>
            <span className="font-mono" dir="ltr">{formatCurrency(doc.paidAmount, cur)}</span>
          </div>
          {doc.remainingBalance > 0 && (
            <div className="flex justify-between text-rose-800 font-black text-sm pt-1 border-t border-indigo-50">
              <span>{isKu ? 'قەرز / باڵانسی ماوە:' : 'Remaining Balance:'}</span>
              <span className="font-mono" dir="ltr">{formatCurrency(doc.remainingBalance, cur)}</span>
            </div>
          )}
        </div>

        {/* Thermal Installment summary if present */}
        {doc.installmentDetails && (
          <div className="py-2 border-b border-dashed border-indigo-100 text-[10px] space-y-0.5">
            <div className="font-bold text-slate-900">{isKu ? 'پوختەی قیست:' : 'Installment Plan:'}</div>
            <div className="flex justify-between">
              <span>{isKu ? 'قیستی مانگانە:' : 'Monthly Rate:'}</span>
              <span className="font-mono font-bold" dir="ltr">{formatCurrency(doc.installmentDetails.monthlyPayment, cur)}</span>
            </div>
            <div className="flex justify-between">
              <span>{isKu ? 'ماوە:' : 'Duration:'}</span>
              <span>{doc.installmentDetails.durationMonths} {isKu ? 'مانگ' : 'Months'}</span>
            </div>
            <div className="flex justify-between">
              <span>{isKu ? 'یەکەم بەروار:' : 'First Due:'}</span>
              <span className="font-mono" dir="ltr">{doc.installmentDetails.firstDueDate}</span>
            </div>
          </div>
        )}

        {/* Thermal QR & Footer */}
        <div className="pt-3 text-center space-y-2">
          {showQR && (
            <div className="flex justify-center">
              <QRCodeSVG value={qrPayload} size={72} level="M" />
            </div>
          )}
          <p className="text-[10px] text-indigo-700 leading-tight">{footerMessage}</p>
          <p className="text-[9px] text-indigo-300 font-mono tracking-widest uppercase">
            NALI POS • COMMERCIAL SYSTEM
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: FULL MASTER A4 FINANCIAL INVOICE / CONTRACT / STATEMENT
  // -------------------------------------------------------------
  return (
    <div 
      id={id}
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`w-full max-w-[840px] mx-auto bg-white text-slate-900 font-sans p-8 sm:p-10 md:p-12 shadow-2xl rounded-xl border border-indigo-50 text-xs leading-normal print:p-0 print:shadow-none print:border-none print:rounded-none print:max-w-none print:w-full ${className}`}
    >
      {/* 1. TOP HEADER & BRANDING */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b-4 border-indigo-600">
        
        {/* Business Info Left/Right depending on RTL */}
        <div className="flex items-center gap-4">
          {storeLogo ? (
            <div className="w-16 h-16 rounded-xl border border-indigo-50 bg-slate-50 flex items-center justify-center p-1 overflow-hidden shrink-0">
              <img src={storeLogo} alt="Store Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-xl bg-slate-950 text-white flex items-center justify-center font-black text-xl tracking-tighter shrink-0">
              NM
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black text-slate-950 tracking-tight flex items-center gap-2">
              <span>{storeName}</span>
            </h1>
            <p className="text-[11px] text-indigo-700 font-medium mt-0.5">{storeTagline}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-indigo-500 mt-1">
              <span className="flex items-center gap-1 font-mono" dir="ltr">
                <Phone className="w-3 h-3 text-indigo-300" />
                {storePhone}
              </span>
              {storePhoneSecondary && (
                <span className="flex items-center gap-1 font-mono" dir="ltr">
                  • {storePhoneSecondary}
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-indigo-300" />
                {storeAddress}
              </span>
            </div>
          </div>
        </div>

        {/* Document Title & Stamp */}
        <div className={`flex flex-col sm:items-end ${isRtl ? 'sm:text-left' : 'sm:text-right'} w-full sm:w-auto`}>
          <div className="text-lg font-black tracking-tight text-slate-950 uppercase">
            {getDocTitle()}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusBadge.bg}`}>
              <CheckCircle2 className="w-3 h-3" />
              <span>{statusBadge.label}</span>
            </span>
            {doc.paymentMethod && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-100 text-slate-700 border border-indigo-100">
                {doc.paymentMethod}
              </span>
            )}
          </div>
          <div className="text-[11px] font-mono text-indigo-500 mt-1" dir="ltr">
            {isKu ? 'کۆدی سەرەکی:' : 'Ref:'} #{doc.documentNumber}
          </div>
        </div>
      </div>

      {/* 2. INVOICE META & CUSTOMER BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-5 border-b border-indigo-50">
        
        {/* Document Identification */}
        <div className="bg-indigo-50/50 p-4 rounded-xl ring-1 ring-indigo-900/5.5 rounded-xl border border-indigo-50/80 space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5 text-indigo-700" />
            <span>{isKu ? 'زانیاری پسوڵە' : 'Invoice Details'}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-indigo-500">{isKu ? 'ژمارەی پسوڵە:' : 'Invoice No:'}</span>
            <span className="font-mono font-bold text-slate-900" dir="ltr">{doc.documentNumber}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-indigo-500">{isKu ? 'بەروار:' : 'Issue Date:'}</span>
            <span className="font-mono font-medium text-indigo-950" dir="ltr">{doc.issueDate}</span>
          </div>
          {doc.issueTime && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-indigo-500">{isKu ? 'کاتژمێر:' : 'Time:'}</span>
              <span className="font-mono text-slate-700" dir="ltr">{doc.issueTime}</span>
            </div>
          )}
          {doc.sellerName && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-indigo-500">{isKu ? 'فرۆشیار:' : 'Cashier:'}</span>
              <span className="font-medium text-indigo-950">{doc.sellerName}</span>
            </div>
          )}
        </div>

        {/* Customer Information */}
        <div className="bg-indigo-50/50 p-4 rounded-xl ring-1 ring-indigo-900/5.5 rounded-xl border border-indigo-50/80 space-y-1.5 md:col-span-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-700" />
              <span>{isKu ? 'زانیاری کڕیار' : 'Customer Information'}</span>
            </span>
            {doc.customer?.idCard && (
              <span className="font-mono text-[10px] text-indigo-700" dir="ltr">
                ID: {doc.customer.idCard}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-indigo-500">{isKu ? 'ناوی کڕیار:' : 'Name:'}</span>
              <span className="font-bold text-slate-900">{doc.customer?.name || (isKu ? 'کڕیاری گشتی' : 'Walk-in Customer')}</span>
            </div>

            {doc.customer?.phone && (
              <div className="flex justify-between items-center">
                <span className="text-indigo-500">{isKu ? 'ژمارەی مۆبایل:' : 'Phone:'}</span>
                <span className="font-mono font-bold text-indigo-950" dir="ltr">{doc.customer.phone}</span>
              </div>
            )}

            {doc.customer?.address && (
              <div className="flex justify-between items-center sm:col-span-2">
                <span className="text-indigo-500">{isKu ? 'ناونیشان:' : 'Address:'}</span>
                <span className="text-indigo-950">{doc.customer.address}</span>
              </div>
            )}

            {doc.customer?.guarantorName && (
              <div className="flex justify-between items-center sm:col-span-2 pt-1 border-t border-indigo-50/60 text-[11px]">
                <span className="text-indigo-500">{isKu ? 'کەفیل (زامن):' : 'Guarantor:'}</span>
                <span className="font-semibold text-indigo-950">
                  {doc.customer.guarantorName} {doc.customer.guarantorPhone ? `(${doc.customer.guarantorPhone})` : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. MOBILE DEVICES & PRODUCTS TABLE (Adaptive) */}
      {Array.isArray(doc.items) && doc.items.length > 0 && (
        <div className="py-5 border-b border-indigo-50">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-indigo-700" />
              <span>{isKu ? 'لیستی ئامێر و کەلوپەلی فرۆشراو' : 'Purchased Items & Devices'}</span>
            </span>
            <span className="text-[10px] text-indigo-500 font-normal">
              {(doc.items || []).length} {isKu ? 'بڕگە' : 'Item(s)'}
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-indigo-50">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-indigo-100 text-slate-700 font-bold border-b border-indigo-50 text-[11px]">
                  <th className="py-2.5 px-3 w-8 text-center">#</th>
                  <th className="py-2.5 px-3">{isKu ? 'ناوى کاڵا / ئامێر' : 'Item / Device Description'}</th>
                  <th className="py-2.5 px-3">{isKu ? 'زانیاری و ناسنامە' : 'Specs / IMEI / Barcode'}</th>
                  <th className="py-2.5 px-3 text-center">{isKu ? 'ژمارە' : 'Qty'}</th>
                  <th className="py-2.5 px-3 text-right">{isKu ? 'نرخی تاک' : 'Unit Price'}</th>
                  <th className="py-2.5 px-3 text-right">{isKu ? 'داشکاندن' : 'Disc'}</th>
                  <th className="py-2.5 px-3 text-right">{isKu ? 'کۆی گشتی' : 'Total'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doc.items.map((item, idx) => {
                  const isMobile = item.type === 'mobile' || !!item.imei;
                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-indigo-300 text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        {item.brand && (
                          <span className="text-[10px] text-indigo-500 font-medium">
                            {item.brand} {item.model ? `• ${item.model}` : ''}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {item.imei ? (
                          <div className="inline-block px-2 py-0.5 bg-indigo-100 rounded border border-indigo-100 font-mono text-[10px] font-bold text-slate-900 tracking-wider" dir="ltr">
                            IMEI: {item.imei}
                          </div>
                        ) : item.barcode ? (
                          <div className="font-mono text-[10px] text-indigo-700" dir="ltr">
                            BAR: {item.barcode}
                          </div>
                        ) : (
                          <span className="text-indigo-300 text-[10px]">-</span>
                        )}
                        {(item.storage || item.ram || item.color || item.condition) && (
                          <div className="text-[10px] text-indigo-500 mt-0.5">
                            {[item.storage, item.ram, item.color, item.condition].filter(Boolean).join(' • ')}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-950">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700" dir="ltr">
                        {formatCurrency(item.unitPrice, item.currency || cur)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700 text-[11px]" dir="ltr">
                        {item.discount && item.discount > 0 ? `-${formatCurrency(item.discount, item.currency || cur)}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-950" dir="ltr">
                        {formatCurrency(item.total, item.currency || cur)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. INSTALLMENT DEDICATED SCHEDULE & AGREEMENT SECTION */}
      {doc.installmentDetails && (
        <div className="py-5 border-b-4 border-indigo-600">
          {/* Executive Installment Metric Bento Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="p-3 bg-indigo-950 text-white rounded-xl">
              <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider block">
                {isKu ? 'کۆی گشتی بە سوود' : 'Total (With Fee)'}
              </span>
              <div className="font-mono text-base font-black mt-1" dir="ltr">
                {formatCurrency(doc.grandTotal, cur)}
              </div>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl">
              <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
                {isKu ? 'پێشەکی دراو' : 'Down Payment'}
              </span>
              <div className="font-mono text-base font-black text-emerald-900 mt-1" dir="ltr">
                {formatCurrency(doc.paidAmount, cur)}
              </div>
            </div>
            <div className="p-3 bg-indigo-50 border border-indigo-300 text-indigo-950 rounded-xl">
              <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider block">
                {isKu ? 'قیستی مانگانە' : 'Monthly Payment'}
              </span>
              <div className="font-mono text-base font-black text-indigo-900 mt-1" dir="ltr">
                {formatCurrency(doc.installmentDetails.monthlyPayment, cur)}
              </div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-300 text-amber-950 rounded-xl">
              <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">
                {isKu ? 'ماوە و یەکەم بەروار' : 'Duration & 1st Due'}
              </span>
              <div className="text-xs font-bold text-amber-900 mt-1">
                {doc.installmentDetails.durationMonths} {isKu ? 'مانگ' : 'Mo'} • <span className="font-mono text-[11px]" dir="ltr">{doc.installmentDetails.firstDueDate}</span>
              </div>
            </div>
          </div>

          {/* Visual Progress Bar */}
          {doc.installmentDetails.totalAmount > 0 && (() => {
            const ins = doc.installmentDetails;
            // The customer perceives progress based on the installments themselves, not the down payment.
            const financedPaid = Math.max(0, ins.paidAmount - ins.downPayment);
            const progressPercent = ins.financedAmount > 0 
              ? Math.round((financedPaid / ins.financedAmount) * 100) 
              : 100;
              
            return (
              <div className="mb-5 bg-slate-50 p-4 rounded-xl border border-indigo-50 shadow-sm relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-50 rounded-full blur-2xl opacity-60"></div>
                
                <div className="flex justify-between items-end mb-3 relative z-10">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 block mb-0.5">
                      {isKu ? 'بەرەوپێشچوونی قیستەکان' : 'Installment Progress'}
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-indigo-700 font-mono tracking-tight">
                        {progressPercent}%
                      </span>
                      <span className="text-[11px] font-semibold text-indigo-500">
                        ({ins.paidSchedulesCount} {isKu ? 'لە' : 'of'} {ins.totalSchedulesCount} {isKu ? 'مانگ' : 'Months'})
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 block mb-0.5">
                      {isKu ? 'قەرزی ماوە' : 'Remaining Balance'}
                    </span>
                    <span className="text-lg font-black text-rose-600 font-mono tracking-tight" dir="ltr">
                      {formatCurrency(ins.balanceRemaining, cur)}
                    </span>
                  </div>
                </div>
                
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden flex relative z-10 shadow-inner">
                  <div 
                    className="bg-indigo-600 h-full rounded-r-full transition-all duration-700 relative"
                    style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 w-full h-full" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)', backgroundSize: '16px 16px' }}></div>
                  </div>
                </div>
                
                <div className="flex justify-between mt-2 text-[10px] font-bold text-indigo-500 font-mono uppercase tracking-wider relative z-10">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                    {isKu ? 'قیستی دراو:' : 'PAID:'} <span className="text-indigo-700">{formatCurrency(financedPaid, cur)}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    {isKu ? 'کۆی قیستەکان:' : 'FINANCED TOTAL:'} <span className="text-slate-700">{formatCurrency(ins.financedAmount, cur)}</span>
                    <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                  </span>
                </div>
              </div>
            );
          })()}

          <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>{isKu ? 'خشتە و پلانى قیستى مانگانە' : 'Monthly Installment Schedule & Ledger'}</span>
            </span>
            <span className="font-mono text-[10px] text-indigo-700 font-bold">
              {doc.installmentDetails.durationMonths} {isKu ? 'مانگ' : 'Months'} • {formatCurrency(doc.installmentDetails.monthlyPayment, cur)} / {isKu ? 'مانگ' : 'Mo'}
            </span>
          </div>

          {/* Schedule Table */}
          <div className="overflow-x-auto rounded-lg border-2 border-indigo-100">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-indigo-950 text-white font-bold border-b border-indigo-900 text-[11px]">
                  <th className="py-2.5 px-3 w-10 text-center">{isKu ? 'مانگ' : 'Mo'}</th>
                  <th className="py-2.5 px-3">{isKu ? 'بەرواری دانەوە' : 'Due Date'}</th>
                  <th className="py-2.5 px-3 text-right">{isKu ? 'بڕی داواکراو' : 'Amount Due'}</th>
                  <th className="py-2.5 px-3 text-right">{isKu ? 'بڕی دراو' : 'Paid Amount'}</th>
                  <th className="py-2.5 px-3 text-center">{isKu ? 'دۆخ' : 'Status'}</th>
                  <th className="py-2.5 px-3">{isKu ? 'وەسڵ / تێبینی' : 'Receipt / Notes'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {doc.installmentDetails.schedules.map((s, idx) => {
                  const isPaid = s.status === 'paid';
                  const isOverdue = s.status === 'overdue';
                  return (
                    <tr key={idx} className={isPaid ? 'bg-emerald-50/50' : isOverdue ? 'bg-rose-50/60 font-semibold' : 'hover:bg-slate-50'}>
                      <td className="py-2 px-3 text-center font-bold text-slate-900">
                        {s.monthNumber}
                      </td>
                      <td className="py-2 px-3 font-mono text-indigo-950 font-medium" dir="ltr">
                        {s.dueDate}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-black text-slate-950" dir="ltr">
                        {formatCurrency(s.amountDue, cur)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-800 font-bold" dir="ltr">
                        {s.amountPaid > 0 ? formatCurrency(s.amountPaid, cur) : '-'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                          isPaid ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                          isOverdue ? 'bg-rose-100 text-rose-900 border-rose-300 animate-pulse' :
                          'bg-indigo-100 text-slate-700 border-indigo-100'
                        }`}>
                          {isPaid ? (isKu ? 'دراوە' : 'PAID') :
                           isOverdue ? (isKu ? 'دواکەوتوو' : 'OVERDUE') :
                           (isKu ? 'داهاتوو' : 'DUE')}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[10px] font-mono text-indigo-700">
                        {s.receiptNumber || s.paidDate || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. CUSTOMER STATEMENT TRANSACTIONS TABLE */}
      {doc.statementDetails && (
        <div className="py-5 border-b border-indigo-50">
          <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-950 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-700" />
              <span>{isKu ? 'تۆماری مێژووی جوڵەی دارایی کڕیار' : 'Account Financial Ledger'}</span>
            </span>
            <span className="text-[10px] text-indigo-500 font-mono" dir="ltr">
              {doc.statementDetails.transactions?.length || 0} Transactions
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-indigo-50">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-indigo-100 text-slate-700 font-bold border-b border-indigo-50 text-[11px]">
                  <th className="py-2 px-3">{isKu ? 'بەروار' : 'Date'}</th>
                  <th className="py-2 px-3">{isKu ? 'ژ. پسوڵە / وەسڵ' : 'Ref / Invoice'}</th>
                  <th className="py-2 px-3">{isKu ? 'شیکردنەوەی مامەڵە' : 'Description'}</th>
                  <th className="py-2 px-3 text-right">{isKu ? 'قەرز (Debit)' : 'Debit (+)'}</th>
                  <th className="py-2 px-3 text-right">{isKu ? 'پارەدان (Credit)' : 'Credit (-)'}</th>
                  <th className="py-2 px-3 text-right">{isKu ? 'باڵانسی ماوە' : 'Balance'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doc.statementDetails.transactions.map((tx, idx) => (
                  <tr key={tx.id || idx} className="hover:bg-slate-50/70">
                    <td className="py-2 px-3 font-mono text-slate-700" dir="ltr">{tx.date}</td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900" dir="ltr">{tx.referenceNo}</td>
                    <td className="py-2 px-3 text-indigo-950">{tx.description}</td>
                    <td className="py-2 px-3 text-right font-mono text-rose-800 font-semibold" dir="ltr">
                      {tx.debit > 0 ? formatCurrency(tx.debit, tx.currency || cur) : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-800 font-semibold" dir="ltr">
                      {tx.credit > 0 ? formatCurrency(tx.credit, tx.currency || cur) : '-'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-950" dir="ltr">
                      {formatCurrency(tx.runningBalance, tx.currency || cur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. FINANCIAL TOTALS & PROMINENT REMAINING BALANCE CALLOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b-4 border-indigo-600">
        
        {/* Left Side: Notes, Warranty Terms & QR Code */}
        <div className="flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            {doc.notes && (
              <div className="p-3 bg-slate-50 rounded-xl border border-indigo-50 text-xs">
                <span className="font-bold text-slate-700 block mb-0.5">{isKu ? 'تێبینی:' : 'Notes:'}</span>
                <p className="text-indigo-700">{doc.notes}</p>
              </div>
            )}
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
              <span className="font-bold block mb-0.5 flex items-center gap-1 text-amber-950">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                {isKu ? 'مەرج و گرەنتی:' : 'Warranty & Return Policy:'}
              </span>
              <p className="text-amber-800">{terms}</p>
            </div>
          </div>

          {/* Verification QR Box */}
          {showQR && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-indigo-50">
              <QRCodeSVG value={qrPayload} size={64} level="M" />
              <div>
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isKu ? 'کۆدی دڵنیابوونەوەی سیستم' : 'Official Verification QR'}</span>
                </div>
                <p className="text-[10px] text-indigo-500 mt-0.5">
                  {isKu ? 'سکانی ئەم کۆدە بکە بۆ دڵنیابوونەوە لە ڕەسەنایەتی پسوڵە' : 'Scan to verify document validity with Nali Mobile'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Financial Calculation Breakdown & Huge Highlighted Remaining Balance */}
        <div className="flex flex-col justify-between space-y-3 bg-slate-50 p-5 rounded-2xl border border-indigo-50">
          
          <div className="space-y-2 text-xs">
            {/* Subtotal */}
            <div className="flex justify-between items-center text-indigo-700">
              <span>{isKu ? 'کۆی سەرەتایی (بێ داشکاندن):' : 'Subtotal:'}</span>
              <span className="font-mono font-medium text-slate-900" dir="ltr">{formatCurrency(doc.subtotal, cur)}</span>
            </div>

            {/* Discount */}
            {doc.discount > 0 && (
              <div className="flex justify-between items-center text-emerald-700 font-medium">
                <span>{isKu ? 'داشکاندن (Discount):' : 'Discount:'}</span>
                <span className="font-mono" dir="ltr">-{formatCurrency(doc.discount, cur)}</span>
              </div>
            )}

            {/* Additional Fee for Installments */}
            {doc.installmentDetails && doc.installmentDetails.additionalFee > 0 && (
              <div className="flex justify-between items-center text-indigo-700">
                <span>{isKu ? 'سوود و خزمەتگوزاری قیست:' : 'Installment Financing Fee:'}</span>
                <span className="font-mono font-medium" dir="ltr">+{formatCurrency(doc.installmentDetails.additionalFee, cur)}</span>
              </div>
            )}

            {/* Tax */}
            {doc.tax > 0 && (
              <div className="flex justify-between items-center text-indigo-700">
                <span>{isKu ? 'باج:' : 'Tax:'}</span>
                <span className="font-mono text-slate-900" dir="ltr">+{formatCurrency(doc.tax, cur)}</span>
              </div>
            )}

            {/* Grand Total */}
            <div className="flex justify-between items-center pt-2 border-t border-indigo-50 text-sm font-bold text-slate-950">
              <span>{isKu ? 'کۆی گشتی داواکراو:' : 'Grand Total:'}</span>
              <div className="text-right" dir="ltr">
                <span className="font-mono text-base">{formatCurrency(doc.grandTotal, cur)}</span>
                {showDual && (
                  <div className="text-[10px] text-indigo-500 font-mono font-normal">
                    ≈ {cur === 'USD' ? dual.secondary : dual.primary}
                  </div>
                )}
              </div>
            </div>

            {/* Paid Amount */}
            <div className="flex justify-between items-center pt-1 text-emerald-800 font-semibold text-xs">
              <span>{isKu ? 'بڕی پارەی وەرگیراو (دراو):' : 'Amount Paid:'}</span>
              <span className="font-mono text-sm" dir="ltr">{formatCurrency(doc.paidAmount, cur)}</span>
            </div>
          </div>

          {/* THE PROMINENT REMAINING BALANCE CALLOUT */}
          <div className={`p-4 rounded-xl border-2 transition-all ${
            doc.remainingBalance > 0 
              ? 'bg-rose-50 border-rose-400 text-rose-950' 
              : 'bg-emerald-50 border-emerald-400 text-emerald-950'
          }`}>
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[11px] uppercase font-black tracking-wider block">
                  {doc.remainingBalance > 0 
                    ? (isKu ? '🔴 قەرز / باڵانسی ماوە' : '🔴 REMAINING BALANCE DUE')
                    : (isKu ? '✅ هەژمار یەکلایی کراوەتەوە' : '✅ SETTLED IN FULL')
                  }
                </span>
                <span className="text-[10px] opacity-80">
                  {doc.documentType === 'debt_invoice' || doc.documentType === 'debt_receipt' 
                    ? (isKu ? 'قەرزی ماوەی کڕیار' : 'Outstanding customer debt') 
                    : doc.documentType === 'installment_invoice' || doc.documentType === 'installment_receipt'
                      ? (isKu ? 'کۆی قیستە نەدراوەکان' : 'Remaining installment total')
                      : (isKu ? 'باڵانسی ماوە' : 'Account balance')}
                </span>
              </div>
              <div className="text-right" dir="ltr">
                <span className="font-mono text-xl sm:text-2xl font-black">
                  {formatCurrency(doc.remainingBalance, cur)}
                </span>
                {showDual && doc.remainingBalance > 0 && (
                  <div className="text-[11px] opacity-75 font-mono">
                    ≈ {cur === 'USD' ? dualRemaining.secondary : dualRemaining.primary}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 7. OFFICIAL LEGAL UNDERTAKING & CONTRACTUAL GUARANTEE (For Installments and Debt) */}
      {(doc.documentType === 'installment_invoice' || doc.documentType === 'debt_invoice') && (
        <div className="py-4 border-b border-indigo-100 bg-slate-50/80 p-4 rounded-xl border">
          <div className="flex items-center gap-2 mb-2 text-slate-900 font-black text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            <span>{isKu ? 'بەڵێننامەی فەرمی کڕیار و پەیماننامەی یاسایی' : 'Official Legal Undertaking & Binding Obligation'}</span>
          </div>
          <p className="text-[11px] text-slate-700 leading-relaxed">
            {isKu
              ? 'ئەم بەڵگەنامەیە وەک گرێبەستێکی فەرمی دادەنرێت لە نێوان کڕیار، کەفیل (زامن) و فرۆشگا. کڕیار و کەفیل بە واژوو و جێ پەنجەی خۆیان بەڵێن دەدەن تەواوی بڕە پارەی ماوە لە بەرواری دیاریکراودا بێ دواکەوتن بدەنەوە. لە کاتی پابەندنەبوون، فرۆشگا مافی تەواوی هەیە ڕێکاری یاسایی و دادوەری بگرێتەبەر.'
              : 'This document constitutes a binding commercial agreement between the Customer, Guarantor, and Store. By providing signature and thumbprint below, the parties acknowledge full joint legal liability to repay all outstanding balances strictly on schedule.'}
          </p>
        </div>
      )}

      {/* 8. SIGNATURES, FINGERPRINTS & STORE AUTHENTICATION */}
      <div className="pt-6 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs">
          
          {/* Customer / Debtor */}
          <div className="p-3 bg-slate-50 rounded-xl border border-indigo-50 flex flex-col justify-between min-h-[140px]">
            <div>
              <span className="font-bold text-slate-900 block text-[11px]">
                {isKu ? 'واژووی کڕیار' : 'Customer Signature'}
              </span>
              <span className="text-[10px] text-indigo-500 block truncate">
                {doc.customer?.name || (isKu ? 'کڕیار' : 'Customer')}
              </span>
            </div>
            <div className="border-b-2 border-dashed border-slate-400 w-4/5 mx-auto my-2"></div>
            <div className="w-10 h-12 border-2 border-indigo-100 rounded mx-auto flex items-center justify-center text-[9px] text-indigo-300 font-mono">
              {isKu ? 'جێ پەنجە' : 'Thumb'}
            </div>
          </div>

          {/* Guarantor / Surety */}
          <div className="p-3 bg-slate-50 rounded-xl border border-indigo-50 flex flex-col justify-between min-h-[140px]">
            <div>
              <span className="font-bold text-slate-900 block text-[11px]">
                {isKu ? 'واژووی کەفیل (زامن)' : 'Guarantor Signature'}
              </span>
              <span className="text-[10px] text-indigo-500 block truncate">
                {doc.customer?.guarantorName || (isKu ? 'کەفیل' : 'Guarantor')}
              </span>
            </div>
            <div className="border-b-2 border-dashed border-slate-400 w-4/5 mx-auto my-2"></div>
            <div className="w-10 h-12 border-2 border-indigo-100 rounded mx-auto flex items-center justify-center text-[9px] text-indigo-300 font-mono">
              {isKu ? 'جێ پەنجە' : 'Thumb'}
            </div>
          </div>

          {/* Store / Cashier */}
          <div className="p-3 bg-slate-50 rounded-xl border border-indigo-50 flex flex-col justify-between min-h-[140px]">
            <div>
              <span className="font-bold text-slate-900 block text-[11px]">
                {isKu ? 'واژووی فرۆشیار' : 'Seller Signature'}
              </span>
              <span className="text-[10px] text-indigo-500 block">
                {doc.sellerName || 'Nali Mobile'}
              </span>
            </div>
            <div className="border-b-2 border-dashed border-slate-400 w-4/5 mx-auto my-2"></div>
            <span className="text-[10px] text-indigo-500 font-mono" dir="ltr">
              {doc.issueDate}
            </span>
          </div>

          {/* Official Store Seal */}
          <div className="p-3 bg-indigo-950 text-white rounded-xl border border-indigo-900 flex flex-col justify-between min-h-[140px] items-center">
            <span className="font-bold block text-[10px] uppercase tracking-wider text-indigo-200">
              {isKu ? 'مۆری فەرمی کۆمپانیا' : 'Official Seal'}
            </span>
            <div className="w-14 h-14 rounded-full border-2 border-amber-400/80 flex flex-col items-center justify-center p-1 text-center bg-indigo-900/60 shadow-inner">
              <span className="text-[8px] font-black text-amber-300 uppercase tracking-widest leading-none">NALI</span>
              <span className="text-[7px] text-indigo-200 font-mono mt-0.5">VERIFIED</span>
              <span className="text-[6px] text-amber-400 font-mono">★★★★★</span>
            </div>
            <span className="text-[9px] text-indigo-300 font-mono">
              AUTHENTICATED
            </span>
          </div>

        </div>

        {/* Footer Text */}
        <div className="text-center pt-4 border-t border-indigo-50 text-indigo-500 space-y-1">
          <p className="text-xs font-semibold text-slate-700">{footerMessage}</p>
          <p className="text-[10px] text-indigo-300 font-mono tracking-wider">
            Nali Mobile Management Platform • Printed {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

    </div>
  );
}
