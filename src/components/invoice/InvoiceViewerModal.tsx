import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Send, 
  Share2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  FileText, 
  Receipt, 
  Globe, 
  Check, 
  Copy,
  ExternalLink,
  MessageCircle,
  FileCheck,
  Edit,
  Palette,
  MapPin,
  Maximize2
} from 'lucide-react';
import { InvoiceDocument } from '../../types/invoice';
import PremiumInvoiceDocument from './PremiumInvoiceDocument';
import ModernInvoiceDocument from './ModernInvoiceDocument';
import MinimalInvoiceDocument from './MinimalInvoiceDocument';
import SinglePageInstallmentInvoice from './SinglePageInstallmentInvoice';
import InvoiceEditorModal from './InvoiceEditorModal';
import StoreContactModal from './StoreContactModal';
import { 
  exportInvoiceToPDF, 
  shareInvoicePDFToWhatsApp,
  openWhatsAppWithMessage, 
  generateWhatsAppMessage, 
  shareViaDevice, 
  cleanPhoneForWhatsApp 
} from '../../lib/invoiceUtils';
import { sound } from '../../lib/sound';
import { useToast } from '../common/Toast';
import { useTranslation } from 'react-i18next';
import { useDesignSystem } from '../../context/DesignContext';

interface InvoiceViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: InvoiceDocument | null;
  initialFormat?: 'a4' | 'thermal';
  initialLanguage?: 'ku' | 'en';
  onUpdateDocument?: (doc: InvoiceDocument) => void;
}

