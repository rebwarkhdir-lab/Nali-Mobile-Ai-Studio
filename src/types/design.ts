export type ThemePalette = 
  | 'cyber-indigo' 
  | 'emerald-fintech' 
  | 'monochrome-titanium' 
  | 'royal-amethyst' 
  | 'sunset-amber' 
  | 'ocean-azure' 
  | 'crimson-ruby';

export type AppearanceMode = 'dark' | 'oled' | 'light' | 'system';

export type UiDensity = 'compact' | 'standard' | 'spacious';

export type CornerRadius = 'sharp' | 'rounded' | 'smooth';

export type FontScale = 'small' | 'medium' | 'large';

export type NumberFont = 'tabular-mono' | 'standard-sans';

export interface DesignSettings {
  // Theme & Appearance
  theme: ThemePalette;
  appearance: AppearanceMode;
  glassmorphism: boolean;
  glowEffects: boolean;
  highContrast: boolean;

  // Geometry & Typography
  density: UiDensity;
  radius: CornerRadius;
  fontScale: FontScale;
  numberFont: NumberFont;
  enableAnimations: boolean;

  // Audio & Haptics
  soundEnabled: boolean;
  soundVolume: number; // 0 - 100

  // Currency & Formats
  primaryCurrency: 'USD' | 'IQD';
  currencyNotation: 'standard' | 'compact';
  exchangeRate: number;
  showDualCurrencyBadges: boolean;

  // Layout Preferences
  sidebarCollapsed: boolean;
  quickBarVisible: boolean;

  // Store Branding & Custom Logo
  storeName: string;
  storeSubtitle: string;
  customLogoUrl: string | null;
  logoShape: 'rounded' | 'circle' | 'square';
  logoFit: 'cover' | 'contain' | 'fill';
  logoBgColor: 'white' | 'dark' | 'transparent' | 'primary';

  // Business Information & Invoicing
  businessNameEn: string;
  businessNameKu: string;
  businessTaglineEn: string;
  businessTaglineKu: string;
  businessAddressEn: string;
  businessAddressKu: string;
  businessPhone: string;
  businessPhoneSecondary: string;
  businessWhatsApp: string;
  businessEmail: string;
  businessTaxNumber: string;
  invoiceFooterMessageEn: string;
  invoiceFooterMessageKu: string;
  invoiceTermsEn: string;
  invoiceTermsKu: string;
  invoiceShowQR: boolean;
  invoiceShowDualCurrency: boolean;

  // Inventory & Restock Automation
  lowStockThreshold: number; // User-defined threshold (default 3)
  enableLowStockAlerts: boolean; // Toggle subtle notification banner
}

export interface DesignPreset {
  id: string;
  name: string;
  description: string;
  badge: string;
  settings: Partial<DesignSettings>;
}

