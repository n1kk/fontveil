import { generateMapping, createObfuscatedFont } from "obfuscai";

const SEED = "obfuscai-default-seed";
// const BASE_FONT_FAMILY = "Quicksand";
const BASE_FONT_FAMILY = "Montserrat";

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

async function patchFont() {
  const mapping = generateMapping(SEED, {
    variants: 3,
    exclude: [" ", "\n", "\t"],
  });

  const fontUrl = findFontUrl(BASE_FONT_FAMILY);
  if (!fontUrl)
    throw new Error(`@font-face for "${BASE_FONT_FAMILY}" not found`);

  const res = await fetch(fontUrl);
  const fontData = new Uint8Array(await res.arrayBuffer());

  const patched = createObfuscatedFont(fontData, mapping);

  const blob = new Blob([patched as BlobPart], { type: "font/ttf" });
  const url = URL.createObjectURL(blob);

  const style = document.createElement("style");
  style.textContent = `
    @font-face {
      font-family: 'Obfuscated';
      src: url('${url}') format('truetype');
      font-display: block;
      font-weight: 300 700;
    }
  `;
  document.head.appendChild(style);

  const face = new FontFace("Obfuscated", `url(${url})`, {
    weight: "300 700",
  });
  await face.load();
  document.querySelector("article")?.classList.add("ready");
}

patchFont();
