import {
  sanitizeName,
  sanitizeEmail,
  sanitizeNumericInt,
  sanitizeNumericDecimal,
  sanitizeGeneralText,
  sanitizeSearch,
  MAX_NAME,
  MAX_EMAIL,
  MAX_PASSWORD,
  MAX_SEARCH,
  MAX_SHORT_TEXT,
  MAX_MEDIUM_TEXT,
  MAX_LONG_TEXT,
  MAX_TITLE,
  MAX_NUMERIC_INT,
  MAX_NUMERIC_DEC,
} from '../validators';

describe('validators constants', () => {
  it('exports correct max-length values', () => {
    expect(MAX_NAME).toBe(50);
    expect(MAX_EMAIL).toBe(254);
    expect(MAX_PASSWORD).toBe(128);
    expect(MAX_SEARCH).toBe(100);
    expect(MAX_SHORT_TEXT).toBe(100);
    expect(MAX_MEDIUM_TEXT).toBe(200);
    expect(MAX_LONG_TEXT).toBe(500);
    expect(MAX_TITLE).toBe(50);
    expect(MAX_NUMERIC_INT).toBe(6);
    expect(MAX_NUMERIC_DEC).toBe(8);
  });
});

describe('sanitizeName', () => {
  it('keeps valid names unchanged', () => {
    expect(sanitizeName('John Doe')).toBe('John Doe');
  });

  it('keeps hyphens and apostrophes', () => {
    expect(sanitizeName("Jean-Francois O'Brien")).toBe("Jean-Francois O'Brien");
  });

  it('keeps unicode letters', () => {
    expect(sanitizeName('André Müller')).toBe('André Müller');
  });

  it('strips dangerous characters', () => {
    expect(sanitizeName('<script>alert("xss")</script>')).toBe('scriptalertxssscript');
  });

  it('strips digits and special chars', () => {
    expect(sanitizeName('John123!@#$%')).toBe('John');
  });

  it('truncates at MAX_NAME (50)', () => {
    const long = 'A'.repeat(60);
    expect(sanitizeName(long)).toHaveLength(50);
  });

  it('handles empty string', () => {
    expect(sanitizeName('')).toBe('');
  });
});

describe('sanitizeEmail', () => {
  it('keeps valid emails unchanged', () => {
    expect(sanitizeEmail('user@example.com')).toBe('user@example.com');
  });

  it('keeps plus addressing', () => {
    expect(sanitizeEmail('user+tag@example.com')).toBe('user+tag@example.com');
  });

  it('strips injection characters', () => {
    expect(sanitizeEmail("user'@example.com; DROP TABLE")).toBe('user@example.comDROPTABLE');
  });

  it('strips spaces', () => {
    expect(sanitizeEmail('user @ example.com')).toBe('user@example.com');
  });

  it('truncates at MAX_EMAIL (254)', () => {
    const long = 'a'.repeat(260) + '@test.com';
    expect(sanitizeEmail(long).length).toBeLessThanOrEqual(254);
  });

  it('handles empty string', () => {
    expect(sanitizeEmail('')).toBe('');
  });
});

describe('sanitizeNumericInt', () => {
  it('keeps digits only', () => {
    expect(sanitizeNumericInt('123')).toBe('123');
  });

  it('strips non-digit characters', () => {
    expect(sanitizeNumericInt('12abc3.45')).toBe('12345');
  });

  it('truncates at default max (6 digits)', () => {
    expect(sanitizeNumericInt('1234567890')).toBe('123456');
  });

  it('accepts custom maxLen', () => {
    expect(sanitizeNumericInt('12345', 3)).toBe('123');
  });

  it('strips XSS payload', () => {
    expect(sanitizeNumericInt('<script>1</script>')).toBe('1');
  });

  it('handles empty string', () => {
    expect(sanitizeNumericInt('')).toBe('');
  });
});

describe('sanitizeNumericDecimal', () => {
  it('keeps valid decimal', () => {
    expect(sanitizeNumericDecimal('72.5')).toBe('72.5');
  });

  it('allows only one decimal point', () => {
    expect(sanitizeNumericDecimal('72.5.3')).toBe('72.53');
  });

  it('strips non-numeric characters', () => {
    expect(sanitizeNumericDecimal('72kg.5lb')).toBe('72.5');
  });

  it('truncates at default max (8 chars)', () => {
    expect(sanitizeNumericDecimal('123456789.0')).toBe('12345678');
  });

  it('accepts custom maxLen', () => {
    expect(sanitizeNumericDecimal('123.456', 5)).toBe('123.4');
  });

  it('handles empty string', () => {
    expect(sanitizeNumericDecimal('')).toBe('');
  });

  it('handles leading decimal', () => {
    expect(sanitizeNumericDecimal('.5')).toBe('.5');
  });
});

describe('sanitizeGeneralText', () => {
  it('keeps normal text', () => {
    expect(sanitizeGeneralText('Hello world!', 100)).toBe('Hello world!');
  });

  it('strips dangerous characters', () => {
    expect(sanitizeGeneralText('<script>"alert(\'xss\');</script>', 100)).toBe(
      'scriptalert(xss)script'
    );
  });

  it('strips backslashes and forward slashes', () => {
    expect(sanitizeGeneralText('path\\to/file', 100)).toBe('pathtofile');
  });

  it('strips ampersand', () => {
    expect(sanitizeGeneralText('Tom & Jerry', 50)).toBe('Tom  Jerry');
  });

  it('truncates at maxLen', () => {
    const long = 'a'.repeat(200);
    expect(sanitizeGeneralText(long, 100)).toHaveLength(100);
  });

  it('handles empty string', () => {
    expect(sanitizeGeneralText('', 100)).toBe('');
  });
});

describe('sanitizeSearch', () => {
  it('delegates to sanitizeGeneralText with MAX_SEARCH', () => {
    expect(sanitizeSearch('test query')).toBe('test query');
  });

  it('truncates at MAX_SEARCH (100)', () => {
    const long = 'a'.repeat(150);
    expect(sanitizeSearch(long)).toHaveLength(100);
  });

  it('strips dangerous characters', () => {
    expect(sanitizeSearch('<script>alert("xss")</script>')).toBe(
      'scriptalert(xss)script'
    );
  });
});
