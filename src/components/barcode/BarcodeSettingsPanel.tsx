import React, { useState } from 'react';
import { 
  Sliders, 
  Type, 
  Tag, 
  DollarSign, 
  Barcode as BarcodeIcon, 
  Store, 
  ShieldCheck, 
  Calendar, 
  Layers, 
  RotateCcw, 
  Save, 
  Sparkles, 
  Check, 
  Maximize2,
  Minimize2,
  Smartphone,
  Package,
  Cable,
  Printer
} from 'lucide-react';
import { LabelPrintConfig, DEFAULT_LABEL_CONFIG, FontScaleType } from './BarcodePrintLabel';
import { LABEL_SIZES, LabelSizeOption, BARCODE_SETTINGS_STORAGE_KEY } from '../../lib/barcodeUtils';
import { BarcodeFormat } from './BarcodeView';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface BarcodeSettingsPanelProps {
  config: LabelPrintConfig;
  onChange: (newConfig: LabelPrintConfig) => void;
  onSaveAsDefault?: () => void;
  onResetDefaults?: () => void;
  className?: string;
  isCompact?: boolean;
}

export default function BarcodeSettingsPanel({
  config,
  onChange,
  onSaveAsDefault,
  onResetDefaults,
  className = '',
  isCompact = false
}: BarcodeSettingsPanelProps) {
  const { t, i18n } = useTranslation();
  const isKu = i18n.language === 'ku';

  const [activeSection, setActiveSection] = useState<'size' | 'fonts' | 'fields' | 'barcode' | 'presets'>('size');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const updateConfig = (updates: Partial<LabelPrintConfig>) => {
    onChange({ ...config, ...updates });
  };

  const handleSaveToLocalStorage = () => {
    try {
      localStorage.setItem(BARCODE_SETTINGS_STORAGE_KEY, JSON.stringify(config));
      setSavedSuccess(true);
      if (onSaveAsDefault) onSaveAsDefault();
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleResetToFactory = () => {
    if (onResetDefaults) {
      onResetDefaults();
    } else {
      onChange(DEFAULT_LABEL_CONFIG);
      try {
        localStorage.removeItem(BARCODE_SETTINGS_STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
  };

  // Quick One-Click Preset Templates
  const applyPresetTemplate = (presetType: 'mobile_full' | 'accessory_compact' | 'minimal_price' | 'cable_wrap' | 'shelf_large') => {
    switch (presetType) {
      case 'mobile_full':
        onChange({
          ...config,
          sizeId: '60x40',
          barcodeFormat: 'CODE128',
          fontScale: 'md',
          showTitle: true,
          showBrand: true,
          showStoreName: true,
          showPrice: true,
          showDualCurrency: true,
          showBarcode: true,
          showBarcodeText: true,
          showSpecs: true,
          showWarranty: true,
          showDate: false,
          showBorder: true,
          borderStyle: 'solid',
          barcodeHeightScale: 'normal',
          barcodeWidthScale: 'normal'
        });
        break;
      case 'accessory_compact':
        onChange({
          ...config,
          sizeId: '40x25',
          barcodeFormat: 'CODE128',
          fontScale: 'sm',
          showTitle: true,
          showBrand: true,
          showStoreName: true,
          showPrice: true,
          showDualCurrency: true,
          showBarcode: true,
          showBarcodeText: true,
          showSpecs: false,
          showWarranty: false,
          showDate: false,
          showBorder: true,
          borderStyle: 'solid',
          barcodeHeightScale: 'compact',
          barcodeWidthScale: 'narrow'
        });
        break;
      case 'minimal_price':
        onChange({
          ...config,
          sizeId: '40x20',
          barcodeFormat: 'EAN13',
          fontScale: 'md',
          showTitle: true,
          showBrand: false,
          showStoreName: false,
          showPrice: true,
          showDualCurrency: false,
          showBarcode: true,
          showBarcodeText: true,
          showSpecs: false,
          showWarranty: false,
          showDate: false,
          showBorder: true,
          borderStyle: 'solid',
          barcodeHeightScale: 'compact',
          barcodeWidthScale: 'normal'
        });
        break;
      case 'cable_wrap':
        onChange({
          ...config,
          sizeId: 'cable_tag',
          barcodeFormat: 'CODE128',
          fontScale: 'sm',
          showTitle: true,
          showBrand: true,
          showStoreName: true,
          showPrice: true,
          showDualCurrency: false,
          showBarcode: true,
          showBarcodeText: true,
          showSpecs: false,
          showWarranty: false,
          showDate: false,
          showBorder: true,
          borderStyle: 'dashed',
          barcodeHeightScale: 'compact',
          barcodeWidthScale: 'narrow'
        });
        break;
      case 'shelf_large':
        onChange({
          ...config,
          sizeId: '70x35',
          barcodeFormat: 'CODE128',
          fontScale: 'lg',
          showTitle: true,
          showBrand: true,
          showStoreName: true,
          showPrice: true,
          showDualCurrency: true,
          showBarcode: true,
          showBarcodeText: true,
          showSpecs: true,
          showWarranty: true,
          showDate: true,
          showBorder: true,
          borderStyle: 'solid',
          barcodeHeightScale: 'tall',
          barcodeWidthScale: 'wide'
        });
        break;
    }
  };

  return (
    <div dir={isKu ? 'rtl' : 'ltr'} className={cn("space-y-5 text-slate-200", className)}>
      {/* Settings Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveSection('size')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap",
              activeSection === 'size'
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            )}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{t('barcodeStudio.settings.navSize')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('fonts')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap",
              activeSection === 'fonts'
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            )}
          >
            <Type className="w-3.5 h-3.5" />
            <span>{t('barcodeStudio.settings.navFonts')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('fields')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap",
              activeSection === 'fields'
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            )}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>{t('barcodeStudio.settings.navFields')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('barcode')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap",
              activeSection === 'barcode'
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            )}
          >
            <BarcodeIcon className="w-3.5 h-3.5" />
            <span>{t('barcodeStudio.settings.navBarcode')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('presets')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap",
              activeSection === 'presets'
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('barcodeStudio.settings.navPresets')}</span>
          </button>
        </div>

        {/* Global Save as Default & Reset Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToFactory}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-800 transition-colors cursor-pointer"
            title={t('barcodeStudio.settings.resetSuccess')}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('barcodeStudio.settings.reset')}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveToLocalStorage}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
              savedSuccess
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                : "bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/30 text-cyan-300"
            )}
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('barcodeStudio.settings.savedDefaults')}</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{t('barcodeStudio.settings.saveDefaults')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* SECTION 1: LABEL SIZE & DIMENSIONS */}
      {activeSection === 'size' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              {t('barcodeStudio.panel.thermalRollDimensions')}
            </span>
            <span className="text-[11px] text-slate-400">
              {t('barcodeStudio.panel.activeLabel')}{' '}
              <strong className="text-white font-mono">{config.sizeId === 'custom' ? `${config.customWidthMm || 50}×${config.customHeightMm || 30} mm` : config.sizeId}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {LABEL_SIZES.map((size) => {
              const isSelected = config.sizeId === size.id;
              return (
                <div
                  key={size.id}
                  onClick={() => updateConfig({ sizeId: size.id as any })}
                  className={cn(
                    "p-3 rounded-xl border transition-all cursor-pointer text-left flex flex-col justify-between relative",
                    isSelected
                      ? "bg-cyan-500/15 border-cyan-500/50 shadow-md shadow-cyan-950/30 ring-1 ring-cyan-500/30"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-white flex items-center gap-1.5">
                        {size.name}
                      </span>
                      {size.isThermal && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {t('barcodeStudio.panel.thermalBadge')}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1 mb-2">
                      {size.description}
                    </p>
                  </div>
                  <div className="text-[10px] font-medium text-cyan-400/90 pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
                    <span>{size.recommendedFor}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Dimension Sliders (Enabled when 'custom' is chosen) */}
          {config.sizeId === 'custom' && (
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  {t('barcodeStudio.panel.customDimensions')}
                </span>
                <span className="text-xs font-mono text-slate-300">
                  {config.customWidthMm || 50}mm (W) × {config.customHeightMm || 30}mm (H)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>{t('barcodeStudio.panel.labelWidth')}</span>
                    <span className="font-mono text-white font-bold">{config.customWidthMm || 50} mm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={20}
                      max={120}
                      step={1}
                      value={config.customWidthMm || 50}
                      onChange={(e) => updateConfig({ customWidthMm: parseInt(e.target.value) || 50 })}
                      className="w-full accent-cyan-400"
                    />
                    <input
                      type="number"
                      min={20}
                      max={120}
                      value={config.customWidthMm || 50}
                      onChange={(e) => updateConfig({ customWidthMm: Math.min(120, Math.max(20, parseInt(e.target.value) || 50)) })}
                      className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-mono text-white"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>{t('barcodeStudio.panel.labelHeight')}</span>
                    <span className="font-mono text-white font-bold">{config.customHeightMm || 30} mm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={15}
                      max={100}
                      step={1}
                      value={config.customHeightMm || 30}
                      onChange={(e) => updateConfig({ customHeightMm: parseInt(e.target.value) || 30 })}
                      className="w-full accent-cyan-400"
                    />
                    <input
                      type="number"
                      min={15}
                      max={100}
                      value={config.customHeightMm || 30}
                      onChange={(e) => updateConfig({ customHeightMm: Math.min(100, Math.max(15, parseInt(e.target.value) || 30)) })}
                      className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-mono text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Border & Cut Guide Setting */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-white block">{t('barcodeStudio.panel.borderGuidelines')}</span>
              <span className="text-[11px] text-slate-400">{t('barcodeStudio.panel.borderGuidelinesDesc')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => updateConfig({ showBorder: true, borderStyle: 'solid' })}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-lg border font-medium transition-all cursor-pointer",
                  config.showBorder && config.borderStyle === 'solid'
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                    : "bg-slate-900 border-slate-800 text-slate-400"
                )}
              >
                {t('barcodeStudio.panel.solidBorder')}
              </button>
              <button
                type="button"
                onClick={() => updateConfig({ showBorder: true, borderStyle: 'dashed' })}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-lg border font-medium transition-all cursor-pointer",
                  config.showBorder && config.borderStyle === 'dashed'
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                    : "bg-slate-900 border-slate-800 text-slate-400"
                )}
              >
                {t('barcodeStudio.panel.dashedLine')}
              </button>
              <button
                type="button"
                onClick={() => updateConfig({ showBorder: false })}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-lg border font-medium transition-all cursor-pointer",
                  !config.showBorder
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                    : "bg-slate-900 border-slate-800 text-slate-400"
                )}
              >
                {t('barcodeStudio.panel.borderless')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: FONT SIZING & TYPOGRAPHY */}
      {activeSection === 'fonts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-cyan-400" />
              {t('barcodeStudio.panel.typographyScale')}
            </span>
            <span className="text-[11px] text-slate-400">
              {t('barcodeStudio.panel.autoScales')}
            </span>
          </div>

          {/* Global Font Scale Preset Selector */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <label className="text-xs font-semibold text-slate-300 block">
              {t('barcodeStudio.panel.globalTypographyScale')}
            </label>
            <div className="grid grid-cols-5 gap-2">
              {(['xs', 'sm', 'md', 'lg', 'xl'] as FontScaleType[]).map((scale) => {
                const isSelected = (config.fontScale || 'md') === scale;
                const labels: Record<FontScaleType, { name: string; pct: string }> = {
                  xs: { name: t('barcodeStudio.panel.scaleXs'), pct: '80%' },
                  sm: { name: t('barcodeStudio.panel.scaleSm'), pct: '90%' },
                  md: { name: t('barcodeStudio.panel.scaleMd'), pct: '100%' },
                  lg: { name: t('barcodeStudio.panel.scaleLg'), pct: '115%' },
                  xl: { name: t('barcodeStudio.panel.scaleXl'), pct: '130%' }
                };
                return (
                  <button
                    key={scale}
                    type="button"
                    onClick={() => updateConfig({ fontScale: scale, titleFontSize: undefined, priceFontSize: undefined })}
                    className={cn(
                      "py-2 px-1 text-center rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center",
                      isSelected
                        ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-sm"
                        : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    )}
                  >
                    <span className="text-xs font-bold">{labels[scale].name}</span>
                    <span className="text-[10px] font-mono text-slate-500">{labels[scale].pct}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Granular Font Size Sliders */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              {t('barcodeStudio.panel.granularOverrides')}
            </span>

            {/* Product Title Size */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>{t('barcodeStudio.panel.productNameFontSize')}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-white font-bold">{config.titleFontSize ? `${config.titleFontSize}px` : t('barcodeStudio.panel.auto')}</span>
                  {config.titleFontSize && (
                    <button
                      type="button"
                      onClick={() => updateConfig({ titleFontSize: undefined })}
                      className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                    >
                      {t('barcodeStudio.panel.resetAuto')}
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range"
                min={8}
                max={16}
                step={1}
                value={config.titleFontSize || 10}
                onChange={(e) => updateConfig({ titleFontSize: parseInt(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Price Font Size */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>{t('barcodeStudio.panel.priceFontSize')}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-white font-bold">{config.priceFontSize ? `${config.priceFontSize}px` : t('barcodeStudio.panel.auto')}</span>
                  {config.priceFontSize && (
                    <button
                      type="button"
                      onClick={() => updateConfig({ priceFontSize: undefined })}
                      className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                    >
                      {t('barcodeStudio.panel.resetAuto')}
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range"
                min={9}
                max={20}
                step={1}
                value={config.priceFontSize || 12}
                onChange={(e) => updateConfig({ priceFontSize: parseInt(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Barcode Digits Size */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>{t('barcodeStudio.panel.barcodeDigitsFontSize')}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-white font-bold">{config.barcodeFontSize ? `${config.barcodeFontSize}px` : t('barcodeStudio.panel.auto')}</span>
                  {config.barcodeFontSize && (
                    <button
                      type="button"
                      onClick={() => updateConfig({ barcodeFontSize: undefined })}
                      className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                    >
                      {t('barcodeStudio.panel.resetAuto')}
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range"
                min={6}
                max={12}
                step={1}
                value={config.barcodeFontSize || 9}
                onChange={(e) => updateConfig({ barcodeFontSize: parseInt(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: INFORMATION & FIELD DISPLAY TOGGLES */}
      {activeSection === 'fields' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-cyan-400" />
              {t('barcodeStudio.panel.fieldVisibility')}
            </span>
            <span className="text-[11px] text-slate-400">
              {t('barcodeStudio.panel.fieldVisibilityDesc')}
            </span>
          </div>

          {/* Group 1: Product & Pricing */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              {t('barcodeStudio.panel.productPricingInfo')}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Show Product Title */}
              <div 
                onClick={() => updateConfig({ showTitle: config.showTitle === false ? true : false })}
                className={cn(
                  "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                  config.showTitle !== false
                    ? "bg-cyan-500/10 border-cyan-500/40 text-white"
                    : "bg-slate-900/60 border-slate-800 text-slate-500"
                )}
              >
                <div>
                  <span className="text-xs font-bold block">{t('barcodeStudio.panel.productNameTitle')}</span>
                  <span className="text-[10px] text-slate-400">{t('barcodeStudio.panel.productNameSub')}</span>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-md flex items-center justify-center border font-bold text-xs",
                  config.showTitle !== false ? "bg-cyan-500 text-black border-cyan-400" : "border-slate-700 text-transparent"
                )}>
                  ✓
                </div>
              </div>

              {/* Show Brand Prefix */}
              <div 
                onClick={() => updateConfig({ showBrand: config.showBrand === false ? true : false })}
                className={cn(
                  "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                  config.showBrand !== false
                    ? "bg-cyan-500/10 border-cyan-500/40 text-white"
                    : "bg-slate-900/60 border-slate-800 text-slate-500"
                )}
              >
                <div>
                  <span className="text-xs font-bold block">{t('barcodeStudio.panel.brandPrefix')}</span>
                  <span className="text-[10px] text-slate-400">{t('barcodeStudio.panel.brandPrefixSub')}</span>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-md flex items-center justify-center border font-bold text-xs",
                  config.showBrand !== false ? "bg-cyan-500 text-black border-cyan-400" : "border-slate-700 text-transparent"
                )}>
                  ✓
                </div>
              </div>

              {/* Show Price Tag */}
              <div 
                onClick={() => updateConfig({ showPrice: config.showPrice === false ? true : false })}
                className={cn(
                  "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                  config.showPrice !== false
                    ? "bg-cyan-500/10 border-cyan-500/40 text-white"
                    : "bg-slate-900/60 border-slate-800 text-slate-500"
                )}
              >
                <div>
                  <span className="text-xs font-bold block">{t('barcodeStudio.panel.sellingPrice')}</span>
                  <span className="text-[10px] text-slate-400">{t('barcodeStudio.panel.sellingPriceSub')}</span>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-md flex items-center justify-center border font-bold text-xs",
                  config.showPrice !== false ? "bg-cyan-500 text-black border-cyan-400" : "border-slate-700 text-transparent"
                )}>
                  ✓
                </div>
              </div>

              {/* Show Dual Currency Conversion */}
              <div 
                onClick={() => updateConfig({ showDualCurrency: config.showDualCurrency === false ? true : false })}
                className={cn(
                  "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                  config.showDualCurrency !== false
                    ? "bg-cyan-500/10 border-cyan-500/40 text-white"
                    : "bg-slate-900/60 border-slate-800 text-slate-500"
                )}
              >
                <div>
                  <span className="text-xs font-bold block">{t('barcodeStudio.panel.dualCurrency')}</span>
                  <span className="text-[10px] text-slate-400">{t('barcodeStudio.panel.dualCurrencySub')}</span>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-md flex items-center justify-center border font-bold text-xs",
                  config.showDualCurrency !== false ? "bg-cyan-500 text-black border-cyan-400" : "border-slate-700 text-transparent"
                )}>
                  ✓
                </div>
              </div>
            </div>

            {/* Exchange Rate Setting */}
            {config.showDualCurrency && (
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-800/80">
                <span className="text-xs text-slate-400">{t('barcodeStudio.panel.exchangeRate')}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={config.exchangeRate || 1500}
                    onChange={(e) => updateConfig({ exchangeRate: parseFloat(e.target.value) || 1500 })}
                    className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-right font-mono text-cyan-300"
                    placeholder="1500"
                  />
                  <span className="text-xs text-slate-500 font-mono">IQD</span>
                </div>
              </div>
            )}
          </div>

          {/* Group 2: Header, Specs & Metadata */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              {t('barcodeStudio.panel.storeHeaderMeta')}
            </span>

            {/* Store Name Header Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-cyan-400" />
                  {t('barcodeStudio.panel.storeHeaderBranding')}
                </label>
                <button
                  type="button"
                  onClick={() => updateConfig({ showStoreName: !config.showStoreName })}
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer",
                    config.showStoreName ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-900 text-slate-500"
                  )}
                >
                  {config.showStoreName ? t('barcodeStudio.panel.headerVisible') : t('barcodeStudio.panel.headerHidden')}
                </button>
              </div>

              {config.showStoreName && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={config.storeNameText}
                    onChange={(e) => updateConfig({ storeNameText: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    placeholder={t('barcodeStudio.panel.storeNamePlaceholder')}
                  />
                  <input
                    type="text"
                    value={config.storeSubText || ''}
                    onChange={(e) => updateConfig({ storeSubText: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    placeholder={t('barcodeStudio.panel.storeSubPlaceholder')}
                  />
                </div>
              )}
            </div>

            {/* Specs, Warranty, Date Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800">
              <div 
                onClick={() => updateConfig({ showSpecs: !config.showSpecs })}
                className={cn(
                  "p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                  config.showSpecs
                    ? "bg-cyan-500/10 border-cyan-500/40 text-white"
                    : "bg-slate-900/60 border-slate-800 text-slate-500"
                )}
              >
                <div>
                  <span className="text-xs font-semibold block">{t('barcodeStudio.panel.specPills')}</span>
                  <span className="text-[10px] text-slate-400">{t('barcodeStudio.panel.specPillsSub')}</span>
                </div>
                <div className={cn(
                  "w-4 h-4 rounded flex items-center justify-center border text-[10px]",
                  config.showSpecs ? "bg-cyan-500 text-black border-cyan-400" : "border-slate-700 text-transparent"
                )}>
                  ✓
                </div>
              </div>

              <div 
                onClick={() => updateConfig({ showWarranty: !config.showWarranty })}
                className={cn(
                  "p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                  config.showWarranty
                    ? "bg-cyan-500/10 border-cyan-500/40 text-white"
                    : "bg-slate-900/60 border-slate-800 text-slate-500"
                )}
              >
                <div>
                  <span className="text-xs font-semibold block">{t('barcodeStudio.panel.warrantyBadge')}</span>
                  <span className="text-[10px] text-slate-400">{t('barcodeStudio.panel.warrantyBadgeSub')}</span>
                </div>
                <div className={cn(
                  "w-4 h-4 rounded flex items-center justify-center border text-[10px]",
                  config.showWarranty ? "bg-cyan-500 text-black border-cyan-400" : "border-slate-700 text-transparent"
                )}>
                  ✓
                </div>
              </div>

              <div 
                onClick={() => updateConfig({ showDate: !config.showDate })}
                className={cn(
                  "p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                  config.showDate
                    ? "bg-cyan-500/10 border-cyan-500/40 text-white"
                    : "bg-slate-900/60 border-slate-800 text-slate-500"
                )}
              >
                <div>
                  <span className="text-xs font-semibold block">{t('barcodeStudio.panel.dateStamp')}</span>
                  <span className="text-[10px] text-slate-400">{t('barcodeStudio.panel.dateStampSub')}</span>
                </div>
                <div className={cn(
                  "w-4 h-4 rounded flex items-center justify-center border text-[10px]",
                  config.showDate ? "bg-cyan-500 text-black border-cyan-400" : "border-slate-700 text-transparent"
                )}>
                  ✓
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: BARCODE & SYMBOLOGY SPECS */}
      {activeSection === 'barcode' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <BarcodeIcon className="w-3.5 h-3.5 text-cyan-400" />
              {t('barcodeStudio.panel.barcodeSymbologyTitle')}
            </span>
            <span className="text-[11px] text-slate-400">
              {t('barcodeStudio.panel.barcodeSymbologyDesc')}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
            {/* Symbology Type Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                {t('barcodeStudio.panel.barcodeFormat')}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'CODE128', name: 'Code 128', desc: t('barcodeStudio.panel.formatCode128') },
                  { id: 'EAN13', name: 'EAN-13', desc: t('barcodeStudio.panel.formatEan13') },
                  { id: 'UPC', name: 'UPC-A', desc: t('barcodeStudio.panel.formatUpc') },
                  { id: 'QR', name: 'QR Code', desc: t('barcodeStudio.panel.formatQr') }
                ].map((fmt) => {
                  const isSelected = config.barcodeFormat === fmt.id;
                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => updateConfig({ barcodeFormat: fmt.id as BarcodeFormat })}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between",
                        isSelected
                          ? "bg-cyan-500/20 border-cyan-500/50 text-white shadow-sm ring-1 ring-cyan-500/30"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                      )}
                    >
                      <span className="text-xs font-bold text-white block mb-0.5">{fmt.name}</span>
                      <span className="text-[10px] text-slate-400 leading-tight">{fmt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Barcode Display Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
              <div 
                onClick={() => updateConfig({ showBarcode: config.showBarcode === false ? true : false })}
                className={cn(
                  "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                  config.showBarcode !== false
                    ? "bg-cyan-500/10 border-cyan-500/40 text-white"
                    : "bg-slate-900/60 border-slate-800 text-slate-500"
                )}
              >
                <div>
                  <span className="text-xs font-bold block">{t('barcodeStudio.panel.barcodeGraphics')}</span>
                  <span className="text-[10px] text-slate-400">{t('barcodeStudio.panel.barcodeGraphicsSub')}</span>
                </div>
                <div className={cn(
                  "w-4 h-4 rounded flex items-center justify-center border text-[10px]",
                  config.showBarcode !== false ? "bg-cyan-500 text-black border-cyan-400" : "border-slate-700 text-transparent"
                )}>
                  ✓
                </div>
              </div>

              <div 
                onClick={() => updateConfig({ showBarcodeText: config.showBarcodeText === false ? true : false })}
                className={cn(
                  "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                  config.showBarcodeText !== false
                    ? "bg-cyan-500/10 border-cyan-500/40 text-white"
                    : "bg-slate-900/60 border-slate-800 text-slate-500"
                )}
              >
                <div>
                  <span className="text-xs font-bold block">{t('barcodeStudio.panel.humanReadable')}</span>
                  <span className="text-[10px] text-slate-400">{t('barcodeStudio.panel.humanReadableSub')}</span>
                </div>
                <div className={cn(
                  "w-4 h-4 rounded flex items-center justify-center border text-[10px]",
                  config.showBarcodeText !== false ? "bg-cyan-500 text-black border-cyan-400" : "border-slate-700 text-transparent"
                )}>
                  ✓
                </div>
              </div>
            </div>

            {/* Barcode Heights & Density Scales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  {t('barcodeStudio.panel.barHeight')}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['compact', 'normal', 'tall'] as const).map((h) => {
                    const heightNames: Record<'compact' | 'normal' | 'tall', string> = {
                      compact: t('barcodeStudio.panel.compact'),
                      normal: t('barcodeStudio.panel.normal'),
                      tall: t('barcodeStudio.panel.tall')
                    };
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => updateConfig({ barcodeHeightScale: h })}
                        className={cn(
                          "py-1.5 text-xs font-semibold rounded-lg border capitalize transition-all cursor-pointer",
                          (config.barcodeHeightScale || 'normal') === h
                            ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
                        )}
                      >
                        {heightNames[h]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  {t('barcodeStudio.panel.barWidthDensity')}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['narrow', 'normal', 'wide'] as const).map((w) => {
                    const widthNames: Record<'narrow' | 'normal' | 'wide', string> = {
                      narrow: t('barcodeStudio.panel.narrow'),
                      normal: t('barcodeStudio.panel.normal'),
                      wide: t('barcodeStudio.panel.wide')
                    };
                    return (
                      <button
                        key={w}
                        type="button"
                        onClick={() => updateConfig({ barcodeWidthScale: w })}
                        className={cn(
                          "py-1.5 text-xs font-semibold rounded-lg border capitalize transition-all cursor-pointer",
                          (config.barcodeWidthScale || 'normal') === w
                            ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
                        )}
                      >
                        {widthNames[w]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: QUICK PRESETS */}
      {activeSection === 'presets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              {t('barcodeStudio.panel.presetTemplatesTitle')}
            </span>
            <span className="text-[11px] text-slate-400">
              {t('barcodeStudio.panel.presetTemplatesDesc')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div 
              onClick={() => applyPresetTemplate('mobile_full')}
              className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-900/80 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold text-white group-hover:text-cyan-300 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  {t('barcodeStudio.panel.presetMobileTitle')}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400">60×40 mm</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('barcodeStudio.panel.presetMobileDesc')}
              </p>
            </div>

            <div 
              onClick={() => applyPresetTemplate('accessory_compact')}
              className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-900/80 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold text-white group-hover:text-cyan-300 flex items-center gap-2">
                  <Package className="w-4 h-4 text-cyan-400" />
                  {t('barcodeStudio.panel.presetAccessoryTitle')}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400">40×25 mm</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('barcodeStudio.panel.presetAccessoryDesc')}
              </p>
            </div>

            <div 
              onClick={() => applyPresetTemplate('minimal_price')}
              className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-900/80 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold text-white group-hover:text-cyan-300 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  {t('barcodeStudio.panel.presetMinimalTitle')}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400">40×20 mm</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('barcodeStudio.panel.presetMinimalDesc')}
              </p>
            </div>

            <div 
              onClick={() => applyPresetTemplate('cable_wrap')}
              className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-900/80 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold text-white group-hover:text-cyan-300 flex items-center gap-2">
                  <Cable className="w-4 h-4 text-amber-400" />
                  {t('barcodeStudio.panel.presetCableTitle')}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400">85×25 mm</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('barcodeStudio.panel.presetCableDesc')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
