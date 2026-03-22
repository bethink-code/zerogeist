/**
 * Reddit source fetcher
 * Pulls top 25 hot posts from SA subreddits via public JSON API.
 * No authentication required. Rate limit: 60 req/min.
 */

const SUBREDDITS = [
  "southafrica",
  "joburg",
  "capetown",
  "durban",
  "pretoria",
];

interface RedditPost {
  title: string;
  selftext: string;
  score: number;
  num_comments: number;
  subreddit: string;
  created_utc: number;
  permalink: string;
  link_flair_text: string | null;
}

export interface FetchedPost {
  title: string;
  body: string;
  score: number;
  comments: number;
  subreddit: string;
  createdAt: Date;
  url: string;
  flair: string | null;
  source: "reddit";
}

async function fetchSubreddit(subreddit: string): Promise<FetchedPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=25`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "zerogeist/1.0 (mzansi.zerogeist.me)",
    },
  });

  if (!res.ok) {
    console.error(`[reddit] Failed to fetch r/${subreddit}: ${res.status}`);
    return [];
  }

  const data = await res.json();
  const posts: RedditPost[] = data.data.children.map((c: any) => c.data);

  const now = Date.now();
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

  return posts
    .filter((p) => !p.selftext.includes("[removed]") && !p.selftext.includes("[deleted]"))
    .map((p) => ({
      title: p.title,
      body: p.selftext.slice(0, 2000),
      score: p.score,
      comments: p.num_comments,
      subreddit: p.subreddit,
      createdAt: new Date(p.created_utc * 1000),
      url: `https://reddit.com${p.permalink}`,
      flair: p.link_flair_text,
      source: "reddit" as const,
    }))
    .filter((p) => now - p.createdAt.getTime() < SEVEN_DAYS);
}

export async function fetchReddit(): Promise<{
  posts: FetchedPost[];
  error: string | null;
}> {
  const allPosts: FetchedPost[] = [];
  const errors: string[] = [];

  for (const sub of SUBREDDITS) {
    try {
      const posts = await fetchSubreddit(sub);
      allPosts.push(...posts);
      // Rate limit: wait 1.5s between requests
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err: any) {
      errors.push(`r/${sub}: ${err.message}`);
    }
  }

  return {
    posts: allPosts,
    error: errors.length > 0 ? errors.join("; ") : null,
  };
}
