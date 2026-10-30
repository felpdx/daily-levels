import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, countWords, normalize, buildLookup, findWord } from '../assets/js/words.js';

test('tokenize preserves the text and marks only words', () => {
  const text = "Brazil's 15% cyber-attack, CVE-2026-1234.";
  const tokens = tokenize(text);
  assert.equal(tokens.map((t) => t.text).join(''), text);
  assert.deepEqual(tokens.filter((t) => t.isWord).map((t) => t.text), ["Brazil's", 'cyber', 'attack']);
});

test('tokenize keeps contractions with straight and curly apostrophes', () => {
  assert.deepEqual(tokenize('don’t stop').filter((t) => t.isWord).map((t) => t.text), ['don’t', 'stop']);
});

test('countWords ignores extra spaces', () => {
  assert.equal(countWords('  one two\n three  '), 3);
  assert.equal(countWords(''), 0);
});

test('normalize lowercases, unifies apostrophes and drops the possessive', () => {
  assert.equal(normalize('Brazil’s'), 'brazil');
  assert.equal(normalize("HACKERS'"), 'hackers');
  assert.equal(normalize("Don't"), "don't");
});

const lookup = buildLookup(
  { steal: { pt: 'roubar', forms: ['steals', 'stole'] }, brazil: { pt: 'Brasil' } },
  { the: { pt: 'o, a' } },
);

test('findWord resolves forms, possessives and common words', () => {
  assert.deepEqual(findWord(lookup, 'STOLE'), { word: 'steal', pt: 'roubar' });
  assert.deepEqual(findWord(lookup, 'Brazil’s'), { word: 'brazil', pt: 'Brasil' });
  assert.deepEqual(findWord(lookup, "Brazil's"), { word: 'brazil', pt: 'Brasil' });
  assert.deepEqual(findWord(lookup, 'The'), { word: 'the', pt: 'o, a' });
});

test('findWord returns null for unknown words', () => {
  assert.equal(findWord(lookup, 'zebra'), null);
});

test('article glossary wins over common words', () => {
  const custom = buildLookup({ bank: { pt: 'banco (financeiro)' } }, { bank: { pt: 'margem' } });
  assert.equal(findWord(custom, 'bank').pt, 'banco (financeiro)');
});
