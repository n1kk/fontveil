import type { ObfuscationMapping } from "./types.js";

// ── Binary read helpers (big-endian) ────────────────────────

const u16 = (d: Uint8Array, o: number) => (d[o] << 8) | d[o + 1];
const u32 = (d: Uint8Array, o: number) =>
  (((d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]) >>> 0);
const i16 = (d: Uint8Array, o: number) => {
  const v = u16(d, o);
  return v >= 0x8000 ? v - 0x10000 : v;
};
const readTag = (d: Uint8Array, o: number) =>
  String.fromCharCode(d[o], d[o + 1], d[o + 2], d[o + 3]);

// ── Binary writer ───────────────────────────────────────────

class W {
  d: number[] = [];
  get pos() {
    return this.d.length;
  }
  u16(v: number) {
    this.d.push((v >> 8) & 0xff, v & 0xff);
  }
  u32(v: number) {
    this.d.push(
      (v >> 24) & 0xff,
      (v >> 16) & 0xff,
      (v >> 8) & 0xff,
      v & 0xff,
    );
  }
  tag(s: string) {
    for (let i = 0; i < 4; i++) this.d.push(s.charCodeAt(i));
  }
  patch16(at: number, v: number) {
    this.d[at] = (v >> 8) & 0xff;
    this.d[at + 1] = v & 0xff;
  }
  pad4() {
    while (this.d.length & 3) this.d.push(0);
  }
  bytes() {
    return new Uint8Array(this.d);
  }
}

// ── Font table directory ────────────────────────────────────

interface TableRecord {
  tag: string;
  checksum: number;
  offset: number;
  length: number;
}

function parseTableDirectory(data: Uint8Array) {
  const sfVersion = u32(data, 0);
  if (sfVersion === 0x774f4632) {
    throw new Error(
      "woff2 fonts are not supported — use a .ttf or .otf font instead",
    );
  }
  if (sfVersion === 0x774f4646) {
    throw new Error(
      "woff fonts are not supported — use a .ttf or .otf font instead",
    );
  }
  const numTables = u16(data, 4);
  const tables: TableRecord[] = [];
  for (let i = 0; i < numTables; i++) {
    const o = 12 + i * 16;
    tables.push({
      tag: readTag(data, o),
      checksum: u32(data, o + 4),
      offset: u32(data, o + 8),
      length: u32(data, o + 12),
    });
  }
  return { sfVersion, tables };
}

// ── cmap parsing (charCode → glyphIndex) ────────────────────

function parseCmap(
  data: Uint8Array,
  tableOffset: number,
): Map<number, number> {
  const numSubtables = u16(data, tableOffset + 2);
  let bestFmt = 0;
  let bestOff = 0;

  for (let i = 0; i < numSubtables; i++) {
    const rec = tableOffset + 4 + i * 8;
    const subOff = tableOffset + u32(data, rec + 4);
    const fmt = u16(data, subOff);
    if (fmt === 12 && bestFmt < 12) {
      bestFmt = 12;
      bestOff = subOff;
    } else if (fmt === 4 && bestFmt < 4) {
      bestFmt = 4;
      bestOff = subOff;
    }
  }

  if (bestFmt === 12) return parseCmapFmt12(data, bestOff);
  if (bestFmt === 4) return parseCmapFmt4(data, bestOff);
  throw new Error("No supported cmap subtable (need format 4 or 12)");
}

