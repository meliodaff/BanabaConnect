import { CryptoDigestAlgorithm, digest, getRandomValues } from 'expo-crypto';

/**
 * React Native has no `crypto.subtle`, so Supabase falls back to the weaker "plain" check when
 * signing in with Google. This adds the SHA-256 piece it needs, backed by expo-crypto.
 */
type Subtle = { digest: (algorithm: string | { name: string }, data: BufferSource) => Promise<ArrayBuffer> };
const globalCrypto = ((globalThis as unknown as { crypto?: Record<string, unknown> }).crypto ??=
  {});

if (typeof globalCrypto.getRandomValues !== 'function') {
  globalCrypto.getRandomValues = getRandomValues;
}

if (typeof globalCrypto.subtle === 'undefined') {
  const subtle: Subtle = {
    digest(algorithm, data) {
      const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
      if (name.toUpperCase() !== 'SHA-256') {
        return Promise.reject(new Error(`Unsupported digest algorithm: ${name}`));
      }
      return digest(CryptoDigestAlgorithm.SHA256, data);
    },
  };
  globalCrypto.subtle = subtle;
}
