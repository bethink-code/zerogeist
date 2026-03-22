import { useState, useEffect } from "react";

type Emotion = "anger" | "hope" | "fear" | "joy" | "grief";

interface Province {
  id: string;
  name: string;
  dominant_emotion: Emotion;
  emotions: Record<Emotion, number>;
  intensity: number;
  consensus: number;
  weather_description: string;
  themes: any[];
  voices: any[];
}

interface Props {
  provinces: Province[];
  nationalEmotion: Record<Emotion, number>;
  nationalIntensity: number;
  nationalConsensus: number;
  postCounts?: Record<string, number>;
  focusedProvince?: string | null;
  onSelectProvince: (province: Province) => void;
  onSelectNational: () => void;
}

const EMOTION_COLORS: Record<Emotion, string> = {
  anger: "#ef4444",
  hope: "#2dd4bf",
  fear: "#3b82f6",
  joy: "#f59e0b",
  grief: "#a855f7",
};

// Province hotspot positions (from provincePaths labelX/labelY, normalized to 0-1)
const HOTSPOT_POSITIONS: Record<string, { x: number; y: number }> = {
  LP: { x: 0.747, y: 0.262 },
  MP: { x: 0.821, y: 0.411 },
  GP: { x: 0.736, y: 0.396 },
  NW: { x: 0.574, y: 0.409 },
  FS: { x: 0.704, y: 0.531 },
  KZN: { x: 0.862, y: 0.573 },
  NC: { x: 0.277, y: 0.566 },
  EC: { x: 0.700, y: 0.726 },
  WC: { x: 0.262, y: 0.820 },
};

function getDominantEmotion(emotions: Record<Emotion, number>): Emotion {
  return Object.entries(emotions).sort((a, b) => b[1] - a[1])[0][0] as Emotion;
}

