import { readFile, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { tokenize, countWords, buildLookup, findWord } from '../assets/js/words.js';

export const TOPICS = ['hacking', 'bolsa', 'mundo'];
export const LEVEL_LIMITS = { 1: [45, 75], 2: [90, 150], 3: [150, 250] };

export function validateArticle(article, common, publishedUrls) {
  const errors = [];
  for (const field of ['id', 'date', 'topic']) {
    if (!article[field]) errors.push(`falta o campo ${field}`);
  }
  for (const field of ['name', 'url', 'publishedAt']) {
    if (!article.source?.[field]) errors.push(`falta o campo source.${field}`);
  }
  if (article.topic && !TOPICS.includes(article.topic)) errors.push(`topic inválido: ${article.topic}`);
  if (article.date && !/^\d{4}-\d{2}-\d{2}$/.test(article.date)) errors.push(`date inválida: ${article.date}`);
  if (article.source?.url && publishedUrls.has(article.source.url)) {
    errors.push(`fonte já publicada: ${article.source.url}`);
  }

  const lookup = buildLookup(article.glossary ?? {}, common);
  for (const [level, [min, max]] of Object.entries(LEVEL_LIMITS)) {
    const content = article.levels?.[level];
    if (!content?.title || !content?.text) {
      errors.push(`nível ${level} sem título ou texto`);
      continue;
    }
    const size = countWords(content.text);
    if (size < min || size > max) errors.push(`nível ${level} tem ${size} palavras (aceito: ${min}-${max})`);
    const missing = new Set();
    for (const token of tokenize(`${content.title} ${content.text}`)) {
      if (token.isWord && !findWord(lookup, token.text)) missing.add(token.text.toLowerCase());
    }
    if (missing.size) errors.push(`nível ${level} sem significado: ${[...missing].join(', ')}`);
  }
  return errors;
}

export async function readArticles(dir = 'data/articles') {
  const files = (await readdir(dir)).filter((file) => file.endsWith('.json')).sort();
  return Promise.all(files.map(async (file) => ({
    file,
    article: JSON.parse(await readFile(`${dir}/${file}`, 'utf8')),
  })));
}

async function main() {
  const common = JSON.parse(await readFile('data/common-words.json', 'utf8'));
  const entries = await readArticles();
  const seen = new Set();
  let failed = false;
  for (const { file, article } of entries) {
    const errors = validateArticle(article, common, seen);
    if (`${article.id}.json` !== file) errors.push(`id ${article.id} diferente do arquivo`);
    seen.add(article.source?.url);
    for (const error of errors) console.error(`${file}: ${error}`);
    failed ||= errors.length > 0;
  }
  if (failed) process.exit(1);
  console.log(`${entries.length} notícias válidas`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