export default function InvoiceViewerModal({
  isOpen,
  onClose,
  document: doc,
  initialFormat = 'a4',
  initialLanguage,
  onUpdateDocument
}: InvoiceViewerModalProps) {
  const { i18n } = useTranslation();
  const { settings } = useDesignSystem();
  const { success, error: toastError, info } = useToast();

  const currentAppLang = (i18n.language === 'en' ? 'en' : 'ku') as 'ku' | 'en';
  const [lang, setLang] = useState<'ku' | 'en'>(initialLanguage || currentAppLang);
  const [format, setFormat] = useState<'a4' | 'thermal'>(initialFormat);
  const [zoom, setZoom] = useState<number>(100);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [template, setTemplate] = useState<'single_a4' | 'premium' | 'modern' | 'minimal'>('single_a4');
  const [isEditing, setIsEditing] = useState(false);
  const [isStoreContactOpen, setIsStoreContactOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<InvoiceDocument | null>(doc);

  const currentDoc = activeDoc || doc;

  const handleUpdateDoc = useCallback((updated: InvoiceDocument) => {
    setActiveDoc(updated);
    onUpdateDocument?.(updated);
  }, [onUpdateDocument]);

  // Calculate optimal zoom so invoice fits screen on mobile & tablet without side cutoffs
  const calculateAutoFitZoom = useCallback((fmt: 'a4' | 'thermal' = format) => {
    if (typeof window === 'undefined') return 100;
    const width = window.innerWidth;
    const baseW = fmt === 'thermal' ? 320 : 794;
    // Responsive safe margin
    const padding = width < 640 ? 16 : (width < 1024 ? 32 : 48);
    const availableWidth = Math.max(260, width - padding);
    if (availableWidth < baseW) {
      return Math.max(30, Math.min(100, Math.floor((availableWidth / baseW) * 100)));
    }
    return 100;
  }, [format]);

  // Only re-initialize when modal opens or document identity changes
  useEffect(() => {
    if (isOpen && doc) {
      sound.play('open');
      setLang(initialLanguage || (i18n.language === 'en' ? 'en' : 'ku'));
      setFormat(initialFormat);
      setZoom(calculateAutoFitZoom(initialFormat));
      
      const mergedBusinessInfo = {
        businessNameEn: settings.businessNameEn,
        businessNameKu: settings.businessNameKu,
        businessAddressEn: settings.businessAddressEn,
        businessAddressKu: settings.businessAddressKu,
        businessPhone: settings.businessPhone,
        businessPhoneSecondary: settings.businessPhoneSecondary,
        ...(doc.businessInfo || {})
      };

      setActiveDoc({
        ...doc,
        businessInfo: mergedBusinessInfo
      });

      // Default to 1-Page A4 contract layout for installment & debt, otherwise single_a4
      setTemplate('single_a4');
    }
  }, [isOpen, doc?.documentId, doc?.documentNumber]);

  // Handle responsive resizing (auto-fit on mobile / tablet)
  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => {
      if (window.innerWidth < 850) {
        setZoom(calculateAutoFitZoom(format));
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, format, calculateAutoFitZoom]);

  // Keyboard shortcut listener (Escape to close, Ctrl+P to print)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, doc]);

  if (!isOpen || !doc) return null;

  const handleFormatChange = (newFormat: 'a4' | 'thermal') => {
    sound.play('click');
    setFormat(newFormat);
    setZoom(calculateAutoFitZoom(newFormat));
  };

  const handlePrint = () => {
    sound.play('click');
    window.print();
  };

  const handleDownloadPDF = async () => {
    sound.play('click');
    setIsExportingPDF(true);
    try {
      const storePrefix = currentDoc.businessInfo?.businessNameEn || currentDoc.businessInfo?.businessNameKu || 'NaliMobile';
      const cleanPrefix = storePrefix.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${cleanPrefix}_${currentDoc.documentType.toUpperCase()}_${currentDoc.documentNumber}.pdf`;
      const res = await exportInvoiceToPDF('invoice-render-target', filename);
      if (res.success) {
        sound.play('success');
        success(lang === 'ku' ? 'فایلی PDF بە سەرکەوتوویی دابەزێندرا' : 'PDF downloaded successfully');
      } else {
        sound.play('error');
        toastError(res.error || 'Failed to download PDF');
      }
    } catch (e: any) {
      sound.play('error');
      toastError(e.message || 'Error creating PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleWhatsAppPDF = async () => {
    sound.play('click');
    setIsSharingWhatsApp(true);
    try {
      const res = await shareInvoicePDFToWhatsApp('invoice-render-target', currentDoc, lang);
      if (res.success) {
        sound.play('success');
        if (res.mode === 'native_file_share') {
          success(lang === 'ku' ? 'فایلی PDF و دەقەکە ئامادەکرا بۆ ناردن' : 'PDF file & message ready to send');
        } else {
          info(
            lang === 'ku'
              ? `فایلی PDF دابەزێندرا و وەتسئاپ کرایەوە! تکایە فایلی ${res.filename || 'PDF'} هاوپێچ بکە.`
              : `PDF downloaded & WhatsApp opened! Please attach the downloaded ${res.filename || 'PDF'} file.`
          );
        }
      } else {
        // Fallback to text message
        const msg = generateWhatsAppMessage(currentDoc, lang);
        openWhatsAppWithMessage(currentDoc.customer?.phone, msg);
      }
    } catch (err: any) {
      console.warn('WhatsApp PDF share error:', err);
      const msg = generateWhatsAppMessage(currentDoc, lang);
      openWhatsAppWithMessage(currentDoc.customer?.phone, msg);
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  const handleShare = async () => {
    sound.play('click');
    const shared = await shareViaDevice(currentDoc, lang);
    if (!shared) {
      // Fallback to copying message text to clipboard
      const text = generateWhatsAppMessage(currentDoc, lang);
      navigator.clipboard.writeText(text);
      setCopied(true);
      sound.play('success');
      success(lang === 'ku' ? 'دەقی پسوڵەکە کۆپی کرا بۆ کلیپبۆرد' : 'Invoice text copied to clipboard');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCopyText = () => {
    sound.play('click');
    const text = generateWhatsAppMessage(currentDoc, lang);
    navigator.clipboard.writeText(text);
    setCopied(true);
    sound.play('success');
    success(lang === 'ku' ? 'دەقی پسوڵەکە کۆپی کرا' : 'Invoice text copied');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      
      {/* 1. TOP RESPONSIVE ACTION TOOLBAR (Hidden during print) */}
      <header className="h-16 px-4 sm:px-6 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between shrink-0 shadow-lg print:hidden z-20">
        
        {/* Title & Document Badge */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="truncate">
            <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <span className="truncate">{doc.documentNumber}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono hidden sm:inline-block">
                {doc.documentType}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate">
              {doc.customer?.name || 'Walk-in'} • {doc.issueDate}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Format Switch: A4 Master vs Thermal 80mm */}
          <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => handleFormatChange('a4')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                format === 'a4' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Full A4 Financial Document"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">A4 Master</span>
            </button>
            <button
              onClick={() => handleFormatChange('thermal')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                format === 'thermal' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="80mm Thermal POS Slip"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">80mm Slip</span>
            </button>
          </div>

          {/* Edit Store Location & Phone Button */}
          <button
            onClick={() => { sound.play('click'); setIsStoreContactOpen(true); }}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title={lang === 'ku' ? 'دەستکاریکردنی ناونیشان و ژمارەی پەیوەندی' : 'Change Store Location & Phone Numbers'}
          >
            <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="hidden md:inline">{lang === 'ku' ? 'ناونیشان و پەیوەندی' : 'Location & Phone'}</span>
          </button>

          {/* Language Toggle: Kurdish vs English */}
          <button
            onClick={() => {
              sound.play('click');
              setLang(l => (l === 'ku' ? 'en' : 'ku'));
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>{lang === 'ku' ? 'کوردی' : 'EN'}</span>
          </button>

          {/* Edit Invoice Button */}
          {(activeDoc.documentType === 'debt_invoice' || activeDoc.documentType === 'installment_invoice' || activeDoc.documentType === 'debt_receipt' || activeDoc.documentType === 'installment_receipt') && (
            <button
              onClick={() => { sound.play('click'); setIsEditing(true); }}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Edit Invoice Details"
            >
              <Edit className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">{lang === 'ku' ? 'دەستکاری' : 'Edit'}</span>
            </button>
          )}

          {/* Template Selector */}
          <div className="hidden xl:flex items-center gap-1 bg-slate-800/90 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => { sound.play('click'); setTemplate('single_a4'); }}
              className={`px-2 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                template === 'single_a4' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Single-Page A4 Contract & Agreement"
            >
              1-Page A4
            </button>
            <button
              onClick={() => { sound.play('click'); setTemplate('premium'); }}
              className={`px-2 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                template === 'premium' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Premium
            </button>
            <button
              onClick={() => { sound.play('click'); setTemplate('modern'); }}
              className={`px-2 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                template === 'modern' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Modern
            </button>
            <button
              onClick={() => { sound.play('click'); setTemplate('minimal'); }}
              className={`px-2 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                template === 'minimal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Minimal
            </button>
          </div>

          {/* Zoom Controls (Desktop) */}
          <div className="hidden lg:flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700 text-slate-300">
            <button
              onClick={() => setZoom(z => Math.max(30, z - 10))}
              className="p-1.5 hover:text-white rounded hover:bg-slate-700 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(calculateAutoFitZoom(format))}
              className="px-1.5 py-0.5 text-[11px] font-mono text-indigo-300 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer"
              title="Fit to Window"
            >
              {zoom}%
            </button>
            <button
              onClick={() => setZoom(z => Math.min(160, z + 10))}
              className="p-1.5 hover:text-white rounded hover:bg-slate-700 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(100)}
              className="p-1.5 hover:text-white rounded hover:bg-slate-700 transition-colors cursor-pointer"
              title="Reset Zoom to 100%"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* WhatsApp PDF & Text Direct */}
          <button
            onClick={handleWhatsAppPDF}
            disabled={isSharingWhatsApp}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
            title="Send PDF & Invoice via WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{isSharingWhatsApp ? (lang === 'ku' ? 'ئامادەکردن...' : 'Preparing...') : 'WhatsApp PDF'}</span>
          </button>

          {/* Download PDF */}
          <button
            onClick={handleDownloadPDF}
            disabled={isExportingPDF}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-950/40 transition-all cursor-pointer"
            title="Download high-resolution PDF"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">{isExportingPDF ? '...' : 'PDF'}</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-white text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            title="Print (Ctrl+P)"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">{lang === 'ku' ? 'چاپکردن' : 'Print'}</span>
          </button>

          {/* Close Modal */}
          <button
            onClick={() => { sound.play('click'); onClose(); }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

        </div>
      </header>

      {/* 2. DOCUMENT SCROLLING CANVAS - Responsive scale prevents side clipping on mobile/tablet */}
      <div 
        className="flex-1 w-full overflow-x-auto overflow-y-auto p-2 sm:p-4 md:p-6 flex flex-col items-center justify-start print:p-0 print:overflow-visible print:block relative"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div 
          className="relative mx-auto my-2 sm:my-3 transition-all duration-150 ease-out print:m-0 print:w-full print:h-auto"
          style={{
            width: `${Math.round((format === 'thermal' ? 320 : 794) * (zoom / 100))}px`,
            minWidth: `${Math.round((format === 'thermal' ? 320 : 794) * (zoom / 100))}px`,
            height: format === 'a4' && template === 'single_a4' ? `${Math.round(1123 * (zoom / 100))}px` : 'auto',
            minHeight: format === 'a4' && template === 'single_a4' ? `${Math.round(1123 * (zoom / 100))}px` : undefined,
          }}
        >
          <div
            id="invoice-render-target"
            style={{
              width: `${format === 'thermal' ? 320 : 794}px`,
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top left',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
            className="print:transform-none print:static print:w-full print:h-auto"
          >
            {template === 'single_a4' && format === 'a4' && (
              <SinglePageInstallmentInvoice 
                document={currentDoc}
                language={lang}
                onEditStoreInfo={() => setIsStoreContactOpen(true)}
              />
            )}
            {template === 'premium' && (
              <PremiumInvoiceDocument 
                document={currentDoc}
                language={lang}
                format={format}
              />
            )}
            {template === 'modern' && (
              <ModernInvoiceDocument 
                document={currentDoc}
                language={lang}
                format={format}
              />
            )}
            {template === 'minimal' && (
              <MinimalInvoiceDocument 
                document={currentDoc}
                language={lang}
                format={format}
              />
            )}
          </div>
        </div>

        {/* Floating Responsive Quick-Zoom Control Pill (Always visible & accessible) */}
        <div className="sticky bottom-3 z-30 flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-full px-2.5 py-1.5 shadow-2xl text-white print:hidden">
          <button
            type="button"
            onClick={() => setZoom(z => Math.max(30, z - 10))}
            className="p-1 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setZoom(calculateAutoFitZoom(format))}
            className={`px-2.5 py-1 text-xs font-bold rounded-full transition-colors cursor-pointer flex items-center gap-1 ${
              Math.abs(zoom - calculateAutoFitZoom(format)) < 2
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Fit to Screen"
          >
            <Maximize2 className="w-3 h-3" />
            <span>{lang === 'ku' ? 'گونجاندن' : 'Fit'} ({zoom}%)</span>
          </button>

          <button
            type="button"
            onClick={() => setZoom(100)}
            className={`px-2 py-1 text-xs font-bold rounded-full transition-colors cursor-pointer ${
              zoom === 100
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Actual Size (100%)"
          >
            100%
          </button>

          <button
            type="button"
            onClick={() => setZoom(z => Math.min(160, z + 10))}
            className="p-1 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. BOTTOM MOBILE ACTION BAR (Hidden on desktop & print) */}
      <footer className="h-16 px-4 bg-slate-900 border-t border-slate-800 flex items-center justify-around shrink-0 md:hidden print:hidden z-20">
        <button
          onClick={handlePrint}
          className="flex flex-col items-center gap-1 text-slate-300 hover:text-white cursor-pointer"
        >
          <Printer className="w-5 h-5 text-indigo-400" />
          <span className="text-[10px] font-medium">{lang === 'ku' ? 'چاپ' : 'Print'}</span>
        </button>

        <button
          onClick={() => { sound.play('click'); setIsStoreContactOpen(true); }}
          className="flex flex-col items-center gap-1 text-indigo-400 hover:text-indigo-300 cursor-pointer"
          title={lang === 'ku' ? 'گۆڕینی ناونیشان و پەیوەندی' : 'Change Location & Phone'}
        >
          <MapPin className="w-5 h-5 text-indigo-400" />
          <span className="text-[10px] font-medium">{lang === 'ku' ? 'شوێن' : 'Location'}</span>
        </button>

        <button
          onClick={handleDownloadPDF}
          disabled={isExportingPDF}
          className="flex flex-col items-center gap-1 text-slate-300 hover:text-white cursor-pointer"
        >
          <Download className="w-5 h-5 text-indigo-400" />
          <span className="text-[10px] font-medium">PDF</span>
        </button>

        <button
          onClick={handleWhatsAppPDF}
          disabled={isSharingWhatsApp}
          className="flex flex-col items-center gap-1 text-slate-300 hover:text-white cursor-pointer"
        >
          <MessageCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-[10px] font-medium">WhatsApp</span>
        </button>

        <button
          onClick={handleShare}
          className="flex flex-col items-center gap-1 text-slate-300 hover:text-white cursor-pointer"
        >
          {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5 text-amber-400" />}
          <span className="text-[10px] font-medium">{copied ? (lang === 'ku' ? 'کۆپیکرا' : 'Copied') : (lang === 'ku' ? 'هاوبەشی' : 'Share')}</span>
        </button>

        <button
          onClick={() => { sound.play('click'); onClose(); }}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-rose-400 cursor-pointer"
        >
          <X className="w-5 h-5" />
          <span className="text-[10px] font-medium">{lang === 'ku' ? 'داخستن' : 'Close'}</span>
        </button>
      </footer>

      {/* Editor Modal */}
      {isEditing && currentDoc && (
        <InvoiceEditorModal 
          document={currentDoc} 
          onClose={() => setIsEditing(false)} 
          onSave={handleUpdateDoc} 
          lang={lang} 
        />
      )}

      {/* Store Contact & Location Modal */}
      {isStoreContactOpen && currentDoc && (
        <StoreContactModal 
          isOpen={isStoreContactOpen} 
          onClose={() => setIsStoreContactOpen(false)} 
          document={currentDoc} 
          onUpdateDocument={handleUpdateDoc} 
          lang={lang} 
        />
      )}
    </div>
  );
}
