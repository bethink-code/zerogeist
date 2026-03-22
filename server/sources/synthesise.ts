/**
 * Stage 3: Synthesise World Snapshot
 *
 * Reads structured post summaries (from Stage 2) and produces
 * the final world_snapshot with national digest, province weather,
 * themes, and voices.
 *
 * Uses Sonnet for creative synthesis — the heavy extraction
 * is already done by Haiku in Stage 2.
 */

import Anthropic from "@anthropic-ai/sdk";
import * as storage from "../storage.js";

const client = new Anthropic();

const PROVINCES = [
  { id: "GP", name: "Gauteng" },
  { id: "WC", name: "Western Cape" },
  { id: "KZN", name: "KwaZulu-Natal" },
  { id: "EC", name: "Eastern Cape" },
  { id: "FS", name: "Free State" },
  { id: "NW", name: "North West" },
  { id: "NC", name: "Northern Cape" },
  { id: "MP", name: "Mpumalanga" },
  { id: "LP", name: "Limpopo" },
];

type Emotion = "anger" | "hope" | "fear" | "joy" | "grief";

interface SummaryRow {
  provinceId: string;
  sourceType: string;
  themes: string[];
  emotion: Emotion;
  intensity: number;
  signalStrength: number;
  voiceWorthy: boolean;
  voiceText: string | null;
  voiceAttribution: string;
}

