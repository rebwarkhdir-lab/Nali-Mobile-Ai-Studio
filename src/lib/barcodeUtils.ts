/**
 * Barcode & Label Utility Functions
 */

export interface LabelSizeOption {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  description: string;
  isThermal: boolean;
  recommendedFor: string;
}

export const LABEL_SIZES: LabelSizeOption[] = [
  {
    id: '50x30',
    name: '50 × 30 mm (Standard Retail)',
    widthMm: 50,
    heightMm: 30,
    description: 'Standard thermal sticker roll for phones & accessories (Default)',
    isThermal: true,
    recommendedFor: 'Smartphones, Chargers, Earphones'
  },
  {
    id: '40x30',
    name: '40 × 30 mm (Compact Retail)',
    widthMm: 40,
    heightMm: 30,
    description: 'Compact thermal roll for phones, gadgets & replacement parts',
    isThermal: true,
    recommendedFor: 'Phones, Batteries, Powerbanks'
  },
  {
    id: '50x25',
    name: '50 × 25 mm (Slim Standard)',
    widthMm: 50,
    heightMm: 25,
    description: 'Slim standard thermal sticker for accessories & devices',
    isThermal: true,
    recommendedFor: 'Adapters, Airpods, Powerbanks'
  },
  {
    id: '38x25',
    name: '38 × 25 mm (Mini Thermal)',
    widthMm: 38,
    heightMm: 25,
    description: 'Universal mini label for jewelry, cases & tight packaging',
    isThermal: true,
    recommendedFor: 'Screen Protectors, Cables, Cases'
  },
  {
    id: '40x25',
    name: '40 × 25 mm (Compact)',
    widthMm: 40,
    heightMm: 25,
    description: 'Compact label for small items & screen protectors',
    isThermal: true,
    recommendedFor: 'Screen Glass, Adapters, Cases'
  },
  {
    id: '40x20',
    name: '40 × 20 mm (Mini Price Tag)',
    widthMm: 40,
    heightMm: 20,
    description: 'Small barcode & price tag for tight spaces',
    isThermal: true,
    recommendedFor: 'Small items, memory cards, SIMs'
  },
  {
    id: '60x40',
    name: '60 × 40 mm (Large Spec)',
    widthMm: 60,
    heightMm: 40,
    description: 'Large thermal label with detailed device specs',
    isThermal: true,
    recommendedFor: 'High-end Phones, Tablets, Box labels'
  },
  {
    id: '70x35',
    name: '70 × 35 mm (Wide Shelf Tag)',
    widthMm: 70,
    heightMm: 35,
    description: 'Wide shelf / display label with big title & price',
    isThermal: true,
    recommendedFor: 'Display stands, showcases, boxes'
  },
  {
    id: 'cable_tag',
    name: '85 × 25 mm (Cable / Wrap Tag)',
    widthMm: 85,
    heightMm: 25,
    description: 'Foldable wrap tag for cables and earphones',
    isThermal: true,
    recommendedFor: 'USB Cables, Wired Earphones'
  },
  {
    id: 'a4_24',
    name: 'A4 Sheet (24 Labels / 3×8)',
    widthMm: 70,
    heightMm: 37,
    description: 'Standard laser/inkjet sticker sheets',
    isThermal: false,
    recommendedFor: 'A4 Laser / Inkjet Sticker Paper'
  },
  {
    id: 'custom',
    name: 'Custom Dimensions (mm)',
    widthMm: 50,
    heightMm: 30,
    description: 'Custom user-defined width and height in millimeters',
    isThermal: true,
    recommendedFor: 'Custom thermal rolls & specialized stickers'
  }
];

export const BARCODE_SETTINGS_STORAGE_KEY = 'nali_barcode_label_settings_v2';

/**
 * Get resolved dimensions in millimeters for a label config
 */
export function getLabelDimensions(config?: {
  sizeId?: string;
  customWidthMm?: number;
  customHeightMm?: number;
}): { widthMm: number; heightMm: number } {
  if (!config) return { widthMm: 50, heightMm: 30 };
  
  if (config.sizeId === 'custom' && config.customWidthMm && config.customHeightMm) {
    return {
      widthMm: Math.max(15, Math.min(150, config.customWidthMm)),
      heightMm: Math.max(10, Math.min(150, config.customHeightMm))
    };
  }
  
  const found = LABEL_SIZES.find(s => s.id === config.sizeId);
  if (found) {
    return { widthMm: found.widthMm, heightMm: found.heightMm };
  }
  return { widthMm: 50, heightMm: 30 };
}

/**
 * Inject or update strict print styles in document head for thermal printing
 */
