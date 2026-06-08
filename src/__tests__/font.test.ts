import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { createObfuscatedFont, inspectLigatures } from '../font.js';
import { generateMapping } from '../mapping.js';
import opentype from 'opentype.js';

const BASE_FONT = path.join(import.meta.dirname, '../../fonts/Quicksand/static/Quicksand-Regular.ttf');
const mapping = generateMapping('font-test-seed');

describe('createObfuscatedFont', () => {
  it('produces a valid font buffer', async () => {
    const buf = await createObfuscatedFont(BASE_FONT, mapping);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(0);

    // Should be parseable as a font
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const font = opentype.parse(ab as ArrayBuffer);
    expect(font.numGlyphs).toBeGreaterThan(0);
  });

  it('has a GSUB table with ligature rules', async () => {
    const buf = await createObfuscatedFont(BASE_FONT, mapping);
    const ligatures = inspectLigatures(buf);
    expect(ligatures.length).toBe(mapping.entries.length);
  });

  it('ligature rules map correct glyph indices', async () => {
    const buf = await createObfuscatedFont(BASE_FONT, mapping);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const font = opentype.parse(ab as ArrayBuffer);

    const ligatures = inspectLigatures(buf);
    const ligMap = new Map<string, number>();
    for (const lig of ligatures) {
      ligMap.set(lig.sub.join(','), lig.by);
    }

    // Spot-check a few entries
    for (const entry of mapping.entries.slice(0, 10)) {
      const expectedOut = font.charToGlyphIndex(entry.char);
      const inIndices = [...entry.scrambledSeq].map((ch) => font.charToGlyphIndex(ch));
      const key = inIndices.join(',');
      expect(ligMap.has(key)).toBe(true);
      expect(ligMap.get(key)).toBe(expectedOut);
    }
  });

  it('round-trip: serialize → re-parse → ligatures intact', async () => {
    const buf = await createObfuscatedFont(BASE_FONT, mapping);
    const ligatures1 = inspectLigatures(buf);

    // Parse again and check
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const font2 = opentype.parse(ab as ArrayBuffer);
    const ligatures2 = inspectLigatures(Buffer.from(ab as ArrayBuffer));

    expect(ligatures2.length).toBe(ligatures1.length);
    for (let i = 0; i < ligatures1.length; i++) {
      expect(ligatures2[i].by).toBe(ligatures1[i].by);
      expect(ligatures2[i].sub).toEqual(ligatures1[i].sub);
    }
  });
});
