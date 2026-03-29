import { EMOTION_COLORS } from "../lib/sankeyLayout";

type Emotion = "anger" | "hope" | "fear" | "joy" | "grief";

interface Province {
  id: string;
  name: string;
  dominant_emotion: Emotion;
  emotions: Record<Emotion, number>;
}

interface ProvinceNavProps {
  provinces: Province[];
  activeProvinceId: string;
  postCounts: Record<string, number>;
  onSelect: (provinceId: string) => void;
}

// Geographic west-to-east ordering, SA first
const PROVINCE_ORDER = ["SA", "WC", "NC", "EC", "FS", "NW", "GP", "MP", "LP", "KZN"];

const PROVINCE_NAMES: Record<string, string> = {
  SA: "SA",
  WC: "WC",
  NC: "NC",
  EC: "EC",
  FS: "FS",
  NW: "NW",
  GP: "GP",
  MP: "MP",
  LP: "LP",
  KZN: "KZN",
};

export default function ProvinceNav({
  provinces,
  activeProvinceId,
  postCounts,
  onSelect,
}: ProvinceNavProps) {
  const provinceMap = new Map(provinces.map((p) => [p.id, p]));

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 52,
        backgroundColor: "#F5F1E8",
        borderTop: "1px solid #DDD5C0",
        display: "flex",
        zIndex: 50,
      }}
    >
      {PROVINCE_ORDER.map((code) => {
        const province = provinceMap.get(code);
        const isActive = activeProvinceId === code;
        const count = postCounts[code] || 0;
        const isSA = code === "SA";
        const disabled = !isSA && count === 0;

        // For SA, compute dominant from all provinces
        let dominantEmotion: Emotion = "anger";
        let dominantScore = 0;

        if (isSA) {
          const totals: Record<string, number> = {};
          for (const p of provinces) {
            for (const [em, val] of Object.entries(p.emotions)) {
              totals[em] = (totals[em] || 0) + (val as number);
            }
          }
          for (const [em, val] of Object.entries(totals)) {
            if (val > dominantScore) {
              dominantScore = val;
              dominantEmotion = em as Emotion;
            }
          }
        } else if (province) {
          dominantEmotion = province.dominant_emotion;
          dominantScore = province.emotions[dominantEmotion] || 0;
        }

        const emotionColor = EMOTION_COLORS[dominantEmotion] || "#8A7860";
        const scoreText = isSA
          ? "nat"
          : disabled
          ? "--"
          : `${Math.round((dominantScore || 0) * 100)}`;

        return (
          <button
            key={code}
            onClick={() => !disabled && onSelect(code)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              border: "none",
              borderRight: code !== "KZN" ? "0.5px solid rgba(221,213,192,0.6)" : "none",
              background: isActive
                ? hexToRgba(emotionColor, 0.08)
                : "transparent",
              borderBottom: isActive
                ? `2px solid ${hexToRgba(emotionColor, 0.8)}`
                : "2px solid transparent",
              cursor: disabled ? "default" : "pointer",
              padding: "4px 0 2px",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!disabled && !isActive) {
                e.currentTarget.style.backgroundColor = "#EDE8D8";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: isActive
                  ? emotionColor
                  : disabled
                  ? "#B0A090"
                  : "#2C2418",
                lineHeight: 1,
              }}
            >
              {PROVINCE_NAMES[code]}
            </span>
            {/* Emotion dot — always visible, shows dominant emotion at a glance */}
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: disabled ? "#DDD5C0" : emotionColor,
                opacity: disabled ? 0.4 : 0.85,
                margin: "3px 0 1px",
                transition: "background-color 0.3s",
              }}
            />
            <span
              style={{
                fontSize: 9,
                fontWeight: 400,
                color: disabled
                  ? "#B0A090"
                  : isActive
                  ? emotionColor
                  : "#8A7860",
                lineHeight: 1,
              }}
            >
              {scoreText}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
