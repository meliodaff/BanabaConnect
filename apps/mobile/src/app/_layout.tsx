import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ToastHost } from '@/components/ToastHost';
import { startAuth } from '@/features/auth/authStore';
import { useOfflineToasts } from '@/features/network/useOfflineToasts';
import { useSyncTriggers } from '@/features/queue/useSyncTriggers';
import { useTheme } from '@/theme';

startAuth();

export default function RootLayout() {
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
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: '700', color: colors.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
