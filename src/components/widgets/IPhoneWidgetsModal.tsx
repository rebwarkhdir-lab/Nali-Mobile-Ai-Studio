import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Smartphone, 
  ShoppingCart, 
  AlertTriangle, 
  PackageX, 
  Copy, 
  Check, 
  Sparkles, 
  ExternalLink, 
  RefreshCw, 
  QrCode, 
  Code2, 
  Play, 
  Layers, 
  Radio, 
  Download,
  Share2,
  ChevronRight,
  Wifi,
  BatteryCharging
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { iosWidgetService } from '../../lib/iosWidgetService';
import { IPhoneWidgetData, IPhoneWidgetSize, IPhoneWidgetCategory } from '../../types/widget';
import IPhoneWidgetView from './IPhoneWidgetView';
import { sound } from '../../lib/sound';
import { useToast } from '../common/Toast';

interface IPhoneWidgetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IPhoneWidgetsModal({ isOpen, onClose }: IPhoneWidgetsModalProps) {
  const toast = useToast();
  const [data, setData] = useState<IPhoneWidgetData>(() => iosWidgetService.getData());
  const [selectedSize, setSelectedSize] = useState<IPhoneWidgetSize>('large');
  const [selectedCategory, setSelectedCategory] = useState<IPhoneWidgetCategory>('all');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'install' | 'scriptable'>('preview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = iosWidgetService.subscribe((updated) => {
      setData({ ...updated });
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const widgetDirectUrl = `${currentOrigin}/widgets`;

  const handleCopyUrl = async () => {
    sound.playClick();
    try {
      await navigator.clipboard.writeText(widgetDirectUrl);
      setCopiedUrl(true);
      toast.success('Widget direct URL copied to clipboard!');
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (e) {
      toast.error('Failed to copy URL');
    }
  };

  const handleCopyScriptable = async () => {
    sound.playClick();
    try {
      const code = iosWidgetService.generateScriptableCode(currentOrigin);
      await navigator.clipboard.writeText(code);
      setCopiedScript(true);
      toast.success('iOS Scriptable script copied! Paste into Apple Scriptable app.');
      setTimeout(() => setCopiedScript(false), 2000);
    } catch (e) {
      toast.error('Failed to copy script');
    }
  };

  const handleRefreshData = async () => {
    sound.playClick();
    setIsRefreshing(true);
    await iosWidgetService.syncWithDatabase();
    setIsRefreshing(false);
    toast.success('Live database synchronized with iPhone widgets!');
  };

  const handleSimulateSale = () => {
    sound.playPaymentSuccess();
    const demoItems = [
      { name: 'iPhone 16 Pro Max 256GB Desert', price: 1199.00, cashier: 'Cashier Zana' },
      { name: 'AirPods Pro (2nd Gen) USB-C', price: 249.00, cashier: 'Cashier Sara' },
      { name: 'Anker 65W GaN Fast Charger', price: 38.00, cashier: 'Cashier Dler' },
      { name: 'Torras 360 Spin Magnetic Case', price: 29.00, cashier: 'Cashier Nali' }
    ];
    const picked = demoItems[Math.floor(Math.random() * demoItems.length)];
    iosWidgetService.triggerSimulatedSale(picked.cashier, picked.price, picked.name);
    toast.success(`Simulated cashier sale: ${picked.name} ($${picked.price}) by ${picked.cashier}`);
  };

  const handleSimulateDebt = () => {
    sound.playAlert();
    const demoDebtors = [
      { name: 'Soran Farhad', amount: 120.00 },
      { name: 'Rebwar Rostam', amount: 350.00 },
      { name: 'Hawkar Jamil', amount: 75.00 },
      { name: 'Aram Mustafa', amount: 210.00 }
    ];
    const picked = demoDebtors[Math.floor(Math.random() * demoDebtors.length)];
    iosWidgetService.triggerSimulatedDebtDue(picked.name, picked.amount);
    toast.info(`Simulated debt due today: ${picked.name} ($${picked.amount})`);
  };

  const handleSimulateLowStock = () => {
    sound.playAlert();
    const demoStocks = [
      { name: 'iPhone 15 Clear Case MagSafe', qty: 1, threshold: 4 },
      { name: 'Type-C to Lightning Cable 1m', qty: 0, threshold: 5 },
      { name: 'Privacy Screen Protector 15 Pro', qty: 2, threshold: 6 },
      { name: 'Apple 20W Power Adapter', qty: 1, threshold: 5 }
    ];
    const picked = demoStocks[Math.floor(Math.random() * demoStocks.length)];
    iosWidgetService.triggerSimulatedLowStock(picked.name, picked.qty, picked.threshold);
    toast.info(`Stock reached threshold: ${picked.name} (${picked.qty} left, min ${picked.threshold})`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
          onClick={() => {
            sound.playClick();
            onClose();
          }}
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-4xl bg-[#0b0f1a] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 my-auto flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#0e1322] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>iPhone Live Widgets</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    iOS 16, 17, 18+
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Real-time Home Screen & Lock Screen widgets for cashiers, debts & stock alerts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshData}
                disabled={isRefreshing}
                className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                title="Refresh Live Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
                <span className="hidden sm:inline">Sync DB</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  onClose();
                }}
                className="p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subheader / Tabs */}
          <div className="px-5 py-2.5 bg-[#090d16] border-b border-slate-800 flex items-center justify-between overflow-x-auto gap-3">
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveTab('preview');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'preview'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Live iPhone Simulator
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setActiveTab('install');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'install'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Add to iPhone (Safari / Web Clip)
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setActiveTab('scriptable');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'scriptable'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Apple Scriptable Code
              </button>
            </div>

            {/* Quick Live Stats Pills */}
            <div className="hidden lg:flex items-center gap-2 text-[11px]">
              <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-semibold flex items-center gap-1.5">
                <ShoppingCart className="w-3 h-3 text-emerald-400" />
                <span>{data.stats.todaySalesCount} Sales Today</span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span>{data.stats.pendingDebtsCount} Debts Due</span>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 font-semibold flex items-center gap-1.5">
                <PackageX className="w-3 h-3 text-rose-400" />
                <span>{data.stats.lowStockAlertCount} Low Stock</span>
              </div>
            </div>
          </div>

          {/* Modal Content Body */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {/* ============================================================== */}
            {/* TAB 1: LIVE IPHONE SIMULATOR                                   */}
            {/* ============================================================== */}
            {activeTab === 'preview' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Controls Column */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Size Selector */}
                  <div className="p-4 rounded-2xl bg-[#0f1424] border border-slate-800 space-y-2.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Apple Widget Sizes
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'small' as IPhoneWidgetSize, label: 'Small (2x2)', desc: 'Glanceable 160px' },
                        { id: 'medium' as IPhoneWidgetSize, label: 'Medium (4x2)', desc: 'Split 340px' },
                        { id: 'large' as IPhoneWidgetSize, label: 'Large (4x4)', desc: 'Full 3-in-1 Board' },
                        { id: 'dynamic_island' as IPhoneWidgetSize, label: 'Dynamic Island', desc: 'Lock Screen Activity' }
                      ].map(sz => (
                        <button
                          key={sz.id}
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setSelectedSize(sz.id);
                          }}
                          className={`p-2.5 rounded-xl border text-start transition-all ${
                            selectedSize === sz.id
                              ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div className="text-xs font-bold">{sz.label}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{sz.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Simulator Test Actions */}
                  <div className="p-4 rounded-2xl bg-[#0f1424] border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                        Live Event Triggers
                      </label>
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <Radio className="w-2.5 h-2.5 animate-pulse" />
                        Reactive Updates
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Click below to simulate real store events and watch how the iPhone widget updates instantly:
                    </p>

                    <div className="space-y-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSimulateSale}
                        className="w-full py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center justify-between transition-all active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
                          <span>1. Cashier Sells Something</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-bold">+ New Sale</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSimulateDebt}
                        className="w-full py-2.5 px-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center justify-between transition-all active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span>2. Debt / Installment Due</span>
                        </div>
                        <span className="text-[10px] text-amber-400 font-bold">+ Due Today</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSimulateLowStock}
                        className="w-full py-2.5 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center justify-between transition-all active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-2">
                          <PackageX className="w-3.5 h-3.5 text-rose-400" />
                          <span>3. Stock Reached Threshold</span>
                        </div>
                        <span className="text-[10px] text-rose-400 font-bold">+ Low Stock</span>
                      </button>
                    </div>
                  </div>

                  {/* Direct Launch Actions */}
                  <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-between">
                    <div className="min-w-0 flex-1 me-2">
                      <div className="text-xs font-bold text-white">Standalone iPhone Widget</div>
                      <div className="text-[10px] text-slate-400">Open full-screen widget page in browser</div>
                    </div>
                    <a
                      href="/widgets"
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <span>Open Page</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* iPhone 16 Pro Device Frame Mockup */}
                <div className="lg:col-span-7 flex justify-center">
                  <div className="relative w-full max-w-[380px] rounded-[52px] p-3.5 bg-gradient-to-b from-[#383d47] via-[#20242e] to-[#12141a] shadow-2xl border-4 border-[#4a505e]/60 ring-1 ring-black">
                    
                    {/* Inner iPhone Screen Canvas */}
                    <div className="relative w-full aspect-[9/18.5] bg-gradient-to-br from-[#0e1628] via-[#080d1a] to-[#04060d] rounded-[44px] overflow-hidden flex flex-col justify-between p-4 shadow-inner border border-white/5">
                      
                      {/* Wallpaper Ambient Nebula */}
                      <div className="absolute top-10 start-6 w-52 h-52 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
                      <div className="absolute bottom-16 end-4 w-48 h-48 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none"></div>

                      {/* Top iOS Status Bar + Dynamic Island */}
                      <div className="relative z-20 flex flex-col items-center">
                        <div className="w-full flex items-center justify-between text-white text-[11px] font-semibold px-4 pt-1 select-none">
                          <span>9:41</span>
                          
                          {/* Hardware Dynamic Island Notch */}
                          <div className="w-24 h-6 rounded-full bg-black border border-white/10 flex items-center justify-between px-2.5 shadow-md">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#111] border border-blue-900/40"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-[#080808] flex items-center justify-center">
                              <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Wifi className="w-3 h-3 text-white" />
                            <span className="text-[10px]">5G</span>
                            <div className="w-4 h-2.5 border border-white rounded-[3px] p-[1px] flex items-center">
                              <div className="w-full h-full bg-emerald-400 rounded-[1px]"></div>
                            </div>
                          </div>
                        </div>

                        {/* If dynamic island mode is selected, render it active here */}
                        {selectedSize === 'dynamic_island' && (
                          <div className="mt-4 w-full">
                            <IPhoneWidgetView data={data} size="dynamic_island" />
                          </div>
                        )}
                      </div>

                      {/* Main Widget Placement on iOS Home Screen */}
                      <div className="relative z-10 my-auto flex flex-col items-center justify-center py-2">
                        {selectedSize !== 'dynamic_island' ? (
                          <div className="w-full flex justify-center">
                            <IPhoneWidgetView 
                              data={data} 
                              size={selectedSize} 
                              category={selectedCategory} 
                            />
                          </div>
                        ) : (
                          /* Sample App Icons on Home Screen below Dynamic Island */
                          <div className="w-full space-y-4">
                            <div className="text-center text-slate-400 text-xs py-8">
                              <div className="text-sm font-bold text-white mb-1">Dynamic Island Live Activity</div>
                              Shows floating pill alerts during active cashier sales
                            </div>
                          </div>
                        )}
                      </div>

                      {/* iOS Dock / Home Bar */}
                      <div className="relative z-20 flex flex-col items-center pb-1 select-none">
                        {/* 4 Sample App Icons */}
                        <div className="grid grid-cols-4 gap-4 px-3 py-2.5 rounded-3xl bg-white/10 backdrop-blur-md border border-white/10 w-full mb-3">
                          {['Phone', 'Safari', 'Messages', 'POS'].map((iconName, i) => (
                            <div key={iconName} className="flex flex-col items-center">
                              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-xs shadow-md ${
                                i === 3 ? 'bg-indigo-600' : (i === 1 ? 'bg-blue-500' : 'bg-emerald-500')
                              }`}>
                                {i === 3 ? <ShoppingCart className="w-5 h-5" /> : iconName.substring(0, 1)}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Bottom Home Indicator Bar */}
                        <div className="w-32 h-1 bg-white/80 rounded-full"></div>
                      </div>

                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: ADD DIRECTLY TO IPHONE (SAFARI WEB CLIP)                */}
            {/* ============================================================== */}
            {activeTab === 'install' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="p-5 rounded-2xl bg-[#0f1424] border border-slate-800 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Add to iPhone Home Screen via Safari
                      </h4>
                      <p className="text-xs text-slate-400">
                        Zero setup required • Runs in full screen directly on your iPhone
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">1</span>
                      <div className="text-xs text-slate-300">
                        <strong className="text-white">Open the Widget URL on your iPhone:</strong>
                        <div className="mt-2 flex items-center gap-2">
                          <input 
                            readOnly 
                            value={widgetDirectUrl}
                            className="bg-black/50 border border-slate-700 rounded-xl px-3 py-2 text-xs text-indigo-300 font-mono flex-1 select-all"
                          />
                          <button
                            onClick={handleCopyUrl}
                            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
                          >
                            {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">2</span>
                      <div className="text-xs text-slate-300">
                        In iPhone Safari, tap the <strong className="text-white">Share button</strong> (square with arrow pointing up) at the bottom.
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">3</span>
                      <div className="text-xs text-slate-300">
                        Scroll down and tap <strong className="text-emerald-400">"Add to Home Screen"</strong>. Name it <strong className="text-white">"Nali Widgets"</strong>.
                      </div>
                    </div>
                  </div>
                </div>

                {/* QR Code Quick Scan */}
                <div className="p-5 rounded-2xl bg-[#0f1424] border border-slate-800 flex flex-col sm:flex-row items-center gap-5">
                  <div className="p-3 bg-white rounded-2xl shadow-lg shrink-0">
                    <QRCodeSVG 
                      value={widgetDirectUrl}
                      size={130}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <div className="space-y-2 text-center sm:text-start">
                    <div className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-2">
                      <QrCode className="w-4 h-4 text-indigo-400" />
                      <span>Scan with iPhone Camera</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Point your iPhone camera at this QR code to open the live widget directly on your phone, then bookmark or add to home screen!
                    </p>
                    <a
                      href="/widgets"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 pt-1"
                    >
                      <span>Open widget page in new tab</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 3: NATIVE SCRIPTABLE HOME SCREEN WIDGET (FREE APP)         */}
            {/* ============================================================== */}
            {activeTab === 'scriptable' && (
              <div className="max-w-2xl mx-auto space-y-5">
                <div className="p-5 rounded-2xl bg-[#0f1424] border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 text-black flex items-center justify-center font-bold">
                        <Code2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          Native iOS Home Screen Widget (via Scriptable)
                        </h4>
                        <p className="text-xs text-slate-400">
                          Runs as a true native Apple WidgetKit widget on iPhone Home Screen
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleCopyScriptable}
                      className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-600/30"
                    >
                      {copiedScript ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedScript ? 'Code Copied!' : 'Copy Script Code'}</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed pt-1">
                    <a 
                      href="https://apps.apple.com/app/scriptable/id1405459188" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-indigo-400 hover:underline font-semibold"
                    >
                      Scriptable
                    </a> is a free, popular Apple iOS app that allows JavaScript to render native widgets on your iPhone home screen.
                  </p>

                  <div className="space-y-2.5 pt-2 text-xs text-slate-300">
                    <div className="p-3 rounded-xl bg-black/40 border border-slate-800 flex items-start gap-2.5">
                      <span className="font-bold text-amber-400">Step 1:</span>
                      <span>Download the free <strong className="text-white">Scriptable</strong> app from the App Store on your iPhone.</span>
                    </div>
                    <div className="p-3 rounded-xl bg-black/40 border border-slate-800 flex items-start gap-2.5">
                      <span className="font-bold text-amber-400">Step 2:</span>
                      <span>Open Scriptable, tap <strong className="text-white">+</strong> to add a new script, paste the copied code, and name it <strong className="text-white">Nali POS</strong>.</span>
                    </div>
                    <div className="p-3 rounded-xl bg-black/40 border border-slate-800 flex items-start gap-2.5">
                      <span className="font-bold text-amber-400">Step 3:</span>
                      <span>Go to your iPhone Home Screen, long-press, tap <strong className="text-white">+</strong> in the top-left, select <strong className="text-white">Scriptable</strong>, choose Medium or Large size, and select the <strong className="text-white">Nali POS</strong> script!</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-800 bg-[#0c101d] flex items-center justify-between">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>All cashier sales, debts due & threshold stocks sync live</span>
            </div>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="py-2 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
