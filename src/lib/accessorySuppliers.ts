import { supplierService } from './supplierService';
import { supabase } from './supabase';

export const ACCESSORY_OPTIONS_KEY = 'nali_accessory_options_v1';
export const ACCESSORY_OPTIONS_CHANGED_EVENT = 'nali_accessory_options_changed';

// Canonical default supplier companies matching Add Accessory initial catalog
export const DEFAULT_ACCESSORY_SUPPLIERS: string[] = [
  'Thomas Walkers',
  'Anker Official Regional Hub',
  'Dubai Wholesale Trading',
  'Erbil Mobile Distribution',
  'Shenzhen Direct Electronics',
  'Baghdad Central Wholesalers',
  'Local Market Vendor'
];

/**
 * Synchronously retrieves all available suppliers for accessories:
 * 1. Read from nali_accessory_options_v1 (the primary store used by Add Accessory)
 * 2. Fall back to / merge with DEFAULT_ACCESSORY_SUPPLIERS
 * 3. Include any companies from nali_accessories_cache
 * Always ensures 'Thomas Walkers' is present.
 */
export function getSyncAccessorySuppliers(): string[] {
  const set = new Set<string>();

  // Always include Thomas Walkers at the top
  set.add('Thomas Walkers');

  // 1. Read from Add Accessory options storage
  try {
    const saved = localStorage.getItem(ACCESSORY_OPTIONS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed?.company)) {
        parsed.company.forEach((c: any) => {
          if (typeof c === 'string' && c.trim()) {
            set.add(c.trim());
          }
        });
      }
    }
  } catch {}

  // 2. Merge defaults
  DEFAULT_ACCESSORY_SUPPLIERS.forEach(c => set.add(c));

  // 3. Read from cached accessories list (all companies previously assigned to accessories)
  try {
    const cached = localStorage.getItem('nali_accessories_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        parsed.forEach((item: any) => {
          if (item?.company && typeof item.company === 'string' && item.company.trim()) {
            set.add(item.company.trim());
          }
        });
      }
    }
  } catch {}

  return Array.from(set).filter(Boolean);
}

/**
 * Asynchronously fetches and merges suppliers across all sources:
 * - LocalStorage (Add Accessory options)
 * - Cached accessories
 * - Supabase nali_accessories table
 * - Supabase nali_suppliers table (via supplierService)
 * Updates local cache and notifies subscribers so Add Accessory and Quick Restock remain in sync.
 */
export async function fetchAllAccessorySuppliers(): Promise<string[]> {
  const localList = getSyncAccessorySuppliers();
  const set = new Set<string>(localList);

  // 1. Query database suppliers from supplierService
  try {
    const dbSuppliers = await supplierService.getAllSuppliers();
    if (Array.isArray(dbSuppliers)) {
      dbSuppliers.forEach(s => {
        if (s?.name && typeof s.name === 'string' && s.name.trim()) {
          set.add(s.name.trim());
        }
      });
    }
  } catch {}

  // 2. Query distinct companies from nali_accessories table in Supabase
  try {
    const { data } = await supabase.from('nali_accessories').select('company');
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (item?.company && typeof item.company === 'string' && item.company.trim()) {
          set.add(item.company.trim());
        }
      });
    }
  } catch {}

  const merged = Array.from(set).filter(Boolean);

  // Sync merged back into nali_accessory_options_v1 so Add Accessory immediately has all of them
  try {
    const saved = localStorage.getItem(ACCESSORY_OPTIONS_KEY);
    const parsed = saved ? JSON.parse(saved) : { company: DEFAULT_ACCESSORY_SUPPLIERS };
    const currentCompanies: string[] = Array.isArray(parsed.company) ? parsed.company : [];

    let changed = false;
    merged.forEach(name => {
      if (!currentCompanies.includes(name)) {
        currentCompanies.push(name);
        changed = true;
      }
    });

    if (changed) {
      parsed.company = currentCompanies;
      localStorage.setItem(ACCESSORY_OPTIONS_KEY, JSON.stringify(parsed));
      window.dispatchEvent(new CustomEvent(ACCESSORY_OPTIONS_CHANGED_EVENT, { detail: parsed }));
    }
  } catch {}

  return merged;
}

/**
 * Adds a new supplier directly into nali_accessory_options_v1,
 * ensuring it appears in the main Add Accessory drawer options immediately.
 */
export function addSupplierToAccessoryOptions(newSupplier: string): string[] {
  const trimmed = newSupplier.trim();
  if (!trimmed) return getSyncAccessorySuppliers();

  try {
    const saved = localStorage.getItem(ACCESSORY_OPTIONS_KEY);
    const parsed = saved ? JSON.parse(saved) : { company: [...DEFAULT_ACCESSORY_SUPPLIERS] };
    const currentCompanies: string[] = Array.isArray(parsed.company) 
      ? [...parsed.company] 
      : [...DEFAULT_ACCESSORY_SUPPLIERS];

    if (!currentCompanies.includes(trimmed)) {
      // Insert new supplier right after Thomas Walkers or at top
      currentCompanies.unshift(trimmed);
      parsed.company = Array.from(new Set(currentCompanies));
      localStorage.setItem(ACCESSORY_OPTIONS_KEY, JSON.stringify(parsed));
      
      // Dispatch events for immediate cross-component reactivity
      window.dispatchEvent(new CustomEvent(ACCESSORY_OPTIONS_CHANGED_EVENT, { detail: parsed }));
      window.dispatchEvent(new Event('storage'));
      return parsed.company;
    }
    return currentCompanies;
  } catch {
    return getSyncAccessorySuppliers();
  }
}

/**
 * Subscribes to changes in accessory supplier options (from Add Accessory or Quick Restock)
 */
export function subscribeToSupplierChanges(callback: (suppliers: string[]) => void): () => void {
  const handler = () => {
    callback(getSyncAccessorySuppliers());
  };

  window.addEventListener(ACCESSORY_OPTIONS_CHANGED_EVENT, handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener(ACCESSORY_OPTIONS_CHANGED_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
