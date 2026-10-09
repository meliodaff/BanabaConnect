export interface Hotline {
  name: string;
  description: string;
  /** Digits to dial. `null` until the real number is confirmed. */
  number: string | null;
}

// Only confirmed numbers go here: a wrong emergency number is worse than none.
// TODO: get the official numbers from Barangay Banaba and the San Mateo LGU.
export const HOTLINES: Hotline[] = [
  {
    name: 'National Emergency Hotline',
    description: 'Police, fire, and medical emergencies nationwide',
    number: '911',
  },
  {
    name: 'Barangay Banaba Hall',
    description: 'Barangay officials and tanod',
    number: null,
  },
  {
    name: 'San Mateo MDRRMO',
    description: 'Disaster response and rescue',
    number: null,
  },
  {
    name: 'BFP San Mateo',
    description: 'Fire station',
    number: null,
  },
  {
    name: 'PNP San Mateo',
    description: 'Police station',
    number: null,
  },
];
