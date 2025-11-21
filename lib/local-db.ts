import Dexie, { Table } from 'dexie';
import type { Product, Sale, SaleItem } from './database-types';

// Extended types for offline storage
export interface PendingSale {
  localId: string; // Unique ID for local storage (UUID)
  sale: Omit<Sale, 'id' | 'sale_number'> & {
    id?: string; // Optional - will be set after sync
    sale_number?: string; // Optional - will be generated on server
  };
  items: Omit<SaleItem, 'id' | 'sale_id'>[];
  syncStatus: 'pending' | 'syncing' | 'failed' | 'synced';
  createdAt: number; // Timestamp when created locally
  syncedAt?: number; // Timestamp when successfully synced
  errorMessage?: string; // Error details if sync failed
  retryCount: number; // Number of sync attempts
}

export interface CachedProduct extends Product {
  cachedAt: number; // Timestamp when cached
}

export interface SyncQueueItem {
  id?: number;
  operation: 'create_sale' | 'update_product';
  data: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  processedAt?: number;
  error?: string;
}

// Define the database schema
class POSDatabase extends Dexie {
  pending_sales!: Table<PendingSale, string>;
  products!: Table<CachedProduct, string>;
  sync_queue!: Table<SyncQueueItem, number>;

  constructor() {
    super('POSDatabase');

    this.version(1).stores({
      pending_sales: 'localId, syncStatus, createdAt',
      products: 'id, name, category, cachedAt',
      sync_queue: '++id, operation, status, createdAt',
    });
  }
}

// Create and export the database instance
export const localDB = new POSDatabase();

// Helper functions for pending sales
export async function savePendingSale(
  sale: Omit<Sale, 'id' | 'sale_number'>,
  items: Omit<SaleItem, 'id' | 'sale_id'>[]
): Promise<string> {
  const localId = crypto.randomUUID();

  const pendingSale: PendingSale = {
    localId,
    sale,
    items,
    syncStatus: 'pending',
    createdAt: Date.now(),
    retryCount: 0,
  };

  await localDB.pending_sales.add(pendingSale);
  return localId;
}

export async function getPendingSales(): Promise<PendingSale[]> {
  return await localDB.pending_sales
    .where('syncStatus')
    .notEqual('synced')
    .toArray();
}

export async function updatePendingSaleStatus(
  localId: string,
  status: PendingSale['syncStatus'],
  options?: {
    errorMessage?: string;
    syncedSaleId?: string;
    syncedSaleNumber?: string;
  }
): Promise<void> {
  const updates: Partial<PendingSale> = {
    syncStatus: status,
  };

  if (status === 'synced') {
    updates.syncedAt = Date.now();
    if (options?.syncedSaleId) {
      updates.sale = {
        ...((await localDB.pending_sales.get(localId))?.sale || {}),
        id: options.syncedSaleId,
        sale_number: options.syncedSaleNumber || '',
      } as any;
    }
  }

  if (status === 'failed' && options?.errorMessage) {
    updates.errorMessage = options.errorMessage;
    const current = await localDB.pending_sales.get(localId);
    if (current) {
      updates.retryCount = (current.retryCount || 0) + 1;
    }
  }

  await localDB.pending_sales.update(localId, updates);
}

export async function deleteSyncedSales(): Promise<void> {
  // Delete sales that have been synced for more than 7 days
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  await localDB.pending_sales
    .where('syncStatus')
    .equals('synced')
    .and(sale => (sale.syncedAt || 0) < sevenDaysAgo)
    .delete();
}

// Helper functions for product caching
export async function cacheProducts(products: Product[]): Promise<void> {
  const cachedProducts: CachedProduct[] = products.map(product => ({
    ...product,
    cachedAt: Date.now(),
  }));

  // Clear old products and add new ones
  await localDB.products.clear();
  await localDB.products.bulkAdd(cachedProducts);
}

export async function getCachedProducts(): Promise<CachedProduct[]> {
  return await localDB.products.toArray();
}

export async function getCachedProduct(id: string): Promise<CachedProduct | undefined> {
  return await localDB.products.get(id);
}

export async function updateCachedProduct(id: string, updates: Partial<Product>): Promise<void> {
  await localDB.products.update(id, {
    ...updates,
    cachedAt: Date.now(),
  });
}

export async function isCacheStale(): Promise<boolean> {
  const products = await localDB.products.toArray();
  if (products.length === 0) return true;

  // Check if any product is older than 1 hour
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  return products.some(product => product.cachedAt < oneHourAgo);
}

// Helper functions for sync queue
export async function addToSyncQueue(
  operation: SyncQueueItem['operation'],
  data: any
): Promise<number> {
  return await localDB.sync_queue.add({
    operation,
    data,
    status: 'pending',
    createdAt: Date.now(),
  });
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return await localDB.sync_queue
    .where('status')
    .anyOf(['pending', 'failed'])
    .toArray();
}

export async function updateSyncQueueItem(
  id: number,
  status: SyncQueueItem['status'],
  error?: string
): Promise<void> {
  await localDB.sync_queue.update(id, {
    status,
    processedAt: Date.now(),
    error,
  });
}

// Database statistics
export async function getLocalDBStats() {
  const pendingSalesCount = await localDB.pending_sales
    .where('syncStatus')
    .notEqual('synced')
    .count();

  const cachedProductsCount = await localDB.products.count();

  const queuedItemsCount = await localDB.sync_queue
    .where('status')
    .anyOf(['pending', 'failed'])
    .count();

  return {
    pendingSales: pendingSalesCount,
    cachedProducts: cachedProductsCount,
    queuedItems: queuedItemsCount,
  };
}

// Clear all local data (for debugging/reset)
export async function clearLocalDatabase(): Promise<void> {
  await localDB.pending_sales.clear();
  await localDB.products.clear();
  await localDB.sync_queue.clear();
}
