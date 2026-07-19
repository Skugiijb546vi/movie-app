import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/PageShell";
import { useByKind } from "@/lib/media-store";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/movies")({
  head: () => ({
    meta: [
      { title: "Movies — Sebar Tv" },
      { name: "description", content: "Browse and stream popular movies on Sebar Tv." },
      { property: "og:title", content: "Movies — Sebar Tv" },
      { property: "og:description", content: "Popular movies to stream now." },
    ],
  }),
  component: MoviesPage,
});

function MoviesPage() {
  const { t } = useLang();
  const items = useByKind("movie");
  return <CategoryPage title={t("movies")} items={items} hero={items[0]} subtitle={t("popularMovies")} />;
}
