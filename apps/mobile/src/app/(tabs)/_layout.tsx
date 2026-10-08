import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { Icon, icons, type IconName } from '@/components/Icon';
import { colors } from '@/theme';

function tabIcon(name: IconName) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <Icon name={name} size={26} color={color} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.onPrimary,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', headerShown: false, tabBarIcon: tabIcon(icons.home) }}
      />
      <Tabs.Screen
        name="reports"
        options={{ title: 'My Reports', tabBarIcon: tabIcon(icons.reports) }}
      />
      <Tabs.Screen
        name="hotlines"
        options={{ title: 'Hotlines', tabBarIcon: tabIcon(icons.phone) }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Me', tabBarIcon: tabIcon(icons.profile) }} />
    </Tabs>
  );
}
