import { useState, useEffect } from "react";
import PROVINCE_PATHS from "./provincePaths";

type Layer = "emotion" | "intensity" | "consensus";
type Emotion = "anger" | "hope" | "fear" | "joy" | "grief";

interface Province {
  id: string;
  name: string;
  dominant_emotion: Emotion;
  emotions: Record<Emotion, number>;
  intensity: number;
  consensus: number;
  weather_description: string;
  themes: { name: string; emotion: Emotion; intensity: number; posts: number; summary: string }[];
  voices: { text: string; emotion: Emotion; source: string }[];
}

interface Props {
  provinces: Province[];
  nationalEmotion: Record<Emotion, number>;
  nationalIntensity: number;
  nationalConsensus: number;
  postCounts?: Record<string, number>;
  onSelectProvince: (province: Province) => void;
  onSelectNational?: () => void;
}

const EMOTION_COLORS: Record<Emotion, string> = {
  anger: "#ef4444",
  hope: "#2dd4bf",
  fear: "#3b82f6",
  joy: "#f59e0b",
  grief: "#a855f7",
};

const EMOTION_LABELS: Record<Emotion, string> = {
  anger: "Anger",
  hope: "Hope",
  fear: "Fear",
  joy: "Joy",
  grief: "Grief",
};

function getProvinceColor(province: Province, layer: Layer): string {
  switch (layer) {
    case "emotion":
      return EMOTION_COLORS[province.dominant_emotion] || "#666";
    case "intensity": {
      const i = province.intensity;
      if (i > 0.7) return "#ef4444";
      if (i > 0.4) return "#f59e0b";
      return "#1e3a5f";
    }
    case "consensus": {
      const c = province.consensus;
      if (c > 0.7) return "#2dd4bf";
      if (c > 0.4) return "#f59e0b";
      return "#ef4444";
    }
  }
}

function getOpacity(province: Province, layer: Layer): number {
  switch (layer) {
    case "emotion": return 0.7 + province.emotions[province.dominant_emotion] * 0.3;
    case "intensity": return 0.5 + province.intensity * 0.5;
    case "consensus": return 0.5 + province.consensus * 0.5;
  }
}

// Province SVG paths imported from provincePaths.ts (real GADM boundaries)

// Stagger order for entrance animation (north to south)
const ENTRANCE_ORDER = ["LP", "MP", "GP", "NW", "KZN", "FS", "NC", "EC", "WC"];

