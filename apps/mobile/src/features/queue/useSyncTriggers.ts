import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { ensureSession } from '@/features/auth/guestSession';
import { supabaseConfigured } from '@/features/auth/supabase';
import { registerBackgroundSync } from './backgroundSync';
import { reportsStore } from './reportsStore';
import { requestSync } from './syncEngine';

const PERIODIC_SYNC_MS = 30_000;

/**
 * Keeps the report queue moving while the app is open: on start, every 30 seconds,
 * when the app returns to the foreground, and immediately when any signal comes back.
 * Android also tries on reconnect while backgrounded if its JS process is still running.
 * The OS worker covers execution after that process has been suspended in native builds.
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
    let wasReachable: boolean | null = null;
    let sessionPrepared = false;
    const unsubscribeNetInfo = NetInfo.addEventListener((network) => {
      // Prepare authentication while online, so a later offline report can be handed to iOS.
      // Once per launch: network details change often, and the saved session lasts.
      if (!sessionPrepared && network.isConnected === true && AppState.currentState === 'active' && supabaseConfigured) {
        sessionPrepared = true;
        void ensureSession().then(() => requestSync())
          .catch((error) => {
            sessionPrepared = false;
            console.warn('Could not prepare the reporting session', error);
          });
      }
      // Even a hint of signal is worth a try, so don't wait for internet reachability.
      // Try again if Wi-Fi connected before it actually had internet access.
      const internetRestored = network.isInternetReachable === true && wasReachable === false;
      if (network.isConnected === true && (wasConnected === false || internetRestored)) {
        const background = AppState.currentState !== 'active';
        if (!background || Platform.OS === 'android') {
          requestSync({ ignoreBackoff: true, background });
        }
      }
      if (network.isConnected !== null) {
        wasConnected = network.isConnected;
      }
      if (network.isInternetReachable !== null) {
        wasReachable = network.isInternetReachable;
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
