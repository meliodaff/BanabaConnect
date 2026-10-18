import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as QuickActions from 'expo-quick-actions';
import { useQuickActionRouting, type RouterAction } from 'expo-quick-actions/router';

const SOS_ACTION: RouterAction = {
  id: 'sos',
  title: 'Send SOS',
  subtitle: 'Barangay Banaba',
  // iOS draws an SF Symbol; Android uses the icon the config plugin generates (app.json).
  icon: Platform.OS === 'ios' ? 'symbol:sos.circle.fill' : 'shortcut_sos',
  params: { href: '/sos' },
};

/**
 * "Send SOS" when the app icon is long-pressed, opening the SOS screen. Used in the tabs layout,
 * not the root one, because handling the action navigates.
 */
export function useSosShortcut() {
  useQuickActionRouting();
  useEffect(() => {
    if (Platform.OS === 'web') return;
    QuickActions.setItems<RouterAction>([SOS_ACTION]).catch((error) =>
      console.warn('Could not add the SOS shortcut', error),
    );
  }, []);
}
