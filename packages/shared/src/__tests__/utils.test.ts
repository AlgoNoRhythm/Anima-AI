import { describe, it, expect } from 'vitest';
import {
  slugify,
  generateId,
  hashString,
  validateEmail,
  validateSlug,
  truncateText,
  formatFileSize,
  isValidFileType,
  isWithinSizeLimit,
} from '../utils';

describe('slugify', () => {
  it('converts text to lowercase slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(slugify('Hello, World! @#$')).toBe('hello-world');
  });

  it('handles multiple spaces and dashes', () => {
    expect(slugify('  Hello   World  ')).toBe('hello-world');
  });

  it('handles empty string', () => {
    expect(slugify('')).toBe('');
  });
});

describe('generateId', () => {
  it('returns a valid UUID', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe('hashString', () => {
  it('returns consistent hash for same input', () => {
    expect(hashString('test')).toBe(hashString('test'));
  });

  it('returns different hashes for different inputs', () => {
    expect(hashString('hello')).not.toBe(hashString('world'));
  });
});

describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name@domain.co')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('@domain.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });
});

describe('validateSlug', () => {
  it('accepts valid slugs', () => {
    expect(validateSlug('hello-world')).toBe(true);
    expect(validateSlug('my-project-123')).toBe(true);
    expect(validateSlug('test')).toBe(true);
  });

  it('rejects invalid slugs', () => {
    expect(validateSlug('Hello-World')).toBe(false);
    expect(validateSlug('has spaces')).toBe(false);
    expect(validateSlug('-leading-dash')).toBe(false);
    expect(validateSlug('trailing-dash-')).toBe(false);
    expect(validateSlug('')).toBe(false);
  });
});

describe('truncateText', () => {
  it('does not truncate short text', () => {
    expect(truncateText('short', 10)).toBe('short');
  });

  it('truncates long text with ellipsis', () => {
    expect(truncateText('this is a long string', 10)).toBe('this is...');
  });
});

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(1024 * 1024 * 5)).toBe('5.0 MB');
  });
});

describe('isValidFileType', () => {
  it('accepts PDF mime type', () => {
    expect(isValidFileType('application/pdf')).toBe(true);
  });

  it('rejects non-PDF mime types', () => {
    expect(isValidFileType('image/png')).toBe(false);
    expect(isValidFileType('text/plain')).toBe(false);
  });
});

describe('isWithinSizeLimit', () => {
  it('accepts files within limit', () => {
    expect(isWithinSizeLimit(1024 * 1024)).toBe(true);
  });

  it('rejects files over limit', () => {
    expect(isWithinSizeLimit(51 * 1024 * 1024)).toBe(false);
  });

  it('accepts custom limit', () => {
    expect(isWithinSizeLimit(1024, 0.001)).toBe(true);
  });
});
