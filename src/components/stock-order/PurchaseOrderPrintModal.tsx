import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Copy, 
  Check, 
  FileText, 
  Building2, 
  Share2,
  Package
} from 'lucide-react';
import { PurchaseOrder, OrderItem } from '../../types/stockOrder';
import { formatNumberWithCommas } from '../../lib/utils';
import { sound } from '../../lib/sound';
import { useToast } from '../common/Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrder | {
    orderNumber: string;
    items: OrderItem[];
    totalAmountUSD: number;
    totalAmountIQD: number;
    createdAt?: string;
  };
}

export default function PurchaseOrderPrintModal({ isOpen, onClose, order }: Props) {
  const { success } = useToast();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const totalUnits = (order.items || []).reduce((sum, i) => sum + i.quantity, 0);
  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : new Date().toLocaleDateString();

  // Generate WhatsApp message text
  const generateWhatsAppText = () => {
    let text = `📦 *PURCHASE ORDER: ${order.orderNumber}*\n`;
    text += `📅 Date: ${dateStr}\n`;
    text += `🔢 Total Items: ${(order.items || []).length} (${totalUnits} units)\n\n`;
    text += `*ITEMS LIST:*\n`;

    (order.items || []).forEach((item, idx) => {
      const costStr = item.unitCost > 0 
        ? ` @ ${item.currency === 'USD' ? '$' : ''}${formatNumberWithCommas(item.unitCost)}${item.currency === 'IQD' ? ' IQD' : ''}` 
        : '';
      text += `${idx + 1}. *${item.name}* x ${item.quantity}${costStr}\n`;
      if (item.sku) text += `   SKU: ${item.sku}\n`;
      if (item.notes) text += `   Note: ${item.notes}\n`;
    });

    text += `\n`;
    if (order.totalAmountUSD > 0) {
      text += `💰 *Total USD: $${formatNumberWithCommas(order.totalAmountUSD)}*\n`;
    }
    if (order.totalAmountIQD > 0) {
      text += `💰 *Total IQD: ${formatNumberWithCommas(order.totalAmountIQD)} IQD*\n`;
    }
    text += `\nPlease confirm availability and delivery timeframe. Thank you!`;

    return text;
  };

  const handleCopyWhatsApp = () => {
    sound.playClick();
    const text = generateWhatsAppText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    success('Purchase order copied to clipboard! Ready to paste into WhatsApp.');
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    sound.playClick();
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:p-0 print:bg-white animate-in fade-in duration-150">
      <div 
        className="bg-[#0b0f1a] print:bg-white print:text-black w-full max-w-2xl rounded-2xl border border-slate-800 print:border-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header - Screen only */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#121727] print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Purchase Order #{order.orderNumber}</h3>
              <p className="text-xs text-slate-400">Print or share with supplier</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Order Document Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 print:p-8">
          
          {/* Document Header */}
          <div className="flex justify-between items-start border-b border-slate-800 print:border-slate-300 pb-4">
            <div>
              <h1 className="text-xl font-black text-white print:text-black tracking-tight">PURCHASE ORDER</h1>
              <p className="text-xs text-slate-400 print:text-slate-600 mt-0.5">Inventory Restock Document</p>
              <div className="text-xs text-indigo-400 print:text-slate-800 font-mono font-bold mt-2">
                Order ID: {order.orderNumber}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 print:text-slate-600">Date Issued</div>
              <div className="text-xs font-semibold text-white print:text-black mt-0.5">{dateStr}</div>
              <div className="text-[11px] text-slate-500 print:text-slate-500 mt-1">Total Units: {totalUnits}</div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 print:border-slate-300 text-slate-400 print:text-slate-600 uppercase text-[10px]">
                  <th className="py-2.5 px-2">#</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-2">SKU / Code</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                {order.items.map((item, idx) => {
                  const subtotal = item.quantity * item.unitCost;
                  return (
                    <tr key={item.sku || item.id || idx}>
                      <td className="py-2.5 px-2 text-slate-500 print:text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-white print:text-black">{item.name}</div>
                        {item.supplier && (
                          <div className="text-[10px] text-slate-500 print:text-slate-500">{item.supplier}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 font-mono text-[11px] text-slate-400 print:text-slate-600">
                        {item.sku || '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold font-mono text-white print:text-black">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300 print:text-slate-700">
                        {item.unitCost > 0 ? (
                          <>
                            {item.currency === 'USD' ? '$' : ''}
                            {formatNumberWithCommas(item.unitCost)}
                            {item.currency === 'IQD' ? ' د.ع' : ''}
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-300 print:text-black">
                        {subtotal > 0 ? (
                          <>
                            {item.currency === 'USD' ? '$' : ''}
                            {formatNumberWithCommas(subtotal)}
                            {item.currency === 'IQD' ? ' د.ع' : ''}
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div className="border-t border-slate-800 print:border-slate-300 pt-4 flex justify-between items-end">
            <div className="text-[11px] text-slate-500 print:text-slate-600 max-w-xs">
              This purchase order is auto-generated for inventory replenishment. All goods must match specified specifications upon delivery.
            </div>
            <div className="space-y-1 text-right min-w-[180px]">
              <div className="flex justify-between text-xs text-slate-400 print:text-slate-600">
                <span>Total Items:</span>
                <span className="font-mono font-bold text-white print:text-black">{totalUnits} units</span>
              </div>
              {order.totalAmountUSD > 0 && (
                <div className="flex justify-between text-sm font-bold text-emerald-400 print:text-emerald-700">
                  <span>Total (USD):</span>
                  <span className="font-mono">${formatNumberWithCommas(order.totalAmountUSD)}</span>
                </div>
              )}
              {order.totalAmountIQD > 0 && (
                <div className="flex justify-between text-sm font-bold text-emerald-400 print:text-emerald-700">
                  <span>Total (IQD):</span>
                  <span className="font-mono">{formatNumberWithCommas(order.totalAmountIQD)} د.ع</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions - Screen only */}
        <div className="p-4 border-t border-slate-800 bg-[#121727] flex items-center justify-between print:hidden">
          <button
            onClick={handleCopyWhatsApp}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied WhatsApp Text!' : 'Share via WhatsApp'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
