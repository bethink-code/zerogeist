/**
 * Apify source fetcher
 * Uses kaitoeasyapi/twitter-x-data-tweet-scraper — $0.25 per 1K tweets
 *
 * Search terms are purely geographic — no topic bias.
 * Uses `since` filter to only get today's tweets.
 * Claude does all interpretation downstream.
 */

import fs from "fs";
import path from "path";

const APIFY_TOKEN = process.env.APIFY_API_KEY || "";
const ACTOR_ID = "kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest";
const CACHE_DIR = path.join(process.cwd(), "data");

export interface ApifyPost {
  text: string;
  author: string;
  authorLocation: string | null; // user's profile location — free geo signal
  likes: number;
  retweets: number;
  replies: number;
  createdAt: Date;
  url: string;
  source: string;
  fetchedSource: "twitter";
  provinceTag: string | null; // province code from the search term that found this tweet
}

// Per-province search terms — each query maps to a province for tagging
const PROVINCE_SEARCHES: { terms: string; province: string | null }[] = [
  // National (broad)
  { terms: "South Africa", province: null },
  { terms: "Mzansi", province: null },
  // Gauteng
  { terms: "Johannesburg OR Joburg OR Jozi", province: "GP" },
  { terms: "Pretoria OR Tshwane OR Centurion", province: "GP" },
  { terms: "Soweto OR Sandton OR Midrand", province: "GP" },
  // Western Cape
  { terms: "Cape Town OR Kaapstad OR Stellenbosch", province: "WC" },
  // KwaZulu-Natal
  { terms: "Durban OR eThekwini OR Pietermaritzburg OR Umhlanga", province: "KZN" },
  // Eastern Cape
  { terms: "Port Elizabeth OR Gqeberha OR East London OR Mthatha", province: "EC" },
  // Free State
  { terms: "Bloemfontein OR Mangaung OR Welkom", province: "FS" },
  // North West
  { terms: "Rustenburg OR Mahikeng OR Potchefstroom", province: "NW" },
  // Northern Cape
  { terms: "Kimberley OR Upington", province: "NC" },
  // Mpumalanga
  { terms: "Nelspruit OR Mbombela OR Witbank OR eMalahleni", province: "MP" },
  // Limpopo
  { terms: "Polokwane OR Tzaneen OR Musina OR Limpopo", province: "LP" },
];

// Rate limiting: max 1 run per hour, max $1/day
let lastRunTime = 0;
let dailyCostAccumulated = 0;
let dailyCostDate = "";
const MIN_RUN_INTERVAL_MS = 60 * 60 * 1000;
const MAX_DAILY_COST = 1.0;

function getTodaySince(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().replace("T", "_").replace("Z", "_UTC").slice(0, 23) + "_UTC";
}

