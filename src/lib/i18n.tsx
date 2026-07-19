import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ku";



const DICT = {
  brand: { en: "Sebar Tv", ku: "سێبەر تیڤی" },
  home: { en: "Home", ku: "ماڵەوە" },
  movies: { en: "Movies", ku: "فیلمەکان" },
  series: { en: "Series", ku: "زنجیرەکان" },
  dubbed: { en: "Kurdish Dubbed", ku: "دۆبلاژی کوردی" },
  search: { en: "Search", ku: "گەڕان" },
  play: { en: "Watch", ku: "سەیرکردن" },
  moreInfo: { en: "My List", ku: "لیستەکەم" },
  featured: { en: "Featured", ku: "تایبەت" },
  trending: { en: "Trending Now", ku: "بەرزترین ئێستا" },
  newReleases: { en: "New Releases", ku: "نوێترین" },
  popularMovies: { en: "Popular Movies", ku: "فیلمی بەناوبانگ" },
  popularSeries: { en: "Popular Series", ku: "زنجیرەی بەناوبانگ" },
  kurdishDub: { en: "Dubbed in Kurdish", ku: "دۆبلاژکراوی کوردی" },
  minutes: { en: "min", ku: "خولەک" },
  seasons: { en: "Seasons", ku: "وەرز" },
  overview: { en: "Overview", ku: "پوختە" },
  back: { en: "Back", ku: "گەڕانەوە" },
  language: { en: "Language", ku: "زمان" },
  settings: { en: "Settings", ku: "ڕێکخستنەکان" },
  appearance: { en: "Appearance", ku: "ڕووکار" },
  theme: { en: "Theme", ku: "ڕەنگ" },
  profile: { en: "Profile", ku: "پرۆفایل" },
  account: { en: "Account", ku: "ئەکاونت" },
  user: { en: "User", ku: "بەکارهێنەر" },
  guest: { en: "Guest", ku: "میوان" },
  email: { en: "Email", ku: "ئیمەیڵ" },
  password: { en: "Password", ku: "وشەی نهێنی" },
  displayName: { en: "Display name", ku: "ناوی نمایش" },
  changePhoto: { en: "Change photo", ku: "گۆڕینی وێنە" },
  uploading: { en: "Uploading…", ku: "بارکردن…" },
  removePhoto: { en: "Remove", ku: "لابردن" },
  name: { en: "Name", ku: "ناو" },
  save: { en: "Save", ku: "پاشەکەوت" },
  english: { en: "English", ku: "ئینگلیزی" },
  kurdish: { en: "Kurdish (Sorani)", ku: "کوردی (سۆرانی)" },
  themeDesc: { en: "Pick an accent color that fits your vibe.", ku: "ڕەنگێکی سەرەکی هەڵبژێرە کە لەگەڵ ڕووکارەکەت بگونجێت." },
  langDesc: { en: "Change the interface language.", ku: "گۆڕینی زمانی ڕووکار." },
  profileDesc: { en: "Your account details.", ku: "زانیاری ئەکاونتی تۆ." },
  watchHistory: { en: "Watch History", ku: "مێژووی سەیرکردن" },
  watchHistoryDesc: { en: "Movies you've watched.", ku: "ئەو فیلمانەی سەیرت کردوون." },
  resume: { en: "Resume", ku: "بەردەوامبوون" },
  noHistory: { en: "No watch history yet.", ku: "هیچ مێژوویەکی سەیرکردن نییە." },
  clearHistory: { en: "Clear", ku: "سڕینەوە" },
  chat: { en: "Live Chat", ku: "چاتی زیندوو" },
  signIn: { en: "Sign In", ku: "چوونەژوورەوە" },
  signUp: { en: "Sign Up", ku: "تۆمارکردن" },
  signOut: { en: "Sign Out", ku: "دەرچوون" },
  continueWithGoogle: { en: "Continue with Google", ku: "بەردەوامبوون بە گووگڵ" },
  or: { en: "or", ku: "یان" },
  typeMessage: { en: "Type a message…", ku: "پەیامێک بنووسە…" },
  send: { en: "Send", ku: "ناردن" },
  needSignInToChat: { en: "Sign in to join the conversation.", ku: "بۆ چاتکردن پێویستە بچیتە ژوورەوە." },
  goToSignIn: { en: "Sign in to chat", ku: "بچۆرەژوورەوە بۆ چات" },
  general: { en: "General", ku: "گشتی" },
  welcomeToKine: { en: "Welcome to Sebar Tv", ku: "بەخێربێی بۆ سێبەر تیڤی" },
  createAccount: { en: "Create an account", ku: "دروستکردنی ئەکاونت" },
  alreadyHave: { en: "Already have an account?", ku: "پێشتر ئەکاونتت هەیە؟" },
  noAccount: { en: "No account yet?", ku: "هێشتا ئەکاونتت نییە؟" },
  channels: { en: "Channels", ku: "کەناڵەکان" },
  edit: { en: "Edit", ku: "دەستکاری" },
  delete: { en: "Delete", ku: "سڕینەوە" },
  cancel: { en: "Cancel", ku: "پاشگەزبوونەوە" },
  smartDiscover: { en: "Smart Discovery", ku: "دۆزەرەوەی زیرەک" },
  smartDiscoverDesc: { en: "Tell us your mood — we'll pick something great.", ku: "پێمان بڵێ حەزت لە چ کەشێکە! با یارمەتیت بدەین" },
  surpriseMe: { en: "Surprise Me!", ku: "بەختی خۆت تاقی بکەرەوە!" },
  surpriseMeDesc: { en: "A totally random pick for the brave.", ku: "فلمێکی بەخت و نایاب بۆ هەڵدەبژێرین بە هەرەمەکی" },
  howFeel: { en: "How do you feel today?", ku: "ئەمڕۆ هەستت چۆنە؟" },
  moodEnergetic: { en: "Full of energy", ku: "پڕ لە وزە" },
  moodEnergeticDesc: { en: "Action, war, and explosions", ku: "ئەکشن و جەنگ و تەقینەوەکان" },
  moodSad: { en: "Sad & alone", ku: "خەمباری و بێ کەسی" },
  moodSadDesc: { en: "Deep dramas about loneliness", ku: "فیلمە قوڵەکان و ئەوانەی باسی تەنهایی دەکەن" },
  moodHappy: { en: "Happy & laughing", ku: "کاتێکی خۆش و پێکەنین" },
  moodHappyDesc: { en: "Comedies to forget your worries", ku: "بۆ ئەوانەی دەمانەوێت خەمەکانمان لەبیاد بکەین" },
  moodScared: { en: "Scared & thrilled", ku: "ترس و دڵەڕاوکێ" },
  moodScaredDesc: { en: "The scariest films to sleep with the lights on", ku: "ترسناکترین فیلمەکان کە خەوت لێ دەزرێنن" },
  moodThink: { en: "Thinking & mysteries", ku: "بیرکردنەوە و ئاڵۆزی دەروونی" },
  moodThinkDesc: { en: "Films and puzzles to blow your mind", ku: "فیلمە نهێنی و پزلەکان کە مێشکت سەرقاڵ دەکەن" },
  noMatch: { en: "No match found for this mood.", ku: "هیچ فیلمێک بۆ ئەم کەشە نەدۆزرایەوە." },
  pickAgain: { en: "Pick another", ku: "یەکێکی تر هەڵبژێرە" },
  comments: { en: "Comments", ku: "کۆمێنتەکان" },
  commentsCount: { en: "shown", ku: "نیشاندراو" },
  noComments: { en: "No comments yet.", ku: "هێشتا هیچ کۆمێنتێک نییە." },
  needSignInComment: { en: "Sign in required", ku: "چوونەژوورەوە پێویستە" },
  needSignInCommentDesc: { en: "Join the room to rate, react and comment.", ku: "بچۆ ژوورەوە بۆ هەڵسەنگاندن، پاشەکەوتکردن و کۆمێنتکردن." },
  writeComment: { en: "Write a comment…", ku: "کۆمێنتێک بنووسە…" },
  postComment: { en: "Post", ku: "بڵاوکردنەوە" },
  views: { en: "watching now", ku: "ئێستا سەیر دەکەن" },
  familyFriendly: { en: "Family-friendly", ku: "بۆ خێزان گونجاوە" },
  matureContent: { en: "Mature", ku: "بۆ گەورەکان" },
  reviewsBadge: { en: "Community", ku: "کۆمەڵگە" },
  reviewsTitle: { en: "Latest Reviews", ku: "پێداچوونەوەکان" },
  reviewsSubtitle: { en: "Fresh reactions and comments with the title and cover.", ku: "دوایین هەڵسەنگاندن و کۆمێنتەکان لەگەڵ ناوی بەرهەم و وێنەکەی." },
  viewGroup: { en: "View group", ku: "بینینی گرووپ" },
  searchPlaceholder: { en: "Search movies, series, dubbed…", ku: "گەڕان بۆ فیلم، زنجیرە، دۆبلاژ…" },
  searchNoResults: { en: "No results found.", ku: "هیچ ئەنجامێک نەدۆزرایەوە." },
  searchStart: { en: "Start typing to search across the catalog.", ku: "دەست بکە بە نووسین بۆ گەڕان بەناو هەموو بەرهەمەکاندا." },
  watchTrailerQ: { en: "Want to watch the trailer?", ku: "ئایا حەز دەکەیت سەیری تریلەرەکە بکەیت؟" },
  watchTrailerDesc: { en: "A quick preview before you dive in.", ku: "پێشبینینێکی خێرا پێش ئەوەی بچیتە ناوەوە." },
  watchNow: { en: "Watch trailer", ku: "سەیری تریلەر بکە" },
  hideTrailer: { en: "Hide trailer", ku: "شاردنەوەی تریلەر" },
  youMightLike: { en: "Similar titles", ku: "هاوشێوەکان" },
  browseMoviesCta: { en: "Explore more movies", ku: "گەڕان بەناو زیاتر فیلمدا" },
  browseSeriesCta: { en: "Explore more series", ku: "گەڕان بەناو زیاتر زنجیرەدا" },
  browseDubbedCta: { en: "Explore Kurdish dubbed", ku: "گەڕان بەناو دۆبلاژی کوردیدا" },
  seeAll: { en: "See all", ku: "بینینی هەموو" },
  watchTogether: { en: "Watch Together", ku: "پێکەوە سەیرکردن" },
  rooms: { en: "Rooms", ku: "ژوورەکان" },
  createRoom: { en: "Create Room", ku: "دروستکردنی ژوور" },
  joinRoom: { en: "Join Room", ku: "چوونە ژوورەوە" },
  roomCode: { en: "Room Code", ku: "کۆدی ژوور" },
  enterCode: { en: "Enter room code…", ku: "کۆدی ژوور بنووسە…" },
  join: { en: "Join", ku: "چوونە ژوور" },
  leaveRoom: { en: "Leave", ku: "دەرچوون" },
  activeRooms: { en: "Active Rooms", ku: "ژوورە چالاکەکان" },
  noRooms: { en: "No active rooms yet.", ku: "هێشتا هیچ ژوورێکی چالاک نییە." },
  vipOnly: { en: "VIP only", ku: "تەنها VIP" },
  host: { en: "Host", ku: "میوانداری" },
  guests: { en: "Guests", ku: "میوانەکان" },
  copyCode: { en: "Copy code", ku: "کۆپیکردنی کۆد" },
  copied: { en: "Copied!", ku: "کۆپی کرا!" },
  micOn: { en: "Mic on", ku: "مایک چالاکە" },
  micOff: { en: "Mic off", ku: "مایک ناچالاکە" },
  hostControls: { en: "Only host controls playback", ku: "تەنها میوانداری کۆنترۆڵی لێدان دەکات" },
  roomNotFound: { en: "Room not found or ended.", ku: "ژوور نەدۆزرایەوە یان کۆتایی هات." },
  needSignInRoom: { en: "Sign in to join rooms.", ku: "بۆ چوونە ژوور پێویستە بچیتە ژوورەوە." },
  needVipToCreate: { en: "Only VIP members can create rooms.", ku: "تەنها ئەندامانی VIP دەتوانن ژوور دروست بکەن." },
} as const;

type Dict = typeof DICT;





type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof DICT) => string;
  dir: "ltr" | "rtl";
};

const LangCtx = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = (typeof window !== "undefined" &&
      (localStorage.getItem("lang") as Lang | null)) || null;
    if (stored === "en" || stored === "ku") setLangState(stored);
  }, []);

  useEffect(() => {
    const dir = lang === "ku" ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("lang", l);
    } catch {}
  };

  const value: Ctx = {
    lang,
    setLang,
    t: (key) => DICT[key][lang],
    dir: lang === "ku" ? "rtl" : "ltr",
  };

  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useLang() {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error("useLang must be inside LanguageProvider");
  return ctx;
}

export function localized<T extends { title: string; titleKu: string; overview: string; overviewKu: string; genres: string[]; genresKu: string[] }>(
  item: T,
  lang: Lang,
) {
  return {
    title: lang === "ku" ? item.titleKu : item.title,
    overview: lang === "ku" ? item.overviewKu : item.overview,
    genres: lang === "ku" ? item.genresKu : item.genres,
  };
}
