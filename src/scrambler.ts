import type { ObfuscationMapping } from "./types.js";

export function scramble(text: string, mapping: ObfuscationMapping): string {
  let result = "";
  for (const char of text) {
    const seq = mapping.charToScrambled.get(char);
    if (seq === undefined) {
      throw new Error(
        `Character '${char}' (U+${char.codePointAt(0)!.toString(16).padStart(4, "0")}) is not in the mapping`,
      );
    }
    result += seq;
  }
  return result;
}

export function descramble(
  scrambled: string,
  mapping: ObfuscationMapping,
): string {
  const { seqLength } = mapping;
  if (scrambled.length % seqLength !== 0) {
    throw new Error(
      `Scrambled text length ${scrambled.length} is not divisible by sequence length ${seqLength}`,
    );
  }

  let result = "";
  for (let i = 0; i < scrambled.length; i += seqLength) {
    const seq = scrambled.slice(i, i + seqLength);
    const char = mapping.scrambledToChar.get(seq);
    if (char === undefined) {
      throw new Error(
        `Sequence '${seq}' at position ${i} is not in the mapping`,
      );
    }
    result += char;
  }
  return result;
}
