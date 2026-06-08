import opentype from "opentype.js";
import { readFileSync } from "node:fs";
import type { ObfuscationMapping } from "./types.js";

interface SubstitutionExt {
  addLigature(feature: string, ligature: { sub: number[]; by: number }): void;
  getLigatures(feature: string): Array<{ sub: number[]; by: number }>;
}

export async function createObfuscatedFont(
  baseFontPath: string,
  mapping: ObfuscationMapping,
): Promise<Buffer> {
  const fontBuffer = readFileSync(baseFontPath);
  const arrayBuffer = fontBuffer.buffer.slice(
    fontBuffer.byteOffset,
    fontBuffer.byteOffset + fontBuffer.byteLength,
  );

  const font = opentype.parse(arrayBuffer as ArrayBuffer);

  // Wipe existing GSUB to avoid conflicts with existing ligatures
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

  const outArrayBuffer = font.toArrayBuffer();
  return Buffer.from(outArrayBuffer);
}

export function inspectLigatures(
  fontBuffer: Buffer,
): Array<{ sub: number[]; by: number }> {
  const arrayBuffer = fontBuffer.buffer.slice(
    fontBuffer.byteOffset,
    fontBuffer.byteOffset + fontBuffer.byteLength,
  );
  const font = opentype.parse(arrayBuffer as ArrayBuffer);

  try {
    return (font.substitution as unknown as SubstitutionExt).getLigatures(
      "liga",
    );
  } catch {
    return [];
  }
}
