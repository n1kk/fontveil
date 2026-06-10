import { describe, it, expect } from "vitest";
import { generateMapping } from "../mapping.js";

describe("generateMapping", () => {
  it("is deterministic — same key produces identical mapping", () => {
    const a = generateMapping("test-seed");
    const b = generateMapping("test-seed");
    expect(a.entries).toEqual(b.entries);
  });

  it("different keys produce different mappings", () => {
    const a = generateMapping("seed-1");
    const b = generateMapping("seed-2");
    const aSeqs = a.entries.map((e) => e.scrambledSeqs);
    const bSeqs = b.entries.map((e) => e.scrambledSeqs);
    expect(aSeqs).not.toEqual(bSeqs);
  });

  it("maps all 95 ASCII printable characters", () => {
    const m = generateMapping("test");
    expect(m.entries.length).toBe(95);

    for (let i = 32; i <= 126; i++) {
      const ch = String.fromCharCode(i);
      expect(m.charToScrambled.has(ch)).toBe(true);
    }
  });

  it("no duplicate scrambled sequences", () => {
    const m = generateMapping("test");
    const allSeqs = m.entries.flatMap((e) => e.scrambledSeqs);
    expect(new Set(allSeqs).size).toBe(allSeqs.length);
  });

  it("all scrambled sequences have the expected fixed length", () => {
    const m = generateMapping("test");
    for (const entry of m.entries) {
      for (const seq of entry.scrambledSeqs) {
        expect(seq.length).toBe(2);
      }
    }
  });

  it("scrambled sequences use only the scramble alphabet", () => {
    const m = generateMapping("test");
    for (const entry of m.entries) {
      for (const seq of entry.scrambledSeqs) {
        expect(seq).toMatch(/^[a-z]+$/);
      }
    }
  });

  it("forward and reverse maps are consistent inverses", () => {
    const m = generateMapping("test");
    for (const [char, seqs] of m.charToScrambled) {
      for (const seq of seqs) {
        expect(m.scrambledToChar.get(seq)).toBe(char);
      }
    }
    for (const [seq, char] of m.scrambledToChar) {
      expect(m.charToScrambled.get(char)).toContain(seq);
    }
  });

  it("supports custom sequence length", () => {
    const m = generateMapping("test", { seqLength: 3 });
    expect(m.seqLengths).toEqual([3]);
    for (const entry of m.entries) {
      for (const seq of entry.scrambledSeqs) {
        expect(seq.length).toBe(3);
      }
    }
  });

  it("supports multiple variants", () => {
    const m = generateMapping("test", { variants: 3 });
    expect(m.variants).toBe(3);
    for (const entry of m.entries) {
      expect(entry.scrambledSeqs.length).toBe(3);
    }
    // All sequences globally unique
    const allSeqs = m.entries.flatMap((e) => e.scrambledSeqs);
    expect(new Set(allSeqs).size).toBe(95 * 3);
  });

  it("excludes characters from charset", () => {
    const m = generateMapping("test", { exclude: [" ", "\n", "\t"] });
    expect(m.charToScrambled.has(" ")).toBe(false);
    expect(m.charToScrambled.has("\n")).toBe(false);
    expect(m.entries.length).toBe(94); // 95 - 1 (space is the only one in default charset)
  });

  it("throws when alphabet is too small for charset x variants", () => {
    expect(() =>
      generateMapping("test", { scrambleAlphabet: "ab", seqLength: 1 }),
    ).toThrow();
    expect(() =>
      generateMapping("test", { variants: 8 }),
    ).toThrow(); // 95*8=760 > 676
  });

  it("supports tiers for variable-length sequences", () => {
    const m = generateMapping("test", { tiers: [3, 7, 16] });
    expect(m.seqLengths).toEqual([1, 2, 3]);

    const allSeqs = m.entries.flatMap((e) => e.scrambledSeqs);
    expect(new Set(allSeqs).size).toBe(allSeqs.length);

    const lengths = new Set(allSeqs.map((s) => s.length));
    expect(lengths.size).toBeGreaterThan(1);
  });

  it("tiers produce prefix-free sequences", () => {
    const m = generateMapping("test", { tiers: [3, 7, 16] });
    const allSeqs = m.entries.flatMap((e) => e.scrambledSeqs);

    for (const a of allSeqs) {
      for (const b of allSeqs) {
        if (a !== b && a.length < b.length) {
          expect(b.startsWith(a)).toBe(false);
        }
      }
    }
  });

  it("tiers with variants", () => {
    const m = generateMapping("test", { tiers: [3, 7, 16], variants: 3 });
    expect(m.variants).toBe(3);
    for (const entry of m.entries) {
      expect(entry.scrambledSeqs.length).toBe(3);
    }
    const allSeqs = m.entries.flatMap((e) => e.scrambledSeqs);
    expect(new Set(allSeqs).size).toBe(allSeqs.length);
  });

  it("throws when tiers need more letters than alphabet has", () => {
    expect(() =>
      generateMapping("test", { tiers: [10, 10, 10] }),
    ).toThrow();
  });
});
