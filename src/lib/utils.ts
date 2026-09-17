import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: 'USD' | 'IQD' = 'USD') {
  if (currency === 'IQD') {
    return `${formatNumberWithCommas(Math.round(amount))} د.ع`;
  }
  
  const formatted = Number.isInteger(amount) 
    ? formatNumberWithCommas(amount)
    : formatNumberWithCommas(amount.toFixed(2));
  return `$${formatted}`;
}

export function convertCurrency(
  amount: number,
  from: 'USD' | 'IQD',
  to: 'USD' | 'IQD',
  exchangeRate: number = 1500
): number {
  if (from === to) return amount;
  if (from === 'USD' && to === 'IQD') {
    return Math.round(amount * exchangeRate);
  }
  if (from === 'IQD' && to === 'USD') {
    return exchangeRate > 0 ? parseFloat((amount / exchangeRate).toFixed(2)) : 0;
  }
  return amount;
}

/**
 * Returns Tailwind text color class based on currency:
 * - USD ($): Sunset Amber ('text-amber-400')
 * - IQD (د.ع): Vivid Sky Blue ('text-sky-400')
 */
export function getCurrencyColor(currency: 'USD' | 'IQD' = 'USD'): string {
  return currency === 'USD' ? 'text-amber-400' : 'text-sky-400';
}

/**
 * Returns Tailwind badge classes based on currency:
 * - USD ($): Sunset Amber badge
 * - IQD (د.ع): Vivid Sky Blue badge
 */
export function getCurrencyBadgeClass(currency: 'USD' | 'IQD' = 'USD'): string {
  return currency === 'USD'
    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
    : 'bg-sky-500/15 text-sky-300 border border-sky-500/30';
}

export function formatDualPrice(
  amount: number,
  currency: 'USD' | 'IQD',
  exchangeRate: number = 1500
): { 
  primary: string; 
  secondary: string; 
  primaryCurrency: 'USD' | 'IQD';
  secondaryCurrency: 'USD' | 'IQD';
  primaryColor: string;
  secondaryColor: string;
  usdValue: number; 
  iqdValue: number 
} {
  if (currency === 'USD') {
    const iqd = convertCurrency(amount, 'USD', 'IQD', exchangeRate);
    return {
      primary: formatCurrency(amount, 'USD'),
      secondary: formatCurrency(iqd, 'IQD'),
      primaryCurrency: 'USD',
      secondaryCurrency: 'IQD',
      primaryColor: 'text-amber-400',
      secondaryColor: 'text-sky-400/80',
      usdValue: amount,
      iqdValue: iqd
    };
  } else {
    const usd = convertCurrency(amount, 'IQD', 'USD', exchangeRate);
    return {
      primary: formatCurrency(amount, 'IQD'),
      secondary: formatCurrency(usd, 'USD'),
      primaryCurrency: 'IQD',
      secondaryCurrency: 'USD',
      primaryColor: 'text-sky-400',
      secondaryColor: 'text-amber-400/80',
      usdValue: usd,
      iqdValue: amount
    };
  }
}

export function formatNumberWithCommas(val: string | number | undefined | null): string {
  if (val === undefined || val === null || val === '') return '';
  const str = String(val);
  const clean = str.replace(/,/g, '');
  if (!clean) return '';
  
  const hasTrailingDot = clean.endsWith('.');
  const parts = clean.split('.');
  const intPart = parts[0].replace(/\D/g, '');
  
  const formattedInt = intPart ? intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
  
  if ((parts?.length || 0) > 1) {
    const decimalPart = (parts || []).slice(1).join('').replace(/\D/g, '');
    return `${formattedInt || '0'}.${decimalPart}`;
  }
  if (hasTrailingDot) {
    return `${formattedInt || '0'}.`;
  }
  return formattedInt;
}

export function parseFormattedNumber(val: string | number | undefined | null): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const clean = String(val).replace(/,/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}
