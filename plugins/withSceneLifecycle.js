const { withInfoPlist, withAppDelegate } = require('expo/config-plugins');

// iOS 26/27 hard-crash apps that haven't adopted the UIScene lifecycle
// (EXC_BREAKPOINT in _UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption).
// Expo SDK 55 ships a window-based AppDelegate with no scene delegate, so we add
// one: a scene manifest pointing at a SceneDelegate that starts React Native in
// the window scene. (expo-build-properties `ios.enableSceneSupport` only exists
// in SDK 57+.)

const SCENE_MANIFEST = {
  UIApplicationSupportsMultipleScenes: false,
  UISceneConfigurations: {
    UIWindowSceneSessionRoleApplication: [
      {
        UISceneConfigurationName: 'Default Configuration',
        UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
      },
    ],
  },
};

const SCENE_DELEGATE = `
// UIScene lifecycle adoption (required on iOS 26/27). Added by withSceneLifecycle.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }
    let appDelegate = UIApplication.shared.delegate as? AppDelegate
    let window = UIWindow(windowScene: windowScene)
    appDelegate?.reactNativeFactory?.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: appDelegate?.sceneLaunchOptions)
    self.window = window
    appDelegate?.window = window
  }
}
`;

function patchAppDelegate(contents) {
  if (contents.includes('class SceneDelegate')) return contents; // idempotent

  let out = contents;

  if (!out.includes('import UIKit')) {
    out = out.replace(
      'import ReactAppDependencyProvider',
      'import ReactAppDependencyProvider\nimport UIKit'
    );
  }

  // Store launchOptions so the scene delegate can pass them to React Native.
  out = out.replace(
    'var reactNativeFactory: RCTReactNativeFactory?',
    'var reactNativeFactory: RCTReactNativeFactory?\n  var sceneLaunchOptions: [UIApplication.LaunchOptionsKey: Any]?'
  );

  // Move window creation + RN startup out of didFinishLaunching; the scene does it.
  out = out.replace(
    /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow[\s\S]*?launchOptions: launchOptions\)\n#endif\n/,
    '\n    self.sceneLaunchOptions = launchOptions\n'
  );

  // Append the SceneDelegate class at the end of the file.
  out = out.trimEnd() + '\n' + SCENE_DELEGATE;

  return out;
}

module.exports = function withSceneLifecycle(config) {
  config = withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest = SCENE_MANIFEST;
    return c;
  });

  config = withAppDelegate(config, (c) => {
    if (c.modResults.language !== 'swift') {
      throw new Error('withSceneLifecycle expects a Swift AppDelegate');
    }
    c.modResults.contents = patchAppDelegate(c.modResults.contents);
    return c;
  });

  return config;
};
