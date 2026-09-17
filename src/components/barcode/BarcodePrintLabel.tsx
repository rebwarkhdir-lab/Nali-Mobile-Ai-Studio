import React from 'react';
import BarcodeView, { BarcodeFormat } from './BarcodeView';
import { formatNumberWithCommas } from '../../lib/utils';
import { getLabelDimensions } from '../../lib/barcodeUtils';

export interface LabelData {
  id?: string;
  itemType: 'mobile' | 'accessory' | 'screen_protector' | 'custom';
  title: string;
  brand?: string;
  barcode: string;
  price: number;
  currency: 'USD' | 'IQD';
  secondaryPrice?: number;
  specs?: string[];
  warranty?: string;
  date?: string;
  storeName?: string;
  statusBadge?: string;
}

export type FontScaleType = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface LabelPrintConfig {
  sizeId: '50x30' | '40x30' | '50x25' | '38x25' | '40x25' | '60x40' | '40x20' | '70x35' | 'cable_tag' | 'a4_24' | 'custom' | string;
  customWidthMm?: number;
  customHeightMm?: number;
  barcodeFormat: BarcodeFormat;
  fontScale?: FontScaleType;
  titleFontSize?: number;
  priceFontSize?: number;
  barcodeFontSize?: number;
  barcodeHeightScale?: 'compact' | 'normal' | 'tall';
  barcodeWidthScale?: 'narrow' | 'normal' | 'wide';
  showTitle?: boolean;
  showBrand?: boolean;
  showStoreName: boolean;
  storeNameText: string;
  storeSubText?: string;
  showPrice: boolean;
  showDualCurrency: boolean;
  exchangeRate?: number;
  showBarcode?: boolean;
  showBarcodeText?: boolean;
  showSpecs: boolean;
  showWarranty: boolean;
  showDate: boolean;
  showBorder?: boolean;
  borderStyle?: 'solid' | 'dashed' | 'none';
  textAlign?: 'left' | 'center';
  copies: number;
}

export const DEFAULT_LABEL_CONFIG: LabelPrintConfig = {
  sizeId: '50x30',
  customWidthMm: 50,
  customHeightMm: 30,
  barcodeFormat: 'CODE128',
  fontScale: 'md',
  showTitle: true,
  showBrand: true,
  showStoreName: true,
  storeNameText: 'NALI MOBILE',
  storeSubText: '',
  showPrice: true,
  showDualCurrency: true,
  exchangeRate: 1500,
  showBarcode: true,
  showBarcodeText: true,
  showSpecs: true,
  showWarranty: true,
  showDate: false,
  showBorder: true,
  borderStyle: 'solid',
  textAlign: 'left',
  barcodeHeightScale: 'normal',
  barcodeWidthScale: 'normal',
  copies: 1
};

interface BarcodePrintLabelProps {
  data: LabelData;
  config: LabelPrintConfig;
  className?: string;
}

