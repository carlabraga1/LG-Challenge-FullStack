import { Film, BookOpen } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 sm:flex-row sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-sm text-muted-foreground">
          <Film size={14} className="text-primary" />
          {t("footer.builtWith")}{" "}
          <a
            href="https://grouplens.org/datasets/movielens/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 transition-colors hover:text-foreground"
          >
            {t("footer.dataset")}
          </a>
          {" · "}
          {t("footer.enrichedBy")}{" "}
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 transition-colors hover:text-foreground"
          >
            TMDB
          </a>
        </div>

        <a
          href="/api/docs"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <BookOpen size={14} />
          {t("footer.apiDocs")}
        </a>
      </div>
    </footer>
  );
}
