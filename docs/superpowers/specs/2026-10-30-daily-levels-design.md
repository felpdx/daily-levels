# Daily Levels: notícias em 3 níveis de inglês

Data: 2026-10-30. Nome provisório, escolhido pelo construtor.

## Intenção

Um site pessoal para aprender inglês lendo notícias dos assuntos que o dono já quer acompanhar. O News in Levels resolve o formato, mas não cobre esses assuntos: hacking e cibersegurança, Bolsa brasileira e economia, e a opinião de especialistas de fora sobre o Brasil. O objetivo é ganhar vocabulário com um hábito diário que não dá trabalho.

## Objetivos

- Publicar notícias novas todo dia, sem ninguém fazer nada, mesmo com o PC desligado.
- Permitir a leitura no celular e no computador por um link direto.
- Oferecer cada notícia nos níveis 1, 2 e 3, no estilo do News in Levels.
- Mostrar o significado em português ao tocar em qualquer palavra.
- Guardar palavras em "Minhas palavras".

## Fora desta versão

Áudio, quiz, login, senha, notificações, sincronização de palavras entre aparelhos e recursos para outros usuários.

## O que seria um fracasso

- Notícia com fato, número ou citação que não está na fonte. Em finanças e segurança, um dado inventado é pior do que publicar menos.
- Texto copiado da fonte em vez de reescrito.
- Nível 1 difícil de verdade para quem está começando.
- Palavra tocada sem significado.
- Site quebrado ou vazio porque a tarefa do dia falhou.

## Decisões do dono

- Assuntos e fontes em inglês, incluindo BBC e The Hacker News.
- Reescrita nos níveis 1, 2 e 3, no estilo do News in Levels.
- Atualização automática diária.
- Uso pessoal.
- Leitura no celular e no computador.
- Visual A, "Jornal limpo": uma coluna, fundo claro de papel, títulos serifados, abas de nível e significado ao tocar. Referência: `.superpowers/brainstorm/1065-1793369292/content/estilo-da-leitura.html`.
- Conta no GitHub já existente.

## Decisões do construtor, aceitas pelo dono na descrição

- 5 notícias por dia: 2 de hacking, 2 de Bolsa e economia, 1 do mundo.
- Página inicial com a lista do dia, filtro por assunto e notícias antigas.
- Tamanho dos textos: cerca de 60, 120 e 200 palavras.
- Palavras salvas ficam em cada aparelho.
- Cada notícia tem link para a matéria original.

## Decisões técnicas do construtor

### Publicação

- Site estático em HTML, CSS e JavaScript puros, sem etapa de build.
- Repositório público no GitHub, servido pelo GitHub Pages. O plano gratuito exige repositório público, então o código e as notícias ficam visíveis para quem procurar.
- Publicação feita por GitHub Actions, a cada mudança na branch da rotina. Rotinas podem ser limitadas a branches `claude/*`, então o deploy deve aceitar essa branch se o push direto na `main` for recusado.

### Geração diária

- Rotina na nuvem do Claude, modelo `claude-sonnet-5-5`, com cron `0 9 * * *` (6h em São Paulo).
- A rotina usa o plano Claude do dono, sem chave de API.
- O dono precisa dar acesso do Claude ao repositório no GitHub.

Passos da rotina, descritos em `routine/daily-prompt.md`:

1. Rodar `scripts/fetch-candidates.mjs`, que lê os feeds e remove notícias já publicadas.
2. Escolher as notícias do dia, respeitando a divisão por assunto.
3. Abrir o texto completo de cada matéria.
4. Escrever os três níveis e o glossário em JSON.
5. Rodar `scripts/validate.mjs`. Corrigir o que falhar.
6. Atualizar `data/index.json`, fazer commit e push.

### Fontes testadas em 2026-10-30

