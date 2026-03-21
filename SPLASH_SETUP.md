# Splash Screen Setup Guide
# ────────────────────────────────────────────────────────────────────────────

## 1  Install dependencies

```bash
npx expo install react-native-svg
npx expo install expo-splash-screen
```

## 2  Add the component

Copy `SplashScreen.jsx` into your project (e.g. `src/screens/SplashScreen.jsx`).

## 3  Hide the native splash before showing your animated one

Expo shows a **static** native splash screen while JavaScript loads.
You must keep it visible, then hide it once your animated screen is ready.

In your `App.js` / `App.tsx`:

```jsx
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useState, useCallback } from 'react';
import { View } from 'react-native';
import AnimatedSplash from './src/screens/SplashScreen';

// Keep the native splash visible while JS loads
ExpoSplashScreen.preventAutoHideAsync();

export default function App() {
  const [showAnimated, setShowAnimated] = useState(true);

  const onLayoutRootView = useCallback(async () => {
    // Hide the NATIVE splash as soon as the root view mounts
    await ExpoSplashScreen.hideAsync();
  }, []);

  if (showAnimated) {
    return (
      <AnimatedSplash
        onAnimationComplete={() => setShowAnimated(false)}
      />
    );
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      {/* Your real app content */}
    </View>
  );
}
```

## 4  app.json — static splash config (shown before JS loads)

Update your `app.json` to use a dark background that matches the animation:

```json
{
  "expo": {
    "name": "YourApp",
    "slug": "your-app",
    "splash": {
      "backgroundColor": "#050505",
      "resizeMode": "contain",
      "image": "./assets/splash-logo.png"
    },
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#050505"
      }
    }
  }
}
```

For `splash.image` export a PNG of your logo from the SVG
(e.g. a 1080×1080 or 2048×2048 transparent PNG on a #050505 background).

## 5  Generating the static PNG (for app.json splash)

Quick option — open `logoSVG.svg` in Figma/Illustrator and export as:
  • 2048×2048 PNG with background color #050505
  • Save as `assets/splash-logo.png`

Or from CLI using Inkscape:
```bash
inkscape --export-type=png --export-filename=assets/splash-logo.png \
  --export-width=2048 --export-height=2048 logoSVG.svg
```

## 6  Timing summary

| Stage | Duration | What happens |
|-------|----------|--------------|
| 0–1.2s | 1.2s | Energy glow fades + scales in |
| 0.5–2.0s | 1.5s | Stroke paths appear |
| 1.2–2.2s | 1.0s | Logo fill fades in |
| 1.8–2.6s | 0.8s | Strokes fade out |
| 1.8–3.0s | 1.2s | Shimmer sweep |
| 2.4s | spring | Scale pop |
| 3.0s+ | loop | Gentle float + glow pulse |
| 4.0s | — | `onAnimationComplete` fires → navigate to app |

## 7  Optional: Lottie version

For the smoothest possible experience (especially path-draw animations),
convert the animation to Lottie JSON using Adobe After Effects + Bodymovin.
Then use `lottie-react-native`:

```bash
npx expo install lottie-react-native
```

```jsx
import LottieView from 'lottie-react-native';
import splashAnim from './assets/splash.json';

<LottieView
  source={splashAnim}
  autoPlay
  loop={false}
  onAnimationFinish={onAnimationComplete}
  style={{ width: 300, height: 300 }}
/>
```

## Notes
- `react-native-svg` fully supports `<Path>`, `<LinearGradient>`, `<RadialGradient>`.
- The stroke-dashoffset draw effect from the web version is NOT directly
  supported by react-native-svg. The component uses opacity fading as a
  visually equivalent substitute. For true path-draw, use Lottie.
- Test on a real device — iOS Simulator and Android Emulator may not render
  shadows and glows the same way as physical hardware.
