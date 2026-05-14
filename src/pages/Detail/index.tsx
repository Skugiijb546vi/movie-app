import { useEffect, useState } from "react";
import { m } from "framer-motion";
import { useParams } from "react-router-dom";

import { Poster, Loader, Error, Section } from "@/common";
import { Casts, Videos, Genre } from "./components";

import { useGetShowQuery } from "@/services/TMDB";
import { useMotion } from "@/hooks/useMotion";
import { mainHeading, maxWidth, paragraph } from "@/styles";
import { cn } from "@/utils/helper";
import { useGlobalContext } from "@/context/globalContext";

const Detail = () => {
  const { category, id } = useParams();
  const [show, setShow] = useState(false);
  const { fadeDown, staggerContainer } = useMotion();

  // لێرەدا ناوەکانمان گۆڕی بۆ ئەوانەی کە پڕۆژەکە دەیانناسێتەوە
  const { setIsModalOpen, setVideoId } = useGlobalContext();

  const {
    data: movie,
    isLoading,
    isFetching,
    isError,
  } = useGetShowQuery({
    category: String(category),
    id: Number(id),
  });

  useEffect(() => {
    document.title =
      (movie?.title || movie?.name) && !isLoading
        ? movie.title || movie.name
        : "SEBAR TV";

    return () => {
      document.title = "SEBAR TV";
    };
  }, [movie?.title, isLoading, movie?.name]);

  const toggleShow = () => setShow((prev) => !prev);

  if (isLoading || isFetching) {
    return <Loader />;
  }

  if (isError || !movie) {
    return <Error error="کێشەیەک هەیە لە هێنانی فیلمەکە!" />;
  }

  const {
    title,
    poster_path: posterPath,
    overview,
    name,
    genres = [],
    videos = { results: [] },
    credits = { cast: [] },
    badge_text,
  } = movie;

  const bgUrl = posterPath?.startsWith("http")
    ? posterPath
    : `https://image.tmdb.org/t/p/original/${posterPath}`;

  const backgroundStyle = {
    backgroundImage: `linear-gradient(to top, rgba(0,0,0), rgba(0,0,0,0.98),rgba(0,0,0,0.8) ,rgba(0,0,0,0.4)),url('${bgUrl}')`,
    backgroundPosition: "top",
    backgroundSize: "cover",
  };

  const handlePlayClick = () => {
    // ناردنی داتاکان و کردنەوەی پەنجەرەکە بێ کێشە
    setVideoId(movie);
    setIsModalOpen(true);
  };

  return (
    <>
      <section className="w-full" style={backgroundStyle}>
        <div
          className={`${maxWidth} lg:py-36 sm:py-[136px] sm:pb-28 xs:py-28 xs:pb-12 pt-24 pb-8 flex flex-row lg:gap-12 md:gap-10 gap-8 justify-center`}
        >
          <Poster title={title} posterPath={posterPath} />
          <m.div
            variants={staggerContainer(0.2, 0.4)}
            initial="hidden"
            animate="show"
            className="text-gray-300 sm:max-w-[80vw] max-w-[90vw] md:max-w-[520px] font-nunito flex flex-col lg:gap-5 sm:gap-4 xs:gap-[14px] gap-3 mb-8 flex-1 will-change-transform motion-reduce:transform-none"
          >
            <m.h2
              variants={fadeDown}
              className={cn(mainHeading, "md:max-w-[420px] flex items-center gap-3 will-change-transform motion-reduce:transform-none")}
            >
              {title || name}
              {badge_text === 'VIP' && (
                <span className="text-sm bg-yellow-500 text-black px-2 py-1 rounded-md font-bold">VIP</span>
              )}
            </m.h2>

            <m.ul
              variants={fadeDown}
              className="flex flex-row items-center sm:gap-[14px] xs:gap-3 gap-[6px] flex-wrap will-change-transform motion-reduce:transform-none"
            >
              {genres.map((genre) => (
                <Genre key={genre.id} name={genre.name} />
              ))}
            </m.ul>

            <m.p variants={fadeDown} className={`${paragraph} will-change-transform motion-reduce:transform-none`}>
              <span>
                {overview?.length > 280
                  ? `${show ? overview : `${overview.slice(0, 280)}...`}`
                  : overview || "کورتەی فیلم بەردەست نییە."}
              </span>
              <button
                type="button"
                className={cn(
                  `font-bold ml-1 text-red-500 hover:underline transition-all duration-300`,
                  overview?.length > 280 ? "inline-block" : "hidden"
                )}
                onClick={toggleShow}
              >
                {!show ? "زیاتر" : "کەمتر"}
              </button>
            </m.p>

            <m.div variants={fadeDown} className="mt-4">
              <button
                onClick={handlePlayClick}
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full transition-all shadow-lg shadow-red-600/30 transform hover:scale-105 max-w-[200px]"
              >
                <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"></path></svg>
                سەیرکردنی فیلم
              </button>
            </m.div>

            {credits?.cast?.length > 0 && <Casts casts={credits.cast} />}
          </m.div>
        </div>
      </section>

      {videos?.results?.length > 0 && <Videos videos={videos.results} />}
    </>
  );
};

export default Detail;
