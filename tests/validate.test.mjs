import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateArticle, LEVEL_LIMITS } from '../scripts/validate.mjs';
import { buildIndex } from '../scripts/build-index.mjs';

const words = (n) => Array(n).fill('word').join(' ');

function validArticle() {
  return {
    id: '2026-10-30-test',
    date: '2026-10-30',
    topic: 'hacking',
    source: { name: 'BBC News', url: 'https://example.com/a', publishedAt: '2026-10-30T08:00:00Z' },
    levels: {
      1: { title: 'Word', text: words(60) },
      2: { title: 'Word', text: words(120) },
      3: { title: 'Word', text: words(200) },
    },
    glossary: { word: { pt: 'palavra' } },
  };
}

test('a correct article has no errors', () => {
  assert.deepEqual(validateArticle(validArticle(), {}, new Set()), []);
});

test('reports a missing field', () => {
  const article = validArticle();
  delete article.source.url;
  assert.ok(validateArticle(article, {}, new Set()).some((e) => e.includes('source.url')));
});

test('reports a missing level', () => {
  const article = validArticle();
  delete article.levels[2];
  assert.ok(validateArticle(article, {}, new Set()).some((e) => e.includes('nível 2')));
});

test('reports an invalid topic', () => {
  const article = { ...validArticle(), topic: 'esportes' };
  assert.ok(validateArticle(article, {}, new Set()).some((e) => e.includes('topic')));
});

test('enforces the size limits at both edges', () => {
  const [min, max] = LEVEL_LIMITS[1];
  const short = validArticle();
  short.levels[1].text = words(min - 1);
  const long = validArticle();
  long.levels[1].text = words(max + 1);
  const atLimit = validArticle();
  atLimit.levels[1].text = words(max);
  assert.ok(validateArticle(short, {}, new Set()).some((e) => e.includes('nível 1')));
  assert.ok(validateArticle(long, {}, new Set()).some((e) => e.includes('nível 1')));
  assert.deepEqual(validateArticle(atLimit, {}, new Set()), []);
});

test('reports a word without a meaning, in texts and titles', () => {
  const article = validArticle();
  article.levels[3].title = 'Mystery';
  const errors = validateArticle(article, {}, new Set());
  assert.ok(errors.some((e) => e.includes('mystery')));
});

test('accepts words from the common list and ignores numbers', () => {
  const article = validArticle();
  article.levels[1].text = `${words(59)} the 15%`;
  assert.deepEqual(validateArticle(article, { the: { pt: 'o' } }, new Set()), []);
});

test('reports an already published source', () => {
  const errors = validateArticle(validArticle(), {}, new Set(['https://example.com/a']));
  assert.ok(errors.some((e) => e.includes('já publicada')));
});

test('buildIndex sorts by date and then by topic', () => {
  const make = (id, date, topic) => ({
    id, date, topic,
    source: { name: 'BBC', url: `https://example.com/${id}` },
    levels: { 1: { title: `T ${id}`, text: 'x' } },
  });
  const index = buildIndex([
    make('a', '2026-10-29', 'hacking'),
    make('b', '2026-10-30', 'mundo'),
    make('c', '2026-10-30', 'hacking'),
    make('d', '2026-10-30', 'bolsa'),
  ]);
  assert.deepEqual(index.articles.map((a) => a.id), ['c', 'd', 'b', 'a']);
  assert.deepEqual(index.articles[0], {
    id: 'c', date: '2026-10-30', topic: 'hacking', title: 'T c', source: 'BBC',
  });
});
