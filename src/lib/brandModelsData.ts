import { Mobile } from '../types/mobile';

export interface BrandModelSuggestion {
  model: string;
  isStoreRegistered: boolean;
  storeCount: number;
  lastBuyPrice?: number;
  lastSellPrice?: number;
  currency?: string;
  storage?: string;
  ram?: string;
}

export interface BoughtFromSuggestion {
  name: string;
  category: 'store_history' | 'registered_supplier' | 'preset';
  count?: number;
  badge?: string;
  description?: string;
  iconType: 'store' | 'user' | 'building' | 'globe';
}

// Comprehensive brand models catalogue tailored for mobile retail & wholesale
export const BRAND_CATALOG: Record<string, string[]> = {
  apple: [
    'iPhone 16 Pro Max',
    'iPhone 16 Pro',
    'iPhone 16 Plus',
    'iPhone 16',
    'iPhone 15 Pro Max',
    'iPhone 15 Pro',
    'iPhone 15 Plus',
    'iPhone 15',
    'iPhone 14 Pro Max',
    'iPhone 14 Pro',
    'iPhone 14 Plus',
    'iPhone 14',
    'iPhone 13 Pro Max',
    'iPhone 13 Pro',
    'iPhone 13',
    'iPhone 13 mini',
    'iPhone 12 Pro Max',
    'iPhone 12 Pro',
    'iPhone 12',
    'iPhone 12 mini',
    'iPhone 11 Pro Max',
    'iPhone 11 Pro',
    'iPhone 11',
    'iPhone XS Max',
    'iPhone XS',
    'iPhone XR',
    'iPhone X',
    'iPhone SE (3rd Gen)',
    'iPhone SE (2nd Gen)',
    'iPhone 8 Plus',
    'iPhone 8',
    'iPhone 7 Plus',
    'iPhone 7'
  ],
  samsung: [
    'Galaxy S25 Ultra',
    'Galaxy S25+',
    'Galaxy S25',
    'Galaxy S25 Slim',
    'Galaxy S24 Ultra',
    'Galaxy S24+',
    'Galaxy S24',
    'Galaxy S24 FE',
    'Galaxy S23 Ultra',
    'Galaxy S23+',
    'Galaxy S23',
    'Galaxy S23 FE',
    'Galaxy S22 Ultra',
    'Galaxy S22+',
    'Galaxy S22',
    'Galaxy S21 Ultra',
    'Galaxy S21+',
    'Galaxy S21',
    'Galaxy S21 FE',
    'Galaxy S20 Ultra',
    'Galaxy S20+',
    'Galaxy S20 FE',
    'Galaxy Z Fold 6',
    'Galaxy Z Flip 6',
    'Galaxy Z Fold 5',
    'Galaxy Z Flip 5',
    'Galaxy Z Fold 4',
    'Galaxy Z Flip 4',
    'Galaxy Note 20 Ultra',
    'Galaxy Note 20',
    'Galaxy Note 10+',
    'Galaxy Note 10',
    'Galaxy A55 5G',
    'Galaxy A54 5G',
    'Galaxy A53 5G',
    'Galaxy A52s 5G',
    'Galaxy A35 5G',
    'Galaxy A34 5G',
    'Galaxy A25 5G',
    'Galaxy A16',
    'Galaxy A15',
    'Galaxy A05s',
    'Galaxy A05',
    'Galaxy M55',
    'Galaxy M35',
    'Galaxy M15'
  ],
  xiaomi: [
    'Xiaomi 15 Pro',
    'Xiaomi 15',
    'Xiaomi 14 Ultra',
    'Xiaomi 14 Pro',
    'Xiaomi 14',
    'Xiaomi 14T Pro',
    'Xiaomi 14T',
    'Xiaomi 13T Pro',
    'Xiaomi 13T',
    'Xiaomi 13 Ultra',
    'Xiaomi 13 Pro',
    'Xiaomi 13',
    'Xiaomi 12 Pro',
    'Xiaomi 12',
    'Redmi Note 14 Pro+',
    'Redmi Note 14 Pro',
    'Redmi Note 14',
    'Redmi Note 13 Pro+ 5G',
    'Redmi Note 13 Pro 4G',
    'Redmi Note 13 4G',
    'Redmi Note 12 Pro+',
    'Redmi Note 12 Pro',
    'Redmi Note 12',
    'Redmi Note 11 Pro',
    'Redmi Note 11',
    'Redmi Note 10 Pro',
    'Redmi 14C',
    'Redmi 13C',
    'Redmi 13',
    'Redmi 12',
    'Redmi 10C',
    'Redmi 9A',
    'POCO X6 Pro',
    'POCO X6',
    'POCO F6 Pro',
    'POCO F6',
    'POCO M6 Pro',
    'POCO X5 Pro',
    'POCO F5 Pro'
  ],
  google: [
    'Pixel 9 Pro XL',
    'Pixel 9 Pro',
    'Pixel 9',
    'Pixel 9 Pro Fold',
    'Pixel 8 Pro',
    'Pixel 8',
    'Pixel 8a',
    'Pixel 7 Pro',
    'Pixel 7',
    'Pixel 7a',
    'Pixel 6 Pro',
    'Pixel 6',
    'Pixel 6a'
  ],
  honor: [
    'Honor Magic 7 Pro',
    'Honor Magic 7',
    'Honor Magic 6 Pro',
    'Honor Magic 6 Lite',
    'Honor Magic 6',
    'Honor Magic 5 Pro',
    'Honor Magic V3',
    'Honor Magic V2',
    'Honor 200 Pro',
    'Honor 200',
    'Honor 200 Lite',
    'Honor 90',
    'Honor 90 Lite',
    'Honor 70',
    'Honor X9c',
    'Honor X9b',
    'Honor X9a',
    'Honor X8b',
    'Honor X8a',
    'Honor X7c',
    'Honor X7b',
    'Honor X6b',
    'Honor 600 Lite'
  ],
  oneplus: [
    'OnePlus 13',
    'OnePlus 12',
    'OnePlus 12R',
    'OnePlus 11',
    'OnePlus Open',
    'OnePlus Nord 4',
    'OnePlus Nord CE4',
    'OnePlus 10 Pro',
    'OnePlus 9 Pro'
  ],
  tecno: [
    'Camon 30 Premier',
    'Camon 30 Pro',
    'Camon 30',
    'Spark 20 Pro+',
    'Spark 20 Pro',
    'Spark 20',
    'Pova 6 Pro',
    'Pova 6 Neo',
    'Pova 5 Pro',
    'Phantom V Fold2',
    'Phantom V Flip2',
    'Pop 8'
  ],
  infinix: [
    'Note 40 Pro+ 5G',
    'Note 40 Pro',
    'Note 40',
    'Hot 40 Pro',
    'Hot 40',
    'Hot 30 Play',
    'GT 20 Pro',
    'Zero 30',
    'Smart 8'
  ],
  realme: [
    'GT 6',
    'GT 6T',
    'GT Neo 6',
    'Realme 13 Pro+',
    'Realme 12 Pro+',
    'Realme 12',
    'Realme 11 Pro+',
    'Realme C67',
    'Realme C55',
    'Realme C53'
  ],
  nokia: [
    'Nokia 105',
    'Nokia 106',
    'Nokia 110',
    'Nokia 150',
    'Nokia 215 4G',
    'Nokia 225 4G',
    'Nokia 3310',
    'Nokia 6300 4G',
    'Nokia 5310',
    'Nokia G42 5G',
    'Nokia C32',
    'Nokia C22'
  ],
  'ipad / tablet': [
    'iPad Pro 13 (M4)',
    'iPad Pro 11 (M4)',
    'iPad Air 13 (M2)',
    'iPad Air 11 (M2)',
    'iPad 10th Gen',
    'iPad 9th Gen',
    'iPad mini 7',
    'iPad mini 6',
    'Galaxy Tab S9 Ultra',
    'Galaxy Tab S9',
    'Galaxy Tab A9+',
    'Galaxy Tab A9',
    'Xiaomi Pad 6'
  ],
  huawei: [
    'Pura 70 Ultra',
    'Pura 70 Pro',
    'Pura 70',
    'Mate 60 Pro',
    'Mate 60',
    'Nova 12 Ultra',
    'Nova 12',
    'Nova 11'
  ]
};

