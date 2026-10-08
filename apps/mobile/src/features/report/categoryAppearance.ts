import type { ReportCategory } from '@banabaconnect/shared';
import type { IconName } from '@/components/Icon';

export interface CategoryAppearance {
  icon: IconName;
  /** Tagalog label shown under the English one. */
  tagalog: string;
  color: string;
  tint: string;
}

export const CATEGORY_APPEARANCE: Record<ReportCategory, CategoryAppearance> = {
  flood: {
    icon: { ios: 'water.waves', android: 'flood' },
    tagalog: 'Baha',
    color: '#1565C0',
    tint: '#E3F0FC',
  },
  fire: {
    icon: { ios: 'flame.fill', android: 'local_fire_department' },
    tagalog: 'Sunog',
    color: '#D84315',
    tint: '#FDECE6',
  },
  medical: {
    icon: { ios: 'cross.case.fill', android: 'medical_services' },
    tagalog: 'Medikal na emergency',
    color: '#C62828',
    tint: '#FDECEC',
  },
  accident: {
    icon: { ios: 'car.fill', android: 'car_crash' },
    tagalog: 'Aksidente',
    color: '#6A1B9A',
    tint: '#F3E8F8',
  },
  crime: {
    icon: { ios: 'exclamationmark.shield.fill', android: 'local_police' },
    tagalog: 'Krimen',
    color: '#283593',
    tint: '#E8EAF6',
  },
  road_blockage: {
    icon: { ios: 'road.lanes', android: 'remove_road' },
    tagalog: 'Saradong daan',
    color: '#8D6E00',
    tint: '#FFF6D9',
  },
  power_line: {
    icon: { ios: 'bolt.fill', android: 'electric_bolt' },
    tagalog: 'Bumagsak na kawad ng kuryente',
    color: '#E65100',
    tint: '#FFF0E0',
  },
  other: {
    icon: { ios: 'questionmark.circle.fill', android: 'help' },
    tagalog: 'Iba pa',
    color: '#455A64',
    tint: '#ECEFF1',
  },
};
