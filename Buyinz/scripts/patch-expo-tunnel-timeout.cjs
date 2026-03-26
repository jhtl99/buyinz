const fs = require('fs');
const path = require('path');

const cliCandidates = [
  path.join(__dirname, '../node_modules/expo/node_modules/@expo/cli/build/src/start/server/AsyncNgrok.js'),
  path.join(__dirname, '../node_modules/@expo/cli/build/src/start/server/AsyncNgrok.js'),
];

const timeoutOld = 'const TUNNEL_TIMEOUT = 10 * 1000;';
const timeoutNew =
  "// Patched by scripts/patch-expo-tunnel-timeout.cjs - default 90s; override with EXPO_TUNNEL_TIMEOUT_MS\n" +
  "const TUNNEL_TIMEOUT = Math.max(10000, parseInt(process.env.EXPO_TUNNEL_TIMEOUT_MS || '90000', 10));";

const bodyGuardOld =
  "if ((0, _NgrokResolver.isNgrokClientError)(error) && error.body.error_code === 103) {";
const bodyGuardNew =
  "if ((0, _NgrokResolver.isNgrokClientError)(error) && (error == null ? void 0 : error.body) && error.body.error_code === 103) {";

const target = cliCandidates.find((p) => fs.existsSync(p));
if (!target) {
  console.warn('[patch-expo-tunnel-timeout] AsyncNgrok.js not found. Skipping.');
  process.exit(0);
}

let source = fs.readFileSync(target, 'utf8');
let changed = false;

if (source.includes(timeoutOld)) {
  source = source.replace(timeoutOld, timeoutNew);
  changed = true;
}

if (source.includes(bodyGuardOld)) {
  source = source.replace(bodyGuardOld, bodyGuardNew);
  changed = true;
}

if (changed) {
  fs.writeFileSync(target, source);
  console.log('[patch-expo-tunnel-timeout] Applied Expo tunnel patches.');
} else {
  console.log('[patch-expo-tunnel-timeout] Already patched.');
}
