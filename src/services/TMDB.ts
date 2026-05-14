import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// لینکی داتابەیسەکەی خۆت بە شێوازی ڕاستەوخۆ (REST API)
const FIREBASE_DB_URL = "https://sebartv-efccb-default-rtdb.firebaseio.com";

export const tmdbApi = createApi({
  reducerPath: "tmdbApi",
  baseQuery: fetchBaseQuery({ baseUrl: FIREBASE_DB_URL }),

  endpoints: (builder) => ({
    // ١. هێنانی لیستی فیلمەکان و بەشی گەڕان (Search)
    getShows: builder.query({
      query: () => `/np.json`, // ڕاستەوخۆ دەچێتە بەشی np لە فایەربەیسەکەت
      transformResponse: (response, meta, arg) => {
        // گۆڕینی داتاکانی فایەربەیس بۆ لیست (Array)
        const dataArray = Array.isArray(response)
          ? response.filter(item => item !== null)
          : Object.values(response || {});

        // وەرگێڕانی ناوەکان بۆ ئەوەی دیزاینی سۆرسەکە کێشەی بۆ دروست نەبێت
        let mappedResults = dataArray.map((movie, index) => ({
          id: index + 1, 
          title: movie.title,
          name: movie.title, 
          poster_path: movie.image, // وێنەکەی تۆ دەخەینە شوێنی پۆستەری ئەوان
          backdrop_path: movie.image,
          overview: movie.description,
          vote_average: movie.imbd,
          release_date: movie.year?.toString(),
          // هێشتنەوەی زانیارییە تایبەتەکانی خۆت بۆ کاتی پلەیەر و VIP
          video_url: movie.url,
          badge_text: movie.badge_text,
          hasSubtitle: movie.hasSubtitle,
          subtitleKurdish: movie.subtitleKurdish
        }));

        // ئەگەر بەکارهێنەر سێرچی کرد، لێرەدا بۆی دەدۆزینەوە
        if (arg && arg.searchQuery) {
          mappedResults = mappedResults.filter(m => 
            m.title.toLowerCase().includes(arg.searchQuery.toLowerCase())
          );
        }

        // دانانەوەی داتاکان بەو فۆرماتەی وێبسایتەکە پێشبینی دەکات
        return {
          results: mappedResults,
          page: 1,
          total_pages: 1,
          total_results: mappedResults.length
        };
      },
    }),

    // ٢. هێنانی زانیاری تەنها یەک فیلم (بۆ کاتی کرتەکردن و چوونە ناو پەڕەی فیلمەکە)
    getShow: builder.query({
      query: () => `/np.json`,
      transformResponse: (response, meta, arg) => {
        const dataArray = Array.isArray(response)
          ? response.filter(item => item !== null)
          : Object.values(response || {});

        // دۆزینەوەی فیلمەکە بەپێی ئایدی
        const movie = dataArray[arg.id - 1] || dataArray[0];

        return {
          id: arg.id,
          title: movie.title,
          name: movie.title,
          poster_path: movie.image,
          backdrop_path: movie.image,
          overview: movie.description,
          vote_average: movie.imbd,
          release_date: movie.year?.toString(),
          // هەڵگرتنی لینکی ڤیدیۆکەی تۆ بۆ ئەوەی دواتر بیدەین بە پلەیەرەکە
          custom_video_url: movie.url,
          badge_text: movie.badge_text,
          hasSubtitle: movie.hasSubtitle,
          subtitle_url: movie.subtitleKurdish
        };
      },
    }),
  }),
});

export const { useGetShowsQuery, useGetShowQuery } = tmdbApi;
