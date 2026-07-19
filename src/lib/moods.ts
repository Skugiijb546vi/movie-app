import type { Media } from "./data";

export type MoodKey = "energetic" | "sad" | "happy" | "scared" | "think";

const MOOD_GENRES: Record<MoodKey, string[]> = {
  energetic: ["Action", "Adventure", "Thriller", "War"],
  sad: ["Drama", "History"],
  happy: ["Comedy", "Family", "Animation"],
  scared: ["Horror", "Thriller", "Mystery"],
  think: ["Sci-Fi", "Mystery", "Crime", "Fantasy", "Drama"],
};

export function pickForMood(mood: MoodKey, all: Media[]): Media | null {
  const wanted = MOOD_GENRES[mood];
  const matches = all.filter((m) => m.genres.some((g) => wanted.includes(g)));
  if (!matches.length) return null;
  return matches[Math.floor(Math.random() * matches.length)];
}

export function pickRandom(all: Media[]): Media {
  return all[Math.floor(Math.random() * all.length)];
}
