// Test process preload. Redirect production-looking API URLs to an isolated fixture.
// This file is never referenced by application code or a production build.
const http = require('node:http');
const https = require('node:https');
const { syncBuiltinESMExports } = require('node:module');
const fixture = process.env.STAGE2B_FIXTURE_API;
if (!fixture || new URL(fixture).hostname !== '127.0.0.1') throw new Error('Missing local Stage 2B fixture API');
const originalHttp = http.request.bind(http), originalHttps = https.request.bind(https);
function redirect(input) {
  const url = input instanceof URL ? input : typeof input === 'string' ? new URL(input) : null;
  if (url?.hostname === 'api.skufnya.com') {
    if (!url.pathname.startsWith('/api/catalog/') && url.pathname !== '/api/shipping/policy') throw new Error('Production API blocked in fixture build: ' + url.pathname);
    return new URL(url.pathname + url.search, fixture);
  }
  if (url && !['127.0.0.1', 'localhost', '[::1]', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) throw new Error('External network blocked in fixture build: ' + url.hostname);
  return null;
}
https.request = function(input, ...args) {
  const local = redirect(input);
  return local ? originalHttp(local, ...args) : originalHttps(input, ...args);
};
http.request = function(input, ...args) {
  const local = redirect(input);
  return originalHttp(local || input, ...args);
};
syncBuiltinESMExports();
const originalFetch = globalThis.fetch;
globalThis.fetch = function(input, init) {
  const url = input instanceof Request ? input.url : input;
  const local = redirect(url);
  return originalFetch(local ? input instanceof Request ? new Request(local, input) : local : input, init);
};
