// PostCard — compact card for masonry layout, with optional dark surface mode

interface Post {
  id: string;
  title: string | null;
  body: string;
  author: string | null;
  url: string | null;
  sourceType: string;
  publishedAt: string | null;
  engagement: any;
  metadata: any;
  emotion: string;
  themes: string[];
  intensity?: number;
  signalStrength?: number;
  voiceWorthy?: boolean;
  voiceText?: string | null;
  voiceAttribution?: string | null;
}

interface PostCardProps {
  post: Post;
  compact?: boolean;
  darkSurface?: boolean;
  onReadMore?: (post: Post) => void;
}

// ─── Light surface styles ───────────────────────────────

const SOURCE_STYLES_LIGHT: Record<string, { label: string; color: string; bg: string }> = {
  reddit: { label: "r/", color: "#8C7B6B", bg: "#EDE8D8" },
  twitter: { label: "x/", color: "#8A7860", bg: "#EDE8D8" },
  reliefweb: { label: "ReliefWeb", color: "#6B7C8C", bg: "#E8EDF0" },
  pmg: { label: "PMG", color: "#7B8B7B", bg: "#EAF0EA" },
};

// ─── Dark surface styles ────────────────────────────────

const SOURCE_STYLES_DARK: Record<string, { label: string; color: string; bg: string; border: string }> = {
  reddit: { label: "r/", color: "#B0A090", bg: "rgba(140,123,107,0.15)", border: "rgba(140,123,107,0.12)" },
  twitter: { label: "x/", color: "#A89880", bg: "rgba(138,120,96,0.15)", border: "rgba(138,120,96,0.12)" },
  reliefweb: { label: "ReliefWeb", color: "#8CA0B0", bg: "rgba(107,124,140,0.15)", border: "rgba(107,124,140,0.12)" },
  pmg: { label: "PMG", color: "#98B090", bg: "rgba(123,139,123,0.15)", border: "rgba(123,139,123,0.12)" },
};

const EMOTION_COLORS: Record<string, string> = {
  anger: "#C85A1A",
  hope: "#7A9E68",
  fear: "#3E7BBF",
  joy: "#D4A827",
  grief: "#6A5278",
};

// Lightened for dark backgrounds
const EMOTION_COLORS_DARK: Record<string, string> = {
  anger: "#E07030",
  hope: "#96BE80",
  fear: "#5A9ADF",
  joy: "#E8C040",
  grief: "#9070A0",
};

// ─── Helpers ────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function isOlderThan24h(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return Date.now() - new Date(dateStr).getTime() > 24 * 60 * 60 * 1000;
}

