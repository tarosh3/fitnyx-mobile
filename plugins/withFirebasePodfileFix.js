const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to fix "non-modular header inside framework module" errors
 * from @react-native-firebase when used with useFrameworks: static.
 *
 * The CLANG setting must be set on the xcconfig level (OTHER_CFLAGS) to take effect
 * before compilation. Setting it via build_settings alone is not enough when xcconfig
 * files override build settings.
 */
const withFirebasePodfileFix = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf-8');

      const marker = 'RNFB_FRAMEWORK_FIX_APPLIED';

      if (!contents.includes(marker)) {
        const rnfbFix = `
  # ${marker}
  # Fix: @react-native-firebase non-modular header compilation errors with useFrameworks: static
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |build_config|
      build_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      # Also add as compiler flag in case xcconfig overrides build_settings
      existing_flags = build_config.build_settings['OTHER_CFLAGS'] || '$(inherited)'
      unless existing_flags.include?('-Wno-non-modular-include-in-framework-module')
        build_config.build_settings['OTHER_CFLAGS'] = "#{existing_flags} -Wno-non-modular-include-in-framework-module"
      end
    end
  end
`;
        // Inject right after the post_install opening line
        contents = contents.replace(
          'post_install do |installer|',
          `post_install do |installer|${rnfbFix}`
        );
        fs.writeFileSync(podfilePath, contents);
      }

      return config;
    },
  ]);
};

module.exports = withFirebasePodfileFix;
