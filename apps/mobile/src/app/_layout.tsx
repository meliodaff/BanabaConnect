import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'BanabaConnect' }} />
        <Stack.Screen name="report" options={{ title: 'Report an emergency' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
