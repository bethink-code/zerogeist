/**
 * Bluesky source fetcher
 * Uses the public AT Protocol search API — no auth required.
 * Searches for South African content using geographic keywords.
 * Free, no API key needed. Rate limit: ~3000 req/5min.
 */

const API_BASE = "https://api.bsky.app/xrpc";

export interface BlueskyPost {
  text: string;
  author: string;
  displayName: string | null;
  likes: number;
  reposts: number;
  replies: number;
  quotes: number;
  createdAt: Date;
  url: string;
  source: "bluesky";
  langs: string[];
  provinceTag: string | null;
}

// Search queries mapped to provinces — same pattern as Twitter/Apify
const SEARCHES: { query: string; province: string | null }[] = [
  // National
  { query: "South Africa", province: null },
  { query: "Mzansi", province: null },
  // Gauteng
  { query: "Johannesburg OR Joburg OR Pretoria OR Tshwane", province: "GP" },
  // Western Cape
  { query: "Cape Town OR Stellenbosch OR Kaapstad", province: "WC" },
  // KwaZulu-Natal
  { query: "Durban OR eThekwini OR Pietermaritzburg", province: "KZN" },
  // Eastern Cape
  { query: "Gqeberha OR East London OR Mthatha", province: "EC" },
  // Free State
  { query: "Bloemfontein OR Mangaung", province: "FS" },
  // North West
  { query: "Rustenburg OR Mahikeng", province: "NW" },
  // Northern Cape
  { query: "Kimberley OR Upington", province: "NC" },
  // Mpumalanga
  { query: "Mbombela OR Nelspruit OR eMalahleni", province: "MP" },
  // Limpopo
  { query: "Polokwane OR Limpopo OR Tzaneen", province: "LP" },
];

function getTodayRange(): { since: string; until: string } {
  const now = new Date();
  const since = new Date(now);
  since.setHours(0, 0, 0, 0);
  const until = new Date(since);
  until.setDate(until.getDate() + 1);
  return {
    since: since.toISOString(),
    until: until.toISOString(),
  };
}

function postUrl(uri: string, handle: string): string {
  // uri format: at://did:plc:xxx/app.bsky.feed.post/yyy
  const rkey = uri.split("/").pop();
  return `https://bsky.app/profile/${handle}/post/${rkey}`;
}

async function searchPosts(
  query: string,
  province: string | null,
  since: string,
  until: string
): Promise<BlueskyPost[]> {
  const posts: BlueskyPost[] = [];
  let cursor: string | undefined;
  let pages = 0;
  const MAX_PAGES = 3; // max 300 posts per query

  while (pages < MAX_PAGES) {
    const params = new URLSearchParams({
      q: query,
      sort: "latest",
      since,
      until,
      limit: "100",
    });
    if (cursor) params.set("cursor", cursor);

    const url = `${API_BASE}/app.bsky.feed.searchPosts?${params}`;

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "zerogeist/1.0 (mzansi.zerogeist.me)" },
      });

      if (!res.ok) {
        if (res.status === 429) {
          console.log(`[bluesky] Rate limited on "${query}", stopping pagination`);
          break;
        }
        console.error(`[bluesky] Search failed for "${query}": ${res.status}`);
        break;
      }

      const data = await res.json();
      const results = data.posts || [];

      for (const post of results) {
        const record = post.record || {};
        posts.push({
          text: record.text || "",
          author: post.author?.handle || "unknown",
          displayName: post.author?.displayName || null,
          likes: post.likeCount || 0,
          reposts: post.repostCount || 0,
          replies: post.replyCount || 0,
          quotes: post.quoteCount || 0,
          createdAt: new Date(record.createdAt || post.indexedAt || Date.now()),
          url: postUrl(post.uri, post.author?.handle || "unknown"),
          source: "bluesky",
          langs: record.langs || [],
          provinceTag: province,
        });
      }

      cursor = data.cursor;
      pages++;

      if (!cursor || results.length < 100) break;

      // Small delay between pages
      await new Promise((r) => setTimeout(r, 200));
    } catch (err: any) {
      console.error(`[bluesky] Error searching "${query}": ${err.message}`);
      break;
    }
  }

  return posts;
}

export async function fetchBluesky(): Promise<{
  posts: BlueskyPost[];
  error: string | null;
}> {
  const allPosts: BlueskyPost[] = [];
  const errors: string[] = [];
  const seenUrls = new Set<string>();
  const { since, until } = getTodayRange();

  console.log(`[bluesky] Searching ${SEARCHES.length} queries for ${since.split("T")[0]}`);

  for (const { query, province } of SEARCHES) {
    try {
      const posts = await searchPosts(query, province, since, until);

      // Deduplicate
      for (const p of posts) {
        if (!seenUrls.has(p.url) && p.text.length > 10) {
          seenUrls.add(p.url);
          allPosts.push(p);
        }
      }

      // Rate limit courtesy: 500ms between queries
      await new Promise((r) => setTimeout(r, 500));
    } catch (err: any) {
      errors.push(`"${query}": ${err.message}`);
    }
  }

  // Log province distribution
  const provCounts = new Map<string, number>();
  for (const p of allPosts) {
    const key = p.provinceTag || "national";
    provCounts.set(key, (provCounts.get(key) || 0) + 1);
  }
  const distStr = [...provCounts.entries()].map(([k, v]) => `${k}:${v}`).join(" ");
  console.log(`[bluesky] Got ${allPosts.length} posts (${distStr})`);

  return {
    posts: allPosts,
    error: errors.length > 0 ? errors.join("; ") : null,
  };
}
