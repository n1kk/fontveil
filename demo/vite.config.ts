import { defineConfig, type Plugin } from "vite";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Marked } from "marked";
import { generateMapping } from "../src/mapping.ts";
import { scramble } from "../src/scrambler.ts";
import type { ObfuscationMapping } from "../src/types.ts";

const SEED = "fontveil-default-seed";
const MAPPING_OPTIONS = {
  seqLength: 1,
  charset:
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split(""),
  scrambleAlphabet:
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
};

function fontveilPlugin(): Plugin {
  const mapping = generateMapping(SEED, MAPPING_OPTIONS);

  function scrambleMarkdown(md: string, m: ObfuscationMapping): string {
    const skipTokens = new Set<object>();
    function collectAll(token: any) {
      skipTokens.add(token);
      for (const child of token.tokens ?? []) collectAll(child);
    }
    const instance = new Marked({
      walkTokens(token) {
        if (token.type === "heading") {
          collectAll(token);
          return;
        }
        if (skipTokens.has(token)) return;
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

  return {
    name: "fontveil",
    transformIndexHtml(html) {
      if (!html.includes("{{content}}")) return html;

      const mdPath = path.join(__dirname, "src/content/blog-post.md");
      const md = readFileSync(mdPath, "utf-8");
      const articleHtml = scrambleMarkdown(md, mapping);
      return html.replace("{{content}}", articleHtml);
    },
  };
}

export default defineConfig({
  root: "src",
  base: "/fontveil/",
  publicDir: path.join(__dirname, "public"),
  plugins: [fontveilPlugin()],
  server: {
    host: true,
    allowedHosts: true,
  },
  build: {
    outDir: path.join(__dirname, "dist"),
  },
});
