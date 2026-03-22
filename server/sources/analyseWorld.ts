/**
 * World snapshot generation via Claude API.
 * Takes raw source data, sends to Claude for analysis,
 * returns structured world_snapshot data.
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

function timeAgo(date: Date): string {
  const ms = Date.now() - date.getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

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

interface SourceData {
  reddit: any[];
  reliefweb: any[];
  pmg: any[];
  twitter?: any[];
}

export interface WorldAnalysis {
  nationalDigest: string;
  nationalEmotion: { anger: number; hope: number; fear: number; joy: number; grief: number };
  nationalIntensity: number;
  nationalConsensus: number;
  provinces: ProvinceAnalysis[];
  totalPostsAnalysed: number;
  inputTokens: number;
  outputTokens: number;
}

interface ProvinceAnalysis {
  id: string;
  name: string;
  dominant_emotion: string;
  emotions: { anger: number; hope: number; fear: number; joy: number; grief: number };
  intensity: number;
  consensus: number;
  weather_description: string;
  themes: { name: string; emotion: string; intensity: number; posts: number; summary: string }[];
  voices: { text: string; emotion: string; source: string }[];
}

export async function analyseWorld(data: SourceData, retryCount = 0): Promise<WorldAnalysis> {
  const totalPosts = data.reddit.length + data.reliefweb.length + data.pmg.length + (data.twitter?.length || 0);

  // Build source summary for Claude
  const redditSummary = data.reddit
    .map((p) => {
      const age = p.createdAt ? timeAgo(new Date(p.createdAt)) : "";
      return `[r/${p.subreddit}${age ? ", " + age : ""}] ${p.title}${p.body ? ": " + p.body.slice(0, 300) : ""} (score: ${p.score}, comments: ${p.comments})`;
    })
    .join("\n");

  const reliefwebSummary = data.reliefweb
    .map((r: any) => `[ReliefWeb] ${r.title}: ${r.body?.slice(0, 300) || ""}`)
    .join("\n");

  const pmgSummary = data.pmg
    .map((m: any) => `[PMG - ${m.committee}] ${m.title}: ${m.body?.slice(0, 300) || ""}`)
    .join("\n");

  // Twitter: sort by engagement, deduplicate, cap at 100 most impactful
  const twitterFiltered = (data.twitter || [])
    .filter((t: any) => t.text && t.text.length > 20)
    .sort((a: any, b: any) => {
      const engA = (a.likes || 0) + (a.retweets || 0) * 2 + (a.replies || 0);
      const engB = (b.likes || 0) + (b.retweets || 0) * 2 + (b.replies || 0);
      return engB - engA;
    })
    .slice(0, 100);

  const twitterSummary = twitterFiltered
    .map((t: any) => {
      const age = t.createdAt ? timeAgo(new Date(t.createdAt)) : "";
      return `[X/@${t.author}${age ? ", " + age : ""}] ${t.text?.slice(0, 200) || ""} (likes: ${t.likes}, RT: ${t.retweets})`;
    })
    .join("\n");

  const prompt = `You are the analysis engine for Zerogeist — a platform that reads South Africa's emotional weather daily.

Analyse the following source data from four lenses:
1. **Reddit** — public sentiment, what people are talking about and feeling
2. **Twitter/X** — real-time public conversation, political and social commentary
3. **ReliefWeb** — humanitarian ground-level situation reports
4. **PMG** — what the South African state is actually doing in committee meetings

Your task: generate a structured emotional weather snapshot for South Africa at national and provincial level.

## Source Data

### Reddit Posts (${data.reddit.length} posts)
${redditSummary || "No Reddit data available."}

### ReliefWeb Reports (${data.reliefweb.length} reports)
${reliefwebSummary || "No ReliefWeb data available."}

### Twitter/X Posts (${data.twitter?.length || 0} tweets)
${twitterSummary || "No Twitter data available."}

### PMG Committee Meetings (${data.pmg.length} items)
${pmgSummary || "No PMG data available."}

## Output Requirements

Return a JSON object with this exact structure:

{
  "national_digest": "2-3 sentences using weather metaphor language — atmospheric, meteorological. Must be specific to South Africa. Must not read like a news summary. Example register: 'A low-pressure system has settled over the economic conversation, heavy with the kind of exhaustion that comes after a long argument nobody won.'",
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
        { "name": "max 4 words", "emotion": "anger|hope|fear|joy|grief", "intensity": 0.0-1.0, "posts": 0, "summary": "One sentence: what people are actually saying about this" }
      ],
      "voices": [
        { "text": "Paraphrased sentiment from real posts. Never a direct quote. Max 2 sentences.", "emotion": "anger|hope|fear|joy|grief", "source": "r/subreddit OR x/username OR ReliefWeb OR PMG — MUST reflect which source the voice actually came from", "time": "today|yesterday|2d ago|3d ago|this week — based on the post timestamps in the source data" }
      ]
    }
  ]
}

Include ALL 9 provinces: ${PROVINCES.map((p) => `${p.id} (${p.name})`).join(", ")}.

For provinces with little direct data, infer from national trends and nearby provincial context. Each province should have 2-5 themes and 2-4 voices.

IMPORTANT: Voices MUST be drawn from ALL available sources — Reddit, Twitter/X, ReliefWeb, and PMG. Do not favour Reddit voices. Each province's voices should reflect the mix of sources that contributed data about that area. The "source" field must accurately attribute where the voice came from (e.g. "r/capetown", "x/username", "ReliefWeb", "PMG").

Each province MUST have 3-5 themes and 5-8 voices. You are receiving hundreds of source items — surface the breadth, not just the loudest signals. Include quiet voices alongside dominant ones. Every source type that provided data about a province must be represented in that province's voices.

The national digest must be honest about what is actually in the data. Be specific to South Africa — not generic.

Return ONLY the JSON object, no markdown, no explanation.`;

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
      totalPostsAnalysed: totalPosts,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch (err: any) {
    if (retryCount < 3) {
      console.error(`[analyseWorld] Retry ${retryCount + 1}/3: ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000 * (retryCount + 1)));
      return analyseWorld(data, retryCount + 1);
    }
    throw new Error(`World analysis failed after 3 retries: ${err.message}`);
  }
}

// Estimate Claude API cost (Sonnet pricing)
export function estimateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 3;
  const outputCost = (outputTokens / 1_000_000) * 15;
  return Math.round((inputCost + outputCost) * 10000) / 10000;
}
