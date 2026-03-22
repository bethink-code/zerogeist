/**
 * Stage 2: Batch Summarisation
 *
 * Groups raw posts by province hint, batches them (~30 per batch),
 * sends each batch to Haiku for structured extraction:
 * geo-attribution, emotion, themes, voice extraction.
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

interface RawPostRow {
  id: string;
  date: string;
  sourceType: string;
  title: string | null;
  body: string;
  author: string | null;
  url: string | null;
  engagement: any;
  metadata: any;
  provinceHint: string | null;
}

export interface PostSummaryResult {
  rawPostId: string;
  provinceId: string;
  sourceType: string;
  themes: string[];
  emotion: "anger" | "hope" | "fear" | "joy" | "grief";
  intensity: number;
  signalStrength: number;
  voiceWorthy: boolean;
  voiceText: string | null;
  voiceAttribution: string;
}

interface BatchResult {
  summaries: PostSummaryResult[];
  inputTokens: number;
  outputTokens: number;
}

const BATCH_SIZE = 30;

/**
 * Group raw posts by province hint into batches of ~30.
 */
export function buildBatches(posts: RawPostRow[]): { provinceHint: string; posts: RawPostRow[] }[] {
  // Group by province hint
  const groups = new Map<string, RawPostRow[]>();
  for (const post of posts) {
    const key = post.provinceHint || "national";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(post);
  }

  // Split large groups into batches of BATCH_SIZE
  const batches: { provinceHint: string; posts: RawPostRow[] }[] = [];
  for (const [hint, groupPosts] of groups) {
    for (let i = 0; i < groupPosts.length; i += BATCH_SIZE) {
      batches.push({
        provinceHint: hint,
        posts: groupPosts.slice(i, i + BATCH_SIZE),
      });
    }
  }

  return batches;
}

function formatAttribution(post: RawPostRow): string {
  if (post.sourceType === "reddit") {
    return `r/${post.metadata?.subreddit || "southafrica"}`;
  }
  if (post.sourceType === "twitter") {
    return `x/@${post.author || "unknown"}`;
  }
  if (post.sourceType === "reliefweb") return "ReliefWeb";
  if (post.sourceType === "pmg") return "PMG";
  return post.sourceType;
}

/**
 * Send a batch of posts to Haiku for structured analysis.
 */
