import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/useFavorites";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";

interface Props {
  movieId: number;
  className?: string;
  size?: number;
}

export function FavoriteButton({ movieId, className, size = 15 }: Props) {
  const { has, toggle } = useFavorites();
  const { t } = useTranslation();
  const active = has(movieId);

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-pressed={active}
      aria-label={active ? t("card.removeFavorite") : t("card.addFavorite")}
      onClick={() => toggle(movieId)}
      className={cn(
        "backdrop-blur-sm",
        active ? "text-rose-500" : "text-white/85 hover:text-white",
        className,
      )}
    >
      <Heart size={size} className={active ? "fill-rose-500" : undefined} />
    </Button>
  );
}
