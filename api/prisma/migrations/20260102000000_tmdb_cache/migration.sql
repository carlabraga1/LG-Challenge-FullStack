-- CreateTable
CREATE TABLE "TmdbCache" (
    "movieId" INTEGER NOT NULL PRIMARY KEY,
    "posterPath" TEXT,
    "backdropPath" TEXT,
    "overview" TEXT,
    "runtimeMinutes" INTEGER,
    "originalLanguage" TEXT,
    "tmdbPopularity" REAL,
    "director" TEXT,
    "castJson" TEXT,
    "trailerKey" TEXT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TmdbCache_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
