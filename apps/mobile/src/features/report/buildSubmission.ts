import * as Crypto from 'expo-crypto';
import type { ReportCategory, ReportSubmission } from '@banabaconnect/shared';
import type { ReportCoords } from './useReportLocation';

export const INCIDENT_TIME_OPTIONS = [
  { label: 'Just now', minutesAgo: 0 },
  { label: '15 min ago', minutesAgo: 15 },
  { label: '30 min ago', minutesAgo: 30 },
  { label: '1 hour ago', minutesAgo: 60 },
] as const;

export interface ReportFormValues {
  category: ReportCategory;
  coords: ReportCoords;
  description: string;
  minutesAgo: number;
}

/** Creates the report with a phone-generated UUID, so retries can never create a duplicate. */
export function buildSubmission(values: ReportFormValues, now = new Date()): ReportSubmission {
  return {
    id: Crypto.randomUUID(),
    category: values.category,
    latitude: values.coords.latitude,
    longitude: values.coords.longitude,
    locationAccuracy: values.coords.accuracy,
    description: values.description.trim(),
    incidentAt: new Date(now.getTime() - values.minutesAgo * 60 * 1000).toISOString(),
    createdAt: now.toISOString(),
  };
}
