// Drops the notification small icon (vector drawable) and large icon (PNG)
// into the Android res/ tree during prebuild. Needed because `expo prebuild --clean`
// (used by EAS) wipes android/ and regenerates from app.json — without this plugin
// custom drawables would be lost.

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withNotifIcon(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const resRoot = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res');

      // Small icon (vector, monochrome white silhouette)
      const drawableDir = path.join(resRoot, 'drawable');
      fs.mkdirSync(drawableDir, { recursive: true });
      const smallSrc = path.join(projectRoot, 'assets/notif/ic_stat_notification.xml');
      const smallFallback = path.join(projectRoot, 'android/app/src/main/res/drawable/ic_stat_notification.xml');
      const smallChosen = fs.existsSync(smallSrc) ? smallSrc : smallFallback;
      if (fs.existsSync(smallChosen)) {
        fs.copyFileSync(smallChosen, path.join(drawableDir, 'ic_stat_notification.xml'));
      }

      // Large icon (PNG, full color, ~256x256)
      const drawableXxhdpi = path.join(resRoot, 'drawable-xxhdpi');
      fs.mkdirSync(drawableXxhdpi, { recursive: true });
      const largeSrc = path.join(projectRoot, 'assets/notif/notif_large.png');
      if (fs.existsSync(largeSrc)) {
        fs.copyFileSync(largeSrc, path.join(drawableXxhdpi, 'notif_large.png'));
        // Also copy to base drawable/ so it resolves at any density
        fs.copyFileSync(largeSrc, path.join(drawableDir, 'notif_large.png'));
      }

      return cfg;
    },
  ]);
};
