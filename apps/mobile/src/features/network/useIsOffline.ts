import { useNetInfo } from '@react-native-community/netinfo';

/**
 * True when the phone has no connection, or is connected (e.g. to Wi-Fi) but cannot reach
 * the internet. Unknown states count as online so the banner doesn't flash on startup.
 */
export function useIsOffline() {
  const { isConnected, isInternetReachable } = useNetInfo();
  return isConnected === false || isInternetReachable === false;
}
