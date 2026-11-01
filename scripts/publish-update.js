#!/usr/bin/env node
// Publishes an OTA update (EAS Update) built with exactly the env of the
// matching EAS build profile in eas.json — never with the local .env files.
//
//   npm run update:production -- "Fix the Roam pause button"
//   npm run update:preview -- "Try the new Home card"
//   node scripts/publish-update.js production "msg" --dry-run   (build + check only)
//
// Why: `eas update` bundles on this machine, and the local .env points the app
// at http://localhost:8080. Published as-is, every installed app would talk to
// localhost and break. This script bundles with EXPO_NO_DOTENV=1 + the profile
// env, checks the bundle really contains the production backend, then uploads
// that bundle with --skip-bundler.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const [channel, message] = args.filter((a) => a !== '--dry-run');
const easJson = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));
const profile = easJson.build?.[channel];

if (!['production', 'preview'].includes(channel) || !profile?.env) {
  console.error('usage: node scripts/publish-update.js production|preview "<message>"');
  process.exit(1);
}
if (!message || !message.trim()) {
  console.error('An update message is required (shown in the EAS dashboard).');
  process.exit(1);
}

const outDir = path.join(root, 'dist-update');
// Only the profile's EXPO_PUBLIC_* values may reach the bundle.
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('EXPO_PUBLIC_')));
Object.assign(env, profile.env, { EXPO_NO_DOTENV: '1', NODE_ENV: 'production' });

const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, env, stdio: 'inherit' });

fs.rmSync(outDir, { recursive: true, force: true });
run('npx', ['expo', 'export', '--platform', 'android', '--platform', 'ios', '--source-maps', '--output-dir', outDir, '--clear']);

// Every native bundle must carry the profile's backend and Supabase URLs. Neither
// appears in the source, so finding them proves the profile env was inlined
// (the code's own localhost fallback is always in the bundle, so don't test for that).
const bundles = [];
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
  const p = path.join(dir, e.name);
  if (e.isDirectory()) walk(p);
  else if (/\.(hbc|js)$/.test(e.name) && !e.name.endsWith('.map')) bundles.push(p);
});
walk(path.join(outDir, '_expo'));
if (bundles.length === 0) throw new Error('No bundles found in ' + outDir);
const backend = profile.env.EXPO_PUBLIC_BACKEND_URL;
for (const file of bundles) {
  const text = fs.readFileSync(file).toString('latin1');
  for (const expected of [backend, profile.env.EXPO_PUBLIC_SUPABASE_URL]) {
    if (!text.includes(expected)) throw new Error(`${path.relative(root, file)} does not contain ${expected} — not publishing.`);
  }
}
console.log(`\n✓ ${bundles.length} bundles use ${backend}\n`);
if (dryRun) {
  console.log('Dry run: nothing published.');
  process.exit(0);
}

run('npx', ['eas', 'update', '--channel', channel, '--message', message, '--skip-bundler', '--input-dir', outDir, '--non-interactive']);

// Readable stack traces for crashes in this update (needs the token EAS builds use).
if (process.env.SENTRY_AUTH_TOKEN) {
  run('npx', ['sentry-expo-upload-sourcemaps', outDir]);
} else {
  console.warn('\nSENTRY_AUTH_TOKEN not set: source maps were not uploaded, so Sentry shows minified stacks for this update.');
}
