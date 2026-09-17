import { idb } from './idbService';
import { supabase } from './supabase';

export interface RecycleBinItem {
  id: string; // The original ID of the item
  type: 'mobile' | 'accessory' | 'debt' | 'installment' | 'supplier' | 'expense' | 'purchase';
  name: string; // Descriptive name (e.g. "iPhone 13 Pro" or "Customer John")
  data: any; // The original JSON payload
  deletedAt: string;
}

class RecycleBinService {
  public async getDeletedItems(): Promise<RecycleBinItem[]> {
    const items = await idb.getAll<RecycleBinItem>('recycle_bin');
    return items.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  }

  public async moveToBin(item: Omit<RecycleBinItem, 'deletedAt'>): Promise<void> {
    try {
      const binnedItem: RecycleBinItem = {
        ...item,
        deletedAt: new Date().toISOString()
      };
      await idb.put('recycle_bin', binnedItem);
    } catch (err) {
      console.error('Failed to move item to recycle bin:', err);
    }
  }

  public async restoreItem(id: string): Promise<boolean> {
    try {
      const item = await idb.get<RecycleBinItem>('recycle_bin', id);
      if (!item) return false;

      // Map type to Supabase table & IDB store
      let table = '';
      switch (item.type) {
        case 'mobile': 
          table = 'nali_mobiles'; 
          try { await idb.put('mobiles', item.data); } catch (e) {}
          break;
        case 'accessory': 
          table = 'nali_accessories'; 
          try { await idb.put('accessories', item.data); } catch (e) {}
          break;
        case 'debt': 
          table = 'nali_debts'; 
          try { await idb.put('debts', item.data); } catch (e) {}
          break;
        case 'installment': 
          table = 'nali_installments'; 
          try { await idb.put('installments', item.data); } catch (e) {}
          break;
        case 'supplier': 
          table = 'suppliers'; 
          try { await idb.put('suppliers', item.data); } catch (e) {}
          break;
        case 'expense': 
          table = 'expenses'; 
          break;
        case 'purchase': 
          table = 'purchases'; 
          break;
        default: 
          throw new Error(`Unknown type ${item.type}`);
      }

      if (table) {
        try {
          const { error } = await supabase.from(table).insert([item.data]);
          if (error) {
            if (error.code === '23505') { // unique violation
               await supabase.from(table).update(item.data).eq('id', id);
            } else {
              console.warn('Supabase restore note:', error);
            }
          }
        } catch (err) {
          console.warn('Supabase restore sync failed, local restore succeeded:', err);
        }
      }

      await idb.delete('recycle_bin', id);
      try {
        window.dispatchEvent(new CustomEvent('recycle-bin-restored', { detail: { type: item.type, id: item.id } }));
      } catch (e) {}
      return true;
    } catch (err) {
      console.error('Failed to restore item:', err);
      return false;
    }
  }

  public async permanentlyDelete(id: string): Promise<void> {
    try {
      const item = await idb.get<RecycleBinItem>('recycle_bin', id);
      if (item) {
        let table = '';
        switch (item.type) {
          case 'mobile': table = 'nali_mobiles'; break;
          case 'accessory': table = 'nali_accessories'; break;
          case 'debt': table = 'nali_debts'; break;
          case 'installment': table = 'nali_installments'; break;
          case 'supplier': table = 'suppliers'; break;
          case 'expense': table = 'expenses'; break;
          case 'purchase': table = 'purchases'; break;
        }
        if (table) {
          await supabase.from(table).delete().eq('id', id);
        }
      }
      await idb.delete('recycle_bin', id);
    } catch (err) {
      console.error('Failed to permanently delete item:', err);
    }
  }

  public async clearBin(): Promise<void> {
    try {
      const items = await this.getDeletedItems();
      for (const item of items) {
        let table = '';
        switch (item.type) {
          case 'mobile': table = 'nali_mobiles'; break;
          case 'accessory': table = 'nali_accessories'; break;
          case 'debt': table = 'nali_debts'; break;
          case 'installment': table = 'nali_installments'; break;
          case 'supplier': table = 'suppliers'; break;
          case 'expense': table = 'expenses'; break;
          case 'purchase': table = 'purchases'; break;
        }
        if (table) {
          await supabase.from(table).delete().eq('id', item.id);
        }
        await idb.delete('recycle_bin', item.id);
      }
    } catch (err) {
      console.error('Failed to clear recycle bin:', err);
    }
  }
}

export const recycleBinService = new RecycleBinService();
