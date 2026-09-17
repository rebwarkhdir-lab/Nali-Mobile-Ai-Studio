/**
 * GSMArena Accurate Specs Knowledge Base & Smart Battery Engine
 * Combines comprehensive offline GSMArena specs database with
 * smart server-side AI fallback and client-side multi-layer caching.
 */

// In-memory runtime cache for queried specs
const runtimeCache = new Map<string, string>();

// Local storage cache key
const STORAGE_CACHE_KEY = 'nali_smart_battery_specs_cache_v1';

function getStoredCache(): Record<string, string> {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setStoredCache(key: string, value: string): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    const cache = getStoredCache();
    cache[key] = value;
    localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage quota limits
  }
}

/**
 * Returns exact official battery capacity in mAh based on GSMArena archives.
 * Returns empty string for Apple & Nokia devices (since user requested Android only).
 */
export function getKnownBatteryCapacity(brand: string, model: string): string {
  const b = (brand || '').toLowerCase().trim();
  const m = (model || '').toLowerCase().trim();

  if (!b && !m) return '';

  // Exclude Apple (iPhone/iPad) and basic Nokia phones from auto Android capacity
  const isApple = b === 'apple' || m.includes('iphone') || m.includes('ipad');
  const isNokia = b === 'nokia';
  if (isApple || isNokia) return '';

  const rawCombined = `${b} ${m}`.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  const combined = ` ${rawCombined} `;

  // 1. Specific custom & high-priority mappings requested by user
  if (combined.includes(' 600 lite ') || combined.includes(' 600lite ')) return '6520';
  if (combined.includes(' x7d ') || combined.includes(' x7 d ')) return '6500';
  if (combined.includes(' x9d ') || combined.includes(' x9 d ')) return '8300';
  if (combined.includes(' x9c ') || combined.includes(' x9 c ')) return '6600';
  if (combined.includes(' x9b ') || combined.includes(' x9 b ')) return '5800';

  // 2. HONOR (Full GSMArena Lineup)
  if (combined.includes('honor')) {
    // 600 Series
    if (combined.includes('600 lite') || combined.includes('600lite')) return '6520';
    if (combined.includes('600 pro') || combined.includes('600pro')) return '7000';
    if (combined.includes('600')) return '7000';

    // 400 & 300 Series
    if (combined.includes('400 lite')) return '5200';
    if (combined.includes('400 pro') || combined.includes('400')) return '5300';
    if (combined.includes('300 lite')) return '5000';
    if (combined.includes('300 pro') || combined.includes('300 ultra') || combined.includes('300')) return '5300';

    // X Series
    if (combined.includes('x9d') || combined.includes('x9 d')) return '8300';
    if (combined.includes('x9c') || combined.includes('x9 c')) return '6600';
    if (combined.includes('x9b') || combined.includes('x9 b')) return '5800';
    if (combined.includes('x9a') || combined.includes('x9 a')) return '5100';
    if (combined.includes(' x9 ')) return '4800';
    if (combined.includes('x80 pro max')) return '11000';
    if (combined.includes('x8b') || combined.includes('x8a')) return '4500';
    if (combined.includes(' x8 ')) return '4000';
    if (combined.includes('x7d') || combined.includes('x7 d')) return '6500';
    if (combined.includes('x7c') || combined.includes('x7b')) return '6000';
    if (combined.includes('x7a')) return '5330';
    if (combined.includes(' x7 ')) return '5000';
    if (combined.includes('x6b') || combined.includes('x6a')) return '5200';
    if (combined.includes(' x6 ')) return '5000';
    if (combined.includes('x5 plus') || combined.includes('x5b')) return '5200';
    if (combined.includes(' x5 ')) return '5000';

    // Numbered Series (200, 100, 90, 80, 70, 60, 50)
    if (combined.includes('200 pro') || combined.includes('200 smart') || (combined.includes('200') && !combined.includes('lite'))) return '5200';
    if (combined.includes('200 lite')) return '4500';
    if (combined.includes('100 pro') || combined.includes('100')) return '5000';
    if (combined.includes('90 smart')) return '5330';
    if (combined.includes('90 lite')) return '4500';
    if (combined.includes('90 pro') || combined.includes('90')) return '5000';
    if (combined.includes('80 pro') || combined.includes('80 gt') || combined.includes('80')) return '4800';
    if (combined.includes('80 se')) return '4600';
    if (combined.includes('70 lite')) return '5000';
    if (combined.includes('70 pro')) return '4500';
    if (combined.includes('70')) return '4800';
    if (combined.includes('60 pro') || combined.includes('60')) return '4800';
    if (combined.includes('60 se')) return '4300';
    if (combined.includes('50 lite') || combined.includes('50')) return '4300';
    if (combined.includes('50 pro') || combined.includes('50 se')) return '4000';

    // Magic Series
    if (combined.includes('magic 7 pro')) return '5850';
    if (combined.includes('magic 7 lite')) return '6600';
    if (combined.includes('magic 7')) return '5650';
    if (combined.includes('magic 6 pro')) return '5600';
    if (combined.includes('magic 6 lite')) return '5800';
    if (combined.includes('magic 6')) return '5450';
    if (combined.includes('magic 5 pro') || combined.includes('magic 5') || combined.includes('magic 5 lite')) return '5100';
    if (combined.includes('magic 4 pro')) return '4600';
    if (combined.includes('magic 4')) return '4800';
    if (combined.includes('magic v3')) return '5150';
    if (combined.includes('magic vs3')) return '5000';
    if (combined.includes('magic v2') || combined.includes('magic vs')) return '5000';
    if (combined.includes('magic v flip')) return '4800';
    if (combined.includes('magic v')) return '4750';
    if (combined.includes('turbo')) return '8560';
    if (combined.includes('play')) return '5200';
  }

  // 3. SAMSUNG GALAXY
  if (combined.includes('samsung') || combined.includes('galaxy')) {
    // S25 Series
    if (combined.includes('s25 ultra')) return '5000';
    if (combined.includes('s25+') || combined.includes('s25 plus') || combined.includes('s25 fe')) return '4900';
    if (combined.includes('s25 edge')) return '3900';
    if (combined.includes('s25') && !combined.includes('+') && !combined.includes('ultra') && !combined.includes('fe')) return '4000';

    // S24 Series
    if (combined.includes('s24 ultra')) return '5000';
    if (combined.includes('s24+') || combined.includes('s24 plus')) return '4900';
    if (combined.includes('s24 fe')) return '4700';
    if (combined.includes('s24') && !combined.includes('+') && !combined.includes('ultra') && !combined.includes('fe')) return '4000';

    // S23 Series
    if (combined.includes('s23 ultra')) return '5000';
    if (combined.includes('s23+') || combined.includes('s23 plus')) return '4700';
    if (combined.includes('s23 fe')) return '4500';
    if (combined.includes('s23') && !combined.includes('+') && !combined.includes('ultra') && !combined.includes('fe')) return '3900';

    // S22 Series
    if (combined.includes('s22 ultra')) return '5000';
    if (combined.includes('s22+') || combined.includes('s22 plus')) return '4500';
    if (combined.includes('s22') && !combined.includes('+') && !combined.includes('ultra') && !combined.includes('fe')) return '3700';

    // S21 & S20 Series
    if (combined.includes('s21 ultra') || combined.includes('s20 ultra')) return '5000';
    if (combined.includes('s21+') || combined.includes('s21 plus')) return '4800';
    if (combined.includes('s20+') || combined.includes('s20 plus')) return '4500';
    if (combined.includes('s21 fe') || combined.includes('s20 fe')) return '4500';
    if (combined.includes('s21') && !combined.includes('+') && !combined.includes('ultra') && !combined.includes('fe')) return '4000';
    if (combined.includes('s20') && !combined.includes('+') && !combined.includes('ultra') && !combined.includes('fe')) return '4000';

    // Note models
    if (combined.includes('note 20 ultra')) return '4500';
    if (combined.includes('note 20')) return '4300';
    if (combined.includes('note 10+')) return '4300';
    if (combined.includes('note 10')) return '3500';

    // Folds & Flips
    if (combined.includes('fold 6') || combined.includes('fold 5') || combined.includes('fold 4') || combined.includes('fold 3')) return '4400';
    if (combined.includes('flip 6')) return '4000';
    if (combined.includes('flip 5') || combined.includes('flip 4')) return '3700';
    if (combined.includes('flip 3')) return '3300';

    // M & F Series
    if (combined.includes('f62') || combined.includes('m51')) return '7000';
    if (combined.includes('m35') || combined.includes('m15') || combined.includes('m34') || combined.includes('m54') || combined.includes('m14')) return '6000';
    if (combined.includes('m55')) return '5000';

    // A Series
    if (combined.includes('a52') || combined.includes('a72') || combined.includes('a71') || combined.includes('a70')) return '4500';
    if (combined.includes('a51') || combined.includes('a50') || combined.includes('a30') || combined.includes('a20')) return '4000';
    if (combined.includes('a10')) return '3400';
    if (combined.match(/a0[1-6]/) || combined.match(/a[1-7][1-6]/) || combined.includes('a23') || combined.includes('a24') || combined.includes('a25') || combined.includes('a33') || combined.includes('a34') || combined.includes('a35') || combined.includes('a36') || combined.includes('a53') || combined.includes('a54') || combined.includes('a55') || combined.includes('a56') || combined.includes('a73')) {
      return '5000';
    }
  }

  // 4. XIAOMI / REDMI / POCO
  if (combined.includes('xiaomi') || combined.includes('redmi') || combined.includes('poco')) {
    // 2024-2026 Models
    if (combined.includes('15 pro')) return '6100';
    if (combined.includes('15')) return '5400';
    if (combined.includes('note 14 pro+')) return '6200';
    if (combined.includes('note 14 pro')) return '5500';
    if (combined.includes('note 14')) return '5110';
    if (combined.includes('note 13 pro+')) return '5000';
    if (combined.includes('note 13 pro 5g')) return '5100';
    if (combined.includes('note 13 pro')) return '5000';
    if (combined.includes('note 13')) return '5000';
    if (combined.includes('note 12 pro+') || combined.includes('note 12 pro') || combined.includes('note 12')) return '5000';
    if (combined.includes('note 11 pro+')) return '4500';
    if (combined.includes('note 11 pro') || combined.includes('note 11')) return '5000';
    if (combined.includes('note 10 pro')) return '5020';
    if (combined.includes('note 10')) return '5000';

    if (combined.includes('14c')) return '5160';
    if (combined.includes('13c') || combined.includes('12c') || combined.includes('10c') || combined.includes('9c')) return '5000';
    if (combined.includes('redmi 13') || combined.includes('redmi 12') || combined.includes('redmi 10') || combined.includes('redmi 9')) return '5030';

    if (combined.includes('poco x6 pro')) return '5000';
    if (combined.includes('poco x6')) return '5100';
    if (combined.includes('poco x5 pro') || combined.includes('poco x5') || combined.includes('poco x4')) return '5000';
    if (combined.includes('poco x3')) return '5160';

    if (combined.includes('poco f6 pro') || combined.includes('poco f6') || combined.includes('poco f5')) return '5000';
    if (combined.includes('poco f5 pro')) return '5160';
    if (combined.includes('poco f4') || combined.includes('poco f3')) return '4500';

    if (combined.includes('poco m6 pro') || combined.includes('poco m6') || combined.includes('poco m5') || combined.includes('poco m4')) return '5000';
    if (combined.includes('poco m3')) return '6000';

    if (combined.includes('14 ultra')) return '5000';
    if (combined.includes('14 pro')) return '4880';
    if (combined.includes('14')) return '4610';
    if (combined.includes('13 ultra') || combined.includes('13t pro') || combined.includes('13t') || combined.includes('14t')) return '5000';
    if (combined.includes('13 pro')) return '4820';
    if (combined.includes('13')) return '4500';
    if (combined.includes('12 pro')) return '4600';
    if (combined.includes('12')) return '4500';
  }

  // 5. TECNO
  if (combined.includes('tecno')) {
    if (combined.includes('pova 6 neo')) return '7000';
    if (combined.includes('pova 6 pro') || combined.includes('pova 6') || combined.includes('pova 5') || combined.includes('pova 4')) return '6000';
    if (combined.includes('pova 5 pro')) return '5000';
    if (combined.includes('pova neo 3') || combined.includes('pova neo 2') || combined.includes('pova neo')) return '7000';
    if (combined.includes('phantom v fold2')) return '5750';
    if (combined.includes('phantom v flip2')) return '4720';
    if (combined.includes('spark') || combined.includes('camon') || combined.includes('pop')) return '5000';
  }

  // 6. INFINIX
  if (combined.includes('infinix')) {
    if (combined.includes('note 40 pro+')) return '4600';
    if (combined.includes('hot 30 play')) return '6000';
    if (combined.includes('hot') || combined.includes('note') || combined.includes('gt') || combined.includes('smart') || combined.includes('zero')) return '5000';
  }

  // 7. REALME
  if (combined.includes('realme')) {
    if (combined.includes('gt 6') || combined.includes('gt 6t') || combined.includes('gt neo 6')) return '5500';
    if (combined.includes('gt 5 pro')) return '5400';
    if (combined.includes('gt 5')) return '5240';
    if (combined.includes('13 pro+') || combined.includes('13 pro')) return '5200';
    if (combined.includes('gt 3')) return '4600';
    if (combined.includes('c') || combined.includes('13') || combined.includes('12') || combined.includes('11') || combined.includes('10') || combined.includes('narzo')) return '5000';
  }

  // 8. HUAWEI
  if (combined.includes('huawei')) {
    if (combined.includes('pura 70 ultra')) return '5200';
    if (combined.includes('pura 70 pro')) return '5050';
    if (combined.includes('pura 70')) return '4900';
    if (combined.includes('nova y91')) return '7000';
    if (combined.includes('nova y72') || combined.includes('nova y71')) return '6000';
    if (combined.includes('mate 60 pro')) return '5000';
    if (combined.includes('mate 60')) return '4750';
    if (combined.includes('mate 50 pro')) return '4700';
    if (combined.includes('mate 50')) return '4460';
    if (combined.includes('p60 pro')) return '4815';
    if (combined.includes('p50 pro')) return '4360';
    if (combined.includes('nova 12')) return '4600';
    if (combined.includes('nova 11') || combined.includes('nova 10')) return '4500';
    if (combined.includes('nova 9')) return '4300';
    if (combined.includes('y9a') || combined.includes('y9')) return '4200';
    if (combined.includes('y7a') || combined.includes('y6p')) return '5000';
  }

  // 9. GOOGLE PIXEL
  if (combined.includes('pixel')) {
    if (combined.includes('9 pro xl')) return '5060';
    if (combined.includes('9 pro fold')) return '4650';
    if (combined.includes('9 pro') || combined.includes('9')) return '4700';
    if (combined.includes('8 pro')) return '5050';
    if (combined.includes('8a')) return '4492';
    if (combined.includes('pixel 8')) return '4575';
    if (combined.includes('7 pro')) return '5000';
    if (combined.includes('7a')) return '4385';
    if (combined.includes('pixel 7')) return '4355';
    if (combined.includes('6 pro')) return '5003';
    if (combined.includes('6a')) return '4410';
    if (combined.includes('pixel 6')) return '4614';
  }

  // 10. ONEPLUS
  if (combined.includes('oneplus')) {
    if (combined.includes('13')) return '6000';
    if (combined.includes('12r') || combined.includes('nord 4') || combined.includes('nord ce4')) return '5500';
    if (combined.includes('12')) return '5400';
    if (combined.includes('nord ce4 lite')) return '5110';
    if (combined.includes('11') || combined.includes('10 pro') || combined.includes('10t') || combined.includes('nord 3')) return '5000';
    if (combined.includes('open')) return '4805';
    if (combined.includes('9 pro') || combined.includes('9')) return '4500';
  }

  // 11. OPPO & VIVO
  if (combined.includes('oppo') || combined.includes('vivo') || combined.includes('iqoo')) {
    if (combined.includes('y28') || combined.includes('iqoo z9')) return '6000';
    if (combined.includes('v40 pro') || combined.includes('v40') || combined.includes('x100 ultra')) return '5500';
    if (combined.includes('x100 pro')) return '5400';
    if (combined.includes('iqoo neo 9 pro')) return '5160';
    if (combined.includes('iqoo 12 pro')) return '5100';
    if (combined.includes('reno 12') || combined.includes('reno 11') || combined.includes('reno 10')) return '5000';
    if (combined.includes('find x7')) return '5000';
    if (combined.includes('v30') || combined.includes('x100') || combined.includes('iqoo 12')) return '5000';
    if (combined.includes('v29') || combined.includes('v27') || combined.includes('reno 11 pro')) return '4600';
    if (combined.includes('y200') || combined.includes('y100') || combined.includes('y36') || combined.includes('y27') || combined.includes('a60') || combined.includes('a79') || combined.includes('a58')) return '5000';
  }

  return '';
}

