# Daily Levels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Site estático pessoal com 5 notícias diárias em 3 níveis de inglês, geradas por uma rotina na nuvem.

**Architecture:** Página única em JavaScript puro, que lê JSON de `data/`. Rotina do Claude coleta feeds, escreve os JSON, valida e faz push. GitHub Actions publica no Pages.

**Tech Stack:** HTML, CSS, JS de módulos, Node 20+ sem dependências, `node:test`, GitHub Actions e Pages.

**Spec:** `docs/superpowers/specs/2026-10-30-daily-levels-design.md`

## Global Constraints

- Sem dependências npm e sem etapa de build.
- Interface em português, notícias em inglês.
- Tamanho por nível: 45-75, 90-150 e 150-250 palavras.
- Tópicos válidos: `hacking`, `bolsa`, `mundo`.
- Cron da rotina: `0 9 * * *`, modelo `claude-sonnet-5-5`.
- Armazenamento local sempre em `try/catch`.

## Review Focus

- Possessivo e contração ("Brazil's", "don't"), com apóstrofo reto ou curvo: tocar deve mostrar significado.
- Palavra com hífen ("cyber-attack"): cada parte tem significado.
- Número, porcentagem e código ("15%", "CVE-2026-1234"): não pode exigir glossário nem quebrar o texto.
- Rotina rodando duas vezes no dia: nenhuma notícia duplicada.
- `localStorage` bloqueado ou arquivo JSON indisponível: a página mostra mensagem e não fica em branco.

---

### Task 1: Palavras, validação e índice

**Files:**
- Create: `assets/js/words.js`, `scripts/validate.mjs`, `scripts/build-index.mjs`, `data/common-words.json`
- Test: `tests/words.test.mjs`, `tests/validate.test.mjs`

**Interfaces:**
- Produces: `tokenize(text) -> Array<{text, isWord}>`, `countWords(text) -> number`, `normalize(word) -> string`, `buildLookup(glossary, common) -> Map`, `findWord(lookup, word) -> {word, pt} | null`.
- Produces: `validateArticle(article, common, publishedUrls) -> string[]`, `buildIndex(articles) -> {articles: [...]}`.

- [ ] Testes de `tokenize`: `"Brazil's 15% cyber-attack"` mantém o texto ao juntar tudo, marca `Brazil's`, `cyber`, `attack` como palavras e `15%` como não palavra.
- [ ] Testes de `findWord`: `Brazil's` e `Brazil’s` acham `brazil`; `STOLE` acha `steal` pelo `forms`; palavra ausente retorna `null`.
- [ ] Testes de `validateArticle`: campo faltando, tamanho fora da margem, palavra sem significado, URL repetida, tópico inválido; artigo correto retorna `[]`.
- [ ] Teste de `buildIndex`: ordem por data decrescente e, no mesmo dia, hacking, bolsa, mundo.
- [ ] Rodar e ver falhar, implementar, rodar e ver passar: `node --test tests/`.

### Task 2: Coleta de candidatas

**Files:**
- Create: `scripts/feeds.json`, `scripts/fetch-candidates.mjs`
- Test: `tests/candidates.test.mjs`

**Interfaces:**
- Produces: `parseFeed(xml, feed) -> Candidate[]`, `filterCandidates(items, publishedUrls) -> Candidate[]`.
- `Candidate = {topic, title, url, source, publishedAt}`. CLI imprime JSON. Feed com erro vai para stderr e não interrompe.

- [ ] Testes: RSS com CDATA e entidades; Google News separa `Título - Jornal`; URL publicada e repetida é removida.
- [ ] Implementar, rodar `node --test tests/` e testar a CLI nos feeds reais.

### Task 3: Site

**Files:**
- Create: `index.html`, `assets/css/style.css`, `assets/js/app.js`, `assets/js/store.js`
- Create: `.claude/launch.json`, `scripts/dev-server.mjs`
- Test: `tests/store.test.mjs`

**Interfaces:**
- Consumes: `words.js`.
- Produces: `loadWords(storage)`, `saveWord(storage, entry)`, `removeWord(storage, word)`.
- Rotas: `#/`, `#/noticia/<id>`, `#/palavras`.

- [ ] Testes de `store.js`: salvar, não duplicar, remover e funcionar com storage que lança erro.
- [ ] Implementar telas no visual A, com mensagem para erro de carregamento e lista vazia.
- [ ] Verificar no navegador em tamanho de celular e de computador.

### Task 4: Primeiras notícias reais

**Files:**
- Create: `data/articles/*.json`, `data/index.json`

- [ ] Rodar a coleta, escolher 5 notícias com texto legível.
- [ ] Escrever níveis e glossários, seguindo as regras de conteúdo da spec.
- [ ] `node scripts/build-index.mjs` e `node scripts/validate.mjs` sem erros.

### Task 5: Rotina e publicação

**Files:**
- Create: `routine/daily-prompt.md`, `.github/workflows/pages.yml`, `.gitignore`, `README.md`

- [ ] Escrever o prompt autossuficiente da rotina.
- [ ] Workflow em push para `main` e `claude/**`: roda testes e validação; se a branch for `claude/**`, envia para `main`; publica `index.html`, `assets/` e `data/`.
- [ ] Repositório, login e autorização do dono.
- [ ] Rodar a rotina uma vez na nuvem e conferir as notícias e o site publicado.