export function injectThermalPrintStyles(widthMm: number, heightMm: number): void {
  const styleId = 'thermal-label-print-media-rules';
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  styleEl.innerHTML = `
    @page {
      size: ${widthMm}mm ${heightMm}mm !important;
      margin: 0mm !important;
    }
    :root {
      --label-width: ${widthMm}mm;
      --label-height: ${heightMm}mm;
    }
    @media print {
      *, *::before, *::after {
        box-sizing: border-box !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: none !important;
        background-color: #ffffff !important;
        color: #000000 !important;
        width: 100% !important;
        height: auto !important;
        -webkit-font-smoothing: antialiased !important;
      }
      .no-print, header, nav, button, .ui-control, aside, [role="navigation"] {
        display: none !important;
      }
      .label-page {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: always !important;
        break-after: page !important;
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        width: ${widthMm}mm !important;
        height: ${heightMm}mm !important;
        max-width: ${widthMm}mm !important;
        max-height: ${heightMm}mm !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      }
      .label-page:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
      .thermal-label {
        width: ${widthMm}mm !important;
        height: ${heightMm}mm !important;
        max-width: ${widthMm}mm !important;
        max-height: ${heightMm}mm !important;
        box-sizing: border-box !important;
        padding: 1.5mm !important;
        overflow: hidden !important;
        background: #ffffff !important;
        color: #000000 !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        position: relative !important;
        direction: ltr !important;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
        line-height: 1.15 !important;
      }
      .tl-header {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: space-between !important;
        border-bottom: 1px solid #000000 !important;
        padding-bottom: 0.4mm !important;
        margin-bottom: 0.3mm !important;
        flex-shrink: 0 !important;
        width: 100% !important;
        overflow: hidden !important;
      }
      .tl-store {
        display: flex !important;
        align-items: center !important;
        min-width: 0 !important;
        flex: 1 1 auto !important;
        overflow: hidden !important;
      }
      .tl-body {
        flex: 1 1 auto !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        min-height: 0 !important;
        overflow: hidden !important;
        padding: 0.2mm 0 !important;
      }
      .tl-footer {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 1.5mm !important;
        margin-top: auto !important;
        padding-top: 0.4mm !important;
        border-top: 1px solid rgba(0, 0, 0, 0.3) !important;
        flex-shrink: 0 !important;
        width: 100% !important;
        overflow: hidden !important;
      }
      .tl-barcode {
        flex: 1 1 0% !important;
        min-width: 0 !important;
        height: 100% !important;
        max-height: 100% !important;
        overflow: hidden !important;
        display: flex !important;
        align-items: center !important;
        justify-content: flex-start !important;
      }
      .tl-barcode svg {
        width: 100% !important;
        max-width: 100% !important;
        height: 100% !important;
        max-height: 100% !important;
        display: block !important;
      }
      .tl-price {
        display: flex !important;
        flex-direction: column !important;
        align-items: flex-end !important;
        justify-content: center !important;
        text-align: right !important;
        flex-shrink: 0 !important;
        padding-left: 1.2mm !important;
        border-left: 1px solid #000000 !important;
      }
    }
  `;
}

/**
 * Generate standard 13-digit EAN barcode with valid check digit
 * Uses in-store prefix "20" (GS1 restricted circulation)
 */
export function generateEAN13(prefix = '20'): string {
  // Generate 10 random digits after prefix
  let code = prefix;
  for (let i = 0; i < 10; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  
  // Calculate EAN-13 check digit (modulo 10 with alternating weights 1 and 3)
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return code + checkDigit.toString();
}

/**
 * Generate a smart alphanumeric Code-128 barcode
 */
export function generateCode128(prefix = 'NL'): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(1000 + Math.random() * 9000).toString();
  return `${prefix}-${timestamp}${random}`;
}

/**
 * Validate EAN-13 check digit
 */
export function isValidEAN13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const expectedCheck = (10 - (sum % 10)) % 10;
  return parseInt(code[12], 10) === expectedCheck;
}

/**
 * Trigger print with isolated thermal / label layout
 */
