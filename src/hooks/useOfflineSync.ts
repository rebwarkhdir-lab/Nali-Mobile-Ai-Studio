import { useState, useEffect } from 'react';
import { offlineSyncService } from '../lib/offlineSyncService';
import { SyncQueueItem, SyncLogItem } from '../lib/idbService';

export function useOfflineSync() {
  const [status, setStatus] = useState(() => offlineSyncService.getStatus());
  const [pendingItems, setPendingItems] = useState<SyncQueueItem[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLogItem[]>([]);

  useEffect(() => {
    const unsubscribe = offlineSyncService.subscribe((newStatus) => {
      setStatus(newStatus);
      offlineSyncService.getPendingItems().then(setPendingItems);
      offlineSyncService.getSyncLogs().then(setSyncLogs);
    });

    // Initial load of queue and logs
    offlineSyncService.getPendingItems().then(setPendingItems);
    offlineSyncService.getSyncLogs().then(setSyncLogs);

    return () => unsubscribe();
  }, []);

  const triggerSync = async () => {
    return await offlineSyncService.syncAll();
  };

  const setSimulateOffline = async (simulate: boolean) => {
    await offlineSyncService.setSimulateOffline(simulate);
  };

  const retryItem = async (id: string) => {
    await offlineSyncService.retryItem(id);
    const updated = await offlineSyncService.getPendingItems();
    setPendingItems(updated);
  };

  const deleteQueueItem = async (id: string) => {
    await offlineSyncService.deleteQueueItem(id);
    const updated = await offlineSyncService.getPendingItems();
    setPendingItems(updated);
  };

  const clearSyncLogs = async () => {
    await offlineSyncService.clearSyncLogs();
    setSyncLogs([]);
  };

  const refreshData = async () => {
    const [items, logs] = await Promise.all([
      offlineSyncService.getPendingItems(),
      offlineSyncService.getSyncLogs()
    ]);
    setPendingItems(items);
    setSyncLogs(logs);
  };

  return {
    ...status,
    pendingItems,
    syncLogs,
    triggerSync,
    setSimulateOffline,
    retryItem,
    deleteQueueItem,
    clearSyncLogs,
    refreshData
  };
}
