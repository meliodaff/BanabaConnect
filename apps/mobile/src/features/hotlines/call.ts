import { Alert, Linking } from 'react-native';

/** Opens the phone dialer with the number filled in. */
export async function callNumber(number: string) {
  try {
    await Linking.openURL(`tel:${number}`);
  } catch {
    Alert.alert('Could not start the call', `Please dial ${number} manually.`);
  }
}
