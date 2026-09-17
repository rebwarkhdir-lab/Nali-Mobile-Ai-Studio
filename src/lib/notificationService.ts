import { AppNotification, NotificationPreferences, NotificationCategory, NotificationPriority, NotificationTargetRole } from '../types/notification';
import { supabase, isSupabaseConfigured } from './supabase';
import { sound } from './sound';
import { debtService } from './debtService';
import { installmentService } from './installmentService';

const STORAGE_KEY = 'nali_pos_notifications_v2';
const PREFERENCES_KEY = 'nali_pos_notification_prefs_v2';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  soundEnabled: true,
  soundVolume: 80,
  toastNotifications: true,
  toastAutoDismissSeconds: 6,
  minimumPriorityForToast: 'medium',
  activeRoleFilter: 'All',
  categories: {
    inventory: true,
    debt: true,
    supplier: true,
    repair: true,
    security: true,
    system: true,
  },
  channels: {
    inAppBell: true,
    pushToasts: true,
    soundChimes: true,
  }
};

/**
 * Generates RFC4122 compliant UUID v4 string for PostgreSQL UUID primary key compatibility.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Empty by default - All notifications MUST strictly derive from real database records!
 * No fictitious or mock customers, stock, or tickets.
 */
export const SEED_NOTIFICATIONS: AppNotification[] = [];

/**
 * Filter to detect and eradicate any fictitious/dummy seed records
 * (such as mock customers or phantom inventory that do not exist in the real database).
 */
export function isSeedOrGhostNotification(n: any): boolean {
  if (!n) return true;

  // 1. Check for legacy mock seed IDs
  if (typeof n.id === 'string' && /^(mock-|seed-|test-|notif-(inv|debt|repair|sec)-\d+)/i.test(n.id)) {
    return true;
  }

  // 2. Check for dummy mock customer names
  const customerName = n.metadata?.customerName || '';
  if (['Rebar Ahmed', 'Darya Aziz', 'Hemn Farhad', 'Lanja Omer', 'Aland Sardar'].includes(customerName)) {
    return true;
  }

  // 3. Check for dummy mock products / SKUs
  const productName = n.metadata?.productName || '';
  const sku = n.metadata?.sku || '';
  if (
    ['iPhone 15 Pro Max Ceramic Glass', 'Apple 20W USB-C Power Adapter', 'Samsung Galaxy S24 Ultra Original Display Panel', 'Anker 65W GaN Fast Charger'].includes(productName) ||
    ['SP-IP15PM', 'ACC-AP-20W', 'PART-SAM-S24U-DISP', 'ACC-ANK-65W'].includes(sku)
  ) {
    return true;
  }

  // 4. Check for mock repair tickets
  const ticket = n.metadata?.ticketNumber || '';
  if (['REP-3082', 'REP-3089', 'REP-3104', 'REP-3107'].includes(ticket)) {
    return true;
  }

  // 5. Check for mock terminal variances & IPs
  if (n.metadata?.registerId === 'POS-TERM-01' || n.metadata?.registerId === 'POS-TERM-02' || n.metadata?.ipAddress === '185.120.45.12') {
    return true;
  }

  return false;
}

/**
 * Returns a deterministic unique identity key for any notification.
 * Used to prevent duplicate alert cards for the same product, debt, installment, or invoice.
 */
