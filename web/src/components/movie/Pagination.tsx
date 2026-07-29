import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { formatCount } from "@/utils/format";

interface Props {
  total: number;
  pageSize: number;
  page: number; // 1-based
  onPageChange: (page: number) => void;
}

export function Pagination({ total, pageSize, page, onPageChange }: Props) {
  const { t, localeTag } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label={t("pagination.label")}
      className="flex flex-wrap items-center justify-center gap-4 pt-8"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft size={14} />
        {t("pagination.previous")}
      </Button>

      <span className="text-sm tabular-nums text-muted-foreground">
        {t("pagination.page", { page, total: totalPages })}
        <span className="text-muted-foreground/70">
          {" · "}
          {t("pagination.count", { count: formatCount(total, localeTag) })}
        </span>
      </span>

      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        {t("pagination.next")}
        <ChevronRight size={14} />
      </Button>
    </nav>
  );
}
