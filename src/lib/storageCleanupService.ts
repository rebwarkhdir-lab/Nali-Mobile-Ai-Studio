import { supabase } from './supabase';
import { addAuditEntry } from '../pages/admin/adminStore';

export interface StorageBucketInfo {
  id: string;
  name: string;
  public: boolean;
  fileCount: number;
  totalBytes: number;
}

export interface MediaAssetItem {
  id: string; // e.g. "accessories/cases/cover-old.webp"
  bucket: string;
  name: string;
  path: string;
  size: number;
  created_at: string;
  updated_at?: string;
  mimetype?: string;
  publicUrl: string;
  isUsed: boolean;
  referencedBy?: string[];
}

export interface StaleLogItem {
  id: string;
  created_at: string;
  action: string;
  module: string;
  target?: string;
  user_name?: string;
  details?: string;
}

export interface StorageScanResult {
  isLiveSupabase: boolean;
  supabaseUrl: string;
  buckets: StorageBucketInfo[];
  totalMediaCount: number;
  totalMediaBytes: number;
  orphanedMediaCount: number;
  orphanedMediaBytes: number;
  usedMediaCount: number;
  usedMediaBytes: number;
  mediaAssets: MediaAssetItem[];
  
  totalAuditLogsCount: number;
  staleLogsCount: number;
  retentionDays: number;
  oldestLogDate: string | null;
  staleLogs: StaleLogItem[];
  
  estimatedQuotaUsedPercent: number;
  scannedAt: string;
}

export interface CleanupMediaResult {
  success: boolean;
  deletedCount: number;
  freedBytes: number;
  failedCount: number;
  errors: string[];
}

export interface CleanupLogsResult {
  success: boolean;
  deletedCount: number;
  errors: string[];
  exportedCsv?: string;
}

// Local mock storage files to allow testing/verification in dev or offline mode
const MOCK_STORAGE_FILES_KEY = 'nali_mock_storage_files_v1';

function getStoredMockFiles(): MediaAssetItem[] {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_FILES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading mock storage files:', e);
  }
  
  const now = Date.now();
  const DAY = 86400000;

  return [
    {
      id: 'accessories/covers/unused-case-sample-98.webp',
      bucket: 'accessories',
      name: 'unused-case-sample-98.webp',
      path: 'covers/unused-case-sample-98.webp',
      size: 342100, // ~334 KB
      created_at: new Date(now - 45 * DAY).toISOString(),
      publicUrl: 'https://placeholder.supabase.co/storage/v1/object/public/accessories/covers/unused-case-sample-98.webp',
      isUsed: false,
      referencedBy: []
    },
    {
      id: 'accessories/covers/temp_scan_barcode_cache_102.png',
      bucket: 'accessories',
      name: 'temp_scan_barcode_cache_102.png',
      path: 'covers/temp_scan_barcode_cache_102.png',
      size: 512000, // 500 KB
      created_at: new Date(now - 70 * DAY).toISOString(),
      publicUrl: 'https://placeholder.supabase.co/storage/v1/object/public/accessories/covers/temp_scan_barcode_cache_102.png',
      isUsed: false,
      referencedBy: []
    },
    {
      id: 'accessories/chargers/deleted_product_charger_old.jpg',
      bucket: 'accessories',
      name: 'deleted_product_charger_old.jpg',
      path: 'chargers/deleted_product_charger_old.jpg',
      size: 780400, // ~762 KB
      created_at: new Date(now - 92 * DAY).toISOString(),
      publicUrl: 'https://placeholder.supabase.co/storage/v1/object/public/accessories/chargers/deleted_product_charger_old.jpg',
      isUsed: false,
      referencedBy: []
    },
    {
      id: 'store/draft_receipt_banner_2025.png',
      bucket: 'store',
      name: 'draft_receipt_banner_2025.png',
      path: 'draft_receipt_banner_2025.png',
      size: 1420000, // 1.35 MB
      created_at: new Date(now - 120 * DAY).toISOString(),
      publicUrl: 'https://placeholder.supabase.co/storage/v1/object/public/store/draft_receipt_banner_2025.png',
      isUsed: false,
      referencedBy: []
    },
    {
      id: 'avatars/temp_guest_cashier_avatar_3.webp',
      bucket: 'avatars',
      name: 'temp_guest_cashier_avatar_3.webp',
      path: 'temp_guest_cashier_avatar_3.webp',
      size: 198000, // ~193 KB
      created_at: new Date(now - 60 * DAY).toISOString(),
      publicUrl: 'https://placeholder.supabase.co/storage/v1/object/public/avatars/temp_guest_cashier_avatar_3.webp',
      isUsed: false,
      referencedBy: []
    },
    {
      id: 'store/current_store_logo.png',
      bucket: 'store',
      name: 'current_store_logo.png',
      path: 'current_store_logo.png',
      size: 450000, // 439 KB
      created_at: new Date(now - 10 * DAY).toISOString(),
      publicUrl: 'https://placeholder.supabase.co/storage/v1/object/public/store/current_store_logo.png',
      isUsed: true,
      referencedBy: ['Active Store Brand Logo']
    }
  ];
}

