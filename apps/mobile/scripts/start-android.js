// Builds, installs, and starts the native Android test app using 127.0.0.1.
//
// Supabase accepts exp://127.0.0.1:8081/... as a Google sign-in return address but rejects the
// Wi-Fi address (exp://192.168.x.x:8081/...). `expo start --localhost` would use 127.0.0.1 too,
// but on Windows it only listens on IPv6, which the emulator can't reach. This keeps the normal
// server and only changes the address the app is told to open. Pass --start-only to skip
// building an already installed app, or --go for Expo Go (without the native worker).
const { spawn } = require('node:child_process');

const options = process.argv.slice(2);
const useExpoGo = options.includes('--go');
const startOnly = options.includes('--start-only');
const forwardedOptions = options.filter((option) => option !== '--go' && option !== '--start-only');
const expoOptions = useExpoGo || startOnly
  ? ['start', useExpoGo ? '--go' : '--dev-client', '--android', ...forwardedOptions]
  : ['run:android', ...forwardedOptions];

const child = spawn(process.execPath, [require.resolve('expo/bin/cli'), ...expoOptions], {
  stdio: 'inherit',
  env: { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: '127.0.0.1' },
});

child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => process.exit(code ?? 0));
