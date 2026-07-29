import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-7xl font-bold text-primary">404</p>
      <h1 className="mb-2 mt-4 text-xl font-semibold">{t("notFound.title")}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{t("notFound.message")}</p>
      <Button asChild>
        <Link to="/">{t("notFound.back")}</Link>
      </Button>
    </div>
  );
}
