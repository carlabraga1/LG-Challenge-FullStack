# Desafio MovieLens — Full-Stack

Explorador de filmes construído sobre o dataset [MovieLens](https://grouplens.org/datasets/movielens/) e enriquecido com o [TMDB](https://www.themoviedb.org). O front-end — principal superfície de avaliação — oferece busca instantânea, filtros, listas de mais bem avaliados e mais populares, página de detalhes com elenco/trailer/backdrop, favoritos, tema claro/escuro, interface bilíngue e layout responsivo. A API é documentada com Swagger e coberta por testes automatizados.

- **API** — Node.js 22, [Fastify](https://fastify.dev), [Prisma](https://www.prisma.io), SQLite. Swagger UI em `/docs`.
- **Cliente** — React 18 + TypeScript + Vite, [Tailwind CSS v4](https://tailwindcss.com), componentes [shadcn/ui](https://ui.shadcn.com), [TanStack Query](https://tanstack.com/query) e Axios. Servido por nginx em produção.
- **Testes** — 31 na API + 49 no front, todos passando.

---

## Sumário

- [Telas](#telas)
- [Arquitetura](#arquitetura)
- [Como executar — Node (recomendado)](#como-executar--node-recomendado)
- [Como executar — Docker (opcional)](#como-executar--docker-opcional)
- [Build de produção](#build-de-produção)
- [Enriquecimento via TMDB (opcional)](#enriquecimento-via-tmdb-opcional)
- [Como usar a aplicação](#como-usar-a-aplicação)
- [Funcionalidades do front-end](#funcionalidades-do-front-end)
- [Referência da API REST](#referência-da-api-rest)
- [Como funciona a heurística de popularidade](#como-funciona-a-heurística-de-popularidade)
- [Testes](#testes)
- [Tecnologias escolhidas e por quê](#tecnologias-escolhidas-e-por-quê)
- [Decisões de projeto e trade-offs](#decisões-de-projeto-e-trade-offs)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Publicação](#publicação)
- [Para quem for avaliar](#para-quem-for-avaliar)

---

## Telas

| Rota             | O que mostra                                                                                               |
|------------------|-------------------------------------------------------------------------------------------------------------|
| `/`              | **Home** — busca em destaque, atalhos de gênero, estatísticas do dataset, barra de filtros, grid de resultados com paginação, trilho "Mais bem avaliados" (média simples) e "Mais populares" (média bayesiana) |
| `/movies/:id`    | **Detalhes** — backdrop, pôster, elenco, direção, métricas, link do IMDB e trailer em um diálogo             |
| `/favorites`     | **Favoritos** — os títulos salvos neste navegador                                                            |

A Home carrega todo o seu estado na query string, então `/?search=matrix`,
`/?genre=Comedy&year=1995` e `/?genre=Drama&page=3` são URLs reais e compartilháveis.

---

## Arquitetura

```
+-----------------+        HTTP /api/*         +--------------------+
|   Navegador     |  <----------------------> |  nginx (web:80)    |
|   SPA React     |                            |  /api/* -> api:3000|
+-----------------+                            +--------------------+
                                                          |
                                                          v
                                              +-------------------------+
                                              |  API Fastify (api:3000) |
                                              |  Swagger UI em /docs    |
                                              +-------------------------+
                                                          |
                                    +---------------------+---------------------+
                                    v                                           v
                       +-------------------------+                 +-------------------------+
                       |  SQLite (Prisma)        |                 |  API TMDB (opcional)    |
                       |  Movies, Genres, Stats, |  <-- cacheia -- |  Pôster, elenco,        |
                       |  TmdbCache              |                 |  trailer (sob demanda)  |
                       +-------------------------+                 +-------------------------+
                                    ^
                                    |  ETL (idempotente, roda no boot)
                       +-------------------------+
                       |  CSVs do MovieLens      |
                       |  ml-latest-small        |
                       +-------------------------+
```

O dataset (~1 MB) é embutido na imagem da API durante o build, então o contêiner é
autossuficiente. O enriquecimento via TMDB acontece sob demanda e é cacheado no SQLite —
**a aplicação funciona por completo sem chave do TMDB**, apenas sem as imagens.

---

## Como executar — Node (recomendado)

**Pré-requisitos** — [Node.js 20+](https://nodejs.org) e npm. É só isso: o banco é SQLite,
que é um arquivo, então não há servidor de banco para instalar ou subir.

### 1. Dataset (uma vez, ~1 MB)

Na raiz do projeto:

```powershell
npm run dataset:download
```

### 2. API — primeiro terminal

```powershell
cd api
copy .env.example .env      # macOS/Linux: cp .env.example .env
npm install
npx prisma migrate deploy
npm run dev                 # tsx watch, reinicia a cada alteração
```

> Copiar o `.env.example` é **obrigatório**, não opcional — é ele que define a
> `DATABASE_URL` que o Prisma lê. Sem isso, o `prisma migrate deploy` para com
> `Environment variable not found: DATABASE_URL`.

A API sobe em **http://localhost:3000**. No primeiro boot ela aplica as migrations e roda
o ETL, que carrega os CSVs do MovieLens no SQLite e pré-calcula os agregados de avaliação
(~3 s). Nos boots seguintes o ETL é pulado.

| Onde              | URL                                |
|-------------------|------------------------------------|
| API — Swagger UI  | http://localhost:3000/docs         |
| API — health      | http://localhost:3000/health       |

### 3. Front — segundo terminal

```powershell
cd web
npm install
npm run dev                 # servidor de desenvolvimento do Vite em :5173
```

Abra **http://localhost:5173**. O Vite faz proxy de `/api` para a API em `:3000`, então não
há mais nada para configurar.

### 4. Chave do TMDB (opcional, mas recomendada)

Tudo acima funciona sem chave — você apenas não verá pôsteres, backdrops, elenco, sinopse
nem trailers. Para habilitar, pegue uma chave gratuita (30 segundos, sem confirmação por
e-mail):

1. Cadastre-se em https://www.themoviedb.org/signup
2. Vá em https://www.themoviedb.org/settings/api e solicite uma chave (escolha "Developer")
3. Copie o "API Read Access Token" (bearer v4) *ou* a "API Key" (v3)

Descomente a linha correspondente no `api/.env` e reinicie a API:

```env
TMDB_BEARER_TOKEN=eyJhbGciOi...   # OU
TMDB_API_KEY=abcd1234...
```

---

## Como executar — Docker (opcional)

Se você já tem [Docker Desktop](https://www.docker.com/products/docker-desktop/)
(Windows/macOS) ou Docker Engine + Compose v2 (Linux), a stack inteira também roda em dois
contêineres. É uma alternativa ao caminho Node acima, não um requisito.

Opcionalmente copie o `.env.example` **da raiz** para `.env` e cole uma chave do TMDB — o
Compose repassa a variável para o contêiner da API. Então:

```powershell
docker compose up --build
```

1. Builda a imagem da API (instala dependências, gera o client do Prisma, embute o dataset).
2. Builda a imagem do front (compila o React, empacota no nginx).
3. Sobe as duas. No primeiro boot aplica migrations e roda o ETL.

| Onde              | URL                                |
|-------------------|------------------------------------|
| Aplicação web     | http://localhost:8080              |
| API — Swagger UI  | http://localhost:3000/docs         |
| API — health      | http://localhost:3000/health       |

Encerre com `Ctrl+C`; limpe com `docker compose down` (adicione `-v` para apagar também o
volume do SQLite e o cache do TMDB). Depois de mudar código, rebuilde com
`docker compose up --build`.

> **Transparência:** o caminho Docker foi escrito a partir da especificação do Compose, mas
> **não foi executado** na máquina de desenvolvimento (que não tem Docker instalado). O
> caminho Node acima é o que está verificado de ponta a ponta.

---

## Build de produção

As seções anteriores rodam os dois lados em modo watch. Para compilar e executar o
resultado:

```powershell
# API — compila o TypeScript para dist/ e roda em Node puro
cd api
npm run build
npm start                   # serve em :3000

# Front — checa tipos, gera o bundle em dist/ e serve o build
cd web
npm run build
npm run preview             # serve a SPA compilada em :4173
```

O `npm run build` do `web/` roda `tsc --noEmit` antes do `vite build`, então um erro de tipo
quebra o build em vez de ir para produção. O bundle sai em `web/dist/` (~147 kB de JS e
~7 kB de CSS, ambos gzipados) — é exatamente o que a imagem nginx serve no Docker.

Para apontar o cliente para uma API em outra origem, defina `VITE_API_URL` no build:

```powershell
$env:VITE_API_URL = "https://sua-api.exemplo.com"; npm run build
```

Comandos disponíveis nos dois pacotes:

| Comando           | O que faz                                       |
|-------------------|-------------------------------------------------|
| `npm run dev`     | Modo watch                                      |
| `npm run build`   | Build de produção                               |
| `npm start`       | Executa a API compilada (só em `api/`)          |
| `npm run preview` | Serve a SPA compilada (só em `web/`)            |
| `npm test`        | Roda a suíte de testes                          |
| `npm run lint`    | Checagem de tipos sem emitir arquivos           |

---

## Enriquecimento via TMDB (opcional)

Sem chave do TMDB a aplicação funciona — você só não recebe pôster, backdrop, elenco,
sinopse e trailer. Com chave, a API consulta o TMDB na primeira vez que cada filme é
necessário, extrai o que a interface usa (caminho do pôster, backdrop, sinopse, duração,
idioma original, direção, os 10 primeiros do elenco e a chave do trailer no YouTube) e grava
na tabela `TmdbCache`. As visitas seguintes leem do cache — sem repetir chamadas.

**Por que sob demanda?** O dataset tem 9.742 filmes. Enriquecer todos durante o ETL levaria
uns 30 minutos (os limites de taxa do TMDB são generosos, mas existem) e desperdiçaria
esforço com filmes que ninguém abre. Buscar só o necessário mantém o ETL rápido.

São aceitas tanto a `TMDB_API_KEY` (v3) quanto o `TMDB_BEARER_TOKEN` (v4); se ambas
estiverem definidas, o bearer tem precedência.

Se o TMDB estiver inacessível (erro de rede, limite de taxa, timeout, chave ausente), a API
devolve o filme com `tmdb: null` e a interface degrada com elegância — sem erro vermelho,
sem layout quebrado: apenas um pôster placeholder e as seções de elenco/trailer ocultas.

---

## Como usar a aplicação

Abra **http://localhost:5173** (desenvolvimento) ou **http://localhost:8080** (Docker).

**Buscar.** Digite no campo de busca no topo da página. Os resultados se atualizam quando
você para de digitar (debounce de 300 ms); não há botão de buscar para pressionar. O `×`
limpa a consulta.

**Filtrar.** Os chips de gênero abaixo do título são filtros de um clique — toque em um para
navegar naquele gênero, toque de novo para desligar. Os seletores de Ano e Gênero na barra
de filtros fazem o mesmo com as listas completas e podem ser combinados. "Limpar" remove
todos os filtros ativos de uma vez.

**Compartilhar e navegar.** Tudo que você busca ou filtra é escrito na URL, então
`/?genre=Drama&year=1994&page=2` pode ser copiado para outra pessoa e abre exatamente a
mesma visão. O botão Voltar do navegador percorre buscas e páginas.

**As listas.** Abaixo dos resultados ficam *Filmes mais bem avaliados* — o top-K ingênuo por
média simples, onde o problema de amostra pequena aparece — e *Mais populares*, o mesmo
catálogo ordenado pela nota ponderada. Comparar os dois mostra a heurística funcionando.

**Detalhes do filme.** Clique em qualquer card: backdrop, pôster, gêneros, duração, notas
média e ponderada, número de avaliações, sinopse, direção, elenco, link do IMDB e o trailer
em player embutido (os campos vindos do TMDB só aparecem com a chave configurada).

**Favoritos.** O coração em qualquer card — ou na página de detalhes — salva o filme neste
navegador. O contador no cabeçalho atualiza na hora e `/favorites` lista todos.

**Tema escuro.** O botão de sol/lua no cabeçalho. Sua escolha é lembrada; na primeira visita
a aplicação segue a preferência do sistema operacional.

**Idioma.** O botão `EN` / `PT` no cabeçalho alterna toda a interface entre inglês e
português. Como o tema, a escolha é lembrada; na primeira visita segue o idioma do
navegador.

---

## Funcionalidades do front-end

Além da busca / filtros / listas exigidos, o cliente implementa:

- **Estado dos filtros na URL** — `?search=`, `?genre=`, `?year=` e `?page=` são a única
  fonte de verdade, então toda visão de resultado é compartilhável, sobrevive a um F5, e o
  botão Voltar percorre buscas e páginas
- **Busca instantânea** com debounce de 300 ms — o input é estado local para a digitação
  nunca travar, e só o valor debounced chega à URL e à rede (`useSearchInput`)
- **Estado de servidor com TanStack Query** — chave de cache por conjunto de filtros,
  `keepPreviousData` para a paginação nunca piscar um grid vazio, e uma tentativa extra em
  falhas transitórias
- **Página de detalhes** com backdrop, pôster, elenco, direção, link do IMDB e trailer em um
  `Dialog` do shadcn (player embutido, sem mandar o usuário para outra aba)
- **Paginação** com anterior/próxima, indicador de página e total de resultados, desabilitada
  corretamente nas duas pontas
- **Favoritos** persistidos em `localStorage`, com contador ao vivo no cabeçalho; a página de
  favoritos busca cada filme salvo através do cache compartilhado do Query
- **Interface bilíngue (Português / English)** — toda string visível, `aria-label` e
  placeholder passa por `t()`; o separador de milhar acompanha o idioma (`9.742` vs `9,742`),
  o `<html lang>` é mantido em sincronia e a escolha é persistida
- **Gêneros localizados sem quebrar os dados** — os rótulos aparecem traduzidos ("Ficção
  Científica", "Suspense"), mas o valor canônico do MovieLens continua sendo o que vai para a
  URL e para a API
- **Tema claro/escuro**, persistido e respeitando o `prefers-color-scheme` do sistema na
  primeira carga
- **Layout responsivo** — o grid vai de 2 a 4 colunas; a página de detalhes empilha no mobile
- **Estados de carregamento, erro e vazio em todo lugar** — skeletons com o formato do
  conteúdo final, indicador de "atualizando" sobre resultados já exibidos, botão de tentar
  novamente em falhas e um estado vazio que oferece limpar os filtros
- **Degradação sem TMDB** — pôster, elenco, sinopse e trailer são opcionais; a ausência de
  imagem vira um placeholder desenhado de propósito, não uma imagem quebrada
- **Acessibilidade** — inputs de busca com rótulo, `aria-pressed` nos toggles, `aria-busy` e
  `aria-live` na região de resultados, `role="alert"` nos erros, anel de foco visível em todo
  elemento interativo e `prefers-reduced-motion` respeitado
- **`ErrorBoundary` de renderização**, para que um componente que lance exceção não deixe a
  tela em branco

---

## Referência da API REST

Documentação OpenAPI interativa em **http://localhost:3000/docs** — gerada a partir dos
schemas das rotas do Fastify, então a especificação nunca diverge da validação.

| Método | Caminho                 | Query / Params                                     | Objetivo                                     |
|--------|-------------------------|----------------------------------------------------|----------------------------------------------|
| GET    | `/health`               | —                                                  | Verificação de disponibilidade                |
| GET    | `/genres`               | —                                                  | Lista todos os gêneros                        |
| GET    | `/stats`                | —                                                  | Contagens, faixa de anos, cobertura do TMDB   |
| GET    | `/movies/by-title`      | `title` (obrigatório), `limit`, `offset`           | Filmes cujo título contém o texto             |
| GET    | `/movies/by-year-genre` | `year`, `genre` (ambos opcionais), `limit`, `offset` | Navega por gênero e/ou ano                  |
| GET    | `/movies/top`           | `k` (obrigatório, 1–500)                           | K melhores por média simples                  |
| GET    | `/movies/popular`       | `k` (obrigatório, 1–500)                           | K melhores por média bayesiana (bônus)        |
| GET    | `/movies/:id`           | `id` (parâmetro de rota)                           | Detalhes completos + enriquecimento TMDB      |

Os endpoints paginados envolvem o array em `{ total, limit, offset, items: [...] }`.

### Formato da resposta (filme)

```json
{
  "id": 1,
  "title": "Toy Story",
  "originalTitle": "Toy Story (1995)",
  "year": 1995,
  "genres": ["Adventure", "Animation"],
  "imdbId": "tt0114709",
  "imdbUrl": "https://www.imdb.com/title/tt0114709/",
  "tmdbId": "862",
  "posterUrl": "https://image.tmdb.org/t/p/w342/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg",
  "stats": {
    "numRatings": 215,
    "avgRating": 3.92,
    "weightedRating": 3.87
  }
}
```

O `GET /movies/:id` acrescenta um bloco `tmdb` com backdrop, sinopse, duração, elenco,
direção, URL do trailer e afins.

---

## Como funciona a heurística de popularidade

Ordenar `/movies/top` pela média simples coloca filmes obscuros com duas notas 5 acima de
clássicos consagrados — exatamente o problema que o bônus levanta.

O `/movies/popular` usa a média ponderada bayesiana do IMDB Top-250:

```
WR = (v / (v + m)) · R  +  (m / (v + m)) · C
```

- `v` = número de avaliações que o filme recebeu
- `R` = nota média do filme
- `C` = média global de todas as avaliações (a *prior*)
- `m` = "mínimo de votos para a nota ser levada ao pé da letra"

Quando `v ≫ m`, `WR ≈ R`. Quando `v` é pequeno, `WR` é puxado na direção de `C`. Tanto `C`
quanto `m` são calculados pelo ETL a partir dos dados reais (`m` = percentil 75 da contagem
de votos), então a heurística se auto-ajusta ao dataset em vez de depender de constantes
chutadas.

A nota ponderada é calculada uma única vez no ETL e gravada em `MovieStats.weightedRating`,
então `/movies/popular` é apenas uma ordenação indexada, não um cálculo por requisição.

Dá para ver a diferença ao vivo: no ml-latest-small, `/movies/top` devolve um punhado de
filmes com 2 avaliações de nota 5,0, enquanto `/movies/popular` devolve Shawshank, O
Poderoso Chefão e Clube da Luta.

Implementação em `api/src/etl/popularity.ts`; testes em `api/tests/unit.test.ts`.

---

## Testes

```powershell
# API — 31 testes (11 unitários + 20 de integração de rotas)
cd api && npm test

# Front — 49 testes (serviço, i18n, hooks e componentes)
cd web && npm test
```

**Destaques da cobertura:**

- **Unitários (API)** — parser de título, separador de campos CSV (lida com vírgulas entre
  aspas e aspas duplicadas), fórmula da nota ponderada (monotonicidade + regularização de
  amostra pequena) e o cálculo de percentil.
- **Integração (API)** — todos os endpoints via `fastify.inject()` contra um SQLite semeado.
  Inclui busca por título e por gênero sem diferenciar maiúsculas, erros de validação
  retornando 400 com mensagem útil, `/movies/:id` devolvendo os campos do cache TMDB com as
  URLs de imagem corretamente montadas, `tmdb: null` quando não há cache e o TMDB está
  desligado, 404 para id inexistente, a heurística de popularidade rebaixando um 5,0 de 2
  votos abaixo de um clássico bem avaliado, e o `/movies/by-year-genre` respondendo com
  gênero sozinho, ano sozinho, ambos ou nenhum.
- **Front — serviço** — construção de endpoint e parâmetros, e o `toErrorMessage`
  desembrulhando o corpo de validação do Fastify, a linha de status, uma falha de rede e um
  `Error` comum.
- **Front — hooks** — o `resolveListMode` escolhendo o endpoint certo para cada combinação de
  filtros, incluindo busca só com espaços e gênero-ou-ano sozinho. O `useSearchInput` sob
  timers falsos: seis teclas resultam em exatamente uma busca, limpar envia termo vazio, e
  uma mudança externa é adotada sem ecoar de volta.
- **Front — i18n** — os dois dicionários expõem as mesmas chaves sem valores vazios, o idioma
  do navegador semeia a primeira visita, uma escolha salva prevalece sobre ele, alternar
  persiste e atualiza o `<html lang>`, parâmetros são interpolados (e um placeholder
  desconhecido é preservado em vez de virar `undefined`), e usar `t()` fora do provider lança
  erro em vez de servir inglês silenciosamente. Os 20 gêneros do MovieLens têm tradução, e um
  gênero fora do vocabulário cai no próprio nome.
- **Front — componentes** (`@testing-library/react`) — o `MovieCard` renderiza título, ano e
  nota na escala 0–5, limita os chips a dois gêneros, cai no placeholder sem pôster, alterna
  favoritos no `localStorage` sem navegar, mantém o botão de favorito **fora** do link (botão
  dentro de âncora é HTML inválido) e mostra o selo de ranking só quando ranqueado. A
  `Pagination` não renderiza nada com uma página só, informa a contagem e desabilita o botão
  certo em cada ponta. Ambos têm asserções em português para provar a localização.

Os testes de integração da API montam um banco novo iterando as pastas de migration em ordem
e executando o SQL direto (sem invocar o CLI do Prisma), e então semeiam uma fixture de 5
filmes. O `process.env` é limpo para garantir que o TMDB esteja desligado durante os testes
mesmo que exista uma chave exportada no shell de quem executa.

---

## Tecnologias escolhidas e por quê

| Preocupação          | Escolha                          | Por quê                                                                                                                             |
|----------------------|----------------------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| Linguagem            | TypeScript na API e no front     | Uma linguagem só, tipos compartilháveis e segurança de tipo na costura entre API e interface.                                        |
| Framework da API     | Fastify 5                        | Rápido, TypeScript de primeira classe, validação por JSON Schema embutida e plugin oficial de Swagger. Express precisaria de 3+ plugins para o mesmo. |
| Banco                | SQLite via Prisma                | O dataset é pequeno. Zero instalação, roda nativo no Windows e um único arquivo torna a reprodução trivial.                          |
| ORM                  | Prisma                           | Migrations + client tipado + tipos gerados. O `prisma studio` ainda dá um inspetor de banco de graça a quem avaliar.                 |
| Documentação da API  | @fastify/swagger + swagger-ui    | Spec OpenAPI 3 gerada dos mesmos JSON Schemas que validam as requisições — uma fonte de verdade, zero divergência.                   |
| Build do cliente     | Vite                             | HMR instantâneo, bundle enxuto, sem ginástica de configuração.                                                                       |
| Framework do cliente | React 18                         | A stack sugerida pelo desafio, ecossistema enorme e ótima integração com TypeScript.                                                 |
| Roteamento           | React Router 7                   | Páginas com link direto, necessário para `/movies/:id`, e o `useSearchParams` transforma a URL no store dos filtros.                 |
| Estado de servidor   | TanStack Query 5                 | Cache, deduplicação, paginação com `keepPreviousData` e retry saem de graça. Reimplementar isso à mão em torno de `useEffect` é a roda que não vale reinventar. |
| Cliente HTTP         | Axios                            | Instância interceptável, serialização de `params` que descarta `undefined` (filtros opcionais simplesmente somem) e respostas tipadas. |
| Estado de interface  | Apenas hooks do React            | Filtros moram na URL e os dados no Query — sobra tão pouco estado de cliente que um store global não gerenciaria nada.               |
| Estilo               | Tailwind CSS v4                  | Utilitários com o plugin do Vite, sem arquivo de config e sem etapa de PostCSS. O tema é a troca de uma classe `.dark` sobre variáveis CSS. |
| Componentes          | shadcn/ui                        | Componentes copiados para o repositório (não uma dependência) sobre primitivas Radix — comportamento acessível de Select/Dialog com posse total da marcação. |
| Ícones               | lucide-react                     | SVGs com tree-shaking, o mesmo conjunto usado no design de referência.                                                                |
| Internacionalização  | Context do React + dicionário tipado | Dois idiomas e ~75 strings não pagam o bundle e a configuração do i18next. O `ptBR` é tipado como `typeof en`, então esquecer uma tradução é erro de compilação, não uma chave crua na tela. |
| Testes               | Vitest                           | O mesmo runner nos dois pacotes, ESM e TypeScript nativos, e `fastify.inject()` rápido no mesmo processo.                            |
| Serviço em produção  | nginx (build multi-stage)        | Serve a SPA e faz proxy reverso de `/api`. Imagem final pequena e bem compreendida.                                                  |
| Integração TMDB      | `fetch` nativo, sem SDK          | Um endpoint, sob demanda, cacheado. Um SDK acrescentaria centenas de KB para uma chamada.                                            |
| Download do dataset  | Node puro, zero dependências     | Usa `Expand-Archive` no Windows e `unzip` no resto — comportamento idêntico no Docker e na máquina de quem desenvolve.               |

---

## Decisões de projeto e trade-offs

**Agregados pré-calculados no ETL, sem tabela de avaliações brutas.** A API nunca expõe
avaliações individuais — apenas agregados (top-K, popularidade). Guardar mais de 100 mil
linhas de avaliação seria peso morto. O ETL percorre o `ratings.csv` uma vez e grava uma
única linha de `MovieStats` por filme. A popularidade também é calculada nesse momento, de
modo que `/movies/popular` vira uma ordenação indexada, não um cálculo por requisição.

**Enriquecimento TMDB sob demanda e cacheado.** Enriquecer tudo de antemão levaria uns 30
minutos e serviria majoritariamente filmes que ninguém visita. Sob demanda mantém o ETL
rápido; o cache torna as visitas seguintes gratuitas.

**Os endpoints de listagem esperam pelas imagens, mas só até um limite.** Como o
enriquecimento é sob demanda, uma página que ninguém abriu não tem pôster em cache. Aquecer
o cache em *fire-and-forget* só ajuda a requisição **seguinte** — o que para o usuário se
parece com imagens que nunca carregam, e era exatamente o que acontecia: todo grid de busca
e de filtro renderizava placeholders. Agora a requisição de lista aguarda o aquecimento da
própria página (no máximo 20 linhas, 4 em paralelo) com teto de 4 s. O que não chegou a
tempo cai no placeholder e segue carregando em segundo plano, pronto para a próxima
requisição. Latência limitada, nenhum grid permanentemente vazio, e a segunda visita é
instantânea (medido: ~1,1 s na primeira carga, ~9 ms depois).

**Endpoints separados em vez de um `/movies` polimórfico.** Cada endpoint tem uma função —
busca por substring, navegação, top-K, popularidade. Um único `/movies` decidindo pelo que
veio na query empurraria complexidade de validação para dentro do handler e embaralharia a
documentação do Swagger.

**O `/movies/by-year-genre` aceita os dois filtros como opcionais.** No começo exigia ambos,
o que tornava impossíveis os chips de gênero de um clique da interface — escolher "Drama"
teria que pedir um ano antes de mostrar qualquer coisa. Hoje gênero sozinho, ano sozinho ou
nenhum são todos válidos, e o handler monta o `where` do Prisma com o que chegou. Passar os
dois continua se comportando exatamente como antes.

**O ETL roda no boot da API (idempotente), não em um contêiner de inicialização separado.**
`docker compose up api` é um comando único que sempre resulta numa API pronta para consulta.
Se o banco já tem filmes **e** estatísticas, o ETL sai em menos de 1 ms; se há filmes mas
não estatísticas (execução anterior interrompida), ele limpa e recarrega.

**Filtros na URL, dados de servidor no TanStack Query.** Entre os dois sobra tão pouco estado
de cliente que não há store global. O `useMovieFilters` lê e escreve a query string; o
`useMovies` é dono de todas as chaves de cache. O campo de busca guarda um único estado
local — o texto cru — porque amarrá-lo direto ao valor debounced da URL faria a digitação
parecer travada.

**Digitar substitui a URL, paginar empilha.** Caso contrário cada tecla deixaria uma entrada
no histórico e o botão Voltar andaria para trás dentro de uma palavra pela metade em vez de
retornar ao conjunto de resultados anterior.

**Gêneros: rótulo traduzido, valor canônico.** Gêneros são dados do dataset, não texto de
interface: estão no banco, viajam na URL e são o que a API filtra. Traduzir o valor quebraria
links compartilhados e as consultas. Só o rótulo é localizado.

**Favoritos no `localStorage`, não no servidor.** O objetivo era navegação anônima; criar
tabela de usuário e autenticação por causa de um botão de coração seria exagero. O registro
de listeners em nível de módulo dentro do `useFavorites` faz o contador do cabeçalho
atualizar na hora quando qualquer componente alterna um favorito.

**JSON Schema para validação, não Zod.** O validador AJV do Fastify e o `@fastify/swagger`
consomem JSON Schema. Adicionar Zod exigiria `zod-to-json-schema` (risco de divergência) ou
duplicar os schemas à mão. JSON Schema é uma fonte de verdade para validação **e**
documentação.

**URLs de pôster montadas no servidor, não no cliente.** O cliente recebe um campo
`posterUrl` pronto e renderiza. Mantém o cliente simples, permite trocar tamanhos num só
lugar e não espalha conhecimento da URL base do TMDB por todos os componentes.

**A busca por título usa `LIKE` do SQLite.** Sem índice FTS5, sem extensão de trigramas — um
`LIKE '%x%'` sobre 9 mil linhas leva menos de 5 ms e é perfeitamente adequado ao tamanho do
dataset. Com milhões de filmes eu revisitaria; para este desafio, é a escolha certa.

**Busca de gênero sem diferenciar maiúsculas com uma consulta bruta.** Prisma + SQLite não
tem `mode: "insensitive"`. Em vez de normalizar tudo para minúsculas ou fazer um join com
`LOWER(name) = LOWER(?)` varrendo a tabela, resolvemos o id do gênero uma vez na tabela
`Genre` (que tem ~20 linhas) e depois usamos um join indexado normal.

**Volume Docker nomeado para o arquivo SQLite.** O banco fica em `api-data`, não na imagem,
então `docker compose restart api` não força um novo ETL. `docker compose down -v` devolve um
ambiente limpo.

**Paleta de cores.** Os tokens de cor (base neutra fria em hue 220 com primário carmim
`hsl(345 100% 32%)`) foram portados do sistema de design de referência. Uma exceção
deliberada: no tema escuro o anel de foco usa o tom mais claro `hsl(345 100% 50%)`, porque
carmim a 32% de luminosidade sobre um fundo a 8% é um indicador de foco praticamente
invisível. Os estados de erro também mantêm um vermelho próprio, para não ficarem idênticos
a um botão primário.

---

## Estrutura do projeto

```
LG-Challenge-FullStack/
├── docker-compose.yml
├── .env.example              # raiz: credenciais TMDB para o Compose (opcional)
├── package.json              # raiz: script de download do dataset
├── README.md                 # este arquivo
├── scripts/
│   └── download-dataset.mjs  # multiplataforma, sem dependências
├── data/                     # preenchido pelo script de download (fora do git)
├── api/
│   ├── Dockerfile            # multi-stage, embute o dataset
│   ├── prisma/
│   │   ├── schema.prisma     # Movie, Genre, MovieGenre, MovieStats, TmdbCache
│   │   └── migrations/       # 2 migrations: init + tmdb_cache
│   ├── src/
│   │   ├── server.ts         # boot: ETL e então escuta
│   │   ├── env.ts            # carrega api/.env + defaults, antes do Prisma subir
│   │   ├── app.ts            # fábrica do Fastify + Swagger
│   │   ├── db.ts             # acesso ao client do Prisma
│   │   ├── routes/movies.ts  # 5 rotas + /genres + /stats
│   │   ├── services/
│   │   │   ├── movies.service.ts  # todas as consultas ao banco
│   │   │   ├── tmdb.service.ts    # busca no TMDB + cache
│   │   │   └── tmdb.image.ts      # montagem de URLs (pôster/backdrop/perfil)
│   │   └── etl/
│   │       ├── import.ts     # CSV -> SQLite, calcula MovieStats + nota ponderada
│   │       ├── csv.ts        # separador de campos RFC-4180
│   │       ├── title.ts      # extrai o (AAAA) do fim do título
│   │       └── popularity.ts # média ponderada do IMDB + percentil
│   └── tests/
│       ├── globalSetup.ts    # aplica migrations + semeia a fixture
│       ├── unit.test.ts      # 11 testes unitários
│       └── routes.test.ts    # 20 testes de rota/integração
└── web/
    ├── Dockerfile            # builder multi-stage + runtime nginx
    ├── nginx.conf            # fallback de SPA + proxy reverso de /api
    ├── vite.config.ts        # plugin do Tailwind, alias @, proxy /api -> api:3000
    └── src/
        ├── main.tsx          # monta o <App/>
        ├── App.tsx           # ErrorBoundary + LanguageProvider + Query + Router
        ├── index.css         # Tailwind, tokens de cor, shimmer, reduced-motion
        ├── routes/           # tabela de rotas
        ├── layouts/
        │   └── RootLayout.tsx      # cabeçalho + <Outlet> + rodapé
        ├── services/
        │   └── api.ts              # instância axios + moviesService + toErrorMessage
        ├── i18n/
        │   └── translations.ts     # dicionários en + pt-BR e rótulos de gênero
        ├── context/
        │   └── LanguageContext.tsx # idioma, persistência, t() com interpolação
        ├── hooks/
        │   ├── useMovies.ts        # hooks do TanStack Query + chaves de cache
        │   ├── useMovieFilters.ts  # filtros lidos/escritos como query params
        │   ├── useSearchInput.ts   # ponte input local -> termo debounced
        │   ├── useDebounce.ts
        │   ├── useFavorites.ts     # favoritos com sincronia entre componentes
        │   ├── useTheme.ts         # claro/escuro, respeita o sistema
        │   ├── useTranslation.ts   # acesso a t(), idioma e locale
        │   └── useGenreLabel.ts    # rótulo de gênero traduzido (valor intacto)
        ├── components/
        │   ├── ui/                 # shadcn: button, card, input, select, badge,
        │   │                       #         skeleton, dialog
        │   ├── movie/              # MovieCard, MovieGrid, TopRatedCard, SearchBar,
        │   │                       # Filters, Pagination, Poster, FavoriteButton
        │   ├── layout/             # Header, Footer, LanguageToggle
        │   ├── StateViews.tsx      # EmptyState + ErrorState
        │   ├── LoadingIndicator.tsx
        │   └── ErrorBoundary.tsx
        ├── pages/
        │   ├── Home/               # hero, filtros, resultados, top e populares
        │   ├── MovieDetails/       # backdrop, elenco, métricas, diálogo do trailer
        │   ├── Favorites/
        │   └── NotFound.tsx
        ├── types/                  # Movie, MovieDetails, Stats, Paginated, MovieFilters
        ├── utils/format.ts         # formatação de votos, notas e contagens
        ├── test/                   # helper de render com os providers
        └── lib/utils.ts            # helper `cn()` do shadcn
```

---



## Para quem for avaliar

- **Caminho verificado** — o fluxo Node descrito acima foi executado do zero em uma cópia
  limpa do repositório: instalação, migrations, ETL, subida da API e do front, e todos os
  endpoints respondendo. O caminho Docker está escrito mas não foi executado (a máquina de
  desenvolvimento não tem Docker).
- **Multiplataforma** — o script de download usa `Expand-Archive` no Windows e `unzip` no
  POSIX. Os Dockerfiles usam `node:22-slim` (Debian) para comportamento consistente do engine
  do Prisma.
- **Higiene de git** — o `.gitignore` cobre `node_modules`, saídas de build, o dataset,
  arquivos de banco gerados e `.env`. O `.gitattributes` normaliza quebras de linha para que
  clones no Windows fiquem limpos.
- **Segurança** — nenhum segredo no repositório, `.env` fora do versionamento, chave do TMDB
  apenas por variável de ambiente, CORS aberto intencionalmente na API para desenvolvimento
  local, e o proxy do nginx mantendo uma origem única no navegador.
- **Sem chave do TMDB** a aplicação continua inteiramente navegável — os cards mostram um
  placeholder desenhado no lugar do pôster. Configurar a chave (30 segundos) melhora bastante
  a experiência visual.
```
