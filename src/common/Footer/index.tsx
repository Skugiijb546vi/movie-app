import { Link } from "react-router-dom";
import { FaTelegramPlane } from "react-icons/fa"; // هێنانی ئایکۆنی تێلیگرام

import Logo from "../Logo";
import FooterImg from "@/assets/images/footer-bg.webp";
import { maxWidth } from "@/styles";
import { cn } from "@/utils/helper";

const Footer: React.FC = () => {
  return (
    <footer
      style={{
        backgroundImage: `
            linear-gradient(rgba(0,0,0,0.85), rgba(0,0,0,0.95))
        , url(${FooterImg})`, // باگراوەندەکەم کەمێک تاریکتر کرد بۆ ئەوەی جوانتر دەربکەوێت
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
      className="dark:bg-black lg:py-16 sm:py-10 xs:py-8 py-[30px] w-full border-t border-gray-800"
    >
      <div
        className={cn(
          maxWidth,
          ` flex flex-col items-center lg:gap-10 md:gap-8 sm:gap-6 xs:gap-[20px] gap-5`
        )}
      >
        <Logo logoColor="text-primary" />
        
        {/* بەشی لینکە سەرەکییەکان */}
        <ul className="flex flex-row flex-wrap items-center justify-center font-medium text-gray-300 capitalize gap-x-8 gap-y-4">
          <li className="text-center">
            <Link
              to="/"
              className="hover:text-primary hover:underline transition-all duration-300 md:text-[15.25px] sm:text-[14.75px] xs:text-[12.75px] text-[13px] font-nunito"
            >
              Home
            </Link>
          </li>
          <li className="text-center">
            <Link
              to="/movies"
              className="hover:text-primary hover:underline transition-all duration-300 md:text-[15.25px] sm:text-[14.75px] xs:text-[12.75px] text-[13px] font-nunito"
            >
              Movies
            </Link>
          </li>
          <li className="text-center">
            <a
              href="https://t.me/DOBLAZH_k"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#0088cc] hover:underline transition-all duration-300 md:text-[15.25px] sm:text-[14.75px] xs:text-[12.75px] text-[13px] font-nunito flex items-center gap-2"
            >
              About Us
            </a>
          </li>
        </ul>

        {/* بەشی پەیوەندی کردن بە خاوەنی وێبسایت */}
        <div className="mt-4 flex flex-col items-center justify-center gap-3 bg-white/5 px-6 py-4 rounded-2xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
          <p className="text-gray-400 text-sm md:text-base text-center">
            بۆ قسەکردن لەگەڵ خاوەنی وێبسایت نامە بنێرن لە تێلیگرام
          </p>
          <a
            href="https://t.me/sarkoakram"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#0088cc] hover:bg-[#0077b5] text-white px-5 py-2.5 rounded-xl font-bold transition-all duration-300 shadow-lg shadow-[#0088cc]/30"
          >
            <FaTelegramPlane size={20} />
            <span>@sarkoakram</span>
          </a>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