export async function summariseBatch(
  batch: { provinceHint: string; posts: RawPostRow[] },
  batchIndex: number
): Promise<BatchResult> {
  const provinceContext = batch.provinceHint === "national"
    ? `These posts are not geo-attributed yet. You MUST assign each to a South African province based on ANY geographic clue — city names, landmarks, institutions, universities, slang, area codes, anything. Use these mappings:
- Johannesburg, Joburg, Jozi, Soweto, Sandton, Alexandra, Randburg, Tshwane, Pretoria, Centurion, Midrand → GP
- Cape Town, Kaapstad, Stellenbosch, Paarl, Table Mountain, UCT, Cape Flats → WC
- Durban, eThekwini, Pietermaritzburg, Umhlanga, Ballito, Richards Bay → KZN
- Port Elizabeth, Gqeberha, East London, Mthatha, Grahamstown → EC
- Bloemfontein, Mangaung, Welkom → FS
- Rustenburg, Mahikeng, Klerksdorp, Potchefstroom → NW
- Kimberley, Upington → NC
- Nelspruit, Mbombela, Witbank, eMalahleni → MP
- Polokwane, Limpopo, Tzaneen, Musina → LP
Only use "national" if there is genuinely NO geographic signal — the post discusses South Africa as a whole with no regional specificity.`
    : `These posts are pre-attributed to province ${batch.provinceHint}. Confirm or correct the attribution.`;

  const postsText = batch.posts.map((p, i) => {
    const attribution = formatAttribution(p);
    const engagement = p.engagement
      ? ` | engagement: ${JSON.stringify(p.engagement)}`
      : "";
    return `[${i + 1}] (${attribution}) ${p.title ? p.title + ": " : ""}${p.body.slice(0, 300)}${engagement}`;
  }).join("\n\n");

  const prompt = `You are analysing South African social media and news posts for geographic and emotional content.

${provinceContext}

Province codes: GP (Gauteng), WC (Western Cape), KZN (KwaZulu-Natal), EC (Eastern Cape), FS (Free State), NW (North West), NC (Northern Cape), MP (Mpumalanga), LP (Limpopo).

Posts to analyse:

${postsText}

For each post, return a JSON object with:
- "index": the post number (1-based)
- "province_id": which province this relates to (GP/WC/KZN/EC/FS/NW/NC/MP/LP/national)
- "themes": 1-3 theme tags, max 4 words each
- "emotion": dominant emotion (anger/hope/fear/joy/grief)
- "intensity": 0.0-1.0
- "signal_strength": 0.0-1.0 based on specificity + engagement + emotional clarity
- "voice_worthy": true if this post is distinctive enough to surface as a representative voice
- "voice_text": if voice_worthy, a 1-2 sentence paraphrase that captures the sentiment. Never a direct quote. Include enough context to understand the voice without seeing the original.

Return a JSON array of objects. Return ONLY the JSON array, no markdown.`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "[]";
  let parsed: any[];
  try {
    parsed = JSON.parse(text);
  } catch {
    // Try to extract JSON from markdown code block
    const match = text.match(/\[[\s\S]*\]/);
    parsed = match ? JSON.parse(match[0]) : [];
  }

  const VALID_EMOTIONS = new Set(["anger", "hope", "fear", "joy", "grief"]);
  const EMOTION_MAP: Record<string, string> = {
    neutral: "hope", sad: "grief", sadness: "grief", happy: "joy", happiness: "joy",
    anxious: "fear", anxiety: "fear", frustrated: "anger", frustration: "anger",
    hopeful: "hope", angry: "anger", scared: "fear", joyful: "joy", grieving: "grief",
    worried: "fear", excited: "joy", disappointed: "grief", outraged: "anger",
    optimistic: "hope", pessimistic: "grief", concerned: "fear", relieved: "hope",
  };

  function normaliseEmotion(raw: string): "anger" | "hope" | "fear" | "joy" | "grief" {
    const lower = (raw || "").toLowerCase().trim();
    if (VALID_EMOTIONS.has(lower)) return lower as any;
    return (EMOTION_MAP[lower] || "grief") as any;
  }

  const summaries: PostSummaryResult[] = parsed.map((item: any) => {
    const postIndex = (item.index || 1) - 1;
    const post = batch.posts[postIndex] || batch.posts[0];
    return {
      rawPostId: post.id,
      provinceId: item.province_id || batch.provinceHint || "national",
      sourceType: post.sourceType,
      themes: item.themes || [],
      emotion: normaliseEmotion(item.emotion),
      intensity: Math.min(1, Math.max(0, item.intensity || 0.5)),
      signalStrength: Math.min(1, Math.max(0, item.signal_strength || 0.5)),
      voiceWorthy: item.voice_worthy || false,
      voiceText: item.voice_text || null,
      voiceAttribution: formatAttribution(post),
    };
  });

  return {
    summaries,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

/**
 * Run all batches and return all summaries with total token usage.
 */
export async function summariseAll(
  posts: RawPostRow[],
  onBatchComplete?: (batchIndex: number, total: number, summaryCount: number) => void
): Promise<{
  summaries: PostSummaryResult[];
  totalInputTokens: number;
  totalOutputTokens: number;
}> {
  const batches = buildBatches(posts);
  const allSummaries: PostSummaryResult[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (let i = 0; i < batches.length; i++) {
    try {
      const result = await summariseBatch(batches[i], i);
      allSummaries.push(...result.summaries);
      totalInputTokens += result.inputTokens;
      totalOutputTokens += result.outputTokens;
      console.log(`[summarise] Batch ${i + 1}/${batches.length}: ${result.summaries.length} summaries from ${batches[i].posts.length} posts (${batches[i].provinceHint})`);
      onBatchComplete?.(i + 1, batches.length, result.summaries.length);
    } catch (err: any) {
      console.error(`[summarise] Batch ${i + 1}/${batches.length} FAILED (${batches[i].provinceHint}, ${batches[i].posts.length} posts): ${err.message}`);
      onBatchComplete?.(i + 1, batches.length, 0);
    }
  }

  return { summaries: allSummaries, totalInputTokens, totalOutputTokens };
}