function parseCmapFmt4(
  data: Uint8Array,
  off: number,
): Map<number, number> {
  const map = new Map<number, number>();
  const segCount = u16(data, off + 6) / 2;
  const endOff = off + 14;
  const startOff = endOff + segCount * 2 + 2;
  const deltaOff = startOff + segCount * 2;
  const rangeOff = deltaOff + segCount * 2;

  for (let i = 0; i < segCount; i++) {
    const start = u16(data, startOff + i * 2);
    const end = u16(data, endOff + i * 2);
    const delta = i16(data, deltaOff + i * 2);
    const range = u16(data, rangeOff + i * 2);
    if (start === 0xffff) break;

    for (let c = start; c <= end; c++) {
      let gid: number;
      if (range === 0) {
        gid = (c + delta) & 0xffff;
      } else {
        const addr = rangeOff + i * 2 + range + 2 * (c - start);
        gid = u16(data, addr);
        if (gid !== 0) gid = (gid + delta) & 0xffff;
      }
      if (gid !== 0) map.set(c, gid);
    }
  }
  return map;
}

function parseCmapFmt12(
  data: Uint8Array,
  off: number,
): Map<number, number> {
  const map = new Map<number, number>();
  const numGroups = u32(data, off + 12);
  for (let i = 0; i < numGroups; i++) {
    const g = off + 16 + i * 12;
    const startChar = u32(data, g);
    const endChar = u32(data, g + 4);
    const startGlyph = u32(data, g + 8);
    for (let c = startChar; c <= endChar; c++) {
      const gid = startGlyph + (c - startChar);
      if (gid !== 0) map.set(c, gid);
    }
  }
  return map;
}

// ── GSUB builder (Type 4 ligature substitution) ─────────────

interface LigatureRule {
  firstGlyph: number;
  restGlyphs: number[];
  outputGlyph: number;
}

function buildGsub(rules: LigatureRule[]): Uint8Array {
  const groups = new Map<number, LigatureRule[]>();
  for (const r of rules) {
    let list = groups.get(r.firstGlyph);
    if (!list) {
      list = [];
      groups.set(r.firstGlyph, list);
    }
    list.push(r);
  }
  const firstGlyphs = [...groups.keys()].sort((a, b) => a - b);

  const w = new W();

  // GSUB Header v1.0
  w.u16(1);
  w.u16(0);
  const pScriptList = w.pos;
  w.u16(0);
  const pFeatureList = w.pos;
  w.u16(0);
  const pLookupList = w.pos;
  w.u16(0);

  // ScriptList
  const slOff = w.pos;
  w.patch16(pScriptList, slOff);
  w.u16(1);
  w.tag("DFLT");
  const pScript = w.pos;
  w.u16(0);
  const scriptOff = w.pos;
  w.patch16(pScript, scriptOff - slOff);
  const pLangSys = w.pos;
  w.u16(0);
  w.u16(0);
  const lsOff = w.pos;
  w.patch16(pLangSys, lsOff - scriptOff);
  w.u16(0);
  w.u16(0xffff);
  w.u16(1);
  w.u16(0);

  // FeatureList
  const flOff = w.pos;
  w.patch16(pFeatureList, flOff);
  w.u16(1);
  w.tag("liga");
  const pFeature = w.pos;
  w.u16(0);
  const featOff = w.pos;
  w.patch16(pFeature, featOff - flOff);
  w.u16(0);
  w.u16(1);
  w.u16(0);

  // LookupList
  const llOff = w.pos;
  w.patch16(pLookupList, llOff);
  w.u16(1);
  const pLookup = w.pos;
  w.u16(0);

  // Lookup (type 4)
  const luOff = w.pos;
  w.patch16(pLookup, luOff - llOff);
  w.u16(4);
  w.u16(0);
  w.u16(1);
  const pSubtable = w.pos;
  w.u16(0);

  // LigatureSubst subtable (format 1)
  const stOff = w.pos;
  w.patch16(pSubtable, stOff - luOff);
  w.u16(1);
  const pCoverage = w.pos;
  w.u16(0);
  w.u16(firstGlyphs.length);
  const pSetOffs: number[] = [];
  for (let i = 0; i < firstGlyphs.length; i++) {
    pSetOffs.push(w.pos);
    w.u16(0);
  }

  // LigatureSets
  for (let i = 0; i < firstGlyphs.length; i++) {
    const setOff = w.pos;
    w.patch16(pSetOffs[i], setOff - stOff);
    const ligs = groups.get(firstGlyphs[i])!;
    w.u16(ligs.length);
    const pLigOffs: number[] = [];
    for (let j = 0; j < ligs.length; j++) {
      pLigOffs.push(w.pos);
      w.u16(0);
    }
    for (let j = 0; j < ligs.length; j++) {
      w.patch16(pLigOffs[j], w.pos - setOff);
      w.u16(ligs[j].outputGlyph);
      w.u16(ligs[j].restGlyphs.length + 1);
      for (const g of ligs[j].restGlyphs) w.u16(g);
    }
  }

  // Coverage table (format 1)
  w.patch16(pCoverage, w.pos - stOff);
  w.u16(1);
  w.u16(firstGlyphs.length);
  for (const g of firstGlyphs) w.u16(g);

  w.pad4();
  return w.bytes();
}

