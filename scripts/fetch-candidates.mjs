import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { downloadWithCurl } from './read-article.mjs';
import { readArticles } from './validate.mjs';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decode(value) {
  return value
    .replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, name) => ENTITIES[name])
    .trim();
}

function tag(item, name) {
  const match = item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return match ? decode(match[1]) : null;
}

export function parseFeed(xml, feed) {
  const items = [];
  for (const [, item] of xml.matchAll(/<item[ >]([\s\S]*?)<\/item>/g)) {
    const title = tag(item, 'title');
    const url = tag(item, 'link');
    if (!title || !url) continue;
    const date = tag(item, 'pubDate');
    const parts = feed.splitPublisher ? title.match(/^(.*) - ([^-]+)$/) : null;
    items.push({
      topic: feed.topic,
      title: parts ? parts[1] : title,
      url,
      source: parts ? parts[2].trim() : feed.source,
      publishedAt: date ? new Date(date).toISOString() : null,
    });
  }
  return items;
}

export function filterCandidates(items, publishedUrls) {
  const urls = new Set(publishedUrls);
  const titles = new Set();
  return items.filter(({ url, title }) => {
    const key = title.toLowerCase();
    if (urls.has(url) || titles.has(key)) return false;
    urls.add(url);
    titles.add(key);
    return true;
  });
}

// From the cloud, the BBC refuses this request but accepts curl, and CNBC does the opposite.
export async function download(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DailyLevels/1.0)' },
    signal: AbortSignal.timeout(20000),
  }).catch(() => null);
  return response?.ok ? response.text() : downloadWithCurl(url);
}

async function main() {
  const feeds = JSON.parse(await readFile('scripts/feeds.json', 'utf8'));
  const results = await Promise.all(feeds.map(async (feed) => {
    try {
      return parseFeed(await download(feed.url), feed);
    } catch (error) {
      console.error(`Feed com erro: ${feed.url}: ${error.message}`);
      return [];
    }
  }));
  const published = (await readArticles()).map(({ article }) => article.source.url);
  console.log(JSON.stringify(filterCandidates(results.flat(), new Set(published)), null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
