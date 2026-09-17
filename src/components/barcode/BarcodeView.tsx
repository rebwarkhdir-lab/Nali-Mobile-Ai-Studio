import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { QRCodeSVG } from 'qrcode.react';

export type BarcodeFormat = 'CODE128' | 'EAN13' | 'UPC' | 'CODE39' | 'QR';

interface BarcodeViewProps {
  value: string;
  format?: BarcodeFormat;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  lineColor?: string;
  background?: string;
  margin?: number;
  className?: string;
}

export default function BarcodeView({
  value,
  format = 'CODE128',
  width = 1.2,
  height = 30,
  displayValue = true,
  fontSize = 10,
  lineColor = '#000000',
  background = '#ffffff',
  margin = 0,
  className = ''
}: BarcodeViewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (format === 'QR' || !svgRef.current || !value) return;

    const renderBarcode = (fmt: string) => {
      if (!svgRef.current) return;
      JsBarcode(svgRef.current, value.trim(), {
        format: fmt,
        width,
        height,
        displayValue,
        fontSize,
        font: 'monospace',
        fontOptions: 'bold',
        textMargin: 1,
        lineColor: '#000000',
        background: '#ffffff',
        margin: 0
      });

      // Crucial: Set viewBox and responsive attributes so barcode scales cleanly without clipping
      const currentW = svgRef.current.getAttribute('width');
      const currentH = svgRef.current.getAttribute('height');
      if (currentW && currentH) {
        svgRef.current.setAttribute('viewBox', `0 0 ${currentW} ${currentH}`);
        svgRef.current.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        svgRef.current.removeAttribute('width');
        svgRef.current.removeAttribute('height');
        svgRef.current.style.width = '100%';
        svgRef.current.style.maxWidth = '100%';
        svgRef.current.style.height = '100%';
        svgRef.current.style.maxHeight = '100%';
        svgRef.current.style.display = 'block';
      }
    };

    try {
      let targetFormat = format;
      // If user selected EAN13 but value is not 13 digits, fallback gracefully to CODE128
      if (format === 'EAN13' && !/^\d{13}$/.test(value.trim())) {
        targetFormat = 'CODE128';
      }
      renderBarcode(targetFormat);
    } catch (err) {
      console.warn('JsBarcode render error, falling back to CODE128:', err);
      try {
        renderBarcode('CODE128');
      } catch (fallbackErr) {
        console.error('Failed fallback barcode rendering:', fallbackErr);
      }
    }
  }, [value, format, width, height, displayValue, fontSize, lineColor, background, margin]);

  if (!value || value.trim() === '') {
    return (
      <div className={`flex items-center justify-center p-2 text-[10px] text-slate-500 border border-dashed border-slate-300 rounded ${className}`}>
        No Barcode Value
      </div>
    );
  }

  if (format === 'QR') {
    return (
      <div className={`flex flex-col items-center justify-center w-full max-w-full overflow-hidden ${className}`}>
        <div className="w-full max-w-[80px] aspect-square flex items-center justify-center">
          <QRCodeSVG
            value={value}
            size={Math.max(40, Math.min(height * 2, 90))}
            fgColor="#000000"
            bgColor="#ffffff"
            level="M"
            marginSize={1}
            className="w-full h-auto max-w-full block"
          />
        </div>
        {displayValue && (
          <span className="font-mono text-[8px] font-bold mt-0.5 text-black tracking-wider text-center max-w-full truncate block">
            {value}
          </span>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`w-full max-w-full overflow-hidden flex items-center justify-start ${className}`}
      style={{ width: '100%', maxWidth: '100%', height: '100%', maxHeight: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}
    >
      <svg 
        ref={svgRef} 
        className="w-full max-w-full h-auto block" 
        style={{ width: '100%', maxWidth: '100%', height: 'auto', maxHeight: '100%', display: 'block' }} 
      />
    </div>
  );
}
