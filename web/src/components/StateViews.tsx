import { AlertTriangle, Film, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";

export function EmptyState({
  title,
  message,
  onReset,
}: {
  title?: string;
  message?: string;
  onReset?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
        <Film size={32} className="text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-xl font-semibold text-foreground">{title ?? t("empty.title")}</h3>
      <p className="mb-6 max-w-xs text-sm text-muted-foreground">{message ?? t("empty.message")}</p>
      {onReset && (
        <Button variant="outline" onClick={onReset}>
          <X size={14} />
          {t("empty.reset")}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-xl border border-red-500/40 bg-red-500/5 px-4 py-14 text-center"
    >
      <AlertTriangle size={28} className="mb-3 text-red-500" />
      <h3 className="mb-1 text-lg font-semibold text-foreground">{t("error.title")}</h3>
      {/* The message comes from the API's validation body — deliberately not
          translated, since it describes the request that was rejected. */}
      <p className="mb-5 max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          {t("error.retry")}
        </Button>
      )}
    </div>
  );
}
