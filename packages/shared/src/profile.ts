/** Mirrors `public.verification_status` in the Supabase schema. */
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

/** The columns of `public.profiles` that the resident app reads. */
export interface ResidentProfile {
  id: string;
  role: 'resident' | 'admin';
  is_guest: boolean;
  full_name: string | null;
  phone: string | null;
  area: string | null;
  address: string | null;
  verification_status: VerificationStatus;
  verification_document_path: string | null;
  verification_note: string | null;
  verified_at: string | null;
}

export const PROFILE_COLUMNS =
  'id, role, is_guest, full_name, phone, area, address, verification_status, verification_document_path, verification_note, verified_at';

// TODO: confirm the full list of sitios and puroks with the barangay.
export const BARANGAY_AREAS = ['North Libis', 'South Libis', 'Dama de Noche'] as const;

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  unverified: 'Not verified',
  pending: 'Under review',
  verified: 'Verified resident',
  rejected: 'Not approved',
};

export const PASSWORD_MIN_LENGTH = 8;

/**
 * Turns "0917 123 4567", "+63 917-123-4567" or "9171234567" into "09171234567".
 * Returns null if it isn't a Philippine mobile number.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('639') && digits.length === 12) {
    return `0${digits.slice(2)}`;
  }
  if (digits.startsWith('09') && digits.length === 11) {
    return digits;
  }
  if (digits.startsWith('9') && digits.length === 10) {
    return `0${digits}`;
  }
  return null;
}

export function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
}

/** Name, mobile number and sitio are required before an account counts as registered. */
export function isProfileComplete(profile: ResidentProfile | null): boolean {
  return Boolean(profile?.full_name?.trim() && profile.phone && profile.area);
}