export interface WorldAnalysis {
  nationalDigest: string;
  nationalEmotion: Record<Emotion, number>;
  nationalIntensity: number;
  nationalConsensus: number;
  provinces: any[];
  totalPostsAnalysed: number;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Build a structured province digest from summaries for the synthesis prompt.
 */
function buildProvinceSummaries(summaries: SummaryRow[]): string {
  const byProvince = new Map<string, SummaryRow[]>();

  for (const s of summaries) {
    const key = s.provinceId;
    if (!byProvince.has(key)) byProvince.set(key, []);
    byProvince.get(key)!.push(s);
  }

  const sections: string[] = [];

  for (const { id, name } of PROVINCES) {
    const provinceSummaries = byProvince.get(id) || [];
    if (provinceSummaries.length === 0) {
      sections.push(`### ${name} (${id})\nNo direct data. Infer from national trends.`);
      continue;
    }

    // Emotion distribution
    const emotions: Record<Emotion, number> = { anger: 0, hope: 0, fear: 0, joy: 0, grief: 0 };
    for (const s of provinceSummaries) {
      emotions[s.emotion] = (emotions[s.emotion] || 0) + 1;
    }
    const total = provinceSummaries.length;
    const emotionPcts = Object.entries(emotions)
      .map(([e, count]) => `${e}: ${((count / total) * 100).toFixed(0)}%`)
      .join(", ");

    // Theme frequency
    const themeCounts = new Map<string, number>();
    for (const s of provinceSummaries) {
      for (const t of (s.themes as string[]) || []) {
        themeCounts.set(t, (themeCounts.get(t) || 0) + 1);
      }
    }
    const topThemes = [...themeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([theme, count]) => `"${theme}" (${count})`)
      .join(", ");

    // Source mix
    const sourceCounts = new Map<string, number>();
    for (const s of provinceSummaries) {
      sourceCounts.set(s.sourceType, (sourceCounts.get(s.sourceType) || 0) + 1);
    }
    const sourceMix = [...sourceCounts.entries()]
      .map(([type, count]) => `${type}: ${count}`)
      .join(", ");

    // Avg intensity
    const avgIntensity = provinceSummaries.reduce((sum, s) => sum + s.intensity, 0) / total;

    // Top voices (sorted by signal strength)
    const voices = provinceSummaries
      .filter((s) => s.voiceWorthy && s.voiceText)
      .sort((a, b) => b.signalStrength - a.signalStrength)
      .slice(0, 10)
      .map((s) => `  - [${s.voiceAttribution}] "${s.voiceText}" (${s.emotion}, signal: ${s.signalStrength.toFixed(2)})`)
      .join("\n");

    sections.push(`### ${name} (${id})
Posts: ${total} | Sources: ${sourceMix}
Emotions: ${emotionPcts}
Avg intensity: ${avgIntensity.toFixed(2)}
Top themes: ${topThemes}
Voices (${provinceSummaries.filter((s) => s.voiceWorthy).length} voice-worthy):
${voices || "  (none extracted)"}`);
  }

  // National/unattributed
  const national = byProvince.get("national") || [];
  if (national.length > 0) {
    const natVoices = national
      .filter((s) => s.voiceWorthy && s.voiceText)
      .sort((a, b) => b.signalStrength - a.signalStrength)
      .slice(0, 5)
      .map((s) => `  - [${s.voiceAttribution}] "${s.voiceText}" (${s.emotion})`)
      .join("\n");

    sections.push(`### National (unattributed)
Posts: ${national.length}
Voices:
${natVoices || "  (none)"}`);
  }

  return sections.join("\n\n");
}

export async function synthesiseWorld(
  summaries: SummaryRow[],
  totalRawPosts: number,
  retryCount = 0
): Promise<WorldAnalysis> {
  const provinceSummaryText = buildProvinceSummaries(summaries);

  // Load custom prompt from DB, fall back to default
  const customPrompt = await storage.getSystemPrompt("sonnet_synthesise");

  const defaultPrompt = `You are the synthesis engine for Zerogeist — a platform that reads South Africa's emotional weather daily.

You have pre-analysed summaries of \${totalRawPosts} South African posts from Reddit, Twitter/X, ReliefWeb, and PMG. The posts have already been geo-attributed, emotionally scored, and voices extracted by a prior analysis stage. Your job is creative synthesis — weave the data into weather.

## Pre-Analysed Province Data

\${provinceSummaryText}

## Output Requirements

Produce a JSON object with this structure:

{
  "national_digest": "2-3 sentences using weather metaphor language — atmospheric, meteorological. Specific to South Africa. Honest about what the data shows. Must not read like a news summary.",
  "national_emotion": { "anger": 0.0-1.0, "hope": 0.0-1.0, "fear": 0.0-1.0, "joy": 0.0-1.0, "grief": 0.0-1.0 },
  "national_intensity": 0.0-1.0,
  "national_consensus": 0.0-1.0,
  "provinces": [
    {
      "id": "GP|WC|KZN|EC|FS|NW|NC|MP|LP",
      "name": "Full province name",
      "dominant_emotion": "anger|hope|fear|joy|grief",
      "emotions": { "anger": 0.0-1.0, "hope": 0.0-1.0, "fear": 0.0-1.0, "joy": 0.0-1.0, "grief": 0.0-1.0 },
      "intensity": 0.0-1.0,
      "consensus": 0.0-1.0,
      "weather_description": "One evocative sentence, weather metaphor, South African context",
      "themes": [
        { "name": "max 4 words", "emotion": "anger|hope|fear|joy|grief", "intensity": 0.0-1.0, "posts": count, "summary": "One sentence" }
      ],
      "voices": [
        { "text": "The pre-extracted voice text from above", "emotion": "anger|hope|fear|joy|grief", "source": "r/sub OR x/@user OR ReliefWeb OR PMG", "time": "today|yesterday|2d ago|this week" }
      ]
    }
  ]
}

Include ALL 9 provinces. Rules:
- ONLY use themes and voices that appear in the pre-analysed data above. NEVER invent themes or voices.
- If a province has 0 posts, set its themes and voices to empty arrays []. Set its weather_description to reflect the silence honestly (e.g. "No weather stations reporting from this province today").
- The "posts" count in each theme MUST match the actual count from the data. Do not show 0 posts — if a theme has 0 posts, don't include it.
- Use the pre-extracted voice text exactly as provided. Do NOT re-paraphrase or invent new voices.
- National/unattributed voices can be distributed to provinces where they thematically fit.

Return ONLY the JSON object, no markdown.`;

  const promptTemplate = customPrompt?.prompt || defaultPrompt;
  const prompt = promptTemplate
    .replace("${totalRawPosts}", String(totalRawPosts))
    .replace("${provinceSummaryText}", provinceSummaryText);

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text);

    return {
      nationalDigest: parsed.national_digest,
      nationalEmotion: parsed.national_emotion,
      nationalIntensity: parsed.national_intensity,
      nationalConsensus: parsed.national_consensus,
      provinces: parsed.provinces,
      totalPostsAnalysed: totalRawPosts,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch (err: any) {
    if (retryCount < 3) {
      console.error(`[synthesise] Retry ${retryCount + 1}/3: ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000 * (retryCount + 1)));
      return synthesiseWorld(summaries, totalRawPosts, retryCount + 1);
    }
    throw new Error(`Synthesis failed after 3 retries: ${err.message}`);
  }
}

export function estimateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 3;
  const outputCost = (outputTokens / 1_000_000) * 15;
  return Math.round((inputCost + outputCost) * 10000) / 10000;
}

export function estimateHaikuCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 0.8;
  const outputCost = (outputTokens / 1_000_000) * 4;
  return Math.round((inputCost + outputCost) * 10000) / 10000;
}
