import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from '@/lib/auth/redirect';

describe('safeRedirectPath', () => {
  it('keeps a path on this origin', () => {
    expect(safeRedirectPath('/dashboard')).toBe('/dashboard');
    expect(safeRedirectPath('/transactions/abc?tab=chat#top')).toBe(
      '/transactions/abc?tab=chat#top'
    );
  });

  it('falls back to the dashboard when there is no path', () => {
    expect(safeRedirectPath(null)).toBe('/dashboard');
    expect(safeRedirectPath('')).toBe('/dashboard');
  });

  it('rejects a protocol-relative authority', () => {
    expect(safeRedirectPath('//evil.com')).toBe('/dashboard');
    expect(safeRedirectPath('//evil.com/path')).toBe('/dashboard');
  });

  it('rejects a backslash-smuggled authority', () => {
    // The WHATWG URL parser treats a backslash as a forward slash in a
    // special-scheme URL, so '/\evil.com' resolves to 'https://evil.com/'.
    expect(safeRedirectPath('/\\evil.com')).toBe('/dashboard');
    expect(safeRedirectPath('/\\evil.com/path')).toBe('/dashboard');
    expect(safeRedirectPath('\\evil.com')).toBe('/dashboard');
  });

  it('rejects an absolute URL and a scheme-relative one', () => {
    expect(safeRedirectPath('https://evil.com')).toBe('/dashboard');
    expect(safeRedirectPath('http://evil.com/x')).toBe('/dashboard');
    expect(safeRedirectPath('javascript:alert(1)')).toBe('/dashboard');
    expect(safeRedirectPath('dashboard')).toBe('/dashboard');
  });

  it('never resolves to a foreign origin', () => {
    const candidates = [
      '/\\evil.com',
      '//evil.com',
      'https://evil.com',
      '/%5Cevil.com',
      '/..//evil.com',
      '/path\\..\\..//evil.com',
    ];
    for (const candidate of candidates) {
      const result = safeRedirectPath(candidate);
      expect(result.startsWith('/')).toBe(true);
      const resolved = new URL(result, 'https://app.example');
      expect(resolved.origin).toBe('https://app.example');
    }
  });
});
