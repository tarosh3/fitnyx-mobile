import { oauthErrorFromParams, oauthErrorMessage } from '../oauthError';

describe('oauthErrorMessage', () => {
  it('reads a cancelled consent as cancelled', () => {
    expect(oauthErrorMessage('access_denied')).toBe('Sign in was cancelled.');
    expect(oauthErrorMessage('User+denied+access')).toBe('Sign in was cancelled.');
  });

  it('explains a Facebook account without an email', () => {
    expect(oauthErrorMessage('Error getting user email from external provider')).toMatch(/didn’t share an email/);
  });

  it('passes other messages through with + decoded', () => {
    expect(oauthErrorMessage('Something+broke')).toBe('Something broke');
    expect(oauthErrorMessage('')).toBe('Sign in wasn’t completed. Please try again.');
  });
});

describe('oauthErrorFromParams', () => {
  it('prefers error_description, falls back to error, across sources', () => {
    expect(oauthErrorFromParams(new URLSearchParams('error=access_denied&error_description=User+denied'))).toBe('User denied');
    expect(oauthErrorFromParams(new URLSearchParams(''), { error: 'server_error' })).toBe('server_error');
    expect(oauthErrorFromParams(new URLSearchParams('code=abc'), {})).toBeNull();
  });
});
