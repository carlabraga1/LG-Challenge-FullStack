-- CreateTable
CREATE TABLE "Movie" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT NOT NULL,
    "year" INTEGER,
    "imdbId" TEXT,
    "tmdbId" TEXT
);

-- CreateTable
CREATE TABLE "Genre" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "MovieGenre" (
    "movieId" INTEGER NOT NULL,
    "genreId" INTEGER NOT NULL,

    PRIMARY KEY ("movieId", "genreId"),
    CONSTRAINT "MovieGenre_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MovieGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MovieStats" (
    "movieId" INTEGER NOT NULL PRIMARY KEY,
    "numRatings" INTEGER NOT NULL,
    "avgRating" REAL NOT NULL,
    "weightedRating" REAL NOT NULL,
    CONSTRAINT "MovieStats_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Movie_year_idx" ON "Movie"("year");
CREATE INDEX "Movie_title_idx" ON "Movie"("title");
CREATE UNIQUE INDEX "Genre_name_key" ON "Genre"("name");
CREATE INDEX "MovieGenre_genreId_idx" ON "MovieGenre"("genreId");
CREATE INDEX "MovieStats_avgRating_idx" ON "MovieStats"("avgRating");
CREATE INDEX "MovieStats_weightedRating_idx" ON "MovieStats"("weightedRating");
CREATE INDEX "MovieStats_numRatings_idx" ON "MovieStats"("numRatings");
