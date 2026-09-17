import { supabase, isSupabaseConfigured } from './supabase';
import { idb } from './idbService';
import { Accessory, CurrencyType } from '../types/accessory';
import { PurchaseOrder, OrderItem } from '../types/stockOrder';

const PURCHASE_ORDERS_KEY = 'nali_purchase_orders';
const ACCESSORIES_CACHE_KEYS = [
  'nali_accessories_cache',
  'nali_pos_accessories_cache',
  'nali_accessories_inventory_v1',
  'nali_accessories'
];

export interface RestockOptions {
  newBuyPrice?: number;
  sellPrice?: number;
  notes?: string;
  supplier?: string;
  name?: string;
  brand?: string;
  category?: string;
  sku?: string;
  barcode?: string;
  currency?: 'USD' | 'IQD';
  image?: string;
}

/**
 * Robust, resilient accessory locator across IndexedDB, LocalStorage caches, and Supabase
 */
async function locateAccessory(
  accessoryId: string,
  options?: RestockOptions
): Promise<Accessory | null> {
  const cleanId = String(accessoryId || '').trim();
  const searchBarcode = options?.barcode?.trim() || (!cleanId.includes('-') && (cleanId?.length || 0) > 3 ? cleanId : '');
  const searchSku = options?.sku?.trim();
  const searchName = options?.name?.trim().toLowerCase();

  // 1. Check IDB store
  try {
    if (cleanId) {
      const byKey = await idb.get<Accessory>('accessories', cleanId);
      if (byKey) return byKey;
    }

    const allIdb = await idb.getAll<Accessory>('accessories');
    if (Array.isArray(allIdb) && allIdb.length > 0) {
      const matched = allIdb.find(a => {
        if (cleanId && String(a.id) === cleanId) return true;
        if (searchBarcode && a.barcode && String(a.barcode).trim() === searchBarcode) return true;
        if (searchSku && a.sku && String(a.sku).trim() === searchSku) return true;
        if (searchName && a.name && a.name.trim().toLowerCase() === searchName) return true;
        return false;
      });
      if (matched) return matched;
    }
  } catch (err) {
    console.warn('IDB lookup warning in locateAccessory:', err);
  }

  // 2. Check all localStorage cache stores
  if (typeof window !== 'undefined') {
    for (const key of ACCESSORIES_CACHE_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) {
          const matched = list.find((a: Accessory) => {
            if (cleanId && String(a.id) === cleanId) return true;
            if (searchBarcode && a.barcode && String(a.barcode).trim() === searchBarcode) return true;
            if (searchSku && a.sku && String(a.sku).trim() === searchSku) return true;
            if (searchName && a.name && a.name.trim().toLowerCase() === searchName) return true;
            return false;
          });
          if (matched) return matched;
        }
      } catch {}
    }
  }

  // 3. Check Supabase table
  if (isSupabaseConfigured()) {
    try {
      // By exact ID
      if (cleanId) {
        const { data: byId } = await supabase
          .from('nali_accessories')
          .select('*')
          .eq('id', cleanId)
          .maybeSingle();
        if (byId) return byId as Accessory;

        // If numeric ID
        if (!isNaN(Number(cleanId))) {
          const { data: byNumId } = await supabase
            .from('nali_accessories')
            .select('*')
            .eq('id', Number(cleanId))
            .maybeSingle();
          if (byNumId) return byNumId as Accessory;
        }
      }

      // By Barcode
      if (searchBarcode) {
        const { data: byBc } = await supabase
          .from('nali_accessories')
          .select('*')
          .eq('barcode', searchBarcode)
          .maybeSingle();
        if (byBc) return byBc as Accessory;
      }

      // By SKU
      if (searchSku) {
        const { data: bySku } = await supabase
          .from('nali_accessories')
          .select('*')
          .eq('sku', searchSku)
          .maybeSingle();
        if (bySku) return bySku as Accessory;
      }

      // By Name (case-insensitive)
      if (searchName) {
        const { data: byName } = await supabase
          .from('nali_accessories')
          .select('*')
          .ilike('name', searchName)
          .maybeSingle();
        if (byName) return byName as Accessory;
      }
    } catch (sbErr) {
      console.warn('Supabase lookup warning in locateAccessory:', sbErr);
    }
  }

  return null;
}

