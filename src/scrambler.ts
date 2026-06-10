import type { ObfuscationMapping } from "./types.js";

export function scramble(text: string, mapping: ObfuscationMapping): string {
  let result = "";
  for (const char of text) {
    const seqs = mapping.charToScrambled.get(char);
    if (seqs === undefined) {
      result += char;
      continue;
    }
    result += seqs.length === 1
      ? seqs[0]
      : seqs[Math.floor(Math.random() * seqs.length)];
  }
  return result;
}

export function descramble(
  scrambled: string,
  mapping: ObfuscationMapping,
): string {
  const { seqLength } = mapping;

  let result = "";
  let i = 0;
  while (i < scrambled.length) {
    const seq = scrambled.slice(i, i + seqLength);
    const char = mapping.scrambledToChar.get(seq);
    if (char !== undefined) {
      result += char;
      i += seqLength;
    } else {
      result += scrambled[i];
      i++;
    }
  }
  return result;
}
