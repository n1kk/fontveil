# Font Veil

#### _Prevent bots, AI Agents and scrapers from accessing your content._

Right now you are reading text that looks perfectly normal. Sentences, paragraphs, punctuation, all exactly as you would expect on any blog post. But if you inspect the HTML source, you will find something strange: the characters in the markup are scrambled. They do not match what you see on screen. This is not a screenshot or an image. It is real text rendered by your browser. The difference is that a custom font is doing the heavy lifting, silently translating scrambled sequences back into readable characters through OpenType ligature substitution. Open DevTools to see that the actual source is obfuscated.

<span class="reveal-raw">Hover here</span> to see the actual source text.

This technique is not encryption and should not be treated as a security boundary. A determined adversary with access to the font file can reverse the mapping. The goal is to raise the cost of automated extraction high enough that scraping your content is no longer the path of least resistance. For most bots and crawlers, scrambled source text with no obvious decoding path is enough.

## Why Would You Want This?

The web has a scraping problem. Bots crawl pages, extract text, and repurpose it without attribution, consent, or compensation. Large language models train on scraped content. AI-powered search engines summarize articles and serve answers directly, removing the incentive for users to visit the original source.

There are several scenarios where obfuscation makes sense:

- **Protecting original content.** Writers, journalists, and researchers who want their work read by humans, not harvested by machines.
- **Preserving search traffic.** If a search engine cannot extract your article body, it cannot generate a summary that replaces the click. Leave your headlines and metadata searchable, obfuscate the rest.
- **Intellectual property.** Technical documentation, proprietary research, or creative work that you want visible to authenticated users but invisible to automated extraction.
- **Selective disclosure.** Show teasers or headlines in plain text for indexing while keeping premium content behind the obfuscation layer.

The key insight is that you can be selective. Headings, meta descriptions, and structured data can remain in plain text for search engines to index. Only the body content gets scrambled. You keep discoverability while protecting the substance.

## How It Works

The technique relies on OpenType font ligatures, the same mechanism that turns "f" followed by "i" into the joined "fi" glyph in many typefaces.

Here is the process:

- **Generate a mapping.** A seed key deterministically generates a mapping between each readable character to one or more scrambled sequences. For example, the letter "e" might map to "m" or "qx" or "n2?".

- **Scramble the content.** Before serving the page, each character in the text is replaced with one of its scrambled sequences. The HTML source now contains only these scrambled sequences.

- **Patch the font.** A custom font is generated that contains ligature rules reversing the mapping. When the browser encounters "qx", the font's ligature table says "render this as the glyph for e". The browser does this substitution at render time, in the text shaping engine, completely transparently.

- **Serve the page.** The scrambled HTML is sent to the browser along with the patched font. The browser renders the text normally. Users see readable content. Bots see scrambled character sequences.

The font can be generated and served together with the page, avoiding any need of JavaScript, but it can also be patched at runtime with JS after the page loads, tt's your choice. In any case the source stays ciphered.

## Variable-Length Sequences

A simple one-to-one character mapping would be trivial to reverse with frequency analysis. A two-character mapping is better but still has a fixed pattern. The system supports variable-length sequences using a prefix-free encoding, similar in concept to Huffman coding or UTF-8.

The alphabet is partitioned into tiers. A few letters are reserved for single-character sequences, another group serves as prefixes for two-character sequences, and the rest anchor three-character sequences. Because the prefix sets do not overlap, the decoder can unambiguously parse the scrambled text without delimiters. This variable length also changes the visual density of the scrambled output, making pattern detection harder.

Multiple variants per character add another layer. The letter "a" might have three different scrambled representations. The encoder picks among them deterministically based on a seeded random number generator, so the same input always produces the same output, but the output has the statistical appearance of random text.

## Performance

The entire obfuscation layer is lightweight. The mapping generation, scrambling, and font patching all happen in milliseconds. The font patching uses a zero-dependency binary parser that directly manipulates OpenType table data, no heavy font libraries required.

In the browser, the patched font can be generated client-side. The page loads with an existing base font, JavaScript fetches the font file, patches it with the ligature tables, and injects it back as a blob URL. The text re-renders instantly once the patched font is ready. Until then, CSS hides the content with an opacity transition so users never see the scrambled state.

The overhead is minimal:

- Font file grows by a few kilobytes for the added ligature tables
- Scrambled text is same or larger than the length of the original, depending on chosen sequence length distribution
- Client-side font patching completes in a few milliseconds on modern hardware

There is no server round-trip for decryption, no JavaScript runtime text replacement, and no DOM manipulation. The browser's own text shaping engine does all the work.
