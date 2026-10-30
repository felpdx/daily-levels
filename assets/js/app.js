import { tokenize, buildLookup, findWord, normalize } from './words.js';
import { loadWords, saveWord, removeWord } from './store.js';

const TOPICS = { hacking: 'Hacking', bolsa: 'Bolsa', mundo: 'Mundo' };
const LEVEL_KEY = 'daily-levels:level';

const app = document.getElementById('app');
const sheet = document.getElementById('sheet');
const storage = safeStorage();

let topicFilter = 'all';
let commonWords = null;

function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem() { throw new Error('storage unavailable'); } };
  }
}

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key in node && key !== 'list') node[key] = value;
    else node.setAttribute(key, value);
  }
  node.append(...children);
  return node;
}

async function getJson(path) {
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

async function getCommonWords() {
  commonWords ??= await getJson('data/common-words.json');
  return commonWords;
}

function showError(text) {
  app.replaceChildren(el('div', { className: 'message' },
    el('p', { textContent: text }),
    el('button', { className: 'retry', textContent: 'Tentar de novo', onclick: route }),
  ));
}

function formatDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function setActiveNav(name) {
  for (const link of document.querySelectorAll('[data-nav]')) {
    if (link.dataset.nav === name) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

async function renderHome() {
  setActiveNav('home');
  const { articles } = await getJson('data/index.json');
  const list = el('div');
  const chips = el('div', { className: 'chips' });

  const drawChips = () => {
    chips.replaceChildren(...Object.entries({ all: 'Tudo', ...TOPICS }).map(([key, label]) => (
      el('button', {
        className: 'chip',
        textContent: label,
        'aria-pressed': String(topicFilter === key),
        onclick: () => { topicFilter = key; drawChips(); drawList(); },
      })
    )));
  };

  const drawList = () => {
    const visible = articles.filter(({ topic }) => topicFilter === 'all' || topic === topicFilter);
    if (!visible.length) {
      list.replaceChildren(el('p', { className: 'message', textContent: 'Ainda não há notícias aqui. Volte amanhã.' }));
      return;
    }
    const nodes = [];
    let day = null;
    for (const article of visible) {
      if (article.date !== day) {
        day = article.date;
        nodes.push(el('h2', { className: 'day', textContent: formatDate(day) }));
      }
      nodes.push(el('a', { className: 'story', href: `#/noticia/${article.id}` },
        el('span', { className: 'topic', textContent: TOPICS[article.topic] }),
        el('h2', { textContent: article.title }),
        el('span', { className: 'meta', textContent: `Fonte: ${article.source}` }),
      ));
    }
    list.replaceChildren(...nodes);
  };

  drawChips();
  drawList();
  app.replaceChildren(
    el('p', { className: 'intro', textContent: 'Notícias do dia em três níveis de inglês. Toque em qualquer palavra para ver o significado.' }),
    chips,
    list,
  );
}

function readLevel() {
  try {
    return ['1', '2', '3'].includes(storage.getItem(LEVEL_KEY)) ? storage.getItem(LEVEL_KEY) : '1';
  } catch {
    return '1';
  }
}

function writeLevel(level) {
  try {
    storage.setItem(LEVEL_KEY, level);
  } catch {
    // Only a convenience: the page still works on level 1.
  }
}

function withWords(text, article, lookup, onWord) {
  return tokenize(text).map((token) => {
    if (!token.isWord) return token.text;
    const key = findWord(lookup, token.text)?.word;
    return el('button', {
      className: article.glossary[key]?.highlight ? 'word key' : 'word',
      textContent: token.text,
      type: 'button',
      onclick: (event) => onWord(token.text, event.currentTarget),
    });
  });
}

function closeSheet() {
  sheet.hidden = true;
  document.querySelector('.word.active')?.classList.remove('active');
}

function openSheet(word, article, title, lookup, button) {
  document.querySelector('.word.active')?.classList.remove('active');
  button.classList.add('active');
  const entry = findWord(lookup, word);
  const key = entry?.word ?? normalize(word);
  const isSaved = () => loadWords(storage).some((saved) => saved.word === key);

  const save = el('button', {
    className: 'sheet-save',
    type: 'button',
    textContent: isSaved() ? 'Salva em Minhas palavras' : 'Salvar palavra',
    disabled: isSaved(),
    onclick: () => {
      const saved = saveWord(storage, { word: key, pt: entry.pt, articleId: article.id, title });
      save.textContent = saved ? 'Salva em Minhas palavras' : 'Não foi possível salvar neste navegador';
      save.disabled = true;
    },
  });

  sheet.replaceChildren(
    el('div', { className: 'sheet-head' },
      el('div', {},
        el('div', { className: 'sheet-word', textContent: key }),
        el('div', { className: 'sheet-meaning', textContent: entry?.pt ?? 'Significado indisponível.' }),
      ),
      el('button', { className: 'sheet-close', type: 'button', textContent: '×', 'aria-label': 'Fechar', onclick: closeSheet }),
    ),
    ...(entry ? [save] : []),
  );
  sheet.hidden = false;
}

async function renderArticle(id) {
  setActiveNav('home');
  const [article, common] = await Promise.all([getJson(`data/articles/${id}.json`), getCommonWords()]);
  const lookup = buildLookup(article.glossary, common);
  const container = el('article');

  const draw = (level) => {
    closeSheet();
    const { title, text } = article.levels[level];
    const onWord = (word, button) => openSheet(word, article, title, lookup, button);
    container.replaceChildren(
      el('span', { className: 'topic', textContent: `${TOPICS[article.topic]} · ${formatDate(article.date)}` }),
      el('h1', { className: 'article-title' }, ...withWords(title, article, lookup, onWord)),
      el('div', { className: 'tabs', role: 'tablist', 'aria-label': 'Nível de inglês' },
        ...['1', '2', '3'].map((value) => el('button', {
          className: 'tab',
          type: 'button',
          role: 'tab',
          textContent: `Level ${value}`,
          'aria-selected': String(value === level),
          onclick: () => { writeLevel(value); draw(value); },
        })),
      ),
      el('div', { className: 'article-text' },
        ...text.split(/\n\s*\n/).map((paragraph) => el('p', {}, ...withWords(paragraph, article, lookup, onWord))),
      ),
      el('p', { className: 'source' },
        'Texto reescrito para estudo a partir de ',
        el('a', { href: article.source.url, target: '_blank', rel: 'noopener', textContent: article.source.name }),
        '.',
      ),
    );
  };

  draw(readLevel());
  app.replaceChildren(el('a', { className: 'back', href: '#/', textContent: '← Notícias' }), container);
}

function renderWords() {
  setActiveNav('words');
  const words = loadWords(storage);
  const title = el('h1', { textContent: 'Minhas palavras' });
  if (!words.length) {
    app.replaceChildren(title, el('p', { className: 'message', textContent: 'Você ainda não salvou nenhuma palavra. Toque em uma palavra de uma notícia para salvar.' }));
    return;
  }
  app.replaceChildren(
    title,
    el('p', { className: 'intro', textContent: 'As palavras ficam salvas neste aparelho.' }),
    ...words.map(({ word, pt, articleId, title: articleTitle }) => el('div', { className: 'saved' },
      el('div', {},
        el('strong', { textContent: word }),
        el('div', { textContent: pt }),
        el('a', { href: `#/noticia/${articleId}`, textContent: articleTitle }),
      ),
      el('button', {
        className: 'remove',
        type: 'button',
        textContent: 'Remover',
        onclick: () => { removeWord(storage, word); renderWords(); },
      }),
    )),
  );
}

async function route() {
  closeSheet();
  window.scrollTo(0, 0);
  const [, page, id] = location.hash.split('/');
  try {
    if (page === 'palavras') renderWords();
    else if (page === 'noticia' && id) await renderArticle(id);
    else await renderHome();
  } catch {
    showError(page === 'noticia'
      ? 'Não consegui abrir esta notícia. Verifique sua internet.'
      : 'Não consegui carregar as notícias. Verifique sua internet.');
  }
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeSheet();
});

window.addEventListener('hashchange', route);
route();
