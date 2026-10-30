import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { readArticles, TOPICS } from './validate.mjs';

export function buildIndex(articles) {
  const sorted = [...articles].sort((a, b) => (
    b.date.localeCompare(a.date) || TOPICS.indexOf(a.topic) - TOPICS.indexOf(b.topic)
  ));
  return {
    articles: sorted.map(({ id, date, topic, source, levels }) => ({
      id, date, topic, title: levels[1].title, source: source.name,
    })),
  };
}

async function main() {
  const entries = await readArticles();
  const index = buildIndex(entries.map((entry) => entry.article));
  await writeFile('data/index.json', `${JSON.stringify(index, null, 2)}\n`);
  console.log(`${index.articles.length} notícias no índice`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
