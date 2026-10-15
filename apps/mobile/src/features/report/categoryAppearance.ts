import type { ReportCategory } from '@banabaconnect/shared';
import type { IconName } from '@/components/Icon';

export interface CategoryAppearance {
  icon: IconName;
  /** Colors identify the incident category in both display modes. */
  colors: Record<'light' | 'dark', { icon: string; background: string }>;
  /** Tagalog label shown under the English one. */
  tagalog: string;
  /** Example description for the details box, specific to this category. */
  placeholder: string;
}

export const CATEGORY_APPEARANCE: Record<ReportCategory, CategoryAppearance> = {
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
      light: { icon: '#C62845', background: '#FDE8EE' },
      dark: { icon: '#FF9CB2', background: '#421F2B' },
    },
    tagalog: 'Medikal na emergency',
    placeholder: 'e.g. An elderly man collapsed and is not responding, but he is breathing.',
  },
  accident: {
    icon: { ios: 'car.side.rear.and.collision.and.car.side.front', android: 'car_crash' },
    colors: {
      light: { icon: '#A65C00', background: '#FFF2CD' },
      dark: { icon: '#FFD076', background: '#3E3016' },
    },
    tagalog: 'Aksidente',
    placeholder: 'e.g. A motorcycle hit a tricycle. One person is injured and bleeding.',
  },
  crime: {
    icon: { ios: 'exclamationmark.shield.fill', android: 'local_police' },
    colors: {
      light: { icon: '#6844B5', background: '#F0E9FF' },
      dark: { icon: '#C9B1FF', background: '#302446' },
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