export function getNotificationDedupeKey(n: Partial<AppNotification>): string {
  if (!n) return '';
  const meta = n.metadata || {};
  const cat = (n.category || 'general').toLowerCase().trim();

  // 1. Explicit domain entity identifiers
  const prodId = meta.productId || meta.accessoryId || meta.mobileId || meta.itemId;
  if (prodId && String(prodId).trim()) {
    return `inv:prod:${String(prodId).trim().toLowerCase()}`;
  }

  const barcode = meta.barcode || meta.sku;
  if (barcode && String(barcode).trim()) {
    return `inv:sku:${String(barcode).trim().toLowerCase()}`;
  }

  if (meta.debtId && String(meta.debtId).trim()) {
    return `debt:id:${String(meta.debtId).trim().toLowerCase()}`;
  }

  if (meta.scheduleId && String(meta.scheduleId).trim()) {
    return `inst:sched:${String(meta.scheduleId).trim().toLowerCase()}`;
  }

  if (meta.installmentId && String(meta.installmentId).trim()) {
    const month = meta.monthNumber !== undefined ? `:m${meta.monthNumber}` : '';
    return `inst:plan:${String(meta.installmentId).trim().toLowerCase()}${month}`;
  }

  if (meta.invoiceId && String(meta.invoiceId).trim()) {
    return `sup:inv:${String(meta.invoiceId).trim().toLowerCase()}`;
  }

  const repairRef = meta.repairId || meta.ticketNumber;
  if (repairRef && String(repairRef).trim()) {
    return `rep:ticket:${String(repairRef).trim().toLowerCase()}`;
  }

  // 2. Semantic matching for un-keyed items
  if (cat === 'inventory' && meta.productName && String(meta.productName).trim()) {
    return `inv:name:${String(meta.productName).trim().toLowerCase()}`;
  }

  if (cat === 'debt' && meta.customerName && String(meta.customerName).trim()) {
    return `debt:cust:${String(meta.customerName).trim().toLowerCase()}`;
  }

  if (cat === 'supplier' && meta.supplierName && String(meta.supplierName).trim()) {
    return `sup:name:${String(meta.supplierName).trim().toLowerCase()}`;
  }

  // 3. Normalized Title + Category (strips dynamic prefixes to prevent dual-alerting)
  const rawTitle = (n.title || '').trim().toLowerCase();
  const normalizedTitle = rawTitle
    .replace(/^(critical|urgent|alert|warning|info):\s*/i, '')
    .replace(/^(low stock alert|out of stock|stock depleted):\s*/i, 'stock:')
    .replace(/^(overdue customer debt|urgent overdue debt|overdue debt):\s*/i, 'debt:')
    .replace(/^(upcoming installment|overdue installment):\s*/i, 'installment:')
    .replace(/^(overdue supplier payable|supplier payable):\s*/i, 'supplier:')
    .trim();

  if (normalizedTitle) {
    return `${cat}:${normalizedTitle}`;
  }

  const rawMsg = (n.message || '').trim().toLowerCase();
  return `${cat}:msg:${rawMsg.slice(0, 60)}`;
}

class NotificationService {
  private notifications: AppNotification[] = [];
  private preferences: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES;
  private listeners: Array<() => void> = [];
  private lastLocalSyncTimestamp = 0;

