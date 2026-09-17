import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  Send, 
  RefreshCw, 
  Phone, 
  Coins, 
  Layers,
  Check
} from 'lucide-react';
import { debtService } from '../../lib/debtService';
import { installmentService } from '../../lib/installmentService';
import { formatCurrency } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useDesignSystem } from '../../context/DesignContext';
import { sound } from '../../lib/sound';
import { useToast } from '../common/Toast';

interface AlertItem {
  id: string;
  type: 'debt' | 'installment';
  title: string;
  subtitle: string;
  customerPhone?: string;
  amount: number;
  currency: 'USD' | 'IQD';
  dueDate: string;
  isOverdue: boolean;
  daysDiff: number; // negative = overdue, 0 = today, positive = upcoming
  entityId: string;
  scheduleId?: string;
  monthNumber?: number;
}

export default function PaymentAlerts() {
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'overdue' | 'debt' | 'installment'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { settings } = useDesignSystem();
  const { success: toastSuccess, error: toastError } = useToast();

  const [snoozeDate, setSnoozeDate] = useState<string>('');
  const [snoozingItem, setSnoozingItem] = useState<AlertItem | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const calculateDaysDiff = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const loadAlerts = async (silent = true) => {
    try {
      if (!silent) setIsRefreshing(true);
      const [allDebts, allInstallments] = await Promise.all([
        debtService.getAllDebts(),
        installmentService.getAllInstallments()
      ]);

      const todayStr = new Date().toISOString().split('T')[0];
      const newAlerts: AlertItem[] = [];

      (allDebts || []).forEach(debt => {
        if (debt.status !== 'paid' && debt.status !== 'cancelled' && debt.remainingAmount > 0) {
          if (debt.snoozedUntil && debt.snoozedUntil > todayStr) return;
          if (debt.dueDate <= todayStr) {
            const days = calculateDaysDiff(debt.dueDate);
            newAlerts.push({
              id: `debt-${debt.id}`,
              type: 'debt',
              title: debt.customerName,
              subtitle: 'Customer Debt Balance',
              customerPhone: debt.customerPhone,
              amount: debt.remainingAmount,
              currency: debt.currency,
              dueDate: debt.dueDate,
              isOverdue: debt.dueDate < todayStr,
              daysDiff: days,
              entityId: debt.id
            });
          }
        }
      });

      (allInstallments || []).forEach(plan => {
        if (plan.status !== 'completed' && plan.status !== 'cancelled') {
          plan.schedules?.forEach(sch => {
            const remaining = sch.amountDue - (sch.amountPaid || 0);
            if (sch.status !== 'paid' && remaining > 0) {
              if (sch.snoozedUntil && sch.snoozedUntil > todayStr) return;
              if (sch.dueDate <= todayStr) {
                const days = calculateDaysDiff(sch.dueDate);
                newAlerts.push({
                  id: `inst-${sch.id}`,
                  type: 'installment',
                  title: plan.customerName,
                  subtitle: `Installment (Month ${sch.monthNumber})`,
                  customerPhone: plan.customerPhone,
                  amount: remaining,
                  currency: plan.currency,
                  dueDate: sch.dueDate,
                  isOverdue: sch.dueDate < todayStr,
                  daysDiff: days,
                  entityId: plan.id,
                  scheduleId: sch.id,
                  monthNumber: sch.monthNumber
                });
              }
            }
          });
        }
      });

      newAlerts.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      setAlerts(newAlerts);
    } catch (err) {
      console.error('Failed to load alerts', err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAlerts(true);
    const handleUpdate = () => loadAlerts(true);
    window.addEventListener("payment_recorded", handleUpdate);
    window.addEventListener("debts_updated", handleUpdate);
    window.addEventListener("installments_updated", handleUpdate);
    window.addEventListener("scan_reminders", handleUpdate);
    return () => {
      window.removeEventListener("payment_recorded", handleUpdate);
      window.removeEventListener("debts_updated", handleUpdate);
      window.removeEventListener("installments_updated", handleUpdate);
      window.removeEventListener("scan_reminders", handleUpdate);
    };
  }, []);

  const handleSnooze = async () => {
    if (!snoozingItem || !snoozeDate) return;
    try {
      if (snoozingItem.type === 'debt') {
        const debts = await debtService.getAllDebts();
        const debt = debts.find(d => d.id === snoozingItem.entityId);
        if (debt) {
          await debtService.updateDebt({ ...debt, snoozedUntil: snoozeDate });
        }
      } else {
        const plans = await installmentService.getAllInstallments();
        const plan = plans.find(p => p.id === snoozingItem.entityId);
        if (plan && snoozingItem.scheduleId) {
          const updatedSchedules = (plan.schedules || []).map(sch => 
            sch.id === snoozingItem.scheduleId ? { ...sch, snoozedUntil: snoozeDate } : sch
          );
          await installmentService.updateInstallmentPlan({ ...plan, schedules: updatedSchedules });
        }
      }
      toastSuccess('Alert snoozed until ' + snoozeDate);
      setSnoozingItem(null);
      setSnoozeDate('');
      loadAlerts(true);
    } catch (e) {
      console.error(e);
      toastError('Failed to snooze alert.');
    }
  };

  const handleQuickSnoozeDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setSnoozeDate(d.toISOString().split('T')[0]);
  };

  const handleDirectPay = async (alert: AlertItem) => {
    setProcessingId(alert.id);
    try {
      if (alert.type === 'debt') {
        await debtService.recordPayment(alert.entityId, {
          amount: alert.amount,
          paymentMethod: 'cash',
          notes: 'Paid via alerts quick action.'
        });
      } else if (alert.type === 'installment' && alert.scheduleId) {
        await installmentService.paySchedule(alert.entityId, alert.scheduleId, {
          amount: alert.amount,
          paymentMethod: 'cash',
          notes: 'Paid via alerts quick action.'
        });
      }
      sound.playPaymentSuccess();
      toastSuccess(`Recorded ${formatCurrency(alert.amount, alert.currency)} for ${alert.title}!`);
      await loadAlerts(true);
      window.dispatchEvent(new CustomEvent("payment_recorded"));
    } catch (e) {
      console.error('Direct pay failed:', e);
      toastError('Failed to record payment.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleWhatsAppReminder = (alert: AlertItem) => {
    sound.playClick();
    if (!alert.customerPhone) {
      toastError('No phone number recorded for this customer.');
      return;
    }
    const cleanPhone = alert.customerPhone.replace(/[^0-9]/g, '');
    let text = '';
    if (alert.type === 'debt') {
      text = `Dear ${alert.title},\nThis is a friendly reminder from Nali Mobile Store regarding your outstanding debt balance of ${formatCurrency(alert.amount, alert.currency)} (Due Date: ${alert.dueDate}).\nPlease visit our store or contact us to settle your balance.\nThank you! - Nali Mobile`;
    } else {
      text = `Dear ${alert.title},\nThis is a friendly reminder from Nali Mobile Store regarding your Month ${alert.monthNumber || 1} installment payment of ${formatCurrency(alert.amount, alert.currency)} (Due Date: ${alert.dueDate}).\nThank you! - Nali Mobile`;
    }
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const filteredAlerts = (alerts || []).filter(a => {
    if (activeFilter === 'overdue') return a.isOverdue;
    if (activeFilter === 'debt') return a.type === 'debt';
    if (activeFilter === 'installment') return a.type === 'installment';
    return true;
  });

  const overdueCount = (alerts || []).filter(a => a.isOverdue).length;
  const debtsCount = (alerts || []).filter(a => a.type === 'debt').length;
  const instCount = (alerts || []).filter(a => a.type === 'installment').length;

  // Calculate totals
  const totalUsd = (alerts || []).filter(a => a.currency === 'USD').reduce((sum, a) => sum + a.amount, 0);
  const totalIqd = (alerts || []).filter(a => a.currency === 'IQD').reduce((sum, a) => sum + a.amount, 0);

  return (
    <>
      <div className="relative">
        <button 
          onClick={() => {
            sound.playClick();
            setIsOpen(true);
          }}
          className="relative p-2 sm:p-2.5 text-slate-300 hover:text-white bg-slate-800/40 hover:bg-slate-800 active:scale-95 transition-all border border-slate-700/50 hover:border-slate-600 rounded-xl"
          aria-label="Payment Alerts"
          title="Open Payment Reminders"
        >
          <Bell className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${(alerts?.length || 0) > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
          {(alerts?.length || 0) > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white shadow-md shadow-rose-500/40 animate-pulse">
              {(alerts?.length || 0) > 99 ? '99+' : alerts?.length || 0}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Slide-over Dashboard Viewport */}
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="relative w-full sm:w-[460px] max-w-full bg-[#080c16] border-l border-slate-800 shadow-2xl z-10 flex flex-col h-[100dvh] overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-800/80 bg-[#0c101e] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 shadow-sm">
                    <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-sm sm:text-base text-white tracking-tight leading-tight">Payment Dues</h2>
                      {(alerts?.length || 0) > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {alerts?.length || 0} Pending
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">Installments & customer debt ledger</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      sound.playClick();
                      loadAlerts(false);
                    }}
                    disabled={isRefreshing}
                    className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 active:scale-95 transition-all cursor-pointer"
                    title="Refresh alerts"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
                  </button>
                  <button 
                    onClick={() => {
                      sound.playClick();
                      setIsOpen(false);
                    }} 
                    className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 active:scale-95 transition-all cursor-pointer"
                    aria-label="Close drawer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Tabs & Outstanding Summary */}
              {(alerts?.length || 0) > 0 && (
                <div className="px-4 py-2.5 sm:px-5 bg-[#090d1a] border-b border-slate-800/80 shrink-0 space-y-2">
                  {/* Segmented Filter Pills */}
                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900/90 border border-slate-800/80 rounded-xl text-[11px] font-medium">
                    <button
                      onClick={() => { sound.playClick(); setActiveFilter('all'); }}
                      className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${activeFilter === 'all' ? 'bg-indigo-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      All ({alerts?.length || 0})
                    </button>
                    <button
                      onClick={() => { sound.playClick(); setActiveFilter('overdue'); }}
                      className={`py-1.5 rounded-lg text-center transition-all flex items-center justify-center gap-1 cursor-pointer ${activeFilter === 'overdue' ? 'bg-rose-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      {overdueCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />}
                      <span>Late ({overdueCount})</span>
                    </button>
                    <button
                      onClick={() => { sound.playClick(); setActiveFilter('debt'); }}
                      className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${activeFilter === 'debt' ? 'bg-amber-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Debts ({debtsCount})
                    </button>
                    <button
                      onClick={() => { sound.playClick(); setActiveFilter('installment'); }}
                      className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${activeFilter === 'installment' ? 'bg-purple-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Inst. ({instCount})
                    </button>
                  </div>

                  {/* Summary Bar */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-[11px] text-slate-400">Total Outstanding:</span>
                    <div className="flex items-center gap-2 font-mono font-bold text-white">
                      {totalUsd > 0 && <span className="text-emerald-400">${totalUsd.toLocaleString()}</span>}
                      {totalUsd > 0 && totalIqd > 0 && <span className="text-slate-600">•</span>}
                      {totalIqd > 0 && <span className="text-cyan-400">{totalIqd.toLocaleString()} IQD</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Scrollable Alerts Content Area */}
              <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-2.5 bg-[#080c16] overscroll-contain pb-16 sm:pb-6">
                {(alerts?.length || 0) === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">All Caught Up!</h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
                        No pending or overdue payments scheduled for today.
                      </p>
                    </div>
                  </div>
                ) : (filteredAlerts?.length || 0) === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No payment alerts match this filter.
                  </div>
                ) : (
                  filteredAlerts.map(alert => {
                    const isProcessing = processingId === alert.id;
                    return (
                      <motion.div 
                        key={alert.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`rounded-2xl border p-3.5 transition-all relative overflow-hidden ${
                          alert.isOverdue 
                            ? 'bg-rose-950/15 border-rose-500/30' 
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Top Indicator Accent */}
                        {alert.isOverdue && (
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-rose-400 to-rose-600" />
                        )}

                        {/* Card Header: Customer & Badges */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-white text-sm truncate leading-tight">
                                {alert.title}
                              </h4>
                              {alert.isOverdue ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0 flex items-center gap-0.5">
                                  <AlertCircle className="w-2.5 h-2.5" />
                                  {Math.abs(alert.daysDiff)}d Late
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                                  Due Today
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span className="truncate">{alert.subtitle}</span>
                              {alert.customerPhone && (
                                <>
                                  <span className="text-slate-600">•</span>
                                  <span className="font-mono text-slate-300">{alert.customerPhone}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Amount */}
                          <div className="text-right shrink-0">
                            <div className="font-bold font-mono text-white text-sm sm:text-base leading-tight">
                              {formatCurrency(alert.amount, alert.currency)}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 justify-end mt-0.5">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>{alert.dueDate}</span>
                            </div>
                          </div>
                        </div>

                        {/* Card Actions Bar (WhatsApp + Mark Paid + Snooze) */}
                        <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.06]">
                          {/* Mark as Paid Action */}
                          <button 
                            onClick={() => handleDirectPay(alert)}
                            disabled={isProcessing}
                            className="flex-1 py-2 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Mark Paid</span>
                              </>
                            )}
                          </button>

                          {/* Direct WhatsApp Reminder Action */}
                          <button 
                            onClick={() => handleWhatsAppReminder(alert)}
                            disabled={isProcessing}
                            className="py-2 px-2.5 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1 active:scale-95"
                            title="Send WhatsApp Reminder to Customer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline text-[11px]">WhatsApp</span>
                          </button>

                          {/* Snooze Action */}
                          <button 
                            onClick={() => {
                              sound.playClick();
                              setSnoozingItem(alert);
                              handleQuickSnoozeDays(3);
                            }}
                            disabled={isProcessing}
                            className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-300 text-xs font-medium rounded-xl transition-all flex items-center justify-center gap-1 active:scale-95"
                            title="Snooze reminder to a later date"
                          >
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span className="hidden sm:inline text-[11px]">Snooze</span>
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modern Snooze Modal */}
      <AnimatePresence>
        {snoozingItem && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm" 
              onClick={() => setSnoozingItem(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-sm bg-[#0C101E] border border-slate-700/80 rounded-2xl p-5 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Snooze Reminder</h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{snoozingItem.title}</p>
                </div>
              </div>
              
              {/* Quick Presets */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Quick Presets
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickSnoozeDays(1)}
                    className="py-1.5 px-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSnoozeDays(3)}
                    className="py-1.5 px-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
                  >
                    +3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSnoozeDays(7)}
                    className="py-1.5 px-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
                  >
                    +1 Week
                  </button>
                </div>
              </div>

              {/* Custom Date Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Resume Alerts On
                </label>
                <input 
                  type="date"
                  value={snoozeDate}
                  onChange={e => setSnoozeDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500 transition-all font-mono"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setSnoozingItem(null)}
                  className="flex-1 py-2 text-slate-400 hover:text-white bg-slate-800/80 rounded-xl transition-colors text-xs font-semibold"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSnooze}
                  disabled={!snoozeDate}
                  className="flex-1 py-2 text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl transition-colors text-xs font-semibold shadow-sm"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

