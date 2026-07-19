import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Media } from "@/lib/data";
import { MediaCard } from "./MediaCard";
import { useLang } from "@/lib/i18n";

export function Row({ title, items }: { title: string; items: Media[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { dir } = useLang();

  const scroll = (delta: number) => {
    ref.current?.scrollBy({ left: dir === "rtl" ? -delta : delta, behavior: "smooth" });
  };

  return (
    <section className="relative group/row py-4 md:py-6">
      <h2 className="mb-3 px-4 md:px-10 text-lg md:text-2xl font-semibold display">{title}</h2>
      <div className="relative">
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scroll(-600)}
          className="hidden md:flex absolute start-0 top-0 bottom-0 z-10 w-10 items-center justify-center bg-gradient-to-r rtl:bg-gradient-to-l from-background/90 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
        >
          <ChevronLeft className="h-6 w-6 rtl:hidden" />
          <ChevronRight className="h-6 w-6 ltr:hidden" />
        </button>
        <div
          ref={ref}
          className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide px-4 md:px-10 scroll-smooth"
        >
          {items.map((m) => (
            <MediaCard key={m.id} item={m} />
          ))}
        </div>
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scroll(600)}
          className="hidden md:flex absolute end-0 top-0 bottom-0 z-10 w-10 items-center justify-center bg-gradient-to-l rtl:bg-gradient-to-r from-background/90 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
        >
          <ChevronRight className="h-6 w-6 rtl:hidden" />
          <ChevronLeft className="h-6 w-6 ltr:hidden" />
        </button>
      </div>
    </section>
  );
}