export default function WeatherMap({ provinces, nationalEmotion, nationalIntensity, nationalConsensus, postCounts, onSelectProvince, onSelectNational }: Props) {
  const [layer, setLayer] = useState<Layer>("emotion");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const [visibleProvinces, setVisibleProvinces] = useState<Set<string>>(new Set());

  const provinceMap = new Map(provinces.map((p) => [p.id, p]));
  const hovered = hoveredId ? provinceMap.get(hoveredId) : null;

  // Staggered entrance animation
  useEffect(() => {
    if (entered) return;
    ENTRANCE_ORDER.forEach((id, i) => {
      setTimeout(() => {
        setVisibleProvinces((prev) => new Set([...prev, id]));
      }, 80 * i);
    });
    setTimeout(() => setEntered(true), 80 * ENTRANCE_ORDER.length + 200);
  }, [entered]);

  // Subtle breathing pulse for high-intensity provinces
  const getPulseAnimation = (province: Province): string => {
    if (!entered) return "";
    if (layer === "intensity" && province.intensity > 0.7) return "animate-pulse-subtle";
    if (layer === "emotion" && province.emotions[province.dominant_emotion] > 0.7) return "animate-pulse-subtle";
    return "";
  };

  return (
    <div className="space-y-4">
      {/* Inline keyframes */}
      <style>{`
        @keyframes provinceEnter {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulseSubtle {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.2); }
        }
        .animate-province-enter {
          animation: provinceEnter 0.4s ease-out forwards;
        }
        .animate-pulse-subtle {
          animation: pulseSubtle 3s ease-in-out infinite;
        }
        @keyframes tooltipIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-tooltip {
          animation: tooltipIn 0.15s ease-out;
        }
        @keyframes barGrow {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
        .animate-bar-grow {
          animation: barGrow 0.3s ease-out forwards;
          transform-origin: bottom;
        }
      `}</style>

      {/* Layer toggle */}
      <div className="flex gap-2">
        {([
          { key: "emotion", label: "Emotional Tone" },
          { key: "intensity", label: "Topic Intensity" },
          { key: "consensus", label: "Consensus / Division" },
        ] as { key: Layer; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setLayer(key)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all duration-300 ${
              layer === key
                ? "bg-[var(--zg-teal)] text-[var(--zg-dark)] font-medium shadow-lg shadow-[var(--zg-teal)]/20"
                : "bg-[var(--zg-surface)] text-[var(--zg-muted)] hover:text-white border border-[var(--zg-border)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-[var(--zg-muted)]">
        {layer === "emotion" && (
          Object.entries(EMOTION_COLORS).map(([emotion, color]) => (
            <span key={emotion} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full transition-all duration-500"
                style={{ backgroundColor: color }}
              />
              {EMOTION_LABELS[emotion as Emotion]}
            </span>
          ))
        )}
        {layer === "intensity" && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> High
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Moderate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#1e3a5f" }} /> Quiet
            </span>
          </>
        )}
        {layer === "consensus" && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400" /> Consensus
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Contested
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Deep Division
            </span>
          </>
        )}
      </div>

      {/* Map */}
      <div className="relative">
        <svg
          viewBox="0 0 470 470"
          className="w-full max-w-2xl mx-auto"
          style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.3))" }}
        >
          {/* Glow definitions */}
          <defs>
            {Object.entries(EMOTION_COLORS).map(([emotion, color]) => (
              <filter key={emotion} id={`glow-${emotion}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feFlood floodColor={color} floodOpacity="0.3" />
                <feComposite in2="blur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            ))}
          </defs>

          {Object.entries(PROVINCE_PATHS).map(([id, { d, labelX, labelY }]) => {
            const province = provinceMap.get(id);
            if (!province) return null;

            const hasData = (postCounts?.[id] || 0) > 0;
            const color = hasData ? getProvinceColor(province, layer) : "#333";
            const opacity = hasData ? getOpacity(province, layer) : 0.3;
            const isHovered = hoveredId === id;
            const isVisible = visibleProvinces.has(id);

            return (
              <g
                key={id}
                className={`cursor-pointer ${isVisible ? "animate-province-enter" : "opacity-0"} ${getPulseAnimation(province)}`}
                onClick={() => onSelectProvince(province)}
                onMouseEnter={() => setHoveredId(id)}
                onMouseLeave={() => setHoveredId(null)}
                filter={isHovered && layer === "emotion" ? `url(#glow-${province.dominant_emotion})` : undefined}
              >
                <path
                  d={d}
                  fill={color}
                  fillOpacity={opacity}
                  stroke={isHovered ? "white" : "rgba(255,255,255,0.15)"}
                  strokeWidth={isHovered ? 2.5 : 1}
                  style={{
                    transition: "fill 0.6s ease, fill-opacity 0.6s ease, stroke 0.2s ease, stroke-width 0.2s ease",
                    transform: isHovered ? "scale(1.02)" : "scale(1)",
                    transformOrigin: `${labelX}px ${labelY}px`,
                  }}
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  fill="white"
                  fontSize={isHovered ? "13" : "11"}
                  fontWeight={isHovered ? "bold" : "normal"}
                  className="pointer-events-none select-none"
                  style={{
                    textShadow: "0 1px 4px rgba(0,0,0,0.9)",
                    transition: "font-size 0.2s ease",
                  }}
                >
                  {id}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hovered && (
          <div className="absolute top-2 right-2 bg-[var(--zg-surface)]/95 backdrop-blur-sm border border-[var(--zg-border)] rounded-lg p-3 max-w-xs animate-tooltip">
            <p className="text-sm font-medium">
              {hovered.name}
              <span className="text-xs text-[var(--zg-muted)] ml-2">
                {postCounts?.[hoveredId!] || 0} posts
              </span>
            </p>
            {(postCounts?.[hoveredId!] || 0) > 0 ? (
              <p className="text-xs text-[var(--zg-muted)] mt-1 italic">
                {hovered.weather_description}
              </p>
            ) : (
              <p className="text-xs text-[var(--zg-muted)] mt-1">No sources reporting today</p>
            )}
            {(postCounts?.[hoveredId!] || 0) > 0 && <div className="flex gap-3 mt-3 items-end h-8">
              {Object.entries(hovered.emotions).map(([emotion, value], i) => (
                <div key={emotion} className="text-center flex-1">
                  <div
                    className="w-2 rounded-full mx-auto animate-bar-grow"
                    style={{
                      height: `${Math.max(4, (value as number) * 28)}px`,
                      backgroundColor: EMOTION_COLORS[emotion as Emotion],
                      animationDelay: `${i * 50}ms`,
                    }}
                  />
                  <span className="text-[9px] text-[var(--zg-muted)] mt-1 block">
                    {emotion.slice(0, 3)}
                  </span>
                </div>
              ))}
            </div>}
          </div>
        )}
      </div>

      {/* National summary bar */}
      <div className="flex gap-4 justify-center text-xs text-[var(--zg-muted)]">
        <span>
          Intensity: <span className="text-white">{(nationalIntensity * 100).toFixed(0)}%</span>
        </span>
        <span>
          Consensus: <span className="text-white">{(nationalConsensus * 100).toFixed(0)}%</span>
        </span>
        <span>
          Dominant:{" "}
          <span style={{ color: EMOTION_COLORS[Object.entries(nationalEmotion).sort((a, b) => (b[1] as number) - (a[1] as number))[0][0] as Emotion] }}>
            {Object.entries(nationalEmotion).sort((a, b) => (b[1] as number) - (a[1] as number))[0][0]}
          </span>
        </span>
      </div>

      {/* National posts link */}
      {(postCounts?.national || 0) > 0 && onSelectNational && (
        <button
          onClick={onSelectNational}
          className="w-full bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg p-3 text-center hover:border-[var(--zg-teal)]/30 transition-colors"
        >
          <span className="text-xs text-[var(--zg-muted)]">
            {postCounts!.national} national posts not tied to a specific province
          </span>
          <span className="text-xs text-[var(--zg-teal)] ml-2">View →</span>
        </button>
      )}
    </div>
  );
}
