import { createFileRoute } from "@tanstack/react-router";
import { CategoryPage } from "@/components/PageShell";
import { useByKind } from "@/lib/media-store";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/dubbed")({
  head: () => ({
    meta: [
      { title: "Kurdish Dubbed — Sebar Tv" },
      { name: "description", content: "Watch movies dubbed in Kurdish on Sebar Tv." },
      { property: "og:title", content: "Kurdish Dubbed — Sebar Tv" },
      { property: "og:description", content: "Movies dubbed in Kurdish." },
    ],
  }),
  component: DubbedPage,
});

function DubbedPage() {
  const { t } = useLang();
  const items = useByKind("dubbed");
  return <CategoryPage title={t("dubbed")} items={items} hero={items[0]} subtitle={t("kurdishDub")} />;
}
