import { SUJFI, reverseLookup } from "./dictionary.js";

export function sanitize(word: string): string {
  return word
    .toLowerCase()
    .replace(/h/g, "")
    .replace(/ñ/g, "n")
    .replace(/á/g, "a")
    .replace(/é/g, "e")
    .replace(/í/g, "i")
    .replace(/ó/g, "o")
    .replace(/ú/g, "u")
    .replace(/ü/g, "u")
    .replace(/[^a-z]/g, "");
}

/** Greedy CV syllable split (not Spanish phonology). */
export function splitSyllables(word: string): string[] {
  const consonants = "bcdfgjklmnpqrstvwxyz";
  const vowels = "aeiou";
  const clean = sanitize(word);
  const syllables: string[] = [];
  let i = 0;
  while (i < clean.length) {
    if (consonants.includes(clean[i])) {
      if (i < clean.length - 1 && vowels.includes(clean[i + 1])) {
        syllables.push(clean.slice(i, i + 2));
        i += 2;
      } else {
        syllables.push(clean[i]);
        i += 1;
      }
    } else if (vowels.includes(clean[i])) {
      syllables.push(clean[i]);
      i += 1;
    } else {
      i += 1;
    }
  }
  return syllables;
}

export function translateSyllables(syllables: string[]): string[] {
  return syllables.map((syllable) => SUJFI[syllable] ?? "-");
}

export function joinSyllables(syllables: string[]): string {
  return syllables.join("");
}

export function translateToSujfi(word: string): string {
  if (!word?.trim()) throw new Error("word is required");
  return joinSyllables(translateSyllables(splitSyllables(word)));
}

export function translateFromSujfi(word: string): string {
  if (!word?.trim()) throw new Error("word is required");
  const syllables: string[] = [];
  let i = 0;
  while (i < word.length) {
    if (reverseLookup(word.slice(i, i + 3))) {
      syllables.push(word.slice(i, i + 3));
      i += 3;
    } else if (reverseLookup(word.slice(i, i + 2))) {
      syllables.push(word.slice(i, i + 2));
      i += 2;
    } else if (reverseLookup(word[i])) {
      syllables.push(word[i]);
      i += 1;
    } else {
      syllables.push("-");
      i += 1;
    }
  }
  return joinSyllables(syllables.map((s) => reverseLookup(s) ?? "-"));
}
