import { useState } from "react";
import { Film } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  src: string | null;
  alt: string;
  className?: string;
  iconSize?: number;
}

/**
 * Poster with a graceful fallback. Posters come from TMDB, which is optional —
 * without an API key every `src` is null, so the placeholder is the common
 * path, not an edge case. It has to look deliberate rather than broken.
 */
export function Poster({ src, alt, className, iconSize = 28 }: Props) {
  const [broken, setBroken] = useState(false);
  const { t } = useTranslation();
  const showImage = Boolean(src) && !broken;

  if (!showImage) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-secondary",
          className,
        )}
        role="img"
        aria-label={t("card.noPoster", { title: alt })}
      >
        <Film size={iconSize} className="text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <img
      src={src!}
      alt={alt}
      loading="lazy"
      onError={() => setBroken(true)}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}
