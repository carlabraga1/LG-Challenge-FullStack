/**
 * Translation dictionary.
 *
 * `en` is the source of truth: `ptBR` is typed as `typeof en`, so adding a key
 * to one locale and forgetting the other is a compile error rather than a
 * string that silently renders as its own key at runtime.
 *
 * No i18n library here on purpose — two locales and ~70 static strings do not
 * justify the bundle and the config of i18next. If a third locale or plural
 * rules beyond "1 / many" ever showed up, that trade would flip.
 */

export const en = {
  "locale.tag": "en-US",
  "locale.name": "English",
  "locale.switchTo": "Mudar para português",

  "nav.brand": "MovieLens Explorer",
  "nav.favorites": "Favorites ({count})",
  "nav.themeSwitch": "Switch to {theme} theme",
  "nav.themeDark": "dark",
  "nav.themeLight": "light",

  "hero.title.before": "Discover your next",
  "hero.title.highlight": "favorite film",
  "hero.subtitle": "Explore {movies} movies and {ratings} ratings from the MovieLens dataset",
  "hero.subtitle.fallback": "Explore thousands of movies from the MovieLens dataset",

  "search.placeholder": "Search for movies by title...",
  "search.label": "Search movies by title",
  "search.clear": "Clear search",

  "stats.movies": "Movies",
  "stats.ratings": "Ratings",
  "stats.genres": "Genres",
  "stats.years": "Years",

  "filters.title": "Filters",
  "filters.year": "Year",
  "filters.genre": "Genre",
  "filters.anyYear": "Any year",
  "filters.anyGenre": "Any genre",
  "filters.clear": "Clear",
  "filters.results": "{count} results",
  "filters.results.one": "{count} result",
  "filters.searching": "Searching…",

  "results.search": 'Results for "{query}"',
  "results.browse": "Browse results",
  "results.discover": "Popular right now",
  "results.updating": "Updating…",

  "section.topRated": "Top Rated Movies",
  "section.topRated.badge": "by raw average",
  "section.popular": "Most Popular",
  "section.popular.badge": "Weighted",

  "card.votes": "{count} votes",
  "card.votes.one": "{count} vote",
  "card.noVotes": "no votes",
  "card.outOfFive": "/ 5",
  "card.noPoster": "{title} — no poster available",
  "card.addFavorite": "Add to favorites",
  "card.removeFavorite": "Remove from favorites",

  "pagination.previous": "Previous",
  "pagination.next": "Next",
  "pagination.page": "Page {page} of {total}",
  "pagination.count": "{count} results",
  "pagination.label": "Pagination",

  "empty.title": "No movies found",
  "empty.message": "Try adjusting your search or filters to discover something great.",
  "empty.reset": "Reset filters",

  "error.title": "Something went wrong",
  "error.retry": "Try again",
  "error.boundary.title": "Something went wrong",
  "error.boundary.reload": "Reload the app",

  "details.back": "Back to discover",
  "details.overview": "Overview",
  "details.director": "Director",
  "details.cast": "Cast",
  "details.avgRating": "Average rating",
  "details.weighted": "Weighted score",
  "details.votes": "Votes",
  "details.noStats": "No ratings for this title in the MovieLens dataset.",
  "details.trailer": "Watch trailer",
  "details.closeTrailer": "Close trailer",
  "details.trailerTitle": "{title} — trailer",
  "details.imdb": "IMDB",
  "details.minutes": "{count} min",
  "details.noTmdb":
    "TMDB enrichment is disabled or unavailable for this movie — showing MovieLens data only.",
  "details.invalidId": '"{id}" is not a valid movie id.',

  "favorites.title": "Favorites",
  "favorites.subtitle": "Saved locally in your browser — nothing leaves this device.",
  "favorites.empty.title": "No favorites yet",
  "favorites.empty.message": "Tap the heart on any movie to save it here.",

  "notFound.title": "Page not found",
  "notFound.message": "That route doesn't exist in this app.",
  "notFound.back": "Back to discover",

  "footer.builtWith": "Built with the",
  "footer.dataset": "MovieLens dataset",
  "footer.enrichedBy": "enriched by",
  "footer.apiDocs": "API docs",

  "loading.default": "Loading…",
} as const;

export type TranslationKey = keyof typeof en;

