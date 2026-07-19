import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/Hero";
import { Row } from "@/components/Row";
import { DiscoverSection } from "@/components/DiscoverSection";
import { LatestReviews } from "@/components/LatestReviews";
import { useByKind, useFeatured, useTrending } from "@/lib/media-store";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sebar Tv — Movies, Series & Kurdish Dubbed" },
      {
        name: "description",
        content:
          "Stream popular movies, binge full series, and watch Kurdish-dubbed films — all in one place.",
      },
      { property: "og:title", content: "Sebar Tv — Movies, Series & Kurdish Dubbed" },
      {
        property: "og:description",
        content: "Stream popular movies, binge full series, and watch Kurdish-dubbed films — all in one place.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { t } = useLang();
  const hero = useFeatured();
  const trendingItems = useTrending();
  const movies = useByKind("movie");
  const series = useByKind("series");
  const dubbed = useByKind("dubbed");
  return (
    <div className="pb-16">
      <Hero items={trendingItems.length ? trendingItems : hero ? [hero] : []} />
      <div className="relative z-10 space-y-2">
        <DiscoverSection />
        <div className="mt-6 space-y-2">
          <Row title={t("trending")} items={trendingItems} />
          <Row title={t("popularMovies")} items={movies} />
          <Row title={t("popularSeries")} items={series} />
          <Row title={t("kurdishDub")} items={dubbed} />
        </div>
        <LatestReviews />
      </div>
    </div>
  );
}

