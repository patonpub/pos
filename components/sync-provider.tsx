'use client';

import { useEffect, useState } from 'react';
import { syncProducts, syncPendingSales, setupAutoSync, getSyncStats } from '@/lib/sync-service';
import { useNetworkMonitor } from '@/hooks/use-online-status';
import { toast } from 'sonner';

interface SyncProviderProps {
  children: React.ReactNode;
}

export function SyncProvider({ children }: SyncProviderProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  // Handle online/offline events
  const isOnline = useNetworkMonitor(
    // On online
    async () => {
      toast.info('Connection restored - syncing data...');
      await handleSync();
    },
    // On offline
    () => {
      toast.warning('You are offline - sales will be saved locally');
    }
  );

  // Initial sync on mount
  useEffect(() => {
    const initializeSync = async () => {
      try {
        // Check if we have cached products
        const stats = await getSyncStats();

        // If online and no cached products, sync them
        if (isOnline && stats.cachedProducts === 0) {
          console.log('No cached products found, syncing...');
          await syncProducts();
        }

        // If online and we have pending sales, sync them
        if (isOnline && stats.pendingSales > 0) {
          console.log(`Found ${stats.pendingSales} pending sales, syncing...`);
          await syncPendingSales();
        }
      } catch (error) {
        console.error('Failed to initialize sync:', error);
      }
    };

    initializeSync();

    // Setup auto-sync on network reconnection
    const cleanup = setupAutoSync();

    return cleanup;
  }, [isOnline]);

  // Periodic sync (every 5 minutes when online)
  useEffect(() => {
    if (!isOnline) return;

    const intervalId = setInterval(async () => {
      try {
        await syncProducts();
        const stats = await getSyncStats();

        if (stats.pendingSales > 0) {
          await syncPendingSales();
        }
      } catch (error) {
        console.error('Periodic sync failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(intervalId);
  }, [isOnline]);

  const handleSync = async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    try {
      // Sync products first
      await syncProducts();

      // Then sync pending sales
      const result = await syncPendingSales();

      if (result.synced > 0) {
        toast.success(`Synced ${result.synced} pending sale(s)`);
      }

      if (result.failed > 0) {
        toast.error(`Failed to sync ${result.failed} sale(s)`);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Failed to sync data');
    } finally {
      setIsSyncing(false);
    }
  };

  return <>{children}</>;
}
