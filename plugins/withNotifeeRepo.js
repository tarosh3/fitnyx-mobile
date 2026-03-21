const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to add Notifee repository to the root build.gradle
 */
const withNotifeeRepo = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'gradle') {
      config.modResults.contents = addNotifeeRepo(config.modResults.contents);
    }
    return config;
  });
};

function addNotifeeRepo(buildGradle) {
  const notifeeRepo = 'maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }';
  
  // Check if it already exists
  if (buildGradle.includes(notifeeRepo)) {
    return buildGradle;
  }

  // Find the allprojects repositories block
  const searchPattern = /allprojects\s*{\s*repositories\s*{/g;
  const replacement = `allprojects {
  repositories {
    ${notifeeRepo}`;

  return buildGradle.replace(searchPattern, replacement);
}

module.exports = withNotifeeRepo;