/**
 * Normalizes a brand key for dictionary lookup
 */
export function normalizeBrandKey(brand: string): string {
  const b = (brand || '').trim().toLowerCase();
  if (b.includes('apple') || b.includes('iphone')) return 'apple';
  if (b.includes('samsung') || b.includes('galaxy')) return 'samsung';
  if (b.includes('xiaomi') || b.includes('redmi') || b.includes('poco')) return 'xiaomi';
  if (b.includes('google') || b.includes('pixel')) return 'google';
  if (b.includes('honor')) return 'honor';
  if (b.includes('oneplus')) return 'oneplus';
  if (b.includes('tecno')) return 'tecno';
  if (b.includes('infinix')) return 'infinix';
  if (b.includes('realme')) return 'realme';
  if (b.includes('nokia')) return 'nokia';
  if (b.includes('ipad') || b.includes('tablet')) return 'ipad / tablet';
  if (b.includes('huawei')) return 'huawei';
  return b;
}

/**
 * Returns models STRICTLY related to the selected brand.
 * Merges known catalogue models with store-registered models belonging to this brand.
 * Store-registered models are surfaced first with metadata (price, count, specs).
 */
export function getBrandModels(brand: string, existingMobiles: Mobile[] = []): BrandModelSuggestion[] {
  if (!brand || !brand.trim()) {
    return [];
  }

  const normKey = normalizeBrandKey(brand);
  const brandLower = brand.trim().toLowerCase();

  // 1. Gather all store mobiles strictly matching this brand
  const storeModelMap = new Map<string, { count: number; lastItem: Mobile }>();
  
  for (const m of existingMobiles) {
    if (!m.brand || !m.model) continue;
    const mBrandLower = m.brand.trim().toLowerCase();
    const mNormKey = normalizeBrandKey(m.brand);
    
    // Strict brand match: either exact string or matching catalog brand key
    if (mBrandLower === brandLower || mNormKey === normKey) {
      const modelClean = m.model.trim();
      const modelKey = modelClean.toLowerCase();
      
      const existing = storeModelMap.get(modelKey);
      if (existing) {
        existing.count += 1;
      } else {
        storeModelMap.set(modelKey, { count: 1, lastItem: m });
      }
    }
  }

  // 2. Catalog models for this specific brand
  const catalogList = BRAND_CATALOG[normKey] || [];

  const results: BrandModelSuggestion[] = [];
  const addedKeys = new Set<string>();

  // A. First add store-registered models for this brand (sorted by frequency)
  const storeEntries = Array.from(storeModelMap.entries())
    .sort((a, b) => b[1].count - a[1].count);

  for (const [key, { count, lastItem }] of storeEntries) {
    addedKeys.add(key);
    results.push({
      model: lastItem.model.trim(),
      isStoreRegistered: true,
      storeCount: count,
      lastBuyPrice: lastItem.buyPrice,
      lastSellPrice: lastItem.sellPrice,
      currency: lastItem.currency,
      storage: lastItem.storage,
      ram: lastItem.ram
    });
  }

  // B. Then append brand catalog models that haven't been added yet
  for (const catalogModel of catalogList) {
    const key = catalogModel.toLowerCase();
    if (!addedKeys.has(key)) {
      addedKeys.add(key);
      results.push({
        model: catalogModel,
        isStoreRegistered: false,
        storeCount: 0
      });
    }
  }

  return results;
}

