import { bench, describe } from "vitest";
import path from "node:path";
import { generateMapping } from "../mapping.js";

import * as binary from "../font-binary.js";
import * as otjs from "../font-opentype.js";

const BASE_FONT = path.join(
  import.meta.dirname,
  "../../fonts/Quicksand/static/Quicksand-Regular.ttf",
);
const mapping = generateMapping("bench-seed");

describe("createObfuscatedFont", () => {
  bench("binary", async () => {
    await binary.createObfuscatedFont(BASE_FONT, mapping);
  });

  bench("opentype.js", async () => {
    await otjs.createObfuscatedFont(BASE_FONT, mapping);
  });
});

describe("inspectLigatures", () => {
  let bufBin: Buffer;
  let bufOt: Buffer;

  bench(
    "binary",
    async () => {
      binary.inspectLigatures(bufBin);
    },
    {
      async setup() {
        bufBin = await binary.createObfuscatedFont(BASE_FONT, mapping);
      },
    },
  );

  bench(
    "opentype.js",
    async () => {
      otjs.inspectLigatures(bufOt);
    },
    {
      async setup() {
        bufOt = await otjs.createObfuscatedFont(BASE_FONT, mapping);
      },
    },
  );
});
