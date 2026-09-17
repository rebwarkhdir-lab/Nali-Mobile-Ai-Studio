/**
 * Local IndexedDB Storage Engine for Nali Mobile POS
 * Provides ultra-fast, structured client-side storage for offline resilience
 * with automatic fallback to localStorage.
 */

export interface DBSchema {
  mobiles: any;
  accessories: any;
  debts: any;
  installments: any;
  suppliers: any;
  pos_sales: any;
  sync_queue: SyncQueueItem;
  sync_logs: SyncLogItem;
  app_settings: { key: string; value: any; updatedAt: string };
  recycle_bin: any;
}

export type SyncEntityType = 'pos_sale' | 'mobile_update' | 'accessory_update' | 'debt_create' | 'debt_payment' | 'installment_create' | 'installment_payment' | 'supplier_update';

export interface SyncQueueItem {
  id: string;
  entityType: SyncEntityType;
  action: 'insert' | 'update' | 'delete' | 'pos_sale_transaction';
  payload: any;
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  retryCount: number;
  lastError?: string;
  idempotencyKey: string;
  summary: string;
}

export interface SyncLogItem {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  title: string;
  details?: string;
}

const DB_NAME = 'nali_pos_offline_db_v2';
const DB_VERSION = 2;

class IndexedDBStorage {
  private db: IDBDatabase | null = null;
  private isSupported: boolean;
  private initPromise: Promise<boolean> | null = null;

  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'indexedDB' in window;
  }

  public async init(): Promise<boolean> {
    if (!this.isSupported) return false;
    if (this.db) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<boolean>((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Mobiles Store
          if (!db.objectStoreNames.contains('mobiles')) {
            const mobileStore = db.createObjectStore('mobiles', { keyPath: 'id' });
            mobileStore.createIndex('imei', 'imei', { unique: false });
            mobileStore.createIndex('status', 'status', { unique: false });
            mobileStore.createIndex('brand', 'brand', { unique: false });
          }

          // Accessories Store
          if (!db.objectStoreNames.contains('accessories')) {
            const accStore = db.createObjectStore('accessories', { keyPath: 'id' });
            accStore.createIndex('barcode', 'barcode', { unique: false });
            accStore.createIndex('category', 'category', { unique: false });
            accStore.createIndex('status', 'status', { unique: false });
          }

          // Debts Store
          if (!db.objectStoreNames.contains('debts')) {
            const debtStore = db.createObjectStore('debts', { keyPath: 'id' });
            debtStore.createIndex('status', 'status', { unique: false });
            debtStore.createIndex('customerName', 'customerName', { unique: false });
          }

          // Installments Store
          if (!db.objectStoreNames.contains('installments')) {
            const insStore = db.createObjectStore('installments', { keyPath: 'id' });
            insStore.createIndex('status', 'status', { unique: false });
            insStore.createIndex('contractNumber', 'contractNumber', { unique: false });
          }

          // Suppliers Store
          if (!db.objectStoreNames.contains('suppliers')) {
            db.createObjectStore('suppliers', { keyPath: 'id' });
          }

          // POS Sales History Store
          if (!db.objectStoreNames.contains('pos_sales')) {
            const salesStore = db.createObjectStore('pos_sales', { keyPath: 'invoiceNo' });
            salesStore.createIndex('date', 'date', { unique: false });
            salesStore.createIndex('sellType', 'sellType', { unique: false });
          }

          // Sync Queue Store (Critical for offline mutations)
          if (!db.objectStoreNames.contains('sync_queue')) {
            const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
            queueStore.createIndex('status', 'status', { unique: false });
            queueStore.createIndex('createdAt', 'createdAt', { unique: false });
          }

          // Sync Activity Logs
          if (!db.objectStoreNames.contains('sync_logs')) {
            const logStore = db.createObjectStore('sync_logs', { keyPath: 'id' });
            logStore.createIndex('timestamp', 'timestamp', { unique: false });
          }

          // App Settings / Key-Value
          if (!db.objectStoreNames.contains('app_settings')) {
            db.createObjectStore('app_settings', { keyPath: 'key' });
          }

          // Recycle Bin Store
          if (!db.objectStoreNames.contains('recycle_bin')) {
            const recycleBinStore = db.createObjectStore('recycle_bin', { keyPath: 'id' });
            recycleBinStore.createIndex('originalId', 'originalId', { unique: false });
            recycleBinStore.createIndex('type', 'type', { unique: false });
            recycleBinStore.createIndex('deletedAt', 'deletedAt', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          resolve(true);
        };

        request.onerror = (event) => {
          console.warn('IndexedDB open error:', event);
          resolve(false);
        };

        request.onblocked = () => {
          console.warn('IndexedDB database upgrade blocked by other open tabs');
          resolve(false);
        };
      } catch (err) {
        console.warn('IndexedDB init exception:', err);
        resolve(false);
      }
    });

    return this.initPromise;
  }

  // Get all items from an object store
  public async getAll<T>(storeName: keyof DBSchema): Promise<T[]> {
    const ready = await this.init();
    if (!ready || !this.db) {
      return this.fallbackGetAll<T>(storeName);
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();

        req.onsuccess = () => {
          resolve(req.result || []);
        };

        req.onerror = () => {
          resolve(this.fallbackGetAll<T>(storeName));
        };
      } catch (err) {
        console.warn(`IndexedDB getAll on ${storeName} error:`, err);
        resolve(this.fallbackGetAll<T>(storeName));
      }
    });
  }

  // Get single item by key
  public async get<T>(storeName: keyof DBSchema, key: IDBValidKey): Promise<T | null> {
    const ready = await this.init();
    if (!ready || !this.db) {
      return this.fallbackGet<T>(storeName, key);
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);

        req.onsuccess = () => {
          resolve(req.result || null);
        };

        req.onerror = () => {
          resolve(this.fallbackGet<T>(storeName, key));
        };
      } catch (err) {
        resolve(this.fallbackGet<T>(storeName, key));
      }
    });
  }

  // Put single item
  public async put<T>(storeName: keyof DBSchema, value: T): Promise<boolean> {
    // Also save to localStorage fallback for critical keys
    this.fallbackPut(storeName, value);

    const ready = await this.init();
    if (!ready || !this.db) return true;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(value);

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (err) {
        console.warn(`IndexedDB put on ${storeName} error:`, err);
        resolve(false);
      }
    });
  }

  // Bulk Put items (atomic transaction for full table cache overwrite or batch updates)
  public async bulkPut<T>(storeName: keyof DBSchema, items: T[]): Promise<boolean> {
    this.fallbackBulkPut(storeName, items);

    const ready = await this.init();
    if (!ready || !this.db) return true;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);

        for (const item of items) {
          store.put(item);
        }

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (err) {
        console.warn(`IndexedDB bulkPut on ${storeName} error:`, err);
        resolve(false);
      }
    });
  }

  // Delete single item
  public async delete(storeName: keyof DBSchema, key: IDBValidKey): Promise<boolean> {
    this.fallbackDelete(storeName, key);

    const ready = await this.init();
    if (!ready || !this.db) return true;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(key);

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (err) {
        resolve(false);
      }
    });
  }

  // Clear store
  
  // Safely close the database connection
  public close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // Completely erase the IndexedDB database
  public async factoryReset(): Promise<void> {
    this.close();
    
    // Clear fallback storage just in case
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith('nali_idb_fallback_')) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {}

    return new Promise((resolve, reject) => {
      try {
        const req = indexedDB.deleteDatabase(DB_NAME);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(new Error('Failed to delete database'));
        req.onblocked = () => {
          console.warn('Database deletion blocked. Closing open connections and retrying...');
          resolve(); // Will usually resolve upon page reload anyway, but we log it.
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  public async clear(storeName: keyof DBSchema): Promise<boolean> {
    try {
      localStorage.removeItem(`nali_idb_fallback_${storeName}`);
    } catch (e) {}

    const ready = await this.init();
    if (!ready || !this.db) return true;

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();

        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch (err) {
        resolve(false);
      }
    });
  }

  // Count items in store
  public async count(storeName: keyof DBSchema): Promise<number> {
    const ready = await this.init();
    if (!ready || !this.db) {
      const items = this.fallbackGetAll(storeName);
      return items?.length || 0;
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.count();

        req.onsuccess = () => resolve(req.result || 0);
        req.onerror = () => resolve(0);
      } catch (err) {
        resolve(0);
      }
    });
  }

  // Fallback mechanisms using localStorage
  private getFallbackKey(storeName: string): string {
    return `nali_idb_fallback_${storeName}`;
  }

  private fallbackGetAll<T>(storeName: string): T[] {
    try {
      const data = localStorage.getItem(this.getFallbackKey(storeName));
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  private fallbackGet<T>(storeName: string, key: any): T | null {
    const all = this.fallbackGetAll<any>(storeName);
    return all.find((item: any) => item.id === key || item.invoiceNo === key || item.key === key) || null;
  }

  private fallbackPut(storeName: string, value: any): void {
    try {
      const all = this.fallbackGetAll<any>(storeName);
      const keyProp = storeName === 'pos_sales' ? 'invoiceNo' : (storeName === 'app_settings' ? 'key' : 'id');
      const valKey = value[keyProp];

      const idx = all.findIndex((item: any) => item[keyProp] === valKey);
      if (idx >= 0) {
        all[idx] = value;
      } else {
        all.push(value);
      }
      localStorage.setItem(this.getFallbackKey(storeName), JSON.stringify(all));
    } catch (e) {}
  }

  private fallbackBulkPut(storeName: string, items: any[]): void {
    try {
      localStorage.setItem(this.getFallbackKey(storeName), JSON.stringify(items));
    } catch (e) {}
  }

  private fallbackDelete(storeName: string, key: any): void {
    try {
      const all = this.fallbackGetAll<any>(storeName);
      const keyProp = storeName === 'pos_sales' ? 'invoiceNo' : (storeName === 'app_settings' ? 'key' : 'id');
      const filtered = all.filter((item: any) => item[keyProp] !== key);
      localStorage.setItem(this.getFallbackKey(storeName), JSON.stringify(filtered));
    } catch (e) {}
  }
}

export const idb = new IndexedDBStorage();
