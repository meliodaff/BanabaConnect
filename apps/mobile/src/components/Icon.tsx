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
  emergency: { ios: 'light.beacon.max.fill', android: 'e911_emergency' },
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
  home: { ios: 'house.fill', android: 'home' },
  reports: { ios: 'list.bullet.rectangle.fill', android: 'receipt_long' },
  phone: { ios: 'phone.fill', android: 'call' },
  profile: { ios: 'person.crop.circle.fill', android: 'account_circle' },
  evacuation: { ios: 'house.lodge.fill', android: 'night_shelter' },
  chevron: { ios: 'chevron.right', android: 'chevron_right' },
  info: { ios: 'info.circle.fill', android: 'info' },
  alert: { ios: 'exclamationmark.circle.fill', android: 'error' },
  bell: { ios: 'bell.fill', android: 'notifications' },
  offline: { ios: 'wifi.slash', android: 'wifi_off' },
  online: { ios: 'wifi', android: 'wifi' },
  queued: { ios: 'clock.arrow.circlepath', android: 'schedule_send' },
  sending: { ios: 'icloud.and.arrow.up', android: 'cloud_upload' },
  sent: { ios: 'checkmark.icloud', android: 'cloud_done' },
  appearance: { ios: 'circle.lefthalf.filled', android: 'contrast' },
  phoneSetting: { ios: 'iphone', android: 'smartphone' },
  lightMode: { ios: 'sun.max.fill', android: 'light_mode' },
  darkMode: { ios: 'moon.fill', android: 'dark_mode' },
  mail: { ios: 'envelope.fill', android: 'mail' },
  lock: { ios: 'lock.fill', android: 'lock' },
  show: { ios: 'eye', android: 'visibility' },
  hide: { ios: 'eye.slash', android: 'visibility_off' },
  personAdd: { ios: 'person.badge.plus', android: 'person_add' },
  verified: { ios: 'checkmark.seal.fill', android: 'verified' },
  idCard: { ios: 'person.text.rectangle', android: 'badge' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
  pending: { ios: 'hourglass', android: 'hourglass_top' },
} as const satisfies Record<string, IconName>;
