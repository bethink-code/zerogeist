import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import PostCard from "./PostCard";
import type { Post } from "../lib/sankeyLayout";

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

const EMOTION_COLORS_DARK: Record<string, string> = {
  anger: "#E07030",
  hope: "#96BE80",
  fear: "#5A9ADF",
  joy: "#E8C040",
  grief: "#9070A0",
};

interface PostDrawerProps {
  isOpen: boolean;
  nodeId: string | null;
  nodeLabel: string;
  nodeColor: string;
  posts: Post[];
  onClose: () => void;
}

export default function PostDrawer({
  isOpen,
  nodeLabel,
  nodeColor,
  posts,
  onClose,
}: PostDrawerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [readingPost, setReadingPost] = useState<Post | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    if (!isOpen) {
      setReadingPost(null);
      setCurrentIndex(0);
    }
  }, [isOpen, nodeLabel]);

  // Clamp index when posts change
  useEffect(() => {
    if (currentIndex >= posts.length && posts.length > 0) {
      setCurrentIndex(posts.length - 1);
    }
  }, [posts.length, currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < posts.length - 1) setCurrentIndex((i) => i + 1);
  }, [currentIndex, posts.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

  const currentPost = posts[currentIndex] || null;

  // Sub-header summary
  const subHeader = useMemo(() => {
    if (!posts.length) return "";
    const sources = new Set(posts.map((p) => p.sourceType));
    const voiceCount = posts.filter((p) => p.voiceWorthy).length;
    const parts: string[] = [];
    parts.push(`${posts.length} ${posts.length === 1 ? "voice" : "voices"}`);
    if (sources.size > 1) parts.push(`across ${sources.size} sources`);
    if (voiceCount > 0) parts.push(`${voiceCount} voice-worthy`);
    return parts.join(" · ");
  }, [posts]);

  return (
    <>
      {/* Scrim — covers entire viewport including header */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(44, 36, 24, 0.45)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 350ms ease",
          zIndex: 35,
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          bottom: 52,
          left: 0,
          right: 0,
          height: "75vh",
          backgroundColor: "#3A3020",
          borderTop: "1px solid rgba(221, 213, 192, 0.15)",
          borderRadius: "12px 12px 0 0",
          transform: isOpen ? "translateY(0)" : "translateY(calc(100% + 52px))",
          transition: isOpen
            ? "transform 350ms cubic-bezier(0.32, 0, 0.15, 1)"
            : "transform 300ms ease-in",
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
          boxShadow: isOpen ? "0 -8px 40px rgba(44, 36, 24, 0.25)" : "none",
          overflow: "hidden",
        }}
      >
        {/* Accent bar — connects to Sankey node */}
        <div
          style={{
            height: 3,
            backgroundColor: nodeColor,
            opacity: 0.7,
            borderRadius: "12px 12px 0 0",
            flexShrink: 0,
          }}
        />

        {/* Drag handle */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "8px 0 4px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 32,
              height: 4,
              borderRadius: 2,
              backgroundColor: "rgba(221, 213, 192, 0.3)",
            }}
          />
        </div>

        {/* Header */}
        <div
          style={{
            padding: "0 20px 14px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(221, 213, 192, 0.12)",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span
                style={{
                  fontFamily: "'Nunito', sans-serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#F5F1E8",
                }}
              >
                {nodeLabel}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "rgba(245, 241, 232, 0.5)",
                }}
              >
                {posts.length} post{posts.length !== 1 ? "s" : ""}
              </span>
            </div>
            {subHeader && (
              <p
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontStyle: "italic",
                  fontSize: 13,
                  color: "rgba(245, 241, 232, 0.4)",
                  margin: "2px 0 0",
                }}
              >
                {subHeader}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              padding: "6px 10px",
              fontSize: 20,
              color: "rgba(245, 241, 232, 0.4)",
              lineHeight: 1,
              borderRadius: 6,
              transition: "color 150ms, background-color 150ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(245, 241, 232, 0.7)";
              e.currentTarget.style.backgroundColor = "rgba(245, 241, 232, 0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(245, 241, 232, 0.4)";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            ✕
          </button>
        </div>

        {/* Single post view — scrollable */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 20px 20px",
          }}
        >
          {posts.length === 0 ? (
            <p
              style={{
                color: "rgba(245, 241, 232, 0.4)",
                fontSize: 14,
                fontStyle: "italic",
                fontFamily: "Georgia, 'Times New Roman', serif",
                textAlign: "center",
                padding: "24px 0",
              }}
            >
              No voices in this stream yet.
            </p>
          ) : currentPost ? (
            <PostCard post={currentPost} darkSurface onReadMore={setReadingPost} />
          ) : null}
        </div>

        {/* Navigation bar — prev / counter / next */}
        {posts.length > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 16px 10px",
              borderTop: "1px solid rgba(221, 213, 192, 0.08)",
              flexShrink: 0,
            }}
          >
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "1px solid rgba(221,213,192,0.15)",
                backgroundColor: currentIndex === 0 ? "transparent" : "rgba(245,241,232,0.06)",
                color: currentIndex === 0 ? "rgba(245,241,232,0.15)" : "rgba(245,241,232,0.6)",
                cursor: currentIndex === 0 ? "default" : "pointer",
                fontSize: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 150ms",
              }}
            >
              ‹
            </button>

            <span style={{ fontSize: 12, color: "rgba(245,241,232,0.4)" }}>
              {currentIndex + 1} / {posts.length}
            </span>

            <button
              onClick={goNext}
              disabled={currentIndex >= posts.length - 1}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "1px solid rgba(221,213,192,0.15)",
                backgroundColor: currentIndex >= posts.length - 1 ? "transparent" : "rgba(245,241,232,0.06)",
                color: currentIndex >= posts.length - 1 ? "rgba(245,241,232,0.15)" : "rgba(245,241,232,0.6)",
                cursor: currentIndex >= posts.length - 1 ? "default" : "pointer",
                fontSize: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 150ms",
              }}
            >
              ›
            </button>
          </div>
        )}

        {/* ═══ Reading modal ═══ */}
        {readingPost && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            {/* Modal backdrop */}
            <div
              onClick={() => setReadingPost(null)}
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(30, 24, 16, 0.7)",
              }}
            />

            {/* Modal content */}
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 560,
                maxHeight: "100%",
                overflowY: "auto",
                backgroundColor: "#3A3020",
                border: "1px solid rgba(221, 213, 192, 0.18)",
                borderRadius: 10,
                padding: "20px 24px",
                boxShadow: "0 12px 48px rgba(0,0,0,0.3)",
              }}
            >
              {/* Close */}
              <button
                onClick={() => setReadingPost(null)}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 16,
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: 18,
                  color: "rgba(245, 241, 232, 0.4)",
                  lineHeight: 1,
                }}
              >
                ✕
              </button>

              {/* Source + emotion */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.03em",
                    padding: "2px 8px",
                    borderRadius: 4,
                    color: "#B0A090",
                    backgroundColor: "rgba(140,123,107,0.15)",
                    textTransform: "uppercase",
                  }}
                >
                  {readingPost.sourceType === "reddit"
                    ? `r/${readingPost.metadata?.subreddit || "southafrica"}`
                    : readingPost.sourceType === "pmg"
                    ? `PMG — ${readingPost.metadata?.committee || "Committee"}`
                    : readingPost.sourceType}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    padding: "3px 10px",
                    borderRadius: 4,
                    backgroundColor: `${EMOTION_COLORS_DARK[readingPost.emotion] || "#9070A0"}33`,
                    color: EMOTION_COLORS_DARK[readingPost.emotion] || "#9070A0",
                  }}
                >
                  {readingPost.emotion}
                </span>
              </div>

              {/* Title */}
              {readingPost.title && (
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "rgba(245, 241, 232, 0.9)",
                    margin: "0 0 10px",
                    lineHeight: 1.4,
                  }}
                >
                  {readingPost.title}
                </p>
              )}

              {/* Full body */}
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: "rgba(245, 241, 232, 0.7)",
                  margin: 0,
                  whiteSpace: "pre-line",
                }}
              >
                {stripHtml(readingPost.body)}
              </p>

              {/* Visit source */}
              {readingPost.url && readingPost.url.startsWith("http") && (
                <a
                  href={readingPost.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    marginTop: 16,
                    fontSize: 12,
                    fontWeight: 500,
                    color: "rgba(245, 241, 232, 0.5)",
                    textDecoration: "none",
                    padding: "6px 14px",
                    border: "1px solid rgba(221,213,192,0.15)",
                    borderRadius: 5,
                    transition: "all 150ms",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "rgba(245,241,232,0.8)";
                    e.currentTarget.style.backgroundColor = "rgba(245,241,232,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(245,241,232,0.5)";
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  Visit source →
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
