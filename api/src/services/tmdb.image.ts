// TMDB serves images from a CDN at a well-known base. We compose URLs
// server-side so the client stays free of TMDB coupling.
const IMAGE_BASE = "https://image.tmdb.org/t/p";

export function posterUrl(path: string | null | undefined, size: "w185" | "w342" | "w500" = "w342") {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

export function backdropUrl(path: string | null | undefined, size: "w780" | "w1280" | "original" = "w1280") {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

export function profileUrl(path: string | null | undefined) {
  return path ? `${IMAGE_BASE}/w185${path}` : null;
}

export function trailerUrl(key: string | null | undefined) {
  return key ? `https://www.youtube.com/watch?v=${key}` : null;
}