function saveStoredMockFiles(files: MediaAssetItem[]) {
  try {
    localStorage.setItem(MOCK_STORAGE_FILES_KEY, JSON.stringify(files));
  } catch (e) {
    console.error('Error saving mock storage files:', e);
  }
}

class StorageCleanupService {
  /**
   * Helper to format raw bytes into human-readable B, KB, MB, GB
   */
  public formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Collect all media references across Supabase database tables and local states
   */
  private async collectActiveReferences(): Promise<Map<string, string[]>> {
    const refMap = new Map<string, string[]>(); // key: normalized filename/path -> array of descriptions

    const addRef = (uriOrPath: string | null | undefined, description: string) => {
      if (!uriOrPath || typeof uriOrPath !== 'string') return;
      const clean = uriOrPath.trim();
      if (!clean) return;

      // Extract filename
      try {
        const parts = clean.split('/');
        const filename = parts.length > 0 ? parts[parts.length - 1].split('?')[0].toLowerCase() : '';
        if (filename) {
          const list = refMap.get(filename) || [];
          list.push(description);
          refMap.set(filename, list);
        }

        // Also track relative path if storage url format
        const storageMatch = clean.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
        if (storageMatch && storageMatch[1]) {
          const relPath = decodeURIComponent(storageMatch[1]).toLowerCase();
          const list = refMap.get(relPath) || [];
          list.push(description);
          refMap.set(relPath, list);
        }
      } catch (e) {
        // Ignore parsing error
      }
    };

    // 1. Query Supabase accessories
    try {
      const { data: accData } = await supabase.from('nali_accessories').select('id, name, image');
      if (accData) {
        accData.forEach(item => {
          if (item.image) {
            addRef(item.image, `Accessory: ${item.name} (#${item.id?.substring(0, 6)})`);
          }
        });
      }
    } catch (e) {
      // Local or table unavailable
    }

    // 2. Query LocalStorage accessories fallback
    try {
      const localAcc = localStorage.getItem('nali_accessories');
      if (localAcc) {
        const items = JSON.parse(localAcc);
        if (Array.isArray(items)) {
          items.forEach(item => {
            if (item.image) {
              addRef(item.image, `Accessory (Local): ${item.name || item.id}`);
            }
          });
        }
      }
    } catch {}

    // 3. Query Profiles for avatar_url
    try {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url');
      if (profiles) {
        profiles.forEach(p => {
          if (p.avatar_url) {
            addRef(p.avatar_url, `Staff Avatar: ${p.full_name || p.id}`);
          }
        });
      }
    } catch {}

    // 4. Query Store logo in settings
    try {
      const logo = localStorage.getItem('nali_store_logo');
      if (logo) addRef(logo, 'Active Store Logo Badge');
      const design = localStorage.getItem('nali_design_settings');
      if (design) {
        const parsed = JSON.parse(design);
        if (parsed.storeLogo) addRef(parsed.storeLogo, 'Theme Settings Logo');
      }
    } catch {}

    return refMap;
  }

  /**
   * Scan Supabase Storage buckets and audit logs
   */
  public async scanStorage(retentionDays: number = 60): Promise<StorageScanResult> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
    const isLive = !supabaseUrl.includes('placeholder.supabase.co');

