const { withAndroidManifest } = require('@expo/config-plugins');

// Health Connect write permissions FitNyx needs (one-way export of Roams,
// workouts and body weight). The react-native-health-connect plugin only wires
// the permission-rationale activity/intent-filter into the manifest; the actual
// android.permission.health.* uses-permission entries must be declared here.
const WRITE_PERMISSIONS = [
  'android.permission.health.WRITE_EXERCISE',
  'android.permission.health.WRITE_DISTANCE',
  'android.permission.health.WRITE_TOTAL_CALORIES_BURNED',
  'android.permission.health.WRITE_STEPS',
  'android.permission.health.WRITE_WEIGHT',
];

const withHealthConnectPermissions = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest['uses-permission'] = manifest['uses-permission'] || [];
    const existing = new Set(
      manifest['uses-permission'].map((p) => p.$ && p.$['android:name']).filter(Boolean),
    );
    for (const name of WRITE_PERMISSIONS) {
      if (!existing.has(name)) {
        manifest['uses-permission'].push({ $: { 'android:name': name } });
        existing.add(name);
      }
    }
    return cfg;
  });

module.exports = withHealthConnectPermissions;
