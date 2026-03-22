/**
 * Parliamentary Monitoring Group (PMG) source fetcher
 * Pulls recent committee meetings via PMG's public API.
 * Signal: what the South African state is actually doing in committees.
 */

export interface PMGItem {
  title: string;
  body: string;
  date: string;
  committee: string;
  url: string;
  fetchedSource: "pmg";
}

export async function fetchPMG(): Promise<{
  posts: PMGItem[];
  error: string | null;
}> {
  try {
    // PMG API — recent committee meetings
    const url = "https://api.pmg.org.za/committee-meeting/?format=json&page_size=20";
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return { posts: [], error: `PMG API returned ${res.status}` };
    }

    const data = await res.json();
    const results = data.results || [];

    const items: PMGItem[] = results.map((item: any) => ({
      title: item.title || "",
      body: (item.summary || item.body || "").slice(0, 3000),
      date: item.date || "",
      committee: item.committee?.name || "Unknown Committee",
      url: item.url || `https://pmg.org.za/committee-meeting/${item.id}/`,
      fetchedSource: "pmg" as const,
    }));

    return { posts: items, error: null };
  } catch (err: any) {
    return { posts: [], error: `PMG fetch failed: ${err.message}` };
  }
}
