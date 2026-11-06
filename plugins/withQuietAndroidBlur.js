const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

// A fully transparent 2×2 WebP.
const TRANSPARENT_WEBP = 'UklGRhoAAABXRUJQVlA4TA0AAAAvAUAAEAcQERGIiP4HAA==';

/**
 * Android's blur library (Dimezis BlurView, via expo-blur) always lays a grain texture
 * over the blur and has no setting to turn it off. Under the dock, that grain has a hard
 * top edge: a visible line across the screen (reported 2026-11-06). An app's resource
 * replaces a library's of the same name, so this swaps the grain for a transparent image.
 * If the library renames blue_noise.webp in an update, the grain and the line come back.
 */
module.exports = function withQuietAndroidBlur(config) {
  return withDangerousMod(config, ['android', (cfg) => {
    const dir = path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res/drawable-nodpi-v4');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'blue_noise.webp'), Buffer.from(TRANSPARENT_WEBP, 'base64'));
    return cfg;
  }]);
};
