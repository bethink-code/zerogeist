/**
 * ReliefWeb source fetcher
 * Pulls latest 20 reports filtered by South Africa.
 * Free API, no authentication required.
 */

export interface ReliefWebReport {
  title: string;
  body: string;
  date: string;
  source: string;
  url: string;
  theme: string | null;
  fetchedSource: "reliefweb";
}

export async function fetchReliefWeb(): Promise<{
  posts: ReliefWebReport[];
  error: string | null;
}> {
  try {
    const url =
      "https://api.reliefweb.int/v1/reports?appname=zerogeist&filter[field]=country.name&filter[value]=South Africa&limit=20&sort[]=date:desc&fields[include][]=title&fields[include][]=body&fields[include][]=date.original&fields[include][]=source.name&fields[include][]=url&fields[include][]=theme.name";

    const res = await fetch(url);

    if (!res.ok) {
      return { posts: [], error: `ReliefWeb API returned ${res.status}` };
    }

    const data = await res.json();
    const reports: ReliefWebReport[] = (data.data || []).map((item: any) => {
      const fields = item.fields || {};
      return {
        title: fields.title || "",
        body: (fields.body || "").slice(0, 3000),
        date: fields["date"]?.original || "",
        source: Array.isArray(fields.source)
          ? fields.source.map((s: any) => s.name).join(", ")
          : "",
        url: fields.url || `https://reliefweb.int/node/${item.id}`,
        theme: Array.isArray(fields.theme)
          ? fields.theme.map((t: any) => t.name).join(", ")
          : null,
        fetchedSource: "reliefweb" as const,
      };
    });

    return { posts: reports, error: null };
  } catch (err: any) {
    return { posts: [], error: `ReliefWeb fetch failed: ${err.message}` };
  }
}
