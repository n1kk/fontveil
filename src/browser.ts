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
  /** Name for the patched font-family (default: "Obfuscated") */
  patchedFamily?: string;
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

export async function patchFont(options: PatchFontOptions): Promise<string> {
  const { family, key, mappingOptions, patchedFamily = "Obfuscated" } = options;

  const mapping = generateMapping(key, mappingOptions);

  const fontUrl = findFontUrl(family);
  if (!fontUrl)
    throw new Error(`@font-face for "${family}" not found`);

  const res = await fetch(fontUrl);
  const fontData = new Uint8Array(await res.arrayBuffer());

  const patched = createObfuscatedFont(fontData, mapping);

  const blob = new Blob([patched as BlobPart], { type: "font/ttf" });
  const url = URL.createObjectURL(blob);

  const style = document.createElement("style");
  style.textContent = `
    @font-face {
      font-family: '${patchedFamily}';
      src: url('${url}') format('truetype');
      font-display: block;
      font-weight: 100 900;
    }
  `;
  document.head.appendChild(style);

  const face = new FontFace(patchedFamily, `url(${url})`, {
    weight: "100 900",
  });
  await face.load();

  return patchedFamily;
}
