import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { parseFeed, filterCandidates, download } from '../scripts/fetch-candidates.mjs';

const feed = { topic: 'hacking', source: 'The Hacker News' };

async function withServer(handler, check) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await check(`http://127.0.0.1:${server.address().port}/`);
  } finally {
    server.close();
  }
}

test('download tries a browser User-Agent when the first request is refused', async () => {
  const onlyBrowsers = (request, response) => {
    const browser = request.headers['user-agent'].includes('Chrome');
    response.writeHead(browser ? 200 : 403).end(browser ? 'feed' : 'no');
  };
  await withServer(onlyBrowsers, async (url) => assert.equal(await download(url), 'feed'));
});

test('download fails when every attempt is refused', async () => {
  const refuseAll = (request, response) => response.writeHead(403).end();
  await withServer(refuseAll, async (url) => assert.rejects(download(url)));
});

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
