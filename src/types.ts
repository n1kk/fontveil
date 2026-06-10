export interface CharMapping {
  /** The original readable character (single char) */
  char: string;
  /** All scrambled sequences that map to this character */
  scrambledSeqs: string[];
}

export interface MappingOptions {
  /** Characters to include in the mapping (default: ASCII printable 32-126) */
  charset?: string[];
  /** Characters to exclude from the charset — they pass through unscrambled */
  exclude?: string[];
  /** Alphabet used for scrambled sequences (default: a-z) */
  scrambleAlphabet?: string;
  /** Fixed length of each scrambled sequence (default: 2). Ignored when tiers is set. */
  seqLength?: number;
  /**
   * Prefix-free variable-length tiers. Each element is the number of alphabet
   * letters dedicated to that length tier (index 0 = length 1, index 1 = length 2, etc.).
   * E.g. [3, 7, 16] → 3 single-char seqs, 7×26 two-char seqs, 16×26² three-char seqs.
   * Must sum to <= alphabet size.
   */
  tiers?: number[];
  /** Number of variant sequences per character (default: 1, max depends on alphabet/charset) */
  variants?: number;
}

export interface ObfuscationMapping {
  key: string;
  seqLengths: number[];
  variants: number;
  charToScrambled: Map<string, string[]>;
  scrambledToChar: Map<string, string>;
  entries: CharMapping[];
}