    const activeRefs = await this.collectActiveReferences();
    const mediaAssets: MediaAssetItem[] = [];
    const bucketInfoList: StorageBucketInfo[] = [];

    const defaultBuckets = ['accessories', 'products', 'avatars', 'store', 'media', 'receipts'];

    let foundRemoteFiles = false;

    if (isLive) {
      try {
        // Attempt to list buckets
        let bucketsToScan = defaultBuckets;
        const { data: remoteBuckets, error: bucketErr } = await supabase.storage.listBuckets();
        if (!bucketErr && remoteBuckets && remoteBuckets.length > 0) {
          bucketsToScan = remoteBuckets.map(b => b.name);
        }

        for (const bucketName of bucketsToScan) {
          const { data: files, error: fileErr } = await supabase.storage
            .from(bucketName)
            .list('', { limit: 500, sortBy: { column: 'name', order: 'asc' } });

          if (!fileErr && files && files.length > 0) {
            foundRemoteFiles = true;
            let bucketBytes = 0;
            let fileCount = 0;

            for (const file of files) {
              // Skip folder markers
              if (file.name === '.emptyFolderPlaceholder' || !file.metadata) continue;

              const size = file.metadata.size || 0;
              bucketBytes += size;
              fileCount += 1;

              const publicUrl = supabase.storage.from(bucketName).getPublicUrl(file.name).data.publicUrl;
              const filenameLower = file.name.toLowerCase();
              const pathLower = `${bucketName}/${filenameLower}`;

              const matchedRefs = activeRefs.get(filenameLower) || activeRefs.get(pathLower) || [];
              const isUsed = (matchedRefs?.length || 0) > 0;

              mediaAssets.push({
                id: `${bucketName}/${file.name}`,
                bucket: bucketName,
                name: file.name,
                path: file.name,
                size: size,
                created_at: file.created_at || new Date().toISOString(),
                updated_at: file.updated_at,
                mimetype: file.metadata.mimetype,
                publicUrl: publicUrl,
                isUsed: isUsed,
                referencedBy: matchedRefs
              });
            }

            bucketInfoList.push({
              id: bucketName,
              name: bucketName,
              public: true,
              fileCount: fileCount,
              totalBytes: bucketBytes
            });
          }
        }
      } catch (err) {
        console.warn('Storage bucket scanning encountered an issue, falling back to cached list', err);
      }
    }

    // If no remote files were found or in placeholder/offline mode, load local simulated assets
    if (!foundRemoteFiles) {
      const storedMocks = getStoredMockFiles();
      
      // Update isUsed status based on current active references
      const refreshedMocks = storedMocks.map(item => {
        const fn = item.name.toLowerCase();
        const p = item.id.toLowerCase();
        const refs = activeRefs.get(fn) || activeRefs.get(p) || item.referencedBy || [];
        return {
          ...item,
          isUsed: (refs?.length || 0) > 0,
          referencedBy: refs
        };
      });

      mediaAssets.push(...refreshedMocks);

      // Aggregate buckets from refreshed mocks
      const bucketMap: Record<string, { count: number; bytes: number }> = {};
      refreshedMocks.forEach(m => {
        if (!bucketMap[m.bucket]) {
          bucketMap[m.bucket] = { count: 0, bytes: 0 };
        }
        bucketMap[m.bucket].count += 1;
        bucketMap[m.bucket].bytes += m.size;
      });

      Object.entries(bucketMap).forEach(([bName, stat]) => {
        bucketInfoList.push({
          id: bName,
          name: bName,
          public: true,
          fileCount: stat.count,
          totalBytes: stat.bytes
        });
      });
    }

    // Calculate totals
    const totalMediaCount = mediaAssets?.length || 0;
    const totalMediaBytes = (mediaAssets || []).reduce((sum, item) => sum + (item.size || 0), 0);

    const orphanedAssets = (mediaAssets || []).filter(a => !a.isUsed);
    const orphanedMediaCount = orphanedAssets?.length || 0;
    const orphanedMediaBytes = orphanedAssets.reduce((sum, item) => sum + (item.size || 0), 0);

    const usedAssets = (mediaAssets || []).filter(a => a.isUsed);
    const usedMediaCount = usedAssets?.length || 0;
    const usedMediaBytes = usedAssets.reduce((sum, item) => sum + (item.size || 0), 0);