  constructor() {
    this.loadFromStorage();
    if (typeof window !== 'undefined') {
      window.addEventListener('payment_recorded', (e: any) => {
        const detail = e?.detail || {};
        this.handlePaymentRecorded(detail);
      });
      // Initial pull from Supabase
      setTimeout(() => this.pullFromCloud(), 500);
      
      // 1. Setup realtime listener directly on public.notifications table
      supabase
        .channel('public:notifications_table_live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload: any) => {
          // Prevent feedback echo loops from our own local push
          if (Date.now() - this.lastLocalSyncTimestamp < 1500) {
            return;
          }
          this.handleRealtimeNotificationChange(payload);
        })
        .subscribe();

      // 2. Setup realtime listener for settings table fallback
      supabase
        .channel('public:notifications_settings_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, (payload: any) => {
          if (Date.now() - this.lastLocalSyncTimestamp < 2500) {
            return;
          }
          const key = payload.new?.key || payload.old?.key;
          if (key && key.includes('nali_pos_notification')) {
            this.pullFromCloud();
          }
        })
        .subscribe();
    }
  }

  private handleRealtimeNotificationChange(payload: any) {
    try {
      const eventType = payload.eventType;
      if (eventType === 'INSERT') {
        const row = payload.new;
        if (row && !isSeedOrGhostNotification(row)) {
          const notif: AppNotification = {
            id: row.id,
            recipientUserId: row.recipient_user_id || null,
            targetRole: (row.target_role || 'All') as NotificationTargetRole,
            category: (row.category || 'system') as AppNotification['category'],
            priority: (row.priority || 'medium') as NotificationPriority,
            title: row.title || 'Notification',
            message: row.message || '',
            metadata: row.metadata || {},
            isRead: !!row.is_read,
            readAt: row.read_at || null,
            actionUrl: row.action_url || null,
            snoozedUntil: row.snoozed_until || null,
            createdAt: row.created_at || new Date().toISOString()
          };

          const exists = this.notifications.some(n => n.id === notif.id);
          if (!exists) {
            this.notifications = [notif, ...this.notifications];
            this.deduplicateNotifications();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications));
            if (!notif.isRead && !this.isNotificationSnoozed(notif)) {
              if (this.preferences.soundEnabled && this.preferences.channels.soundChimes) {
                if (notif.priority === 'critical') {
                  sound.playCriticalAlarm();
                } else {
                  sound.playNotificationPing();
                }
              }
            }
            this.listeners.forEach(cb => cb());
          }
        }
      } else if (eventType === 'UPDATE') {
        const row = payload.new;
        if (row) {
          this.notifications = this.notifications.map(n => {
            if (n.id === row.id) {
              return {
                ...n,
                isRead: !!row.is_read,
                readAt: row.read_at || null,
                snoozedUntil: row.snoozed_until || null,
                metadata: { ...n.metadata, ...(row.metadata || {}) }
              };
            }
            return n;
          });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications));
          this.listeners.forEach(cb => cb());
        }
      } else if (eventType === 'DELETE') {
        const oldId = payload.old?.id;
        if (oldId) {
          this.notifications = this.notifications.filter(n => n.id !== oldId);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications));
          this.listeners.forEach(cb => cb());
        }
      }
    } catch (e) {
      console.warn('[NotificationService] Realtime handler exception:', e);
    }
  }

  public isNotificationSnoozed(notification: AppNotification): boolean {
    if (!notification.snoozedUntil) return false;
    const snoozeTime = new Date(notification.snoozedUntil).getTime();
    return !isNaN(snoozeTime) && snoozeTime > Date.now();
  }

  private loadFromStorage() {
    try {
      const savedPrefs = localStorage.getItem(PREFERENCES_KEY);
      if (savedPrefs) {
        this.preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(savedPrefs) };
      }
      
      const savedNotifs = localStorage.getItem(STORAGE_KEY);
      if (savedNotifs) {
        const parsed = JSON.parse(savedNotifs);
        if (Array.isArray(parsed)) {
          this.notifications = parsed.filter(n => !isSeedOrGhostNotification(n));
          this.deduplicateNotifications();
        } else {
          this.notifications = [];
        }
      } else {
        this.notifications = [];
      }

      // Eradicate obsolete legacy localStorage keys
      try {
        localStorage.removeItem('nali_pos_notifications_v1');
      } catch {}
      this.saveToStorage();
    } catch (e) {
      console.warn('[NotificationService] Load from storage fallback', e);
      this.notifications = [];
    }
  }

  /**
   * Eliminates duplicate alerts across the entire notification system,
   * keeping the most relevant and updated version for any unique entity.
   */
  public deduplicateNotifications() {
    const seen = new Map<string, AppNotification>();
    for (const notif of this.notifications) {
      if (!notif || notif.isPaid || notif.archived || isSeedOrGhostNotification(notif)) {
        continue;
      }
      const key = getNotificationDedupeKey(notif);
      if (!seen.has(key)) {
        seen.set(key, notif);
      } else {
        const existing = seen.get(key)!;
        // Priority: If one is unread and the other is read, keep the unread one
        if (!notif.isRead && existing.isRead) {
          seen.set(key, notif);
        } else if (notif.isRead && !existing.isRead) {
          seen.set(key, existing);
        } else {
          // If both unread or both read, keep the newer one and merge metadata
          const newer = new Date(notif.createdAt).getTime() >= new Date(existing.createdAt).getTime() ? notif : existing;
          const older = newer === notif ? existing : notif;
          seen.set(key, {
            ...older,
            ...newer,
            metadata: { ...older.metadata, ...newer.metadata }
          });
        }
      }
    }
    this.notifications = Array.from(seen.values());
  }

  private saveToStorage() {
    try {
      this.deduplicateNotifications();
      // Ensure only verified clean notifications are persisted
      const cleanNotifs = this.notifications.filter(n => !isSeedOrGhostNotification(n));
      this.notifications = cleanNotifs;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications));
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(this.preferences));
      this.syncToCloud();
    } catch (e) {
      console.error('[NotificationService] Save failed', e);
    }
  }

  private async syncToCloud() {
    if (!isSupabaseConfigured()) return;
    try {
      this.lastLocalSyncTimestamp = Date.now();
      const cleanNotifs = (this.notifications || []).filter(n => !isSeedOrGhostNotification(n));
      
      // Ensure all notifications have a valid UUID before sending to PostgreSQL
      cleanNotifs.forEach(n => {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(n.id);
        if (!isUuid) {
          n.id = generateUUID();
        }
      });

      // 1. Settings Table Cloud Backup
      await supabase.from('settings').upsert([
        { key: 'nali_pos_notifications_v1', value: cleanNotifs, updated_at: new Date().toISOString() },
        { key: 'nali_pos_notification_prefs_v1', value: this.preferences, updated_at: new Date().toISOString() }
      ], { onConflict: 'key' });
    
      // 2. Direct Relational Upsert into Supabase `notifications` table
      try {
        if (Array.isArray(cleanNotifs) && cleanNotifs.length > 0) {
          const notifRows = cleanNotifs.map(n => ({
            id: n.id,
            recipient_user_id: n.recipientUserId || null,
            target_role: n.targetRole || 'All',
            category: n.category || 'system',
            priority: n.priority || 'medium',
            title: n.title,
            message: n.message,
            metadata: n.metadata || {},
            is_read: !!n.isRead,
            read_at: n.readAt || null,
            action_url: n.actionUrl || null,
            snoozed_until: n.snoozedUntil || null,
            created_at: n.createdAt || new Date().toISOString()
          }));
          
          await supabase.from('notifications').upsert(notifRows, { onConflict: 'id' });

          // Map notification_references for foreign key lookups
          const refRows: any[] = [];
          cleanNotifs.forEach(n => {
             if (n.metadata?.debtId) refRows.push({ notification_id: n.id, reference_type: 'debt', reference_id: String(n.metadata.debtId) });
             if (n.metadata?.installmentId) refRows.push({ notification_id: n.id, reference_type: 'installment', reference_id: String(n.metadata.installmentId) });
             if (n.metadata?.repairId) refRows.push({ notification_id: n.id, reference_type: 'repair', reference_id: String(n.metadata.repairId) });
             if (n.metadata?.supplierId) refRows.push({ notification_id: n.id, reference_type: 'supplier', reference_id: String(n.metadata.supplierId) });
          });
          if (refRows.length > 0) {
             await supabase.from('notification_references').upsert(refRows, { onConflict: 'notification_id,reference_type,reference_id' }).select('id').limit(1);
          }
        }
      } catch (e) {
        console.warn('[NotificationService] Relational push notification error:', e);
      }
    } catch (e) {
      console.warn('[NotificationService] Cloud sync error:', e);
    }
  }

  public async pullFromCloud() {
    if (!isSupabaseConfigured()) return;
    try {
      let changed = false;

      // 1. Direct fetch from Supabase `notifications` table
      try {
        const { data: dbNotifs, error: dbErr } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(150);

        if (!dbErr && Array.isArray(dbNotifs) && dbNotifs.length > 0) {
          const mapped: AppNotification[] = dbNotifs
            .filter((row: any) => !isSeedOrGhostNotification(row))
            .map((row: any) => ({
              id: row.id,
              recipientUserId: row.recipient_user_id || null,
              targetRole: (row.target_role || 'All') as NotificationTargetRole,
              category: (row.category || 'system') as AppNotification['category'],
              priority: (row.priority || 'medium') as NotificationPriority,
              title: row.title || 'Notification',
              message: row.message || '',
              metadata: row.metadata || {},
              isRead: !!row.is_read,
              readAt: row.read_at || null,
              actionUrl: row.action_url || null,
              snoozedUntil: row.snoozed_until || null,
              createdAt: row.created_at || new Date().toISOString()
            }));

          if (mapped.length > 0) {
            const remoteMap = new Map<string, AppNotification>();
            mapped.forEach(m => remoteMap.set(m.id, m));

            // Merge: Keep remote plus any unsynced local
            const unSyncedLocal = (this.notifications || []).filter(l => !remoteMap.has(l.id) && !isSeedOrGhostNotification(l));
            this.notifications = [...mapped, ...unSyncedLocal];
            this.deduplicateNotifications();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications));
            changed = true;
          }
        }
      } catch (err) {
        console.warn('[NotificationService] Error fetching notifications table:', err);
      }

      // 2. Settings table fallback & preferences
      const { data, error } = await supabase.from('settings').select('*').in('key', ['nali_pos_notifications_v1', 'nali_pos_notification_prefs_v1']);
      if (!error && data) {
        for (const row of data) {
          if (row.key === 'nali_pos_notifications_v1' && Array.isArray(row.value) && (!this.notifications || this.notifications.length === 0)) {
            const cleanNotifs = row.value.filter((n: any) => !isSeedOrGhostNotification(n));
            const merged = [...(this.notifications || []), ...cleanNotifs];
            this.notifications = merged;
            this.deduplicateNotifications();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications));
            changed = true;
          } else if (row.key === 'nali_pos_notification_prefs_v1' && row.value) {
            this.preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...row.value };
            localStorage.setItem(PREFERENCES_KEY, JSON.stringify(this.preferences));
            changed = true;
          }
        }
      }

      if (changed) {
        this.listeners.forEach(cb => cb());
      }
    } catch (e) {
      console.warn('[NotificationService] Pull from cloud exception:', e);
    }
  }

  /**
   * Checks if an active notification matching the entity deduplication key is already present.
   */
  public hasActiveNotification(params: Partial<AppNotification>): boolean {
    const dedupeKey = getNotificationDedupeKey(params);
    if (!dedupeKey) return false;
    return this.notifications.some(n => {
      if (!n || n.isPaid || n.archived) return false;
      return getNotificationDedupeKey(n) === dedupeKey;
    });
  }

  private notify() {
    this.saveToStorage();
    this.listeners.forEach(cb => cb());
  }

  public subscribe(callback: () => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  public getAll(): AppNotification[] {
    return [...this.notifications];
  }

  public getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  public async updatePreferences(newPrefs: Partial<NotificationPreferences>) {
    this.preferences = { ...this.preferences, ...newPrefs };
    sound.setVolume(this.preferences.soundVolume);
    sound.setEnabled(this.preferences.soundEnabled);
    this.notify();

    // Sync to Supabase notification_preferences table if user is authenticated
    if (isSupabaseConfigured()) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          await supabase.from('notification_preferences').upsert({
            user_id: authData.user.id,
            sound_enabled: this.preferences.soundEnabled,
            sound_volume: this.preferences.soundVolume,
            toast_enabled: this.preferences.toastNotifications,
            toast_auto_dismiss_seconds: this.preferences.toastAutoDismissSeconds,
            category_inventory: this.preferences.categories.inventory,
            category_debt: this.preferences.categories.debt,
            category_supplier: this.preferences.categories.supplier ?? true,
            category_repair: this.preferences.categories.repair,
            category_security: this.preferences.categories.security,
            category_system: this.preferences.categories.system,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
        }
      } catch (e) {
        // Non-blocking
      }
    }
  }

  public getUnreadCount(userRole?: string): number {
    return this.getFilteredNotifications(userRole, false).filter(n => !n.isRead && !n.isPaid && !n.archived).length;
  }

  public getFilteredNotifications(userRole?: string, includeSnoozed: boolean = false): AppNotification[] {
    const role = this.preferences.activeRoleFilter === 'All' 
      ? (userRole || 'All') 
      : this.preferences.activeRoleFilter;

    return this.notifications.filter(n => {
      // Exclude permanently settled or archived alerts
      if (n.isPaid || n.archived) return false;

      // Filter out snoozed notifications unless explicitly requested
      if (!includeSnoozed && this.isNotificationSnoozed(n)) {
        return false;
      }

      // Check category preference toggle
      if (!this.preferences.categories[n.category]) return false;

      // Check Role Based Access
      if (role === 'All' || role === 'Administrator' || role === 'Super Admin' || role === 'Shop Manager') {
        return true;
      }
      if (n.targetRole === 'All') return true;
      if (n.targetRole.toLowerCase() === role.toLowerCase()) return true;

      return false;
    });
  }

  public async markAsRead(id: string) {
    const readAt = new Date().toISOString();
    this.notifications = this.notifications.map(n => 
      n.id === id ? { ...n, isRead: true, readAt } : n
    );
    this.notify();

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('notifications').update({
          is_read: true,
          read_at: readAt
        }).eq('id', id);
      } catch (e) {
        // Ignore
      }
    }
  }

  public async markAsUnread(id: string) {
    this.notifications = this.notifications.map(n => 
      n.id === id ? { ...n, isRead: false, readAt: null } : n
    );
    this.notify();

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('notifications').update({
          is_read: false,
          read_at: null
        }).eq('id', id);
      } catch (e) {
        // Ignore
      }
    }
  }

  public async markAllAsRead(userRole?: string) {
    const visibleIds = this.getFilteredNotifications(userRole, true).map(n => n.id);
    const readAt = new Date().toISOString();
    this.notifications = this.notifications.map(n => 
      visibleIds.includes(n.id) ? { ...n, isRead: true, readAt } : n
    );
    sound.playClick();
    this.notify();

    if (isSupabaseConfigured() && visibleIds.length > 0) {
      try {
        await supabase.from('notifications').update({
          is_read: true,
          read_at: readAt
        }).in('id', visibleIds);
      } catch (e) {
        // Ignore
      }
    }
  }

  public async clearRead(userRole?: string) {
    const readIds = this.getFilteredNotifications(userRole, true).filter(n => n.isRead).map(n => n.id);
    this.notifications = this.notifications.filter(n => !readIds.includes(n.id));
    this.notify();

    if (isSupabaseConfigured() && readIds.length > 0) {
      try {
        await supabase.from('notifications').delete().in('id', readIds);
      } catch (e) {
        // Ignore
      }
    }
  }

  public async deleteNotification(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notify();

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('notifications').delete().eq('id', id);
      } catch (e) {
        // Ignore
      }
    }
  }

  public async snoozeNotification(
    id: string, 
    duration: number | { hours?: number; days?: number; untilDate?: string } = 24
  ) {
    let snoozeUntilIso: string;
    if (typeof duration === 'number') {
      snoozeUntilIso = new Date(Date.now() + duration * 60 * 60 * 1000).toISOString();
    } else if (duration.untilDate) {
      snoozeUntilIso = new Date(duration.untilDate).toISOString();
    } else if (duration.days) {
      snoozeUntilIso = new Date(Date.now() + duration.days * 24 * 60 * 60 * 1000).toISOString();
    } else if (duration.hours) {
      snoozeUntilIso = new Date(Date.now() + duration.hours * 60 * 60 * 1000).toISOString();
    } else {
      snoozeUntilIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }

    const targetNotif = this.notifications.find(n => n.id === id);

    this.notifications = this.notifications.map(n => 
      n.id === id ? { ...n, isRead: true, snoozedUntil: snoozeUntilIso } : n
    );

    // Sync to Supabase notifications table
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('notifications').update({
          is_read: true,
          snoozed_until: snoozeUntilIso
        }).eq('id', id);
      } catch (e) {
        // Non-blocking
      }
    }

    // Sync underlying debt or installment record so it doesn't pop up again
    if (targetNotif?.metadata?.debtId) {
      try {
        const debts = await debtService.getAllDebts();
        const debt = debts.find(d => d.id === targetNotif.metadata?.debtId);
        if (debt) {
          await debtService.updateDebt({ ...debt, snoozedUntil: snoozeUntilIso.split('T')[0] });
        }
      } catch (err) {
        console.warn('Failed to sync snooze to debtService:', err);
      }
    }

    if (targetNotif?.metadata?.installmentId && targetNotif?.metadata?.scheduleId) {
      try {
        const plans = await installmentService.getAllInstallments();
        const plan = plans.find(p => p.id === targetNotif.metadata?.installmentId);
        if (plan) {
          const updatedSchedules = plan.schedules.map(sch => 
            sch.id === targetNotif.metadata?.scheduleId 
              ? { ...sch, snoozedUntil: snoozeUntilIso.split('T')[0] } 
              : sch
          );
          await installmentService.updateInstallmentPlan({ ...plan, schedules: updatedSchedules });
        }
      } catch (err) {
        console.warn('Failed to sync snooze to installmentService:', err);
      }
    }

    this.notify();
  }

  public async unsnoozeNotification(id: string) {
    this.notifications = this.notifications.map(n => 
      n.id === id ? { ...n, snoozedUntil: null, isRead: false } : n
    );
    this.notify();

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('notifications').update({
          is_read: false,
          snoozed_until: null
        }).eq('id', id);
      } catch (e) {
        // Non-blocking
      }
    }
  }

  public handlePaymentRecorded(query: { debtId?: string; installmentId?: string; scheduleId?: string }) {
    let changed = false;
    this.notifications = this.notifications.filter(n => {
      const matchDebt = query.debtId && n.metadata?.debtId === query.debtId;
      const matchInstallment = query.installmentId && n.metadata?.installmentId === query.installmentId;
      const matchSchedule = query.scheduleId && n.metadata?.scheduleId === query.scheduleId;

      // Automatically purge fully settled debt or installment alerts
      if (matchDebt || (matchInstallment && (!query.scheduleId || matchSchedule)) || matchSchedule) {
        changed = true;
        return false;
      }
      return true;
    });

    if (changed) {
      this.notify();
    }
  }

  /**
   * Handle Restock event: if an item is restocked and its quantity exceeds low threshold,
   * automatically dismiss its low stock / out of stock alert!
   */
  public handleStockUpdated(query: { productId: string; newQuantity: number; minThreshold?: number }) {
    const threshold = query.minThreshold !== undefined ? query.minThreshold : 2;
    if (query.newQuantity > threshold) {
      const beforeCount = this.notifications?.length || 0;
      this.notifications = (this.notifications || []).filter(n => {
        if (n.category === 'inventory' && n.metadata?.productId === query.productId) {
          return false;
        }
        return true;
      });
      if ((this.notifications?.length || 0) !== beforeCount) {
        this.notify();
      }
    }
  }

  /**
   * Smart Database Reconciliation:
   * Cross-references all notifications against actual active records in the database.
   * Any notification whose target debt, installment, accessory, or invoice no longer exists,
   * is fully paid, or has been restocked will be automatically pruned.
   */
  public reconcileWithDatabase(activeEntities: {
    activeDebtIds?: Set<string>;
    activeInstallmentIds?: Set<string>;
    activeScheduleIds?: Set<string>;
    activeLowStockProductIds?: Set<string>;
    activeSupplierInvoiceIds?: Set<string>;
  }) {
    const beforeCount = this.notifications?.length || 0;
    this.notifications = (this.notifications || []).filter(n => {
      // 1. Eradicate any ghost or mock notification
      if (isSeedOrGhostNotification(n)) return false;

      // 2. Debts: if metadata.debtId exists, must be in activeDebtIds
      if (n.category === 'debt' && n.metadata?.debtId) {
        if (activeEntities.activeDebtIds && !activeEntities.activeDebtIds.has(n.metadata.debtId)) {
          return false; // Debt has been paid, deleted or resolved!
        }
      }

      // 3. Installments: if metadata.installmentId or scheduleId exists
      if (n.category === 'debt' && (n.metadata?.installmentId || n.metadata?.scheduleId)) {
        if (n.metadata.scheduleId && activeEntities.activeScheduleIds && !activeEntities.activeScheduleIds.has(n.metadata.scheduleId)) {
          return false;
        }
        if (n.metadata.installmentId && activeEntities.activeInstallmentIds && !activeEntities.activeInstallmentIds.has(n.metadata.installmentId)) {
          return false;
        }
      }

      // 4. Inventory: if metadata.productId exists, must be in activeLowStockProductIds
      if (n.category === 'inventory' && n.metadata?.productId) {
        if (activeEntities.activeLowStockProductIds && !activeEntities.activeLowStockProductIds.has(n.metadata.productId)) {
          return false; // Product was restocked or deleted from inventory!
        }
      }

      // 5. Supplier invoices: if metadata.invoiceId exists, must be in activeSupplierInvoiceIds
      if (n.category === 'supplier' && n.metadata?.invoiceId) {
        if (activeEntities.activeSupplierInvoiceIds && !activeEntities.activeSupplierInvoiceIds.has(n.metadata.invoiceId)) {
          return false; // Supplier invoice settled or deleted!
        }
      }

      // 6. Automatically prune paid records
      if (n.isPaid) return false;

      return true;
    });

    this.deduplicateNotifications();

    if ((this.notifications?.length || 0) !== beforeCount) {
      this.notify();
    }
  }

  /**
   * Purges all unverified/ghost notifications from memory, localStorage, and Supabase cloud settings
   */
  public purgeUnverifiedNotifications() {
    this.notifications = this.notifications.filter(n => !isSeedOrGhostNotification(n));
    this.deduplicateNotifications();
    this.notify();
  }

  public resetToDefaults() {
    this.notifications = [];
    this.preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };
    this.notify();
  }

  // ==========================================================================
  // Real-Time Notification Dispatcher & Audio Trigger
  // ==========================================================================
  public dispatchNotification(params: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>): AppNotification {
    const dedupeKey = getNotificationDedupeKey(params);

    // 1. Strict entity deduplication check
    const existingIndex = this.notifications.findIndex(n => {
      if (!n || n.isPaid || n.archived) return false;
      return getNotificationDedupeKey(n) === dedupeKey;
    });

    if (existingIndex !== -1) {
      const existing = this.notifications[existingIndex];
      // If snoozed and snooze has not expired, do not interrupt
      if (this.isNotificationSnoozed(existing)) {
        return existing;
      }

      // Update the existing alert in place so it NEVER creates a duplicate card!
      const updated: AppNotification = {
        ...existing,
        ...params,
        id: existing.id,
        // If it was already unread, preserve its timestamp; if updating, refresh message/stock
        metadata: { ...existing.metadata, ...params.metadata },
      };
      this.notifications[existingIndex] = updated;
      this.deduplicateNotifications();
      this.notify();
      return updated;
    }

    const newNotif: AppNotification = {
      ...params,
      id: generateUUID(),
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // Prepend to top and ensure uniqueness
    this.notifications = [newNotif, ...this.notifications];
    this.deduplicateNotifications();

    // Trigger Audio Sound Effects based on priority
    if (this.preferences.soundEnabled && this.preferences.channels.soundChimes) {
      if (newNotif.priority === 'critical') {
        sound.playCriticalAlarm();
      } else if (newNotif.priority === 'high') {
        sound.playNotificationPing();
      } else {
        sound.playNotificationPing();
      }
    }

    this.notify();
    return newNotif;
  }

  // ==========================================================================
  // Quick Messaging Helpers (WhatsApp & SMS)
  // ==========================================================================
  public generateWhatsAppReminder(metadata: NonNullable<AppNotification['metadata']>): string {
    const phone = (metadata.customerPhone || '').replace(/[^0-9]/g, '');
    const name = metadata.customerName || 'Customer';
    const amount = metadata.amountDue || 0;
    const currency = metadata.currency || 'USD';
    const dueDate = metadata.dueDate || 'today';

    const formattedAmount = currency === 'USD' ? `$${amount}` : `${amount.toLocaleString()} IQD`;
    
    // Multi-lingual polite reminder
    const message = encodeURIComponent(
      `Silaw ${name},\n` +
      `This is a friendly reminder from NALI POS regarding your scheduled payment of ${formattedAmount} due on ${dueDate}.\n` +
      `Please visit the shop or contact us to settle the balance. Thank you!\n` +
      `---\n` +
      `سڵاو بەڕێز ${name}، ئاگادارتان دەکەینەوە لە وادەی پارەدان بە بڕی ${formattedAmount}.\n` +
      `NALI Mobile Phone Shop`
    );

    return `https://wa.me/${phone}?text=${message}`;
  }

  public generateSMSReminder(metadata: NonNullable<AppNotification['metadata']>): string {
    const phone = (metadata.customerPhone || '').replace(/[^0-9+]/g, '');
    const name = metadata.customerName || 'Customer';
    const amount = metadata.amountDue || 0;
    const currency = metadata.currency || 'USD';
    const formattedAmount = currency === 'USD' ? `$${amount}` : `${amount.toLocaleString()} IQD`;

    const body = encodeURIComponent(
      `NALI POS: Dear ${name}, your balance of ${formattedAmount} is due. Please contact shop for settlement.`
    );

    return `sms:${phone}?body=${body}`;
  }
}

export const notificationService = new NotificationService();