export const stockOrderService = {
  /**
   * Directly replenish stock of a single accessory in Supabase and local cache.
   * If item does not yet exist in inventory, automatically creates and initializes it.
   */
  async restockAccessory(
    accessoryId: string,
    quantityToAdd: number,
    options?: RestockOptions
  ): Promise<{ success: boolean; newQuantity: number; error?: string }> {
    try {
      const qty = Math.max(0, Number(quantityToAdd) || 0);
      let currentAcc = await locateAccessory(accessoryId, options);

      // Case 1: Product already exists in inventory -> Increment quantity
      if (currentAcc) {
        const currentQty = Number(currentAcc.quantity) || 0;
        const newQty = Math.max(0, currentQty + qty);
        const threshold = currentAcc.notifyThreshold && currentAcc.notifyThreshold > 0 ? currentAcc.notifyThreshold : 3;
        const newStatus = newQty > threshold ? 'in_stock' : (newQty > 0 ? 'low_stock' : 'out_of_stock');

        const updatePayload: Record<string, any> = {
          quantity: newQty,
          status: newStatus,
          updatedAt: new Date().toISOString()
        };

        if (options?.newBuyPrice && options.newBuyPrice > 0) {
          updatePayload.buyPrice = options.newBuyPrice;
        }
        if (options?.supplier && options.supplier.trim()) {
          updatePayload.company = options.supplier.trim();
        }

        // Update in Supabase
        if (isSupabaseConfigured()) {
          try {
            await supabase
              .from('nali_accessories')
              .update(updatePayload)
              .eq('id', currentAcc.id);
          } catch (sbErr) {
            console.warn('Supabase update warning:', sbErr);
          }
        }

        // Update in IDB and local caches
        const updatedAcc: Accessory = {
          ...currentAcc,
          ...updatePayload
        };

        try {
          await idb.put('accessories', updatedAcc);
        } catch {}

        if (typeof window !== 'undefined') {
          ACCESSORIES_CACHE_KEYS.forEach(k => {
            try {
              const raw = localStorage.getItem(k);
              if (!raw) return;
              const list: Accessory[] = JSON.parse(raw);
              if (Array.isArray(list)) {
                const idx = list.findIndex(a => String(a.id) === String(currentAcc!.id));
                if (idx >= 0) {
                  list[idx] = updatedAcc;
                } else {
                  list.unshift(updatedAcc);
                }
                localStorage.setItem(k, JSON.stringify(list));
              }
            } catch {}
          });

          window.dispatchEvent(new CustomEvent('accessories_updated', { detail: { item: updatedAcc } }));
          window.dispatchEvent(new CustomEvent('supabase_data_reload'));
        }

        return { success: true, newQuantity: newQty };
      }

      // Case 2: Product was not found in catalog (e.g. custom product, new stock item)
      // Resilient behavior: Auto-create into inventory with the restocked quantity!
      const newId = accessoryId && !accessoryId.startsWith('temp-') ? accessoryId : crypto.randomUUID();
      const buyPrice = options?.newBuyPrice || 0;
      const sellPrice = options?.sellPrice || (buyPrice > 0 ? Math.round(buyPrice * 1.3 * 100) / 100 : 0);

      const createdAccessory: Accessory = {
        id: newId,
        name: options?.name?.trim() || (options?.notes ? `Item: ${options.notes}` : 'Restocked Accessory'),
        brand: options?.brand?.trim() || '',
        category: options?.category?.trim() || 'Accessories',
        barcode: options?.barcode?.trim() || options?.sku?.trim() || '',
        company: options?.supplier?.trim() || 'Direct Supplier',
        quantity: qty,
        notifyThreshold: 3,
        currency: (options?.currency as CurrencyType) || 'USD',
        buyPrice,
        sellPrice,
        status: qty > 3 ? 'in_stock' : (qty > 0 ? 'low_stock' : 'out_of_stock'),
        notes: options?.notes || 'Added via Restock & Alerts',
        image: options?.image,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Insert into Supabase if configured
      if (isSupabaseConfigured()) {
        try {
          await supabase
            .from('nali_accessories')
            .insert(createdAccessory);
        } catch (insErr) {
          console.warn('Supabase insert warning in restockAccessory:', insErr);
        }
      }

      // Insert into IDB and Cache
      try {
        await idb.put('accessories', createdAccessory);
      } catch {}

      if (typeof window !== 'undefined') {
        const primaryCache = localStorage.getItem(ACCESSORIES_CACHE_KEYS[0]);
        let list: Accessory[] = [];
        if (primaryCache) {
          try { list = JSON.parse(primaryCache); } catch {}
        }
        list.unshift(createdAccessory);
        localStorage.setItem(ACCESSORIES_CACHE_KEYS[0], JSON.stringify(list));

        window.dispatchEvent(new CustomEvent('accessories_updated', { detail: { item: createdAccessory } }));
        window.dispatchEvent(new CustomEvent('supabase_data_reload'));
      }

      return { success: true, newQuantity: qty };
    } catch (err: any) {
      console.error('Failed to restock accessory:', err);
      return { success: false, newQuantity: 0, error: err?.message || 'Failed to restock item' };
    }
  },

  /**
   * Batch restock multiple items from a completed purchase order
   */
  async batchRestockFromOrder(
    items: OrderItem[],
    poNumber?: string
  ): Promise<{ success: boolean; updatedCount: number; errors: string[] }> {
    let updatedCount = 0;
    const errors: string[] = [];

    for (const item of items) {
      const targetId = item.accessoryId || item.id || item.sku || item.barcode;
      if (!targetId && !item.name) continue;

      try {
        const res = await this.restockAccessory(targetId || item.name, item.quantity, {
          newBuyPrice: item.unitCost,
          supplier: item.supplier,
          name: item.name,
          brand: item.brand,
          category: item.category,
          sku: item.sku,
          barcode: item.barcode,
          currency: item.currency,
          image: item.image,
          notes: `Restocked via PO #${poNumber || 'BATCH'}`
        });

        if (res.success) {
          updatedCount++;
        } else if (res.error) {
          errors.push(`${item.name}: ${res.error}`);
        }
      } catch (err: any) {
        errors.push(`${item.name}: ${err?.message || 'Error'}`);
      }
    }

    return { success: updatedCount > 0, updatedCount, errors };
  },

  /**
   * Update individual notify threshold for an accessory
   */
  async updateItemThreshold(accessoryId: string, newThreshold: number): Promise<boolean> {
    try {
      const validThreshold = Math.max(0, Math.min(999, Math.round(newThreshold)));
      const acc = await locateAccessory(accessoryId);
      const targetId = acc ? acc.id : accessoryId;

      if (isSupabaseConfigured()) {
        try {
          await supabase
            .from('nali_accessories')
            .update({
              notifyThreshold: validThreshold,
              updatedAt: new Date().toISOString()
            })
            .eq('id', targetId);
        } catch {}
      }

      // Update IDB and cache
      if (acc) {
        acc.notifyThreshold = validThreshold;
        try { await idb.put('accessories', acc); } catch {}
      }

      if (typeof window !== 'undefined') {
        ACCESSORIES_CACHE_KEYS.forEach(k => {
          try {
            const raw = localStorage.getItem(k);
            if (!raw) return;
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const item = list.find((a: Accessory) => String(a.id) === String(targetId));
              if (item) {
                item.notifyThreshold = validThreshold;
                localStorage.setItem(k, JSON.stringify(list));
              }
            }
          } catch {}
        });

        window.dispatchEvent(new CustomEvent('accessories_updated'));
      }

      return true;
    } catch (e) {
      console.warn('Failed to update threshold:', e);
      return false;
    }
  },

  /**
   * Get all saved purchase orders from Supabase settings or localStorage
   */
  async getAllPurchaseOrders(): Promise<PurchaseOrder[]> {
    let orders: PurchaseOrder[] = [];

    // Check localStorage first for instant speed
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(PURCHASE_ORDERS_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            orders = parsed;
          }
        }
      } catch {}
    }

    // Query Supabase settings table if configured
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', PURCHASE_ORDERS_KEY)
          .maybeSingle();

        if (!error) {
          if (data?.value && Array.isArray(data.value)) {
            orders = data.value as PurchaseOrder[];
            if (typeof window !== 'undefined') {
              localStorage.setItem(PURCHASE_ORDERS_KEY, JSON.stringify(orders));
            }
          } else if (!data) {
            orders = [];
            if (typeof window !== 'undefined') {
              localStorage.removeItem(PURCHASE_ORDERS_KEY);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch purchase orders from Supabase:', err);
      }
    }

    return orders;
  },

  /**
   * Save or update a purchase order in Supabase and localStorage
   */
  async savePurchaseOrder(order: PurchaseOrder): Promise<PurchaseOrder> {
    const orders = await this.getAllPurchaseOrders();
    const existingIndex = orders.findIndex(o => o.id === order.id);

    const now = new Date().toISOString();
    const preparedOrder: PurchaseOrder = {
      ...order,
      updatedAt: now
    };

    if (existingIndex >= 0) {
      orders[existingIndex] = preparedOrder;
    } else {
      orders.unshift(preparedOrder);
    }

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(PURCHASE_ORDERS_KEY, JSON.stringify(orders));
    }

    // Persist to Supabase settings table
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('settings')
          .upsert(
            { key: PURCHASE_ORDERS_KEY, value: orders as any },
            { onConflict: 'key' }
          );
      } catch (err) {
        console.warn('Failed to persist purchase orders to Supabase:', err);
      }
    }

    return preparedOrder;
  },

  /**
   * Delete a purchase order by ID
   */
  async deletePurchaseOrder(id: string): Promise<boolean> {
    const orders = await this.getAllPurchaseOrders();
    const filtered = orders.filter(o => o.id !== id);

    if (typeof window !== 'undefined') {
      localStorage.setItem(PURCHASE_ORDERS_KEY, JSON.stringify(filtered));
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('settings')
          .upsert(
            { key: PURCHASE_ORDERS_KEY, value: filtered as any },
            { onConflict: 'key' }
          );
      } catch (err) {
        console.warn('Failed to delete purchase order from Supabase:', err);
      }
    }

    return true;
  }
};
