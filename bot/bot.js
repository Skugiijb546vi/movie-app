// Automated Movie Fetcher & Translator Bot (Professional Edition with Puppeteer)
// Run this file using: node bot/bot.js
// Requires: npm install puppeteer

import puppeteer from 'puppeteer';

const TMDB_API_KEY = "7ff77f551b7a1db3b68d9a5a991e7cd5";
const FIREBASE_BASE_URL = "https://sebartv-efccb-default-rtdb.firebaseio.com/np";
const FIREBASE_AUTH = "6qa7EEbgBzwXp3pu6L1eSy3AZLsKtLPSc8Xtd5Eo";

// === Encryption Helpers for Link and Subtitle Security ===
const SECRET_PASSPHRASE = "SebarTvSecretKey2026_Secure_Token!";

function safeBtoa(str) {
  if (typeof btoa === "function") return btoa(str);
  return Buffer.from(str, "binary").toString("base64");
}

function generateSalt(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function encrypt(text) {
  if (!text) return "";
  const salt = generateSalt(8);
  const fullKey = SECRET_PASSPHRASE + salt;
  
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const keyChar = fullKey.charCodeAt(i % fullKey.length);
    const encryptedChar = charCode ^ keyChar;
    result += encryptedChar.toString(16).padStart(4, "0");
  }
  return safeBtoa(salt + ":" + result);
}
// ========================================================

// Helper: Translate text to Kurdish Sorani using Google Translate's free API
async function translateToKurdish(text) {
  if (!text) return "";
  try {
    // tl=ckb is the code for Central Kurdish (Sorani)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ckb&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const data = await response.json();
    return data[0].map(item => item[0]).join('');
  } catch (error) {
    console.log("Translation error:", error.message);
    return text; // Fallback to English
  }
}

// Helper: Get IMDB ID from TMDB (works for both movies and tv)
async function getImdbId(tmdbId, type = 'movie') {
  try {
    // For TV shows, we MUST append external_ids to get the IMDB ID
    const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    const res = await fetch(url);
    const data = await res.json();
    return data.imdb_id || (data.external_ids ? data.external_ids.imdb_id : null);
  } catch (e) {
    console.error(`❌ Error fetching IMDB ID for ${type} ${tmdbId}:`, e.message);
    return null;
  }
}

// Helper: Get Subtitle URL from Stremio Addon
async function fetchSubtitleUrl(imdbId, type = 'movie') {
  if (!imdbId) return null;
  try {
    let fetchType = type;
    let fetchId = imdbId;

    // OpenSubtitles requires 'series' and Season/Episode numbers
    if (type === 'tv') {
      fetchType = 'series';
      fetchId = `${imdbId}:1:1`; // Default to Season 1, Episode 1
    }

    const url = `https://opensubtitles-v3.strem.io/subtitles/${fetchType}/${fetchId}.json`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.subtitles && data.subtitles.length > 0) {
      const engSub = data.subtitles.find(s => s.lang === 'eng' || s.lang === 'en');
      return engSub ? engSub.url : null;
    }
  } catch (e) {
    console.error(`❌ Error fetching subtitle URL:`, e.message);
    return null;
  }
  return null;
}

// Helper: Fetch and translate subtitle to Base64 VTT
async function processSubtitle(subUrl) {
  if (!subUrl) {
    console.log("⚠️ No subtitle URL provided, skipping translation.");
    return "";
  }
  try {
    const res = await fetch(subUrl);
    const text = await res.text();

    console.log(`⏳ Translating full subtitle (${text.length} chars)...`);

    // Split text into chunks of ~4000 chars to avoid API limits
    const chunkSize = 4000;
    let translatedFull = "";

    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.substring(i, i + chunkSize);
      const translated = await translateToKurdish(chunk);
      translatedFull += translated;
      // Small delay to be safe
      await new Promise(r => setTimeout(r, 500));
    }

    // Create a Base64 VTT
    const base64Vtt = Buffer.from(`WEBVTT\n\n${translatedFull}`).toString('base64');
    return `data:text/vtt;base64,${base64Vtt}`;
  } catch (error) {
    console.log("Subtitle Processing Error:", error.message);
    return "";
  }
}

