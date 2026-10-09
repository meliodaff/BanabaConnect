import { router, Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type ColorValue } from 'react-native';
import { Icon, icons, type IconName } from '@/components/Icon';
import { colors, radius } from '@/theme';

function tabIcon(name: IconName) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <Icon name={name} size={24} color={color} />;
  };
}

/** The raised round button in the middle of the tab bar. Opens the report flow. */
function ReportTabButton() {
  return (
    <Pressable
      onPress={() => router.push('/report')}
      style={styles.reportTab}
      accessibilityRole="button"
      accessibilityLabel="Report an emergency"
    >
      {({ pressed }) => (
        <>
          <View style={[styles.reportCircle, pressed && styles.pressed]}>
            <Icon name={icons.emergency} size={30} color={colors.onEmergency} />
          </View>
          <Text style={styles.reportLabel}>Report</Text>
        </>
      )}
    </Pressable>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontWeight: '700', color: colors.text },
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
        name="new-report"
        options={{ title: 'Report', tabBarButton: () => <ReportTabButton /> }}
      />
      <Tabs.Screen
        name="hotlines"
        options={{ title: 'Hotlines', tabBarIcon: tabIcon(icons.phone) }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Me', tabBarIcon: tabIcon(icons.profile) }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  reportTab: {
    flex: 1,
    alignItems: 'center',
  },
  reportCircle: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.emergency,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    borderWidth: 4,
    borderColor: colors.surface,
    shadowColor: colors.emergency,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  reportLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.emergency,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.85,
  },
});
