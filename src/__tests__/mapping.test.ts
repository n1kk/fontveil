import { describe, it, expect } from 'vitest';
import { generateMapping } from '../mapping.js';

describe('generateMapping', () => {
  it('is deterministic — same seed produces identical mapping', () => {
    const a = generateMapping('test-seed');
    const b = generateMapping('test-seed');
    expect(a.entries).toEqual(b.entries);
  });

  it('different seeds produce different mappings', () => {
    const a = generateMapping('seed-1');
    const b = generateMapping('seed-2');
    const aSeqs = a.entries.map((e) => e.scrambledSeq);
    const bSeqs = b.entries.map((e) => e.scrambledSeq);
    expect(aSeqs).not.toEqual(bSeqs);
  });

  it('maps all 95 ASCII printable characters', () => {
    const m = generateMapping('test');
    expect(m.entries.length).toBe(95);

    for (let i = 32; i <= 126; i++) {
      const ch = String.fromCharCode(i);
      expect(m.charToScrambled.has(ch)).toBe(true);
    }
  });

  it('produces bijective mapping — no duplicate scrambled sequences', () => {
    const m = generateMapping('test');
    const seqs = m.entries.map((e) => e.scrambledSeq);
    expect(new Set(seqs).size).toBe(seqs.length);
  });

  it('all scrambled sequences have the expected fixed length', () => {
    const m = generateMapping('test');
    for (const entry of m.entries) {
      expect(entry.scrambledSeq.length).toBe(2);
    }
  });

  it('scrambled sequences use only the scramble alphabet', () => {
    const m = generateMapping('test');
    for (const entry of m.entries) {
      expect(entry.scrambledSeq).toMatch(/^[a-z]+$/);
    }
  });

  it('forward and reverse maps are consistent inverses', () => {
    const m = generateMapping('test');
    for (const [char, seq] of m.charToScrambled) {
      expect(m.scrambledToChar.get(seq)).toBe(char);
    }
    for (const [seq, char] of m.scrambledToChar) {
      expect(m.charToScrambled.get(char)).toBe(seq);
    }
  });

  it('supports custom sequence length', () => {
    const m = generateMapping('test', { seqLength: 3 });
    expect(m.seqLength).toBe(3);
    for (const entry of m.entries) {
      expect(entry.scrambledSeq.length).toBe(3);
    }
  });

  it('throws when alphabet is too small for charset', () => {
    expect(() =>
      generateMapping('test', { scrambleAlphabet: 'ab', seqLength: 1 })
    ).toThrow();
  });
});
