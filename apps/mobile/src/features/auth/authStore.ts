import { useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';
import { PROFILE_COLUMNS, type ResidentProfile } from '@banabaconnect/shared';
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

async function applySession(session: Session | null) {
  if (!session) {
    setState({ status: 'guest', session: null, profile: null });
    return;
  }
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
}

/**
 * Reloads the signed-in resident's profile, for example right after sign-in or after saving it.
 * Reads the session from Supabase directly, so it works before the store has caught up.
 */
export async function refreshProfile(): Promise<ResidentProfile | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
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
