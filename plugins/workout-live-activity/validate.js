// node plugins/workout-live-activity/validate.js [--typecheck] [--keep]
// Exercises the real mod chain against a temporary generated extension, never ios/.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const plugin = require('../withWorkoutLiveActivity');

const projectRoot = path.resolve(__dirname, '../..');
const packageRoot = path.dirname(require.resolve('expo-live-activity/package.json'));
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fitnyx-live-activity-'));
const target = path.join(temporaryRoot, 'LiveActivity');
const upstreamRoot = path.join(packageRoot, 'ios-files');

function snapshot(directory) {
  const files = {};
  function visit(current) {
    for (const name of fs.readdirSync(current).sort()) {
      const item = path.join(current, name);
      if (fs.statSync(item).isDirectory()) visit(item);
      else files[path.relative(directory, item)] = crypto.createHash('sha256').update(fs.readFileSync(item)).digest('hex');
    }
  }
  visit(directory);
  return files;
}

async function main() {
  let baseRuns = 0;
  const config = plugin({
    name: 'FitNyx', slug: 'fitnyx-mobile',
    mods: { ios: { xcodeproj: async (cfg) => {
      baseRuns += 1;
      fs.cpSync(upstreamRoot, target, { recursive: true });
      return cfg;
    } } },
  });
  const run = () => config.mods.ios.xcodeproj({
    modRequest: { projectRoot, platformProjectRoot: temporaryRoot },
    modResults: { sentinel: 'preserve-the-xcode-project' },
  });
  const first = await run();
  const firstSnapshot = snapshot(target);
  const second = await run();
  assert.deepEqual(snapshot(target), firstSnapshot, 'Repeated base generation + custom plugin must be byte-for-byte idempotent.');
  assert.equal(baseRuns, 2, 'The package generation runs before each customization.');
  assert.deepEqual(first.modResults, second.modResults, 'The Xcode project must be returned unmodified.');
  assert.equal(second.modResults.sentinel, 'preserve-the-xcode-project');

  const generated = fs.readFileSync(path.join(target, 'LiveActivityWidget.swift'), 'utf8');
  const upstream = fs.readFileSync(path.join(upstreamRoot, 'LiveActivityWidget.swift'), 'utf8');
  const schema = upstream.slice(0, upstream.indexOf('@available(iOS 16.1, *)\npublic struct LiveActivityWidget'));
  assert.ok(generated.startsWith(schema), 'The native Codable schema must remain exactly the package version.');
  assert.ok(generated.includes('struct WorkoutLockScreenCard'), 'The package copy must not overwrite custom Swift.');
  assert.ok(!/__[A-Z_]+__/.test(generated), 'All color placeholders must be resolved.');
  assert.ok(generated.includes('Color(hex: "#5fc793")'), 'Mint must be imported from current theme tokens.');
  assert.equal((generated.match(/public struct LiveActivityWidget: Widget/g) || []).length, 1);
  const assets = JSON.parse(fs.readFileSync(path.join(target, 'Assets.xcassets/FitNyxStrength.imageset/Contents.json'), 'utf8'));
  assert.equal(assets.images[0].filename, 'strength-equipment.png');
  assert.deepEqual(
    fs.readFileSync(path.join(target, 'Assets.xcassets/FitNyxStrength.imageset/strength-equipment.png')),
    fs.readFileSync(path.join(projectRoot, 'assets/images/workouts/strength-equipment.png')),
  );

  // Register against a real project fixture too: both targets need the intent,
  // and regenerating must not duplicate build sources or compiler conditions.
  const xcode = require('xcode');
  const project = xcode.project(path.join(projectRoot, 'ios/FitNyx.xcodeproj/project.pbxproj')).parseSync();
  fs.mkdirSync(path.join(temporaryRoot, 'FitNyx'), { recursive: true });
  plugin.registerWorkoutControls(projectRoot, temporaryRoot, project);
  const registered = project.writeSync();
  plugin.registerWorkoutControls(projectRoot, temporaryRoot, project);
  assert.equal(project.writeSync(), registered, 'Native target registration must be idempotent.');
  const native = fs.readFileSync(path.join(temporaryRoot, 'FitNyx/WorkoutControlIntent.swift'), 'utf8');
  assert.ok(native.includes('openAppWhenRun = false'));
  assert.ok(generated.includes('Button(intent: WorkoutControlIntent'));
  assert.ok(!generated.includes('notificationAction'));
  assert.ok(registered.includes('FITNYX_APP'));

  if (process.argv.includes('--typecheck')) {
    const sdk = execFileSync('xcrun', ['--sdk', 'iphonesimulator', '--show-sdk-path'], { encoding: 'utf8' }).trim();
    const files = fs.readdirSync(target).filter((name) => name.endsWith('.swift')).map((name) => path.join(target, name));
    execFileSync('xcrun', [
      'swiftc', '-typecheck', '-parse-as-library', '-application-extension',
      '-sdk', sdk, '-target', 'arm64-apple-ios16.2-simulator', ...files,
    ], { stdio: 'inherit' });
  }
  console.log(`Workout Live Activity validation passed: mod ordering, idempotence, native schema, theme, asset${process.argv.includes('--typecheck') ? ', Swift typecheck' : ''}.`);
  if (process.argv.includes('--keep')) console.log(`Generated fixture: ${target}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => {
  if (!process.argv.includes('--keep')) fs.rmSync(temporaryRoot, { recursive: true, force: true });
});
