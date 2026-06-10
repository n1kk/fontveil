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
  /** Length of each scrambled sequence (default: 2) */
  seqLength?: number;
  /** Number of variant sequences per character (default: 1, max depends on alphabet/charset) */
  variants?: number;
}

export interface ObfuscationMapping {
  key: string;
  seqLength: number;
  variants: number;
  charToScrambled: Map<string, string[]>;
  scrambledToChar: Map<string, string>;
  entries: CharMapping[];
}
