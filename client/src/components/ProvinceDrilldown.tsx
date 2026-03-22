import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import PostCard from "./PostCard";

type Emotion = "anger" | "hope" | "fear" | "joy" | "grief";

const EMOTION_COLORS: Record<Emotion, string> = {
  anger: "#ef4444",
  hope: "#2dd4bf",
  fear: "#3b82f6",
  joy: "#f59e0b",
  grief: "#a855f7",
};

interface Province {
  id: string;
  name: string;
  dominant_emotion: Emotion;
  emotions: Record<Emotion, number>;
  intensity: number;
  consensus: number;
  geist_reading: string;
  themes: { name: string; emotion: Emotion; intensity: number; posts: number; summary: string }[];
  voices: any[];
}

interface Props {
  province: Province;
  fieldState: string;
  onBack: () => void;
}

type SortMode = "engagement" | "newest" | "source";

export default function ProvinceDrilldown({ province, fieldState, onBack }: Props) {
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("engagement");

  // Fetch real posts for this province
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["province-posts", province.id],
    queryFn: () => apiRequest(`/api/posts/today?province=${province.id}`),
  });

  // Build themes from actual post summary data (not snapshot themes)
  const realThemes = (() => {
    const themeCounts = new Map<string, { posts: any[]; emotion: string }>();
    for (const p of posts) {
      for (const tag of (p.themes as string[] || [])) {
        const key = tag.toLowerCase();
        if (!themeCounts.has(key)) {
          themeCounts.set(key, { posts: [], emotion: p.emotion });
        }
        themeCounts.get(key)!.posts.push(p);
      }
    }
    return [...themeCounts.entries()]
      .map(([name, { posts: themePosts, emotion }]) => ({
        name,
        emotion: emotion as Emotion,
        posts: themePosts,
        count: themePosts.length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // top 10 themes
  })();

  function sortPosts(arr: any[]) {
    const sorted = [...arr];
    if (sortMode === "newest") {
      sorted.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
    } else if (sortMode === "source") {
      sorted.sort((a, b) => a.sourceType.localeCompare(b.sourceType));
    } else {
      sorted.sort((a, b) => {
        const engA = (a.engagement?.score || 0) + (a.engagement?.likes || 0) + (a.engagement?.retweets || 0) * 2;
        const engB = (b.engagement?.score || 0) + (b.engagement?.likes || 0) + (b.engagement?.retweets || 0) * 2;
        return engB - engA;
      });
    }
    return sorted;
  }

  // Count fresh posts (last 24h)
  const freshCount = posts.filter((p: any) => {
    if (!p.publishedAt) return true;
    return Date.now() - new Date(p.publishedAt).getTime() < 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="space-y-8">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-[var(--zg-muted)] hover:text-white text-sm transition-colors"
        >
          ← Back to map
        </button>
        <h2 className="text-lg font-medium">{province.name}</h2>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: EMOTION_COLORS[province.dominant_emotion] + "20",
            color: EMOTION_COLORS[province.dominant_emotion],
          }}
        >
          {province.dominant_emotion}
        </span>
      </div>

      {/* Narrative bridge — national context flowing into province */}
      <div className="space-y-3">
        <p className="text-xs text-[var(--zg-muted)] italic">{fieldState}</p>
        {!isLoading && posts.length === 0 ? (
          <div className="bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg p-8 text-center">
            <p className="text-[var(--zg-muted)]">No signal from {province.name} today.</p>
            <p className="text-xs text-[var(--zg-muted)] mt-2">This province had no posts in today's data collection.</p>
          </div>
        ) : (
          <>
            <p className="text-gray-300 italic text-lg">{province.geist_reading}</p>
            <p className="text-xs text-[var(--zg-muted)]">
              Based on {posts.length} posts{freshCount < posts.length ? ` (${freshCount} from today)` : ""}
            </p>
          </>
        )}
      </div>

      {/* Metrics — only show if we have posts */}
      {posts.length > 0 && <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg p-4">
          <p className="text-xs text-[var(--zg-muted)] mb-3">Emotional Breakdown</p>
          <div className="space-y-2">
            {Object.entries(province.emotions)
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .map(([emotion, value]) => (
                <div key={emotion} className="flex items-center gap-2">
                  <span className="text-xs w-10 text-[var(--zg-muted)]">{emotion}</span>
                  <div className="flex-1 bg-[var(--zg-dark)] rounded-full h-1.5">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(value as number) * 100}%`,
                        backgroundColor: EMOTION_COLORS[emotion as Emotion],
                      }}
                    />
                  </div>
                  <span className="text-xs text-[var(--zg-muted)] w-8 text-right">
                    {((value as number) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg p-4">
          <p className="text-xs text-[var(--zg-muted)] mb-3">Conversation Intensity</p>
          <div className="flex items-end gap-1 h-16">
            <div
              className="flex-1 rounded-t"
              style={{
                height: `${province.intensity * 100}%`,
                backgroundColor: province.intensity > 0.7 ? "#ef4444" : province.intensity > 0.4 ? "#f59e0b" : "#1e3a5f",
              }}
            />
          </div>
          <p className="text-center text-sm mt-2">{(province.intensity * 100).toFixed(0)}%</p>
        </div>

        <div className="bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg p-4">
          <p className="text-xs text-[var(--zg-muted)] mb-3">Consensus Level</p>
          <div className="flex items-end gap-1 h-16">
            <div
              className="flex-1 rounded-t"
              style={{
                height: `${province.consensus * 100}%`,
                backgroundColor: province.consensus > 0.7 ? "#2dd4bf" : province.consensus > 0.4 ? "#f59e0b" : "#ef4444",
              }}
            />
          </div>
          <p className="text-center text-sm mt-2">{(province.consensus * 100).toFixed(0)}%</p>
        </div>
      </div>

      }

      {/* Sort controls + themes — only if posts exist */}
      {posts.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-xs tracking-widest uppercase text-[var(--zg-muted)]">
              What people are saying
            </h3>
            <div className="flex gap-1">
              {(["engagement", "newest", "source"] as SortMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSortMode(mode)}
                  className={`text-[10px] px-2 py-1 rounded transition-colors ${
                    sortMode === mode
                      ? "bg-[var(--zg-teal)]/20 text-[var(--zg-teal)]"
                      : "text-[var(--zg-muted)] hover:text-white"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {realThemes.map((theme) => {
              const isExpanded = expandedTheme === theme.name;
              const sorted = sortPosts(theme.posts);

              return (
                <div key={theme.name}>
                  <button
                    onClick={() => setExpandedTheme(isExpanded ? null : theme.name)}
                    className="w-full text-left bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg p-4 hover:border-[var(--zg-teal)]/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm">{isExpanded ? "▼" : "▶"}</span>
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: EMOTION_COLORS[theme.emotion] }}
                        />
                        <span className="text-sm font-medium capitalize">{theme.name}</span>
                      </div>
                      <span className="text-xs text-[var(--zg-muted)]">
                        {theme.count} {theme.count === 1 ? "post" : "posts"}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-2 ml-4 space-y-2">
                      {sorted.map((post: any) => (
                        <PostCard key={post.id} post={post} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
