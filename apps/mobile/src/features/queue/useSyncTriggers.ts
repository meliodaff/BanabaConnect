import { useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { registerBackgroundSync } from './backgroundSync';
import { reportsStore } from './reportsStore';
import { requestSync } from './syncEngine';

const PERIODIC_SYNC_MS = 30_000;

/**
 * Keeps the report queue moving while the app is open: on start, every 30 seconds,
 * when the app returns to the foreground, and immediately when any signal comes back.
 * Also registers the OS worker for background sending in native builds.
 */
export function useSyncTriggers() {
  useEffect(() => {
    const register = () => registerBackgroundSync()
      .catch((error) => console.warn('Could not register background report sync', error));
    void register();
    reportsStore
      .refresh()
      .then(() => requestSync())
      .catch((error) => console.warn('Could not load saved reports', error));

    let wasConnected: boolean | null = null;
    const unsubscribeNetInfo = NetInfo.addEventListener((network) => {
      // Even a hint of signal is worth a try, so don't wait for internet reachability.
      if (network.isConnected === true && wasConnected === false && AppState.currentState === 'active') {
        requestSync({ ignoreBackoff: true });
      }
      if (network.isConnected !== null) {
        wasConnected = network.isConnected;
      }
    });

    const appStateSubscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void register();
        requestSync({ ignoreBackoff: true });
      }
    });

    const timer = setInterval(() => {
      if (AppState.currentState === 'active') requestSync();
    }, PERIODIC_SYNC_MS);

    return () => {
      unsubscribeNetInfo();
      appStateSubscription.remove();
      clearInterval(timer);
    };
  }, []);
}
