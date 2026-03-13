import { cacheKeys, cacheTTL, staleTime } from '../keys';

describe('cacheKeys', () => {
  it('generates userProfile key', () => {
    expect(cacheKeys.userProfile('abc123')).toBe('user:abc123');
  });

  it('generates userMetrics key', () => {
    expect(cacheKeys.userMetrics('abc123')).toBe('metrics:abc123');
  });

  it('generates onboardingStatus key', () => {
    expect(cacheKeys.onboardingStatus('abc123')).toBe('onboarding:abc123');
  });

  it('generates workoutPlans key', () => {
    expect(cacheKeys.workoutPlans('abc123')).toBe('plans:abc123');
  });

  it('has static exercises key', () => {
    expect(cacheKeys.exercises).toBe('exercises:all');
  });

  it('has static exerciseCategories key', () => {
    expect(cacheKeys.exerciseCategories).toBe('exercises:categories');
  });
});

describe('cacheTTL', () => {
  it('SHORT is 1 minute', () => {
    expect(cacheTTL.SHORT).toBe(60_000);
  });

  it('MEDIUM is 5 minutes', () => {
    expect(cacheTTL.MEDIUM).toBe(300_000);
  });

  it('LONG is 30 minutes', () => {
    expect(cacheTTL.LONG).toBe(1_800_000);
  });

  it('VERY_LONG is 60 minutes', () => {
    expect(cacheTTL.VERY_LONG).toBe(3_600_000);
  });

  it('DAY is 24 hours', () => {
    expect(cacheTTL.DAY).toBe(86_400_000);
  });
});

describe('staleTime', () => {
  it('INSTANT is 0', () => {
    expect(staleTime.INSTANT).toBe(0);
  });

  it('SHORT is 10 seconds', () => {
    expect(staleTime.SHORT).toBe(10_000);
  });

  it('MEDIUM is 30 seconds', () => {
    expect(staleTime.MEDIUM).toBe(30_000);
  });

  it('LONG is 60 seconds', () => {
    expect(staleTime.LONG).toBe(60_000);
  });
});