export default function BarcodePrintLabel({
  data,
  config,
  className = ''
}: BarcodePrintLabelProps) {
  const showStoreName = config.showStoreName !== false;
  const showTitle = config.showTitle !== false;
  const showBrand = config.showBrand !== false;
  const showPrice = config.showPrice !== false;
  const showDualCurrency = config.showDualCurrency !== false;
  const showBarcode = config.showBarcode !== false;
  const showBarcodeText = config.showBarcodeText !== false;
  const showSpecs = config.showSpecs !== false;
  const showWarranty = config.showWarranty !== false;
  const showDate = config.showDate === true;
  const showBorder = config.showBorder !== false;
  const borderStyle = config.borderStyle || 'solid';

  const storeName = showStoreName ? (config.storeNameText || data.storeName || 'NALI MOBILE') : '';

  // Get active physical dimensions in millimeters
  const { widthMm, heightMm } = getLabelDimensions(config);

  // Calculate secondary price if dual currency is requested
  let secondaryPriceText = '';
  if (showDualCurrency && config.exchangeRate && data.price > 0) {
    if (data.currency === 'USD') {
      const iqdVal = Math.round(data.price * config.exchangeRate);
      secondaryPriceText = `${formatNumberWithCommas(iqdVal)} IQD`;
    } else {
      const usdVal = (data.price / config.exchangeRate).toFixed(1);
      secondaryPriceText = `$${usdVal}`;
    }
  }

  // Format primary price string
  const primaryPriceText = data.currency === 'USD' 
    ? `$${formatNumberWithCommas(data.price)}`
    : `${formatNumberWithCommas(data.price)} IQD`;

  const isCableTag = config.sizeId === 'cable_tag';

  // Font scale multiplier
  const fontMultiplier = 
    config.fontScale === 'xs' ? 0.8 :
    config.fontScale === 'sm' ? 0.9 :
    config.fontScale === 'lg' ? 1.15 :
    config.fontScale === 'xl' ? 1.3 : 1.0;

  // Responsive barcode scaling for thermal print heads
  let baseBarcodeHeight = heightMm <= 20 ? 16 : heightMm <= 25 ? 20 : heightMm <= 30 ? 26 : 34;
  if (config.barcodeHeightScale === 'compact') baseBarcodeHeight *= 0.75;
  if (config.barcodeHeightScale === 'tall') baseBarcodeHeight *= 1.25;

  let baseBarcodeWidth = widthMm <= 38 ? 1.0 : widthMm <= 50 ? 1.15 : 1.35;
  if (config.barcodeWidthScale === 'narrow') baseBarcodeWidth *= 0.85;
  if (config.barcodeWidthScale === 'wide') baseBarcodeWidth *= 1.25;

  const resolvedBarcodeFontSize = config.barcodeFontSize || (heightMm <= 25 ? 8 : 9);

  // Full item title with optional brand prefix
  const fullTitle = showBrand && data.brand && !data.title.toLowerCase().startsWith(data.brand.toLowerCase())
    ? `${data.brand} ${data.title}`
    : data.title;

  // Auto-calculated typography to ensure text never overflows or clips
  const titleSizePx = config.titleFontSize || Math.round(
    (heightMm <= 20 ? 7.5 : heightMm <= 25 ? 8.5 : fullTitle.length > 28 ? 9.5 : 10.5) * fontMultiplier
  );
  const priceSizePx = config.priceFontSize || Math.round(
    (heightMm <= 20 ? 9 : heightMm <= 25 ? 10 : heightMm <= 30 ? 11.5 : 13) * fontMultiplier
  );
  const headerStoreSizePx = Math.round(
    (heightMm <= 20 ? 7 : heightMm <= 25 ? 7.5 : 8.5) * fontMultiplier
  );

  // Outer container dimension style with explicit mm dimensions and 1.5mm safe buffer
  const dimensionStyle: React.CSSProperties = {
    ['--label-width' as any]: `${widthMm}mm`,
    ['--label-height' as any]: `${heightMm}mm`,
    width: `${widthMm}mm`,
    height: `${heightMm}mm`,
    minWidth: `${widthMm}mm`,
    minHeight: `${heightMm}mm`,
    maxWidth: `${widthMm}mm`,
    maxHeight: `${heightMm}mm`,
    boxSizing: 'border-box',
    padding: '1.5mm', // Strict 1.5mm safe-zone buffer to prevent physical printer feed drift
    overflow: 'hidden',
    position: 'relative',
    direction: 'ltr', // Explicit physical sticker direction
    backgroundColor: '#ffffff',
    color: '#000000',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    display: 'flex',
    flexDirection: isCableTag ? 'row' : 'column',
    justifyContent: 'space-between',
    lineHeight: 1.15
  };

  const borderClass = !showBorder
    ? 'border-0'
    : borderStyle === 'dashed'
    ? 'border border-dashed border-black'
    : 'border border-black';

  // Status or Condition Badge text
  const badgeText = data.statusBadge || data.warranty || (heightMm >= 25 ? 'Store Verified' : '');

  // 1. Foldable Cable / Jewelry wrap tag format
  if (isCableTag) {
    return (
      <div
        style={dimensionStyle}
        className={`thermal-label bg-white text-black font-sans box-border flex flex-row items-center justify-between overflow-hidden leading-tight select-none ${borderClass} ${className}`}
      >
        {/* Left Side (Attached to item) */}
        <div 
          className="w-1/2 pr-1 flex flex-col justify-between h-full border-r border-dashed border-black"
          style={{ width: '50%', paddingRight: '1mm', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', borderRight: '1px dashed #000000', boxSizing: 'border-box' }}
        >
          {showStoreName && (
            <div 
              style={{ fontSize: `${Math.round(8 * fontMultiplier)}px`, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#000000' }}
              className="font-black uppercase tracking-wider truncate text-black"
            >
              {storeName || 'NALI MOBILE'}
            </div>
          )}
          {showTitle && (
            <div 
              style={{ fontSize: `${titleSizePx}px`, fontWeight: 900, color: '#000000', lineHeight: 1.15, overflow: 'hidden', wordBreak: 'break-word', direction: 'auto' }}
              className="font-black text-black truncate leading-tight"
            >
              {fullTitle}
            </div>
          )}
          {showPrice && data.price > 0 && (
            <div 
              style={{ fontSize: `${priceSizePx}px`, fontWeight: 900, color: '#000000', lineHeight: 1 }}
              className="font-black text-black leading-none"
            >
              {primaryPriceText}
            </div>
          )}
        </div>

        {/* Right Side (Barcode flap) */}
        <div 
          className="w-1/2 pl-1 flex flex-col items-center justify-center h-full"
          style={{ width: '50%', paddingLeft: '1mm', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', boxSizing: 'border-box', overflow: 'hidden' }}
        >
          {showBarcode && (
            <BarcodeView
              value={data.barcode}
              format={config.barcodeFormat}
              width={baseBarcodeWidth}
              height={baseBarcodeHeight}
              fontSize={resolvedBarcodeFontSize}
              displayValue={showBarcodeText && config.barcodeFormat !== 'QR'}
              margin={0}
            />
          )}
        </div>
      </div>
    );
  }

  // 2. Standard Vertical Thermal Label Layout with Strict Hierarchy
  return (
    <div
      style={dimensionStyle}
      className={`thermal-label bg-white text-black font-sans box-border flex flex-col justify-between overflow-hidden leading-tight select-none ${borderClass} ${className}`}
    >
      {/* SECTION 1: Store Header & Status Badge */}
      {(showStoreName || badgeText || (showDate && data.date) || config.storeSubText) && (
        <div 
          className="tl-header flex items-center justify-between gap-1 border-b border-black pb-[0.4mm] shrink-0"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #000000',
            paddingBottom: '0.4mm',
            marginBottom: '0.3mm',
            flexShrink: 0,
            width: '100%',
            overflow: 'hidden'
          }}
        >
          {showStoreName && (
            <div 
              className="tl-store flex items-center gap-1 min-w-0"
              style={{
                display: 'flex',
                alignItems: 'center',
                minWidth: 0,
                flex: '1 1 auto',
                overflow: 'hidden'
              }}
            >
              <span 
                style={{ 
                  fontSize: `${headerStoreSizePx}px`,
                  fontWeight: 900,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: '#000000',
                  display: 'inline-block',
                  maxWidth: '100%'
                }} 
                className="font-black tracking-wider uppercase text-black truncate"
              >
                {storeName}
              </span>
              {config.storeSubText && (
                <span 
                  style={{
                    fontSize: '6.5px',
                    fontWeight: 700,
                    color: '#000000',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  className="text-[6.5px] text-black font-bold truncate hidden sm:inline"
                >
                  • {config.storeSubText}
                </span>
              )}
            </div>
          )}

          <div 
            className="tl-badge-date flex items-center gap-1 ml-auto shrink-0"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1mm',
              marginLeft: 'auto',
              flexShrink: 0
            }}
          >
            {badgeText && (
              <span 
                style={{
                  fontSize: '6.5px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '0.5px 2px',
                  border: '1px solid #000000',
                  borderRadius: '2px',
                  color: '#000000',
                  backgroundColor: '#ffffff',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  display: 'inline-block'
                }}
                className="text-[6.5px] font-black uppercase px-1 py-[0.5px] border border-black rounded-[2px] text-black bg-white leading-none whitespace-nowrap"
              >
                {badgeText}
              </span>
            )}
            {showDate && (
              <span 
                style={{
                  fontSize: '6.5px',
                  fontWeight: 700,
                  color: '#000000',
                  whiteSpace: 'nowrap'
                }}
                className="text-[6.5px] font-bold text-black whitespace-nowrap"
              >
                {data.date || new Date().toISOString().split('T')[0]}
              </span>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2 & 3: Product Name & Specifications */}
      {showTitle && (
        <div 
          className="tl-body py-[0.3mm] flex-1 flex flex-col justify-center min-h-0 overflow-hidden"
          style={{
            flex: '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: 0,
            overflow: 'hidden',
            padding: '0.2mm 0'
          }}
        >
          {/* Product Name (supports 1-2 line graceful wrap without clipping) */}
          <div 
            style={{ 
              fontSize: `${titleSizePx}px`,
              fontWeight: 900,
              color: '#000000',
              lineHeight: 1.15,
              maxHeight: '2.4em',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              wordBreak: 'break-word',
              direction: 'auto'
            }} 
            className="font-black text-black leading-tight line-clamp-2 break-words"
          >
            {fullTitle}
          </div>
          
          {/* Specifications Pills */}
          {showSpecs && data.specs && data.specs.length > 0 && heightMm > 20 && (
            <div 
              className="tl-specs flex flex-wrap items-center gap-1 mt-[0.5mm] overflow-hidden"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '1mm',
                marginTop: '0.4mm',
                maxHeight: '1.4em',
                overflow: 'hidden'
              }}
            >
              {data.specs.slice(0, heightMm <= 25 ? 2 : 4).map((spec, i) => (
                <span 
                  key={i} 
                  style={{
                    fontSize: '6.5px',
                    fontWeight: 700,
                    padding: '0.5px 2px',
                    border: '1px solid #000000',
                    borderRadius: '2px',
                    color: '#000000',
                    backgroundColor: '#ffffff',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    display: 'inline-block'
                  }}
                  className="text-[6.5px] font-bold px-1 py-[0.5px] border border-black rounded-[2px] text-black bg-white leading-none whitespace-nowrap"
                >
                  {spec}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: Barcode & Price Row */}
      <div 
        className="tl-footer flex items-center justify-between gap-1 mt-auto pt-[0.4mm] shrink-0 border-t border-black/30"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5mm',
          marginTop: 'auto',
          paddingTop: '0.4mm',
          borderTop: '1px solid rgba(0, 0, 0, 0.3)',
          flexShrink: 0,
          width: '100%',
          overflow: 'hidden',
          minHeight: `${baseBarcodeHeight + 4}px`
        }}
      >
        {/* Barcode Column (Sharp SVG with human-readable value) */}
        {showBarcode ? (
          <div 
            className="tl-barcode flex-1 overflow-hidden flex items-center justify-start min-w-0"
            style={{
              flex: '1 1 0%',
              minWidth: 0,
              height: '100%',
              maxHeight: '100%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start'
            }}
          >
            <BarcodeView
              value={data.barcode}
              format={config.barcodeFormat}
              width={baseBarcodeWidth}
              height={baseBarcodeHeight}
              fontSize={resolvedBarcodeFontSize}
              displayValue={showBarcodeText && config.barcodeFormat !== 'QR'}
              margin={0}
            />
          </div>
        ) : (
          <div 
            style={{
              flex: '1 1 0%',
              minWidth: 0,
              fontSize: '8.5px',
              fontFamily: 'monospace',
              fontWeight: 700,
              color: '#000000',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            className="flex-1 text-[8.5px] font-mono font-bold text-black truncate"
          >
            {showBarcodeText && data.barcode}
          </div>
        )}

        {/* Price Column (Prominent bold with optional dual currency) */}
        {showPrice && (
          <div 
            className="tl-price flex flex-col items-end justify-center text-right shrink-0 pl-1 border-l border-black"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              justifyContent: 'center',
              textAlign: 'right',
              flexShrink: 0,
              paddingLeft: '1.2mm',
              borderLeft: '1px solid #000000'
            }}
          >
            <span 
              style={{ 
                fontSize: `${priceSizePx}px`,
                fontWeight: 900,
                color: '#000000',
                lineHeight: 1,
                whiteSpace: 'nowrap',
                display: 'block'
              }} 
              className="font-black text-black leading-none whitespace-nowrap"
            >
              {primaryPriceText}
            </span>
            {showDualCurrency && secondaryPriceText && (
              <span 
                style={{
                  fontSize: '6.5px',
                  fontWeight: 800,
                  color: '#000000',
                  marginTop: '0.4mm',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  display: 'block'
                }}
                className="text-[6.5px] font-black text-black mt-[0.5mm] leading-none whitespace-nowrap"
              >
                ≈ {secondaryPriceText}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
