import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Search, 
  Layers, 
  Smartphone, 
  CheckCircle2, 
  ShoppingCart, 
  Copy, 
  Check, 
  ExternalLink,
  Sparkles,
  MapPin
} from 'lucide-react';
import { screenProtectorService } from '../../lib/screenProtectorService';
import { ScreenProtectorSearchResult } from '../../types/screenProtector';
import { Accessory } from '../../types/accessory';
import { NotchVisualIcon, getNotchLabel } from './ScreenProtectorCard';
import { formatCurrency, cn } from '../../lib/utils';
import { SearchInput } from '../common/SearchInput';
import { sound } from '../../lib/sound';
import { useToast } from '../common/Toast';
import { Link } from 'react-router';

interface ScreenProtectorFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessories?: Accessory[];
  onSelectAccessory?: (accessory: any) => void;
}

export default function ScreenProtectorFinderModal({
  isOpen,
  onClose,
  accessories = [],
  onSelectAccessory
}: ScreenProtectorFinderModalProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { success } = useToast();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const searchResults: ScreenProtectorSearchResult[] = useMemo(() => {
    if (!isOpen) return [];
    return screenProtectorService.searchCompatibilities(query, accessories);
  }, [query, accessories, isOpen]);

  if (!isOpen) return null;

  const handleCopy = (group: any) => {
    sound.playClick();
    const text = `Glass ${group.dieCode}: ` + group.models.map((m: any) => `${m.brand} ${m.model}`).join(', ');
    navigator.clipboard.writeText(text);
    setCopiedId(group.id);
    success(t('screenProtectorsPage.card.copiedAllModels'));
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        dir={isKu ? 'rtl' : 'ltr'}
        className="bg-[#0e1322] border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh] text-slate-100"
      >
        {/* Header */}
        <div className="p-4 bg-[#0a0d18] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  {t('screenProtectorsPage.finderModal.title')}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {t('screenProtectorsPage.finderModal.instantCheck')}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {t('screenProtectorsPage.finderModal.subtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Field */}
        <div className="p-4 bg-[#0b0e1a] border-b border-slate-800">
          <SearchInput
            value={query}
            onChangeValue={setQuery}
            placeholder={t('screenProtectorsPage.finderModal.searchPlaceholder')}
            size="md"
            autoFocus
          />
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {(searchResults?.length || 0) === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Smartphone className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <div className="text-sm font-semibold text-white">
                {t('screenProtectorsPage.finderModal.noMatchingFound')}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {t('screenProtectorsPage.finderModal.trySearching')}
              </div>
            </div>
          ) : (
            (searchResults || []).map(result => {
              const { group, matchedModel, inStockCount, inventoryItems } = result;
              const notchLabel = t(`screenProtectorsPage.notches.${group?.notchType}`, {
                defaultValue: getNotchLabel(group?.notchType)
              });

              return (
                <div
                  key={group.id}
                  className={cn(
                    "p-4 rounded-2xl border transition-all space-y-3",
                    inStockCount > 0 
                      ? "bg-slate-900/90 border-indigo-500/40 shadow-sm" 
                      : "bg-slate-900/40 border-slate-800"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <NotchVisualIcon type={group.notchType} className="w-5 h-8 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {group.dieCode}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300">
                            {group.screenSize}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {notchLabel}
                          </span>
                          {group.shelfLocation && (
                            <span className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {group.shelfLocation}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1">
                          {group.name}
                        </h4>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      {inStockCount > 0 ? (
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          {t('screenProtectorsPage.card.inStock', { count: inStockCount })}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 text-[11px]">
                          {t('screenProtectorsPage.finderModal.zeroStock')}
                        </span>
                      )}

                      <button
                        onClick={() => handleCopy(group)}
                        className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                        title={t('screenProtectorsPage.finderModal.copyList')}
                      >
                        {copiedId === group.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Highlight match if target searched */}
                  {matchedModel && (
                    <div className="p-2 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center gap-1.5 text-xs text-indigo-200">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{t('screenProtectorsPage.finderModal.target')}</span>
                      <span className="font-bold text-white bg-indigo-600 px-2 py-0.5 rounded">
                        {matchedModel.brand} {matchedModel.model}
                      </span>
                      <span className={`text-indigo-400 font-medium ${isKu ? 'mr-auto' : 'ml-auto'}`}>
                        {t('screenProtectorsPage.finderModal.compatible100')}
                      </span>
                    </div>
                  )}

                  {/* Compatible Models Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {group.models.map((m, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg text-xs font-medium bg-slate-800/80 border border-slate-700 text-slate-200"
                      >
                        <span className={`text-slate-400 text-[10px] ${isKu ? 'ml-1' : 'mr-1'}`}>{m.brand}</span>
                        <span>{m.model}</span>
                      </span>
                    ))}
                  </div>

                  {/* Linked Inventory Items with 1-click Add to Cart */}
                  {(inventoryItems?.length || 0) > 0 && (
                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {t('screenProtectorsPage.finderModal.availableInPos')}
                      </div>
                      {(inventoryItems || []).map(item => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                        >
                          <div className={`truncate ${isKu ? 'pl-2' : 'pr-2'}`}>
                            <span className="font-semibold text-white">{item.name}</span>
                            <span className={`text-emerald-400 font-bold ${isKu ? 'mr-2' : 'ml-2'}`}>
                              ({t('screenProtectorsPage.finderModal.leftCount', { count: item.quantity })})
                            </span>
                            <span className={`text-indigo-300 font-bold ${isKu ? 'mr-2' : 'ml-2'}`}>
                              {formatCurrency(item.price, item.currency)}
                            </span>
                          </div>
                          {onSelectAccessory && (
                            <button
                              onClick={() => {
                                sound.playClick();
                                onSelectAccessory(item);
                                onClose();
                              }}
                              className="shrink-0 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1"
                            >
                              <ShoppingCart className="w-3 h-3" />
                              <span>{t('screenProtectorsPage.finderModal.addToCart')}</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0a0d18] border-t border-slate-800 flex items-center justify-between">
          <Link
            to="/screen-protectors"
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5"
          >
            <span>{t('screenProtectorsPage.finderModal.openFullManager')}</span>
            <ExternalLink className={`w-3.5 h-3.5 ${isKu ? 'rotate-180' : ''}`} />
          </Link>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-4 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold"
          >
            {t('screenProtectorsPage.finderModal.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

