import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { EMOTION_COLORS } from "../lib/sankeyLayout";

// ─── Types ──────────────────────────────────────────────

export type Phase = "loading" | "splash" | "settling" | "ready";

interface Voice {
  text: string;
  emotion: string;
  source: string;
  time?: string;
}

interface DashboardHeaderProps {
  phase: Phase;
  provinceName: string;
  voice: Voice | null;
  isProvinceTransitioning: boolean;
  user: { name?: string; email?: string; avatar?: string | null } | null;
  isAdmin: boolean;
  onLogout: () => void;
}

// ─── Transition ─────────────────────────────────────────
// All movement uses transform (scale + translate) for GPU compositing.
// No font-size, width, height, margin, or gap changes — only transform + opacity + color.

const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
const T_MOVE = `1200ms ${EASE}`;
const T_COLOR = `1000ms ease`;
const T_FADE = `600ms ease`;

// ─── Component ──────────────────────────────────────────

export default function DashboardHeader({
  phase,
  provinceName,
  voice,
  isProvinceTransitioning,
  user,
  isAdmin,
  onLogout,
}: DashboardHeaderProps) {
  const big = phase === "loading" || phase === "splash";
  const dark = big;
  const settled = phase === "settling" || phase === "ready";
  const hasVoice = !!voice;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) close();
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  const emotionColor = voice ? EMOTION_COLORS[voice.emotion] || "#8A7860" : "#555";
  const initial = (user?.name || user?.email || "?")[0].toUpperCase();

  // ── Per-element transform maps ──
  // Everything is rendered at its FINAL (settled/small) size.
  // Big states use scale() to enlarge. This means no layout changes ever.

  const heroScale = big ? 1 : 1;
  const heroTop = big ? "50%" : "0px";
  const heroTranslateY = big ? "-50%" : "0";

  // Wordmark: final size 18px, scaled up ~1.65x for 30px equivalent
  const wordmarkScale = big ? 1.65 : 1;

  // Avatar: final size 22px, scaled up ~1.55x for 34px equivalent
  const avatarScale = big ? 1.55 : 1;
  const avatarOpacity = phase === "loading" ? 0.08 : 1;

  // Context (province name): final size 11px
  const contextScale = big ? 1.1 : 1;
  const contextOpacity = phase === "loading" ? 0 : 1;

  // Voice block: final compact size, scaled up and pushed down for splash
  const voiceScale = big ? 1.45 : 1;
  const voiceTranslateY = big ? 28 : 0; // extra gap from brand in splash
  const voiceOpacity = (phase === "loading" || !hasVoice)
    ? (phase === "loading" ? 1 : 0)
    : (isProvinceTransitioning ? 0 : 1);

  return (
    <>
      <style>{`
        @keyframes headerPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.85; }
        }
      `}</style>

      <div
        id="hero"
        style={{
          position: "fixed",
          left: "50%",
          top: heroTop,
          transform: `translate(-50%, ${heroTranslateY})`,
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "16px 0 12px",
          pointerEvents: "auto",
          width: "100%",
          maxWidth: 640,
          transition: `top ${T_MOVE}, transform ${T_MOVE}`,
        }}
      >
        {/* ── BRAND: wordmark + avatar ── */}
        <div
          id="brand"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            transform: `scale(${wordmarkScale})`,
            transformOrigin: "center center",
            transition: `transform ${T_MOVE}`,
            animation: phase === "loading" ? "headerPulse 2.5s ease-in-out infinite" : "none",
          }}
        >
          <h1
            id="wordmark"
            style={{
              fontSize: 18,
              fontWeight: 400,
              textTransform: "uppercase",
              letterSpacing: "0.25em",
              color: dark ? "#FFFFFF" : "#2C2418",
              margin: 0,
              lineHeight: 1,
              transition: `color ${T_COLOR}`,
            }}
          >
            ZEROGEIST
          </h1>

          {/* Avatar — always present, ghost during loading */}
          <div
            id="avatar"
            ref={menuRef}
            style={{
              transform: `scale(${avatarScale / wordmarkScale})`,
              transformOrigin: "center center",
              opacity: avatarOpacity,
              transition: `transform ${T_MOVE}, opacity ${T_FADE}`,
            }}
          >
            <button
              onClick={() => settled && setMenuOpen(!menuOpen)}
              style={{
                border: "none",
                background: "none",
                cursor: settled ? "pointer" : "default",
                padding: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt=""
                  referrerPolicy="no-referrer"
                  style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 600,
                    backgroundColor: dark ? "rgba(255,255,255,0.1)" : "#E8E0CC",
                    color: dark ? "rgba(255,255,255,0.6)" : "#5C5040",
                    transition: `background-color ${T_COLOR}, color ${T_COLOR}`,
                  }}
                >
                  {initial}
                </div>
              )}
            </button>
          </div>
        </div>

        {/* ── CONTEXT: province name ── */}
        <span
          id="context"
          style={{
            fontSize: 11,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: dark ? "rgba(255,255,255,0.3)" : "#8A7860",
            marginTop: 6,
            transform: `scale(${contextScale})`,
            transformOrigin: "center center",
            opacity: contextOpacity,
            transition: `transform ${T_MOVE}, opacity ${T_FADE} 200ms, color ${T_COLOR}`,
          }}
        >
          {provinceName}
        </span>

        {/* ── VOICE: accent + quote + attribution ── */}
        <div
          id="voice"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 12,
            maxWidth: 520,
            width: "100%",
            padding: "0 24px",
            pointerEvents: "none",
            transform: `scale(${voiceScale}) translateY(${voiceTranslateY}px)`,
            transformOrigin: "center top",
            opacity: voiceOpacity,
            transition: isProvinceTransitioning
              ? "opacity 200ms ease"
              : `transform ${T_MOVE}, opacity ${T_FADE} 400ms`,
          }}
        >
          {/* Accent line */}
          <div
            id="voice-accent"
            style={{
              width: 24,
              height: 2,
              backgroundColor: emotionColor,
              borderRadius: 1,
              marginBottom: 6,
              opacity: (phase === "loading" || !hasVoice) ? 0 : (dark ? 0.5 : 1),
              transition: `opacity ${T_FADE}, background-color ${T_COLOR}`,
            }}
          />

          {/* Quote — grid overlay for crossfade, no position swaps */}
          {/* Fixed minHeight prevents layout shift when text content changes */}
          <div style={{ display: "grid", width: "100%", minHeight: 40 }}>
            {/* Placeholder — same grid cell as quote */}
            <p
              id="voice-placeholder"
              style={{
                gridArea: "1 / 1",
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontStyle: "italic",
                fontSize: 13,
                lineHeight: 1.5,
                color: "rgba(255,255,255,0.12)",
                margin: 0,
                textAlign: "center",
                opacity: hasVoice ? 0 : 1,
                transition: `opacity 800ms ease`,
                pointerEvents: "none",
              }}
            >
              Reading the field{"\u2026"}
            </p>

            {/* Real quote — same grid cell, crossfades in */}
            <p
              id="voice-quote"
              style={{
                gridArea: "1 / 1",
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontStyle: "italic",
                fontSize: 13,
                lineHeight: 1.5,
                color: dark ? "rgba(255,255,255,0.52)" : "#5C5040",
                margin: 0,
                textAlign: "center",
                opacity: hasVoice ? 1 : 0,
                transition: `color ${T_COLOR}, opacity 800ms ease 300ms`,
                ...(settled ? {
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical" as const,
                  overflow: "hidden",
                } : {}),
              }}
            >
              {voice ? `\u201C${voice.text}\u201D` : "\u00A0"}
            </p>
          </div>

          {/* Attribution */}
          <p
            id="voice-attr"
            style={{
              fontSize: 9,
              fontWeight: 500,
              color: dark ? "rgba(255,255,255,0.15)" : "#B0A090",
              margin: "3px 0 0",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              opacity: hasVoice ? 1 : 0,
              transition: `opacity ${T_FADE} 300ms, color ${T_COLOR}`,
            }}
          >
            {voice?.source || "\u00A0"}
            {voice?.time ? ` · ${voice.time}` : ""}
          </p>
        </div>
      </div>

      {/* ═══ User menu dropdown — rendered outside all transforms ═══ */}
      {menuOpen && settled && (
        <>
          {/* Backdrop to close */}
          <div
            onClick={() => setMenuOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 99 }}
          />
          <div
            style={{
              position: "fixed",
              top: 48,
              left: "50%",
              transform: "translateX(calc(-50% + 60px))",
              width: 200,
              borderRadius: 8,
              backgroundColor: "#FFFFFF",
              border: "1px solid #DDD5C0",
              boxShadow: "0 4px 16px rgba(44,36,24,0.1)",
              zIndex: 100,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #EDE8D8" }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: "#2C2418", margin: 0 }}>{user?.name || "User"}</p>
              <p style={{ fontSize: 11, color: "#8A7860", margin: "2px 0 0" }}>{user?.email || ""}</p>
            </div>
            <div style={{ padding: "4px 0" }}>
              {isAdmin && <MenuLink href="/admin" onClick={() => setMenuOpen(false)}>Admin</MenuLink>}
              <MenuLink href="/settings" onClick={() => setMenuOpen(false)}>Settings</MenuLink>
              <MenuLink href="/" onClick={() => setMenuOpen(false)}>Dashboard</MenuLink>
            </div>
            <div style={{ borderTop: "1px solid #EDE8D8" }}>
              <button
                onClick={() => { onLogout(); setMenuOpen(false); }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", fontSize: 13, color: "#963D0E", border: "none", background: "none", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#FAF7F0"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ─── Menu link ──────────────────────────────────────────

function MenuLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href} onClick={onClick}
      style={{ display: "block", padding: "8px 14px", fontSize: 13, color: "#3A3020", textDecoration: "none" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#FAF7F0"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
    >
      {children}
    </Link>
  );
}
