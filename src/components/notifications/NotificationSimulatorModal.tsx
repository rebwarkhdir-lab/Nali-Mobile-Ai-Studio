import React from 'react';
import { 
  X, 
  Sparkles, 
  Package, 
  Coins, 
  Wrench, 
  ShieldAlert, 
  Play, 
  Zap, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '../../context/NotificationContext';
import { sound } from '../../lib/sound';
import { cn } from '../../lib/utils';

export default function NotificationSimulatorModal() {
  const { isSimulatorOpen, closeSimulator, simulateTrigger } = useNotifications();

  if (!isSimulatorOpen) return null;

  const triggers = [
    {
      id: 'out_of_stock',
      category: 'inventory',
      title: 'Out of Stock (0 Units Critical)',
      desc: 'Simulate iPhone 15 Screen Glass reaching 0 inventory at POS checkout',
      icon: Package,
      priority: 'critical',
      color: 'rose',
      actionKey: 'out_of_stock' as const
    },
    {
      id: 'low_stock',
      category: 'inventory',
      title: 'Low Stock Reorder Threshold',
      desc: 'Simulate Anker 65W charger stock dropping below min reorder level (2 units remaining)',
      icon: Package,
      priority: 'high',
      color: 'amber',
      actionKey: 'low_stock' as const
    },
    {
      id: 'overdue_debt',
      category: 'debt',
      title: 'Urgent Overdue Debt (7 Days)',
      desc: 'Simulate customer debt ($620 USD) overdue with instant WhatsApp reminder trigger',
      icon: Coins,
      priority: 'critical',
      color: 'rose',
      actionKey: 'overdue_debt' as const
    },
    {
      id: 'upcoming_installment',
      category: 'debt',
      title: 'Upcoming Installment (24h)',
      desc: 'Simulate installment plan payment reminder scheduled for tomorrow ($150 USD)',
      icon: Coins,
      priority: 'medium',
      color: 'emerald',
      actionKey: 'upcoming_installment' as const
    },
    {
      id: 'repair_ready',
      category: 'repair',
      title: 'Repair Ticket Ready for Pickup',
      desc: 'Simulate technician marking phone repair ticket #REP-3104 as completed & tested',
      icon: Wrench,
      priority: 'medium',
      color: 'cyan',
      actionKey: 'repair_ready' as const
    },
    {
      id: 'spare_part',
      category: 'repair',
      title: 'Technician Spare Part Request',
      desc: 'Simulate technician requesting replacement iPad digitizer glass from stock room',
      icon: Wrench,
      priority: 'high',
      color: 'amber',
      actionKey: 'spare_part' as const
    },
    {
      id: 'register_discrepancy',
      category: 'security',
      title: 'Cash Drawer Variance (-$45.00)',
      desc: 'Simulate POS register closing balance mismatch against electronic audit record',
      icon: ShieldAlert,
      priority: 'high',
      color: 'purple',
      actionKey: 'register_discrepancy' as const
    },
    {
      id: 'security_login',
      category: 'security',
      title: 'Admin Login from New IP',
      desc: 'Simulate administrative login telemetry event from unrecognized terminal IP',
      icon: ShieldAlert,
      priority: 'low',
      color: 'indigo',
      actionKey: 'security_login' as const
    },
  ];

  const handleFire = (actionKey: typeof triggers[0]['actionKey']) => {
    simulateTrigger(actionKey);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            sound.playClick();
            closeSimulator();
          }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl bg-[#0F172A] border border-[#334155] rounded-3xl p-6 sm:p-7 shadow-[0_0_60px_rgba(0,0,0,0.9)] z-10 overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Real-Time Alert Simulator & Playground</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Live Testing
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Trigger automated business events to test audio chimes, toast popups & RBAC routing
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                closeSimulator();
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Trigger List Grid */}
          <div className="flex-1 overflow-y-auto py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {triggers.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-[#111827] border border-[#334155]/60 hover:border-white/20 transition-all flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                      item.priority === 'critical' ? "bg-rose-500/15 text-rose-400 border-rose-500/30" :
                      item.priority === 'high' ? "bg-amber-500/15 text-amber-400 border-amber-500/30" :
                      item.priority === 'medium' ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" :
                      "bg-slate-500/15 text-slate-400 border-slate-500/30"
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-1.5 py-0.2 text-[9px] font-black rounded border font-mono uppercase tracking-wider",
                          item.priority === 'critical' ? "bg-rose-500/20 text-rose-300 border-rose-500/30" :
                          item.priority === 'high' ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                          "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                        )}>
                          {item.priority}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono capitalize">
                          {item.category}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white mt-1 group-hover:text-indigo-300 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleFire(item.actionKey)}
                    className={cn(
                      "w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95",
                      item.priority === 'critical'
                        ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"
                        : item.priority === 'high'
                        ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20"
                    )}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Fire Alert Trigger</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>Triggers sound chimes, floating toasts & app bell badge in real-time</span>
            </div>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                closeSimulator();
              }}
              className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white font-bold transition-colors"
            >
              Done Testing
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
