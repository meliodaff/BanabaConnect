import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { REPORT_CATEGORIES } from '@banabaconnect/shared';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>BanabaConnect</Text>
      <Text>{REPORT_CATEGORIES.length} report categories loaded from @banabaconnect/shared</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
