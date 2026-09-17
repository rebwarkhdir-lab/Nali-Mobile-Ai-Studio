import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ScreenProtectorGroup, 
  ScreenProtectorSearchResult, 
  CompatibleModel, 
  NotchType 
} from '../../types/screenProtector';
import { 
  Smartphone, 
  Layers, 
  CheckCircle2, 
  Copy, 
  Check, 
  Printer, 
  Edit2, 
  Plus, 
  MapPin, 
  ShoppingCart, 
  ExternalLink, 
  Sparkles,
  Info,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';
import { sound } from '../../lib/sound';
import { useToast } from '../common/Toast';

interface ScreenProtectorCardProps {
  key?: React.Key;
  searchResult: ScreenProtectorSearchResult;
  onEdit?: (group: ScreenProtectorGroup) => void;
  onPrintLabel?: (group: ScreenProtectorGroup) => void;
  onAddToCart?: (item: ScreenProtectorSearchResult['inventoryItems'][0]) => void;
  onAddModel?: (group: ScreenProtectorGroup) => void;
  highlightQuery?: string;
}

// Visual Wireframe of phone notch / glass shape
export const NotchVisualIcon: React.FC<{ type: NotchType; className?: string }> = ({ type, className = "w-5 h-8" }) => {
  return (
    <div className={cn("relative rounded-md border-2 border-indigo-400/80 bg-slate-900/90 flex flex-col items-center justify-start overflow-hidden shadow-inner", className)}>
      {type === 'dynamic_island' && (
        <div className="w-2.5 h-1 rounded-full bg-slate-950 mt-1 border border-indigo-400/50" />
      )}
      {type === 'wide_notch' && (
        <div className="w-3 h-1.5 rounded-b-md bg-slate-950 border-b border-x border-indigo-400/50" />
      )}
      {type === 'waterdrop' && (
        <div className="w-1.5 h-1.5 rounded-b-full bg-slate-950 border-b border-indigo-400/60" />
      )}
      {type === 'punch_hole_center' && (
        <div className="w-1 h-1 rounded-full bg-slate-950 mt-1 border border-indigo-400/60" />
      )}
      {type === 'punch_hole_left' && (
        <div className="w-1 h-1 rounded-full bg-slate-950 mt-1 self-start ml-1 border border-indigo-400/60" />
      )}
      {type === 'curved_edge' && (
        <div className="absolute inset-y-0 inset-x-0 border-x border-cyan-400/80 rounded-md" />
      )}
      {type === 'flat_full' && (
        <div className="w-2 h-0.5 rounded-full bg-slate-700 mt-1" />
      )}
      <div className="flex-1 w-full" />
    </div>
  );
};

export const getNotchLabel = (type: NotchType): string => {
  switch (type) {
    case 'dynamic_island': return 'Dynamic Island';
    case 'wide_notch': return 'Wide Notch (Face ID)';
    case 'waterdrop': return 'Waterdrop (V/U-Notch)';
    case 'punch_hole_center': return 'Center Punch Hole';
    case 'punch_hole_left': return 'Left Punch Hole';
    case 'curved_edge': return '3D Curved Edge';
    case 'flat_full': return 'Flat Bezel / Full';
    default: return 'Universal Glass';
  }
};

const getBrandColor = (brand: string) => {
  const b = brand.toLowerCase();
  if (b.includes('apple') || b.includes('iphone')) return 'bg-slate-800 text-slate-200 border-slate-700';
  if (b.includes('samsung')) return 'bg-blue-950/60 text-blue-300 border-blue-800/60';
  if (b.includes('xiaomi') || b.includes('redmi')) return 'bg-amber-950/60 text-amber-300 border-amber-800/60';
  if (b.includes('poco')) return 'bg-yellow-950/60 text-yellow-300 border-yellow-800/60';
  if (b.includes('realme')) return 'bg-orange-950/60 text-orange-300 border-orange-800/60';
  if (b.includes('oppo')) return 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60';
  if (b.includes('infinix')) return 'bg-teal-950/60 text-teal-300 border-teal-800/60';
  if (b.includes('tecno')) return 'bg-cyan-950/60 text-cyan-300 border-cyan-800/60';
  if (b.includes('honor') || b.includes('huawei')) return 'bg-purple-950/60 text-purple-300 border-purple-800/60';
  if (b.includes('google') || b.includes('pixel')) return 'bg-rose-950/60 text-rose-300 border-rose-800/60';
  if (b.includes('oneplus')) return 'bg-red-950/60 text-red-300 border-red-800/60';
  if (b.includes('vivo')) return 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60';
  return 'bg-slate-800 text-slate-300 border-slate-700';
};

export default function ScreenProtectorCard({
  searchResult,
  onEdit,
  onPrintLabel,
  onAddToCart,
  onAddModel,
  highlightQuery
}: ScreenProtectorCardProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';
  const { group, matchedModel, inStockCount, inventoryItems } = searchResult;
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { success } = useToast();

  const handleCopyModels = () => {
    sound.playClick();
    const text = `📱 Compatible Screen Protector: ${group.dieCode} (${group.screenSize})\nModels: ` + 
      group.models.map(m => `${m.brand} ${m.model}`).join(', ');
    navigator.clipboard.writeText(text);
    setCopied(true);
    success(t('screenProtectorsPage.card.copiedAllModels'));
    setTimeout(() => setCopied(false), 2000);
  };

  const safeModels = Array.isArray(group?.models) ? group.models : [];
  const visibleModels = isExpanded ? safeModels : safeModels.slice(0, 8);
  const hasMoreModels = (safeModels?.length || 0) > 8;

  const notchDisplayLabel = t(`screenProtectorsPage.notches.${group?.notchType}`, {
    defaultValue: getNotchLabel(group?.notchType)
  });

  return (
    <div 
      dir={isKu ? 'rtl' : 'ltr'}
      className={cn(
        "rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-lg relative group",
        inStockCount > 0 
          ? "bg-gradient-to-br from-[#12192c] via-[#0f1523] to-[#0c101d] border-indigo-500/40 hover:border-indigo-400/80 shadow-indigo-950/20"
          : "bg-gradient-to-br from-[#101422] to-[#0a0d17] border-slate-800/80 hover:border-slate-700/90"
      )}
    >
      {/* Top Header Bar */}
      <div className="p-4 border-b border-slate-800/70">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <NotchVisualIcon type={group.notchType} className="w-6 h-10 shrink-0" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {group.dieCode}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                  {group.screenSize}
                </span>
                {group.isCustom && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    {t('screenProtectorsPage.card.custom')}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-white mt-1.5 line-clamp-1 group-hover:text-indigo-300 transition-colors">
                {group.name}
              </h3>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span className="text-indigo-400 font-medium">{notchDisplayLabel}</span>
                {group.shelfLocation && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400 font-medium flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {group.shelfLocation}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* In-Stock Badge */}
          <div className={`shrink-0 ${isKu ? 'text-left' : 'text-right'}`}>
            {inStockCount > 0 ? (
              <div className={`inline-flex flex-col ${isKu ? 'items-start' : 'items-end'}`}>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {t('screenProtectorsPage.card.inStock', { count: inStockCount })}
                </span>
                <span className="text-[10px] text-emerald-400/80 font-medium mt-0.5">
                  {t('screenProtectorsPage.card.availableInShop')}
                </span>
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 text-[11px] font-medium">
                {t('screenProtectorsPage.card.zeroInStock')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Matched Model Highlight if searched */}
      {matchedModel && (
        <div className="px-4 py-2 bg-indigo-950/40 border-b border-indigo-500/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-indigo-200">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t('screenProtectorsPage.card.targetSearch')}</span>
            <span className="font-bold text-white bg-indigo-500/30 px-2 py-0.5 rounded border border-indigo-400/40">
              {matchedModel.brand} {matchedModel.model}
            </span>
          </div>
          <span className="text-[11px] text-indigo-300/80 font-medium">
            {t('screenProtectorsPage.card.sharedGlass')}
          </span>
        </div>
      )}

      {/* Compatible Models Grid */}
      <div className="p-4 flex-1 flex flex-col justify-start">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
            {t('screenProtectorsPage.card.compatibleDevices', { count: safeModels?.length || 0 })}
          </span>
          <button
            onClick={handleCopyModels}
            className="text-[11px] text-slate-400 hover:text-indigo-300 transition-colors flex items-center gap-1 active:scale-95"
            title={t('screenProtectorsPage.card.copyAll')}
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? t('screenProtectorsPage.card.copied') : t('screenProtectorsPage.card.copyAll')}</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {visibleModels.map((m, idx) => {
            const isMatch = matchedModel && matchedModel.model.toLowerCase() === m.model.toLowerCase();
            return (
              <span
                key={`${m.brand}_${m.model}_${idx}`}
                className={cn(
                  "inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border transition-all",
                  isMatch 
                    ? "bg-indigo-600 text-white border-indigo-400 font-bold shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400/50 scale-105"
                    : getBrandColor(m.brand)
                )}
              >
                <span className={`opacity-70 text-[10px] ${isKu ? 'ml-1' : 'mr-1'}`}>{m.brand}</span>
                <span>{m.model}</span>
                {m.screenSize && (
                  <span className={`${isKu ? 'mr-1' : 'ml-1'} text-[9px] opacity-60`}>({m.screenSize})</span>
                )}
              </span>
            );
          })}
        </div>

        {hasMoreModels && (
          <button
            onClick={() => {
              sound.playClick();
              setIsExpanded(!isExpanded);
            }}
            className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 self-start"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>{t('screenProtectorsPage.card.showLess')}</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>{t('screenProtectorsPage.card.moreModels', { count: Math.max(0, (safeModels?.length || 0) - 8) })}</span>
              </>
            )}
          </button>
        )}

        {group.notes && (
          <div className="mt-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            <span>{group.notes}</span>
          </div>
        )}

        {/* Linked In-Stock Inventory Section */}
        {(inventoryItems || []).length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t('screenProtectorsPage.card.shopInventory')}
            </div>
            {inventoryItems.map(item => (
              <div 
                key={item.id}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs hover:border-slate-700 transition-colors"
              >
                <div className={`min-w-0 ${isKu ? 'pl-2' : 'pr-2'}`}>
                  <div className="font-semibold text-white truncate">{item.name}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">{t('screenProtectorsPage.card.inStockUnit', { count: item.quantity })}</span>
                    <span>•</span>
                    <span className="text-indigo-300 font-bold">{formatCurrency(item.price, item.currency)}</span>
                    {item.location && (
                      <>
                        <span>•</span>
                        <span className="text-amber-400">{item.location}</span>
                      </>
                    )}
                  </div>
                </div>

                {onAddToCart && (
                  <button
                    onClick={() => {
                      sound.playClick();
                      onAddToCart(item);
                    }}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-xs transition-all flex items-center gap-1 shadow-sm"
                  >
                    <ShoppingCart className="w-3 h-3" />
                    <span>{t('screenProtectorsPage.card.posAdd')}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Action Controls */}
      <div className="p-3 bg-[#0a0d17] border-t border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {onAddModel && (
            <button
              onClick={() => {
                sound.playClick();
                onAddModel(group);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1"
              title={t('screenProtectorsPage.card.addModel')}
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('screenProtectorsPage.card.addModel')}</span>
            </button>
          )}

          {onPrintLabel && (
            <button
              onClick={() => {
                sound.playClick();
                onPrintLabel(group);
              }}
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title={t('screenProtectorsPage.card.printLabel')}
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {onEdit && (
          <button
            onClick={() => {
              sound.playClick();
              onEdit(group);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1"
          >
            <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>{t('screenProtectorsPage.card.editGroup')}</span>
          </button>
        )}
      </div>
    </div>
  );
}

