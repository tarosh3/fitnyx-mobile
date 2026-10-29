// Enable RNTL built-in matchers (toBeOnTheScreen, toHaveTextContent, etc.)
require('@testing-library/react-native/matchers');

// Mock AsyncStorage globally
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() =>
    Promise.resolve({ isConnected: true, isInternetReachable: true })
  ),
}));

// Mock expo-router
jest.mock('expo-router', () => ({ useIsFocused: () => true,
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => false),
  }),
  usePathname: () => '/',
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  Link: 'Link',
  Redirect: 'Redirect',
}));

// Mock expo-secure-store (native module — unavailable in the jest environment)
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
  WHEN_UNLOCKED: 'whenUnlocked',
}));

// Mock Supabase client
jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() =>
        Promise.resolve({
          data: { session: { access_token: 'test-token' } },
          error: null,
        })
      ),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
    },
  },
  getStoredUser: jest.fn(() => Promise.resolve(null)),
  getStoredSession: jest.fn(() => Promise.resolve(null)),
}));

// Mock react-native-reanimated. The bundled 'react-native-reanimated/mock' ships
// as ESM and fails to load under jest-expo, so provide a minimal inline mock
// covering the hooks/helpers the app uses (enough for Skeleton, animations, etc.).
jest.mock('react-native-reanimated', () => {
  const { View, Text, ScrollView, Image } = require('react-native');
  const noopStyle = () => ({});
  const makeShared = (value) => ({ value });
  return {
    __esModule: true,
    default: { View, Text, ScrollView, Image, createAnimatedComponent: (c) => c, call: () => {} },
    View,
    Text,
    ScrollView,
    Image,
    createAnimatedComponent: (c) => c,
    useSharedValue: (v) => makeShared(v),
    useAnimatedStyle: noopStyle,
    useAnimatedProps: (fn) => fn(),
    ReduceMotion: { System: 'system' },
    useDerivedValue: (fn) => makeShared(typeof fn === 'function' ? fn() : fn),
    useAnimatedScrollHandler: () => () => {},
    useReducedMotion: () => false,
    withTiming: (v) => v,
    withRepeat: (v) => v,
    withSpring: (v) => v,
    withDelay: (_d, v) => v,
    withSequence: (...v) => v[v.length - 1],
    cancelAnimation: () => {},
    runOnJS: (fn) => fn,
    runOnUI: (fn) => fn,
    interpolate: () => 0,
    Easing: new Proxy({}, { get: () => () => 0 }),
    Extrapolation: { CLAMP: 'clamp' },
  };
});

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  return new Proxy(
    {},
    {
      get: (_, name) => {
        const IconComponent = (props) => {
          return require('react').createElement(View, {
            ...props,
            testID: `icon-${String(name)}`,
          });
        };
        IconComponent.displayName = `Icon${String(name)}`;
        return IconComponent;
      },
    }
  );
});
