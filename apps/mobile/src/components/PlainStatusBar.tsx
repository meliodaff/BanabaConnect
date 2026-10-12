import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/theme';

/**
 * For screens without a header, whose top edge is the plain page background. The app's default
 * status bar has light icons for the colored header, which would vanish on a light page.
 * Restores the default when the screen closes.
 */
export function PlainStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}
