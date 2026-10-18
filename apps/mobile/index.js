// Task definitions must load even when iOS starts JS without mounting any screens.
import './src/features/queue/backgroundSync';
// SOS widgets: Android draws its widget from JS in the background; iOS registers its layout.
import './src/widgets/registerAndroidWidget';
import './src/widgets/SosWidget';
import 'expo-router/entry';
