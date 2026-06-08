import { bench, describe } from "vitest";
import path from "node:path";
import { readFileSync } from "node:fs";
import { generateMapping } from "../mapping.js";

import * as binary from "../font-binary.js";
import * as otjs from "../font-opentype.js";

const BASE_FONT_DATA = new Uint8Array(
  readFileSync(
    path.join(
      import.meta.dirname,
      "../../fonts/Quicksand/static/Quicksand-Regular.ttf",
    ),
  ),
);
const mapping = generateMapping("bench-seed");

describe("createObfuscatedFont", () => {
  bench("binary", () => {
    binary.createObfuscatedFont(BASE_FONT_DATA, mapping);
  });

  bench("opentype.js", () => {
    otjs.createObfuscatedFont(BASE_FONT_DATA, mapping);
  });
});

describe("inspectLigatures", () => {
  let bufBin: Uint8Array;
  let bufOt: Uint8Array;

  bench(
    "binary",
    () => {
      binary.inspectLigatures(bufBin);
    },
    {
      setup() {
        bufBin = binary.createObfuscatedFont(BASE_FONT_DATA, mapping);
      },
    },
  );

  bench(
    "opentype.js",
    () => {
      otjs.inspectLigatures(bufOt);
    },
    {
      setup() {
        bufOt = otjs.createObfuscatedFont(BASE_FONT_DATA, mapping);
      },
    },
  );
});
