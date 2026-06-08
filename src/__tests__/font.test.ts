import { describe, it, expect } from "vitest";
import path from "node:path";
import { generateMapping } from "../mapping.js";

import * as binary from "../font-binary.js";
import * as otjs from "../font-opentype.js";

const BASE_FONT = path.join(
  import.meta.dirname,
  "../../fonts/Quicksand/static/Quicksand-Regular.ttf",
);
const mapping = generateMapping("font-test-seed");

const implementations = [
  { name: "binary", mod: binary },
  { name: "opentype.js", mod: otjs },
] as const;

for (const { name, mod } of implementations) {
  describe(`createObfuscatedFont [${name}]`, () => {
    it("produces a valid font buffer", async () => {
      const buf = await mod.createObfuscatedFont(BASE_FONT, mapping);
      expect(buf).toBeInstanceOf(Buffer);
      expect(buf.length).toBeGreaterThan(0);

      const cmap = binary.parseFontCmap(buf);
      expect(cmap.size).toBeGreaterThan(0);
    });

    it("has a GSUB table with ligature rules", async () => {
      const buf = await mod.createObfuscatedFont(BASE_FONT, mapping);
      const ligatures = binary.inspectLigatures(buf);
      expect(ligatures.length).toBe(mapping.entries.length);
    });

    it("ligature rules map correct glyph indices", async () => {
      const buf = await mod.createObfuscatedFont(BASE_FONT, mapping);
      const cmap = binary.parseFontCmap(buf);

      const ligatures = binary.inspectLigatures(buf);
      const ligMap = new Map<string, number>();
      for (const lig of ligatures) {
        ligMap.set(lig.sub.join(","), lig.by);
      }

      for (const entry of mapping.entries.slice(0, 10)) {
        const expectedOut = cmap.get(entry.char.codePointAt(0)!);
        const inIndices = [...entry.scrambledSeq].map(
          (ch) => cmap.get(ch.codePointAt(0)!)!,
        );
        const key = inIndices.join(",");
        expect(ligMap.has(key)).toBe(true);
        expect(ligMap.get(key)).toBe(expectedOut);
      }
    });

    it("round-trip: serialize → inspect → ligatures intact", async () => {
      const buf = await mod.createObfuscatedFont(BASE_FONT, mapping);
      const ligatures1 = binary.inspectLigatures(buf);
      const ligatures2 = binary.inspectLigatures(buf);

      expect(ligatures2.length).toBe(ligatures1.length);
      for (let i = 0; i < ligatures1.length; i++) {
        expect(ligatures2[i].by).toBe(ligatures1[i].by);
        expect(ligatures2[i].sub).toEqual(ligatures1[i].sub);
      }
    });
  });
}

describe("cross-implementation consistency", () => {
  it("both produce identical ligature mappings", async () => {
    const bufBin = await binary.createObfuscatedFont(BASE_FONT, mapping);
    const bufOt = await otjs.createObfuscatedFont(BASE_FONT, mapping);

    const ligsBin = binary.inspectLigatures(bufBin);
    const ligsOt = binary.inspectLigatures(bufOt);

    expect(ligsBin.length).toBe(ligsOt.length);

    const toKey = (l: { sub: number[]; by: number }) =>
      `${l.sub.join(",")}->${l.by}`;
    const binSet = new Set(ligsBin.map(toKey));
    const otSet = new Set(ligsOt.map(toKey));

    expect(binSet).toEqual(otSet);
  });
});
