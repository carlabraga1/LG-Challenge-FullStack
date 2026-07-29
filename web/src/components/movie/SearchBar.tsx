import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  label?: string;
  className?: string;
}

/**
 * Search input. There is no submit button by design: the caller debounces the
 * value and queries as you type, so a button would only re-trigger what already
 * happened.
 */
export function SearchBar({
  value,
  onChange,
  placeholder,
  id = "movie-search",
  label,
  className,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className={cn("relative flex items-center", className)}>
      <label htmlFor={id} className="sr-only">
        {label ?? t("search.label")}
      </label>
      <Search size={18} className="pointer-events-none absolute left-4 text-muted-foreground" />
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t("search.placeholder")}
        className="rounded-xl py-3.5 pl-12 pr-12 text-base shadow-sm"
      />
      {value !== "" && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange("")}
          aria-label={t("search.clear")}
          className="absolute right-2.5 h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <X size={16} />
        </Button>
      )}
    </div>
  );
}