/**
 * Standard procurement source presets for mobile shops
 */
export const STANDARD_BOUGHT_FROM_PRESETS: BoughtFromSuggestion[] = [
  {
    name: 'Customer Trade-in (کڕیاری دوکان)',
    category: 'preset',
    iconType: 'user',
    badge: 'Direct Customer',
    description: 'Direct walk-in customer selling or trading in their mobile'
  },
  {
    name: 'Wholesale Market (بۆرسەی مۆبایل)',
    category: 'preset',
    iconType: 'store',
    badge: 'Market / Bourse',
    description: 'Local wholesale electronics exchange / bazaar trader'
  },
  {
    name: 'Official Distributor (بریکاری فەرمی)',
    category: 'preset',
    iconType: 'building',
    badge: 'Distributor / Company',
    description: 'Authorized national brand agent or official supply company'
  },
  {
    name: 'Dubai Direct Import (هاوردەی دوبەی)',
    category: 'preset',
    iconType: 'globe',
    badge: 'Overseas Import',
    description: 'Direct import consignment from Dubai / UAE wholesale'
  }
];

/**
 * Extracts and ranks intelligent Bought From suggestions:
 * Combines store transaction history, registered suppliers, and professional procurement presets.
 */
export function getBoughtFromSuggestions(
  existingMobiles: Mobile[] = [],
  knownSuppliers: string[] = []
): BoughtFromSuggestion[] {
  const historyCounts = new Map<string, number>();

  for (const m of existingMobiles) {
    if (!m.boughtFrom || !m.boughtFrom.trim()) continue;
    const name = m.boughtFrom.trim();
    historyCounts.set(name, (historyCounts.get(name) || 0) + 1);
  }

  const suggestions: BoughtFromSuggestion[] = [];
  const added = new Set<string>();

  // 1. Prioritize frequent store sources
  const sortedHistory = Array.from(historyCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  for (const [name, count] of sortedHistory) {
    const lower = name.toLowerCase();
    added.add(lower);
    
    // Determine appropriate icon
    let iconType: 'store' | 'user' | 'building' | 'globe' = 'store';
    if (lower.includes('customer') || lower.includes('زبون') || lower.includes('کڕیار')) {
      iconType = 'user';
    } else if (lower.includes('company') || lower.includes('کۆمپانیا') || lower.includes('distributor') || lower.includes('بریکار')) {
      iconType = 'building';
    } else if (lower.includes('dubai') || lower.includes('china') || lower.includes('import') || lower.includes('هاوردە')) {
      iconType = 'globe';
    }

    suggestions.push({
      name,
      category: 'store_history',
      count,
      badge: count === 1 ? '1 phone' : `${count} phones`,
      iconType
    });
  }

  // 2. Known tech / accessory suppliers
  for (const supp of knownSuppliers) {
    if (!supp || !supp.trim()) continue;
    const trimmed = supp.trim();
    const lower = trimmed.toLowerCase();
    if (!added.has(lower)) {
      added.add(lower);
      suggestions.push({
        name: trimmed,
        category: 'registered_supplier',
        badge: 'Store Supplier',
        iconType: 'building'
      });
    }
  }

  // 3. Preset categories
  for (const preset of STANDARD_BOUGHT_FROM_PRESETS) {
    const lower = preset.name.toLowerCase();
    if (!added.has(lower)) {
      suggestions.push(preset);
    }
  }

  return suggestions;
}