export const DEFAULT_DESIGN_SETTINGS: DesignSettings = {
  theme: 'cyber-indigo',
  appearance: 'dark',
  glassmorphism: true,
  glowEffects: true,
  highContrast: false,
  density: 'standard',
  radius: 'rounded',
  fontScale: 'medium',
  numberFont: 'tabular-mono',
  enableAnimations: true,
  soundEnabled: true,
  soundVolume: 80,
  primaryCurrency: 'USD',
  currencyNotation: 'standard',
  exchangeRate: 1500,
  showDualCurrencyBadges: true,
  sidebarCollapsed: false,
  quickBarVisible: true,
  storeName: 'Nali Mobile',
  storeSubtitle: 'Smartphones & Tablets Hub',
  customLogoUrl: '/nali-logo.png',
  logoShape: 'rounded',
  logoFit: 'cover',
  logoBgColor: 'white',
  businessNameEn: 'Nali Mobile',
  businessNameKu: 'نالی مۆبایل',
  businessTaglineEn: 'Mobile Devices • Genuine Accessories • Installments & Services',
  businessTaglineKu: 'مۆبایل • ئێکسسواراتی ئەسڵی • قیست و خزمەتگوزاری',
  businessAddressEn: 'Erbil - 100M Road / Sulaymaniyah - Salim Street',
  businessAddressKu: 'هەولێر - شەقامی ١٠٠ مەتری / سلێمانی - شەقامی سالم',
  businessPhone: '+964 750 123 4567',
  businessPhoneSecondary: '+964 770 987 6543',
  businessWhatsApp: '+9647501234567',
  businessEmail: 'contact@nalimobile.iq',
  businessTaxNumber: 'IQ-KR-2026-9901',
  invoiceFooterMessageEn: 'Thank you for choosing Nali Mobile. We appreciate your business and trust.',
  invoiceFooterMessageKu: 'سوپاس بۆ متمانە و مامەڵەکردنتان لەگەڵ نالی مۆبایل.',
  invoiceTermsEn: 'Items can be replaced within 3 days with original receipt and box in pristine condition.',
  invoiceTermsKu: 'ئامێر و کەلوپەل دەگۆڕدرێتەوە لە ماوەی ٣ ڕۆژدا بە پێشکەشکردنی پسوڵەی ئەسڵی و کارتۆن بە بێ کێشە.',
  invoiceShowQR: true,
  invoiceShowDualCurrency: true,
  lowStockThreshold: 3,
  enableLowStockAlerts: true,
};

export const THEME_PALETTES: {
  id: ThemePalette;
  name: string;
  subtitle: string;
  primaryColor: string;
  secondaryColor: string;
  accentGradient: string;
  previewClass: string;
}[] = [
  {
    id: 'cyber-indigo',
    name: 'Cyber Indigo',
    subtitle: 'Flagship Tech Blue & Electric Cyan',
    primaryColor: '#6366f1',
    secondaryColor: '#06b6d4',
    accentGradient: 'from-indigo-500 via-indigo-600 to-cyan-400',
    previewClass: 'bg-gradient-to-r from-indigo-500 to-cyan-400',
  },
  {
    id: 'emerald-fintech',
    name: 'Emerald FinTech',
    subtitle: 'Wealth Green & Golden Jade',
    primaryColor: '#10b981',
    secondaryColor: '#14b8a6',
    accentGradient: 'from-emerald-500 via-teal-500 to-cyan-400',
    previewClass: 'bg-gradient-to-r from-emerald-500 to-teal-400',
  },
  {
    id: 'monochrome-titanium',
    name: 'Titanium Slate',
    subtitle: 'Minimalist Apple Pro Graphite & Silver',
    primaryColor: '#94a3b8',
    secondaryColor: '#e2e8f0',
    accentGradient: 'from-slate-300 via-slate-400 to-zinc-200',
    previewClass: 'bg-gradient-to-r from-slate-400 to-zinc-200',
  },
  {
    id: 'royal-amethyst',
    name: 'Royal Amethyst',
    subtitle: 'Luxury Purple & Neon Magenta Aura',
    primaryColor: '#a855f7',
    secondaryColor: '#ec4899',
    accentGradient: 'from-purple-500 via-violet-500 to-pink-500',
    previewClass: 'bg-gradient-to-r from-purple-500 to-pink-500',
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Amber',
    subtitle: 'Warm Gold, Amber & Solar Orange',
    primaryColor: '#f59e0b',
    secondaryColor: '#f97316',
    accentGradient: 'from-amber-500 via-orange-500 to-rose-500',
    previewClass: 'bg-gradient-to-r from-amber-500 to-orange-500',
  },
  {
    id: 'ocean-azure',
    name: 'Oceanic Azure',
    subtitle: 'Deep Nordic Sea & Sky Blue',
    primaryColor: '#0284c7',
    secondaryColor: '#38bdf8',
    accentGradient: 'from-sky-500 via-blue-600 to-indigo-500',
    previewClass: 'bg-gradient-to-r from-sky-400 to-blue-600',
  },
  {
    id: 'crimson-ruby',
    name: 'Crimson Ruby',
    subtitle: 'Bold Velvet Red & Coral Glow',
    primaryColor: '#e11d48',
    secondaryColor: '#f43f5e',
    accentGradient: 'from-rose-600 via-red-500 to-orange-400',
    previewClass: 'bg-gradient-to-r from-rose-600 to-orange-400',
  },
];

