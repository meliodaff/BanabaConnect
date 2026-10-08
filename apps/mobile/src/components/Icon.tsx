import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue } from 'react-native';

type SymbolName = Extract<SymbolViewProps['name'], object>;

export interface IconName {
  /** SF Symbol name (iOS). */
  ios: NonNullable<SymbolName['ios']>;
  /** Material Symbol name (Android). */
  android: NonNullable<SymbolName['android']>;
}

/** A cross-platform icon: Material Symbols on Android, SF Symbols on iOS. */
export function Icon({
  name,
  size = 24,
  color,
}: {
  name: IconName;
  size?: number;
  color: ColorValue;
}) {
  return (
    <SymbolView
      name={{ ios: name.ios, android: name.android, web: name.android }}
      size={size}
      tintColor={color}
    />
  );
}

export const icons = {
  emergency: { ios: 'exclamationmark.triangle.fill', android: 'emergency' },
  camera: { ios: 'camera.fill', android: 'photo_camera' },
  gallery: { ios: 'photo.on.rectangle', android: 'image' },
  location: { ios: 'location.fill', android: 'location_on' },
  locating: { ios: 'location', android: 'location_searching' },
  locationOff: { ios: 'location.slash.fill', android: 'location_off' },
  check: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  time: { ios: 'clock', android: 'schedule' },
  details: { ios: 'square.and.pencil', android: 'edit_note' },
  send: { ios: 'paperplane.fill', android: 'send' },
  next: { ios: 'chevron.right', android: 'arrow_forward' },
  tap: { ios: 'hand.tap.fill', android: 'touch_app' },
  announce: { ios: 'megaphone.fill', android: 'campaign' },
} as const satisfies Record<string, IconName>;
