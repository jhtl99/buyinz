/**
 * Re-applies Expo CLI tunnel timeout patch after npm install.
 * Expo's default ngrok wait is 10s (too short on slow networks).
 */
const fs = require('fs');
const path = require('path');

const candidates = [
  path.join(__dirname, '../node_modules/expo/node_modules/@expo/cli/build/src/start/server/AsyncNgrok.js'),
  path.join(__dirname, '../node_modules/@expo/cli/build/src/start/server/AsyncNgrok.js'),
];

const OLD = 'const TUNNEL_TIMEOUT = 10 * 1000;';
const NEW = `// Patched by scripts/patch-expo-tunnel-timeout.cjs — default 90s; override with EXPO_TUNNEL_TIMEOUT_MS
const TUNNEL_TIMEOUT = Math.max(10000, parseInt(process.env.EXPO_TUNNEL_TIMEOUT_MS || '90000', 10));`;

let file = candidates.find((p) => fs.existsSync(p));
if (!file) {
  console.warn('[patch-expo-tunnel-timeout] AsyncNgrok.js not found; skip (expo layout may have changed).');
  process.exit(0);
}

let s = fs.readFileSync(file, 'utf8');
if (s.includes(OLD)) {
  fs.writeFileSync(file, s.replace(OLD, NEW));
  console.log('[patch-expo-tunnel-timeout] Applied longer tunnel timeout to', path.relative(path.join(__dirname, '..'), file));
} else if (s.includes('patch-expo-tunnel-timeout.cjs')) {
  console.log('[patch-expo-tunnel-timeout] Already patched.');
} else {
  console.warn('[patch-expo-tunnel-timeout] Expected line not found; Expo CLI may have changed. Skipping.');
}
