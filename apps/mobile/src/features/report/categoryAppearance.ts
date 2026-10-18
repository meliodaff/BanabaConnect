import { Platform } from 'react-native';
import type { ReportCategory } from '@banabaconnect/shared';
import { icons, type IconName } from '@/components/Icon';

type CategoryColors = Record<'light' | 'dark', { icon: string; background: string }>;

// The two-car collision symbol needs iOS 17; the app still supports iOS 16.4.
const hasCollisionSymbol = Platform.OS !== 'ios' || Number.parseInt(String(Platform.Version), 10) >= 17;

export interface CategoryAppearance {
  icon: IconName;
  /**
   * Colors identify the incident category in both display modes. They stay clear of the status
   * colors (amber waiting, blue sent, violet dispatched or in progress, green resolved) and of
   * emergency red, so a category icon is never read as a status.
   */
  colors: CategoryColors;
  /** A small corner mark that adds meaning to the symbol, e.g. "blocked" on the road. */
  badge?: { icon: IconName; colors: CategoryColors };
  /** Tagalog label shown under the English one. */
  tagalog: string;
  /** Example description for the details box, specific to this category. */
  placeholder: string;
}

export const CATEGORY_APPEARANCE: Record<ReportCategory, CategoryAppearance> = {
  sos: {
    icon: { ios: 'sos.circle.fill', android: 'sos' },
    colors: {
      // Emergency red on purpose: an SOS is the one report that always means "act now".
      light: { icon: '#C62828', background: '#FDE7E7' },
      dark: { icon: '#FF8A80', background: '#3D1C1C' },
    },
    tagalog: 'SOS',
    // Not shown: an SOS is sent from its own screen, without a details form.
    placeholder: '',
  },
  flood: {
    icon: { ios: 'water.waves.and.arrow.up', android: 'flood' },
    colors: {
      light: { icon: '#1565C0', background: '#E3F2FD' },
      dark: { icon: '#90CAF9', background: '#172F4A' },
    },
    tagalog: 'Baha',
    placeholder: 'e.g. Water is knee-deep and rising. Two families on our street need help evacuating.',
  },
  fire: {
    icon: { ios: 'flame.fill', android: 'local_fire_department' },
    colors: {
      light: { icon: '#D34B12', background: '#FFF0E3' },
      dark: { icon: '#FFAB70', background: '#41281D' },
    },
    tagalog: 'Sunog',
    placeholder: 'e.g. A house is on fire and smoke is spreading to the next house. Everyone seems to be out.',
  },
  medical: {
    icon: { ios: 'cross.case.fill', android: 'medical_services' },
    colors: {
      light: { icon: '#AD2C6B', background: '#FCE6F1' },
      dark: { icon: '#F59CC6', background: '#42202F' },
    },
    tagalog: 'Medikal na emergency',
    placeholder: 'e.g. An elderly man collapsed and is not responding, but he is breathing.',
  },
  accident: {
    icon: {
      ios: hasCollisionSymbol ? 'car.side.rear.and.collision.and.car.side.front' : 'car.rear.and.tire.marks',
      android: 'car_crash',
    },
    colors: {
      // A muted brown, not the vivid amber of "waiting for signal".
      light: { icon: '#74553A', background: '#F2ECE5' },
      dark: { icon: '#D5B795', background: '#352B22' },
    },
    tagalog: 'Aksidente',
    placeholder: 'e.g. A motorcycle hit a tricycle. One person is injured and bleeding.',
  },
  crime: {
    icon: { ios: 'exclamationmark.shield.fill', android: 'local_police' },
    colors: {
      light: { icon: '#3F5194', background: '#E8EBF6' },
      dark: { icon: '#AEB8EA', background: '#272C45' },
    },
    tagalog: 'Krimen',
    placeholder: 'e.g. Two men are breaking into a parked car. They are still here.',
  },
  road_blockage: {
    icon: { ios: 'road.lanes', android: 'remove_road' },
    colors: {
      light: { icon: '#4B5F75', background: '#EAF0F6' },
      dark: { icon: '#B2C6DD', background: '#253343' },
    },
    badge: {
      icon: icons.closed,
      colors: {
        light: { icon: '#D34B12', background: '#FFF0E3' },
        dark: { icon: '#FFAB70', background: '#41281D' },
      },
    },
    tagalog: 'Saradong daan',
    placeholder: 'e.g. A fallen tree is blocking the whole road. Vehicles cannot pass.',
  },
  power_line: {
    icon: { ios: 'bolt.trianglebadge.exclamationmark.fill', android: 'electric_bolt' },
    colors: {
      light: { icon: '#887000', background: '#FFF8C2' },
      dark: { icon: '#F5E269', background: '#393416' },
    },
    tagalog: 'Bumagsak na kawad ng kuryente',
    placeholder: 'e.g. A live wire is on the ground near the waiting shed and it is sparking.',
  },
  other: {
    icon: { ios: 'ellipsis.circle.fill', android: 'more_horiz' },
    colors: {
      light: { icon: '#087F78', background: '#DFF5F0' },
      dark: { icon: '#79DCCE', background: '#173A37' },
    },
    tagalog: 'Iba pa',
    placeholder: 'e.g. Describe what is happening, how many people are affected, and if anyone is hurt.',
  },
};
