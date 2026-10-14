// Register after expo-live-activity. Its xcodeproj mod generates the extension;
// this post-processing mod keeps our layout reproducible after every prebuild.
const { withBaseMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const WIDGET_MARKER = '@available(iOS 16.1, *)\npublic struct LiveActivityWidget';
const REQUIRED_FIELDS = ['elapsedTimerStartDateInMilliseconds', 'progress', 'subtitle', 'deepLinkUrl'];

function themeColors(projectRoot) {
  const source = fs.readFileSync(path.join(projectRoot, 'src/theme/colors.ts'), 'utf8');
  const dark = source.slice(source.indexOf('dark:'), source.indexOf('light:'));
  const values = {};
  for (const [placeholder, token] of Object.entries({
    BACKGROUND: 'background', SURFACE: 'accentSoft', PRIMARY: 'primary',
    PRIMARY_TEXT: 'primaryText', TEXT: 'text', MUTED: 'mutedText',
  })) {
    const match = dark.match(new RegExp(`\\b${token}:\\s*['\"](#[0-9a-fA-F]{6})['\"]`));
    if (!match) throw new Error(`[withWorkoutLiveActivity] Missing dark.${token} hex color in src/theme/colors.ts.`);
    values[placeholder] = match[1];
  }
  return values;
}

function writeWorkoutLiveActivity(projectRoot, platformProjectRoot) {
  const packageRoot = path.dirname(require.resolve('expo-live-activity/package.json', { paths: [projectRoot] }));
  const upstream = fs.readFileSync(path.join(packageRoot, 'ios-files/LiveActivityWidget.swift'), 'utf8');
  const marker = upstream.indexOf(WIDGET_MARKER);
  if (marker < 0 || REQUIRED_FIELDS.some((field) => !upstream.slice(0, marker).includes(field))) {
    throw new Error('[withWorkoutLiveActivity] expo-live-activity native schema changed; review the custom widget before building.');
  }

  const target = path.join(platformProjectRoot, 'LiveActivity');
  if (!fs.existsSync(path.join(target, 'LiveActivityWidget.swift'))) {
    throw new Error('[withWorkoutLiveActivity] Register this plugin after expo-live-activity so the LiveActivity target exists.');
  }

  let template = fs.readFileSync(path.join(__dirname, 'workout-live-activity/LiveActivityWidget.swift'), 'utf8');
  for (const [key, value] of Object.entries(themeColors(projectRoot))) {
    template = template.replaceAll(`__${key}__`, value);
  }
  if (/__[A-Z_]+__/.test(template)) throw new Error('[withWorkoutLiveActivity] An unresolved Swift template token remains.');

  // Preserve the package's exact Codable schema, including fields unrelated to
  // workouts. Reuse the already registered filename: no duplicate Xcode sources.
  fs.writeFileSync(path.join(target, 'LiveActivityWidget.swift'), upstream.slice(0, marker) + template);

  const imageSet = path.join(target, 'Assets.xcassets/FitNyxStrength.imageset');
  fs.mkdirSync(imageSet, { recursive: true });
  fs.copyFileSync(path.join(projectRoot, 'assets/images/workouts/strength-equipment.png'), path.join(imageSet, 'strength-equipment.png'));
  fs.writeFileSync(path.join(imageSet, 'Contents.json'), JSON.stringify({
    images: [{ filename: 'strength-equipment.png', idiom: 'universal' }],
    info: { author: 'xcode', version: 1 },
  }, null, 2) + '\n');
}

module.exports = function withWorkoutLiveActivity(config) {
  return withBaseMod(config, {
    platform: 'ios',
    mod: 'xcodeproj',
    async action({ modRequest: { nextMod, ...modRequest }, ...rest }) {
      // Expo wraps mods in reverse registration order. Await the original chain
      // first, otherwise expo-live-activity would overwrite our files afterward.
      const generated = await nextMod({ ...rest, modRequest });
      writeWorkoutLiveActivity(modRequest.projectRoot, modRequest.platformProjectRoot);
      return generated;
    },
  });
};

module.exports.writeWorkoutLiveActivity = writeWorkoutLiveActivity;
