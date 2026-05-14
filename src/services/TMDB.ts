import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// لینکی داتابەیسەکەی خۆت
const FIREBASE_DB_URL = "https://sebartv-efccb-default-rtdb.firebaseio.com";

export const tmdbApi = createApi({
  reducerPath: "tmdbApi",
  baseQuery: fetchBaseQuery({ baseUrl: FIREBASE_DB_URL }),

  endpoints: (builder) => ({
    // ١. هێنانی لیستی فیلمەکان و بەشی گەڕان
    getShows: builder.query({
      query: () => `/np.json`, 
      transformResponse: (response, meta, arg) => {
        // وەرگرتنی داتاکان و دانانی ئایدی ڕاستەقینەی فایەربەیس
        let dataArray = [];
        if (Array.isArray(response)) {
          dataArray = response
            .map((item, index) => ({ originalId: index, ...item }))
            .filter(item => item !== null && item.title);
        } else {
          dataArray = Object.entries(response || {})
            .map(([key, value]) => ({ originalId: Number(key), ...value }))
            .filter(item => item.title);
        }

        let mappedResults = dataArray.map((movie) => ({
          id: movie.originalId, 
          title: movie.title || "",
          name: movie.title || "", 
          poster_path: movie.image, 
          backdrop_path: movie.image,
          overview: movie.description,
          vote_average: movie.imdb || movie.imbd, // چارەسەری هەردوو جۆرەکەی imdb
          release_date: movie.year?.toString(),
          video_url: movie.url,
          badge_text: movie.badge_text,
          hasSubtitle: movie.hasSubtitle || movie.hasKurdishSub, // چارەسەری کێشەی ژێرنووس
          subtitleKurdish: movie.subtitleKurdish
        }));

        // بەشی سێرچ (زۆر خێرا و هەستیار بۆ پیتەکان)
        if (arg && arg.searchQuery) {
          const query = arg.searchQuery.toLowerCase();
          mappedResults = mappedResults.filter(m => 
            m.title.toLowerCase().includes(query)
          );
        }

        // بەشی ڕیزبەندی (نوێترین فیلم بۆ سەرەوە - گەورەترین ئایدی)
        mappedResults.sort((a, b) => b.id - a.id);

        return {
          results: mappedResults,
          page: 1,
          total_pages: 1,
          total_results: mappedResults.length
        };
      },
    }),

    // ٢. هێنانی زانیاری یەک فیلم بۆ کاتی کرتەکردن
    getShow: builder.query({
      query: () => `/np.json`,
      transformResponse: (response, meta, arg) => {
        let dataArray = [];
        if (Array.isArray(response)) {
          dataArray = response
            .map((item, index) => ({ originalId: index, ...item }))
            .filter(item => item !== null);
        } else {
          dataArray = Object.entries(response || {})
            .map(([key, value]) => ({ originalId: Number(key), ...value }));
        }

        // دۆزینەوەی فیلمەکە ڕێک بەپێی ئایدییەکەی
        const movie = dataArray.find(m => m.originalId === Number(arg.id)) || dataArray[0];

        return {
          id: arg.id,
          title: movie.title || "",
          name: movie.title || "",
          poster_path: movie.image,
          backdrop_path: movie.image,
          overview: movie.description,
          vote_average: movie.imdb || movie.imbd,
          release_date: movie.year?.toString(),
          custom_video_url: movie.url,
          badge_text: movie.badge_text,
          hasSubtitle: movie.hasSubtitle || movie.hasKurdishSub,
          subtitle_url: movie.subtitleKurdish
        };
      },
    }),
  }),
});

export const { useGetShowsQuery, useGetShowQuery } = tmdbApi;