function getSourceLabel(post: Post): string {
  if (post.sourceType === "reddit") return `r/${post.metadata?.subreddit || "southafrica"}`;
  if (post.sourceType === "twitter") return `x/@${post.author || "unknown"}`;
  if (post.sourceType === "pmg") return `PMG — ${post.metadata?.committee || "Committee"}`;
  return SOURCE_STYLES_LIGHT[post.sourceType]?.label || post.sourceType;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Component ──────────────────────────────────────────

export default function PostCard({ post, compact, darkSurface, onReadMore }: PostCardProps) {
  const dark = !!darkSurface;
  const cleanBody = stripHtml(post.body);
  const shouldTruncate = compact && cleanBody.length > 200;
  const older = isOlderThan24h(post.publishedAt);

  // ── Colors ──
  const emotionColor = dark
    ? EMOTION_COLORS_DARK[post.emotion] || "#9070A0"
    : EMOTION_COLORS[post.emotion] || "#8A7860";

  const sourceStyle = dark
    ? SOURCE_STYLES_DARK[post.sourceType] || SOURCE_STYLES_DARK.reddit
    : SOURCE_STYLES_LIGHT[post.sourceType] || SOURCE_STYLES_LIGHT.reddit;

  // ── Card surface — same for all cards ──
  const cardBg = dark ? "rgba(245,241,232,0.06)" : "#FFFFFF";
  const cardBorder = dark ? "1px solid rgba(221,213,192,0.10)" : "1px solid #DDD5C0";

  // ── Signal score (0-100) ──
  const signalPct = Math.round((post.signalStrength || 0) * 100);

  // ── Text colors ──
  const titleColor = dark ? "rgba(245,241,232,0.88)" : "#2C2418";
  const bodyColor = dark ? "rgba(245,241,232,0.65)" : "#3A3020";
  const mutedColor = dark ? "rgba(245,241,232,0.35)" : "#8A7860";
  const faintColor = dark ? "rgba(245,241,232,0.4)" : "#8A7860";

  return (
    <div
      style={{
        borderRadius: 8,
        padding: compact ? "12px 16px" : "16px",
        border: cardBorder,
        backgroundColor: cardBg,
        borderLeft: dark ? undefined : `3px solid ${EMOTION_COLORS[post.emotion] || "#8A7860"}`,
        opacity: older ? 0.55 : 1,
        transition: "background-color 150ms ease",
        breakInside: "avoid",
        WebkitColumnBreakInside: "avoid",
        display: "inline-block",
        width: "100%",
        marginBottom: 12,
      }}
      onMouseEnter={(e) => {
        if (dark) e.currentTarget.style.backgroundColor = "rgba(245,241,232,0.10)";
      }}
      onMouseLeave={(e) => {
        if (dark) e.currentTarget.style.backgroundColor = cardBg;
      }}
    >
      {/* Top row: source + emotion + date */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Source badge */}
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.03em",
              padding: "2px 8px",
              borderRadius: 4,
              color: sourceStyle.color,
              backgroundColor: sourceStyle.bg,
              border: dark ? `1px solid ${(sourceStyle as any).border || "transparent"}` : "none",
              textTransform: compact ? "uppercase" : "none",
            }}
          >
            {getSourceLabel(post)}
          </span>

          {/* Emotion pill */}
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              padding: "3px 10px",
              borderRadius: 4,
              backgroundColor: hexToRgba(emotionColor, dark ? 0.20 : 0.18),
              color: emotionColor,
              border: dark ? `1px solid ${hexToRgba(emotionColor, 0.15)}` : "none",
            }}
          >
            {post.emotion}
          </span>

          {/* Signal strength score */}
          {signalPct > 0 && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: 4,
                backgroundColor: dark
                  ? `rgba(245,241,232,${signalPct > 70 ? 0.12 : 0.06})`
                  : signalPct > 70 ? "#EDE8D8" : "#F5F1E8",
                color: dark
                  ? `rgba(245,241,232,${signalPct > 70 ? 0.7 : 0.35})`
                  : signalPct > 70 ? "#5C5040" : "#B0A090",
                letterSpacing: "0.02em",
              }}
              title={`Signal strength: ${signalPct}%`}
            >
              {signalPct}%
            </span>
          )}
        </div>

        {/* Date + older */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {older && (
            <span style={{ fontSize: 10, textTransform: "uppercase", color: dark ? "#E07030" : "#C85A1A" }}>
              older
            </span>
          )}
          <span style={{ fontSize: 10, color: mutedColor }}>
            {timeAgo(post.publishedAt)}
          </span>
        </div>
      </div>

      {/* Title */}
      {post.title && (
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: titleColor,
            margin: "6px 0 0",
            lineHeight: 1.45,
          }}
        >
          {post.title}
        </p>
      )}

      {/* Body */}
      <p
        className="whitespace-pre-line"
        style={{
          fontSize: dark ? 12.5 : 14,
          lineHeight: dark ? 1.55 : 1.5,
          color: bodyColor,
          margin: "4px 0 0",
          ...(shouldTruncate
            ? {
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical" as const,
                overflow: "hidden",
              }
            : {}),
        }}
      >
        {cleanBody}
      </p>

      {/* Voice quote block — Tier 1 only */}
      {dark && post.voiceWorthy && post.voiceText && (
        <div
          style={{
            marginTop: 8,
            padding: "10px 14px",
            borderLeft: `3px solid ${hexToRgba(emotionColor, 0.5)}`,
            backgroundColor: "rgba(245,241,232,0.04)",
            borderRadius: "0 6px 6px 0",
          }}
        >
          <p
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: "italic",
              fontSize: 13,
              lineHeight: 1.6,
              color: "rgba(245,241,232,0.75)",
              margin: 0,
            }}
          >
            &ldquo;{post.voiceText}&rdquo;
          </p>
          {post.voiceAttribution && (
            <p style={{ fontSize: 11, color: "rgba(245,241,232,0.4)", margin: "4px 0 0" }}>
              — {post.voiceAttribution}
            </p>
          )}
        </div>
      )}

      {/* Engagement stats */}
      {post.engagement && (
        <div style={{ display: "flex", gap: 10, fontSize: 11, fontWeight: 500, color: faintColor, marginTop: 6 }}>
          {post.sourceType === "reddit" && (
            <>
              {post.engagement.score != null && <span>▲ {post.engagement.score.toLocaleString()}</span>}
              {post.engagement.comments != null && <span>◆ {post.engagement.comments}</span>}
            </>
          )}
          {post.sourceType === "twitter" && (
            <>
              {post.engagement.retweets > 0 && <span>↻ {post.engagement.retweets.toLocaleString()}</span>}
              {post.engagement.likes > 0 && <span>♥ {post.engagement.likes.toLocaleString()}</span>}
              {post.engagement.replies > 0 && <span>◆ {post.engagement.replies}</span>}
            </>
          )}
        </div>
      )}

      {/* Actions — two distinct buttons */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 10,
          paddingTop: 10,
          borderTop: dark ? "1px solid rgba(221,213,192,0.06)" : "1px solid #EDE8D8",
        }}
      >
        {/* Read action */}
        {compact && cleanBody.length > 200 && onReadMore && (
          <button
            onClick={() => onReadMore(post)}
            style={{
              flex: 1,
              border: dark ? "1px solid rgba(221,213,192,0.12)" : "1px solid #DDD5C0",
              borderRadius: 5,
              background: dark ? "rgba(245,241,232,0.05)" : "#FAF7F0",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 500,
              color: dark ? "rgba(245,241,232,0.55)" : "#5C5040",
              padding: "6px 12px",
              transition: "all 150ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = dark ? "rgba(245,241,232,0.10)" : "#EDE8D8";
              e.currentTarget.style.color = dark ? "rgba(245,241,232,0.8)" : "#2C2418";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = dark ? "rgba(245,241,232,0.05)" : "#FAF7F0";
              e.currentTarget.style.color = dark ? "rgba(245,241,232,0.55)" : "#5C5040";
            }}
          >
            Read full post
          </button>
        )}

        {/* Visit source action */}
        {post.url && post.url.startsWith("http") && (
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: compact && cleanBody.length > 200 ? 1 : undefined,
              border: dark ? "1px solid rgba(221,213,192,0.12)" : "1px solid #DDD5C0",
              borderRadius: 5,
              background: "transparent",
              fontSize: 11,
              fontWeight: 500,
              color: dark ? "rgba(245,241,232,0.45)" : "#8A7860",
              padding: "6px 12px",
              textDecoration: "none",
              textAlign: "center",
              transition: "all 150ms",
              display: "block",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = dark ? "rgba(245,241,232,0.06)" : "#FAF7F0";
              e.currentTarget.style.color = dark ? "rgba(245,241,232,0.7)" : "#5C5040";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = dark ? "rgba(245,241,232,0.45)" : "#8A7860";
            }}
          >
            Visit source →
          </a>
        )}
      </div>
    </div>
  );
}
