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
}

const SOURCE_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  reddit: { label: "r/", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  twitter: { label: "x/", color: "#a0a0a0", bg: "rgba(160,160,160,0.1)" },
  reliefweb: { label: "ReliefWeb", color: "#f97316", bg: "rgba(249,115,22,0.1)" },
  pmg: { label: "PMG", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
};

const EMOTION_COLORS: Record<string, string> = {
  anger: "#ef4444",
  hope: "#2dd4bf",
  fear: "#3b82f6",
  joy: "#f59e0b",
  grief: "#a855f7",
};

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

function formatEngagement(sourceType: string, engagement: any) {
  if (!engagement) return null;

  if (sourceType === "reddit") {
    return (
      <div className="flex gap-3 text-xs text-[var(--zg-muted)]">
        {engagement.score != null && <span>↑ {engagement.score.toLocaleString()}</span>}
        {engagement.comments != null && <span>💬 {engagement.comments}</span>}
      </div>
    );
  }

  if (sourceType === "twitter") {
    return (
      <div className="flex gap-3 text-xs text-[var(--zg-muted)]">
        {engagement.retweets > 0 && <span>🔄 {engagement.retweets.toLocaleString()}</span>}
        {engagement.likes > 0 && <span>❤️ {engagement.likes.toLocaleString()}</span>}
        {engagement.replies > 0 && <span>💬 {engagement.replies}</span>}
      </div>
    );
  }

  return null;
}

function getSourceLabel(post: Post): string {
  const style = SOURCE_STYLES[post.sourceType];
  if (post.sourceType === "reddit") {
    return `r/${post.metadata?.subreddit || "southafrica"}`;
  }
  if (post.sourceType === "twitter") {
    return `x/@${post.author || "unknown"}`;
  }
  if (post.sourceType === "pmg") {
    return `PMG — ${post.metadata?.committee || "Committee"}`;
  }
  return style?.label || post.sourceType;
}

export default function PostCard({ post }: { post: Post }) {
  const style = SOURCE_STYLES[post.sourceType] || SOURCE_STYLES.reddit;
  const older = isOlderThan24h(post.publishedAt);

  return (
    <div
      className={`bg-[var(--zg-surface)] border-l-3 rounded-r-lg p-4 space-y-2 transition-opacity ${older ? "opacity-50" : ""}`}
      style={{ borderLeftColor: EMOTION_COLORS[post.emotion] || "#666", borderLeftWidth: "3px" }}
    >
      {/* Header: source + time */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-medium px-2 py-0.5 rounded"
          style={{ color: style.color, backgroundColor: style.bg }}
        >
          {getSourceLabel(post)}
        </span>
        <div className="flex items-center gap-2">
          {older && (
            <span className="text-[10px] text-amber-500/70 uppercase">older</span>
          )}
          <span className="text-xs text-[var(--zg-muted)]">
            {timeAgo(post.publishedAt)}
          </span>
        </div>
      </div>

      {/* Title (Reddit/PMG) */}
      {post.title && (
        <p className="text-sm font-medium text-white">{post.title}</p>
      )}

      {/* Body */}
      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
        {post.body}
      </p>

      {/* Footer: engagement + link */}
      <div className="flex items-center justify-between pt-1">
        {formatEngagement(post.sourceType, post.engagement)}
        {post.url && (
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--zg-muted)] hover:text-[var(--zg-teal)] transition-colors"
          >
            view source →
          </a>
        )}
      </div>
    </div>
  );
}