export async function fetchTwitter(): Promise<{
  posts: ApifyPost[];
  error: string | null;
  cost: number;
}> {
  if (!APIFY_TOKEN) {
    return { posts: [], error: "APIFY_API_KEY not configured", cost: 0 };
  }

  // Reset daily cost tracker on new day
  const today = new Date().toISOString().split("T")[0];
  if (dailyCostDate !== today) {
    dailyCostAccumulated = 0;
    dailyCostDate = today;
  }

  // Rate limit: max 1 run per hour
  const timeSinceLastRun = Date.now() - lastRunTime;
  if (lastRunTime > 0 && timeSinceLastRun < MIN_RUN_INTERVAL_MS) {
    const waitMins = Math.ceil((MIN_RUN_INTERVAL_MS - timeSinceLastRun) / 60000);
    console.log(`[apify] Rate limited — next run in ${waitMins}min, checking cache...`);
    const cached = loadTweetCache(today);
    if (cached) return { posts: cached, error: null, cost: 0 };
    return { posts: [], error: `Rate limited — next run in ${waitMins}min`, cost: 0 };
  }

  // Budget cap
  if (dailyCostAccumulated >= MAX_DAILY_COST) {
    console.log(`[apify] Daily budget cap reached, checking cache...`);
    const cached = loadTweetCache(today);
    if (cached) return { posts: cached, error: null, cost: 0 };
    return { posts: [], error: `Daily budget cap reached`, cost: 0 };
  }

  try {
    lastRunTime = Date.now();
    const maxTweets = 200;
    const maxChargeUsd = 0.15;
    const since = getTodaySince();
    const searchTerms = PROVINCE_SEARCHES.map((s) => s.terms);

    console.log(`[apify] Scraping Twitter: ${searchTerms.length} geo terms (${PROVINCE_SEARCHES.filter(s => s.province).length} provincial), ${maxTweets} max, $${maxChargeUsd} cap`);

    const input = {
      searchTerms,
      maxItems: maxTweets,
      sort: "Latest",
      tweetLanguage: "",
      since,
      "filter:nativeretweets": false,
      "include:nativeretweets": false,
      "filter:replies": false,
      "filter:quote": false,
    };

    const startRes = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}&maxTotalChargeUsd=${maxChargeUsd}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );

    if (!startRes.ok) {
      return { posts: [], error: `Failed to start actor: ${startRes.status}`, cost: 0 };
    }

    const runData = await startRes.json();
    const runId = runData.data?.id;
    const datasetId = runData.data?.defaultDatasetId;

    if (!runId || !datasetId) {
      return { posts: [], error: "No run ID returned", cost: 0 };
    }

    console.log(`[apify] Run started: ${runId}`);

    // Poll for completion (every 5s, max 5 min)
    let status = "RUNNING";
    for (let i = 0; i < 60 && (status === "RUNNING" || status === "READY"); i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const statusRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
      );
      const statusData = await statusRes.json();
      status = statusData.data?.status || "FAILED";

      if (i % 6 === 0) console.log(`[apify] Status: ${status}`);
    }

    if (status !== "SUCCEEDED") {
      return { posts: [], error: `Run ended with status: ${status}`, cost: 0 };
    }

    // Fetch results
    const resultsRes = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=${maxTweets}`
    );
    const items = await resultsRes.json();

    if (!Array.isArray(items)) {
      return { posts: [], error: "Unexpected response format", cost: 0 };
    }

    // Tag each tweet with the province from its search term
    const seenUrls = new Set<string>();
    const posts: ApifyPost[] = items
      .filter((item: any) => item.type === "tweet" && item.text)
      .map((item: any) => {
        // searchTermIndex tells us which search term found this tweet
        const termIndex = item.searchTermIndex ?? -1;
        const provinceTag = termIndex >= 0 && termIndex < PROVINCE_SEARCHES.length
          ? PROVINCE_SEARCHES[termIndex].province
          : null;

        return {
          text: item.text,
          author: item.author?.userName || "unknown",
          authorLocation: item.author?.location || null,
          likes: item.likeCount || 0,
          retweets: item.retweetCount || 0,
          replies: item.replyCount || 0,
          createdAt: new Date(item.createdAt || Date.now()),
          url: item.url || "",
          source: `x/@${item.author?.userName || "unknown"}`,
          fetchedSource: "twitter" as const,
          provinceTag,
        };
      })
      .filter((p) => {
        // Deduplicate by URL
        if (seenUrls.has(p.url)) return false;
        seenUrls.add(p.url);
        return true;
      });

    // Log province distribution
    const provCounts = new Map<string, number>();
    for (const p of posts) {
      const key = p.provinceTag || "national";
      provCounts.set(key, (provCounts.get(key) || 0) + 1);
    }
    const distStr = [...provCounts.entries()].map(([k, v]) => `${k}:${v}`).join(" ");

    const cost = Math.round(posts.length * 0.00025 * 10000) / 10000;
    dailyCostAccumulated += cost;
    console.log(`[apify] Got ${posts.length} tweets (${distStr}), cost: $${cost}`);

    saveTweetCache(today, posts);

    return { posts, error: null, cost };
  } catch (err: any) {
    return { posts: [], error: `Twitter scrape failed: ${err.message}`, cost: 0 };
  }
}

function saveTweetCache(date: string, posts: ApifyPost[]) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(path.join(CACHE_DIR, `tweets-${date}.json`), JSON.stringify(posts));
    console.log(`[apify] Cached ${posts.length} tweets to data/tweets-${date}.json`);
  } catch (err: any) {
    console.error(`[apify] Failed to cache tweets: ${err.message}`);
  }
}

function loadTweetCache(date: string): ApifyPost[] | null {
  // Try today first, then yesterday
  for (const d of [date, yesterdayDate(date)]) {
    const filePath = path.join(CACHE_DIR, `tweets-${d}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
        // Handle both raw Apify format and our ApifyPost format
        const posts: ApifyPost[] = raw
          .filter((item: any) => (item.type === "tweet" && item.text) || item.fetchedSource === "twitter")
          .map((item: any) => {
            if (item.fetchedSource === "twitter") return item;
            return {
              text: item.text,
              author: item.author?.userName || "unknown",
              likes: item.likeCount || 0,
              retweets: item.retweetCount || 0,
              replies: item.replyCount || 0,
              createdAt: new Date(item.createdAt || Date.now()),
              url: item.url || "",
              source: `x/@${item.author?.userName || "unknown"}`,
              fetchedSource: "twitter" as const,
            };
          });
        console.log(`[apify] Loaded ${posts.length} tweets from cache (${d})`);
        return posts;
      } catch { /* ignore parse errors */ }
    }
  }
  return null;
}

function yesterdayDate(date: string): string {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}
