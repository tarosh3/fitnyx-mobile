import { changeMessage, displayName, friendErrorMessage, normalizeSearch, relationshipAfter, relationshipButton } from '../model';

describe('friends model', () => {
  it('maps each relationship to its button', () => {
    expect(relationshipButton('none')).toEqual({ label: 'Add', action: 'send', primary: true });
    expect(relationshipButton('request_received')).toEqual({ label: 'Accept', action: 'accept', primary: true });
    expect(relationshipButton('request_sent').action).toBe('cancel');
    expect(relationshipButton('blocked').action).toBe('unblock');
    expect(relationshipButton('friends').action).toBeNull();
  });

  it('works out the relationship after an action', () => {
    expect(relationshipAfter('send', 'request_sent')).toBe('request_sent');
    // They had already asked: sending accepts.
    expect(relationshipAfter('send', 'friends')).toBe('friends');
    expect(relationshipAfter('accept')).toBe('friends');
    expect(relationshipAfter('cancel')).toBe('none');
    expect(relationshipAfter('unblock')).toBe('none');
    expect(relationshipAfter('remove')).toBe('none');
    expect(relationshipAfter('block')).toBe('blocked');
  });

  it('normalizes a search like the backend', () => {
    expect(normalizeSearch('  @Kapil_9 ')).toBe('kapil_9');
    expect(normalizeSearch('k.s')).toBe('k.s');
    for (const q of ['', '@', 'kapil sharma', 'a%', 'ü', 'x'.repeat(31)]) expect(normalizeSearch(q)).toBe('');
  });

  it('shows the name, else the handle', () => {
    expect(displayName({ name: 'Kapil Sharma', username: 'kapil' })).toBe('Kapil Sharma');
    expect(displayName({ name: null, username: 'kapil' })).toBe('@kapil');
    expect(displayName({ name: '  ', username: 'kapil' })).toBe('@kapil');
  });

  it('explains errors', () => {
    expect(friendErrorMessage(new Error('Network request failed'))).toMatch(/offline/);
    expect(friendErrorMessage({ status: 409, code: 'FRIEND_LIMIT' })).toMatch(/1,000 friends/);
    expect(friendErrorMessage({ status: 429 })).toMatch(/Slow down/);
    expect(friendErrorMessage({ status: 500, code: 'WHATEVER' })).toMatch(/went wrong/);
  });

  it('confirms changes', () => {
    expect(changeMessage('send', 'request_sent', 'kapil')).toBe('Request sent to @kapil');
    // Asking someone who had asked first makes friends at once.
    expect(changeMessage('send', 'friends', 'kapil')).toBe('You and @kapil are now friends');
    expect(changeMessage('accept', 'friends', 'kapil')).toBe('You and @kapil are now friends');
    expect(changeMessage('decline', 'none', 'kapil')).toBeNull();
    expect(changeMessage('block', 'blocked', 'kapil')).toBe('Blocked @kapil');
  });
});
