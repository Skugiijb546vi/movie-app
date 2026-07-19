import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/PageShell";
import { useByKind } from "@/lib/media-store";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/series")({
  head: () => ({
    meta: [
      { title: "Series — Sebar Tv" },
      { name: "description", content: "Binge popular series on Sebar Tv." },
      { property: "og:title", content: "Series — Sebar Tv" },
      { property: "og:description", content: "Popular series to binge now." },
    ],
  }),
  component: SeriesPage,
});

function SeriesPage() {
  const { t } = useLang();
  const items = useByKind("series");
  return <CategoryPage title={t("series")} items={items} hero={items[0]} subtitle={t("popularSeries")} />;
}
