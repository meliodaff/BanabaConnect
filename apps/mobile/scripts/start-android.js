// Starts Expo for the Android emulator (or a phone on USB) using the address 127.0.0.1.
//
// Supabase accepts exp://127.0.0.1:8081/... as a Google sign-in return address but rejects the
// Wi-Fi address (exp://192.168.x.x:8081/...). `expo start --localhost` would use 127.0.0.1 too,
// but on Windows it only listens on IPv6, which the emulator can't reach. This keeps the normal
// server and only changes the address Expo Go is told to open.
const { spawn } = require('node:child_process');

const child = spawn('npx', ['expo', 'start', '--android', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: '127.0.0.1' },
});

child.on('exit', (code) => process.exit(code ?? 0));
