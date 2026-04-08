/**
 * Postinstall patches for Expo dev tunnels:
 * 1. Default tunnel = Expo WS tunnel (@expo/ws-tunnel → boltexpo.dev), not local ngrok (often broken with ngrok v3).
 * 2. Opt-in local ngrok: EXPO_USE_NGROK_TUNNEL=true
 * 3. Ngrok-only: longer timeout, safer error.body / error.response handling, ECONNREFUSED retries.
 *
 * WS tunnel requires Metro on port 8081 (Expo default). Do not use -p with another port for --tunnel.
 */
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

/** Before: throws if error.body is missing when isNgrokClientError is truthy. */
const assertNgrokMsgOld = `throw new _errors.CommandError('NGROK_CONNECT', [
                        error.body.msg,
                        (_error_body_details = error.body.details) == null ? void 0 : _error_body_details.err,`;
const assertNgrokMsgNew = `throw new _errors.CommandError('NGROK_CONNECT', [
                        (error == null || error.body == null ? void 0 : error.body.msg) ?? "Ngrok error",
                        (_error_body_details = error == null || error.body == null ? void 0 : error.body.details) == null ? void 0 : _error_body_details.err,`;

const ngrokClientPath = path.join(__dirname, '../node_modules/@expo/ngrok/src/client.js');

const ngrokRequestCatchOld = `    } catch (error) {
      let clientError;
      try {
        const response = JSON.parse(error.response.body);
        clientError = new NgrokClientError(
          response.msg,
          error.response,
          response
        );
      } catch (e) {
        clientError = new NgrokClientError(
          error.response.body,
          error.response,
          error.response.body
        );
      }
      throw clientError;
    }`;

const ngrokRequestCatchNew = `    } catch (error) {
      let clientError;
      if (error.response == null || error.response.body == null) {
        const message = (error && error.message) || String(error != null ? error : "Unknown error");
        clientError = new NgrokClientError(message, error && error.response, { msg: message, details: {} });
      } else {
      try {
        const response = JSON.parse(error.response.body);
        clientError = new NgrokClientError(
          response.msg,
          error.response,
          response
        );
      } catch (e) {
        clientError = new NgrokClientError(
          error.response.body,
          error.response,
          error.response.body
        );
      }
      }
      throw clientError;
    }`;

const ngrokBooleanCatchOld = `    } catch (error) {
      const response = JSON.parse(error.response.body);
      throw new NgrokClientError(response.msg, error.response, response);
    }`;

const ngrokBooleanCatchNew = `    } catch (error) {
      if (error.response == null || error.response.body == null) {
        const message = (error && error.message) || String(error != null ? error : "Unknown error");
        throw new NgrokClientError(message, error && error.response, { msg: message, details: {} });
      }
      const response = JSON.parse(error.response.body);
      throw new NgrokClientError(response.msg, error.response, response);
    }`;

// ─── AsyncNgrok (Expo CLI) ───────────────────────────────────────────────
const target = cliCandidates.find((p) => fs.existsSync(p));
if (!target) {
  console.warn('[patch-expo-tunnel-timeout] AsyncNgrok.js not found; skip (expo layout may have changed).');
} else {
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

  if (source.includes(assertNgrokMsgOld)) {
    source = source.replace(assertNgrokMsgOld, assertNgrokMsgNew);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(target, source);
    console.log('[patch-expo-tunnel-timeout] Applied Expo AsyncNgrok patches.');
  } else if (source.includes('patch-expo-tunnel-timeout.cjs')) {
    console.log('[patch-expo-tunnel-timeout] Expo AsyncNgrok already patched.');
  } else {
    console.warn('[patch-expo-tunnel-timeout] Some AsyncNgrok expected strings missing; check Expo version.');
  }
}

// ─── @expo/ngrok client (missing error.response on network errors) ─────────
if (!fs.existsSync(ngrokClientPath)) {
  console.warn('[patch-expo-tunnel-timeout] @expo/ngrok client.js not found; skip.');
} else {
  let ngrok = fs.readFileSync(ngrokClientPath, 'utf8');
  let nChanged = false;
  if (ngrok.includes(ngrokRequestCatchOld)) {
    ngrok = ngrok.replace(ngrokRequestCatchOld, ngrokRequestCatchNew);
    nChanged = true;
  }
  if (ngrok.includes(ngrokBooleanCatchOld)) {
    ngrok = ngrok.replace(ngrokBooleanCatchOld, ngrokBooleanCatchNew);
    nChanged = true;
  }
  if (nChanged) {
    fs.writeFileSync(ngrokClientPath, ngrok);
    console.log('[patch-expo-tunnel-timeout] Applied @expo/ngrok client.js patches.');
  } else if (ngrok.includes('error.response == null || error.response.body == null')) {
    console.log('[patch-expo-tunnel-timeout] @expo/ngrok client.js already patched.');
  } else {
    console.warn('[patch-expo-tunnel-timeout] @expo/ngrok client.js layout changed; skip ngrok patch.');
  }
}

