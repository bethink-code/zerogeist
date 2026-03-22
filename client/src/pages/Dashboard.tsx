import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { Link } from "wouter";
import { useQuery as usePostsQuery } from "@tanstack/react-query";
import GeistField from "../components/GeistField";
import ProvinceDrilldown from "../components/ProvinceDrilldown";
import PostCard from "../components/PostCard";

type DrilldownState =
  | { type: "map" }
  | { type: "province"; province: any }
  | { type: "national" };

export default function Dashboard() {
  const { user, isAdmin, logout } = useAuth();
  const [drilldown, setDrilldown] = useState<DrilldownState>({ type: "map" });

  const { data: worldData } = useQuery({
    queryKey: ["world-today"],
    queryFn: () => apiRequest("/api/world/today"),
  });

  const { data: questionData } = useQuery({
    queryKey: ["question-today"],
    queryFn: () => apiRequest("/api/question/today"),
  });

  const snapshot = worldData?.snapshot;
  const provinces = snapshot?.provinces || [];
  const postCounts = worldData?.postCounts || {};

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--zg-border)] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-bold tracking-[0.2em] uppercase">
            Zerogeist
          </h1>
          <span className="text-xs text-[var(--zg-teal)]">mzansi</span>
        </div>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <Link
              href="/admin"
              className="text-xs text-[var(--zg-muted)] hover:text-white transition-colors"
            >
              Admin
            </Link>
          )}
          <Link
            href="/settings"
            className="text-xs text-[var(--zg-muted)] hover:text-white transition-colors"
          >
            Settings
          </Link>
          <button
            onClick={() => logout()}
            className="text-xs text-[var(--zg-muted)] hover:text-white transition-colors"
          >
            Sign out
          </button>
          {user?.avatar && (
            <img
              src={user.avatar}
              alt=""
              className="w-7 h-7 rounded-full"
            />
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-16">
        {/* National Digest */}
        {snapshot?.nationalDigest ? (
          <section className="space-y-4">
            <h2 className="text-xs tracking-widest uppercase text-[var(--zg-muted)]">
              Today's Weather
            </h2>
            <p className="text-lg leading-relaxed text-gray-300">
              {worldData.personalised
                ? worldData.personalDigest || snapshot.nationalDigest
                : snapshot.nationalDigest}
            </p>
            <p className="text-xs text-[var(--zg-muted)] mt-2">
              {snapshot.date}
              {snapshot.totalPostsAnalysed > 0 && (
                <span> · {snapshot.totalPostsAnalysed} sources analysed</span>
              )}
              {snapshot.analysisCost > 0 && (
                <span> · ${snapshot.analysisCost.toFixed(4)}</span>
              )}
            </p>
          </section>
        ) : (
          <section className="space-y-4">
            <h2 className="text-xs tracking-widest uppercase text-[var(--zg-muted)]">
              Today's Weather
            </h2>
            <p className="text-[var(--zg-muted)] text-sm">
              The weather map is still being generated. Check back soon.
            </p>
          </section>
        )}

        {/* Mzansi Weather Map */}
        <section className="space-y-4">
          <h2 className="text-xs tracking-widest uppercase text-[var(--zg-muted)]">
            Mzansi
          </h2>

          {provinces.length > 0 ? (
            <div className="space-y-8">
              {/* The Geist field — shrinks when drilled in */}
              <div
                className="transition-all duration-500 overflow-hidden"
                style={{
                  height: drilldown.type === "map" ? "auto" : "120px",
                  opacity: drilldown.type === "map" ? 1 : 0.4,
                }}
              >
                <GeistField
                  provinces={provinces}
                  nationalEmotion={snapshot.nationalEmotion}
                  nationalIntensity={snapshot.nationalIntensity}
                  nationalConsensus={snapshot.nationalConsensus}
                  postCounts={postCounts}
                  focusedProvince={drilldown.type === "province" ? drilldown.province.id : null}
                  onSelectProvince={(p) => {
                    if ((postCounts[p.id] || 0) > 0) {
                      setDrilldown({ type: "province", province: p });
                    }
                  }}
                  onSelectNational={() => setDrilldown({ type: "national" })}
                />
              </div>

              {/* Drill-down content appears below the field */}
              {drilldown.type === "province" && (
                <ProvinceDrilldown
                  province={drilldown.province}
                  nationalDigest={snapshot.nationalDigest || ""}
                  onBack={() => setDrilldown({ type: "map" })}
                />
              )}

              {drilldown.type === "national" && (
                <NationalDrilldown
                  nationalDigest={snapshot.nationalDigest || ""}
                  onBack={() => setDrilldown({ type: "map" })}
                />
              )}
            </div>
          ) : (
            <div className="bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-xl p-12 text-center">
              <p className="text-[var(--zg-muted)] text-sm">
                No signal yet. The geist is silent.
              </p>
            </div>
          )}
        </section>

        {/* Daily Question */}
        <section className="space-y-6">
          <h2 className="text-xs tracking-widest uppercase text-[var(--zg-muted)]">
            Your Question
          </h2>
          {questionData ? (
            <DailyQuestion question={questionData} />
          ) : (
            <div className="bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-xl p-12 text-center">
              <p className="text-[var(--zg-muted)] text-sm">
                Your first question will appear after the daily cycle runs.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function NationalDrilldown({ nationalDigest, onBack }: { nationalDigest: string; onBack: () => void }) {
  const { data: posts = [], isLoading } = usePostsQuery({
    queryKey: ["national-posts"],
    queryFn: () => apiRequest("/api/posts/today?province=national"),
  });

  // Build themes from post summaries
  const themes = (() => {
    const counts = new Map<string, { posts: any[]; emotion: string }>();
    for (const p of posts) {
      for (const tag of (p.themes as string[] || [])) {
        const key = tag.toLowerCase();
        if (!counts.has(key)) counts.set(key, { posts: [], emotion: p.emotion });
        counts.get(key)!.posts.push(p);
      }
    }
    return [...counts.entries()]
      .map(([name, { posts: tp, emotion }]) => ({ name, emotion, posts: tp, count: tp.length }))
      .filter((t) => t.count >= 2) // only show themes with 2+ posts
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  })();

  // Posts not in any displayed theme
  const themedPostIds = new Set(themes.flatMap((t) => t.posts.map((p: any) => p.id)));
  const unthemed = posts.filter((p: any) => !themedPostIds.has(p.id));

  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-[var(--zg-muted)] hover:text-white text-sm transition-colors">
          ← Back to map
        </button>
        <h2 className="text-lg font-medium">National</h2>
        <span className="text-xs text-[var(--zg-muted)]">Posts not tied to a specific province</span>
      </div>

      <p className="text-xs text-[var(--zg-muted)] italic">{nationalDigest}</p>
      <p className="text-xs text-[var(--zg-muted)]">
        {posts.length} national posts
      </p>

      {isLoading ? (
        <p className="text-[var(--zg-muted)] text-sm animate-pulse">Loading...</p>
      ) : (
        <div className="space-y-2">
          {themes.map((theme) => {
            const isExpanded = expanded === theme.name;
            const sorted = [...theme.posts].sort((a: any, b: any) => {
              const engA = (a.engagement?.score || 0) + (a.engagement?.likes || 0) + (a.engagement?.retweets || 0) * 2;
              const engB = (b.engagement?.score || 0) + (b.engagement?.likes || 0) + (b.engagement?.retweets || 0) * 2;
              return engB - engA;
            });

            return (
              <div key={theme.name}>
                <button
                  onClick={() => setExpanded(isExpanded ? null : theme.name)}
                  className="w-full text-left bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg p-4 hover:border-[var(--zg-teal)]/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm">{isExpanded ? "▼" : "▶"}</span>
                      <span className="text-sm font-medium capitalize">{theme.name}</span>
                    </div>
                    <span className="text-xs text-[var(--zg-muted)]">{theme.count} posts</span>
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

          {/* Unthemed posts */}
          {unthemed.length > 0 && (() => {
            const isExpanded = expanded === "__other__";
            return (
              <div>
                <button
                  onClick={() => setExpanded(isExpanded ? null : "__other__")}
                  className="w-full text-left bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg p-4 hover:border-[var(--zg-teal)]/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm">{isExpanded ? "▼" : "▶"}</span>
                      <span className="text-sm font-medium text-[var(--zg-muted)]">Other posts</span>
                    </div>
                    <span className="text-xs text-[var(--zg-muted)]">{unthemed.length} posts</span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="mt-2 ml-4 space-y-2">
                    {unthemed.map((post: any) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <p className="text-xs text-[var(--zg-muted)] text-center pt-2">
            {posts.length} total posts · {themes.reduce((sum, t) => sum + t.count, 0)} in themes · {unthemed.length} other
          </p>
        </div>
      )}
    </div>
  );
}

function DailyQuestion({ question }: { question: any }) {
  if (question.answeredAt) {
    return (
      <div className="space-y-4">
        <p className="text-xl leading-relaxed">{question.text}</p>
        <div className="bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg p-6">
          <p className="text-sm text-[var(--zg-muted)] mb-2">Your answer</p>
          <p className="text-gray-300">{question.answerText}</p>
        </div>
        <p className="text-xs text-[var(--zg-muted)]">
          Received quietly. Your proxy is updating.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-2xl leading-relaxed font-light">{question.text}</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.target as HTMLFormElement;
          const textarea = form.querySelector("textarea") as HTMLTextAreaElement;
          const answer = textarea.value.trim();
          if (!answer) return;

          await apiRequest("/api/question/answer", {
            method: "POST",
            body: JSON.stringify({
              questionId: question.id,
              answerText: answer,
            }),
          });
          window.location.reload();
        }}
      >
        <textarea
          className="w-full bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg p-6 text-white resize-none focus:outline-none focus:border-[var(--zg-teal)] transition-colors min-h-[160px]"
          placeholder="Take your time..."
        />
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-[var(--zg-muted)]">
            You can return to this today if you need time to think.
          </p>
          <button
            type="submit"
            className="px-6 py-2 bg-[var(--zg-teal)] text-[var(--zg-dark)] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </form>
    </div>
  );
}
