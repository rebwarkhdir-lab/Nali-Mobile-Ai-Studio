import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  Filter, 
  FileText, 
  Receipt, 
  Calendar, 
  User, 
  Phone, 
  DollarSign, 
  Coins, 
  Printer, 
  Download, 
  Send, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Layers,
  Sparkles,
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';
import { InvoiceDocument } from '../../types/invoice';
import { SearchInput } from '../common/SearchInput';
import { Debt, DebtPayment } from '../../types/debt';
import { InstallmentPlan } from '../../types/installment';
import { debtService } from '../../lib/debtService';
import { installmentService } from '../../lib/installmentService';
import { 
  convertPOSReceiptToInvoiceDoc, 
  convertDebtToInvoiceDoc, 
  convertInstallmentToInvoiceDoc 
} from '../../lib/invoiceUtils';
import { formatCurrency } from '../../lib/utils';
import { useDesignSystem } from '../../context/DesignContext';
import { sound } from '../../lib/sound';
import InvoiceViewerModal from './InvoiceViewerModal';
import CustomerStatementModal from './CustomerStatementModal';
import { useTranslation } from 'react-i18next';

interface InvoicesListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InvoicesListModal({
  isOpen,
  onClose
}: InvoicesListModalProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language !== 'en';
  const { settings } = useDesignSystem();

  const [debts, setDebts] = useState<Debt[]>([]);
  const [installments, setInstallments] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'debt' | 'installment' | 'receipts'>('all');
  const [selectedDoc, setSelectedDoc] = useState<InvoiceDocument | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      sound.play('open');
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [debtsData, insData] = await Promise.all([
        debtService.getAllDebts(),
        installmentService.getAllInstallments()
      ]);
      setDebts(debtsData);
      setInstallments(insData);
    } catch (e) {
      console.error('Failed to load invoice history:', e);
    } finally {
      setLoading(false);
    }
  };

  // Convert all debts, installments, and payment receipts into uniform documents list
  const allDocuments = useMemo<InvoiceDocument[]>(() => {
    const docs: InvoiceDocument[] = [];

    // 1. Debts
    debts.forEach(d => {
      docs.push(convertDebtToInvoiceDoc(d, undefined, settings));
      
      // Debt payment receipts
      (d.payments || []).forEach(p => {
        docs.push(convertDebtToInvoiceDoc(d, p, settings));
      });
    });

    // 2. Installments
    installments.forEach(ins => {
      docs.push(convertInstallmentToInvoiceDoc(ins, undefined, settings));

      // Schedule payment receipts
      (ins.schedules || []).filter(s => s.status === 'paid').forEach(s => {
        docs.push(convertInstallmentToInvoiceDoc(ins, s.id, settings));
      });
    });

    // Sort descending by date
    return docs.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }, [debts, installments, settings]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return allDocuments.filter(doc => {
      // Type Filter
      if (typeFilter === 'debt' && doc.documentType !== 'debt_invoice') return false;
      if (typeFilter === 'installment' && doc.documentType !== 'installment_invoice') return false;
      if (typeFilter === 'receipts' && doc.documentType !== 'debt_receipt' && doc.documentType !== 'installment_receipt') return false;

      // Search Term
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        doc.documentNumber.toLowerCase().includes(q) ||
        (doc.customer?.name && doc.customer.name.toLowerCase().includes(q)) ||
        (doc.customer?.phone && doc.customer.phone.includes(q)) ||
        (doc.notes && doc.notes.toLowerCase().includes(q)) ||
        (doc.items && doc.items.some(i => i.name.toLowerCase().includes(q) || (i.imei && i.imei.includes(q))))
      );
    });
  }, [allDocuments, typeFilter, searchTerm]);

  const handleOpenDoc = (doc: InvoiceDocument) => {
    sound.play('click');
    setSelectedDoc(doc);
    setIsViewerOpen(true);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
        <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          
          {/* Header */}
          <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {isKu ? 'ئەرشیف و پسوڵە داراییەکان' : 'Financial Documents & Invoices Archive'}
                </h2>
                <p className="text-xs text-slate-400">
                  {isKu ? 'گەڕان، بینین، چاپکردن و ناردنی هەموو پسوڵەی قەرز، قیست و وەسڵەکان' : 'Search, view, print, and WhatsApp any past invoice or payment receipt'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  sound.play('click');
                  setIsStatementOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>{isKu ? 'کەشفی هەژماری کڕیار' : 'Customer Statement'}</span>
              </button>

              <button
                onClick={() => { sound.play('click'); onClose(); }}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
            
            {/* Search Input */}
            <div className="flex-1">
              <SearchInput
                value={searchTerm}
                onChangeValue={setSearchTerm}
                placeholder={isKu ? 'گەڕان بەپێی ژمارەی پسوڵە، ناوی کڕیار، مۆبایل یان IMEI...' : 'Search by invoice #, customer name, phone, or IMEI...'}
                size="sm"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: isKu ? 'هەموو' : 'All' },
                { id: 'debt', label: isKu ? 'قەرز' : 'Debts' },
                { id: 'installment', label: isKu ? 'قیست' : 'Installments' },
                { id: 'receipts', label: isKu ? 'وەسڵی پارەدان' : 'Receipts' }
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => { sound.play('click'); setTypeFilter(pill.id as any); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    typeFilter === pill.id 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

          </div>

          {/* Documents Table / List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {loading ? (
              <div className="py-16 text-center text-slate-500 text-xs font-mono">
                {isKu ? 'بارکردنی داتاکان...' : 'Loading financial documents...'}
              </div>
            ) : (filteredDocs?.length || 0) === 0 ? (
              <div className="py-16 text-center text-slate-500 space-y-2">
                <FileText className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-sm font-semibold text-slate-400">
                  {isKu ? 'هیچ پسوڵەیەک نەدۆزرایەوە' : 'No documents found'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(filteredDocs || []).map((doc, idx) => {
                  const isPayment = doc.documentType === 'debt_receipt' || doc.documentType === 'installment_receipt';
                  const isDebt = doc.documentType === 'debt_invoice';
                  const isIns = doc.documentType === 'installment_invoice';

                  return (
                    <div
                      key={doc.documentId || idx}
                      onClick={() => handleOpenDoc(doc)}
                      className="p-4 bg-slate-950 hover:bg-slate-900/90 border border-slate-800/90 hover:border-indigo-500/40 rounded-xl transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-lg text-xs font-bold ${
                            isPayment ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            isIns ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                              <span dir="ltr">{doc.documentNumber}</span>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {doc.customer?.name || (isKu ? 'کڕیاری گشتی' : 'Walk-in')}
                            </span>
                          </div>
                        </div>

                        <div className="text-right" dir="ltr">
                          <div className="font-mono font-bold text-sm text-white">
                            {formatCurrency(doc.grandTotal, doc.currency)}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {doc.issueDate}
                          </span>
                        </div>
                      </div>

                      {/* Summary and Remaining Balance */}
                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            doc.status === 'paid' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60' :
                            doc.status === 'overdue' ? 'bg-rose-950/60 text-rose-400 border border-rose-800/60' :
                            'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                          }`}>
                            {doc.documentType}
                          </span>
                          {doc.customer?.phone && (
                            <span className="text-[10px] text-slate-500 font-mono" dir="ltr">
                              {doc.customer.phone}
                            </span>
                          )}
                        </div>

                        {doc.remainingBalance > 0 && (
                          <div className="text-rose-400 font-mono text-[11px] font-semibold" dir="ltr">
                            {isKu ? 'ماوە:' : 'Rem:'} {formatCurrency(doc.remainingBalance, doc.currency)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <span>
              {filteredDocs?.length || 0} {isKu ? 'پسوڵە و دۆکیۆمێنت' : 'Documents'}
            </span>
            <button
              onClick={() => { sound.play('click'); onClose(); }}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
            >
              {isKu ? 'داخستن' : 'Close'}
            </button>
          </div>

        </div>
      </div>

      {/* Embedded Document Viewer */}
      {isViewerOpen && selectedDoc && (
        <InvoiceViewerModal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          document={selectedDoc}
          initialFormat="a4"
          initialLanguage={isKu ? 'ku' : 'en'}
        />
      )}

      {/* Embedded Customer Statement Modal */}
      {isStatementOpen && (
        <CustomerStatementModal
          isOpen={isStatementOpen}
          onClose={() => setIsStatementOpen(false)}
        />
      )}
    </>
  );
}
