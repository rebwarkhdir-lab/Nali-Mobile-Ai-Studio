import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Bell, 
  AlertTriangle, 
  Package, 
  Coins, 
  Wrench, 
  ShieldAlert, 
  ExternalLink,
  MessageCircle, 
  ArrowRight, 
  FileText,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Clock,
  CheckCircle2,
  DollarSign,
  CreditCard,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '../../context/NotificationContext';
import { notificationService } from '../../lib/notificationService';
import { debtService } from '../../lib/debtService';
import { installmentService } from '../../lib/installmentService';
import { useNavigate } from 'react-router';
import { sound } from '../../lib/sound';
import { cn } from '../../lib/utils';
import { shareNotificationInvoicePDF } from '../../services/whatsappShareService';

export default function ToastManager() {
  const { 
    toasts, 
    dismissToast, 
    openCenter, 
    preferences, 
    markAsRead,
    snoozeNotification,
    rotateToastQueue
  } = useNotifications();
  const navigate = useNavigate();

  const safeToasts = Array.isArray(toasts) ? toasts : [];
  const currentToast = (safeToasts?.length || 0) > 0 ? safeToasts[0] : null;
  const currentToastId = currentToast?.id;
  const currentNotificationId = currentToast?.notification?.id;

  // UI state for the active toast
  const [isPaused, setIsPaused] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [showQuickPay, setShowQuickPay] = useState(false);
  const [payMethod, setPayMethod] = useState<'cash' | 'card'>('cash');
  const [isProcessingPay, setIsProcessingPay] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

  // Auto-dismiss progress state (0 to 100%)
  const [progress, setProgress] = useState(100);
  const autoDismissSeconds = Math.max(8, preferences.toastAutoDismissSeconds || 8);

  const isInteracting = isPaused || showSnoozeMenu || showQuickPay || isProcessingPay || paySuccess;

  // Handlers
  const handleDismiss = useCallback((markAsHandled: boolean = true) => {
    if (!currentToastId || !currentNotificationId) return;
    try { sound.playClick(); } catch {}
    if (markAsHandled) {
      markAsRead(currentNotificationId);
    }
    dismissToast(currentToastId, markAsHandled);
  }, [currentToastId, currentNotificationId, markAsRead, dismissToast]);

  const handleDismissRef = useRef(handleDismiss);
  useEffect(() => {
    handleDismissRef.current = handleDismiss;
  }, [handleDismiss]);

  // Reset states when the active toast changes
  useEffect(() => {
    setShowSnoozeMenu(false);
    setShowQuickPay(false);
    setIsProcessingPay(false);
    setPaySuccess(false);
    setProgress(100);
  }, [currentToastId]);

  // Countdown timer for the single active toast
  useEffect(() => {
    if (!currentToastId || isInteracting) return;

    const intervalMs = 100;
    const totalMs = autoDismissSeconds * 1000;
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += intervalMs;
      const remainingPct = Math.max(0, 100 - (elapsed / totalMs) * 100);
      setProgress(remainingPct);

      if (elapsed >= totalMs) {
        clearInterval(interval);
        setTimeout(() => {
          handleDismissRef.current(false);
        }, 0);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [currentToastId, isInteracting, autoDismissSeconds]);

  if (!currentToast) return null;

  const { id: toastId, notification } = currentToast;
  const { title, message, category, priority, metadata = {}, actionUrl } = notification;

  const isCritical = priority === 'critical';
  const isHigh = priority === 'high';
  const hasPayment = (metadata.debtId || metadata.installmentId || metadata.amountDue !== undefined);

  // Format currency with three-digit commas
  const formatAmount = (val?: number, curr: string = 'IQD') => {
    if (val === undefined || isNaN(val)) return null;
    const formatted = Number(val).toLocaleString('en-US');
    return curr === 'USD' ? `$${formatted}` : `${formatted} IQD`;
  };

  const amountDisplay = formatAmount(metadata.amountDue, metadata.currency || 'IQD');

  const handleNext = () => {
    try { sound.playClick(); } catch {}
    rotateToastQueue('next');
  };

  const handlePrev = () => {
    try { sound.playClick(); } catch {}
    rotateToastQueue('prev');
  };

  const handleAction = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // When actioned, immediately remove from unread ring bell
    markAsRead(notification.id);
    dismissToast(toastId, true);
    try { sound.playClick(); } catch {}
    if (actionUrl) {
      navigate(actionUrl);
    } else {
      openCenter();
    }
  };

  const handleSnooze = (duration: { hours?: number; days?: number }, label: string) => {
    try { sound.playClick(); } catch {}
    snoozeNotification(notification.id, duration);
    // Dismiss from toast queue and show next
    dismissToast(toastId, false);
    setShowSnoozeMenu(false);
  };

  const handleQuickPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metadata.amountDue) return;

    setIsProcessingPay(true);
    try {
      if (metadata.debtId) {
        try {
          await debtService.recordPayment(metadata.debtId, {
            amount: metadata.amountDue,
            paymentMethod: payMethod,
            notes: 'Settled via POS Executive Notification'
          });
        } catch (debtErr) {
          console.warn('[ToastManager] Local debt record not found, recording event directly:', debtErr);
        }
      } else if (metadata.installmentId && metadata.scheduleId) {
        try {
          await installmentService.paySchedule(metadata.installmentId, metadata.scheduleId, {
            amount: metadata.amountDue,
            paymentMethod: payMethod,
            notes: 'Settled via POS Executive Notification'
          });
        } catch (instErr) {
          console.warn('[ToastManager] Local installment record not found, recording event directly:', instErr);
        }
      }

      // Notify entire app of recorded payment
      notificationService.handlePaymentRecorded({
        debtId: metadata.debtId,
        installmentId: metadata.installmentId,
        scheduleId: metadata.scheduleId
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('payment_recorded', {
          detail: {
            debtId: metadata.debtId,
            installmentId: metadata.installmentId,
            scheduleId: metadata.scheduleId
          }
        }));
      }

      markAsRead(notification.id);
      try { sound.playPaymentSuccess(); } catch {}
      setPaySuccess(true);

      // Advance after a moment of celebrating success
      setTimeout(() => {
        dismissToast(toastId, true);
      }, 1200);
    } catch (err) {
      console.error('Quick pay failed:', err);
      try { sound.playError(); } catch {}
      setIsProcessingPay(false);
    }
  };

  const handleSharePDF = async (e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead(notification.id);
    try { sound.playClick(); } catch {}
    try {
      await shareNotificationInvoicePDF(notification);
    } catch (err) {
      console.error('Failed to share PDF:', err);
    }
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead(notification.id);
    try { sound.playClick(); } catch {}
    try {
      const link = notificationService.generateWhatsAppReminder(metadata);
      // Create and trigger temporary anchor tag to bypass iframe sandbox window.open blocks
      const a = document.createElement('a');
      a.href = link;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to open WhatsApp:', err);
    }
  };

  return (
    <div className="fixed bottom-[calc(max(env(safe-area-inset-bottom),0.65rem)+4.75rem)] md:bottom-5 right-3 sm:right-5 z-50 flex flex-col max-w-md w-[calc(100%-1.5rem)] sm:w-full pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={toastId}
          initial={{ opacity: 0, y: 35, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.96 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className={cn(
            "pointer-events-auto relative p-4.5 rounded-2xl border shadow-[0_16px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl flex flex-col gap-3 overflow-hidden transition-colors",
            isCritical 
              ? "bg-[#14080F]/95 border-rose-500/40 shadow-rose-950/50 text-rose-100" 
              : isHigh 
              ? "bg-[#161006]/95 border-amber-500/40 shadow-amber-950/50 text-amber-100"
              : "bg-[#0B1120]/95 border-indigo-500/40 shadow-indigo-950/50 text-slate-100"
          )}
        >
          {/* Top Status & Queue Navigation Bar */}
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-2.5">
            <div className="flex items-center gap-2">
              {/* POS Icon */}
              <div className={cn(
                "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border shadow-inner",
                isCritical 
                  ? "bg-rose-500/20 text-rose-400 border-rose-500/40" 
                  : isHigh 
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                  : "bg-indigo-500/20 text-indigo-400 border-indigo-500/40"
              )}>
                {category === 'debt' ? <Coins className="w-3.5 h-3.5" /> :
                 category === 'inventory' ? <Package className="w-3.5 h-3.5" /> :
                 category === 'repair' ? <Wrench className="w-3.5 h-3.5" /> :
                 <ShieldAlert className="w-3.5 h-3.5" />}
              </div>

              {/* Sequential Queue Counter Badge */}
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "px-2 py-0.5 text-[10px] font-black rounded-lg border uppercase tracking-wider font-mono flex items-center gap-1.5",
                  isCritical ? "bg-rose-500/20 text-rose-300 border-rose-500/30" : 
                  isHigh ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                  "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                )}>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full animate-pulse",
                    isCritical ? "bg-rose-400" : isHigh ? "bg-amber-400" : "bg-indigo-400"
                  )} />
                  ALERT 1 OF {safeToasts?.length || 0}
                </span>

                {(safeToasts?.length || 0) > 1 && (
                  <span className="text-[10px] font-semibold text-slate-400 bg-white/[0.05] px-1.5 py-0.5 rounded-md border border-white/[0.06]">
                    +{(safeToasts?.length || 0) - 1} queued
                  </span>
                )}
              </div>
            </div>

            {/* Queue Navigation & Controls */}
            <div className="flex items-center gap-1">
              {(safeToasts?.length || 0) > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrev}
                    title="Previous notification"
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    title="Next notification in queue"
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-3 bg-white/10 mx-0.5" />
                </>
              )}

              {/* Pause/Play Timer */}
              <button
                type="button"
                onClick={() => setIsPaused(p => !p)}
                title={isPaused ? "Resume auto-dismiss timer" : "Pause auto-dismiss timer"}
                className={cn(
                  "p-1 rounded-lg text-slate-400 hover:text-white transition-colors",
                  isPaused ? "bg-amber-500/20 text-amber-300" : "hover:bg-white/10"
                )}
              >
                {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              </button>

              {/* Close / Dismiss */}
              <button
                type="button"
                onClick={() => handleDismiss(true)}
                title="Mark handled and show next"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Main Notification Content */}
          <div className="flex flex-col gap-1.5">
            <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
              {title}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {message}
            </p>
          </div>

          {/* Metadata Highlights (Amount with commas, Customer info) */}
          {(amountDisplay || metadata.customerName || metadata.daysOverdue) && (
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs">
              <div className="flex items-center gap-1.5 truncate">
                {metadata.customerName && (
                  <span className="font-semibold text-white truncate">
                    {metadata.customerName}
                  </span>
                )}
                {metadata.daysOverdue !== undefined && metadata.daysOverdue > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 shrink-0">
                    {metadata.daysOverdue}d overdue
                  </span>
                )}
              </div>

              {amountDisplay && (
                <div className="text-right shrink-0">
                  <span className="font-mono font-black text-amber-300 text-sm tracking-wide">
                    {amountDisplay}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Inline Quick Pay Drawer */}
          <AnimatePresence>
            {showQuickPay && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleQuickPaySubmit}
                className="overflow-hidden flex flex-col gap-2.5 p-3 rounded-xl bg-black/40 border border-emerald-500/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    Instant Settle Payment
                  </span>
                  <span className="text-[11px] font-mono text-emerald-300 font-bold">
                    {amountDisplay}
                  </span>
                </div>

                {paySuccess ? (
                  <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Payment Recorded! Cleared from Ring.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPayMethod('cash')}
                        className={cn(
                          "py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border transition-all",
                          payMethod === 'cash' 
                            ? "bg-emerald-600 text-white border-emerald-500 shadow-sm" 
                            : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                        )}
                      >
                        <Coins className="w-3 h-3" />
                        Cash
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayMethod('card')}
                        className={cn(
                          "py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border transition-all",
                          payMethod === 'card' 
                            ? "bg-emerald-600 text-white border-emerald-500 shadow-sm" 
                            : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                        )}
                      >
                        <CreditCard className="w-3 h-3" />
                        Card
                      </button>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowQuickPay(false)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isProcessingPay}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-transform"
                      >
                        {isProcessingPay ? (
                          <span>Processing...</span>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirm & Settle</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </motion.form>
            )}
          </AnimatePresence>

          {/* Inline Snooze Menu Dropdown */}
          <AnimatePresence>
            {showSnoozeMenu && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-2 rounded-xl bg-slate-900/95 border border-amber-500/30 flex flex-col gap-1 shadow-2xl"
              >
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider px-2 py-0.5">
                  Snooze alert until:
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSnooze({ hours: 1 }, '1 Hour')}
                    className="p-1.5 text-left rounded-lg hover:bg-white/10 text-slate-300 font-medium transition-colors"
                  >
                    ⏱️ 1 Hour
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSnooze({ hours: 4 }, '4 Hours')}
                    className="p-1.5 text-left rounded-lg hover:bg-white/10 text-slate-300 font-medium transition-colors"
                  >
                    ⏱️ 4 Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSnooze({ days: 1 }, 'Tomorrow')}
                    className="p-1.5 text-left rounded-lg hover:bg-white/10 text-slate-300 font-medium transition-colors"
                  >
                    📅 Tomorrow (24h)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSnooze({ days: 3 }, '3 Days')}
                    className="p-1.5 text-left rounded-lg hover:bg-white/10 text-slate-300 font-medium transition-colors"
                  >
                    📅 3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSnooze({ days: 7 }, '1 Week')}
                    className="p-1.5 text-left rounded-lg hover:bg-white/10 text-slate-300 font-medium transition-colors col-span-2"
                  >
                    📅 1 Week (Next week)
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Actions Footer */}
          <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-white/[0.08] flex-wrap">
            <div className="flex items-center gap-1.5">
              {/* Quick Pay Button */}
              {hasPayment && !showQuickPay && (
                <button
                  type="button"
                  onClick={() => setShowQuickPay(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Pay Now</span>
                </button>
              )}

              {/* Main Take Action / Deep Link */}
              <button
                type="button"
                onClick={handleAction}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm",
                  isCritical 
                    ? "bg-rose-600 hover:bg-rose-500 text-white"
                    : isHigh
                    ? "bg-amber-600 hover:bg-amber-500 text-white"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white"
                )}
              >
                <span>View Details</span>
                <ArrowRight className="w-3 h-3" />
              </button>

              {/* Snooze Toggle */}
              <button
                type="button"
                onClick={() => setShowSnoozeMenu(s => !s)}
                title="Snooze this alert for later"
                className={cn(
                  "px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border transition-all active:scale-95",
                  showSnoozeMenu 
                    ? "bg-amber-500/20 border-amber-500 text-amber-300" 
                    : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300"
                )}
              >
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Snooze</span>
              </button>
            </div>

            {/* Right Share / Dismiss */}
            <div className="flex items-center gap-1">
              {metadata.customerPhone && (
                <>
                  <button
                    type="button"
                    onClick={handleSharePDF}
                    title="Send PDF Invoice"
                    className="p-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all active:scale-95"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                  <button
                    type="button"
                    onClick={handleWhatsApp}
                    title="Send WhatsApp text"
                    className="p-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all active:scale-95"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => handleDismiss(true)}
                title="Mark handled & close"
                className="text-[11px] text-slate-400 hover:text-white font-medium px-2 py-1 transition-colors"
              >
                {(safeToasts?.length || 0) > 1 ? "Next ❯" : "Done"}
              </button>
            </div>
          </div>

          {/* Smooth Auto-Dismiss Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/[0.06] overflow-hidden">
            <motion.div
              style={{ width: `${progress}%` }}
              className={cn(
                "h-full transition-all duration-100 ease-linear",
                isInteracting ? "opacity-30" : "opacity-100",
                isCritical ? "bg-rose-500" : isHigh ? "bg-amber-500" : "bg-indigo-500"
              )}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
