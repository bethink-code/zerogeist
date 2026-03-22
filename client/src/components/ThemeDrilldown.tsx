type Emotion = "anger" | "hope" | "fear" | "joy" | "grief";

const EMOTION_COLORS: Record<Emotion, string> = {
  anger: "#ef4444",
  hope: "#2dd4bf",
  fear: "#3b82f6",
  joy: "#f59e0b",
  grief: "#a855f7",
};

interface Theme {
  name: string;
  emotion: Emotion;
  intensity: number;
  posts: number;
  summary: string;
}

interface Voice {
  text: string;
  emotion: Emotion;
  source: string;
}

interface Province {
  id: string;
  name: string;
  themes: Theme[];
  voices: Voice[];
}

interface Props {
  theme: Theme;
  provinces: Province[];
  onBack: () => void;
}

export default function ThemeDrilldown({ theme, provinces, onBack }: Props) {
  // Find which provinces mention this theme
  const relevantProvinces = provinces.filter((p) =>
    p.themes.some((t) => t.name === theme.name)
  );

  // Collect voices only from provinces that have this theme
  const relatedVoices: (Voice & { province: string })[] = [];
  for (const p of relevantProvinces) {
    for (const v of p.voices) {
      relatedVoices.push({ ...v, province: p.name });
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-[var(--zg-muted)] hover:text-white text-sm transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-lg font-medium">{theme.name}</h2>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: EMOTION_COLORS[theme.emotion] + "20",
            color: EMOTION_COLORS[theme.emotion],
          }}
        >
          {theme.emotion}
        </span>
      </div>

      {/* Summary */}
      <p className="text-gray-300">{theme.summary}</p>

      {/* Stats */}
      <div className="flex gap-6 text-sm">
        <div>
          <span className="text-[var(--zg-muted)]">Posts: </span>
          <span className="text-white">{theme.posts}</span>
        </div>
        <div>
          <span className="text-[var(--zg-muted)]">Intensity: </span>
          <span className="text-white">{(theme.intensity * 100).toFixed(0)}%</span>
        </div>
        <div>
          <span className="text-[var(--zg-muted)]">Provinces discussing: </span>
          <span className="text-white">{relevantProvinces.length}</span>
        </div>
      </div>

      {/* Provincial perspective */}
      {relevantProvinces.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs tracking-widest uppercase text-[var(--zg-muted)]">
            Across Provinces
          </h3>
          {relevantProvinces.map((p) => {
            const localTheme = p.themes.find((t) => t.name === theme.name)!;
            return (
              <div
                key={p.id}
                className="bg-[var(--zg-surface)] border border-[var(--zg-border)] rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-xs text-[var(--zg-muted)]">
                    {localTheme.posts} posts · {(localTheme.intensity * 100).toFixed(0)}% intensity
                  </span>
                </div>
                <p className="text-xs text-[var(--zg-muted)] mt-2">{localTheme.summary}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Voices */}
      {relatedVoices.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs tracking-widest uppercase text-[var(--zg-muted)]">
            Raw Voices
          </h3>
          {relatedVoices.slice(0, 8).map((voice, i) => (
            <div
              key={i}
              className="bg-[var(--zg-surface)] border-l-2 rounded-r-lg p-4"
              style={{ borderColor: EMOTION_COLORS[voice.emotion] }}
            >
              <p className="text-sm text-gray-300">{voice.text}</p>
              <p className="text-xs text-[var(--zg-muted)] mt-2">
                {voice.source} · {voice.province}
                {(voice as any).time && <span className="ml-1 opacity-60">· {(voice as any).time}</span>}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
