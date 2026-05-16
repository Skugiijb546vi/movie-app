import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { FiLoader } from "react-icons/fi";

import { MovieCard, SkelatonLoader } from "@/common";
import { CatalogHeader, Search } from "./components";
import { useGetShowsQuery } from "@/services/TMDB";
import { smallMaxWidth } from "@/styles";
import { IMovie } from "@/types";

const Catalog = () => {
  const [page, setPage] = useState(1);
  const [shows, setShows] = useState<IMovie[]>([]);
  const [isCategoryChanged, setIsCategoryChanged] = useState<boolean>(false);
  const [query, setQuery] = useSearchParams();
  const { category } = useParams();

  // بەشەکانی فلتەر
  const [filterYear, setFilterYear] = useState<string>("All");
  const [filterRating, setFilterRating] = useState<string>("All");

  const type = query.get("type") || "popular";
  const searchQuery = query.get("search") || "";

  const { data, isLoading, isFetching } = useGetShowsQuery({
    category,
    page,
    searchQuery,
    type,
  });

  useEffect(() => {
    setPage(1);
    setIsCategoryChanged(true);
  }, [category, searchQuery]);

  useEffect(() => {
    if (isLoading || isFetching) return;

    if (data?.results) {
      if (page > 1) {
        setShows((prev) => [...prev, ...data.results]);
      } else {
        setShows([...data.results]);
        setIsCategoryChanged(false);
      }
    }
  }, [data, isFetching, isLoading, page]);

  // لێرەدا فلتەرکردن و پێچەوانەکردنەوەی فیلمەکان دەکەین
  const filteredAndSortedShows = [...shows]
    .reverse() // ئەمە لیستەکە بەتەواوی پێچەوانە دەکاتەوە بۆ ئەوەی تازەترین بێتە سەرەوە
    .filter((movie) => {
      // فلتەری ساڵ
      if (filterYear !== "All") {
        const releaseYear = movie.release_date
          ? movie.release_date.split("-")[0]
          : movie.first_air_date
          ? movie.first_air_date.split("-")[0]
          : "";
        if (releaseYear !== filterYear) return false;
      }

      // فلتەری ئایم دی بی (IMDb)
      if (filterRating !== "All") {
        const rating = movie.vote_average || 0;
        if (filterRating === "9" && rating < 9) return false;
        if (filterRating === "8" && rating < 8) return false;
        if (filterRating === "7" && rating < 7) return false;
        if (filterRating === "5" && rating < 5) return false;
      }

      return true;
    });

  return (
    <>
      <CatalogHeader category={String(category)} />
      <section className={`${smallMaxWidth} `}>
        <Search setQuery={setQuery} />

        {/* فلتەرەکانی ساڵ و IMDb */}
        <div className="flex flex-row flex-wrap justify-center gap-4 mb-8 text-[14px]">
          <select
            className="py-[8px] px-[20px] rounded-full outline-none shadow-md transition-all duration-300 focus:shadow-sm text-[#666] focus:bg-[#ffffff] bg-[#fdfdfd] font-medium dark:bg-[#302d3a] dark:text-primary dark:focus:bg-[#474550] cursor-pointer"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            <option value="All">هەموو ساڵەکان</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
            <option value="2021">2021</option>
            <option value="2020">2020</option>
            <option value="2019">2019</option>
          </select>

          <select
            className="py-[8px] px-[20px] rounded-full outline-none shadow-md transition-all duration-300 focus:shadow-sm text-[#666] focus:bg-[#ffffff] bg-[#fdfdfd] font-medium dark:bg-[#302d3a] dark:text-primary dark:focus:bg-[#474550] cursor-pointer"
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
          >
            <option value="All">بەپێی IMDb</option>
            <option value="9">+9 (نایاب)</option>
            <option value="8">+8 (زۆر باش)</option>
            <option value="7">+7 (باش)</option>
            <option value="5">+5 (مامناوەند)</option>
          </select>
        </div>

        {isLoading || isCategoryChanged ? (
          <SkelatonLoader isMoviesSliderLoader={false} />
        ) : (
          <div className="flex flex-wrap xs:gap-4 gap-[14px] justify-center">
            {/* لێرەدا فلتەرکراوەکان بەکاردەهێنین */}
            {filteredAndSortedShows?.map((movie) => (
              <div
                key={movie.id}
                className="flex flex-col xs:gap-4 gap-2 xs:max-w-[170px] max-w-[124px] rounded-lg lg:mb-6 md:mb-5 sm:mb-4 mb-[10px]"
              >
                <MovieCard movie={movie} category={String(category)} />
              </div>
            ))}
            
            {/* ئەگەر هیچ فیلمێک نەدۆزرایەوە */}
            {filteredAndSortedShows.length === 0 && (
              <div className="w-full text-center py-10 dark:text-gray-400 text-gray-600 font-nunito">
                هیچ فیلمێک بەم تایبەتمەندییانە نەدۆزرایەوە!
              </div>
            )}
          </div>
        )}

        {isFetching && !isCategoryChanged ? (
          <div className="my-4">
            <FiLoader className="mx-auto dark:text-gray-300 w-5 h-5 animate-spin" />
          </div>
        ) : (
          <div className="w-full flex items-center justify-center">
            <button
              type="button"
              onClick={() => {
                setPage(page + 1);
              }}
              disabled={isFetching}
              className="sm:py-2 xs:py-[6px] py-1 sm:px-4 xs:px-3 px-[10.75px] bg-[#ff0000] text-gray-50 rounded-full md:text-[15.25px] sm:text-[14.75px] xs:text-[14px] text-[12.75px] shadow-md hover:-translate-y-1 transition-all duration-300 font-medium font-nunito my-4"
            >
              زیاتر ببینە
            </button>
          </div>
        )}
      </section>
    </>
  );
};

export default Catalog;
