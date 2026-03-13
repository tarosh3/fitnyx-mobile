import { Platform } from 'react-native';

describe('backend config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.EXPO_PUBLIC_BACKEND_URL;
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getBackendBaseUrl', () => {
    it('returns default localhost:8080 when no env var', () => {
      const { getBackendBaseUrl } = require('../backend');
      expect(getBackendBaseUrl()).toBe('http://localhost:8080');
    });

    it('returns custom URL from env var', () => {
      process.env.EXPO_PUBLIC_BACKEND_URL = 'https://api.fitnyx.com';
      const { getBackendBaseUrl } = require('../backend');
      expect(getBackendBaseUrl()).toBe('https://api.fitnyx.com');
    });

    it('strips trailing slashes', () => {
      process.env.EXPO_PUBLIC_BACKEND_URL = 'https://api.fitnyx.com///';
      const { getBackendBaseUrl } = require('../backend');
      expect(getBackendBaseUrl()).toBe('https://api.fitnyx.com');
    });

    it('trims whitespace', () => {
      process.env.EXPO_PUBLIC_BACKEND_URL = '  https://api.fitnyx.com  ';
      const { getBackendBaseUrl } = require('../backend');
      expect(getBackendBaseUrl()).toBe('https://api.fitnyx.com');
    });
  });

  describe('getApiBaseUrl', () => {
    it('appends /api/v1 to backend URL by default', () => {
      const { getApiBaseUrl } = require('../backend');
      expect(getApiBaseUrl()).toBe('http://localhost:8080/api/v1');
    });

    it('uses explicit EXPO_PUBLIC_API_URL when set', () => {
      process.env.EXPO_PUBLIC_API_URL = 'https://custom-api.com/v2';
      const { getApiBaseUrl } = require('../backend');
      expect(getApiBaseUrl()).toBe('https://custom-api.com/v2');
    });

    it('ignores empty EXPO_PUBLIC_API_URL', () => {
      process.env.EXPO_PUBLIC_API_URL = '   ';
      const { getApiBaseUrl } = require('../backend');
      expect(getApiBaseUrl()).toBe('http://localhost:8080/api/v1');
    });
  });
});
