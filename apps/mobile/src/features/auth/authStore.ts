import { useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';
import { PROFILE_COLUMNS, type ResidentProfile } from '@banabaconnect/shared';
import { syncAccountReports } from '@/features/queue/accountSync';
import { reportsStore } from '@/features/queue/reportsStore';
import { refreshStatuses } from '@/features/queue/statusSync';
import { claimGuestReports } from './guestSession';
import { supabase, supabaseConfigured } from './supabase';

export type AuthState =
  | { status: 'loading'; session: null; profile: null }
  | { status: 'guest'; session: null; profile: null }
  | { status: 'signedIn'; session: Session; profile: ResidentProfile | null };

let state: AuthState = { status: 'loading', session: null, profile: null };
let started = false;
const listeners = new Set<() => void>();

function setState(next: AuthState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

async function fetchProfile(userId: string): Promise<ResidentProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('Could not load profile', error);
    return null;
  }
  return data as ResidentProfile | null;
}

/** No session, or the hidden account a guest gets when they first send a report. */
function isGuestSession(session: Session | null): session is null {
  return !session || session.user.is_anonymous === true;
}

async function applySession(session: Session | null) {
  if (isGuestSession(session)) {
    setState({ status: 'guest', session: null, profile: null });
    // Show the guest's reports, not the account that just signed out.
    void reportsStore.refresh().catch((error) => console.warn('Could not load reports', error));
    return;
  }
  // Link this phone's guest reports to the account and download the account's earlier ones.
  void syncAccountReports(session.user.id).catch((error) =>
    console.warn('Could not sync this account’s reports', error),
  );
  // Keep the profile we already have while the new one loads, so screens don't flicker.
  const previous = state.status === 'signedIn' && state.session.user.id === session.user.id;
  setState({ status: 'signedIn', session, profile: previous ? state.profile : null });
  const profile = await fetchProfile(session.user.id);
  if (state.status === 'signedIn' && state.session.user.id === session.user.id) {
    setState({ status: 'signedIn', session: state.session, profile });
  }
}

/** Starts listening for sign-in and sign-out. Safe to call more than once. */
export function startAuth() {
  if (started) {
    return;
  }
  started = true;
  if (!supabaseConfigured) {
    setState({ status: 'guest', session: null, profile: null });
    return;
  }
  supabase.auth.onAuthStateChange((event, session) => {
    // Supabase warns against awaiting other Supabase calls inside this callback.
    if (event === 'TOKEN_REFRESHED' && state.status === 'signedIn' && session) {
      setState({ ...state, session });
      return;
    }
    setTimeout(() => void applySession(session), 0);
  });
  // Finish a guest report hand-over that couldn't complete earlier, e.g. sign-up confirmed by
  // email after the app was closed.
  void claimGuestReports().then((moved) => {
    if (moved > 0) {
      void refreshStatuses({ force: true });
    }
  });
}

/**
 * Reloads the signed-in resident's profile, for example right after sign-in or after saving it.
 * Reads the session from Supabase directly, so it works before the store has caught up.
 */
export async function refreshProfile(): Promise<ResidentProfile | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (isGuestSession(session)) {
    setState({ status: 'guest', session: null, profile: null });
    return null;
  }
  const profile = await fetchProfile(session.user.id);
  setState({ status: 'signedIn', session, profile });
  return profile;
}

export function getAuth(): AuthState {
  return state;
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/** "Juan" from "Juan Dela Cruz", for greetings. */
export function firstName(profile: ResidentProfile | null): string | null {
  return profile?.full_name?.trim().split(/\s+/)[0] || null;
}

/** The profile photo from the resident's Google account, or null (guests, email accounts). */
export function avatarUrl(auth: AuthState): string | null {
  if (auth.status !== 'signedIn') {
    return null;
  }
  const metadata = auth.session.user.user_metadata ?? {};
  const url: unknown = metadata.avatar_url ?? metadata.picture;
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    return null;
  }
  // Google sends a 96 px photo; ask for a sharper one for high-resolution screens.
  return url.replace(/=s\d+-c$/, '=s256-c');
}
