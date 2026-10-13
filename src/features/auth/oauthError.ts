/**
 * Plain-language text for the error a Google / Facebook redirect carries back
 * (`error` / `error_description` in the callback URL's query or hash).
 */
export function oauthErrorMessage(raw: string): string {
  const message = raw.replace(/\+/g, ' ').trim();
  const lower = message.toLowerCase();
  // Cancel / "Not now" on the provider's consent page.
  if (lower.includes('access_denied') || lower.includes('denied') || lower.includes('cancel')) {
    return 'Sign in was cancelled.';
  }
  // Facebook accounts made with a phone number may have no email to share.
  if (lower.includes('error getting user email')) {
    return 'Your account didn’t share an email address. Add one to it, or sign up with email instead.';
  }
  return message || 'Sign in wasn’t completed. Please try again.';
}

/** The provider error in a callback URL's query string or hash, if any. */
export function oauthErrorFromParams(...sources: (URLSearchParams | Record<string, unknown>)[]): string | null {
  for (const params of sources) {
    const get = (key: string) =>
      params instanceof URLSearchParams ? params.get(key) : typeof params[key] === 'string' ? (params[key] as string) : null;
    const value = get('error_description') || get('error');
    if (value) return value;
  }
  return null;
}
