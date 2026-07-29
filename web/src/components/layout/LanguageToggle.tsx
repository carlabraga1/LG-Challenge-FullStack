import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Two locales, so a toggle beats a dropdown: the label shows the language you
 * would switch *to*, which is the only thing worth a click here.
 */
export function LanguageToggle() {
  const { language, toggle, t } = useTranslation();
  const next = language === "en" ? "PT" : "EN";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-label={t("locale.switchTo")}
      title={t("locale.switchTo")}
      className="px-2 font-semibold text-muted-foreground hover:text-foreground"
    >
      {next}
    </Button>
  );
}
