const { withDangerousMod, withAndroidManifest, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
function writeRoamAndroid(root) {
  const source = path.join(__dirname, 'roam-notification');
  const main = path.join(root, 'app/src/main');
  const java = path.join(main, 'java/com/fitnyx/app');
  fs.mkdirSync(java, { recursive: true });
  fs.copyFileSync(path.join(source, 'FitNyxRoamControls.kt'), path.join(java, 'FitNyxRoamControls.kt'));
  fs.mkdirSync(path.join(main, 'res/layout'), { recursive: true });
  fs.copyFileSync(path.join(source, 'roam_notification.xml'), path.join(main, 'res/layout/roam_notification.xml'));
  for (const [name, color] of Object.entries({ primary: '#5FC793', secondary: '#23382E' })) {
    fs.writeFileSync(path.join(main, `res/drawable/roam_${name}.xml`), `<shape xmlns:android="http://schemas.android.com/apk/res/android"><solid android:color="${color}"/><corners android:radius="24dp"/></shape>`);
  }
}
module.exports = function withRoamNotification(config) {
  config = withAndroidManifest(config, (c) => {
    const app = c.modResults.manifest.application[0];
    app.receiver = app.receiver || [];
    if (!app.receiver.some((r) => r.$['android:name'] === '.RoamControlReceiver')) app.receiver.push({ $: { 'android:name': '.RoamControlReceiver', 'android:exported': 'false' } });
    return c;
  });
  config = withMainApplication(config, (c) => {
    if (!c.modResults.contents.includes('add(FitNyxRoamControlsPackage())')) {
      const marker = 'PackageList(this).packages.apply {';
      if (!c.modResults.contents.includes(marker)) throw new Error('Review MainApplication package registration for Roam controls.');
      c.modResults.contents = c.modResults.contents.replace(marker, marker + '\n              add(FitNyxRoamControlsPackage())');
    }
    return c;
  });
  return withDangerousMod(config, ['android', async (c) => { writeRoamAndroid(c.modRequest.platformProjectRoot); return c; }]);
};
module.exports.writeRoamAndroid = writeRoamAndroid;
