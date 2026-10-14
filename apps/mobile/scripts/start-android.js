// Starts the native Android test app using 127.0.0.1. Build it once with android:build.
//
// Supabase accepts exp://127.0.0.1:8081/... as a Google sign-in return address but rejects the
// Wi-Fi address (exp://192.168.x.x:8081/...). `expo start --localhost` would use 127.0.0.1 too,
// but on Windows it only listens on IPv6, which the emulator can't reach. This keeps the normal
// server and only changes the address the app is told to open. Pass --go explicitly for
// Expo Go, which cannot run the native background worker.
const { spawn } = require('node:child_process');

const options = process.argv.slice(2);
const target = options.includes('--go') ? '--go' : '--dev-client';
const child = spawn('npx', ['expo', 'start', target, '--android', ...options.filter((option) => option !== '--go')], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: '127.0.0.1' },
});

child.on('exit', (code) => process.exit(code ?? 0));
