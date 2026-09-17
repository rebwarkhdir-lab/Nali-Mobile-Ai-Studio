import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Search, Plus, Save, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Accessory } from '../../types/accessory';
import { screenProtectorService } from '../../lib/screenProtectorService';
import CurrencyPriceInput from '../common/CurrencyPriceInput';
import { parseFormattedNumber } from '../../lib/utils';
import { sound } from '../../lib/sound';
import { useToast } from '../common/Toast';

interface ScreenProtectorQuickStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (accessoryData: Omit<Accessory, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  existingAccessories: Accessory[];
}

export default function ScreenProtectorQuickStockModal({
  isOpen,
  onClose,
  onSave,
  existingAccessories
}: ScreenProtectorQuickStockModalProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';
  const { success, error } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState<{ brand: string; model: string } | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      
      // Reset form
      setSearchQuery('');
      setSelectedModel(null);
      setQuantity(1);
      setBuyPrice('');
      setSellPrice('');
    }
  }, [isOpen]);

  // Flatten all models across all groups for searching
  const allModels = useMemo(() => {
    const models: { brand: string; model: string; dieCode: string; groupId: string }[] = [];
    const groups = screenProtectorService.getAllGroups();
    
    groups.forEach(group => {
      (group.models || []).forEach(m => {
        models.push({
          brand: m.brand,
          model: m.model,
          dieCode: group.dieCode,
          groupId: group.id
        });
      });
    });
    
    // Sort alphabetically by model name
    return models.sort((a, b) => a.model.localeCompare(b.model));
  }, [isOpen]);

  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    
    return allModels.filter(m => 
      (m.model || '').toLowerCase().includes(q) || 
      (m.brand || '').toLowerCase().includes(q) ||
      (m.dieCode || '').toLowerCase().includes(q)
    ).slice(0, 10); // Limit to 10 suggestions
  }, [searchQuery, allModels]);

  const handleSelectModel = (model: { brand: string; model: string }) => {
    sound.playClick();
    setSelectedModel(model);
    setSearchQuery(model.model);
  };

  const handleSave = async () => {
    if (!selectedModel) {
      error(t('common.error', { defaultValue: 'Please select a model first' }));
      return;
    }

    if (quantity <= 0) {
      error(t('common.error', { defaultValue: 'Quantity must be greater than 0' }));
      return;
    }

    setIsSubmitting(true);
    
    try {
      const modelName = selectedModel.model;
      const brand = selectedModel.brand;
      const accessoryName = `Screen Protector - ${modelName}`;
      
      // Check if this exact accessory already exists in inventory
      const existingAcc = existingAccessories.find(a => 
        a.category && /screen|glass|protector/i.test(a.category) &&
        (a.name === accessoryName || (a.compatibility && a.compatibility.includes(modelName)))
      );

      if (existingAcc) {
        // We need to update existing - but our API takes a new one. 
        // For simplicity here, we'll just save a new entry if we don't want to handle updating the existing one,
        // OR we can pass it to onSave. Let's pass a new object, and onSave in parent will handle insertion.
        // Wait, onSave is designed for AddAccessory, not directly for updating. 
        // Actually, if we just create a new record it's fine, but better to reuse existing if we can. 
        // Let's just create a new one, OR we can let the parent handle the merge if we want.
        // Let's keep it simple: always create a new stock entry for that specific model.
      }
      
      await onSave({
        name: accessoryName,
        barcode: `SP-${Date.now().toString().slice(-6)}`,
        category: 'Screen Protectors & Glass',
        brand: brand,
        company: 'Screen Protector Quick Add',
        quantity: quantity,
        buyPrice: parseFormattedNumber(buyPrice) || 0,
        sellPrice: parseFormattedNumber(sellPrice) || 0,
        currency: 'USD',
        compatibility: modelName,
        status: quantity > 0 ? 'in_stock' : 'out_of_stock'
      });
      
      onClose();
    } catch (e) {
      console.error(e);
      error(t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t('screenProtectorsPage.quickRegisterStock', { defaultValue: 'Register Stock' })}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('screenProtectorsPage.quickRegisterDesc', { defaultValue: 'Add screen protector inventory by model' })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Model Search */}
          <div className="space-y-2 relative">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('common.model', { defaultValue: 'Device Model' })}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedModel(null);
                }}
                className={`block w-full pl-10 pr-3 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-base ${
                  selectedModel 
                    ? 'border-emerald-500/50 ring-2 ring-emerald-500/20' 
                    : 'border-slate-200 dark:border-slate-700'
                }`}
                placeholder={t('common.search', { defaultValue: 'Search model (e.g. Poco F3)' })}
              />
              {selectedModel && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <div className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded text-xs font-medium">
                    Selected
                  </div>
                </div>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {searchQuery && !selectedModel && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto py-1">
                {(filteredModels?.length || 0) > 0 ? (
                  (filteredModels || []).map((m, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectModel(m)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex flex-col transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                    >
                      <span className="font-medium text-slate-900 dark:text-white">{m.model}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">{m.brand}</span>
                        <span className="text-xs text-slate-300 dark:text-slate-600">•</span>
                        <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium">Group: {m.dieCode}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
                    No models found matching "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('common.quantity', { defaultValue: 'Quantity' })}
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="block w-full text-center py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-lg font-medium"
              />
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('accessories.buyPrice', { defaultValue: 'Cost Price' })}
              </label>
              <CurrencyPriceInput
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                name="buyPrice"
                currency="USD"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('accessories.sellPrice', { defaultValue: 'Retail Price' })}
              </label>
              <CurrencyPriceInput
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                name="sellPrice"
                currency="IQD"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedModel || isSubmitting}
              className={`flex-1 px-4 py-3 rounded-xl font-medium text-white shadow-sm flex items-center justify-center gap-2 transition-all
                ${selectedModel && !isSubmitting 
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none' 
                  : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500 dark:text-slate-400'
                }`}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {t('common.save')}
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
