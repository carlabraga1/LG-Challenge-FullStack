import { Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";

/**
 * Inline "working on it" badge for refetches that keep the previous results on
 * screen — a full skeleton there would throw away a perfectly good grid and
 * make the page jump.
 *
 * The text carries the meaning, the spinner is decoration: under
 * `prefers-reduced-motion` the global rule freezes the animation, and a frozen
 * spinner alone would say nothing.
 */
export function LoadingIndicator({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      <Loader2 size={12} className="animate-spin" aria-hidden="true" />
      {label ?? t("loading.default")}
    </span>
  );
}