export default function GeistField({
  provinces,
  nationalEmotion,
  nationalIntensity,
  postCounts,
  focusedProvince,
  onSelectProvince,
  onSelectNational,
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 100);
    return () => clearTimeout(t);
  }, []);

  const provinceMap = new Map(provinces.map((p) => [p.id, p]));
  const nationalDominant = getDominantEmotion(nationalEmotion);
  const nationalColor = EMOTION_COLORS[nationalDominant];
  const hovered = hoveredId ? provinceMap.get(hoveredId) : null;
  const totalNationalPosts = postCounts?.national || 0;

  // Which provinces have data
  const activeProvinces = provinces.filter((p) => (postCounts?.[p.id] || 0) > 0);

  return (
    <div className="relative">
      <style>{`
        @keyframes fieldBreathe {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.75; transform: scale(1.02); }
        }
        @keyframes hotspotPulse {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.05); filter: brightness(1.15); }
        }
        @keyframes hotspotEnter {
          from { opacity: 0; transform: scale(0.3); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fieldFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .geist-field { animation: fieldFadeIn 1.5s ease-out; }
        .hotspot-blob { animation: hotspotEnter 0.6s ease-out forwards; }
        .hotspot-pulse { animation: hotspotPulse 4s ease-in-out infinite; }
        .field-breathe { animation: fieldBreathe 6s ease-in-out infinite; }
      `}</style>

      {/* The field — click background for national */}
      <div
        className="geist-field relative w-full rounded-2xl overflow-hidden cursor-pointer"
        style={{
          aspectRatio: "16/9",
          background: `radial-gradient(ellipse at 55% 45%, ${nationalColor}15 0%, ${nationalColor}08 40%, transparent 70%), #0a0a0a`,
        }}
        onClick={(e) => {
          // Only trigger if clicking the background, not a hotspot
          if ((e.target as HTMLElement).closest("[data-hotspot]")) return;
          onSelectNational();
        }}
      >
        {/* National field glow — breathes */}
        <div
          className="field-breathe absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 55% 45%, ${nationalColor}20 0%, transparent 60%)`,
          }}
        />

        {/* Province hotspots */}
        {activeProvinces.map((province, i) => {
          const pos = HOTSPOT_POSITIONS[province.id];
          if (!pos) return null;

          const count = postCounts?.[province.id] || 0;
          const color = EMOTION_COLORS[province.dominant_emotion];
          const radius = Math.max(40, Math.min(100, count * 2.5));
          const isHovered = hoveredId === province.id;
          const isFocused = focusedProvince === province.id;

          return (
            <div
              key={province.id}
              data-hotspot
              className={`absolute cursor-pointer hotspot-blob ${entered ? "hotspot-pulse" : ""}`}
              style={{
                left: `${pos.x * 100}%`,
                top: `${pos.y * 100}%`,
                transform: `translate(-50%, -50%) ${isHovered ? "scale(1.15)" : "scale(1)"}`,
                transition: "transform 0.3s ease",
                animationDelay: `${i * 0.1}s, ${i * 0.5}s`,
                zIndex: isHovered ? 10 : 1,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectProvince(province);
              }}
              onMouseEnter={() => setHoveredId(province.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Outer glow */}
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: `${radius * 2}px`,
                  height: `${radius * 2}px`,
                  left: `${-radius}px`,
                  top: `${-radius}px`,
                  background: `radial-gradient(circle, ${color}40 0%, ${color}15 50%, transparent 70%)`,
                  filter: `blur(${radius * 0.3}px)`,
                }}
              />

              {/* Core */}
              <div
                className="absolute rounded-full"
                style={{
                  width: `${radius * 0.6}px`,
                  height: `${radius * 0.6}px`,
                  left: `${-radius * 0.3}px`,
                  top: `${-radius * 0.3}px`,
                  background: `radial-gradient(circle, ${color}90 0%, ${color}50 60%, transparent 100%)`,
                  filter: `blur(${radius * 0.15}px)`,
                }}
              />

              {/* Label */}
              <div
                className="absolute whitespace-nowrap pointer-events-none"
                style={{
                  left: "0",
                  top: `${radius * 0.4}px`,
                  transform: "translateX(-50%)",
                }}
              >
                <span
                  className="text-white text-xs font-medium"
                  style={{
                    textShadow: "0 1px 6px rgba(0,0,0,0.9)",
                    fontSize: `${Math.max(10, Math.min(14, count * 0.4 + 8))}px`,
                    opacity: isHovered ? 1 : 0.7,
                    transition: "opacity 0.2s",
                  }}
                >
                  {province.id}
                </span>
                {isHovered && (
                  <span className="block text-[10px] text-[var(--zg-muted)]" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>
                    {count} posts
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Hover tooltip */}
        {hovered && (
          <div
            className="absolute bg-[var(--zg-surface)]/95 backdrop-blur-sm border border-[var(--zg-border)] rounded-lg p-3 max-w-xs pointer-events-none z-20"
            style={{
              left: `${(HOTSPOT_POSITIONS[hoveredId!]?.x || 0.5) * 100}%`,
              top: `${Math.max(0, (HOTSPOT_POSITIONS[hoveredId!]?.y || 0.5) - 0.15) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            <p className="text-sm font-medium">{hovered.name}</p>
            <p className="text-xs text-[var(--zg-muted)] mt-1 italic">
              {hovered.weather_description}
            </p>
            <div className="flex gap-2 mt-2">
              {Object.entries(hovered.emotions)
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .slice(0, 3)
                .map(([emotion, value]) => (
                  <span key={emotion} className="text-[10px]" style={{ color: EMOTION_COLORS[emotion as Emotion] }}>
                    {emotion} {((value as number) * 100).toFixed(0)}%
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* National posts indicator */}
        {totalNationalPosts > 0 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-[var(--zg-muted)]">
            <span className="opacity-60">click field for </span>
            <span className="text-[var(--zg-teal)]">{totalNationalPosts} national posts</span>
          </div>
        )}
      </div>

      {/* National mood bar */}
      <div className="flex gap-4 justify-center text-xs text-[var(--zg-muted)] mt-3">
        <span>
          Intensity: <span className="text-white">{(nationalIntensity * 100).toFixed(0)}%</span>
        </span>
        <span>
          Dominant:{" "}
          <span style={{ color: nationalColor }}>{nationalDominant}</span>
        </span>
        <span>
          {activeProvinces.length}/9 provinces reporting
        </span>
      </div>
    </div>
  );
}
