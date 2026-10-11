import './installLocalStorage';
import './installWebCrypto';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** False until apps/mobile/.env.local has the Supabase URL and key (see .env.example). */
export const supabaseConfigured = Boolean(url && key);

if (!supabaseConfigured) {
  console.warn(
    'Supabase is not set up. Copy apps/mobile/.env.example to .env.local and fill it in to enable accounts.',
  );
}

export const supabase = createClient(url || 'https://not-configured.invalid', key || 'missing', {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // The Google sign-in returns a one-time code to the app instead of tokens in the URL.
    flowType: 'pkce',
  },
});

// Only refresh the sign-in while the app is open, so it doesn't run in the background.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
