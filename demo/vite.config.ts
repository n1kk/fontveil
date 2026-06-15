import { defineConfig, type Plugin } from "vite";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Marked } from "marked";
import { generateMapping } from "../src/mapping.ts";
import { scramble } from "../src/scrambler.ts";
import type { ObfuscationMapping } from "../src/types.ts";

const SEED = "obfuscai-default-seed";
const MAPPING_OPTIONS = { variants: 3, exclude: [" ", "\n", "\t"] };

function obfuscaiPlugin(): Plugin {
  const mapping = generateMapping(SEED, MAPPING_OPTIONS);

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

  return {
    name: "obfuscai",
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
  publicDir: path.join(__dirname, "public"),
  plugins: [obfuscaiPlugin()],
  build: {
    outDir: path.join(__dirname, "dist"),
  },
});
