export { generateMapping, seededRng } from "./mapping.js";
export { scramble, descramble } from "./scrambler.js";
export { createObfuscatedFont, inspectLigatures, parseFontCmap } from "./font.js";
export { patchFont } from "./browser.js";
export type { PatchFontOptions } from "./browser.js";
export type {
  CharMapping,
  MappingOptions,
  ObfuscationMapping,
} from "./types.js";
