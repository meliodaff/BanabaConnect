import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { isProfileComplete } from '@banabaconnect/shared';
import { showToast } from '@/features/toast/toastStore';
import { firstName, refreshProfile } from './authStore';
import { supabase, supabaseConfigured } from './supabase';

export type SignInResult = 'signedIn' | 'cancelled' | 'confirmEmail';

/** An error with a message that is safe to show to the resident. */
export class SignInError extends Error {}

const NOT_CONFIGURED = 'Accounts are not set up in this version of the app yet.';

/** Where Google sends the resident back to: banabaconnect://auth/callback (exp://… in Expo Go). */
export const AUTH_CALLBACK_URL = Linking.createURL('auth/callback');

let googleInProgress = false;
const exchanges = new Map<string, Promise<void>>();

/** True while the Google page is open, so the callback route knows the sign-in screen handles it. */
export function isGoogleSignInInProgress() {
  return googleInProgress;
}

/**
 * Trades the one-time code from Google for a session. Both the sign-in screen and the
 * callback route can receive the same code on Android, so each code is only used once.
 */
export function exchangeAuthCode(code: string): Promise<void> {
  let exchange = exchanges.get(code);
  if (!exchange) {
    exchange = supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        console.warn('Google code exchange failed', error);
        throw new SignInError('Google sign-in did not finish. Please try again.');
      }
    });
    exchanges.set(code, exchange);
  }
  return exchange;
}

/** Reads `code` (or Google's error) from the URL Google redirected to. */
export function readCallbackUrl(url: string): { code: string | null; error: string | null } {
  const { queryParams } = Linking.parse(url);
  const value = (name: string) => {
    const raw = queryParams?.[name];
    return typeof raw === 'string' ? raw : null;
  };
  return { code: value('code'), error: value('error_description') ?? value('error') };
}

export async function signInWithGoogle(): Promise<SignInResult> {
  if (!supabaseConfigured) {
    throw new SignInError(NOT_CONFIGURED);
  }
  if (__DEV__) {
    // Supabase only returns to addresses on its Redirect URLs list; otherwise it opens the Site URL.
    console.log(`Google sign-in returns to: ${AUTH_CALLBACK_URL}`);
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: AUTH_CALLBACK_URL,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error || !data.url) {
    console.warn('Could not start Google sign-in', error);
    throw new SignInError('Could not open Google sign-in. Check your signal and try again.');
  }

  googleInProgress = true;
  try {
    const result = await WebBrowser.openAuthSessionAsync(data.url, AUTH_CALLBACK_URL);
    if (result.type !== 'success') {
      return 'cancelled';
    }
    const callback = readCallbackUrl(result.url);
    if (!callback.code) {
      console.warn('Google sign-in returned no code', callback.error);
      throw new SignInError('Google sign-in did not finish. Please try again.');
    }
    await exchangeAuthCode(callback.code);
    return 'signedIn';
  } finally {
    googleInProgress = false;
  }
}

export async function signInWithEmail(email: string, password: string): Promise<SignInResult> {
  if (!supabaseConfigured) {
    throw new SignInError(NOT_CONFIGURED);
  }
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    if (error.code === 'invalid_credentials') {
      throw new SignInError('Wrong email or password.');
    }
    if (error.code === 'email_not_confirmed') {
      throw new SignInError('Open the link we emailed you first, then sign in.');
    }
    console.warn('Email sign-in failed', error);
    throw new SignInError('Could not sign in. Check your signal and try again.');
  }
  return 'signedIn';
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string,
): Promise<SignInResult> {
  if (!supabaseConfigured) {
    throw new SignInError(NOT_CONFIGURED);
  }
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    // The database copies full_name into the new profile.
    options: { data: { full_name: fullName.trim() }, emailRedirectTo: AUTH_CALLBACK_URL },
  });
  if (error) {
    if (error.code === 'user_already_exists' || error.code === 'email_exists') {
      throw new SignInError('This email already has an account. Sign in instead.');
    }
    if (error.code === 'weak_password') {
      throw new SignInError('Choose a stronger password: mix letters and numbers.');
    }
    console.warn('Sign-up failed', error);
    throw new SignInError('Could not create your account. Check your signal and try again.');
  }
  // No session means the project asks new users to confirm their email first.
  return data.session ? 'signedIn' : 'confirmEmail';
}

/**
 * Sends a newly signed-in resident to the right place: their details form if registration
 * isn't finished, otherwise back to the Me tab.
 */
export async function continueAfterSignIn() {
  const profile = await refreshProfile();
  if (!isProfileComplete(profile)) {
    router.replace('/auth/details');
    return;
  }
  router.dismissTo('/profile');
  const name = firstName(profile);
  showToast({ tone: 'success', message: name ? `Welcome back, ${name}!` : 'Signed in.' });
}
