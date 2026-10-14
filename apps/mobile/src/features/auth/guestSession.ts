import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from './supabase';

/**
 * Guests can report without an account. Every report still needs an owner, so the first time a
 * guest sends one, the app quietly signs in with an anonymous Supabase account. If the guest later
 * signs in or registers on this phone, their guest reports move to that account.
 */

const CLAIM_KEY = 'banabaconnect.guestClaimToken';

/**
 * Whose reports this phone shows and sends: the signed-in account's id, or null for a guest
 * (including the hidden guest account).
 */
export async function currentReportOwner(): Promise<string | null> {
  if (!supabaseConfigured) {
    return null;
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session && !session.user.is_anonymous ? session.user.id : null;
}

let preparingSession: Promise<Session> | null = null;

/** Share guest creation when startup and Send happen together. */
export function ensureSession(): Promise<Session> {
  preparingSession ??= loadOrCreateSession().finally(() => { preparingSession = null; });
  return preparingSession;
}

/** The current session, starting a hidden guest account if nobody is signed in. */
async function loadOrCreateSession(): Promise<Session> {
  if (!supabaseConfigured) {
    throw new Error('Supabase is not set up in this build');
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) {
    return session;
  }
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.session) {
    // Most likely "Allow anonymous sign-ins" is off in Supabase. The report stays queued.
    throw new Error(`Could not start a guest session: ${error?.message ?? 'no session'}`);
  }
  return data.session;
}

/** Barangay staff accounts are for the Command Dashboard, not the resident app. */
export async function isStaffAccount(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('Could not check the account type', error);
    return false;
  }
  return data?.role === 'admin';
}

function readToken(): string | null {
  try {
    return localStorage.getItem(CLAIM_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(CLAIM_KEY, token);
    } else {
      localStorage.removeItem(CLAIM_KEY);
    }
  } catch {
    // Not fatal: the guest's reports just stay with the guest account.
  }
}

/**
 * Call before signing in or registering. While the guest session still exists, it gets a
 * one-time token that lets the next account take over this guest's reports.
 */
export async function prepareGuestClaim() {
  if (!supabaseConfigured) {
    return;
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user.is_anonymous) {
    return;
  }
  const { data, error } = await supabase.rpc('create_guest_claim');
  if (error || typeof data !== 'string') {
    console.warn('Could not prepare guest report hand-over', error);
    return;
  }
  writeToken(data);
}

/**
 * Call after a real sign-in. Moves the guest's reports to this account and returns how many moved.
 * If it fails (e.g. no signal), the token is kept and the app tries again on the next start.
 */
export async function claimGuestReports(): Promise<number> {
  const token = readToken();
  if (!token || !supabaseConfigured) {
    return 0;
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session || session.user.is_anonymous) {
    return 0;
  }
  // Never hand a guest's reports to a staff account; keep the token for the next resident sign-in.
  if (await isStaffAccount(session.user.id)) {
    return 0;
  }
  const { data, error } = await supabase.rpc('claim_guest_reports', { p_token: token });
  if (error) {
    console.warn('Could not move guest reports to this account', error);
    return 0;
  }
  writeToken(null);
  return typeof data === 'number' ? data : 0;
}