    // 2. Scan Stale Audit Logs
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffIso = cutoffDate.toISOString();

    let totalAuditLogsCount = 0;
    let staleLogs: StaleLogItem[] = [];
    let oldestLogDate: string | null = null;

    if (isLive) {
      try {
        const { data: logsData, error: logsErr } = await supabase
          .from('audit_logs')
          .select('id, created_at, action, module, target, user:profiles(full_name)')
          .order('created_at', { ascending: true })
          .limit(1000);

        if (!logsErr && logsData) {
          totalAuditLogsCount = logsData?.length || 0;
          if ((logsData?.length || 0) > 0) {
            oldestLogDate = logsData[0].created_at;
          }
          staleLogs = logsData
            .filter(l => new Date(l.created_at) < cutoffDate)
            .map(l => ({
              id: l.id,
              created_at: l.created_at,
              action: l.action,
              module: l.module,
              target: l.target,
              user_name: (l.user as any)?.full_name || 'System'
            }));
        }
      } catch (err) {
        console.warn('Could not query remote audit_logs, using local log cache', err);
      }
    }

    // Fallback to local stored audit logs if remote was empty or unavailable
    if (totalAuditLogsCount === 0) {
      try {
        const localLogs = localStorage.getItem('nali_admin_audit_logs');
        if (localLogs) {
          const parsed = JSON.parse(localLogs);
          if (Array.isArray(parsed) && (parsed?.length || 0) > 0) {
            totalAuditLogsCount = parsed?.length || 0;
            const sorted = [...parsed].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            oldestLogDate = sorted[0].created_at;

            staleLogs = sorted
              .filter(l => new Date(l.created_at) < cutoffDate)
              .map(l => ({
                id: l.id,
                created_at: l.created_at,
                action: l.action || 'EVENT',
                module: l.module || 'System',
                target: l.target,
                user_name: l.user || 'Admin'
              }));
          }
        }
      } catch {}
    }

    // Estimated quota usage: 500 MB Free Tier PostgreSQL DB + 1 GB Storage
    const freeTierLimitBytes = 1024 * 1024 * 1024; // 1 GB
    const estimatedQuotaUsedPercent = Math.min(100, Math.max(1, Math.round((totalMediaBytes / freeTierLimitBytes) * 100)));

