import { Hono } from "hono";
import { serve } from "@hono/node-server";
import path from "node:path";
import { readFileSync } from "node:fs";
import { generateMapping } from "./mapping.js";
import { scramble } from "./scrambler.js";
import { createObfuscatedFont } from "./font.js";

const app = new Hono();
const PORT = Number(process.env.PORT) || 3000;
const SEED = process.env.SEED || "obfuscai-default-seed";

const BASE_FONT = path.join(
  import.meta.dirname,
  "../fonts/Quicksand/Quicksand-VariableFont_wght.ttf",
);

let cachedFont: Uint8Array;
let mapping: ReturnType<typeof generateMapping>;

function init() {
  console.log(`Generating mapping with seed: "${SEED}"`);
  mapping = generateMapping(SEED);
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

app.get("/blog", (c) => {
  const s = (t: string) =>
    t
      .split("\n")
      .map((line) =>
        line
          .split(" ")
          .map((word) => (word === "" ? "" : scramble(word, mapping)))
          .join(" "),
      )
      .join("\n");

  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Building a Real-Time Event Pipeline with Node.js</title>
  <style>
    @font-face {
      font-family: 'Obfuscated';
      src: url('/font.ttf') format('truetype');
      font-display: block;
      font-weight: 300 700;
    }
    :root {
      --text: #374151;
      --text-light: #6b7280;
      --heading: #111827;
      --bg: #ffffff;
      --bg-alt: #f9fafb;
      --border: #e5e7eb;
      --accent: #2563eb;
      --accent-light: #eff6ff;
      --code-bg: #1e293b;
      --code-text: #e2e8f0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Obfuscated', Georgia, 'Times New Roman', serif;
      max-width: 680px;
      margin: 0 auto;
      padding: 2rem 1.5rem 4rem;
      color: var(--text);
      background: var(--bg);
      line-height: 1.75;
      font-size: 1.125rem;
    }
    .site-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 0 2rem;
      border-bottom: 1px solid var(--border);
      margin-bottom: 2.5rem;
    }
    .site-header .logo {
      font-weight: 700;
      font-size: 1.1rem;
      color: var(--heading);
      text-decoration: none;
    }
    .site-header nav {
      display: flex;
      gap: 1.5rem;
      font-size: 0.9rem;
      color: var(--text-light);
    }
    .meta {
      color: var(--text-light);
      font-size: 0.9rem;
      margin-bottom: 2rem;
    }
    h1 {
      font-size: 2rem;
      font-weight: 800;
      color: var(--heading);
      line-height: 1.25;
      margin-bottom: 0.75rem;
    }
    h2 {
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--heading);
      margin: 2.5rem 0 1rem;
    }
    h3 {
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--heading);
      margin: 2rem 0 0.75rem;
    }
    p { margin-bottom: 1.25rem; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    pre {
      background: var(--code-bg);
      color: var(--code-text);
      border-radius: 8px;
      padding: 1.25rem 1.5rem;
      overflow-x: auto;
      font-size: 0.875rem;
      line-height: 1.6;
      margin: 1.25rem 0 1.5rem;
      font-family: 'Obfuscated', 'Fira Code', 'Cascadia Code', monospace;
    }
    code {
      font-family: 'Obfuscated', 'Fira Code', 'Cascadia Code', monospace;
      font-size: 0.9em;
      background: var(--bg-alt);
      padding: 0.15em 0.4em;
      border-radius: 4px;
      color: var(--heading);
    }
    pre code {
      background: none;
      padding: 0;
      color: inherit;
    }
    blockquote {
      border-left: 3px solid var(--accent);
      background: var(--accent-light);
      padding: 1rem 1.25rem;
      margin: 1.5rem 0;
      border-radius: 0 6px 6px 0;
      font-style: italic;
      color: var(--text);
    }
    ul, ol {
      margin: 0.5rem 0 1.25rem 1.5rem;
    }
    li { margin-bottom: 0.4rem; }
    hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 2.5rem 0;
    }
    .tag {
      display: inline-block;
      font-size: 0.75rem;
      background: var(--bg-alt);
      border: 1px solid var(--border);
      padding: 0.2em 0.6em;
      border-radius: 4px;
      color: var(--text-light);
      margin-right: 0.4rem;
    }
    .author-box {
      display: flex;
      gap: 1rem;
      align-items: center;
      padding: 1.5rem;
      background: var(--bg-alt);
      border-radius: 8px;
      margin-top: 2.5rem;
    }
    .author-box .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--accent);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.2rem;
      flex-shrink: 0;
    }
    .author-box .bio { font-size: 0.9rem; color: var(--text-light); }
    .author-box .name { font-weight: 600; color: var(--heading); }
    .footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
      font-size: 0.85rem;
      color: var(--text-light);
      text-align: center;
    }
  </style>
