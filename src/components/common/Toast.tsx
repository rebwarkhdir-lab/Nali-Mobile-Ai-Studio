import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  useEffect(() => {
    const handlePrintWarning = () => {
      addToast('Printing is blocked in this preview window. Please click the "Open in new tab" icon at the top right of AI Studio to print.', 'error');
    };
    window.addEventListener('print-blocked-warning', handlePrintWarning);
    return () => window.removeEventListener('print-blocked-warning', handlePrintWarning);
  }, [addToast]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((msg: string) => addToast(msg, 'success'), [addToast]);
  const error = useCallback((msg: string) => addToast(msg, 'error'), [addToast]);
  const info = useCallback((msg: string) => addToast(msg, 'info'), [addToast]);

  const contextValue = React.useMemo(() => ({
    toast: addToast,
    success,
    error,
    info,
  }), [addToast, success, error, info]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastMessage key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

const ToastMessage: React.FC<{ toast: ToastItem; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  const onDismissRef = React.useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismissRef.current();
    }, 3200);
    return () => clearTimeout(timer);
  }, []);

  const bgColors = {
    success: 'bg-slate-900/95 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10',
    error: 'bg-slate-900/95 border-rose-500/40 text-rose-300 shadow-rose-500/10',
    info: 'bg-slate-900/95 border-indigo-500/40 text-indigo-300 shadow-indigo-500/10',
  };

  const Icon = toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? AlertTriangle : Info;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md ${bgColors[toast.type]}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className="w-5 h-5 shrink-0" />
        <span className="text-sm font-medium text-slate-100 truncate">{toast.message}</span>
      </div>
      <button
        onClick={onDismiss}
        className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if not inside provider
    return {
      toast: (msg: string) => console.log(msg),
      success: (msg: string) => console.log(msg),
      error: (msg: string) => console.error(msg),
      info: (msg: string) => console.info(msg),
    };
  }
  return context;
}
