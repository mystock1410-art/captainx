import type { NewsItem } from "./rss";

const TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single";

// In-memory cache: item id -> translations. Lives for the duration of the serverless function instance.
const cache = new Map<string, { title_vi: string; summary_vi: string }>();

async function translateOne(text: string): Promise<string> {
  if (!text) return text;
  const truncated = text.slice(0, 5000);
  const params = new URLSearchParams({
    client: "gtx",
    sl: "en",
    tl: "vi",
    dt: "t",
    q: truncated,
  });
  try {
    const r = await fetch(`${TRANSLATE_URL}?${params}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!r.ok) return text;
    const data = await r.json();
    if (!Array.isArray(data) || !data[0]) return text;
    const parts = (data[0] as unknown[])
      .filter((seg): seg is [string, ...unknown[]] => Array.isArray(seg) && typeof seg[0] === "string")
      .map((seg) => seg[0]);
    return parts.join("").trim() || text;
  } catch {
    return text;
  }
}

export async function translateItems(items: NewsItem[]): Promise<NewsItem[]> {
  const todo: { idx: number; title: string; summary: string }[] = [];

  for (let i = 0; i < items.length; i++) {
    const cached = cache.get(items[i].id);
    if (cached) {
      items[i].title_vi = cached.title_vi;
      items[i].summary_vi = cached.summary_vi;
    } else {
      todo.push({ idx: i, title: items[i].title, summary: items[i].summary });
    }
  }

  if (!todo.length) return items;

  // Translate with limited concurrency (6 at a time)
  const CONCURRENCY = 6;
  for (let i = 0; i < todo.length; i += CONCURRENCY) {
    const batch = todo.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async ({ idx, title, summary }) => {
        const [title_vi, summary_vi] = await Promise.all([
          translateOne(title),
          summary ? translateOne(summary) : Promise.resolve(""),
        ]);
        items[idx].title_vi = title_vi;
        items[idx].summary_vi = summary_vi;
        cache.set(items[idx].id, { title_vi, summary_vi });
      })
    );
  }

  // Soft cap on cache size
  if (cache.size > 5000) {
    const keys = [...cache.keys()].slice(0, cache.size - 4000);
    for (const k of keys) cache.delete(k);
  }

  return items;
}
