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

export function seededRng(key: string): () => number {
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

function allCombos(alphabet: string, length: number): string[] {
  if (length === 1) return [...alphabet];
  const sequences: string[] = [];
  const suffixes = allCombos(alphabet, length - 1);
  for (const ch of alphabet) {
    for (const s of suffixes) sequences.push(ch + s);
  }
  return sequences;
}

function generateSequences(alphabet: string, tiers: number[]): string[] {
  const total = tiers.reduce((a, b) => a + b, 0);
  if (total > alphabet.length) {
    throw new Error(
      `Tiers require ${total} starting letters but alphabet has ${alphabet.length}`,
    );
  }

  const sequences: string[] = [];
  let offset = 0;

  for (let t = 0; t < tiers.length; t++) {
    const count = tiers[t];
    if (count === 0) continue;
    const starters = alphabet.slice(offset, offset + count);
    offset += count;
    const length = t + 1;

    if (length === 1) {
      for (const ch of starters) sequences.push(ch);
    } else {
      const suffixes = allCombos(alphabet, length - 1);
      for (const start of starters) {
        for (const suffix of suffixes) {
          sequences.push(start + suffix);
        }
      }
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
  const variants = options?.variants ?? 1;

  const seqLength = options?.seqLength ?? 2;
  const tiers = options?.tiers ?? [...Array(seqLength - 1).fill(0), alphabet.length];
  const seqLengths = tiers.reduce<number[]>((acc, count, i) => {
    if (count > 0) acc.push(i + 1);
    return acc;
  }, []);
  const allSequences = generateSequences(alphabet, tiers);

  const needed = charset.length * variants;

  if (allSequences.length < needed) {
    throw new Error(
      `${allSequences.length} sequences available, but need ${needed} ` +
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
    seqLengths,
    variants,
    charToScrambled,
    scrambledToChar,
    entries,
  };
}
