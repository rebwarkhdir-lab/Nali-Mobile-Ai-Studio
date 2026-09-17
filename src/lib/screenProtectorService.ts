import { ScreenProtectorGroup, ScreenProtectorSearchResult, CompatibleModel, NotchType } from '../types/screenProtector';
import { INITIAL_SCREEN_PROTECTORS } from '../data/screenProtectorDatabase';
import { Accessory } from '../types/accessory';
import { idb } from './idbService';
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEY_V2 = 'nali_screen_protectors_groups_v2';
const STORAGE_KEY_V1 = 'nali_screen_protectors_groups_v1';

class ScreenProtectorService {
  private groups: ScreenProtectorGroup[] = [];
  private listeners: Array<() => void> = [];
  private isLoaded = false;
  private isSyncing = false;
  private realtimeChannel: any = null;

  constructor() {
    this.loadGroups();
    this.setupWindowListeners();
  }

  private setupWindowListeners() {
    if (typeof window === 'undefined') return;

    // Sync when coming back online
    window.addEventListener('online', () => {
      this.syncWithCloud();
    });

    // Sync when Supabase connection is reconfigured or reloaded
    window.addEventListener('supabase_config_changed', () => {
      this.initRealtime();
      this.syncWithCloud();
    });

    window.addEventListener('supabase_data_reload', () => {
      this.syncWithCloud();
    });
  }

