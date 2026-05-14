import { Link } from "react-router-dom";
import { FaYoutube } from "react-icons/fa";

import Image from "../Image";
import { IMovie } from "@/types";
import { useMediaQuery } from "usehooks-ts";

const MovieCard = ({
  movie,
  category,
}: {
  movie: IMovie | any; // Any مان داناوە بۆ ئەوەی کێشەی badge_text دروست نەکات
  category: string;
}) => {
  // هێنانی badge_text لەگەڵ زانیارییەکانی تر
  const { poster_path, original_title: title, name, id, badge_text } = movie;
  const isMobile = useMediaQuery("(max-width: 380px)");

  // پشکنینی ئەوەی ئایا VIP یە یان FREE
  const isVip = badge_text === "VIP";
  const isFree = badge_text === "FREE";

  // چارەسەری کێشەی دەرنەکەوتنی وێنەی فایەربەیس
  const imageSrc = poster_path?.startsWith("http")
    ? poster_path
    : `https://image.tmdb.org/t/p/original/${poster_path}`;

  return (
    <>
      <Link
        to={`/${category}/${id}`}
        // ئەگەر VIP بێت، چوارچێوەیەکی زێڕین و سێبەرێکی درەوشاوەی دەدەینێ ✨
        className={`dark:bg-[#1f1f1f] bg-[#f5f5f5] rounded-lg relative group w-[170px] select-none xs:h-[250px] h-[216px] overflow-hidden transition-all duration-300 ${
          isVip ? "border-[2px] border-[#FFD700] shadow-[0_0_18px_rgba(255,215,0,0.5)] transform hover:scale-105" : ""
        }`}
      >
        
        {/* باجی زێڕین بۆ VIP */}
        {isVip && (
          <div className="absolute top-2 right-2 z-20 bg-gradient-to-r from-[#FDE047] via-[#EAB308] to-[#CA8A04] text-black text-xs font-extrabold px-2.5 py-1 rounded shadow-[0_0_10px_rgba(255,215,0,0.8)] tracking-wider">
            VIP
          </div>
        )}

        {/* باجی سەوز بۆ FREE */}
        {isFree && (
          <div className="absolute top-2 right-2 z-20 bg-gradient-to-r from-[#22c55e] to-[#15803d] text-white text-xs font-bold px-2.5 py-1 rounded shadow-md tracking-wider">
            FREE
          </div>
        )}

        <Image
          height={!isMobile ? 250 : 216}
          width={170}
          src={imageSrc}
          alt={title || name}
          className="object-cover rounded-lg drop-shadow-md shadow-md group-hover:shadow-none group-hover:drop-shadow-none transition-all duration-300 ease-in-out w-full h-full"
          effect="zoomIn"
        />

        <div className="absolute top-0 left-0 w-full h-full group-hover:opacity-100 opacity-0 bg-[rgba(0,0,0,0.6)] transition-all duration-300 rounded-lg flex items-center justify-center z-10">
          <div className="xs:text-[48px] text-[42px] text-[#ff0000] scale-[0.4] group-hover:scale-100 transition-all duration-300 ">
            <FaYoutube />
          </div>
        </div>
      </Link>

      <h4 
        // ئەگەر فیلمەکە VIP بێت، ناوەکەشی کەمێک زێڕین دەکەین بۆ جوانی
        className={`text-center cursor-default sm:text-base xs:text-[14.75px] text-[14px] font-medium mt-2 ${
          isVip ? "text-[#FFD700] drop-shadow-[0_0_5px_rgba(255,215,0,0.3)]" : "dark:text-gray-300"
        }`}
      >
        {(title?.length > 50 ? title.split(":")[0] : title) || name}
      </h4>
    </>
  );
};

export default MovieCard;
