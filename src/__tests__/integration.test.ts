import { describe, it, expect } from 'vitest';
import path from 'node:path';
import opentype from 'opentype.js';
import { generateMapping } from '../mapping.js';
import { scramble, descramble } from '../scrambler.js';
import { createObfuscatedFont, inspectLigatures } from '../font.js';

const BASE_FONT = path.join(import.meta.dirname, '../../fonts/Quicksand/static/Quicksand-Regular.ttf');

describe('full pipeline', () => {
  it('seed → mapping → scramble → font → ligatures match mapping', async () => {
    const seed = 'integration-test';
    const mapping = generateMapping(seed);
    const text = 'Hello, World!';
    const scrambled = scramble(text, mapping);

    // Scrambled text should not contain original
    expect(scrambled).not.toContain('Hello');
    expect(scrambled).toMatch(/^[a-z]+$/);

    // Descramble should recover original
    expect(descramble(scrambled, mapping)).toBe(text);

    // Font should have correct ligatures
    const fontBuf = await createObfuscatedFont(BASE_FONT, mapping);
    const ligatures = inspectLigatures(fontBuf);
    expect(ligatures.length).toBe(95);

    // Parse the font and verify a specific mapping
    const ab = fontBuf.buffer.slice(fontBuf.byteOffset, fontBuf.byteOffset + fontBuf.byteLength);
    const font = opentype.parse(ab as ArrayBuffer);

    // Check that the ligature for 'H' maps correctly
    const hMapping = mapping.charToScrambled.get('H')!;
    const hGlyphIdx = font.charToGlyphIndex('H');
    const inIndices = [...hMapping].map((ch) => font.charToGlyphIndex(ch));

    const hLigature = ligatures.find(
      (l) => l.sub.length === inIndices.length && l.sub.every((v, i) => v === inIndices[i]),
    );
    expect(hLigature).toBeDefined();
    expect(hLigature!.by).toBe(hGlyphIdx);
  });

  it('different seeds produce different scrambled output for same text', async () => {
    const text = 'Same text';
    const m1 = generateMapping('seed-a');
    const m2 = generateMapping('seed-b');
    expect(scramble(text, m1)).not.toBe(scramble(text, m2));
  });

  it('handles all printable ASCII in full pipeline', async () => {
    const mapping = generateMapping('full-ascii-test');
    let allChars = '';
    for (let i = 32; i <= 126; i++) allChars += String.fromCharCode(i);

    const scrambled = scramble(allChars, mapping);
    expect(scrambled.length).toBe(allChars.length * 2);
    expect(descramble(scrambled, mapping)).toBe(allChars);

    const fontBuf = await createObfuscatedFont(BASE_FONT, mapping);
    expect(fontBuf.length).toBeGreaterThan(0);
  });
});
