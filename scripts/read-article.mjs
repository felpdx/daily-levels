// Prints the readable text of a news page, so the routine can check the facts it rewrites.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const run = promisify(execFile);
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const MIN_LENGTH = 400;

function decode(text) {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function paragraphsOf(html) {
  return [...html.matchAll(/<p[\s>][\s\S]*?<\/p>/g)]
    .map(([paragraph]) => decode(paragraph))
    .filter((paragraph) => paragraph.length > 40)
    .join('\n\n');
}

export function extractText(html) {
  // Some pages use <article> for small cards too, so keep the block with the most text.
  const blocks = [...html.matchAll(/<article[\s>][\s\S]*?<\/article>/g)].map(([block]) => paragraphsOf(block));
  const best = blocks.reduce((longest, text) => (text.length > longest.length ? text : longest), '');
  return best.length >= MIN_LENGTH ? best : paragraphsOf(html);
}

async function main() {
  // curl, because The Hacker News answers 403 to Node's fetch but not to curl.
  const { stdout } = await run('curl', ['-sSLf', '-m', '20', '-A', USER_AGENT, process.argv[2]], { maxBuffer: 20e6 });
  const text = extractText(stdout);
  if (text.length < MIN_LENGTH) throw new Error('Texto insuficiente: provável paywall ou bloqueio');
  console.log(text);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main().catch((error) => {
    console.error(`Não foi possível ler a matéria: ${error.message}`);
    process.exit(1);
  });
}
