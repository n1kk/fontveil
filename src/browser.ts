import { generateMapping } from "./mapping.js";
import { createObfuscatedFont } from "./font.js";
import type { MappingOptions } from "./types.js";

export interface PatchFontOptions {
  /** Font family name to find and patch (looked up from existing @font-face rules) */
  family: string;
  /** Seed/key for generating the obfuscation mapping */
  key: string;
  /** Mapping options (variants, exclude, tiers, etc.) */
  mappingOptions?: MappingOptions;
  /** If set, register the patched font under this new name instead of replacing the original */
  name?: string;
}

function findFontUrl(family: string): string | null {
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (
          rule instanceof CSSFontFaceRule &&
          rule.style.getPropertyValue("font-family").replace(/['"]/g, "") ===
            family
        ) {
          const src = rule.style.getPropertyValue("src");
          const match = src.match(/url\(["']?([^"')]+)/);
          if (match) return match[1];
        }
      }
    } catch {}
  }
  return null;
}

function findAndRemoveFontRule(family: string): string | null {
  for (const sheet of document.styleSheets) {
    try {
      const rules = sheet.cssRules;
      for (let i = rules.length - 1; i >= 0; i--) {
        const rule = rules[i];
        if (
          rule instanceof CSSFontFaceRule &&
          rule.style.getPropertyValue("font-family").replace(/['"]/g, "") ===
            family
        ) {
          const src = rule.style.getPropertyValue("src");
          const match = src.match(/url\(["']?([^"')]+)/);
          if (match) {
            sheet.deleteRule(i);
            return match[1];
          }
        }
      }
    } catch {}
  }
  return null;
}

export async function patchFont(options: PatchFontOptions): Promise<string> {
  const { family, key, mappingOptions, name } = options;
  const inPlace = !name;
  const targetFamily = name ?? family;

  const mapping = generateMapping(key, mappingOptions);

  const fontUrl = inPlace
    ? findAndRemoveFontRule(family)
    : findFontUrl(family);
  if (!fontUrl)
    throw new Error(`@font-face for "${family}" not found`);

  const res = await fetch(fontUrl);
  const fontData = new Uint8Array(await res.arrayBuffer());

  const patched = createObfuscatedFont(fontData, mapping);

  const blob = new Blob([patched as BlobPart], { type: "font/ttf" });
  const url = URL.createObjectURL(blob);

  if (inPlace) {
    // Remove existing font faces so the patched one wins
    for (const f of [...document.fonts]) {
      if (f.family.replace(/['"]/g, "") === family) {
        document.fonts.delete(f);
      }
    }
  }

  const face = new FontFace(targetFamily, `url(${url})`, {
    weight: "100 900",
  });
  await face.load();
  document.fonts.add(face);

  return targetFamily;
}