export const CURATED_PRESETS: DesignPreset[] = [
  {
    id: 'flagship-cyber',
    name: 'Flagship Cyber Deluxe',
    description: 'The signature Nali Mobile experience with deep indigo accents, glass surfaces, and responsive haptics.',
    badge: 'Popular',
    settings: {
      theme: 'cyber-indigo',
      appearance: 'dark',
      density: 'standard',
      radius: 'rounded',
      glassmorphism: true,
      glowEffects: true,
      highContrast: false,
      enableAnimations: true,
      numberFont: 'tabular-mono',
    },
  },
  {
    id: 'fast-pos-terminal',
    name: 'High-Volume POS Speed',
    description: 'Optimized for blazing-fast checkout counters. Compact density, OLED black contrast, and instant transitions.',
    badge: 'Fast POS',
    settings: {
      theme: 'monochrome-titanium',
      appearance: 'oled',
      density: 'compact',
      radius: 'sharp',
      glassmorphism: false,
      glowEffects: false,
      highContrast: true,
      enableAnimations: false,
      numberFont: 'tabular-mono',
    },
  },
  {
    id: 'fintech-executive',
    name: 'FinTech Wealth Pro',
    description: 'Emerald green financial ledger with clean statistics, tabular numerals, and dual-currency emphasis.',
    badge: 'Finance',
    settings: {
      theme: 'emerald-fintech',
      appearance: 'dark',
      density: 'standard',
      radius: 'rounded',
      glassmorphism: true,
      glowEffects: true,
      highContrast: false,
      enableAnimations: true,
      numberFont: 'tabular-mono',
    },
  },
  {
    id: 'daylight-retail',
    name: 'Daylight Counter (Light)',
    description: 'High-contrast alabaster light theme designed for bright retail shop counters under direct sunlight.',
    badge: 'Light Mode',
    settings: {
      theme: 'ocean-azure',
      appearance: 'light',
      density: 'standard',
      radius: 'rounded',
      glassmorphism: false,
      glowEffects: false,
      highContrast: false,
      enableAnimations: true,
      numberFont: 'tabular-mono',
    },
  },
  {
    id: 'touchscreen-tablet',
    name: 'Touch Tablet Ergonomic',
    description: 'Spacious touch targets, comfortable padding, and soft rounded corners for iPad and Android tablets.',
    badge: 'Touch / iPad',
    settings: {
      theme: 'royal-amethyst',
      appearance: 'dark',
      density: 'spacious',
      radius: 'smooth',
      glassmorphism: true,
      glowEffects: true,
      fontScale: 'large',
      enableAnimations: true,
    },
  },
];

