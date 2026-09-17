import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Award, Phone, MapPin, Edit3 } from 'lucide-react';
import { 
  InvoiceDocument, 
  InvoiceItem, 
  InstallmentScheduleDocItem
} from '../../types/invoice';
import { formatCurrency, formatDualPrice } from '../../lib/utils';
import { isolateBidi, generateInvoiceVerificationPayload } from '../../lib/invoiceUtils';
import { useDesignSystem } from '../../context/DesignContext';

export interface SinglePageInstallmentInvoiceProps {
  document: InvoiceDocument;
  language?: 'ku' | 'en';
  id?: string;
  className?: string;
  onEditStoreInfo?: () => void;
}

export default function SinglePageInstallmentInvoice({
  document: doc,
  language = 'en',
  id = 'invoice-capture-area',
  className = '',
  onEditStoreInfo
}: SinglePageInstallmentInvoiceProps) {
  const { settings } = useDesignSystem();
  const isKu = language === 'ku';
  const isRtl = isKu;

  const cur = doc.currency || 'IQD';
  const exchangeRate = doc.exchangeRate || 1500;
  const isInstallment = doc.documentType === 'installment_invoice' || doc.documentType === 'installment_receipt' || !!doc.installmentDetails;
  const isDebt = doc.documentType === 'debt_invoice' || doc.documentType === 'debt_receipt' || !!doc.debtDetails;

  const ins = doc.installmentDetails;
  const debt = doc.debtDetails;

  // Dual Currency calculations
  const dualRemaining = formatDualPrice(doc.remainingBalance, cur, exchangeRate);

  // Business Information with reactive cross-language fallbacks
  const info = doc.businessInfo || {};

  const customStoreName = isKu 
    ? (info.businessNameKu || info.businessNameEn || settings.businessNameKu || settings.businessNameEn)
    : (info.businessNameEn || info.businessNameKu || settings.businessNameEn || settings.businessNameKu);
  const storeName = customStoreName || (isKu ? 'نالی مۆبایل' : 'Nali Mobile');
  
  const customTagline = isKu
    ? (info.businessTaglineKu || info.businessTaglineEn || settings.businessTaglineKu || settings.businessTaglineEn)
    : (info.businessTaglineEn || info.businessTaglineKu || settings.businessTaglineEn || settings.businessTaglineKu);
  const storeTagline = customTagline || (isKu ? 'مۆبایل • ئێکسسواراتی ئەسڵی • قیست و خزمەتگوزاری' : 'Mobile Devices Genuine Accessories Installments & Services');
  
  const customAddress = isKu
    ? (info.businessAddressKu || info.businessAddressEn || settings.businessAddressKu || settings.businessAddressEn)
    : (info.businessAddressEn || info.businessAddressKu || settings.businessAddressEn || settings.businessAddressKu);
  const storeAddress = customAddress || (isKu ? 'هەولێر - شەقامی ١٠٠ مەتری / سلێمانی - شەقامی سالم' : 'Erbil - 100M Road / Sulaymaniyah - Salim Street');

  const storePhone1 = info.businessPhone || settings.businessPhone || '+964 750 123 4567';
  const storePhone2 = info.businessPhoneSecondary || settings.businessPhoneSecondary || '+964 770 987 6543';

  // Compute initials or store logo
  const logoUrl = info.logoUrl || settings.customLogoUrl || '/nali-logo.png';
  const storeInitials = storeName
    ? storeName.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    : 'NM';

  // Title calculation
  const getDocTitle = () => {
    if (isInstallment) {
      return isKu ? 'ڕێککەوتننامە و پسوڵەی قیست' : 'INSTALLMENT AGREEMENT & INVOICE';
    }
    if (isDebt) {
      return isKu ? 'ڕێککەوتننامە و پسوڵەی قەرز' : 'DEBT AGREEMENT & INVOICE';
    }
    return isKu ? 'پسوڵەی فەرمی فرۆشتن' : 'COMMERCIAL SALES INVOICE';
  };

  // Status Badge calculation
  const getStatusBadge = () => {
    if (doc.remainingBalance <= 0) {
      return {
        label: isKu ? 'تەواوکراو / پارەدراو' : 'Paid in Full',
        classes: 'bg-emerald-100 text-emerald-800 border-emerald-300'
      };
    }
    if (doc.status === 'overdue') {
      return {
        label: isKu ? 'دواکەوتوو' : 'Overdue Balance',
        classes: 'bg-rose-100 text-rose-800 border-rose-300'
      };
    }
    if (isInstallment) {
      return {
        label: isKu ? 'قیستی چالاک' : 'Active Installment',
        classes: 'bg-emerald-100 text-emerald-800 border-emerald-300'
      };
    }
    if (isDebt) {
      return {
        label: isKu ? 'قەرزی چالاک' : 'Active Debt Account',
        classes: 'bg-amber-100 text-amber-800 border-amber-300'
      };
    }
    return {
      label: isKu ? 'چالاک' : 'Active Account',
      classes: 'bg-blue-100 text-blue-800 border-blue-300'
    };
  };

  const statusBadge = getStatusBadge();
  const qrPayload = generateInvoiceVerificationPayload(doc);

  // Schedules (if installment)
  const schedules: InstallmentScheduleDocItem[] = Array.isArray(ins?.schedules) && (ins.schedules?.length || 0) > 0
    ? ins.schedules
    : Array.from({ length: ins?.durationMonths || 6 }, (_, i) => {
        const monthNum = i + 1;
        const monthlyAmt = ins?.monthlyPayment || Math.round((doc.grandTotal - doc.paidAmount) / (ins?.durationMonths || 6));
        const isPaid = (doc.paidAmount >= monthlyAmt * monthNum);
        return {
          monthNumber: monthNum,
          dueDate: ins?.firstDueDate || doc.issueDate,
          amountDue: monthlyAmt,
          amountPaid: isPaid ? monthlyAmt : 0,
          status: (isPaid ? 'paid' : 'due') as 'paid' | 'due' | 'overdue' | 'partially_paid'
        };
      });

  const durationMonths = ins?.durationMonths || ((schedules?.length || 0) > 0 ? (schedules?.length || 0) : 6);
  const monthlyPaymentAmt = ins?.monthlyPayment || (durationMonths > 0 ? Math.round(doc.remainingBalance / durationMonths) : doc.remainingBalance);
  const paidMonthsCount = (schedules || []).filter(s => s.status === 'paid' || s.amountPaid >= s.amountDue).length;
  const progressPercent = durationMonths > 0 ? Math.round((paidMonthsCount / durationMonths) * 100) : 0;
  const firstDueDate = ins?.firstDueDate || debt?.dueDate || doc.issueDate;

  // Items fallback
  const items: InvoiceItem[] = Array.isArray(doc.items) && doc.items.length > 0
    ? doc.items
    : [
        {
          id: 'item-1',
          type: 'mobile',
          name: isInstallment ? 'Financed Mobile Smartphone / Package' : 'Commercial Device & Products',
          quantity: 1,
          unitPrice: doc.subtotal || doc.grandTotal,
          currency: cur,
          total: doc.subtotal || doc.grandTotal,
          barcode: '8806091234567',
          serialNumber: 'GENUINE-DEVICE'
        }
      ];

  const financingFee = ins?.additionalFee || (doc.grandTotal > (doc.subtotal || doc.grandTotal) ? doc.grandTotal - (doc.subtotal || doc.grandTotal) : 0);

  const printTimestamp = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  return (
    <div 
      id={id}
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`w-[794px] min-h-[1123px] max-h-[1123px] bg-white p-5 flex flex-col justify-between text-slate-800 text-[10.5px] leading-tight overflow-hidden select-none box-border mx-auto shadow-2xl print:shadow-none print:m-0 print:p-5 print:w-full print:max-h-none print:h-screen ${className}`}
      style={{
        boxSizing: 'border-box',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact'
      }}
    >
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & BRANDING BAR */}
      {/* ------------------------------------------------------------- */}
      <div className="border-b-2 border-slate-900 pb-2 mb-2">
        <div className="flex items-center justify-between gap-4">
          
          {/* Left: Store Logo Badge + Store Information */}
          <div className="flex items-center gap-2.5">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={storeName} 
                className="w-10 h-10 rounded-xl object-contain border border-slate-200 bg-white shadow-xs shrink-0" 
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-700 flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0 tracking-wider">
                {storeInitials}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-slate-950 tracking-tight">
                  {storeName}
                </h1>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-700 font-semibold uppercase tracking-wider">
                  Official Store
                </span>
              </div>
              <p className="text-[9.5px] text-slate-600 font-medium">
                {storeTagline}
              </p>
              
              {/* Premium Modern Store Contact & Location Strip */}
              <div 
                onClick={onEditStoreInfo}
                className={`mt-1 inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-[9px] font-medium transition-all ${
                  onEditStoreInfo 
                    ? 'cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40 hover:text-indigo-950 group shadow-xs' 
                    : ''
                }`}
                title={onEditStoreInfo ? (isKu ? 'کلیک بکە بۆ گۆڕینی مۆبایل و ناونیشان' : 'Click to change phone & location') : undefined}
              >
                <div className="flex items-center gap-1 shrink-0">
                  <Phone className="w-3 h-3 text-indigo-600 shrink-0" />
                  <span className="font-mono tracking-tight" dir="ltr">{storePhone1}</span>
                  {storePhone2 && storePhone2 !== storePhone1 && (
                    <>
                      <span className="text-slate-300">/</span>
                      <span className="font-mono tracking-tight" dir="ltr">{storePhone2}</span>
                    </>
                  )}
                </div>

                <span className="text-slate-300 select-none">•</span>

                <div className="flex items-center gap-1 truncate max-w-[340px]">
                  <MapPin className="w-3 h-3 text-rose-600 shrink-0" />
                  <span className="truncate">{storeAddress}</span>
                </div>

                {onEditStoreInfo && (
                  <span className="print:hidden ml-1 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 text-[8px] font-bold text-indigo-600 bg-white px-1.5 py-0.2 rounded border border-indigo-200 transition-opacity">
                    <Edit3 className="w-2.5 h-2.5" />
                    <span>{isKu ? 'دەستکاری' : 'Edit'}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Document Title, Status Badge & Ref Number */}
          <div className="text-right flex flex-col items-end">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold border ${statusBadge.classes}`}>
                ● {statusBadge.label}
              </span>
            </div>
            <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">
              {getDocTitle()}
            </h2>
            <div className="text-[10px] font-mono font-bold text-indigo-700 mt-0.5">
              Ref: #{doc.documentNumber}
            </div>
          </div>

        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. INVOICE DETAILS & CUSTOMER INFO (2-COLUMN GRID) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-2.5 mb-2">
        
        {/* Left Column: Invoice Details */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
            <span className="font-bold text-[9.5px] text-slate-700 uppercase tracking-wider">
              {isKu ? 'زانیاری پسوڵە' : 'Invoice Details'}
            </span>
            <span className="text-[9px] font-mono text-slate-500">
              #{doc.documentNumber}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
            <div>
              <span className="text-slate-500 block text-[9px]">{isKu ? 'بەرواری دەرچوون:' : 'Issue Date:'}</span>
              <span className="font-semibold text-slate-800">{doc.issueDate} {doc.issueTime ? `• ${doc.issueTime}` : ''}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">{isKu ? 'وادەی یەکەم دانەوە:' : '1st Due Date:'}</span>
              <span className="font-semibold text-rose-700">{firstDueDate}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">{isKu ? 'ژمێریار / بەرپرس:' : 'Cashier / Rep:'}</span>
              <span className="font-semibold text-slate-800">{doc.sellerName || 'Admin Operator'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">{isKu ? 'دراوی سەرەکی:' : 'Base Currency:'}</span>
              <span className="font-semibold text-slate-800">{cur} (1$ = {exchangeRate.toLocaleString()} IQD)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Customer & Guarantor Information */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
            <span className="font-bold text-[9.5px] text-slate-700 uppercase tracking-wider">
              {isKu ? 'زانیاری کڕیار و کەفیل' : 'Customer & Guarantor Information'}
            </span>
            <span className="text-[9px] font-mono text-indigo-700 font-bold">
              ID: {doc.customer?.id?.substring(0, 10) || '225562866'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
            <div>
              <span className="text-slate-500 block text-[9px]">{isKu ? 'ناوی تەواو:' : 'Full Name:'}</span>
              <span className="font-bold text-slate-900 text-[11px]">{doc.customer?.name || 'Rebwar'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">{isKu ? 'ژمارەی مۆبایل:' : 'Phone Number:'}</span>
              <span className="font-mono font-bold text-slate-800">{isolateBidi(doc.customer?.phone || '07502463746')}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">{isKu ? 'کەفیل:' : 'Guarantor:'}</span>
              <span className="font-semibold text-slate-800">
                {doc.customer?.guarantorName ? `${doc.customer.guarantorName} (${doc.customer.guarantorPhone || ''})` : 'N/A (Self Guarantee)'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[9px]">{isKu ? 'ناونیشان / شوێن:' : 'Address:'}</span>
              <span className="font-semibold text-slate-800 truncate">{doc.customer?.address || 'Erbil / Kurdistan'}</span>
            </div>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. TOP METRIC KPI SUMMARY CARDS (COMPACT 6-CARD ROW) */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-6 gap-1.5 mb-2">
        
        {/* Card 1 */}
        <div className="bg-slate-900 text-white rounded-lg p-1.5 border border-slate-800 flex flex-col justify-between">
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">
            {isInstallment ? (isKu ? 'کۆی گشتی (قازانج)' : 'TOTAL (WITH FEE)') : isDebt ? (isKu ? 'کۆی قەرز' : 'TOTAL DEBT') : (isKu ? 'کۆی گشتی' : 'GRAND TOTAL')}
          </span>
          <span className="text-xs font-black tracking-tight text-white mt-0.5">
            {formatCurrency(doc.grandTotal, cur)}
          </span>
        </div>

        {/* Card 2 */}
        <div className="bg-emerald-50 text-emerald-950 rounded-lg p-1.5 border border-emerald-200 flex flex-col justify-between">
          <span className="text-[8px] font-bold text-emerald-700 uppercase tracking-tight">
            {isInstallment ? (isKu ? 'پێشەکی دراو' : 'DOWN PAYMENT') : (isKu ? 'بڕی دراو' : 'AMOUNT PAID')}
          </span>
          <span className="text-xs font-black tracking-tight text-emerald-900 mt-0.5">
            {formatCurrency(doc.paidAmount, cur)}
          </span>
        </div>

        {/* Card 3 */}
        {isInstallment ? (
          <div className="bg-indigo-50 text-indigo-950 rounded-lg p-1.5 border border-indigo-200 flex flex-col justify-between">
            <span className="text-[8px] font-bold text-indigo-700 uppercase tracking-tight">
              {isKu ? 'قیستی مانگانە' : 'MONTHLY PAYMENT'}
            </span>
            <span className="text-xs font-black tracking-tight text-indigo-900 mt-0.5">
              {formatCurrency(monthlyPaymentAmt, cur)} <span className="text-[8px] font-normal text-indigo-700">/ MO</span>
            </span>
          </div>
        ) : (
          <div className={doc.remainingBalance <= 0 ? "bg-emerald-50 text-emerald-950 rounded-lg p-1.5 border border-emerald-200 flex flex-col justify-between" : "bg-amber-50 text-amber-950 rounded-lg p-1.5 border border-amber-200 flex flex-col justify-between"}>
            <span className={doc.remainingBalance <= 0 ? "text-[8px] font-bold text-emerald-700 uppercase tracking-tight" : "text-[8px] font-bold text-amber-700 uppercase tracking-tight"}>
              {isDebt ? (isKu ? 'دۆخی قەرز' : 'DEBT STATUS') : (isKu ? 'دۆخی پارەدان' : 'PAYMENT STATUS')}
            </span>
            <span className={doc.remainingBalance <= 0 ? "text-[10px] font-bold text-emerald-900 mt-0.5" : "text-[10px] font-bold text-amber-900 mt-0.5"}>
              {doc.remainingBalance <= 0 ? (isKu ? 'دراوە' : (isDebt ? 'SETTLED' : 'PAID IN FULL')) : (isKu ? 'ماوە' : (isDebt ? 'ACTIVE' : 'PARTIAL'))}
            </span>
          </div>
        )}

        {/* Card 4 */}
        <div className="bg-slate-50 text-slate-900 rounded-lg p-1.5 border border-slate-200 flex flex-col justify-between">
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tight">
            {isInstallment ? (isKu ? 'ماوە و یەکەم دانەوە' : 'DURATION & 1ST DUE') : (isKu ? 'بەرواری دەرچوون' : 'ISSUE DATE')}
          </span>
          <span className="text-[10.5px] font-bold text-slate-900 mt-0.5">
            {isInstallment ? (
              <>{durationMonths} Mo | <span className="text-rose-700">{firstDueDate}</span></>
            ) : (
              doc.issueDate
            )}
          </span>
        </div>

        {/* Card 5 */}
        <div className="bg-slate-50 text-slate-900 rounded-lg p-1.5 border border-slate-200 flex flex-col justify-between">
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tight">
            {isInstallment ? (isKu ? 'پێشکەوتنی قیست' : 'INSTALLMENT PROGRESS') : (isKu ? 'بەرواری دانەوە' : 'PAYMENT DUE')}
          </span>
          <div className="mt-0.5">
            <span className="text-[10px] font-bold text-slate-900">
              {isInstallment ? (
                `${progressPercent}% (${paidMonthsCount} of ${durationMonths} Mo)`
              ) : (
                <span className="text-rose-700">{firstDueDate || 'Upon Request'}</span>
              )}
            </span>
          </div>
        </div>

        {/* Card 6 */}
        <div className="bg-rose-50 text-rose-950 rounded-lg p-1.5 border-2 border-rose-300 flex flex-col justify-between">
          <span className="text-[8px] font-bold text-rose-700 uppercase tracking-tight">
            {isKu ? 'باڵانسی ماوە' : 'REMAINING BALANCE'}
          </span>
          <span className="text-xs font-black tracking-tight text-rose-700 mt-0.5">
            {formatCurrency(doc.remainingBalance, cur)}
          </span>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. PURCHASED ITEMS & DEVICES TABLE */}
      {/* ------------------------------------------------------------- */}
      <div className="mb-2">
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold uppercase text-[9px] tracking-wider">
                <th className="py-1 px-2 text-center w-8">#</th>
                <th className="py-1 px-2">{isKu ? 'ناوی ئامێر / کاڵا' : 'Item / Device Description'}</th>
                <th className="py-1 px-2 w-44">{isKu ? 'تایبەتمەندی / کۆد / بارکۆد' : 'Specs / IMEI / Barcode'}</th>
                <th className="py-1 px-2 text-center w-12">{isKu ? 'ژمارە' : 'Qty'}</th>
                <th className="py-1 px-2 text-right w-24">{isKu ? 'نرخی تاک' : 'Unit Price'}</th>
                <th className="py-1 px-2 text-right w-14">{isKu ? 'داشکاندن' : 'Disc'}</th>
                <th className="py-1 px-2 text-right w-24">{isKu ? 'کۆی گشتی' : 'Total'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => {
                const specs = item.imei ? `IMEI: ${item.imei}` : item.barcode ? `BAR: ${item.barcode}` : item.serialNumber || (item.model ? `Model: ${item.model}` : 'GENUINE-DEVICE');
                return (
                  <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                    <td className="py-1 px-2 text-center font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-1 px-2 font-bold text-slate-900">
                      {item.name}
                      {item.brand && (
                        <span className="block text-[8.5px] font-normal text-slate-500">{item.brand} {item.model || ''} {item.storage || ''}</span>
                      )}
                    </td>
                    <td className="py-1 px-2 font-mono text-[9px] text-slate-600">
                      {specs}
                    </td>
                    <td className="py-1 px-2 text-center font-mono font-semibold">{item.quantity}</td>
                    <td className="py-1 px-2 text-right font-mono">{formatCurrency(item.unitPrice, cur)}</td>
                    <td className="py-1 px-2 text-right font-mono text-slate-500">{item.discount ? formatCurrency(item.discount, cur) : '-'}</td>
                    <td className="py-1 px-2 text-right font-mono font-bold text-slate-900">{formatCurrency(item.total, cur)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right-aligned Financial Summary Breakdown */}
        <div className="flex justify-end mt-1.5">
          <div className="w-64 bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-1 text-[10px]">
            <div className="flex justify-between text-slate-600">
              <span>{isKu ? 'کۆی سەرەتایی:' : 'Subtotal:'}</span>
              <span className="font-mono font-semibold">{formatCurrency(doc.subtotal || doc.grandTotal, cur)}</span>
            </div>
            {financingFee > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>{isKu ? 'سوودی دارایی قیست:' : 'Financing Fee:'}</span>
                <span className="font-mono font-semibold text-indigo-700">+{formatCurrency(financingFee, cur)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1">
              <span>{isKu ? 'کۆی گشتی ڕێککەوتن:' : 'Grand Total:'}</span>
              <span className="font-mono">{formatCurrency(doc.grandTotal, cur)}</span>
            </div>
            <div className="flex justify-between text-emerald-800">
              <span>{isKu ? 'بڕی دراو / پێشەکی:' : 'Amount Paid:'}</span>
              <span className="font-mono font-bold">- {formatCurrency(doc.paidAmount, cur)}</span>
            </div>
            <div className="flex justify-between items-center bg-rose-50 border border-rose-300 rounded p-1 text-rose-900 font-black text-[11px] mt-0.5">
              <span>{isKu ? 'باڵانسی ماوە بۆ دانەوە:' : 'REMAINING BALANCE DUE:'}</span>
              <span className="font-mono">{formatCurrency(doc.remainingBalance, cur)}</span>
            </div>
            <div className="text-[8px] text-slate-500 text-right">
              Approx. Dual: <span className="font-bold text-slate-700">{dualRemaining.secondary}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. MONTHLY INSTALLMENT SCHEDULE & LEDGER TABLE */}
      {/* ------------------------------------------------------------- */}
      {isInstallment && (schedules?.length || 0) > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between bg-slate-900 text-white px-2.5 py-1 rounded-t-lg">
            <span className="font-bold text-[9.5px] uppercase tracking-wider">
              {isKu 
                ? `خشتە و تۆماری قیستی مانگانە (${durationMonths} مانگ | ${formatCurrency(monthlyPaymentAmt, cur)} / مانگانە)` 
                : `MONTHLY INSTALLMENT SCHEDULE & LEDGER (${durationMonths} MONTHS | ${formatCurrency(monthlyPaymentAmt, cur)} / MO)`}
            </span>
            <span className="text-[8.5px] text-slate-300">
              Paid: {paidMonthsCount} of {durationMonths}
            </span>
          </div>

          <div className="border-x border-b border-slate-200 rounded-b-lg overflow-hidden">
            {/* If more than 6 months, render in a 2-column compact grid to guarantee strict 1-page fit */}
            {(schedules?.length || 0) > 6 ? (
              <div className="grid grid-cols-2 divide-x divide-slate-200 bg-white text-[9.5px]">
                {/* Column 1 */}
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold text-[8.5px] border-b border-slate-200">
                      <th className="py-0.5 px-1.5 w-7 text-center">Mo</th>
                      <th className="py-0.5 px-1.5">Due Date</th>
                      <th className="py-0.5 px-1.5 text-right">Amount</th>
                      <th className="py-0.5 px-1.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(schedules || []).slice(0, Math.ceil((schedules?.length || 0) / 2)).map((s, idx) => (
                      <tr key={s.monthNumber || idx} className="h-5">
                        <td className="py-0.5 px-1.5 text-center font-mono font-bold text-slate-600">M{s.monthNumber < 10 ? `0${s.monthNumber}` : s.monthNumber}</td>
                        <td className="py-0.5 px-1.5 font-mono text-[9px] text-slate-700">{s.dueDate}</td>
                        <td className="py-0.5 px-1.5 text-right font-mono font-bold">{formatCurrency(s.amountDue, cur)}</td>
                        <td className="py-0.5 px-1.5 text-center">
                          <span className={`px-1.5 py-0.2 rounded text-[7.5px] font-bold ${
                            s.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {s.status === 'paid' ? 'PAID' : 'DUE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Column 2 */}
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold text-[8.5px] border-b border-slate-200">
                      <th className="py-0.5 px-1.5 w-7 text-center">Mo</th>
                      <th className="py-0.5 px-1.5">Due Date</th>
                      <th className="py-0.5 px-1.5 text-right">Amount</th>
                      <th className="py-0.5 px-1.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(schedules || []).slice(Math.ceil((schedules?.length || 0) / 2)).map((s, idx) => (
                      <tr key={s.monthNumber || idx} className="h-5">
                        <td className="py-0.5 px-1.5 text-center font-mono font-bold text-slate-600">M{s.monthNumber < 10 ? `0${s.monthNumber}` : s.monthNumber}</td>
                        <td className="py-0.5 px-1.5 font-mono text-[9px] text-slate-700">{s.dueDate}</td>
                        <td className="py-0.5 px-1.5 text-right font-mono font-bold">{formatCurrency(s.amountDue, cur)}</td>
                        <td className="py-0.5 px-1.5 text-center">
                          <span className={`px-1.5 py-0.2 rounded text-[7.5px] font-bold ${
                            s.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {s.status === 'paid' ? 'PAID' : 'DUE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-[9.5px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold text-[8.5px] border-b border-slate-200">
                    <th className="py-0.5 px-2 w-10 text-center">Mo</th>
                    <th className="py-0.5 px-2">Due Date</th>
                    <th className="py-0.5 px-2 text-right">Amount Due</th>
                    <th className="py-0.5 px-2 text-right">Paid Amount</th>
                    <th className="py-0.5 px-2 text-center w-20">Status</th>
                    <th className="py-0.5 px-2">Receipt / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schedules.map((s, idx) => (
                    <tr key={s.monthNumber || idx} className="h-5">
                      <td className="py-0.5 px-2 text-center font-mono font-bold text-slate-600">Month {s.monthNumber}</td>
                      <td className="py-0.5 px-2 font-mono text-[9px] text-slate-700">{s.dueDate}</td>
                      <td className="py-0.5 px-2 text-right font-mono font-bold">{formatCurrency(s.amountDue, cur)}</td>
                      <td className="py-0.5 px-2 text-right font-mono text-emerald-800 font-semibold">{s.amountPaid ? formatCurrency(s.amountPaid, cur) : '-'}</td>
                      <td className="py-0.5 px-2 text-center">
                        <span className={`px-2 py-0.2 rounded text-[8px] font-bold ${
                          s.status === 'paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {s.status === 'paid' ? 'PAID' : 'DUE'}
                        </span>
                      </td>
                      <td className="py-0.5 px-2 font-mono text-[8.5px] text-slate-500">
                        {s.receiptNumber || (s.status === 'paid' ? 'Paid via POS' : 'Pending Payment')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. LEGAL UNDERTAKING & 4-BOX SIGNATURE BLOCK */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-1.5 mb-1.5">
        
        {/* Warranty, Return Policy & QR Verification Bar */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 flex items-center justify-between gap-3">
          <div className="space-y-0.5 text-[9px] flex-1">
            <div className="font-bold text-slate-800">
              {isInstallment 
                ? (isKu ? 'تێبینی: ڕێککەوتننامەی فەرمی قیستی POS' : 'Notes: POS Installment Agreement') 
                : isDebt 
                ? (isKu ? 'تێبینی: ڕێککەوتننامەی فەرمی قەرزی POS' : 'Notes: POS Debt Agreement') 
                : (isKu ? 'تێبینی: پسوڵەی فەرمی بازرگانی POS' : 'Notes: POS Commercial Invoice')}
            </div>
            <p className="text-slate-600 leading-tight">
              {isKu 
                ? 'مەرج و گرەنتی: ئامێر و کەلوپەل دەگۆڕدرێتەوە لە ماوەی ٣ ڕۆژدا بە پێشکەشکردنی پسوڵەی ئەسڵی و کارتۆن بە بێ کێشە.'
                : 'Warranty & Return Policy: Items can be replaced within 3 days with original receipt and box in pristine condition.'}
            </p>
          </div>
          <div className="bg-white p-1 rounded border border-slate-200 shrink-0">
            <QRCodeSVG value={qrPayload} size={32} level="M" />
          </div>
        </div>

        {/* Legal Obligation Text */}
        <p className="text-[8px] text-slate-500 italic text-center leading-tight px-2">
          {isKu
            ? (isInstallment 
                ? 'ئەم بەڵگەنامەیە وەک گرێبەستێکی فەرمی و یاسایی لە نێوان کڕیار، کەفیل و فرۆشگا هەژمار دەکرێت. واژوو و پەنجەمۆر لە خوارەوە بە مانای پابەندبوونی تەواوی یاساییە بە دانەوەی قیستەکان لە کاتی دیاریکراودا.'
                : 'ئەم بەڵگەنامەیە وەک گرێبەستێکی فەرمی و یاسایی لە نێوان کڕیار، کەفیل و فرۆشگا هەژمار دەکرێت. واژوو و پەنجەمۆر لە خوارەوە بە مانای پابەندبوونی تەواوی یاساییە بە دانەوەی بڕی ماوە لە کاتی دیاریکراودا.')
            : '"This document constitutes a binding commercial agreement between the Customer, Guarantor, and Store. By providing signature and thumbprint below, the parties acknowledge full joint legal liability to repay all outstanding balances strictly on schedule."'}
        </p>

        {/* 4 Signature Cards (Equal Width 4-Column Grid) */}
        <div className="grid grid-cols-4 gap-2">
          
          {/* Box 1: Customer Signature */}
          <div className="border border-slate-300 rounded-lg p-1.5 bg-white flex flex-col justify-between h-18">
            <div>
              <span className="text-[8.5px] font-bold text-slate-700 block">
                {isKu ? 'واژووی کڕیار' : 'Customer Signature'}
              </span>
              <span className="text-[8px] text-slate-500 block truncate">
                {doc.customer?.name || 'Customer'}
              </span>
            </div>
            <div className="flex items-end justify-between border-t border-dashed border-slate-300 pt-1">
              <span className="text-[7.5px] text-slate-400">Sign: ____________</span>
              <div className="w-5 h-5 rounded border border-dashed border-slate-400 flex items-center justify-center text-[6.5px] text-slate-400">
                Thumb
              </div>
            </div>
          </div>

          {/* Box 2: Guarantor Signature */}
          <div className="border border-slate-300 rounded-lg p-1.5 bg-white flex flex-col justify-between h-18">
            <div>
              <span className="text-[8.5px] font-bold text-slate-700 block">
                {isKu ? 'واژووی کەفیل' : 'Guarantor Signature'}
              </span>
              <span className="text-[8px] text-slate-500 block truncate">
                {doc.customer?.guarantorName || 'Guarantor'}
              </span>
            </div>
            <div className="flex items-end justify-between border-t border-dashed border-slate-300 pt-1">
              <span className="text-[7.5px] text-slate-400">Sign: ____________</span>
              <div className="w-5 h-5 rounded border border-dashed border-slate-400 flex items-center justify-center text-[6.5px] text-slate-400">
                Thumb
              </div>
            </div>
          </div>

          {/* Box 3: Seller Signature */}
          <div className="border border-slate-300 rounded-lg p-1.5 bg-white flex flex-col justify-between h-18">
            <div>
              <span className="text-[8.5px] font-bold text-slate-700 block">
                {isKu ? 'واژووی فرۆشیار' : 'Seller Signature'}
              </span>
              <span className="text-[8px] text-slate-500 block">
                {storeName}
              </span>
            </div>
            <div className="border-t border-dashed border-slate-300 pt-1 space-y-0.5">
              <span className="text-[7.5px] text-slate-400 block">Sign: ____________</span>
              <span className="text-[7px] text-slate-400 block">Date: {doc.issueDate}</span>
            </div>
          </div>

          {/* Box 4: Official Seal Card */}
          <div className="rounded-lg p-1.5 bg-slate-900 text-white border border-slate-800 flex flex-col items-center justify-center text-center h-18">
            <Award className="w-4 h-4 text-amber-400 mb-0.5" />
            <span className="text-[8px] font-black tracking-wider text-amber-400 uppercase truncate max-w-full px-1">
              {storeName ? `${storeName.split(' ')[0]} VERIFIED` : 'VERIFIED'}
            </span>
            <span className="text-[7.5px] tracking-widest text-slate-300">
              ★★★★★
            </span>
            <span className="text-[6.5px] font-mono text-slate-400 uppercase">
              AUTHENTICATED
            </span>
          </div>

        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 7. FOOTER */}
      {/* ------------------------------------------------------------- */}
      <div className="border-t border-slate-200 pt-1 flex items-center justify-between text-[8px] text-slate-500">
        <div>
          {isKu 
            ? `سوپاس بۆ هەڵبژاردنی ${storeName}. ڕێز لە متمانە و مامەڵەکردنتان دەگرین.` 
            : `Thank you for choosing ${storeName}. We appreciate your business and trust.`}
        </div>
        <div className="font-mono">
          {storeName} Management Platform | Printed {printTimestamp}
        </div>
      </div>

    </div>
  );
}
