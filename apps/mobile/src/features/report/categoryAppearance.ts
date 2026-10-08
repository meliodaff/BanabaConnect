import type { ReportCategory } from '@banabaconnect/shared';
import type { IconName } from '@/components/Icon';

export interface CategoryAppearance {
  icon: IconName;
  /** Tagalog label shown under the English one. */
  tagalog: string;
  /** Example description for the details box, specific to this category. */
  placeholder: string;
  color: string;
  tint: string;
}

export const CATEGORY_APPEARANCE: Record<ReportCategory, CategoryAppearance> = {
  flood: {
    icon: { ios: 'water.waves', android: 'flood' },
    tagalog: 'Baha',
    placeholder: 'e.g. Water is knee-deep and rising. Two families on our street need help evacuating.',
    color: '#1565C0',
    tint: '#E3F0FC',
  },
  fire: {
    icon: { ios: 'flame.fill', android: 'local_fire_department' },
    tagalog: 'Sunog',
    placeholder: 'e.g. A house is on fire and smoke is spreading to the next house. Everyone seems to be out.',
    color: '#D84315',
    tint: '#FDECE6',
  },
  medical: {
    icon: { ios: 'cross.case.fill', android: 'medical_services' },
    tagalog: 'Medikal na emergency',
    placeholder: 'e.g. An elderly man collapsed and is not responding, but he is breathing.',
    color: '#C62828',
    tint: '#FDECEC',
  },
  accident: {
    icon: { ios: 'car.fill', android: 'car_crash' },
    tagalog: 'Aksidente',
    placeholder: 'e.g. A motorcycle hit a tricycle. One person is injured and bleeding.',
    color: '#6A1B9A',
    tint: '#F3E8F8',
  },
  crime: {
    icon: { ios: 'exclamationmark.shield.fill', android: 'local_police' },
    tagalog: 'Krimen',
    placeholder: 'e.g. Two men are breaking into a parked car. They are still here.',
    color: '#283593',
    tint: '#E8EAF6',
  },
  road_blockage: {
    icon: { ios: 'road.lanes', android: 'remove_road' },
    tagalog: 'Saradong daan',
    placeholder: 'e.g. A fallen tree is blocking the whole road. Vehicles cannot pass.',
    color: '#8D6E00',
    tint: '#FFF6D9',
  },
  power_line: {
    icon: { ios: 'bolt.fill', android: 'electric_bolt' },
    tagalog: 'Bumagsak na kawad ng kuryente',
    placeholder: 'e.g. A live wire is on the ground near the waiting shed and it is sparking.',
    color: '#E65100',
    tint: '#FFF0E0',
  },
  other: {
    icon: { ios: 'questionmark.circle.fill', android: 'help' },
    tagalog: 'Iba pa',
    placeholder: 'e.g. Describe what is happening, how many people are affected, and if anyone is hurt.',
    color: '#455A64',
    tint: '#ECEFF1',
  },
};