export function printLabelContainer(
  containerId = 'printable-label-area',
  configOrWindow?: any,
  optionalPrintWindow: Window | null = null
): void {
  const element = document.getElementById(containerId);

  // Parse arguments to support both (containerId, printWindow) and (containerId, config, printWindow)
  let printWindow: Window | null = null;
  let labelConfig: any = null;

  if (configOrWindow && typeof configOrWindow === 'object') {
    if ('document' in configOrWindow || configOrWindow instanceof Window) {
      printWindow = configOrWindow as Window;
    } else {
      labelConfig = configOrWindow;
      printWindow = optionalPrintWindow;
    }
  }

  if (!element) {
    if (printWindow) printWindow.close();
    else window.print();
    return;
  }

  // Determine label dimensions
  const { widthMm, heightMm } = getLabelDimensions(labelConfig);

  // Inject active page styles into main DOM as well for Ctrl+P or direct window.print()
  injectThermalPrintStyles(widthMm, heightMm);

  // Extract all stylesheets and style tags from the current document
  // to ensure Tailwind CSS and custom fonts are properly applied in the print window
  const styles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(el => el.outerHTML)
    .join('\n');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Print Barcode Labels - Nali Mobile</title>
        ${styles}
        <style>
          @page {
            size: ${widthMm}mm ${heightMm}mm !important;
            margin: 0mm !important;
          }
          :root {
            --label-width: ${widthMm}mm;
            --label-height: ${heightMm}mm;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: none !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            width: ${widthMm}mm !important;
            min-height: ${heightMm}mm !important;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
            -webkit-font-smoothing: antialiased !important;
          }
          .no-print, header, nav, button, .ui-control, aside, [role="navigation"] {
            display: none !important;
          }
          .label-page {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            width: ${widthMm}mm !important;
            height: ${heightMm}mm !important;
            max-width: ${widthMm}mm !important;
            max-height: ${heightMm}mm !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }
          .label-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .thermal-label {
            width: ${widthMm}mm !important;
            height: ${heightMm}mm !important;
            max-width: ${widthMm}mm !important;
            max-height: ${heightMm}mm !important;
            box-sizing: border-box !important;
            padding: 1.5mm !important;
            overflow: hidden !important;
            background: #ffffff !important;
            color: #000000 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            position: relative !important;
            direction: ltr !important;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
            line-height: 1.15 !important;
          }
          .tl-header {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            border-bottom: 1px solid #000000 !important;
            padding-bottom: 0.4mm !important;
            margin-bottom: 0.3mm !important;
            flex-shrink: 0 !important;
            width: 100% !important;
            overflow: hidden !important;
          }
          .tl-store {
            display: flex !important;
            align-items: center !important;
            min-width: 0 !important;
            flex: 1 1 auto !important;
            overflow: hidden !important;
          }
          .tl-body {
            flex: 1 1 auto !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            min-height: 0 !important;
            overflow: hidden !important;
            padding: 0.2mm 0 !important;
          }
          .tl-footer {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 1.5mm !important;
            margin-top: auto !important;
            padding-top: 0.4mm !important;
            border-top: 1px solid rgba(0, 0, 0, 0.3) !important;
            flex-shrink: 0 !important;
            width: 100% !important;
            overflow: hidden !important;
          }
          .tl-barcode {
            flex: 1 1 0% !important;
            min-width: 0 !important;
            height: 100% !important;
            max-height: 100% !important;
            overflow: hidden !important;
            display: flex !important;
            align-items: center !important;
            justify-content: flex-start !important;
          }
          .tl-barcode svg {
            width: 100% !important;
            max-width: 100% !important;
            height: 100% !important;
            max-height: 100% !important;
            display: block !important;
          }
          .tl-price {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-end !important;
            justify-content: center !important;
            text-align: right !important;
            flex-shrink: 0 !important;
            padding-left: 1.2mm !important;
            border-left: 1px solid #000000 !important;
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="position: fixed; top: 10px; right: 10px; z-index: 99999; display: flex; gap: 8px; background: rgba(15,23,42,0.9); padding: 8px 12px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
          <button onclick="window.print()" style="padding: 6px 14px; background: #06b6d4; color: #0f172a; border: none; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer;">
            Print Label(s)
          </button>
          <button onclick="window.close()" style="padding: 6px 10px; background: #334155; color: #f8fafc; border: none; border-radius: 6px; font-weight: 600; font-size: 12px; cursor: pointer;">
            Close
          </button>
        </div>
        ${element.innerHTML}
        <script>
          window.addEventListener('load', function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 350);
          });
        </script>
      </body>
    </html>
  `;

  // Try printing via printWindow or popup first
  let openedWindow: Window | null = null;
  if (window.self !== window.top || printWindow) {
    try {
      openedWindow = printWindow || window.open('', '_blank');
      if (openedWindow) {
        openedWindow.document.open();
        openedWindow.document.write(htmlContent);
        openedWindow.document.close();
        openedWindow.focus();
        setTimeout(() => {
          try {
            openedWindow?.print();
          } catch {
            // Handled by inline script
          }
        }, 400);
        return;
      }
    } catch {
      openedWindow = null;
    }
  }
  
  // Fallback to hidden iframe
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '-9999px';
    iframe.style.bottom = '-9999px';
    iframe.style.width = `${widthMm}mm`;
    iframe.style.height = `${heightMm}mm`;
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      iframe.contentWindow?.focus();
      setTimeout(() => {
        try {
          iframe.contentWindow?.print();
        } catch {
          window.print();
        }
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch {}
        }, 2000);
      }, 400);
      return;
    }
  } catch (err) {
    console.warn('Iframe print error, falling back to window.print():', err);
  }

  // Final fallback
  window.print();
}
