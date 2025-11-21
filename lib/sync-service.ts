'use client';

import {
  getPendingSales,
  updatePendingSaleStatus,
  deleteSyncedSales,
  cacheProducts,
  isCacheStale,
  getLocalDBStats,
  type PendingSale,
} from './local-db';
import { supabase } from './supabase';
import { getProducts } from './database';

// Sync statistics interface
export interface SyncStats {
  totalPending: number;
  synced: number;
  failed: number;
  inProgress: boolean;
}

// Track ongoing sync operations
let isSyncing = false;
let syncListeners: Array<(stats: SyncStats) => void> = [];

// Subscribe to sync status changes
export function onSyncStatusChange(callback: (stats: SyncStats) => void) {
  syncListeners.push(callback);

  // Return unsubscribe function
  return () => {
    syncListeners = syncListeners.filter(listener => listener !== callback);
  };
}

// Notify all listeners of sync status change
function notifySyncListeners(stats: SyncStats) {
  syncListeners.forEach(listener => listener(stats));
}

// Main sync function - syncs all pending sales
export async function syncPendingSales(): Promise<SyncStats> {
  if (isSyncing) {
    console.log('Sync already in progress, skipping...');
    return {
      totalPending: 0,
      synced: 0,
      failed: 0,
      inProgress: true,
    };
  }

  isSyncing = true;

  const stats: SyncStats = {
    totalPending: 0,
    synced: 0,
    failed: 0,
    inProgress: true,
  };

  try {
    // Get all pending sales
    const pendingSales = await getPendingSales();
    stats.totalPending = pendingSales.length;

    console.log(`Starting sync of ${pendingSales.length} pending sales...`);
    notifySyncListeners(stats);

    // Sync each sale
    for (const pendingSale of pendingSales) {
      try {
        await syncSingleSale(pendingSale);
        stats.synced++;
        console.log(`Synced sale ${pendingSale.localId}`);
      } catch (error) {
        stats.failed++;
        console.error(`Failed to sync sale ${pendingSale.localId}:`, error);

        // Update the pending sale with error status
        await updatePendingSaleStatus(pendingSale.localId, 'failed', {
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Notify progress
      notifySyncListeners({ ...stats, inProgress: true });
    }

    // Clean up old synced sales
    await deleteSyncedSales();

    console.log(`Sync complete: ${stats.synced} synced, ${stats.failed} failed`);
  } catch (error) {
    console.error('Error during sync process:', error);
  } finally {
    isSyncing = false;
    stats.inProgress = false;
    notifySyncListeners(stats);
  }

  return stats;
}

// Sync a single sale to Supabase
async function syncSingleSale(pendingSale: PendingSale): Promise<void> {
  // Mark as syncing
  await updatePendingSaleStatus(pendingSale.localId, 'syncing');

  // Generate sale number (will be done by server)
  const { data: saleNumber, error: saleNumberError } = await supabase.rpc(
    'generate_sale_number'
  );

  if (saleNumberError) {
    throw new Error(`Failed to generate sale number: ${saleNumberError.message}`);
  }

  // Prepare sale data
  const saleData = {
    ...pendingSale.sale,
    sale_number: saleNumber,
  };

  // Insert sale into Supabase
  const { data: createdSale, error: saleError } = await supabase
    .from('sales')
    .insert(saleData)
    .select()
    .single();

  if (saleError) {
    throw new Error(`Failed to create sale: ${saleError.message}`);
  }

  // Insert sale items
  const saleItems = pendingSale.items.map(item => ({
    ...item,
    sale_id: createdSale.id,
  }));

  const { error: itemsError } = await supabase
    .from('sale_items')
    .insert(saleItems);

  if (itemsError) {
    throw new Error(`Failed to create sale items: ${itemsError.message}`);
  }

  // Update product stock only if sale is completed
  if (pendingSale.sale.status === 'completed') {
    for (const item of pendingSale.items) {
      const { error: stockError } = await supabase.rpc('update_product_stock', {
        product_id: item.product_id,
        quantity_change: -item.quantity,
      });

      if (stockError) {
        throw new Error(`Failed to update stock: ${stockError.message}`);
      }
    }
  }

  // Create debtor record if sale is pending
  if (pendingSale.sale.status === 'pending' && createdSale.total_amount > 0) {
    try {
      await createDebtorFromSale(createdSale.id, pendingSale.sale.user_id);
    } catch (error) {
      console.error('Failed to create debtor record:', error);
      // Don't fail the sale sync if debtor creation fails
    }
  }

  // Mark as synced
  await updatePendingSaleStatus(pendingSale.localId, 'synced', {
    syncedSaleId: createdSale.id,
    syncedSaleNumber: createdSale.sale_number,
  });
}

// Helper function to create debtor from sale (mirrors database.ts logic)
async function createDebtorFromSale(saleId: string, userId: string): Promise<void> {
  // Get the sale with items
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .select(`
      *,
      sale_items (
        *,
        products (name)
      )
    `)
    .eq('id', saleId)
    .single();

  if (saleError) throw saleError;

  if (sale.total_amount <= 0) {
    throw new Error('Cannot create debtor for sale with zero or negative amount');
  }

  // Create debtor record
  const debtorData = {
    customer_name: sale.customer_name,
    customer_phone: sale.customer_phone,
    amount: sale.total_amount,
    status: 'pending' as const,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    sale_id: saleId,
    user_id: userId,
  };

  const { data: debtor, error: debtorError } = await supabase
    .from('debtors')
    .insert(debtorData)
    .select()
    .single();

  if (debtorError) throw debtorError;

  // Create debtor items
  const debtorItems = sale.sale_items.map((item: any) => ({
    debtor_id: debtor.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total_price,
  }));

  const { error: itemsError } = await supabase
    .from('debtor_items')
    .insert(debtorItems);

  if (itemsError) throw itemsError;
}

// Sync products from server to local cache
export async function syncProducts(): Promise<void> {
  try {
    console.log('Syncing products from server...');

    // Fetch all products from server
    const products = await getProducts();

    // Cache them locally
    await cacheProducts(products);

    console.log(`Successfully cached ${products.length} products`);
  } catch (error) {
    console.error('Failed to sync products:', error);
    throw error;
  }
}

// Check if products need syncing and sync if necessary
export async function syncProductsIfNeeded(): Promise<boolean> {
  try {
    const isStale = await isCacheStale();

    if (isStale) {
      console.log('Product cache is stale, syncing...');
      await syncProducts();
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking product cache:', error);
    return false;
  }
}

// Get current sync statistics
export async function getSyncStats(): Promise<{
  pendingSales: number;
  cachedProducts: number;
  isSyncing: boolean;
}> {
  const dbStats = await getLocalDBStats();

  return {
    pendingSales: dbStats.pendingSales,
    cachedProducts: dbStats.cachedProducts,
    isSyncing,
  };
}

// Retry failed syncs
export async function retryFailedSyncs(): Promise<SyncStats> {
  return await syncPendingSales();
}

// Auto-sync when coming back online
export function setupAutoSync(): () => void {
  const handleOnline = async () => {
    console.log('Network connection restored, starting auto-sync...');

    try {
      // Sync products first
      await syncProducts();

      // Then sync pending sales
      await syncPendingSales();
    } catch (error) {
      console.error('Auto-sync failed:', error);
    }
  };

  window.addEventListener('online', handleOnline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
