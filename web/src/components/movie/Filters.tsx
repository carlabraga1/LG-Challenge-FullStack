import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";
import { useGenreLabel } from "@/hooks/useGenreLabel";

/** Radix Select has no "empty" value, so "any" needs a real sentinel. */
const ANY = "__any__";

interface Props {
  genre: string;
  year: string;
  genres: string[];
  years: number[];
  onGenreChange: (genre: string) => void;
  onYearChange: (year: string) => void;
  onClear: () => void;
  hasFilters: boolean;
  /** Shown once results are in; omitted while loading. */
  resultLabel?: string;
}

export function Filters({
  genre,
  year,
  genres,
  years,
  onGenreChange,
  onYearChange,
  onClear,
  hasFilters,
  resultLabel,
}: Props) {
  const { t } = useTranslation();
  const genreLabel = useGenreLabel();

  return (
    <section aria-label={t("filters.title")} className="space-y-3">
      <h2 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Filter size={14} />
        {t("filters.title")}
      </h2>

      {/* Every child is a bottom-aligned column of the same height, so the two
          dropdowns and the actions line up on one baseline regardless of which
          of them is present. */}
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t("filters.year")} htmlFor="filter-year" className="w-full sm:w-36">
          <Select
            value={year === "" ? ANY : year}
            onValueChange={(v) => onYearChange(v === ANY ? "" : v)}
          >
            <SelectTrigger id="filter-year">
              <SelectValue placeholder={t("filters.anyYear")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{t("filters.anyYear")}</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label={t("filters.genre")} htmlFor="filter-genre" className="w-full sm:w-44">
          <Select
            value={genre === "" ? ANY : genre}
            onValueChange={(v) => onGenreChange(v === ANY ? "" : v)}
          >
            <SelectTrigger id="filter-genre">
              <SelectValue placeholder={t("filters.anyGenre")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{t("filters.anyGenre")}</SelectItem>
              {/* value stays the canonical MovieLens name — only the label
                  is localised, so the URL and the API keep speaking English. */}
              {genres.map((g) => (
                <SelectItem key={g} value={g}>
                  {genreLabel(g)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {(hasFilters || resultLabel) && (
          <div className="flex h-9 items-center gap-3">
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={onClear}>
                <X size={13} />
                {t("filters.clear")}
              </Button>
            )}
            {resultLabel && (
              <span className="text-xs tabular-nums text-muted-foreground">{resultLabel}</span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** Label stacked over a control, so each column has an identical structure. */
function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