// 🚀 ULTIMATE Puppeteer Headless Browser Stream Scraper
// Tries multiple streaming sites with real browser stealth techniques
async function getDirectStream(tmdbId, imdbId) {
  let browser = null;

  // Sites to try - ordered from least to most protected
  const targets = [];
  if (imdbId) {
    targets.push(`https://moviesapi.club/movie/${imdbId}`);
    targets.push(`https://vidsrc.xyz/embed/movie/${imdbId}`);
    targets.push(`https://embed.su/embed/movie/${imdbId}`);
  }
  targets.push(`https://player.smashy.stream/movies/${tmdbId}`);
  targets.push(`https://vidsrc.icu/embed/movie/${tmdbId}`);

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--flag-switches-begin',
        '--disable-site-isolation-trials',
        '--flag-switches-end'
      ],
      ignoreDefaultArgs: ['--enable-automation']
    });

    for (const targetUrl of targets) {
      const page = await browser.newPage();
      let capturedUrl = null;

      // 🥷 STEALTH: Hide that we are a bot
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
        window.chrome = { runtime: {} };
      });

      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1280, height: 720 });
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

      // 🎯 INTERCEPT - Only real video streams (NOT fonts, images, etc.)
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const url = req.url();
        // Only capture REAL video stream URLs
        if (!capturedUrl && (
          url.match(/\.m3u8(\?|$)/) ||
          (url.includes('.mp4') && !url.includes('cloudflare') && !url.includes('cdn'))
        )) {
          console.log(`   🎯 REAL STREAM FOUND: ${url.substring(0, 100)}`);
          capturedUrl = url;
        }
        req.continue().catch(() => { });
      });

      page.on('response', async (res) => {
        const url = res.url();
        const contentType = res.headers()['content-type'] || '';
        // Only match real HLS/video content types
        if (!capturedUrl && (
          contentType.includes('application/vnd.apple.mpegurl') ||
          contentType.includes('application/x-mpegurl') ||
          contentType.includes('video/mp4') ||
          contentType.includes('video/webm')
        )) {
          console.log(`   📦 REAL VIDEO RESPONSE: ${url.substring(0, 100)} [${contentType}]`);
          capturedUrl = url;
        }
        if (!capturedUrl && url.match(/\.m3u8(\?|$)/)) {
          console.log(`   🎯 M3U8 IN RESPONSE: ${url.substring(0, 100)}`);
          capturedUrl = url;
        }
      });

      try {
        console.log(`🌐 Trying: ${targetUrl.split('/')[2]}...`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

        // Wait for player to load and auto-play
        await new Promise(r => setTimeout(r, 7000));

        // Try clicking play if needed
        if (!capturedUrl) {
          try {
            await page.evaluate(() => {
              const btns = document.querySelectorAll('button, .play, [class*="play"], video');
              btns.forEach(btn => btn.click && btn.click());
            });
            await new Promise(r => setTimeout(r, 4000));
          } catch (e) { }
        }

        await page.close();

        if (capturedUrl) {
          console.log(`✅ CAPTURED stream from ${targetUrl.split('/')[2]}: ${capturedUrl.substring(0, 70)}...`);
          await browser.close();
          return capturedUrl;
        }

      } catch (e) {
        try { await page.close(); } catch (e2) { }
        continue;
      }
    }

    await browser.close();
    browser = null;

  } catch (e) {
    console.log(`⚠️ Browser error: ${e.message}`);
    if (browser) { try { await browser.close(); } catch (e2) { } }
  }

  return null;
}


// Helper: Fetch popular movies from TMDB
async function fetchTrendingMovies() {
  const page = Math.floor(Math.random() * 5) + 1;
  const url = `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&page=${page}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.results.map(m => ({ ...m, type: 'movie' }));
}

// Helper: Fetch popular TV series from TMDB
async function fetchTrendingTV() {
  const page = Math.floor(Math.random() * 5) + 1;
  const url = `https://api.themoviedb.org/3/tv/popular?api_key=${TMDB_API_KEY}&page=${page}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.results.map(m => ({ ...m, type: 'tv', title: m.name, release_date: m.first_air_date }));
}

