import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ScreenProtectorGroup, 
  CompatibleModel, 
  NotchType 
} from '../../types/screenProtector';
import { Accessory } from '../../types/accessory';
import { 
  X, 
  Plus, 
  Trash2, 
  Smartphone, 
  Layers, 
  MapPin, 
  Save, 
  AlertTriangle,
  Link as LinkIcon,
  Tag,
  Check
} from 'lucide-react';
import { sound } from '../../lib/sound';
import { useToast } from '../common/Toast';
import { NotchVisualIcon, getNotchLabel } from './ScreenProtectorCard';

interface ScreenProtectorGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (groupData: Partial<ScreenProtectorGroup>) => void;
  group?: ScreenProtectorGroup | null;
  accessories?: Accessory[];
  onDelete?: (groupId: string) => void;
}

const BRANDS = [
  'Apple',
  'Samsung',
  'Xiaomi',
  'Redmi',
  'Poco',
  'Realme',
  'Oppo',
  'Infinix',
  'Tecno',
  'Honor',
  'Huawei',
  'Google Pixel',
  'OnePlus',
  'Vivo',
  'Motorola',
  'Nokia',
  'Itel',
  'ZTE'
];

const NOTCH_TYPES: NotchType[] = [
  'waterdrop',
  'punch_hole_center',
  'punch_hole_left',
  'dynamic_island',
  'wide_notch',
  'curved_edge',
  'flat_full',
  'universal'
];

