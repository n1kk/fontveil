import seedrandom from "seedrandom";
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
  seed: string,
  options?: MappingOptions,
): ObfuscationMapping {
  const charset = options?.charset ?? getDefaultCharset();
  const alphabet = options?.scrambleAlphabet ?? DEFAULT_ALPHABET;
  const seqLength = options?.seqLength ?? 2;

  const allSequences = generateAllSequences(alphabet, seqLength);

  if (allSequences.length < charset.length) {
    throw new Error(
      `Alphabet of size ${alphabet.length} with sequence length ${seqLength} ` +
        `produces ${allSequences.length} combinations, but need ${charset.length} for the charset`,
    );
  }

  const rng = seedrandom(seed);
  const shuffled = fisherYatesShuffle(allSequences, rng);

  const entries: CharMapping[] = [];
  const charToScrambled = new Map<string, string>();
  const scrambledToChar = new Map<string, string>();

  for (let i = 0; i < charset.length; i++) {
    const char = charset[i];
    const scrambledSeq = shuffled[i];
    entries.push({ char, scrambledSeq });
    charToScrambled.set(char, scrambledSeq);
    scrambledToChar.set(scrambledSeq, char);
  }

  return { seed, seqLength, charToScrambled, scrambledToChar, entries };
}
