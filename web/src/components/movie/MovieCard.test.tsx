import { describe, it, expect, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MovieCard } from "./MovieCard";
import { renderWithProviders } from "@/test/renderWithProviders";
import type { Movie } from "@/types";

const movie: Movie = {
  id: 318,
  title: "Shawshank Redemption, The",
  originalTitle: "Shawshank Redemption, The (1994)",
  year: 1994,
  genres: ["Crime", "Drama", "Thriller"],
  imdbId: "tt0111161",
  imdbUrl: "https://www.imdb.com/title/tt0111161/",
  tmdbId: "278",
  posterUrl: null,
  stats: { numRatings: 317, avgRating: 4.43, weightedRating: 4.39 },
};

function renderCard(props: Partial<React.ComponentProps<typeof MovieCard>> = {}) {
  return renderWithProviders(<MovieCard movie={movie} {...props} />);
}

beforeEach(() => {
  localStorage.clear();
});

describe("MovieCard", () => {
  it("shows the title, year and a link to the details page", () => {
    renderCard();
    expect(screen.getByRole("heading", { name: movie.title })).toBeInTheDocument();
    expect(screen.getByText("1994")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/movies/318");
  });

  it("renders the rating on the 0-5 scale with the vote count", () => {
    renderCard();
    expect(screen.getAllByText("4.43").length).toBeGreaterThan(0);
    expect(screen.getByText("/ 5")).toBeInTheDocument();
    expect(screen.getByText("317 votes")).toBeInTheDocument();
  });

  it("caps the genre chips at two so cards stay the same height", () => {
    renderCard();
    expect(screen.getByText("Crime")).toBeInTheDocument();
    expect(screen.getByText("Drama")).toBeInTheDocument();
    expect(screen.queryByText("Thriller")).not.toBeInTheDocument();
  });

  it("falls back to a placeholder when the movie has no poster", () => {
    renderCard();
    expect(screen.getByRole("img", { name: /no poster available/i })).toBeInTheDocument();
  });

  it("shows the weighted score instead when asked", () => {
    renderCard({ scoreField: "weightedRating" });
    expect(screen.getAllByText("4.39").length).toBeGreaterThan(0);
  });

  it("toggles favorite without navigating away", async () => {
    const user = userEvent.setup();
    renderCard();

    const button = screen.getByRole("button", { name: /add to favorites/i });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await user.click(button);

    expect(screen.getByRole("button", { name: /remove from favorites/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(JSON.parse(localStorage.getItem("movielens.favorites.v1")!)).toEqual([318]);
  });

  it("keeps the favorite control outside the link", () => {
    // A <button> nested in an <a> is invalid HTML and traps keyboard users.
    renderCard();
    const link = screen.getByRole("link");
    expect(link.querySelector("button")).toBeNull();
  });

  it("renders a rank badge only when a rank is given", () => {
    renderCard();
    expect(screen.queryByText("#1")).not.toBeInTheDocument();

    renderWithProviders(<MovieCard movie={movie} rank={1} />);
    expect(screen.getByText("#1")).toBeInTheDocument();
  });

  it("renders its copy in Portuguese when that locale is active", () => {
    renderWithProviders(<MovieCard movie={movie} />, { language: "pt-BR" });
    expect(screen.getByText("317 avaliações")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /adicionar aos favoritos/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /pôster indisponível/i })).toBeInTheDocument();
  });

  it("localises genre chips while the underlying data stays canonical", () => {
    const scifi: Movie = { ...movie, genres: ["Sci-Fi", "Thriller"] };
    renderWithProviders(<MovieCard movie={scifi} />, { language: "pt-BR" });

    expect(screen.getByText("Ficção Científica")).toBeInTheDocument();
    expect(screen.getByText("Suspense")).toBeInTheDocument();
    expect(screen.queryByText("Sci-Fi")).not.toBeInTheDocument();
  });
});
