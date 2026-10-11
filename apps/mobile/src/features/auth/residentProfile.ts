import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { eraseAccountReports } from '@/features/queue/accountSync';
import type { ReportPhoto } from '@/features/report/photo';
import { refreshProfile } from './authStore';
import { currentReportOwner } from './guestSession';
import { supabase } from './supabase';

export interface ResidentDetails {
  fullName: string;
  phone: string;
  area: string;
  address: string;
}

async function currentUserId(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not signed in');
  }
  return session.user.id;
}

/** The account exists but has no profile row, e.g. it was created before the database was set up. */
export class MissingProfileError extends Error {}

export async function saveResidentDetails(details: ResidentDetails) {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: details.fullName.trim(),
      phone: details.phone,
      area: details.area,
      address: details.address.trim() || null,
    })
    .eq('id', userId)
    .select('id');
  if (error) {
    throw error;
  }
  // An update that matches no row doesn't fail, so check that the profile really exists.
  if (data.length === 0) {
    throw new MissingProfileError();
  }
  await refreshProfile();
}

/**
 * Uploads a photo of the resident's Barangay ID and asks the barangay to review it.
 * Only the resident and barangay admins can open the file.
 */
export async function submitBarangayId(photo: ReportPhoto) {
  const userId = await currentUserId();
  const path = `${userId}/barangay-id-${Date.now()}.jpg`;
  const bytes =
    Platform.OS === 'web'
      ? await (await fetch(photo.uri)).arrayBuffer()
      : await new File(photo.uri).bytes();

  const upload = await supabase.storage
    .from('verification-documents')
    .upload(path, bytes, { contentType: 'image/jpeg' });
  if (upload.error) {
    throw upload.error;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ verification_document_path: path, verification_status: 'pending' })
    .eq('id', userId);
  if (error) {
    throw error;
  }
  await refreshProfile();
}

/**
 * Signs out on this phone and erases this account's reports from it, so the next person can't
 * see them. They stay on the server and come back at the next sign-in.
 */
export async function signOut() {
  const ownerId = await currentReportOwner();
  // "local" signs out this phone only, and works without signal.
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) {
    throw error;
  }
  if (ownerId) {
    await eraseAccountReports(ownerId);
  }
}
