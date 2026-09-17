import React, { useState } from 'react';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  ShieldAlert, 
  Package, 
  Coins, 
  Wrench, 
  Lock, 
  Clock, 
  ExternalLink, 
  MessageCircle, 
  Phone, 
  Check, 
  RotateCcw, 
  Trash2, 
  Calendar,
  Building2,
  User,
  ShoppingBag,
  ArrowRight,
  FileText,
  Share2
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { AppNotification, NotificationPriority } from '../../types/notification';
import { notificationService } from '../../lib/notificationService';
import { useNotifications } from '../../context/NotificationContext';
import { formatCurrency, cn } from '../../lib/utils';
import { sound } from '../../lib/sound';
import { shareNotificationInvoicePDF } from '../../services/whatsappShareService';
import { useToast } from '../common/Toast';
import { debtService } from '../../lib/debtService';
import { installmentService } from '../../lib/installmentService';

interface NotificationCardProps {
  key?: React.Key;
  notification: AppNotification;
  onCloseCenter?: () => void;
}

export default function NotificationCard({ notification, onCloseCenter }: NotificationCardProps) {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [showQuickPay, setShowQuickPay] = useState(false);
  const [payMethod, setPayMethod] = useState<'cash' | 'card'>('cash');
  const [isPaying, setIsPaying] = useState(false);
  const { 
    markAsRead, 
    markAsUnread, 
    deleteNotification, 
    snoozeNotification,
    unsnoozeNotification
  } = useNotifications();

  const {
    id,
    category,
    priority,
    title,
    message,
    metadata = {},
    isRead,
    createdAt,
    actionUrl,
    targetRole
  } = notification;

  // Relative Time Formatter
  const getRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  // Priority Styling Mapping
  const getPriorityBadge = (p: NotificationPriority) => {
    switch (p) {
      case 'critical':
        return {
          bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-500',
          label: 'CRITICAL'
        };
      case 'high':
        return {
          bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-500',
          label: 'HIGH'
        };
      case 'medium':
        return {
          bg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
          dot: 'bg-indigo-500',
          label: 'NORMAL'
        };
      default:
        return {
          bg: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
          dot: 'bg-slate-500',
          label: 'INFO'
        };
    }
  };

  // Category Icon & Accent Mapping
  const getCategoryIcon = () => {
    switch (category) {
      case 'inventory':
        return <Package className="w-4 h-4 text-amber-400" />;
      case 'debt':
        return <Coins className="w-4 h-4 text-emerald-400" />;
      case 'supplier':
        return <Building2 className="w-4 h-4 text-sky-400" />;
      case 'repair':
        return <Wrench className="w-4 h-4 text-cyan-400" />;
      case 'security':
        return <ShieldAlert className="w-4 h-4 text-purple-400" />;
      default:
        return <Info className="w-4 h-4 text-indigo-400" />;
    }
  };

  const priorityStyle = getPriorityBadge(priority);

  // Navigate / Deep Link Handler
  const handleNavigate = () => {
    if (!isRead) markAsRead(id);
    if (actionUrl) {
      sound.playClick();
      navigate(actionUrl);
      if (onCloseCenter) onCloseCenter();
    }
  };

  // WhatsApp PDF Invoice Direct Generator & Share Handler
  const handleSharePDF = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGeneratingPDF(true);
    sound.playClick();
    try {
      const result = await shareNotificationInvoicePDF(notification);
      if (result.success) {
        markAsRead(id);
        if (result.mode === 'desktop_download') {
          success(`PDF Invoice downloaded (${result.filename}) & WhatsApp Web opened!`);
        } else {
          success('Invoice shared successfully via WhatsApp!');
        }
      }
    } catch (err) {
      console.error('Failed to share PDF invoice via WhatsApp:', err);
      toastError('Failed to generate or share PDF invoice.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // WhatsApp Action Handler
  const handleOpenWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead(id);
    try {
      const link = notificationService.generateWhatsAppReminder(metadata);
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

  // SMS Action Handler
  const handleOpenSMS = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = notificationService.generateSMSReminder(metadata);
    window.location.href = link;
    markAsRead(id);
  };

  return (
    <div
      id={`notification-item-${id}`}
      className={cn(
        "group relative p-4 rounded-2xl border transition-all duration-200 flex flex-col gap-3",
        !isRead 
          ? "bg-[#111827]/90 border-indigo-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:border-indigo-500/50" 
          : "bg-[#0B0F19]/80 border-white/[0.06] hover:border-white/[0.12] opacity-85 hover:opacity-100"
      )}
    >
      {/* Top Header: Category, Severity, Target Role & Timestamp */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Icon */}
          <div className="w-7 h-7 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
            {getCategoryIcon()}
          </div>

          {/* Severity Badge */}
          <span className={cn("px-2 py-0.5 rounded-lg text-[10px] font-black border uppercase tracking-wider flex items-center gap-1.5 font-mono", priorityStyle.bg)}>
            <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", priorityStyle.dot)} />
            {priorityStyle.label}
          </span>

          {/* Role Filter Tag */}
          {targetRole !== 'All' && (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/[0.03] text-slate-400 border border-white/[0.06] font-mono">
              @{targetRole}
            </span>
          )}

          {/* Unread indicator dot */}
          {!isRead && (
            <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
          )}
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1 text-slate-500 text-[11px] font-medium shrink-0">
          <Clock className="w-3 h-3" />
          <span>{getRelativeTime(createdAt)}</span>
        </div>
      </div>

      {/* Main Content: Title & Message */}
      <div>
        <h4 className={cn(
          "text-sm font-bold tracking-tight leading-snug",
          !isRead ? "text-white" : "text-slate-300"
        )}>
          {title}
        </h4>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          {message}
        </p>
      </div>

      {/* Structured Rich Metadata Chips */}
      {metadata && Object.keys(metadata).length > 0 && (
        <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.04] flex flex-wrap items-center gap-2 text-xs">
          {/* Inventory Specific Chips */}
          {metadata.sku && (
            <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-300 border border-white/[0.06] font-mono text-[11px]">
              SKU: {metadata.sku}
            </span>
          )}
          {metadata.currentStock !== undefined && (
            <span className={cn(
              "px-2 py-0.5 rounded-md text-[11px] font-bold border",
              metadata.currentStock === 0 
                ? "bg-rose-500/20 text-rose-300 border-rose-500/30" 
                : "bg-amber-500/20 text-amber-300 border-amber-500/30"
            )}>
              Stock: {metadata.currentStock} left (Min: {metadata.minReorderLevel || 3})
            </span>
          )}

          {/* Debt & Installment Specific Chips */}
          {metadata.customerName && (
            <span className="flex items-center gap-1 text-slate-300 font-semibold">
              <User className="w-3 h-3 text-slate-400" />
              {metadata.customerName}
            </span>
          )}
          {metadata.amountDue !== undefined && (
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-bold font-mono text-[11px]">
              Due: {metadata.currency === 'USD' ? `$${Number(metadata.amountDue).toLocaleString('en-US')}` : `${Number(metadata.amountDue).toLocaleString('en-US')} IQD`}
            </span>
          )}
          {metadata.daysOverdue !== undefined && metadata.daysOverdue > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold">
              {metadata.daysOverdue} days overdue
            </span>
          )}

          {/* Repair Ticket Chips */}
          {metadata.ticketNumber && (
            <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 font-mono text-[11px] font-bold">
              Ticket: #{metadata.ticketNumber}
            </span>
          )}
          {metadata.deviceModel && (
            <span className="text-slate-300 text-[11px]">
              Device: <b className="text-white">{metadata.deviceModel}</b>
            </span>
          )}
          {metadata.technicianName && (
            <span className="text-slate-400 text-[11px]">
              Tech: {metadata.technicianName}
            </span>
          )}

          {/* Security & Register Chips */}
          {metadata.registerId && (
            <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/25 font-mono text-[11px]">
              Register: {metadata.registerId}
            </span>
          )}
          {metadata.discrepancyAmount !== undefined && (
            <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold font-mono text-[11px]">
              Discrepancy: {Number(metadata.discrepancyAmount).toLocaleString('en-US')} {metadata.currency || 'USD'}
            </span>
          )}
          {metadata.ipAddress && (
            <span className="text-slate-400 font-mono text-[10px]">
              IP: {metadata.ipAddress}
            </span>
          )}
        </div>
      )}

      {/* Snoozed State Banner if currently snoozed */}
      {notification.snoozedUntil && new Date(notification.snoozedUntil).getTime() > Date.now() && (
        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-amber-300 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>Snoozed until {new Date(notification.snoozedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(notification.snoozedUntil).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              unsnoozeNotification(id);
              success('Alert unsnoozed and returned to active list');
            }}
            className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold transition-colors"
          >
            Unsnooze
          </button>
        </div>
      )}

      {/* Inline Quick Pay Drawer */}
      {showQuickPay && metadata.amountDue && (
        <div className="p-3 rounded-xl bg-black/60 border border-emerald-500/40 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" />
              Instant Settlement:
            </span>
            <span className="font-mono font-black text-emerald-300">
              {metadata.currency === 'USD' ? `$${Number(metadata.amountDue).toLocaleString('en-US')}` : `${Number(metadata.amountDue).toLocaleString('en-US')} IQD`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPayMethod('cash')}
              className={cn(
                "flex-1 py-1 text-xs font-bold rounded-lg border transition-all",
                payMethod === 'cash' ? "bg-emerald-600 text-white border-emerald-500" : "bg-white/5 text-slate-400 border-white/10"
              )}
            >
              Cash
            </button>
            <button
              type="button"
              onClick={() => setPayMethod('card')}
              className={cn(
                "flex-1 py-1 text-xs font-bold rounded-lg border transition-all",
                payMethod === 'card' ? "bg-emerald-600 text-white border-emerald-500" : "bg-white/5 text-slate-400 border-white/10"
              )}
            >
              Card
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowQuickPay(false)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isPaying}
              onClick={async (e) => {
                e.stopPropagation();
                setIsPaying(true);
                try {
                  if (metadata.debtId) {
                    try {
                      await debtService.recordPayment(metadata.debtId, {
                        amount: metadata.amountDue!,
                        paymentMethod: payMethod,
                        notes: 'Paid via Notification Card'
                      });
                    } catch (debtErr) {
                      console.warn('[NotificationCard] Debt local record not found, recording event directly:', debtErr);
                    }
                  } else if (metadata.installmentId && metadata.scheduleId) {
                    try {
                      await installmentService.paySchedule(metadata.installmentId, metadata.scheduleId, {
                        amount: metadata.amountDue!,
                        paymentMethod: payMethod,
                        notes: 'Paid via Notification Card'
                      });
                    } catch (instErr) {
                      console.warn('[NotificationCard] Installment local record not found, recording event directly:', instErr);
                    }
                  }

                  notificationService.handlePaymentRecorded({
                    debtId: metadata.debtId,
                    installmentId: metadata.installmentId,
                    scheduleId: metadata.scheduleId
                  });

                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('payment_recorded', {
                      detail: { debtId: metadata.debtId, installmentId: metadata.installmentId, scheduleId: metadata.scheduleId }
                    }));
                  }

                  markAsRead(id);
                  try { sound.playPaymentSuccess(); } catch {}
                  success('Payment recorded! Alert removed from ring.');
                  setShowQuickPay(false);
                } catch (err) {
                  toastError('Failed to record payment');
                } finally {
                  setIsPaying(false);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              {isPaying ? 'Recording...' : 'Confirm & Settle'}
            </button>
          </div>
        </div>
      )}

      {/* Snooze Presets Dropdown */}
      {showSnoozeMenu && (
        <div className="p-2 rounded-xl bg-slate-900 border border-amber-500/30 flex flex-col gap-1 text-xs">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider px-1">Snooze this alert for:</span>
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                snoozeNotification(id, { hours: 1 });
                setShowSnoozeMenu(false);
                success('Snoozed for 1 hour');
              }}
              className="p-1.5 text-left rounded hover:bg-white/10 text-slate-300 font-medium"
            >
              ⏱️ 1 Hour
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                snoozeNotification(id, { hours: 4 });
                setShowSnoozeMenu(false);
                success('Snoozed for 4 hours');
              }}
              className="p-1.5 text-left rounded hover:bg-white/10 text-slate-300 font-medium"
            >
              ⏱️ 4 Hours
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                snoozeNotification(id, { days: 1 });
                setShowSnoozeMenu(false);
                success('Snoozed until tomorrow');
              }}
              className="p-1.5 text-left rounded hover:bg-white/10 text-slate-300 font-medium"
            >
              📅 1 Day (Tomorrow)
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                snoozeNotification(id, { days: 3 });
                setShowSnoozeMenu(false);
                success('Snoozed for 3 days');
              }}
              className="p-1.5 text-left rounded hover:bg-white/10 text-slate-300 font-medium"
            >
              📅 3 Days
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                snoozeNotification(id, { days: 7 });
                setShowSnoozeMenu(false);
                success('Snoozed for 1 week');
              }}
              className="p-1.5 text-left rounded hover:bg-white/10 text-slate-300 font-medium col-span-2"
            >
              📅 1 Week (7 Days)
            </button>
          </div>
        </div>
      )}

      {/* Bottom Action Controls */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.04]">
        {/* Left Contextual Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Quick Pay Direct Trigger */}
          {metadata.amountDue !== undefined && !showQuickPay && (
            <button
              type="button"
              onClick={() => setShowQuickPay(true)}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Quick Pay</span>
            </button>
          )}

          {/* WhatsApp Direct Action for Customer Debt / Installment */}
          {metadata.customerPhone && (
            <>
              <button
                type="button"
                disabled={isGeneratingPDF}
                onClick={handleSharePDF}
                title="Generate & Send Official PDF Invoice via WhatsApp"
                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600/25 to-teal-600/25 hover:from-emerald-600/35 hover:to-teal-600/35 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isGeneratingPDF ? 'Generating...' : 'WhatsApp PDF'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenWhatsApp}
                title="Send Quick Text Reminder"
                className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Chat</span>
              </button>
            </>
          )}

          {/* Deep link Action Button (Reorder, View Debt, View Ticket, etc.) */}
          {actionUrl && (
            <button
              type="button"
              onClick={handleNavigate}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
            >
              {category === 'inventory' ? (
                <>
                  <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Reorder Stock</span>
                </>
              ) : category === 'debt' ? (
                <>
                  <Coins className="w-3.5 h-3.5 text-indigo-400" />
                  <span>View Debt</span>
                </>
              ) : category === 'repair' ? (
                <>
                  <Wrench className="w-3.5 h-3.5 text-indigo-400" />
                  <span>View Repair Job</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                  <span>View Details</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Right Utility Buttons (Mark read, Snooze Menu, Delete) */}
        <div className="flex items-center gap-1 text-slate-400 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isRead) markAsUnread(id);
              else markAsRead(id);
            }}
            title={isRead ? "Mark as unread" : "Mark as read"}
            className="p-1.5 rounded-lg hover:bg-white/5 hover:text-white transition-colors text-xs flex items-center gap-1"
          >
            {isRead ? <RotateCcw className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowSnoozeMenu(s => !s);
            }}
            title="Snooze Reminder options"
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              showSnoozeMenu ? "bg-amber-500/20 text-amber-300" : "hover:bg-amber-500/10 hover:text-amber-400"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              deleteNotification(id);
            }}
            title="Dismiss / Neglect"
            className="p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
