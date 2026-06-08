import { Hono } from "hono";
import { serve } from "@hono/node-server";
import path from "node:path";
import { generateMapping } from "./mapping.js";
import { scramble } from "./scrambler.js";
import { createObfuscatedFont } from "./font.js";

const app = new Hono();
const PORT = Number(process.env.PORT) || 3000;
const SEED = process.env.SEED || "obfuscai-default-seed";

const BASE_FONT = path.join(
  import.meta.dirname,
  "../fonts/Quicksand/static/Quicksand-Regular.ttf",
);

let cachedFont: Buffer;
let mapping: ReturnType<typeof generateMapping>;

async function init() {
  console.log(`Generating mapping with seed: "${SEED}"`);
  mapping = generateMapping(SEED);
  console.log(`Creating obfuscated font from ${BASE_FONT}...`);
  cachedFont = await createObfuscatedFont(BASE_FONT, mapping);
  console.log(`Font ready (${(cachedFont.length / 1024).toFixed(1)} KB)`);
}

app.get("/font.ttf", (c) => {
  return c.body(cachedFont, 200, {
    "Content-Type": "font/ttf",
    "Cache-Control": "public, max-age=31536000",
  });
});

app.get("/", (c) => {
  const originalText =
    c.req.query("text") ??
    "Hello, World! This text is obfuscated in the HTML source.";

  const scrambled = scramble(originalText, mapping);

  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>obfuscai demo</title>
  <style>
    @font-face {
      font-family: 'Obfuscated';
      src: url('/font.ttf') format('truetype');
      font-display: block;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, sans-serif;
      max-width: 720px;
      margin: 2rem auto;
      padding: 0 1rem;
      line-height: 1.6;
      color: #1a1a1a;
    }
    h1 { margin-bottom: 1.5rem; }
    .obfuscated {
      font-family: 'Obfuscated', sans-serif;
      font-size: 1.5rem;
      padding: 1rem;
      background: #f0f0f0;
      border-radius: 8px;
      margin: 1rem 0;
    }
    .source {
      font-family: monospace;
      font-size: 0.9rem;
      padding: 1rem;
      background: #1a1a1a;
      color: #4ade80;
      border-radius: 8px;
      margin: 1rem 0;
      word-break: break-all;
    }
    label { font-weight: 600; display: block; margin-top: 1.5rem; }
    .note { color: #666; font-size: 0.85rem; margin-top: 0.25rem; }
  </style>
</head>
<body>
  <h1>obfuscai</h1>

  <label>Rendered (what the browser shows):</label>
  <div class="obfuscated">${scrambled}</div>

  <label>HTML source (what's in the DOM):</label>
  <div class="source">${scrambled}</div>
  <p class="note">The text above is the raw scrambled content. The font's ligature rules decode it visually.</p>

  <label>Original text:</label>
  <p style="margin-top:0.5rem">${escapeHtml(originalText)}</p>

  <label>Seed:</label>
  <p style="margin-top:0.5rem"><code>${SEED}</code></p>

  <form style="margin-top:2rem">
    <label for="text">Try your own text:</label>
    <input id="text" name="text" type="text" value="${escapeAttr(originalText)}"
      style="width:100%;padding:0.5rem;font-size:1rem;margin-top:0.5rem;border:1px solid #ccc;border-radius:4px">
    <button type="submit" style="margin-top:0.5rem;padding:0.5rem 1rem;cursor:pointer">Scramble</button>
  </form>
</body>
</html>`);
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

init().then(() => {
  serve({ fetch: app.fetch, port: PORT }, () => {
    console.log(`obfuscai demo running at http://localhost:${PORT}`);
  });
});
