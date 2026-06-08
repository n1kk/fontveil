export interface CharMapping {
  /** The original readable character (single char) */
  char: string;
  /** The scrambled character sequence that appears in HTML source */
  scrambledSeq: string;
}

export interface MappingOptions {
  /** Characters to include in the mapping (default: ASCII printable 32–126) */
  charset?: string[];
  /** Alphabet used for scrambled sequences (default: a-z) */
  scrambleAlphabet?: string;
  /** Length of each scrambled sequence (default: 2) */
  seqLength?: number;
}

export interface ObfuscationMapping {
  key: string;
  seqLength: number;
  charToScrambled: Map<string, string>;
  scrambledToChar: Map<string, string>;
  entries: CharMapping[];
}