export function sanitizeDesignSettings(raw: any, fallback = DEFAULT_DESIGN_SETTINGS): DesignSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...fallback };
  }

  const validAppearances: AppearanceMode[] = ['dark', 'oled', 'light', 'system'];
  const validThemes: ThemePalette[] = [
    'cyber-indigo', 'emerald-fintech', 'monochrome-titanium',
    'royal-amethyst', 'sunset-amber', 'ocean-azure', 'crimson-ruby'
  ];
  const validDensities: UiDensity[] = ['compact', 'standard', 'spacious'];
  const validRadii: CornerRadius[] = ['sharp', 'rounded', 'smooth'];
  const validFontScales: FontScale[] = ['small', 'medium', 'large'];
  const validNumberFonts: NumberFont[] = ['tabular-mono', 'standard-sans'];
  const validLogoShapes = ['rounded', 'circle', 'square'];
  const validLogoFits = ['cover', 'contain', 'fill'];
  const validLogoBgColors = ['white', 'dark', 'transparent', 'primary'];
  const validCurrencies = ['USD', 'IQD'];
  const validNotations = ['standard', 'compact'];

  const clean: DesignSettings = { ...fallback };

  // Copy valid non-undefined & non-null properties
  for (const key of Object.keys(fallback) as Array<keyof DesignSettings>) {
    if (raw[key] !== undefined && raw[key] !== null) {
      (clean as any)[key] = raw[key];
    }
  }

  // Safe checks for enumerated fields
  if (!clean.appearance || !validAppearances.includes(clean.appearance)) {
    if (raw.dark_mode === false) {
      clean.appearance = 'light';
    } else {
      clean.appearance = fallback.appearance || 'dark';
    }
  }

  if (!clean.theme || !validThemes.includes(clean.theme)) {
    clean.theme = fallback.theme || 'cyber-indigo';
  }

  if (!clean.density || !validDensities.includes(clean.density)) {
    clean.density = fallback.density || 'standard';
  }

  if (!clean.radius || !validRadii.includes(clean.radius)) {
    clean.radius = fallback.radius || 'rounded';
  }

  if (!clean.fontScale || !validFontScales.includes(clean.fontScale)) {
    clean.fontScale = fallback.fontScale || 'medium';
  }

  if (!clean.numberFont || !validNumberFonts.includes(clean.numberFont)) {
    clean.numberFont = fallback.numberFont || 'tabular-mono';
  }

  if (!clean.logoShape || !validLogoShapes.includes(clean.logoShape)) {
    clean.logoShape = fallback.logoShape || 'rounded';
  }

  if (!clean.logoFit || !validLogoFits.includes(clean.logoFit)) {
    clean.logoFit = fallback.logoFit || 'cover';
  }

  if (!clean.logoBgColor || !validLogoBgColors.includes(clean.logoBgColor)) {
    clean.logoBgColor = fallback.logoBgColor || 'white';
  }

  if (!clean.primaryCurrency || !validCurrencies.includes(clean.primaryCurrency)) {
    clean.primaryCurrency = fallback.primaryCurrency || 'USD';
  }

  if (!clean.currencyNotation || !validNotations.includes(clean.currencyNotation)) {
    clean.currencyNotation = fallback.currencyNotation || 'standard';
  }

  // Strings
  clean.storeName = typeof clean.storeName === 'string' && clean.storeName.trim() ? clean.storeName : fallback.storeName;
  clean.storeSubtitle = typeof clean.storeSubtitle === 'string' ? clean.storeSubtitle : fallback.storeSubtitle;

  // Numbers
  const rate = Number(clean.exchangeRate);
  clean.exchangeRate = !isNaN(rate) && rate > 0 ? rate : fallback.exchangeRate;

  const vol = Number(clean.soundVolume);
  clean.soundVolume = !isNaN(vol) && vol >= 0 && vol <= 100 ? vol : fallback.soundVolume;

  const threshold = Number(clean.lowStockThreshold);
  clean.lowStockThreshold = !isNaN(threshold) && threshold >= 0 ? threshold : fallback.lowStockThreshold;

  // Booleans
  clean.glassmorphism = typeof clean.glassmorphism === 'boolean' ? clean.glassmorphism : fallback.glassmorphism;
  clean.glowEffects = typeof clean.glowEffects === 'boolean' ? clean.glowEffects : fallback.glowEffects;
  clean.highContrast = typeof clean.highContrast === 'boolean' ? clean.highContrast : fallback.highContrast;
  clean.enableAnimations = typeof clean.enableAnimations === 'boolean' ? clean.enableAnimations : fallback.enableAnimations;
  clean.soundEnabled = typeof clean.soundEnabled === 'boolean' ? clean.soundEnabled : fallback.soundEnabled;
  clean.showDualCurrencyBadges = typeof clean.showDualCurrencyBadges === 'boolean' ? clean.showDualCurrencyBadges : fallback.showDualCurrencyBadges;
  clean.sidebarCollapsed = typeof clean.sidebarCollapsed === 'boolean' ? clean.sidebarCollapsed : fallback.sidebarCollapsed;
  clean.quickBarVisible = typeof clean.quickBarVisible === 'boolean' ? clean.quickBarVisible : fallback.quickBarVisible;

  return clean;
}