export default function ScreenProtectorGroupModal({
  isOpen,
  onClose,
  onSave,
  group,
  accessories = [],
  onDelete
}: ScreenProtectorGroupModalProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';
  const { success, error: toastError } = useToast();

  const [dieCode, setDieCode] = useState('');
  const [name, setName] = useState('');
  const [screenSize, setScreenSize] = useState('6.5 inches');
  const [notchType, setNotchType] = useState<NotchType>('waterdrop');
  const [primaryBrand, setPrimaryBrand] = useState('Samsung');
  const [shelfLocation, setShelfLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [models, setModels] = useState<CompatibleModel[]>([]);
  const [linkedAccessoryIds, setLinkedAccessoryIds] = useState<string[]>([]);

  const safeAccessories = Array.isArray(accessories) ? accessories : [];

  // New model input fields
  const [newModelBrand, setNewModelBrand] = useState('Samsung');
  const [newModelName, setNewModelName] = useState('');
  const [newModelScreen, setNewModelScreen] = useState('');
  const [newModelAliases, setNewModelAliases] = useState('');

  useEffect(() => {
    if (group) {
      setDieCode(group.dieCode || '');
      setName(group.name || '');
      setScreenSize(group.screenSize || '6.5 inches');
      setNotchType(group.notchType || 'waterdrop');
      setPrimaryBrand(group.primaryBrand || 'Samsung');
      setShelfLocation(group.shelfLocation || '');
      setNotes(group.notes || '');
      setModels(group.models ? [...group.models] : []);
      setLinkedAccessoryIds(group.linkedAccessoryIds || []);
      setNewModelBrand(group.primaryBrand || 'Samsung');
    } else {
      setDieCode('');
      setName('');
      setScreenSize('6.5 inches');
      setNotchType('waterdrop');
      setPrimaryBrand('Samsung');
      setShelfLocation('');
      setNotes('');
      setModels([]);
      setLinkedAccessoryIds([]);
      setNewModelBrand('Samsung');
    }
  }, [group, isOpen]);

  if (!isOpen) return null;

  const handleAddModel = () => {
    if (!newModelName.trim()) {
      toastError(t('screenProtectorsPage.modal.enterModelName', { defaultValue: 'Please enter a phone model name' }));
      return;
    }

    sound.playClick();
    const aliases = newModelAliases
      .split(',')
      .map(a => a.trim())
      .filter(Boolean);

    const newModel: CompatibleModel = {
      brand: newModelBrand,
      model: newModelName.trim(),
      screenSize: newModelScreen.trim() || undefined,
      aliases: (aliases?.length || 0) > 0 ? aliases : undefined
    };

    setModels(prev => [...(prev || []), newModel]);
    setNewModelName('');
    setNewModelAliases('');
    setNewModelScreen('');
  };

  const handleRemoveModel = (index: number) => {
    sound.playClick();
    setModels(prev => (prev || []).filter((_, i) => i !== index));
  };

  const handleToggleAccessoryLink = (accId: string) => {
    sound.playClick();
    setLinkedAccessoryIds(prev => 
      (prev || []).includes(accId) ? (prev || []).filter(id => id !== accId) : [...(prev || []), accId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dieCode.trim() || !name.trim()) {
      toastError(t('screenProtectorsPage.modal.provideSkuAndName', { defaultValue: 'Please provide a Die Code and Group Name' }));
      return;
    }
    if ((models?.length || 0) === 0) {
      toastError(t('screenProtectorsPage.modal.addAtLeastOneModel', { defaultValue: 'Please add at least one compatible model' }));
      return;
    }

    sound.playSuccess();
    onSave({
      dieCode: dieCode.trim(),
      name: name.trim(),
      screenSize: screenSize.trim(),
      notchType,
      primaryBrand,
      shelfLocation: shelfLocation.trim(),
      notes: notes.trim(),
      models,
      linkedAccessoryIds
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        dir={isKu ? 'rtl' : 'ltr'}
        className="bg-[#0f1422] border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-8 text-slate-100"
      >
        {/* Modal Header */}
        <div className="p-5 bg-[#0b0e18] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {group ? t('screenProtectorsPage.modal.editTitle') : t('screenProtectorsPage.modal.createTitle')}
              </h2>
              <p className="text-xs text-slate-400">
                {t('screenProtectorsPage.modal.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Main Group Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('screenProtectorsPage.modal.dieCodeLabel')} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={dieCode}
                onChange={e => setDieCode(e.target.value)}
                placeholder={t('screenProtectorsPage.modal.dieCodePlaceholder')}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('screenProtectorsPage.modal.primaryBrand')}
              </label>
              <select
                value={primaryBrand}
                onChange={e => {
                  setPrimaryBrand(e.target.value);
                  setNewModelBrand(e.target.value);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {BRANDS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('screenProtectorsPage.modal.groupTitleLabel')} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('screenProtectorsPage.modal.groupTitlePlaceholder')}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('screenProtectorsPage.modal.screenSizeLabel')}
              </label>
              <input
                type="text"
                value={screenSize}
                onChange={e => setScreenSize(e.target.value)}
                placeholder={t('screenProtectorsPage.modal.screenSizePlaceholder')}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('screenProtectorsPage.modal.shelfLocationLabel')}
              </label>
              <div className="relative">
                <MapPin className={`w-4 h-4 text-slate-500 absolute top-3 ${isKu ? 'right-3' : 'left-3'}`} />
                <input
                  type="text"
                  value={shelfLocation}
                  onChange={e => setShelfLocation(e.target.value)}
                  placeholder={t('screenProtectorsPage.modal.shelfLocationPlaceholder')}
                  className={`w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 ${
                    isKu ? 'pr-9 pl-3.5' : 'pl-9 pr-3.5'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Notch Style Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              {t('screenProtectorsPage.modal.notchStyleLabel')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {NOTCH_TYPES.map(type => {
                const isSelected = notchType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setNotchType(type);
                    }}
                    className={`p-3 rounded-2xl border ${isKu ? 'text-right' : 'text-left'} flex items-center gap-2.5 transition-all ${
                      isSelected
                        ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <NotchVisualIcon type={type} className="w-5 h-8 shrink-0" />
                    <div className="text-[11px] font-semibold leading-tight">
                      {t(`screenProtectorsPage.notches.${type}`, { defaultValue: getNotchLabel(type) })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Compatible Phone Models List */}
          <div className="p-4 rounded-2xl bg-[#0b0e18] border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-400" />
                <span>{t('screenProtectorsPage.modal.compatibleModels', { count: models?.length || 0 })}</span>
              </div>
              <span className="text-[11px] text-slate-400">
                {t('screenProtectorsPage.modal.allPhonesSharing')}
              </span>
            </div>

            {/* Existing Models */}
            <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto p-1">
              {(models?.length || 0) === 0 ? (
                <div className="text-xs text-slate-500 italic py-2">
                  {t('screenProtectorsPage.modal.noModelsAdded')}
                </div>
              ) : (
                (models || []).map((m, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                  >
                    <span className="text-indigo-400 font-bold">{m.brand}</span>
                    <span className="font-semibold">{m.model}</span>
                    {m.screenSize && <span className="text-[10px] text-slate-400">({m.screenSize})</span>}
                    <button
                      type="button"
                      onClick={() => handleRemoveModel(idx)}
                      className={`${isKu ? 'mr-1' : 'ml-1'} text-slate-500 hover:text-red-400 transition-colors p-0.5`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Quick Add Model Inputs */}
            <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-2">
              <select
                value={newModelBrand}
                onChange={e => setNewModelBrand(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {BRANDS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <input
                type="text"
                value={newModelName}
                onChange={e => setNewModelName(e.target.value)}
                placeholder={t('screenProtectorsPage.modal.modelPlaceholder')}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 sm:col-span-2"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddModel();
                  }
                }}
              />

              <button
                type="button"
                onClick={handleAddModel}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 active:scale-95 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('screenProtectorsPage.modal.addModelBtn')}</span>
              </button>
            </div>
            <div className="text-[10px] text-slate-500">
              {t('screenProtectorsPage.modal.addModelTip')}
            </div>
          </div>

          {/* Link to Shop Inventory Accessories (Optional) */}
          {safeAccessories.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#0b0e18] border border-slate-800/80 space-y-2">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-indigo-400" />
                <span>{t('screenProtectorsPage.modal.linkShopInventory')}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {t('screenProtectorsPage.modal.selectAccessories')}
              </p>

              <div className={`max-h-36 overflow-y-auto space-y-1.5 ${isKu ? 'pl-1' : 'pr-1'}`}>
                {safeAccessories
                  .filter(a => 
                    (a.category && /screen|glass|protector|tempered|matte|privacy/i.test(a.category)) ||
                    (a.name && /glass|screen|protector|tempered/i.test(a.name))
                  )
                  .map(acc => {
                    const isLinked = linkedAccessoryIds.includes(acc.id);
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => handleToggleAccessoryLink(acc.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl border text-xs ${isKu ? 'text-right' : 'text-left'} transition-colors ${
                          isLinked 
                            ? 'bg-indigo-600/20 border-indigo-500/50 text-white' 
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900'
                        }`}
                      >
                        <div className={`truncate ${isKu ? 'pl-2' : 'pr-2'}`}>
                          <span className="font-semibold">{acc.name}</span>
                          <span className={`text-[10px] text-slate-400 ${isKu ? 'mr-2' : 'ml-2'}`}>
                            ({t('screenProtectorsPage.card.inStockUnit', { count: acc.quantity })})
                          </span>
                        </div>
                        <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                          isLinked ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700'
                        }`}>
                          {isLinked && <Check className="w-3 h-3" />}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t('screenProtectorsPage.modal.notesLabel')}
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t('screenProtectorsPage.modal.notesPlaceholder')}
              rows={2}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            {group && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(t('screenProtectorsPage.modal.confirmDelete'))) {
                    onDelete(group.id);
                    onClose();
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('screenProtectorsPage.modal.deleteGroup')}</span>
              </button>
            )}

            <div className={`flex items-center gap-3 ${isKu ? 'mr-auto' : 'ml-auto'}`}>
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition-colors"
              >
                {t('screenProtectorsPage.modal.cancel')}
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{group ? t('screenProtectorsPage.modal.saveChanges') : t('screenProtectorsPage.modal.createGroup')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