// Helper: Check if movie already exists in Firebase
async function getExistingMovies() {
  const response = await fetch(`${FIREBASE_BASE_URL}.json?auth=${FIREBASE_AUTH}`);
  const data = await response.json();
  return data || {};
}

// Main Bot Logic
async function runBot() {
  console.log("🤖 Bot Started: Fetching movies and series together...");

  try {
    // Fetch both movies and series
    const movieResults = await fetchTrendingMovies();
    const tvResults = await fetchTrendingTV();

    // Combine and shuffle them to have a mix
    let allContent = [];
    const maxLength = Math.max(movieResults.length, tvResults.length);

    for (let i = 0; i < maxLength; i++) {
      if (movieResults[i]) allContent.push(movieResults[i]);
      if (tvResults[i]) allContent.push(tvResults[i]);
    }

    // Limit to 10 items for maximum stability
    allContent = allContent.slice(0, 10);

    const existingData = await getExistingMovies();

    // Find highest existing ID
    let maxId = -1;
    let existingIds = new Set();

    if (Array.isArray(existingData)) {
      existingData.forEach((item, index) => {
        if (item) {
          maxId = Math.max(maxId, index);
          if (item.id) existingIds.add(String(item.id));
        }
      });
    } else {
      Object.keys(existingData).forEach(key => {
        const numericKey = Number(key);
        if (!isNaN(numericKey)) maxId = Math.max(maxId, numericKey);
        const item = existingData[key];
        if (item && item.id) existingIds.add(String(item.id));
      });
    }

    let nextId = maxId + 1;
    let addedCount = 0;

    for (const item of allContent) {
      if (existingIds.has(String(item.id))) {
        console.log(`⏩ Skipping "${item.title}" (Already exists)`);
        continue;
      }

      console.log(`⬇️ Processing: "${item.title}" (${item.type})`);

      const kurdishOverview = await translateToKurdish(item.overview);
      const year = item.release_date ? item.release_date.split('-')[0] : "2024";

      console.log(`🔍 Fetching IMDB ID for "${item.title}"...`);
      const imdbId = await getImdbId(item.id, item.type);

      console.log(`🔍 Fetching subtitles for "${item.title}"...`);
      const subUrl = await fetchSubtitleUrl(imdbId, item.type);
      const kurdishVttBase64 = await processSubtitle(subUrl);

      console.log(`🔍 Hunting for direct stream for "${item.title}"...`);
      // بەکارهێنانی سێرڤەرێکی باشتر کە ڕیکلامی کەمترە 
      let directStreamUrl = `https://vidsrc.cc/v2/embed/${item.type}/${item.id}`;

      // Encrypt sensitive links and subtitles before pushing to database
      const encryptedUrl = encrypt(directStreamUrl);
      const encryptedSubtitle = kurdishVttBase64 ? encrypt(kurdishVttBase64) : "";

      const newItem = {
        id: item.id,
        title: item.title,
        description: kurdishOverview,
        image: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
        year: year,
        imdb: item.vote_average,
        badge_text: "FREE",
        type: item.type,
        url: encryptedUrl,
        hasSubtitle: kurdishVttBase64 ? true : false,
        subtitleKurdish: encryptedSubtitle,
        timestamp: Date.now()
      };

      const putUrl = `${FIREBASE_BASE_URL}/${nextId}.json?auth=${FIREBASE_AUTH}`;
      const putResponse = await fetch(putUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem)
      });

      if (putResponse.ok) {
        console.log(`✅ Successfully added ${item.type}: "${item.title}" at ID ${nextId}`);
        addedCount++;
        nextId++;
      }

      // 2 second delay to be 100% safe
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(`🎉 Bot Finished! Added ${addedCount} new items (Movies & Series).`);

  } catch (error) {
    console.error("💥 Bot error:", error);
  }
}

runBot();