// ── GSUB parser ─────────────────────────────────────────────

function parseGsubLigatures(
  data: Uint8Array,
  gsubOff: number,
): Array<{ sub: number[]; by: number }> {
  const llOff = gsubOff + u16(data, gsubOff + 8);
  const lookupCount = u16(data, llOff);
  const result: Array<{ sub: number[]; by: number }> = [];

  for (let li = 0; li < lookupCount; li++) {
    const luOff = llOff + u16(data, llOff + 2 + li * 2);
    if (u16(data, luOff) !== 4) continue;

    const stCount = u16(data, luOff + 4);
    for (let si = 0; si < stCount; si++) {
      const stOff = luOff + u16(data, luOff + 6 + si * 2);
      if (u16(data, stOff) !== 1) continue;

      const covOff = stOff + u16(data, stOff + 2);
      const firstGlyphs: number[] = [];
      if (u16(data, covOff) === 1) {
        const cnt = u16(data, covOff + 2);
        for (let g = 0; g < cnt; g++)
          firstGlyphs.push(u16(data, covOff + 4 + g * 2));
      }

      const setCount = u16(data, stOff + 4);
      for (let s = 0; s < setCount; s++) {
        const setOff = stOff + u16(data, stOff + 6 + s * 2);
        const ligCount = u16(data, setOff);
        for (let lj = 0; lj < ligCount; lj++) {
          const ligOff = setOff + u16(data, setOff + 2 + lj * 2);
          const by = u16(data, ligOff);
          const compCount = u16(data, ligOff + 2);
          const sub = [firstGlyphs[s]];
          for (let c = 0; c < compCount - 1; c++)
            sub.push(u16(data, ligOff + 4 + c * 2));
          result.push({ sub, by });
        }
      }
    }
  }
  return result;
}

// ── Font rebuilder ──────────────────────────────────────────

function tableChecksum(
  data: Uint8Array,
  off: number,
  len: number,
): number {
  let sum = 0;
  const nLongs = Math.ceil(len / 4);
  for (let i = 0; i < nLongs; i++) {
    const p = off + i * 4;
    sum =
      (sum +
        (((data[p] ?? 0) << 24) |
          ((data[p + 1] ?? 0) << 16) |
          ((data[p + 2] ?? 0) << 8) |
          (data[p + 3] ?? 0))) >>>
      0;
  }
  return sum;
}

