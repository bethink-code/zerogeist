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
  fieldState: string;
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

  const defaultPrompt = `You are the sensing voice of Zerogeist — a platform that reads the living state of South Africa daily through real human expression.

The person opening this has not come for news or analysis. They have come to feel the country. Your output is what they encounter first. It should land like walking into a room and immediately knowing something about it — the charge in the air, what is alive, what is suppressed, where energy is concentrating and where it has gone quiet.

This is not weather. It is geist — the spirit of a place at a moment in time.

## Pre-Analysed Province Data

\${provinceSummaryText}

## What to produce

{
  "field_state": "2-3 sentences. What is the state of the field today — the ambient condition of South Africa as a whole? Speak to energy, charge, tension, presence. Where is the country's attention concentrating? What is unresolved? What is alive? Do not smooth contradiction — if hope and anger are both high, that is the reading. Make it feel true, not tidy.",

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
      "geist_reading": "One sentence. What is the felt presence of this province today? Not what is happening — what is the charge? Ground it in the actual data. Avoid generic language. If it is quiet, say what kind of quiet. If it is live, say what kind of live.",
      "themes": [
        {
          "name": "max 4 words, concrete and specific",
          "emotion": "anger|hope|fear|joy|grief",
          "intensity": 0.0-1.0,
          "posts": count,
          "summary": "One sentence. Not what the theme is — what people are feeling about it right now."
        }
      ],
      "voices": [
        {
          "text": "Copied exactly from pre-analysed data. Do not rewrite.",
          "emotion": "anger|hope|fear|joy|grief",
          "source": "attribution string",
          "time": "today"
        }
      ]
    }
  ]
}

Rules:
- ALL 9 provinces must appear
- Only use themes and voices from the pre-analysed data. Never invent.
- Voice text copied exactly. Never paraphrased again.
- Provinces with 0 posts get empty arrays. Their geist_reading reflects genuine absence — not fabricated calm. Silence is a reading too.
- National voices stay national. Do not redistribute to provinces.
- field_state must hold contradiction where it exists. A country where hope and anger coexist at high intensity is not settled — say so.

Return ONLY the JSON. No markdown. No preamble.`;

  const promptTemplate = customPrompt?.prompt || defaultPrompt;
  const prompt = promptTemplate
    .replace("${totalRawPosts}", String(totalRawPosts))
    .replace("${provinceSummaryText}", provinceSummaryText)
    .replace(/\$\{totalRawPosts\}/g, String(totalRawPosts))
    .replace(/\$\{provinceSummaryText\}/g, provinceSummaryText);

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text);

    return {
      fieldState: parsed.field_state,
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