  private async loadGroups() {
    try {
      // 1. Try local storage fast boot (check v2 then v1)
      const local = localStorage.getItem(STORAGE_KEY_V2) || localStorage.getItem(STORAGE_KEY_V1);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.groups = parsed;
            this.isLoaded = true;
            this.notifyListeners();
          }
        } catch {}
      }

      // 2. Try IndexedDB offline storage if local was empty
      if (!this.isLoaded) {
        try {
          const idbSetting = (await idb.get<any>('app_settings', STORAGE_KEY_V2)) || (await idb.get<any>('app_settings', STORAGE_KEY_V1));
          if (idbSetting && Array.isArray(idbSetting.value) && idbSetting.value.length > 0) {
            this.groups = idbSetting.value;
            this.isLoaded = true;
            localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(this.groups));
            localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(this.groups));
            this.notifyListeners();
          }
        } catch {}
      }
      
      // 3. Pull latest from Cloud Database (await so we never overwrite cloud with defaults)
      const synced = await this.syncWithCloud();
      
      // 4. Only initialize with defaults if BOTH local and cloud had zero items
      if (!this.isLoaded && !synced && (this.groups?.length || 0) === 0) {
         this.groups = [...INITIAL_SCREEN_PROTECTORS];
         this.isLoaded = true;
         this.notifyListeners();
         await this.saveGroups();
      }
    } catch (e) {
      console.warn('Error loading custom screen protectors from cache:', e);
    } finally {
      this.initRealtime();
    }
  }

  /**
   * Initializes persistent Supabase Realtime subscription with both Broadcast and Postgres Changes
   */
  public initRealtime() {
    if (!isSupabaseConfigured() || typeof window === 'undefined') return;

    if (this.realtimeChannel) {
      try {
        supabase.removeChannel(this.realtimeChannel);
      } catch {}
    }

    try {
      const channel = supabase.channel('nali_screen_protectors_realtime_broadcast', {
        config: { broadcast: { self: false } }
      });

      channel
        .on('broadcast', { event: 'SCREEN_PROTECTORS_UPDATED' }, (payload: any) => {
          const incomingGroups = payload?.payload?.groups;
          if (incomingGroups && Array.isArray(incomingGroups) && (incomingGroups?.length || 0) > 0) {
            console.log(`[ScreenProtectorsSync] Realtime broadcast update received from another device: ${incomingGroups?.length || 0} groups`);
            this.applyIncomingGroups(incomingGroups);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: `key=eq.${STORAGE_KEY_V2}` }, () => {
          console.log('[ScreenProtectorsSync] Postgres change detected on settings table. Pulling latest cloud state...');
          this.syncWithCloud();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settings', filter: `key=eq.${STORAGE_KEY_V1}` }, () => {
          console.log('[ScreenProtectorsSync] Postgres change detected on settings table. Pulling latest cloud state...');
          this.syncWithCloud();
        })
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log('[ScreenProtectorsSync] Successfully subscribed to cross-device realtime channel.');
          }
        });

      this.realtimeChannel = channel;
    } catch (err) {
      console.warn('[ScreenProtectorsSync] Failed to init realtime listener:', err);
    }
  }

  private applyIncomingGroups(newGroups: ScreenProtectorGroup[]) {
    if (!Array.isArray(newGroups) || newGroups.length === 0) return;
    this.groups = newGroups;
    this.isLoaded = true;
    try {
      localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(newGroups));
      localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(newGroups));
      idb.put('app_settings', { key: STORAGE_KEY_V2, value: newGroups, updatedAt: new Date().toISOString() }).catch(() => {});
      idb.put('app_settings', { key: STORAGE_KEY_V1, value: newGroups, updatedAt: new Date().toISOString() }).catch(() => {});
    } catch {}
    this.notifyListeners();
  }

  private broadcastChanges() {
    if (this.realtimeChannel && isSupabaseConfigured()) {
      try {
        this.realtimeChannel.send({
          type: 'broadcast',
          event: 'SCREEN_PROTECTORS_UPDATED',
          payload: {
            groups: this.groups,
            updatedAt: new Date().toISOString()
          }
        }).catch((err: any) => console.warn('[ScreenProtectorsSync] Broadcast send notice:', err));
      } catch {}
    }
  }

  public async syncWithCloud(): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    if (this.isSyncing) return false;
    this.isSyncing = true;

    try {
      // Check v2 first
      const { data: v2Data, error: v2Error } = await supabase
        .from('settings')
        .select('value, updated_at')
        .eq('key', STORAGE_KEY_V2)
        .maybeSingle();

      let cloudGroups: ScreenProtectorGroup[] | null = null;
      if (!v2Error && v2Data && Array.isArray(v2Data.value) && v2Data.value.length > 0) {
        cloudGroups = v2Data.value;
      } else {
        // Fallback to v1 if v2 is empty or uninitialized
        const { data: v1Data, error: v1Error } = await supabase
          .from('settings')
          .select('value, updated_at')
          .eq('key', STORAGE_KEY_V1)
          .maybeSingle();
        if (!v1Error && v1Data && Array.isArray(v1Data.value) && v1Data.value.length > 0) {
          cloudGroups = v1Data.value;
        }
      }

      if (cloudGroups && Array.isArray(cloudGroups) && cloudGroups.length > 0) {
        this.groups = cloudGroups;
        this.isLoaded = true;
        localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(cloudGroups));
        localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(cloudGroups));
        idb.put('app_settings', { key: STORAGE_KEY_V2, value: cloudGroups, updatedAt: new Date().toISOString() }).catch(() => {});
        idb.put('app_settings', { key: STORAGE_KEY_V1, value: cloudGroups, updatedAt: new Date().toISOString() }).catch(() => {});
        this.notifyListeners();
        return true;
      }
    } catch (e) {
      console.warn('[ScreenProtectorsSync] Cloud pull error:', e);
    } finally {
      this.isSyncing = false;
    }
    return false;
  }

  public async saveGroups(broadcast: boolean = true): Promise<boolean> {
    try {
      // 1. Immediately persist locally (v2 and v1)
      localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(this.groups));
      localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(this.groups));
      idb.put('app_settings', { key: STORAGE_KEY_V2, value: this.groups, updatedAt: new Date().toISOString() }).catch(() => {});
      idb.put('app_settings', { key: STORAGE_KEY_V1, value: this.groups, updatedAt: new Date().toISOString() }).catch(() => {});
      this.notifyListeners();

      // 2. Broadcast immediately to any other active devices/tabs
      if (broadcast) {
        this.broadcastChanges();
      }
      
      // 3. Sync to cloud database settings table (dual-write to both v2 and v1)
      if (isSupabaseConfigured()) {
        const payload = {
          value: this.groups as any,
          updated_at: new Date().toISOString()
        };

        const [resV2, resV1] = await Promise.allSettled([
          supabase.from('settings').upsert({ key: STORAGE_KEY_V2, ...payload }, { onConflict: 'key' }),
          supabase.from('settings').upsert({ key: STORAGE_KEY_V1, ...payload }, { onConflict: 'key' })
        ]);

        const hasV2Error = resV2.status === 'fulfilled' && resV2.value.error;
        if (hasV2Error && resV2.value.error.code !== 'PGRST205' && resV2.value.error.code !== '42P01') {
          console.warn('Supabase screen protector cloud sync status:', resV2.value.error.message);
          return false;
        }
        return true;
      }
    } catch (e) {
      console.error('Failed to persist screen protector groups:', e);
      return false;
    }
    return true;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }

  public getAllGroups(): ScreenProtectorGroup[] {
    if (!this.isLoaded || (this.groups?.length || 0) === 0) {
      return [];
    }
    return this.groups || [];
  }

  public getGroupById(id: string): ScreenProtectorGroup | undefined {
    return this.groups.find(g => g.id === id);
  }

  public async addGroup(group: Omit<ScreenProtectorGroup, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScreenProtectorGroup> {
    const newGroup: ScreenProtectorGroup = {
      ...group,
      id: `sp_custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.groups.unshift(newGroup);
    await this.saveGroups(true);
    return newGroup;
  }

  public async updateGroup(id: string, updates: Partial<ScreenProtectorGroup>): Promise<ScreenProtectorGroup | null> {
    const index = this.groups.findIndex(g => g.id === id);
    if (index === -1) return null;

    this.groups[index] = {
      ...this.groups[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await this.saveGroups(true);
    return this.groups[index];
  }

  public async deleteGroup(id: string): Promise<boolean> {
    const initialLen = this.groups?.length || 0;
    this.groups = (this.groups || []).filter(g => g.id !== id);
    if ((this.groups?.length || 0) !== initialLen) {
      await this.saveGroups(true);
      return true;
    }
    return false;
  }

  public async addModelToGroup(groupId: string, model: CompatibleModel): Promise<boolean> {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return false;

    // Check if model already exists
    const exists = group.models.some(m => 
      m.brand.toLowerCase() === model.brand.toLowerCase() && 
      m.model.toLowerCase() === model.model.toLowerCase()
    );

    if (!exists) {
      group.models.push(model);
      group.updatedAt = new Date().toISOString();
      await this.saveGroups(true);
      return true;
    }
    return false;
  }

  public async removeModelFromGroup(groupId: string, brand: string, modelName: string): Promise<boolean> {
    const group = this.groups.find(g => g.id === groupId);
    if (!group) return false;

    group.models = group.models.filter(m => 
      !(m.brand.toLowerCase() === brand.toLowerCase() && m.model.toLowerCase() === modelName.toLowerCase())
    );
    group.updatedAt = new Date().toISOString();
    await this.saveGroups(true);
    return true;
  }

  public async resetToDefaultDatabase(): Promise<void> {
    this.groups = [...INITIAL_SCREEN_PROTECTORS];
    await this.saveGroups(true);
    await this.syncWithCloud();
  }

  /**
   * Smart Search for Screen Protectors
   * Matches model names, brands, aliases, die codes, notch types, and screen sizes.
   * Cross-references shop inventory accessories in real-time.
   */
  public searchCompatibilities(
    query: string, 
    accessories: Accessory[] = [],
    filters?: {
      brand?: string;
      notchType?: string;
      inStockOnly?: boolean;
    }
  ): ScreenProtectorSearchResult[] {
    const cleanQuery = query.trim().toLowerCase();
    const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);

    const allGroups = this.getAllGroups();
    const results: ScreenProtectorSearchResult[] = [];

    // Helper to find shop inventory items matching this group
    const findMatchingInventory = (group: ScreenProtectorGroup) => {
      if (!accessories || (accessories?.length || 0) === 0) return [];

      return accessories.filter(acc => {
        // Must be in stock or glass category
        const isGlassCategory = 
          (acc.category && /screen|glass|protector|tempered|matte|privacy|uv|hydrogel/i.test(acc.category)) ||
          (acc.name && /glass|screen|protector|tempered|matte|privacy|9d|11d|21d|uv/i.test(acc.name));

        if (!isGlassCategory && acc.quantity <= 0) return false;

        // 1. Check explicit linked IDs
        if (group.linkedAccessoryIds && group.linkedAccessoryIds.includes(acc.id)) {
          return true;
        }

        // 2. Check barcode matching
        if (group.customBarcodes && group.customBarcodes.includes(acc.barcode)) {
          return true;
        }

        // 3. Check dieCode in accessory name or notes or compatibility
        const accNameLower = (acc.name || '').toLowerCase();
        const accNotesLower = (acc.notes || '').toLowerCase();
        const accCompatLower = (acc.compatibility || '').toLowerCase();
        const dieCodeLower = group.dieCode.toLowerCase();

        if (dieCodeLower && (accNameLower.includes(dieCodeLower) || accCompatLower.includes(dieCodeLower))) {
          return true;
        }

        // 4. Check if any model in the group is in the accessory compatibility / name
        for (const m of (group.models || [])) {
          const modelClean = (m.model || '').toLowerCase();
          if (modelClean.length > 2) {
            if (accCompatLower.includes(modelClean) || accNameLower.includes(modelClean)) {
              return true;
            }
          }
        }

        return false;
      });
    };

    for (const group of allGroups) {
      // Apply brand filter
      if (filters?.brand && filters.brand !== 'all') {
        const matchesBrand = 
          group.primaryBrand.toLowerCase() === filters.brand.toLowerCase() ||
          (group.models || []).some(m => m.brand.toLowerCase() === filters.brand.toLowerCase());
        if (!matchesBrand) continue;
      }

      // Apply notch filter
      if (filters?.notchType && filters.notchType !== 'all') {
        if (group.notchType !== filters.notchType) continue;
      }

      const matchingAccs = findMatchingInventory(group);
      const totalStock = matchingAccs.reduce((sum, item) => sum + (item.quantity || 0), 0);

      // Apply inStockOnly filter
      if (filters?.inStockOnly && totalStock <= 0) {
        continue;
      }

      const mappedInventory = matchingAccs.map(a => ({
        id: a.id,
        name: a.name,
        brand: a.brand,
        category: a.category,
        quantity: a.quantity,
        price: a.sellPrice,
        currency: a.currency,
        location: a.location,
        barcode: a.barcode
      }));

      // If no query string, return all filtered groups
      if (!cleanQuery) {
        results.push({
          group,
          matchType: 'group_name',
          inStockCount: totalStock,
          inventoryItems: mappedInventory
        });
        continue;
      }

      // 1. Check exact/token match in models
      let bestMatchedModel: CompatibleModel | undefined;
      let matchType: ScreenProtectorSearchResult['matchType'] = 'group_name';
      let score = 0;

      for (const m of (group.models || [])) {
        const modelLower = (m.model || '').toLowerCase();
        const brandLower = (m.brand || '').toLowerCase();
        const fullModelName = `${brandLower} ${modelLower}`;

        if (modelLower === cleanQuery || fullModelName === cleanQuery) {
          bestMatchedModel = m;
          matchType = 'exact';
          score = 100;
          break;
        }

        // Check if all tokens match
        const allTokensInModel = queryTokens.every(tok => fullModelName.includes(tok));
        if (allTokensInModel) {
          bestMatchedModel = m;
          matchType = 'exact';
          score = Math.max(score, 80);
        }

        // Check aliases
        if (m.aliases) {
          for (const alias of m.aliases) {
            const aliasLower = alias.toLowerCase();
            if (aliasLower.includes(cleanQuery) || queryTokens.every(tok => aliasLower.includes(tok))) {
              bestMatchedModel = m;
              matchType = 'alias';
              score = Math.max(score, 70);
            }
          }
        }
      }

      // 2. Check Die Code match
      if (score < 100 && group.dieCode.toLowerCase().includes(cleanQuery)) {
        matchType = 'die_code';
        score = Math.max(score, 60);
      }

      // 3. Check Group Name match
      if (score < 100 && queryTokens.every(tok => group.name.toLowerCase().includes(tok))) {
        matchType = 'group_name';
        score = Math.max(score, 50);
      }

      // 4. Check Screen Size match
      if (score < 100 && group.screenSize.toLowerCase().includes(cleanQuery)) {
        score = Math.max(score, 40);
      }

      if (score > 0) {
        results.push({
          group,
          matchedModel: bestMatchedModel,
          matchType,
          inStockCount: totalStock,
          inventoryItems: mappedInventory
        });
      }
    }

    // Sort by relevance (exact match first, in-stock count, model popularity)
    return results.sort((a, b) => {
      if (a.matchType === 'exact' && b.matchType !== 'exact') return -1;
      if (b.matchType === 'exact' && a.matchType !== 'exact') return 1;
      if (a.inStockCount > 0 && b.inStockCount === 0) return -1;
      if (b.inStockCount > 0 && a.inStockCount === 0) return 1;
      return (b.group.models || []).length - (a.group.models || []).length;
    });
  }

  /**
   * Export database as JSON
   */
  public exportJSON(): string {
    return JSON.stringify(this.groups, null, 2);
  }

  /**
   * Import database from JSON
   */
  public importJSON(jsonStr: string): { success: boolean; count: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) {
        return { success: false, count: 0, error: 'Invalid format: expected array of groups' };
      }

      // Validate basic properties
      const valid = parsed.filter(g => g && g.name && Array.isArray(g.models));
      if ((valid?.length || 0) === 0) {
        return { success: false, count: 0, error: 'No valid groups found in file' };
      }

      this.groups = valid;
      this.saveGroups();
      return { success: true, count: valid?.length || 0 };
    } catch (e: any) {
      return { success: false, count: 0, error: e.message || 'Parse error' };
    }
  }
}

export const screenProtectorService = new ScreenProtectorService();