function rebuildFont(
  original: Uint8Array,
  replacements: Map<string, Uint8Array>,
): Uint8Array {
  const { sfVersion, tables: origTables } = parseTableDirectory(original);

  interface Entry {
    tag: string;
    data: Uint8Array;
  }
  const entries: Entry[] = [];
  const seen = new Set<string>();

  for (const t of origTables) {
    seen.add(t.tag);
    entries.push({
      tag: t.tag,
      data:
        replacements.get(t.tag) ??
        original.slice(t.offset, t.offset + t.length),
    });
  }
  for (const [tag, data] of replacements) {
    if (!seen.has(tag)) entries.push({ tag, data });
  }
  entries.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));

  const n = entries.length;
  const exp = Math.floor(Math.log2(n));
  const searchRange = (1 << exp) * 16;
  const headerLen = 12 + n * 16;

  let totalLen = headerLen;
  const offsets: number[] = [];
  for (const e of entries) {
    offsets.push(totalLen);
    totalLen += (e.data.length + 3) & ~3;
  }

  const out = new Uint8Array(totalLen);
  const dv = new DataView(out.buffer);

  dv.setUint32(0, sfVersion);
  dv.setUint16(4, n);
  dv.setUint16(6, searchRange);
  dv.setUint16(8, exp);
  dv.setUint16(10, n * 16 - searchRange);

  let headOff = -1;
  for (let i = 0; i < n; i++) {
    const dirOff = 12 + i * 16;
    const e = entries[i];
    if (e.tag === "head") headOff = offsets[i];

    for (let j = 0; j < 4; j++) out[dirOff + j] = e.tag.charCodeAt(j);
    out.set(e.data, offsets[i]);

    dv.setUint32(
      dirOff + 4,
      tableChecksum(out, offsets[i], (e.data.length + 3) & ~3),
    );
    dv.setUint32(dirOff + 8, offsets[i]);
    dv.setUint32(dirOff + 12, e.data.length);
  }

  if (headOff >= 0) {
    dv.setUint32(headOff + 8, 0);
    const total = tableChecksum(out, 0, totalLen);
    dv.setUint32(headOff + 8, (0xb1b0afba - total) >>> 0);
  }

  return out;
}

// ── Public API ──────────────────────────────────────────────

export function createObfuscatedFont(
  fontData: Uint8Array,
  mapping: ObfuscationMapping,
): Uint8Array {
  const data = fontData instanceof Uint8Array ? fontData : new Uint8Array(fontData);
  const { tables } = parseTableDirectory(data);

  const cmapRec = tables.find((t) => t.tag === "cmap");
  if (!cmapRec) throw new Error("Font has no cmap table");
  const charToGlyph = parseCmap(data, cmapRec.offset);

  const rules: LigatureRule[] = [];
  for (const entry of mapping.entries) {
    const outGlyph = charToGlyph.get(entry.char.codePointAt(0)!);
    if (!outGlyph)
      throw new Error(`Font missing glyph for '${entry.char}'`);

    for (const seq of entry.scrambledSeqs) {
      const [first, ...rest] = [...seq];
      const firstGlyph = charToGlyph.get(first.codePointAt(0)!);
      if (!firstGlyph)
        throw new Error(`Font missing glyph for '${first}'`);

      const restGlyphs = rest.map((ch) => {
        const g = charToGlyph.get(ch.codePointAt(0)!);
        if (!g) throw new Error(`Font missing glyph for '${ch}'`);
        return g;
      });

      rules.push({ firstGlyph, restGlyphs, outputGlyph: outGlyph });
    }
  }

  const gsubData = buildGsub(rules);
  return rebuildFont(data, new Map([["GSUB", gsubData]]));
}

export function inspectLigatures(
  fontData: Uint8Array,
): Array<{ sub: number[]; by: number }> {
  const data = fontData instanceof Uint8Array ? fontData : new Uint8Array(fontData);
  const { tables } = parseTableDirectory(data);
  const gsubRec = tables.find((t) => t.tag === "GSUB");
  if (!gsubRec) return [];
  return parseGsubLigatures(data, gsubRec.offset);
}

export function parseFontCmap(fontData: Uint8Array): Map<number, number> {
  const data = fontData instanceof Uint8Array ? fontData : new Uint8Array(fontData);
  const { tables } = parseTableDirectory(data);
  const cmapRec = tables.find((t) => t.tag === "cmap");
  if (!cmapRec) throw new Error("Font has no cmap table");
  return parseCmap(data, cmapRec.offset);
}
