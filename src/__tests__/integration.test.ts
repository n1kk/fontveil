import { describe, it, expect } from "vitest";
import path from "node:path";
import { readFileSync } from "node:fs";
import { generateMapping } from "../mapping.js";
import { scramble, descramble } from "../scrambler.js";
import {
  createObfuscatedFont,
  inspectLigatures,
  parseFontCmap,
} from "../font.js";

const BASE_FONT_DATA = new Uint8Array(
  readFileSync(
    path.join(
      import.meta.dirname,
      "../../fonts/Quicksand/static/Quicksand-Regular.ttf",
    ),
  ),
);

describe("full pipeline", () => {
  it("key → mapping → scramble → font → ligatures match mapping", () => {
    const mapping = generateMapping("integration-test");
    const text = "Hello, World!";
    const scrambled = scramble(text, mapping);

    expect(scrambled).not.toContain("Hello");
    expect(scrambled).toMatch(/^[a-z]+$/);
    expect(descramble(scrambled, mapping)).toBe(text);

    const fontBuf = createObfuscatedFont(BASE_FONT_DATA, mapping);
    const ligatures = inspectLigatures(fontBuf);
    expect(ligatures.length).toBe(95 * mapping.variants);

    const cmap = parseFontCmap(fontBuf);
    const hSeqs = mapping.charToScrambled.get("H")!;
    const hGlyphIdx = cmap.get("H".codePointAt(0)!)!;

    for (const seq of hSeqs) {
      const inIndices = [...seq].map(
        (ch) => cmap.get(ch.codePointAt(0)!)!,
      );
      const hLigature = ligatures.find(
        (l) =>
          l.sub.length === inIndices.length &&
          l.sub.every((v, i) => v === inIndices[i]),
      );
      expect(hLigature).toBeDefined();
      expect(hLigature!.by).toBe(hGlyphIdx);
    }
  });

  it("different keys produce different scrambled output for same text", () => {
    const text = "Same text";
    const m1 = generateMapping("seed-a");
    const m2 = generateMapping("seed-b");
    expect(scramble(text, m1)).not.toBe(scramble(text, m2));
  });

  it("handles all printable ASCII in full pipeline", () => {
    const mapping = generateMapping("full-ascii-test");
    let allChars = "";
    for (let i = 32; i <= 126; i++) allChars += String.fromCharCode(i);

    const scrambled = scramble(allChars, mapping);
    expect(scrambled.length).toBe(allChars.length * 2);
    expect(descramble(scrambled, mapping)).toBe(allChars);

    const fontBuf = createObfuscatedFont(BASE_FONT_DATA, mapping);
    expect(fontBuf.length).toBeGreaterThan(0);
  });

  it("full pipeline with variants", () => {
    const mapping = generateMapping("variant-pipeline", { variants: 3 });
    const text = "Hello, World!";
    const scrambled = scramble(text, mapping);
    expect(descramble(scrambled, mapping)).toBe(text);

    const fontBuf = createObfuscatedFont(BASE_FONT_DATA, mapping);
    const ligatures = inspectLigatures(fontBuf);
    expect(ligatures.length).toBe(95 * 3);
  });
});
