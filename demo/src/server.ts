import { Hono } from "hono";
import { serve } from "@hono/node-server";
import path from "node:path";
import { readFileSync } from "node:fs";
import { Marked } from "marked";
import {
  generateMapping,
  scramble,
  createObfuscatedFont,
  type ObfuscationMapping,
} from "obfuscai";

const app = new Hono();
const PORT = Number(process.env.PORT) || 3000;
const SEED = process.env.SEED || "obfuscai-default-seed";

const BASE_FONT = path.join(
  import.meta.dirname,
  "../../fonts/Quicksand/Quicksand-VariableFont_wght.ttf",
);
const BLOG_MD = readFileSync(
  path.join(import.meta.dirname, "./content/blog-post.md"),
  "utf-8",
);
const INDEX_TEMPLATE = readFileSync(
  path.join(import.meta.dirname, "./templates/index.html"),
  "utf-8",
);
const BLOG_TEMPLATE = readFileSync(
  path.join(import.meta.dirname, "./templates/blog.html"),
  "utf-8",
);

let cachedFont: Uint8Array;
let mapping: ReturnType<typeof generateMapping>;

function scrambleMarkdown(md: string, m: ObfuscationMapping): string {
  const instance = new Marked({
    walkTokens(token) {
      if (
        token.type === "text" ||
        token.type === "escape" ||
        token.type === "codespan" ||
        token.type === "code"
      ) {
        token.text = scramble(token.text, m);
      }
    },
  });
  return instance.parse(md) as string;
}

function init() {
  console.log(`Generating mapping with seed: "${SEED}"`);
  mapping = generateMapping(SEED, {
    variants: 3,
    exclude: [" ", "\n", "\t"],
  });
  console.log(`Creating obfuscated font from ${BASE_FONT}...`);
  const fontData = new Uint8Array(readFileSync(BASE_FONT));
  cachedFont = createObfuscatedFont(fontData, mapping);
  console.log(`Font ready (${(cachedFont.length / 1024).toFixed(1)} KB)`);
}

app.get("/font.ttf", (c) => {
  return c.body(new Uint8Array(cachedFont), 200, {
    "Content-Type": "font/ttf",
    "Cache-Control": "public, max-age=31536000",
  });
});

app.get("/", (c) => {
  const originalText =
    c.req.query("text") ??
    "Hello, World! This text is obfuscated in the HTML source.";

  const scrambled = scramble(originalText, mapping);
  const html = INDEX_TEMPLATE.replaceAll("{{scrambled}}", scrambled)
    .replace("{{originalText}}", escapeHtml(originalText))
    .replace("{{originalAttr}}", escapeAttr(originalText))
    .replace("{{seed}}", SEED);

  return c.html(html);
});

app.get("/blog", (c) => {
  const articleHtml = scrambleMarkdown(BLOG_MD, mapping);
  const html = BLOG_TEMPLATE.replace("{{content}}", articleHtml);
  return c.html(html);
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

init();
serve({ fetch: app.fetch, hostname: "0.0.0.0", port: PORT }, () => {
  console.log(`obfuscai demo running at http://0.0.0.0:${PORT}`);
});
