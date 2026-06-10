import { describe, it, expect } from 'vitest';
import { generateMapping } from '../mapping.js';
import { scramble, descramble } from '../scrambler.js';

const mapping = generateMapping('scrambler-test-seed');

describe('scramble', () => {
  it('produces output of length 2x input', () => {
    const text = 'Hello, World!';
    const result = scramble(text, mapping);
    expect(result.length).toBe(text.length * 2);
  });

  it('output contains only lowercase a-z', () => {
    const text = 'All 95 chars: ~!@#$%^&*()_+-=[]{}|;:\'",.<>?/`0123456789';
    const result = scramble(text, mapping);
    expect(result).toMatch(/^[a-z]+$/);
  });

  it('passes through characters not in mapping', () => {
    const result = scramble('emoji: 🎉', mapping);
    expect(result).toContain('🎉');
    expect(descramble(result, mapping)).toBe('emoji: 🎉');
  });
});

describe('descramble', () => {
  it('passes through unknown sequences as individual characters', () => {
    const tiny = generateMapping('tiny', {
      charset: ['a'],
      scrambleAlphabet: 'xyz',
      seqLength: 2,
    });
    const assigned = tiny.charToScrambled.get('a')!;
    const unknown = assigned[0] === 'zz' ? 'xy' : 'zz';
    const result = descramble(unknown, tiny);
    // Unknown sequence chars pass through one at a time
    expect(result.length).toBe(2);
  });
});

describe('round-trip', () => {
  it('descramble(scramble(text)) === text', () => {
    const texts = [
      'Hello, World!',
      'The quick brown fox jumps over the lazy dog.',
      '0123456789',
      '!@#$%^&*()',
      ' ',
      'a',
      'A longer sentence with MIXED case and numbers 42.',
    ];
    for (const text of texts) {
      expect(descramble(scramble(text, mapping), mapping)).toBe(text);
    }
  });

  it('handles empty string', () => {
    expect(scramble('', mapping)).toBe('');
    expect(descramble('', mapping)).toBe('');
  });

  it('with variants, same text scrambles differently each time', () => {
    const vm = generateMapping('variant-test', { variants: 3 });
    const text = 'aaaaaaaaaa';
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      results.add(scramble(text, vm));
    }
    // With 3 variants for 'a' and 10 chars, should produce multiple different outputs
    expect(results.size).toBeGreaterThan(1);
  });

  it('with variants, descramble still recovers original', () => {
    const vm = generateMapping('variant-roundtrip', { variants: 5 });
    const text = 'Hello, World! Testing variants.';
    for (let i = 0; i < 10; i++) {
      expect(descramble(scramble(text, vm), vm)).toBe(text);
    }
  });

  it('round-trips with excluded characters', () => {
    const m = generateMapping('exclude-test', { exclude: [' ', '\n'] });
    const text = 'Hello World\nNew line here';
    const scrambled = scramble(text, m);
    expect(scrambled).toContain(' ');
    expect(scrambled).toContain('\n');
    expect(descramble(scrambled, m)).toBe(text);
  });

  it('round-trips with variable-length tiers', () => {
    const m = generateMapping('tiers-test', { tiers: [3, 7, 16] });
    const text = 'Hello, World! Variable lengths.';
    for (let i = 0; i < 10; i++) {
      expect(descramble(scramble(text, m), m)).toBe(text);
    }
  });

  it('round-trips with tiers + variants', () => {
    const m = generateMapping('tiers-variants', { tiers: [3, 7, 16], variants: 3 });
    const text = 'All features combined!';
    for (let i = 0; i < 10; i++) {
      expect(descramble(scramble(text, m), m)).toBe(text);
    }
  });

  it('handles all 95 ASCII printable characters', () => {
    let allChars = '';
    for (let i = 32; i <= 126; i++) {
      allChars += String.fromCharCode(i);
    }
    expect(descramble(scramble(allChars, mapping), mapping)).toBe(allChars);
  });
});
