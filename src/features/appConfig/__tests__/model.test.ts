import { appNotices, compareVersions, parseAppConfig, STORE_URL } from '../model';

const base = {
  min_version: '1.0.0',
  latest_version: '1.0.0',
  update_url_android: null,
  update_url_ios: null,
  maintenance_message: null,
  banner_message: null,
  banner_level: 'info',
  features: {},
};

describe('compareVersions', () => {
  it.each([
    ['1.0.0', '1.0.0', 0],
    ['1.2', '1.2.0', 0],
    ['1.0.9', '1.1.0', -1],
    ['1.10.0', '1.9.0', 1],
    ['2', '1.99.99', 1],
    ['1.0.0-beta', '9.0.0', 0],
  ])('%s vs %s → %d', (a, b, want) => expect(compareVersions(a, b)).toBe(want));
});

describe('parseAppConfig', () => {
  it('rejects malformed bodies', () => {
    expect(parseAppConfig(null)).toBeNull();
    expect(parseAppConfig('x')).toBeNull();
    expect(parseAppConfig({ ...base, min_version: 'one' })).toBeNull();
    expect(parseAppConfig({ ...base, latest_version: undefined })).toBeNull();
  });

  it('keeps only boolean flags, https URLs and non-blank text', () => {
    const cfg = parseAppConfig({
      ...base,
      update_url_android: 'http://evil.example',
      update_url_ios: 'https://apps.apple.com/app/id1',
      banner_message: '   ',
      banner_level: 'loud',
      features: { arena: true, beta: 'yes', n: 1 },
    })!;
    expect(cfg.update_url_android).toBeNull();
    expect(cfg.update_url_ios).toBe('https://apps.apple.com/app/id1');
    expect(cfg.banner_message).toBeNull();
    expect(cfg.banner_level).toBe('info');
    expect(cfg.features).toEqual({ arena: true });
  });
});

describe('appNotices', () => {
  const cfg = (over: Partial<typeof base>) => parseAppConfig({ ...base, ...over });

  it('nothing without a config', () => {
    expect(appNotices(null, '1.0.0', 'android', true)).toEqual({ block: null, softUpdate: null, banner: null });
  });

  it('forces an update below min_version, to the Play Store by default', () => {
    const n = appNotices(cfg({ min_version: '1.1.0', latest_version: '1.1.0' }), '1.0.0', 'android', false);
    expect(n.block).toEqual({ kind: 'update', url: STORE_URL.android });
    expect(n.softUpdate).toBeNull();
  });

  it('never blocks iOS without an update URL', () => {
    expect(appNotices(cfg({ min_version: '9.0.0' }), '1.0.0', 'ios', true).block).toBeNull();
    expect(appNotices(cfg({ min_version: '9.0.0', update_url_ios: 'https://apps.apple.com/app/id1' } as never), '1.0.0', 'ios', true).block)
      .toEqual({ kind: 'update', url: 'https://apps.apple.com/app/id1' });
  });

  it('never blocks the web export or an unknown version', () => {
    expect(appNotices(cfg({ min_version: '9.0.0' }), '1.0.0', 'web', true).block).toBeNull();
    expect(appNotices(cfg({ min_version: '9.0.0' }), null, 'android', true).block).toBeNull();
  });

  it('honours maintenance only from a fresh fetch', () => {
    const c = cfg({ maintenance_message: 'Upgrading the database' } as never);
    expect(appNotices(c, '1.0.0', 'android', true).block).toEqual({ kind: 'maintenance', message: 'Upgrading the database' });
    expect(appNotices(c, '1.0.0', 'android', false).block).toBeNull();
  });

  it('suggests a newer build and shows the banner', () => {
    const n = appNotices(cfg({ latest_version: '1.0.1', banner_message: 'Arena is live!', banner_level: 'warning' } as never), '1.0.0', 'android', true);
    expect(n.block).toBeNull();
    expect(n.softUpdate).toEqual({ url: STORE_URL.android, version: '1.0.1' });
    expect(n.banner).toEqual({ message: 'Arena is live!', level: 'warning' });
  });
});
