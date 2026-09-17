import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Package, 
  Smartphone, 
  Headphones, 
  ShieldAlert, 
  CheckCircle2, 
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Supplier } from '../../types/supplier';
import { SearchInput } from '../common/SearchInput';
import { 
  SupplierReturnItem, 
  ReturnItemType, 
  RequestedResolution
} from '../../types/supplierReturn';
import { Mobile } from '../../types/mobile';
import { Accessory } from '../../types/accessory';
import { ScreenProtectorGroup } from '../../types/screenProtector';
import { supplierService } from '../../lib/supplierService';
import { supabase } from '../../lib/supabase';
import { sound } from '../../lib/sound';
import { useToast } from '../common/Toast';
import { cn } from '../../lib/utils';

interface CreateSupplierReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedReturn: SupplierReturnItem) => void;
  suppliers: Supplier[];
  initialItemType?: ReturnItemType;
  initialMobile?: Mobile;
  initialAccessory?: Accessory;
  initialScreenProtector?: ScreenProtectorGroup;
  editingReturn?: SupplierReturnItem | null;
}

export default function CreateSupplierReturnModal({
  isOpen,
  onClose,
  onSuccess,
  suppliers,
  initialItemType = 'mobile',
  initialMobile,
  initialAccessory,
  editingReturn
}: CreateSupplierReturnModalProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';
  const { success, error: toastError } = useToast();

  const QUICK_DEFECTS: string[] = (t('suppliers.createReturnModal.quickDefects', { returnObjects: true }) as string[]) || [
    'Dead on arrival (won\'t turn on)',
    'Screen lines / Touch not responding',
    'Charging port / Battery issue',
    'Speaker or Microphone fault',
    'Camera blurry or black screen',
    'Wrong item or damaged in box'
  ];

  // Form Fields
  const [itemType, setItemType] = useState<ReturnItemType>(initialItemType);
  const [itemName, setItemName] = useState('');
  const [brand, setBrand] = useState('');
  const [serialOrImei, setSerialOrImei] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [currency, setCurrency] = useState<'USD' | 'IQD'>('USD');
  const [defectDescription, setDefectDescription] = useState('');
  const [requestedResolution, setRequestedResolution] = useState<RequestedResolution>('replacement');
  
  // Quick inventory pick list
  const [inventorySearch, setInventorySearch] = useState('');
  const [mobilesList, setMobilesList] = useState<Mobile[]>([]);
  const [accessoriesList, setAccessoriesList] = useState<Accessory[]>([]);
  const [isSearchingInventory, setIsSearchingInventory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Inventory for autocomplete
  useEffect(() => {
    if (isOpen) {
      const loadInventory = async () => {
        try {
          const [mobRes, accRes] = await Promise.all([
            supabase.from('nali_mobiles').select('id, brand, model, imei, buyPrice, color, storage').limit(100),
            supabase.from('nali_accessories').select('id, name, brand, barcode, buyPrice, quantity, company').limit(100)
          ]);
          if (mobRes.data) setMobilesList(mobRes.data as unknown as Mobile[]);
          if (accRes.data) setAccessoriesList(accRes.data as unknown as Accessory[]);
        } catch (e) {
          console.warn('Inventory load warning:', e);
        }
      };
      loadInventory();
    }
  }, [isOpen]);

  // Populate initial values or editing return
  useEffect(() => {
    if (editingReturn) {
      setItemType(editingReturn.itemType || 'mobile');
      setItemName(editingReturn.itemName || '');
      setBrand(editingReturn.brand || '');
      setSerialOrImei(editingReturn.serialOrImei || '');
      setSupplierId(editingReturn.supplierId || '');
      setSupplierName(editingReturn.supplierName || '');
      setQuantity(editingReturn.quantity || 1);
      setUnitCost(editingReturn.unitCost || 0);
      setCurrency(editingReturn.currency || 'USD');
      setDefectDescription(editingReturn.defectDescription || '');
      setRequestedResolution(editingReturn.requestedResolution || 'replacement');
    } else if (initialMobile) {
      setItemType('mobile');
      setItemName(`${initialMobile.brand} ${initialMobile.model}`);
      setBrand(initialMobile.brand || '');
      setSerialOrImei(initialMobile.imei || '');
      setQuantity(1);
      setUnitCost(Number(initialMobile.buyPrice) || 0);
      setCurrency('USD');
      setSupplierId(suppliers[0]?.id || '');
      setSupplierName(suppliers[0]?.name || '');
    } else if (initialAccessory) {
      setItemType('accessory');
      setItemName(initialAccessory.name || '');
      setBrand(initialAccessory.brand || '');
      setSerialOrImei(initialAccessory.barcode || '');
      setQuantity(1);
      setUnitCost(Number(initialAccessory.buyPrice) || 0);
      setCurrency(initialAccessory.currency || 'USD');
      
      const matchedSup = (suppliers || []).find(s => s.name.toLowerCase() === (initialAccessory.company || '').toLowerCase());
      if (matchedSup) {
        setSupplierId(matchedSup.id);
        setSupplierName(matchedSup.name);
      } else if ((suppliers?.length || 0) > 0) {
        const safeSuppliers = suppliers || [];
        setSupplierId(safeSuppliers[0].id);
        setSupplierName(safeSuppliers[0].name);
      }
    } else {
      // Default reset
      setItemType(initialItemType);
      setItemName('');
      setBrand('');
      setSerialOrImei('');
      setQuantity(1);
      setUnitCost(0);
      setCurrency('USD');
      setDefectDescription('');
      setRequestedResolution('replacement');
      if ((suppliers?.length || 0) > 0) {
        const safeSuppliers = suppliers || [];
        setSupplierId(safeSuppliers[0].id);
        setSupplierName(safeSuppliers[0].name);
      }
    }
  }, [editingReturn, initialMobile, initialAccessory, initialItemType, isOpen, suppliers]);

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    setSupplierId(sId);
    const found = suppliers.find(s => s.id === sId);
    if (found) setSupplierName(found.name);
  };

  const handleSelectMobile = (mob: Mobile) => {
    setItemType('mobile');
    setItemName(`${mob.brand} ${mob.model} ${mob.storage || ''} ${mob.color || ''}`.trim());
    setBrand(mob.brand);
    setSerialOrImei(mob.imei || '');
    setUnitCost(Number(mob.buyPrice) || 0);
    setQuantity(1);
    setIsSearchingInventory(false);
  };

  const handleSelectAccessory = (acc: Accessory) => {
    setItemType('accessory');
    setItemName(acc.name);
    setBrand(acc.brand);
    setSerialOrImei(acc.barcode || '');
    setUnitCost(Number(acc.buyPrice) || 0);
    setCurrency(acc.currency || 'USD');
    setQuantity(1);
    
    if (acc.company) {
      const match = suppliers.find(s => s.name.toLowerCase() === acc.company?.toLowerCase());
      if (match) {
        setSupplierId(match.id);
        setSupplierName(match.name);
      }
    }
    setIsSearchingInventory(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      toastError(t('suppliers.createReturnModal.errorItemName', 'Please enter item name'));
      return;
    }
    if (!supplierName.trim() && !supplierId) {
      toastError(t('suppliers.createReturnModal.errorSupplier', 'Please select or specify supplier'));
      return;
    }
    if (!defectDescription.trim()) {
      toastError(t('suppliers.createReturnModal.errorDefect', 'Please describe the problem or defect'));
      return;
    }

    setIsSubmitting(true);
    sound.playClick();

    try {
      const finalSupplierName = supplierName || suppliers.find(s => s.id === supplierId)?.name || 'Supplier';

      const returnData = {
        id: editingReturn ? editingReturn.id : undefined,
        supplierId: supplierId || 'general',
        supplierName: finalSupplierName,
        itemType,
        itemName: itemName.trim(),
        brand: brand.trim() || 'Generic',
        serialOrImei: serialOrImei.trim() || undefined,
        quantity: Math.max(1, Number(quantity) || 1),
        unitCost: Number(unitCost) || 0,
        currency,
        totalValue: (Number(unitCost) || 0) * Math.max(1, Number(quantity) || 1),
        defectCategory: 'other' as const,
        defectDescription: defectDescription.trim(),
        requestedResolution,
        status: editingReturn ? editingReturn.status : ('pending_dispatch' as const),
        priority: 'normal' as const
      };

      const saved = await supplierService.saveReturn(returnData);
      if (editingReturn) {
        success(t('suppliers.createReturnModal.successUpdated', { rma: saved.rmaNumber }));
      } else {
        success(t('suppliers.createReturnModal.successCreated', { rma: saved.rmaNumber }));
      }

      onSuccess(saved);
      onClose();
    } catch (err) {
      console.error(err);
      toastError(t('suppliers.createReturnModal.errorSave', 'Failed to save return record'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          dir={isKu ? 'rtl' : 'ltr'}
          className="w-full max-w-lg bg-[#141a2e] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-800 bg-[#0f1424] shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-white truncate">
                  {editingReturn 
                    ? t('suppliers.createReturnModal.editTitle', { rma: editingReturn.rmaNumber }) 
                    : t('suppliers.createReturnModal.createTitle')
                  }
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  {t('suppliers.createReturnModal.subtitle')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 sm:space-y-4 flex-1 overflow-y-auto custom-scrollbar">
            
            {/* Item Category Tabs */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                {t('suppliers.createReturnModal.itemType')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setItemType('mobile');
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    itemType === 'mobile'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>{t('suppliers.createReturnModal.phone')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setItemType('accessory');
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    itemType === 'accessory'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>{t('suppliers.createReturnModal.accessory')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setItemType('screen_protector');
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    itemType === 'screen_protector'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>{t('suppliers.createReturnModal.screen')}</span>
                </button>
              </div>
            </div>

            {/* Quick Pick from Inventory */}
            {!editingReturn && (
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-slate-400">{t('suppliers.createReturnModal.quickPick')}</span>
                  {isSearchingInventory && (
                    <button
                      type="button"
                      onClick={() => setIsSearchingInventory(false)}
                      className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
                    >
                      {t('suppliers.createReturnModal.closeSearch')}
                    </button>
                  )}
                </div>

                {!isSearchingInventory ? (
                  <button
                    type="button"
                    onClick={() => setIsSearchingInventory(true)}
                    className="w-full py-1.5 px-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400 hover:text-amber-400 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Search className="w-3.5 h-3.5" />
                      <span>{t('suppliers.createReturnModal.searchPlaceholder')}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{t('suppliers.createReturnModal.autoFill')}</span>
                  </button>
                ) : (
                  <div className="p-2.5 bg-slate-900 border border-amber-500/40 rounded-xl space-y-2">
                    <SearchInput
                      autoFocus
                      placeholder={t('suppliers.createReturnModal.searchItems')}
                      value={inventorySearch}
                      onChangeValue={setInventorySearch}
                      size="sm"
                      inputVariant="subtle"
                    />

                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {itemType === 'mobile' ? (
                        mobilesList
                          .filter(m => `${m.brand} ${m.model} ${m.imei || ''}`.toLowerCase().includes(inventorySearch.toLowerCase()))
                          .slice(0, 5)
                          .map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleSelectMobile(m)}
                              className="w-full p-1.5 rounded-lg hover:bg-slate-800 text-xs text-slate-200 flex items-center justify-between cursor-pointer"
                            >
                              <span>{m.brand} {m.model} ({m.color || 'Default'})</span>
                              <span className="text-[10px] font-mono text-amber-400">IMEI: {m.imei || 'N/A'}</span>
                            </button>
                          ))
                      ) : (
                        accessoriesList
                          .filter(a => `${a.name} ${a.brand || ''}`.toLowerCase().includes(inventorySearch.toLowerCase()))
                          .slice(0, 5)
                          .map(a => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => handleSelectAccessory(a)}
                              className="w-full p-1.5 rounded-lg hover:bg-slate-800 text-xs text-slate-200 flex items-center justify-between cursor-pointer"
                            >
                              <span>{a.name} ({a.brand})</span>
                              <span className="text-[10px] font-mono text-amber-400">${a.buyPrice}</span>
                            </button>
                          ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Item Name & Brand */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  {t('suppliers.createReturnModal.itemName')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('suppliers.createReturnModal.itemPlaceholder')}
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  {t('suppliers.createReturnModal.brand')}
                </label>
                <input
                  type="text"
                  placeholder={t('suppliers.createReturnModal.brandPlaceholder')}
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* IMEI / Serial & Supplier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  {t('suppliers.createReturnModal.imei')} {itemType === 'mobile' ? t('suppliers.createReturnModal.imeiHintMobile') : t('suppliers.createReturnModal.imeiHintOther')}
                </label>
                <input
                  type="text"
                  placeholder={t('suppliers.createReturnModal.imeiPlaceholder')}
                  value={serialOrImei}
                  onChange={(e) => setSerialOrImei(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-amber-300 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  {t('suppliers.createReturnModal.supplier')}
                </label>
                {(suppliers?.length || 0) > 0 ? (
                  <select
                    value={supplierId}
                    onChange={handleSupplierChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder={t('suppliers.createReturnModal.supplierPlaceholder')}
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                )}
              </div>
            </div>

            {/* Problem & Defect Description */}
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">
                {t('suppliers.createReturnModal.defect')}
              </label>
              <textarea
                required
                rows={2}
                placeholder={t('suppliers.createReturnModal.defectPlaceholder')}
                value={defectDescription}
                onChange={(e) => setDefectDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
              />

              {/* Quick defect chips */}
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {QUICK_DEFECTS.map((defect, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDefectDescription(defect)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-800 transition-colors cursor-pointer"
                  >
                    + {defect}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity, Cost & Desired Resolution */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  {t('suppliers.createReturnModal.quantity')}
                </label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  {t('suppliers.createReturnModal.costPrice')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={unitCost || ''}
                    onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3 pr-12 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as 'USD' | 'IQD')}
                    className={cn(
                      "absolute top-1 bottom-1 bg-slate-800 text-[10px] text-amber-300 rounded px-1 border-0 focus:outline-none",
                      isKu ? "left-1" : "right-1"
                    )}
                  >
                    <option value="USD">$</option>
                    <option value="IQD">IQD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  {t('suppliers.createReturnModal.expectedResolution')}
                </label>
                <select
                  value={requestedResolution}
                  onChange={(e) => setRequestedResolution(e.target.value as RequestedResolution)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="replacement">{t('suppliers.createReturnModal.resReplacement')}</option>
                  <option value="cash_refund">{t('suppliers.createReturnModal.resCash')}</option>
                  <option value="account_credit">{t('suppliers.createReturnModal.resCredit')}</option>
                </select>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col-reverse xs:flex-row items-stretch xs:items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="w-full xs:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-center cursor-pointer"
              >
                {t('suppliers.createReturnModal.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full xs:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isSubmitting 
                    ? t('suppliers.createReturnModal.saving') 
                    : editingReturn 
                      ? t('suppliers.createReturnModal.updateReturn') 
                      : t('suppliers.createReturnModal.saveReturn')
                  }
                </span>
              </button>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
