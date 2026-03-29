import { EMOTION_COLORS } from "../lib/sankeyLayout";

interface Voice {
  text: string;
  emotion: string;
  source: string;
  time?: string;
}

interface VoiceElementProps {
  voice: Voice | null;
  isTransitioning: boolean;
}

export default function VoiceElement({
  voice,
  isTransitioning,
}: VoiceElementProps) {
  if (!voice) return null;

  const emotionColor = EMOTION_COLORS[voice.emotion] || "#8A7860";

  return (
    <div
      style={{
        position: "absolute",
        bottom: 10,
        left: 24,
        right: 24,
        maxWidth: 480,
        padding: "10px 14px",
        borderLeft: `2px solid ${hexToRgba(emotionColor, 0.4)}`,
        backgroundColor: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        borderRadius: "0 6px 6px 0",
        opacity: isTransitioning ? 0 : 1,
        transition: isTransitioning
          ? "opacity 200ms ease"
          : "opacity 1000ms ease",
        pointerEvents: "none",
        zIndex: 15,
      }}
    >
      <p
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontStyle: "italic",
          fontSize: 13,
          lineHeight: 1.6,
          color: "#5C5040",
          margin: 0,
        }}
      >
        &ldquo;{voice.text}&rdquo;
      </p>
      <p
        style={{
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 10,
          fontWeight: 500,
          color: "#8A7860",
          marginTop: 4,
          marginBottom: 0,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {voice.source}
        {voice.time ? ` · ${voice.time}` : ""}
      </p>
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
