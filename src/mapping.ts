import type {
  CharMapping,
  MappingOptions,
  ObfuscationMapping,
} from "./types.js";

const DEFAULT_ALPHABET = "abcdefghijklmnopqrstuvwxyz";

function getDefaultCharset(): string[] {
  const chars: string[] = [];
  for (let i = 32; i <= 126; i++) {
    chars.push(String.fromCharCode(i));
  }
  return chars;
}

function normalizeKey(key: string | number): string {
  return String(key).normalize("NFKC").trim();
}

function seededRng(key: string): () => number {
  let s = 0;
  for (let i = 0; i < key.length; i++) {
    s = Math.imul(s ^ key.charCodeAt(i), 0x9e3779b1);
  }
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

function generateAllSequences(alphabet: string, length: number): string[] {
  if (length === 1) return [...alphabet];

  const sequences: string[] = [];
  const prev = generateAllSequences(alphabet, length - 1);
  for (const ch of alphabet) {
    for (const seq of prev) {
      sequences.push(ch + seq);
    }
  }
  return sequences;
}

function fisherYatesShuffle<T>(arr: T[], rng: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateMapping(
  key: string | number,
  options?: MappingOptions,
): ObfuscationMapping {
  const exclude = options?.exclude ? new Set(options.exclude) : undefined;
  const charset = (options?.charset ?? getDefaultCharset()).filter(
    (ch) => !exclude?.has(ch),
  );
  const alphabet = options?.scrambleAlphabet ?? DEFAULT_ALPHABET;
  const seqLength = options?.seqLength ?? 2;
  const variants = options?.variants ?? 1;

  const allSequences = generateAllSequences(alphabet, seqLength);
  const needed = charset.length * variants;

  if (allSequences.length < needed) {
    throw new Error(
      `Alphabet of size ${alphabet.length} with sequence length ${seqLength} ` +
        `produces ${allSequences.length} combinations, but need ${needed} ` +
        `for ${charset.length} chars x ${variants} variants`,
    );
  }

  const normalized = normalizeKey(key);
  const rng = seededRng(normalized);
  const shuffled = fisherYatesShuffle(allSequences, rng);

  const entries: CharMapping[] = [];
  const charToScrambled = new Map<string, string[]>();
  const scrambledToChar = new Map<string, string>();

  for (let i = 0; i < charset.length; i++) {
    const char = charset[i];
    const seqs: string[] = [];
    for (let v = 0; v < variants; v++) {
      const seq = shuffled[i * variants + v];
      seqs.push(seq);
      scrambledToChar.set(seq, char);
    }
    entries.push({ char, scrambledSeqs: seqs });
    charToScrambled.set(char, seqs);
  }

  return {
    key: normalized,
    seqLength,
    variants,
    charToScrambled,
    scrambledToChar,
    entries,
  };
}