export const ptBR: Record<TranslationKey, string> = {
  "locale.tag": "pt-BR",
  "locale.name": "Português",
  "locale.switchTo": "Switch to English",

  "nav.brand": "MovieLens Explorer",
  "nav.favorites": "Favoritos ({count})",
  "nav.themeSwitch": "Mudar para o tema {theme}",
  "nav.themeDark": "escuro",
  "nav.themeLight": "claro",

  "hero.title.before": "Descubra seu próximo",
  "hero.title.highlight": "filme favorito",
  "hero.subtitle": "Explore {movies} filmes e {ratings} avaliações do dataset MovieLens",
  "hero.subtitle.fallback": "Explore milhares de filmes do dataset MovieLens",

  "search.placeholder": "Busque filmes pelo título...",
  "search.label": "Buscar filmes por título",
  "search.clear": "Limpar busca",

  "stats.movies": "Filmes",
  "stats.ratings": "Avaliações",
  "stats.genres": "Gêneros",
  "stats.years": "Anos",

  "filters.title": "Filtros",
  "filters.year": "Ano",
  "filters.genre": "Gênero",
  "filters.anyYear": "Qualquer ano",
  "filters.anyGenre": "Qualquer gênero",
  "filters.clear": "Limpar",
  "filters.results": "{count} resultados",
  "filters.results.one": "{count} resultado",
  "filters.searching": "Buscando…",

  "results.search": 'Resultados para "{query}"',
  "results.browse": "Resultados do filtro",
  "results.discover": "Populares agora",
  "results.updating": "Atualizando…",

  "section.topRated": "Filmes mais bem avaliados",
  "section.topRated.badge": "por média simples",
  "section.popular": "Mais populares",
  "section.popular.badge": "Ponderado",

  "card.votes": "{count} avaliações",
  "card.votes.one": "{count} avaliação",
  "card.noVotes": "sem avaliações",
  "card.outOfFive": "/ 5",
  "card.noPoster": "{title} — pôster indisponível",
  "card.addFavorite": "Adicionar aos favoritos",
  "card.removeFavorite": "Remover dos favoritos",

  "pagination.previous": "Anterior",
  "pagination.next": "Próxima",
  "pagination.page": "Página {page} de {total}",
  "pagination.count": "{count} resultados",
  "pagination.label": "Paginação",

  "empty.title": "Nenhum filme encontrado",
  "empty.message": "Ajuste a busca ou os filtros para descobrir algo novo.",
  "empty.reset": "Limpar filtros",

  "error.title": "Erro ao carregar dados",
  "error.retry": "Tentar novamente",
  "error.boundary.title": "Algo deu errado",
  "error.boundary.reload": "Recarregar a aplicação",

  "details.back": "Voltar para a descoberta",
  "details.overview": "Sinopse",
  "details.director": "Direção",
  "details.cast": "Elenco",
  "details.avgRating": "Nota média",
  "details.weighted": "Nota ponderada",
  "details.votes": "Avaliações",
  "details.noStats": "Este título não possui avaliações no dataset MovieLens.",
  "details.trailer": "Ver trailer",
  "details.closeTrailer": "Fechar trailer",
  "details.trailerTitle": "{title} — trailer",
  "details.imdb": "IMDB",
  "details.minutes": "{count} min",
  "details.noTmdb":
    "O enriquecimento via TMDB está desativado ou indisponível para este filme — exibindo apenas dados do MovieLens.",
  "details.invalidId": '"{id}" não é um id de filme válido.',

  "favorites.title": "Favoritos",
  "favorites.subtitle": "Salvos localmente no seu navegador — nada sai deste dispositivo.",
  "favorites.empty.title": "Nenhum favorito ainda",
  "favorites.empty.message": "Toque no coração de qualquer filme para salvá-lo aqui.",

  "notFound.title": "Página não encontrada",
  "notFound.message": "Esta rota não existe na aplicação.",
  "notFound.back": "Voltar para a descoberta",

  "footer.builtWith": "Feito com o",
  "footer.dataset": "dataset MovieLens",
  "footer.enrichedBy": "enriquecido por",
  "footer.apiDocs": "Documentação da API",

  "loading.default": "Carregando…",
};

export const LANGUAGES = ["en", "pt-BR"] as const;
export type Language = (typeof LANGUAGES)[number];

/**
 * Genre display names.
 *
 * Genres are dataset *values*, not UI copy: they are stored in the database,
 * travel in the URL (`?genre=Comedy`) and are what the API filters on. So only
 * the label is localised — the canonical MovieLens name stays the value
 * everywhere, and an unknown genre falls back to showing itself rather than
 * disappearing.
 *
 * MovieLens ships a closed vocabulary of 19 genres plus the "(no genres
 * listed)" sentinel, so a static map is complete rather than best-effort.
 */
export const genreLabels: Record<Language, Record<string, string>> = {
  // MovieLens names are already English — nothing to map.
  en: {},
  "pt-BR": {
    Action: "Ação",
    Adventure: "Aventura",
    Animation: "Animação",
    Children: "Infantil",
    Comedy: "Comédia",
    Crime: "Crime",
    Documentary: "Documentário",
    Drama: "Drama",
    Fantasy: "Fantasia",
    "Film-Noir": "Film Noir",
    Horror: "Terror",
    IMAX: "IMAX",
    Musical: "Musical",
    Mystery: "Mistério",
    Romance: "Romance",
    "Sci-Fi": "Ficção Científica",
    Thriller: "Suspense",
    War: "Guerra",
    Western: "Faroeste",
    "(no genres listed)": "(sem gêneros)",
  },
};

export const dictionaries: Record<Language, Record<TranslationKey, string>> = {
  en,
  "pt-BR": ptBR,
};
