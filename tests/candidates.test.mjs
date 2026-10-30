import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFeed, filterCandidates } from '../scripts/fetch-candidates.mjs';

const feed = { topic: 'hacking', source: 'The Hacker News' };

test('parseFeed reads CDATA and entities', () => {
  const xml = `<rss><channel><title>Feed</title>
    <item><title><![CDATA[Hackers & banks]]></title><link>https://a.com/1</link><pubDate>Fri, 30 Oct 2026 10:00:00 GMT</pubDate></item>
    <item><title>Spain&#8217;s &amp; Italy</title><link>https://a.com/2</link></item>
  </channel></rss>`;
  assert.deepEqual(parseFeed(xml, feed), [
    { topic: 'hacking', title: 'Hackers & banks', url: 'https://a.com/1', source: 'The Hacker News', publishedAt: '2026-10-30T10:00:00.000Z' },
    { topic: 'hacking', title: 'Spain’s & Italy', url: 'https://a.com/2', source: 'The Hacker News', publishedAt: null },
  ]);
});

test('parseFeed splits the publisher out of Google News titles', () => {
  const xml = '<rss><item><title>Brazil stocks tumble - Reuters</title><link>https://news.google.com/x</link></item></rss>';
  const [item] = parseFeed(xml, { topic: 'bolsa', source: 'Google News', splitPublisher: true });
  assert.equal(item.title, 'Brazil stocks tumble');
  assert.equal(item.source, 'Reuters');
});

test('parseFeed ignores items without a link and returns nothing for broken XML', () => {
  assert.deepEqual(parseFeed('<rss><item><title>No link</title></item></rss>', feed), []);
  assert.deepEqual(parseFeed('not xml', feed), []);
});

test('filterCandidates removes published and repeated stories', () => {
  const item = (url, title) => ({ topic: 'mundo', title, url, source: 'BBC', publishedAt: null });
  const result = filterCandidates(
    [item('https://a.com/1', 'One'), item('https://a.com/1', 'One again'), item('https://a.com/2', 'Two'), item('https://a.com/3', 'Two')],
    new Set(['https://a.com/2']),
  );
  assert.deepEqual(result.map((c) => c.url), ['https://a.com/1', 'https://a.com/3']);
});
