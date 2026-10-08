import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <>
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
        <Stack.Screen
          name="report/sent"
          options={{ headerShown: false, gestureEnabled: false }}
        />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
