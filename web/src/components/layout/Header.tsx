import { Link } from "react-router-dom";
import { Film, Heart, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "./LanguageToggle";
import { useTheme } from "@/hooks/useTheme";
import { useFavorites } from "@/hooks/useFavorites";
import { useTranslation } from "@/hooks/useTranslation";

export function Header() {
  const { isDark, toggle } = useTheme();
  const { count } = useFavorites();
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          to="/"
          className="flex flex-shrink-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm">
            <Film size={16} className="text-primary-foreground" />
          </div>
          <span className="text-base font-semibold tracking-tight">{t("nav.brand")}</span>
        </Link>

        <div className="flex flex-shrink-0 items-center gap-1">
          <LanguageToggle />

          <Button variant="ghost" size="icon" asChild>
            <Link
              to="/favorites"
              aria-label={t("nav.favorites", { count })}
              className="relative"
            >
              <Heart size={16} className={count > 0 ? "fill-rose-500 text-rose-500" : undefined} />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label={t("nav.themeSwitch", {
              theme: isDark ? t("nav.themeLight") : t("nav.themeDark"),
            })}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
        </div>
      </div>
    </header>
  );
}
