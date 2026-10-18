import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { StartupScreen } from '@/components/StartupScreen';
import { ToastHost } from '@/components/ToastHost';
import { startAuth } from '@/features/auth/authStore';
import { useOfflineToasts } from '@/features/network/useOfflineToasts';
import { useSyncTriggers } from '@/features/queue/useSyncTriggers';
import { hasColoredHeader, useTheme } from '@/theme';

// Hold the native logo until the matching startup screen has been laid out.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  // Background launches run the queue from index.js without starting account/UI work.
  useEffect(() => { startAuth(); }, []);
  useSyncTriggers();
  useOfflineToasts();
  const { scheme, colors } = useTheme();
  const baseTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...baseTheme,
        colors: {
          ...baseTheme.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.emergency,
        },
      }}
    >
      <StartupScreen>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.headerBg },
            headerTintColor: colors.headerText,
            headerTitleStyle: { fontWeight: '700', color: colors.headerText },
            headerShadowVisible: false,
            // iOS labels the back button with the previous screen's name, and the tab group's
            // internal name is "(tabs)". "Back" reads right wherever the resident came from.
            headerBackTitle: 'Back',
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* Opened by the SOS widget, the app icon shortcut, and the Home tab (banabaconnect://sos). */}
          <Stack.Screen name="sos" options={{ headerShown: false }} />
          <Stack.Screen name="report/index" options={{ title: 'New report' }} />
          <Stack.Screen name="report/details" options={{ title: 'New report' }} />
          <Stack.Screen name="reports/[id]" options={{ title: 'Report details' }} />
          <Stack.Screen
            name="report/sent"
            options={{ headerShown: false, gestureEnabled: false }}
          />
          <Stack.Screen name="auth/sign-in" options={{ title: 'Sign in' }} />
          <Stack.Screen name="auth/register" options={{ title: 'Create account' }} />
          <Stack.Screen name="auth/details" options={{ title: 'Create account' }} />
          <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
          <Stack.Screen name="verify-id" options={{ title: 'Verify your ID' }} />
        </Stack>
        <ToastHost />
        {/* Screens without a header set their own (see PlainStatusBar). */}
        <StatusBar style={scheme === 'dark' || hasColoredHeader(colors) ? 'light' : 'dark'} />
      </StartupScreen>
    </ThemeProvider>
  );
}