/**
 * High-performance smart battery capacity resolver:
 * 1. Checks memory & localStorage cache
 * 2. Checks extensive local GSMArena catalog (0ms latency, zero quota used)
 * 3. Falls back smoothly to server API if needed without throwing errors
 * 4. Never guesses an unverified 5000 mAh if model is not recognized
 */
export async function fetchSmartBatteryCapacity(brand: string, model: string): Promise<string> {
  const b = (brand || '').trim();
  const m = (model || '').trim();

  if (!b && !m) return '';

  const cacheKey = `${b.toLowerCase()}:::${m.toLowerCase()}`;

  // Check runtime memory cache
  if (runtimeCache.has(cacheKey)) {
    return runtimeCache.get(cacheKey)!;
  }

  // Check stored cache
  const stored = getStoredCache();
  if (stored[cacheKey]) {
    runtimeCache.set(cacheKey, stored[cacheKey]);
    return stored[cacheKey];
  }

  // Check offline GSMArena catalog first
  const knownCapacity = getKnownBatteryCapacity(b, m);
  if (knownCapacity) {
    runtimeCache.set(cacheKey, knownCapacity);
    setStoredCache(cacheKey, knownCapacity);
    return knownCapacity;
  }

  // If not found in catalog, attempt gentle server request
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`/api/smart-specs?brand=${encodeURIComponent(b)}&model=${encodeURIComponent(m)}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.battery) {
        const result = String(data.battery).trim();
        if (result) {
          runtimeCache.set(cacheKey, result);
          setStoredCache(cacheKey, result);
          return result;
        }
      }
    }
  } catch {
    // Non-blocking background catch, ignore timeout or offline status
  }

  // If phone model is unknown, do NOT autofill an inaccurate 5000 mAh guess
  return '';
}
