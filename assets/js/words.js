// Shared by the site and by scripts/validate.mjs, so both agree on what a word is.

const WORD = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;

export function tokenize(text) {
  const tokens = [];
  let last = 0;
  for (const match of text.matchAll(WORD)) {
    const previous = text[match.index - 1] ?? '';
    const next = text[match.index + match[0].length] ?? '';
    // Letters glued to digits are codes such as CVE-2026-1234 or 5G, not words.
    if (/\d/.test(previous) || /\d/.test(next) || isCodePrefix(text, match)) continue;
    if (match.index > last) tokens.push({ text: text.slice(last, match.index), isWord: false });
    tokens.push({ text: match[0], isWord: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) tokens.push({ text: text.slice(last), isWord: false });
  return tokens;
}

function isCodePrefix(text, match) {
  return /^-\d/.test(text.slice(match.index + match[0].length));
}

export function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function normalize(word) {
  return word
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/'s$/, '')
    .replace(/'$/, '');
}

export function buildLookup(glossary, common) {
  const lookup = new Map();
  for (const source of [common, glossary]) {
    for (const [word, entry] of Object.entries(source)) {
      const value = { word, pt: entry.pt };
      lookup.set(normalize(word), value);
      for (const form of entry.forms ?? []) lookup.set(normalize(form), value);
    }
  }
  return lookup;
}

export function findWord(lookup, word) {
  return lookup.get(normalize(word)) ?? null;
}
