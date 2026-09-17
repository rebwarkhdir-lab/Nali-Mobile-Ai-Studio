import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, RefreshCcw, AlertTriangle, X, ShieldAlert, FileText, Smartphone, Package, Coins } from 'lucide-react';
import { recycleBinService, RecycleBinItem } from '../../lib/recycleBinService';
import { sound } from '../../lib/sound';
import { useToast } from './Toast';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

interface RecycleBinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RecycleBinModal({ isOpen, onClose }: RecycleBinModalProps) {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const [items, setItems] = useState<RecycleBinItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await recycleBinService.getDeletedItems();
      setItems(data);
    } catch (e) {
      console.error(e);
      error("Failed to load recycle bin");
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (id: string) => {
    sound.playClick();
    const result = await recycleBinService.restoreItem(id);
    if (result) {
      success("Item recovered successfully. Please refresh the page if needed.");
      setItems(prev => prev.filter(i => i.id !== id));
    } else {
      error("Failed to recover item. It might already exist or the network failed.");
    }
  };

  const handleDeletePermanently = (id: string) => {
    sound.playAlert();
    setItemToDelete(id);
  };

  const executeDelete = async () => {
    if (!itemToDelete) return;
    await recycleBinService.permanentlyDelete(itemToDelete);
    success("Item permanently deleted");
    setItems(prev => prev.filter(i => i.id !== itemToDelete));
    setItemToDelete(null);
  };

  const handleEmptyBin = () => {
    sound.playAlert();
    setConfirmEmpty(true);
  };

  const executeEmptyBin = async () => {
    await recycleBinService.clearBin();
    success("Recycle bin emptied");
    setItems([]);
    setConfirmEmpty(false);
  };

  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'mobile': return <Smartphone className="w-4 h-4 text-sky-400" />;
      case 'accessory': return <Package className="w-4 h-4 text-purple-400" />;
      case 'debt':
      case 'installment': return <Coins className="w-4 h-4 text-emerald-400" />;
      default: return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-[#0b0f1a] border border-white/10 rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
              <Trash2 className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Recycle Bin</h2>
              <p className="text-xs text-slate-400">Recover or permanently delete removed items</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
          <div className="text-sm text-slate-300 font-medium">
            {items?.length || 0} {(items?.length || 0) === 1 ? 'Item' : 'Items'} in Bin
          </div>
          {(items?.length || 0) > 0 && (
            <button
              onClick={handleEmptyBin}
              className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <ShieldAlert className="w-4 h-4" />
              Empty Recycle Bin
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (items?.length || 0) === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 border border-slate-700/50">
                <Trash2 className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-base font-bold text-slate-300 mb-1">Recycle Bin is Empty</h3>
              <p className="text-sm text-slate-500">No deleted items found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(item => (
                <div 
                  key={item.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-4 group hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex flex-1 items-start gap-4 overflow-hidden">
                    <div className="mt-1 p-2 bg-slate-800 rounded-lg">
                      {getTypeIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          {item.type}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
                          {format(new Date(item.deletedAt), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-white truncate">
                        {item.name || 'Unnamed Item'}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 truncate">
                        ID: {item.originalId}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleRecover(item.id)}
                      className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors border border-indigo-500/20 flex items-center gap-1.5 text-xs font-semibold"
                      title="Recover Item"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                      Recover
                    </button>
                    <button
                      onClick={() => handleDeletePermanently(item.id)}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors border border-rose-500/20"
                      title="Delete Permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Item Confirmation */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b0f1a] w-full max-w-sm rounded-2xl border border-rose-500/30 p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Delete Permanently?</h3>
            <p className="text-xs text-slate-400 mb-6">
              Are you sure you want to permanently delete this item? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-rose-900/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty Bin Confirmation */}
      {confirmEmpty && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b0f1a] w-full max-w-sm rounded-2xl border border-rose-500/30 p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Empty Recycle Bin?</h3>
            <p className="text-xs text-slate-400 mb-6">
              Are you sure you want to empty the entire recycle bin? All items will be permanently deleted from the database.
            </p>
            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={() => setConfirmEmpty(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeEmptyBin}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-rose-900/20"
              >
                Empty Bin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
