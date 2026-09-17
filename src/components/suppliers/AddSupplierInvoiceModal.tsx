import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Save, 
  FileText, 
  Building2, 
  Calendar, 
  DollarSign, 
  Package, 
  Layers, 
  ArrowRight,
  Sparkles,
  Plus
} from 'lucide-react';
import { Supplier, SupplierPurchaseInvoice, InvoiceProductType } from '../../types/supplier';
import { sound } from '../../lib/sound';
import { formatNumberWithCommas, parseFormattedNumber, cn, formatCurrency } from '../../lib/utils';

interface AddSupplierInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  initialSupplierId?: string;
  onSaveInvoice: (invoice: Omit<SupplierPurchaseInvoice, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export default function AddSupplierInvoiceModal({
  isOpen,
  onClose,
  suppliers,
  initialSupplierId,
  onSaveInvoice
}: AddSupplierInvoiceModalProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';

  const PRODUCT_TYPES: Array<{ id: InvoiceProductType; label: string }> = [
    { id: 'mobiles', label: t('suppliers.productTypes.mobiles') },
    { id: 'accessories', label: t('suppliers.productTypes.accessories') },
    { id: 'spare_parts', label: t('suppliers.productTypes.spare_parts') },
    { id: 'mixed', label: t('suppliers.productTypes.mixed') },
    { id: 'services', label: t('suppliers.productTypes.services') }
  ];

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>('');
  const [currency, setCurrency] = useState<'USD' | 'IQD'>('USD');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [downPayment, setDownPayment] = useState<string>('');
  const [productType, setProductType] = useState<InvoiceProductType>('mobiles');
  const [itemsSummary, setItemsSummary] = useState<string>('');
  const [itemCount, setItemCount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const year = new Date().getFullYear();
      const random = Math.floor(1000 + Math.random() * 9000);
      setInvoiceNumber(`BILL-${year}-${random}`);

      if (initialSupplierId) {
        setSelectedSupplierId(initialSupplierId);
        const s = (suppliers || []).find(sup => sup.id === initialSupplierId);
        if (s) setCurrency(s.currency || 'USD');
      } else if ((suppliers?.length || 0) > 0) {
        const safeSuppliers = suppliers || [];
        setSelectedSupplierId(safeSuppliers[0].id);
        setCurrency(safeSuppliers[0].currency || 'USD');
      }

      setPurchaseDate(new Date().toISOString().split('T')[0]);
      // Default due date +15 days
      const due = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
      setDueDate(due);
      setTotalAmount('');
      setDownPayment('');
      setProductType('mobiles');
      setItemsSummary('');
      setItemCount('');
      setNotes('');
    }
  }, [isOpen, initialSupplierId, suppliers]);

  if (!isOpen) return null;

  const currentSupplier = suppliers.find(s => s.id === selectedSupplierId);

  const parsedTotal = parseFormattedNumber(totalAmount) || 0;
  const parsedDownPayment = parseFormattedNumber(downPayment) || 0;
  const remainingDebt = Math.max(0, parsedTotal - parsedDownPayment);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || !invoiceNumber.trim() || parsedTotal <= 0) {
      sound.playError();
      return;
    }

    const supplierName = currentSupplier ? currentSupplier.name : 'Supplier';

    sound.playSuccess();
    onSaveInvoice({
      supplierId: selectedSupplierId,
      supplierName,
      invoiceNumber: invoiceNumber.trim(),
      purchaseDate,
      dueDate: dueDate || undefined,
      currency,
      totalAmount: parsedTotal,
      downPayment: parsedDownPayment,
      paidAmount: parsedDownPayment,
      remainingDebt,
      status: remainingDebt === 0 ? 'paid' : parsedDownPayment > 0 ? 'partially_paid' : 'unpaid',
      productType,
      itemsSummary: itemsSummary.trim() || `${productType} stock shipment`,
      itemCount: itemCount ? parseInt(itemCount, 10) : undefined,
      notes: notes.trim() || undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        dir={isKu ? 'rtl' : 'ltr'} 
        className="bg-[#0f1422] border border-slate-700/80 rounded-3xl w-full max-w-xl text-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-[#0b0f1a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                {t('suppliers.invoiceModal.title')}
              </h3>
              <p className="text-xs text-slate-400">
                {t('suppliers.invoiceModal.subtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Supplier */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {t('suppliers.invoiceModal.vendor')} <span className="text-rose-400">*</span>
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => {
                setSelectedSupplierId(e.target.value);
                const s = suppliers.find(sup => sup.id === e.target.value);
                if (s) setCurrency(s.currency || 'USD');
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-indigo-500"
            >
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.city})
                </option>
              ))}
            </select>
          </div>

          {/* Invoice # & Product Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('suppliers.invoiceModal.invoiceNumber')} <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder={t('suppliers.invoiceModal.invoicePlaceholder')}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('suppliers.invoiceModal.category')}
              </label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value as InvoiceProductType)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {PRODUCT_TYPES.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Items Summary & Count */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('suppliers.invoiceModal.batchDescription')}
              </label>
              <input
                type="text"
                value={itemsSummary}
                onChange={(e) => setItemsSummary(e.target.value)}
                placeholder={t('suppliers.invoiceModal.batchPlaceholder')}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('suppliers.invoiceModal.totalUnits')}
              </label>
              <input
                type="number"
                value={itemCount}
                onChange={(e) => setItemCount(e.target.value)}
                placeholder={t('suppliers.invoiceModal.unitsPlaceholder')}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Amounts: Total & Down Payment */}
          <div className="bg-[#141b2d] border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">{t('suppliers.invoiceModal.financialBreakdown')}</span>
              <div className="flex rounded-lg bg-slate-900 border border-slate-700 p-0.5">
                <button
                  type="button"
                  onClick={() => { sound.playClick(); setCurrency('USD'); }}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                    currency === 'USD' ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                  )}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => { sound.playClick(); setCurrency('IQD'); }}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                    currency === 'IQD' ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white"
                  )}
                >
                  IQD (د.ع)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t('suppliers.invoiceModal.totalBillAmount')} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-bold font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t('suppliers.invoiceModal.downPayment')}
                </label>
                <input
                  type="text"
                  value={downPayment}
                  onChange={(e) => setDownPayment(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-bold font-mono text-emerald-400 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">{t('suppliers.invoiceModal.remainingDebt')}</span>
              <span className={cn(
                "text-sm font-bold font-mono",
                remainingDebt > 0 ? "text-amber-400" : "text-emerald-400"
              )}>
                {formatCurrency(remainingDebt, currency)}
              </span>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('suppliers.invoiceModal.purchaseDate')}
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('suppliers.invoiceModal.dueDate')}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {t('suppliers.invoiceModal.notes')}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('suppliers.invoiceModal.notesPlaceholder')}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#0b0f1a] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 cursor-pointer"
          >
            {t('suppliers.invoiceModal.cancel')}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={parsedTotal <= 0}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" />
            <span>{t('suppliers.invoiceModal.save')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
