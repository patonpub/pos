'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { getSyncStats, syncPendingSales, syncProducts } from '@/lib/sync-service';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function SyncStatus() {
  const { isOnline } = useOnlineStatus();
  const [stats, setStats] = useState({
    pendingSales: 0,
    cachedProducts: 0,
    isSyncing: false,
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Load stats on mount and when online status changes
  useEffect(() => {
    loadStats();

    // Refresh stats every 10 seconds
    const interval = setInterval(loadStats, 10000);

    return () => clearInterval(interval);
  }, [isOnline]);

  const loadStats = async () => {
    try {
      const currentStats = await getSyncStats();
      setStats(currentStats);
    } catch (error) {
      console.error('Failed to load sync stats:', error);
    }
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }

    if (isSyncing) {
      return;
    }

    setIsSyncing(true);
    try {
      // Sync products
      await syncProducts();

      // Sync pending sales
      const result = await syncPendingSales();

      if (result.synced > 0) {
        toast.success(`Synced ${result.synced} pending sale(s)`);
      } else if (result.totalPending === 0) {
        toast.success('Everything is up to date');
      }

      if (result.failed > 0) {
        toast.error(`Failed to sync ${result.failed} sale(s)`);
      }

      // Reload stats
      await loadStats();
    } catch (error) {
      console.error('Manual sync failed:', error);
      toast.error('Failed to sync data');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isOnline && stats.pendingSales === 0) {
    // Don't show anything if we're online and have no pending sales
    return null;
  }

  return (
    <Card className="border-2">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                isOnline
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="h-4 w-4" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4" />
                  <span>Offline</span>
                </>
              )}
            </div>

            {stats.pendingSales > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{stats.pendingSales}</span> pending
                  sale{stats.pendingSales !== 1 ? 's' : ''} to sync
                </span>
              </div>
            )}
          </div>

          {isOnline && stats.pendingSales > 0 && (
            <Button
              onClick={handleManualSync}
              disabled={isSyncing}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
