import opentype from "opentype.js";
import type { ObfuscationMapping } from "./types.js";

interface SubstitutionExt {
  addLigature(feature: string, ligature: { sub: number[]; by: number }): void;
  getLigatures(feature: string): Array<{ sub: number[]; by: number }>;
}

export function createObfuscatedFont(
  fontData: Uint8Array,
  mapping: ObfuscationMapping,
): Uint8Array {
  const ab = fontData.buffer.slice(
    fontData.byteOffset,
    fontData.byteOffset + fontData.byteLength,
  );

  const font = opentype.parse(ab as ArrayBuffer);
  font.tables.gsub = undefined as any;

  for (const entry of mapping.entries) {
    const outGlyphIndex = font.charToGlyphIndex(entry.char);
    const inGlyphIndices = [...entry.scrambledSeq].map((ch) =>
      font.charToGlyphIndex(ch),
    );

    if (outGlyphIndex === 0 || inGlyphIndices.some((idx) => idx === 0)) {
      throw new Error(
        `Font missing glyph for mapping: '${entry.scrambledSeq}' -> '${entry.char}'`,
      );
    }

    (font.substitution as unknown as SubstitutionExt).addLigature("liga", {
      sub: inGlyphIndices,
      by: outGlyphIndex,
    });
  }

  return new Uint8Array(font.toArrayBuffer());
}

export function inspectLigatures(
  fontData: Uint8Array,
): Array<{ sub: number[]; by: number }> {
  const ab = fontData.buffer.slice(
    fontData.byteOffset,
    fontData.byteOffset + fontData.byteLength,
  );
  const font = opentype.parse(ab as ArrayBuffer);

  try {
    return (font.substitution as unknown as SubstitutionExt).getLigatures(
      "liga",
    );
  } catch {
    return [];
  }
}