// ─── @expo/ngrok utils (retry when local API not ready → ECONNREFUSED 127.0.0.1:4040) ──
const ngrokUtilsPath = path.join(__dirname, '../node_modules/@expo/ngrok/src/utils.js');
const isRetriableOld = `function isRetriable(err) {
  if (!err.response) {
    return false;
  }
  const statusCode = err.response.statusCode;`;

const isRetriableNew = `function isRetriable(err) {
  if (!err.response) {
    const code = err && err.code;
    const msg = err && err.message ? String(err.message) : '';
    if (
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' ||
      /ECONNREFUSED|ETIMEDOUT|socket hang up/i.test(msg)
    ) {
      return true;
    }
    return false;
  }
  const statusCode = err.response.statusCode;`;

if (!fs.existsSync(ngrokUtilsPath)) {
  console.warn('[patch-expo-tunnel-timeout] @expo/ngrok utils.js not found; skip.');
} else {
  let utilsSrc = fs.readFileSync(ngrokUtilsPath, 'utf8');
  if (utilsSrc.includes("code === 'ECONNREFUSED'")) {
    console.log('[patch-expo-tunnel-timeout] @expo/ngrok utils.js already patched.');
  } else if (utilsSrc.includes(isRetriableOld)) {
    utilsSrc = utilsSrc.replace(isRetriableOld, isRetriableNew);
    fs.writeFileSync(ngrokUtilsPath, utilsSrc);
    console.log('[patch-expo-tunnel-timeout] Applied @expo/ngrok utils.js isRetriable patch.');
  } else {
    console.warn('[patch-expo-tunnel-timeout] @expo/ngrok utils.js isRetriable block changed; skip.');
  }
}

// ─── BundlerDevServer: prefer Expo WS tunnel over local ngrok ──────────────
const bundlerCandidates = [
  path.join(__dirname, '../node_modules/expo/node_modules/@expo/cli/build/src/start/server/BundlerDevServer.js'),
  path.join(__dirname, '../node_modules/@expo/cli/build/src/start/server/BundlerDevServer.js'),
];
const tunnelPickOld =
  'this.tunnel = (0, _env.envIsWebcontainer)() ? new _AsyncWsTunnel.AsyncWsTunnel(this.projectRoot, port) : new _AsyncNgrok.AsyncNgrok(this.projectRoot, port);';
const tunnelPickNew =
  '// Patched: default Expo WS tunnel; set EXPO_USE_NGROK_TUNNEL=true for local ngrok\n' +
  '        this.tunnel = process.env.EXPO_USE_NGROK_TUNNEL === "1" || process.env.EXPO_USE_NGROK_TUNNEL === "true" ? new _AsyncNgrok.AsyncNgrok(this.projectRoot, port) : new _AsyncWsTunnel.AsyncWsTunnel(this.projectRoot, port);';

const bundlerDevServerPath = bundlerCandidates.find((p) => fs.existsSync(p));
if (!bundlerDevServerPath) {
  console.warn('[patch-expo-tunnel-timeout] BundlerDevServer.js not found; skip.');
} else {
  let b = fs.readFileSync(bundlerDevServerPath, 'utf8');
  if (b.includes('Patched: default Expo WS tunnel')) {
    console.log('[patch-expo-tunnel-timeout] BundlerDevServer tunnel pick already patched.');
  } else if (b.includes(tunnelPickOld)) {
    b = b.replace(tunnelPickOld, tunnelPickNew);
    fs.writeFileSync(bundlerDevServerPath, b);
    console.log('[patch-expo-tunnel-timeout] Applied BundlerDevServer: default WS tunnel.');
  } else {
    console.warn(
      '[patch-expo-tunnel-timeout] BundlerDevServer tunnel line not found; Expo CLI may have changed.',
    );
  }
}