| Assunto | Fonte | Situação |
|---|---|---|
| Mundo | BBC World RSS | Funciona |
| Economia | BBC Business RSS | Funciona |
| Hacking | The Hacker News (feedburner) | Funciona |
| Hacking | Krebs on Security RSS | Funciona, com poucas notícias |
| Bolsa | Google News RSS, buscas "Brazil stocks Ibovespa" e "Brazil economy analysts" | Funciona, mas traz só manchetes de vários jornais |
| Economia | CNBC RSS | Funciona |
| Hacking | BleepingComputer | Bloqueado (403) |
| Economia | Reuters RSS | Não existe mais (404) |
| Economia | The Brazilian Report | Sem resposta |
| Bolsa | Rio Times | Funciona, mas é pouco focado em Brasil |

O Google News é a fonte que mais importa para a Bolsa, e também a mais frágil, porque traz só a manchete e parte dos jornais tem paywall. Seus links também não levam direto à matéria por `curl`, então a rotina procura a mesma matéria na web e usa apenas o que conseguir ler. MercoPress entrou como fonte extra, e FXStreet e Gulf News foram legíveis nas análises sobre o Brasil.

O The Hacker News responde 403 ao `fetch` do Node e aceita `curl`, por isso `scripts/read-article.mjs` usa `curl`.

### Regras de conteúdo

- Todo fato vem do texto lido. Sem texto completo, a notícia é descartada. Nunca escrever só a partir da manchete.
- Números, nomes e datas ficam iguais nos três níveis.
- Opinião aparece como opinião, com quem disse, e nunca como recomendação de investimento.
- Não copiar frases da fonte. O nível 3 também é escrito do zero.
- Na falta de notícia boa de um assunto, publicar menos. Nunca inventar nem repetir.

Perfil dos níveis:

| Nível | Tamanho | Frases | Vocabulário |
|---|---|---|---|
| 1 | cerca de 60 palavras | curtas, ideia única, presente e passado simples | cerca de 1000 palavras mais comuns |
| 2 | cerca de 120 palavras | conectores simples, mais tempos verbais | cerca de 2000 palavras mais comuns |
| 3 | cerca de 200 palavras | próximas de uma notícia real | cerca de 3000 palavras, mais termos do assunto |

### Dados

`data/index.json` lista as notícias, da mais nova para a mais antiga. Cada notícia fica em `data/articles/AAAA-MM-DD-slug.json`:

```json
{
  "id": "2026-10-30-slug",
  "date": "2026-10-30",
  "topic": "hacking | bolsa | mundo",
  "source": { "name": "BBC News", "url": "https://...", "publishedAt": "..." },
  "levels": {
    "1": { "title": "...", "text": "..." },
    "2": { "title": "...", "text": "..." },
    "3": { "title": "...", "text": "..." }
  },
  "glossary": {
    "steal": { "pt": "roubar", "forms": ["steals", "stole", "stolen", "stealing"] }
  }
}
```

`data/common-words.json` traz palavras como "the", "is" e "of", para não repetir em cada notícia.

### Validação

`scripts/validate.mjs` falha se:

- faltar campo, nível ou link da fonte;
- o tamanho sair de uma margem de 25% em volta do alvo;
- alguma palavra do texto não estiver no glossário nem nas palavras comuns;
- a notícia já tiver sido publicada, pelo link da fonte.

### Telas

- **Início:** notícias do dia, filtro por assunto (Tudo, Hacking, Bolsa, Mundo) e notícias anteriores.
- **Notícia:** abas de nível, texto, significado ao tocar, botão de salvar palavra e link da fonte. O nível escolhido fica lembrado.
- **Minhas palavras:** lista salva no aparelho, com a palavra, o significado e a notícia de origem.
- A interface é em português, e as notícias são em inglês.
- O layout deve funcionar em celular, com fonte confortável e área de toque grande.

### Quando algo falha

- Se a rotina falhar, o site continua com as notícias anteriores.
- Só entra no site a notícia que passar na validação.
- Se um feed cair, a rotina segue com os outros e registra a falha no commit.

## O que fica para o construtor

Organização do código, detalhes visuais, slug, fonte tipográfica e texto da página inicial.

## Riscos

- O plano Claude do dono pode ter limite de uso para rotinas. Medir na primeira semana.
- A rotina pode não ter permissão de push na `main`. Testar antes de ligar o agendamento.
- Sites de notícia podem bloquear leitura a partir da nuvem. Testar a rotina na nuvem, não só local.