</head>
<body>
  <header class="site-header">
    <a class="logo">${s("the craft of code")}</a>
    <nav>
      <span>${s("Posts")}</span>
      <span>${s("About")}</span>
      <span>${s("RSS")}</span>
    </nav>
  </header>

  <article>
    <h1>${s("Building a Real-Time Event Pipeline with Node.js")}</h1>
    <div class="meta">
      ${s("June 4, 2026")} &middot; ${s("12 min read")} &middot;
      <span class="tag">${s("Node.js")}</span>
      <span class="tag">${s("Architecture")}</span>
      <span class="tag">${s("Streaming")}</span>
    </div>

    <p>${s("Last month our team hit a wall. Our batch processing pipeline, which had served us well for three years, could no longer keep up with the volume of events flowing through our system. We were processing around 50,000 events per second during peak hours, and the 15-minute batch window meant users were seeing stale data in their dashboards.")}</p>

    <p>${s("The decision to move to real-time processing was not taken lightly. We evaluated Kafka, Pulsar, and a handful of managed services before landing on a surprisingly simple architecture built on Node.js streams and a few well-chosen libraries.")}</p>

    <h2>${s("Why Not Just Use Kafka?")}</h2>

    <p>${s("I know what you are thinking. Kafka is the industry standard for event streaming. And you would be right for most cases. But our constraints were specific:")}</p>

    <ul>
      <li>${s("Our team of four had zero Kafka operational experience")}</li>
      <li>${s("Our event payloads were small (under 2KB each)")}</li>
      <li>${s("We needed sub-second latency, not just high throughput")}</li>
      <li>${s("Our infrastructure budget was already stretched thin")}</li>
    </ul>

    <blockquote>${s("The best architecture is the one your team can actually operate at 2 AM when something breaks.")}</blockquote>

    <h2>${s("The Architecture")}</h2>

    <p>${s("At its core, the pipeline is three stages: ingest, transform, and sink. Each stage is a Node.js Transform stream, connected with backpressure handling built in. Here is the simplified version:")}</p>

    <pre><code>${s(`const pipeline = new EventPipeline({
  source: new RedisStreamSource({
    host: process.env.REDIS_HOST,
    streams: ["events:clicks", "events:views"],
    group: "pipeline-v2",
    batchSize: 100,
  }),
  transforms: [
    new DeduplicateTransform({ windowMs: 30_000 }),
    new EnrichTransform({ geoDb: "./data/geo.mmdb" }),
    new AggregateTransform({ windowMs: 1_000 }),
  ],
  sink: new PostgresSink({
    table: "events_processed",
    batchSize: 500,
    flushIntervalMs: 1_000,
  }),
});

await pipeline.start();`)}</code></pre>

    <p>${s("The Redis Streams consumer group handles distribution across multiple workers. Each worker runs the full transform chain in-process, which keeps latency low by avoiding network hops between stages.")}</p>

    <h2>${s("Handling Backpressure")}</h2>

    <p>${s("The trickiest part was getting backpressure right. When Postgres slows down (and it will), we need the entire pipeline to slow down gracefully rather than buffering events in memory until the process crashes.")}</p>

    <p>${s("Node.js streams handle this natively through the highWaterMark mechanism, but we added a circuit breaker on top:")}</p>

    <pre><code>${s(`class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailure > this.resetMs) {
        this.state = "half-open";
      } else {
        throw new CircuitOpenError();
      }
    }
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }
}`)}</code></pre>

    <h3>${s("Monitoring the Pipeline")}</h3>

    <p>${s("We expose Prometheus metrics from each stage: events received, events emitted, processing latency percentiles, and backpressure stalls. The key metric turned out to be the ratio between ingest rate and sink rate. When that ratio exceeds 1.2 for more than 30 seconds, we know we are heading for trouble.")}</p>

    <h2>${s("Results After Three Months")}</h2>

    <p>${s("The numbers speak for themselves:")}</p>

    <ul>
      <li>${s("End-to-end latency dropped from 15 minutes to 800ms (p99)")}</li>
      <li>${s("Memory usage is stable at around 200MB per worker")}</li>
      <li>${s("We handle 60,000 events per second across 3 workers")}</li>
      <li>${s("Zero data loss incidents since launch")}</li>
      <li>${s("Operational overhead is minimal since it is just Node.js processes")}</li>
    </ul>

    <p>${s("The biggest surprise was how much simpler debugging became. When something goes wrong, we are looking at JavaScript stack traces and console.log output, not deciphering JVM garbage collection logs or Kafka consumer group rebalancing issues.")}</p>

    <h2>${s("What I Would Do Differently")}</h2>

    <p>${s("If I were starting over, I would invest more time upfront in schema validation at the ingest boundary. We spent two painful weeks tracking down a bug caused by a malformed timestamp field that only appeared in events from one specific mobile client version. A strict schema check at the entry point would have caught it immediately.")}</p>

    <p>${s("I would also consider using SQLite as a local write-ahead log instead of relying entirely on Redis for durability. The Redis Streams acknowledgment model is good, but having a local buffer would make the system more resilient to Redis outages.")}</p>

    <hr>

    <p>${s("If you are building something similar or have questions about the approach, feel free to reach out. The Node.js streaming primitives are more powerful than most people give them credit for.")}</p>

    <div class="author-box">
      <div class="avatar">${s("M")}</div>
      <div>
        <div class="name">${s("Marcus Chen")}</div>
        <div class="bio">${s("Staff Engineer at Dataflow. Writing about distributed systems, Node.js, and the occasional hot take on developer tooling.")}</div>
      </div>
    </div>
  </article>

  <footer class="footer">
    ${s("2026 the craft of code. Built with too much coffee and not enough sleep.")}
  </footer>
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

init();
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`obfuscai demo running at http://localhost:${PORT}`);
});
