import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
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