    return {
      isLiveSupabase: isLive,
      supabaseUrl,
      buckets: bucketInfoList,
      totalMediaCount,
      totalMediaBytes,
      orphanedMediaCount,
      orphanedMediaBytes,
      usedMediaCount,
      usedMediaBytes,
      mediaAssets,
      totalAuditLogsCount,
      staleLogsCount: staleLogs?.length || 0,
      retentionDays,
      oldestLogDate,
      staleLogs,
      estimatedQuotaUsedPercent,
      scannedAt: new Date().toISOString()
    };
  }

  /**
   * Safely delete unreferenced media assets from Supabase Storage
   * Ensures data integrity: Checks each asset is not actively used before deleting!
   */
  public async deleteMediaAssets(assetsToDelete: MediaAssetItem[]): Promise<CleanupMediaResult> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
    const isLive = !supabaseUrl.includes('placeholder.supabase.co');

    let deletedCount = 0;
    let freedBytes = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Critical Integrity Guard: Double-check that no asset is currently referenced!
    const activeRefs = await this.collectActiveReferences();

    for (const asset of assetsToDelete) {
      const fn = asset.name.toLowerCase();
      const p = asset.id.toLowerCase();
      const activeFound = activeRefs.get(fn) || activeRefs.get(p);

      if (activeFound && activeFound.length > 0) {
        failedCount += 1;
        errors.push(`Integrity Guard: Skipped "${asset.name}" because it was recently linked to: ${activeFound[0]}`);
        continue;
      }

      if (isLive) {
        try {
          const { error } = await supabase.storage.from(asset.bucket).remove([asset.path]);
          if (error) {
            failedCount += 1;
            errors.push(`Failed to delete ${asset.name}: ${error.message}`);
          } else {
            deletedCount += 1;
            freedBytes += asset.size;
          }
        } catch (e: any) {
          failedCount += 1;
          errors.push(`Exception deleting ${asset.name}: ${e?.message || e}`);
        }
      } else {
        // Mock deletion from local mock storage
        deletedCount += 1;
        freedBytes += asset.size;
      }
    }

    // Also update mock storage list to reflect deletions
    const storedMocks = getStoredMockFiles();
    const deletedIds = new Set(assetsToDelete.map(a => a.id));
    const remainingMocks = storedMocks.filter(m => !deletedIds.has(m.id));
    saveStoredMockFiles(remainingMocks);

    // Record audit trail entry for database transparency
    if (deletedCount > 0) {
      addAuditEntry({
        action: 'STORAGE_MEDIA_CLEANUP',
        module: 'Storage',
        target: `${deletedCount} orphaned files`,
        details: {
          summary: `Deleted ${deletedCount} unused media assets. Reclaimed ${this.formatBytes(freedBytes)} of cloud storage space.`,
          freedBytes,
          deletedCount
        },
        severity: 'info'
      });
    }

    return {
      success: deletedCount > 0 && failedCount === 0,
      deletedCount,
      freedBytes,
      failedCount,
      errors
    };
  }

  /**
   * Safely purge stale audit and sync logs older than retention days
   */
  public async deleteStaleLogs(
    retentionDays: number,
    exportBeforeDelete: boolean = true
  ): Promise<CleanupLogsResult> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
    const isLive = !supabaseUrl.includes('placeholder.supabase.co');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffIso = cutoffDate.toISOString();

    const errors: string[] = [];
    let deletedCount = 0;
    let exportedCsv: string | undefined;

    // First scan logs to be deleted
    const scan = await this.scanStorage(retentionDays);
    const logsToPurge = scan.staleLogs;

    if (exportBeforeDelete && (logsToPurge?.length || 0) > 0) {
      exportedCsv = this.exportLogsAsCsv(logsToPurge);
    }

    if ((logsToPurge?.length || 0) === 0) {
      return { success: true, deletedCount: 0, errors: [] };
    }

    if (isLive) {
      try {
        const { error } = await supabase
          .from('audit_logs')
          .delete()
          .lt('created_at', cutoffIso);

        if (error) {
          errors.push(`Supabase error deleting audit logs: ${error.message}`);
        } else {
          deletedCount = logsToPurge?.length || 0;
        }
      } catch (err: any) {
        errors.push(`Failed to purge remote audit logs: ${err?.message || err}`);
      }
    }

    // Also purge from local audit logs cache
    try {
      const localLogs = localStorage.getItem('nali_admin_audit_logs');
      if (localLogs) {
        const parsed = JSON.parse(localLogs);
        if (Array.isArray(parsed)) {
          const retained = parsed.filter(l => new Date(l.created_at) >= cutoffDate);
          localStorage.setItem('nali_admin_audit_logs', JSON.stringify(retained));
          if (!isLive) {
            deletedCount = (parsed?.length || 0) - (retained?.length || 0);
          }
        }
      }
    } catch {}

    // Record audit entry documenting the purge
    if (deletedCount > 0) {
      addAuditEntry({
        action: 'AUDIT_LOGS_PURGE',
        module: 'Administration',
        target: `${deletedCount} logs`,
        details: {
          summary: `Purged ${deletedCount} audit logs older than ${retentionDays} days (Retention policy: ${retentionDays}d).`,
          retentionDays,
          deletedCount,
          exportedBackup: exportBeforeDelete
        },
        severity: 'warning'
      });
    }

    return {
      success: (errors?.length || 0) === 0,
      deletedCount,
      errors,
      exportedCsv
    };
  }

  /**
   * Export logs as downloadable CSV text
   */
  public exportLogsAsCsv(logs: StaleLogItem[]): string {
    const headers = ['Log ID', 'Timestamp', 'Module', 'Action', 'Target', 'User', 'Details'];
    const rows = logs.map(l => [
      `"${l.id || ''}"`,
      `"${l.created_at || ''}"`,
      `"${(l.module || '').replace(/"/g, '""')}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.target || '').replace(/"/g, '""')}"`,
      `"${(l.user_name || '').replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Helper to trigger browser file download for backup CSV/JSON
   */
  public downloadFile(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const storageCleanupService = new StorageCleanupService();
