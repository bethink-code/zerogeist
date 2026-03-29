// sankeyLayout.ts — Pure data transformation: posts → Sankey nodes + links
// No React dependencies. No side effects.

export type Emotion = "anger" | "hope" | "fear" | "joy" | "grief";

export interface Post {
  id: string;
  title: string | null;
  body: string;
  author: string | null;
  url: string | null;
  sourceType: string;
  publishedAt: string | null;
  engagement: any;
  metadata: any;
  emotion: string;
  themes: string[];
  intensity?: number;
  signalStrength?: number;
  voiceWorthy?: boolean;
  voiceText?: string | null;
  voiceAttribution?: string | null;
}

export interface SankeyNode {
  id: string; // e.g. "source:reddit", "theme:corruption", "emotion:anger"
  column: 0 | 1 | 2; // 0=Source, 1=Theme, 2=Emotion
  label: string;
  value: number; // unique post count flowing through this node
  color: string;
  y: number; // top edge, normalised 0–1
  height: number; // bar height, normalised 0–1
}

export interface SankeyLink {
  sourceId: string;
  targetId: string;
  value: number; // post count for this flow
  sourceColor: string;
  targetColor: string;
  // Normalised offsets within the node's height band
  sourceY: number;
  sourceHeight: number;
  targetY: number;
  targetHeight: number;
}

export interface SankeyLayout {
  nodes: SankeyNode[];
  links: SankeyLink[];
  postsByNode: Map<string, Post[]>;
}

// ─── Color constants ────────────────────────────────────

// Source colors — neutral warm greys/browns, deliberately NOT emotion colors.
// Sources are data pipes, not emotional signals.
export const SOURCE_COLORS: Record<string, string> = {
  reddit: "#8C7B6B",
  reliefweb: "#6B7C8C",
  pmg: "#7B8B7B",
  twitter: "#8A7860",
  bluesky: "#7082A0",
  telegram: "#7A7A7A",
  rss: "#7A7A7A",
  other: "#8A7860",
};

export const EMOTION_COLORS: Record<string, string> = {
  anger: "#C85A1A",
  hope: "#7A9E68",
  fear: "#3E7BBF",
  joy: "#D4A827",
  grief: "#6A5278",
};

const SOURCE_LABELS: Record<string, string> = {
  reddit: "Reddit",
  reliefweb: "ReliefWeb",
  pmg: "PMG",
  twitter: "X / Twitter",
  bluesky: "Bluesky",
  telegram: "Telegram",
  rss: "RSS",
  other: "Other",
};

const EMOTION_LABELS: Record<string, string> = {
  anger: "Anger",
  hope: "Hope",
  fear: "Fear",
  joy: "Joy",
  grief: "Grief",
};

const MAX_THEMES = 12;
const NODE_GAP = 0.012; // normalised gap between nodes within a column

// ─── Main layout function ───────────────────────────────

export function computeSankeyLayout(posts: Post[]): SankeyLayout {
  if (posts.length === 0) {
    return { nodes: [], links: [], postsByNode: new Map() };
  }

  // ── 1. Aggregate sources ──
  const sourceGroups = new Map<string, Post[]>();
  for (const p of posts) {
    const key = p.sourceType || "other";
    if (!sourceGroups.has(key)) sourceGroups.set(key, []);
    sourceGroups.get(key)!.push(p);
  }

  // ── 2. Aggregate themes ──
  const themeCounts = new Map<string, Set<string>>(); // theme → set of post IDs
  const themePostMap = new Map<string, Post[]>();
  for (const p of posts) {
    const themes = p.themes && p.themes.length > 0 ? p.themes : ["untagged"];
    for (const raw of themes) {
      const t = raw.toLowerCase().trim();
      if (!t) continue;
      if (!themeCounts.has(t)) {
        themeCounts.set(t, new Set());
        themePostMap.set(t, []);
      }
      themeCounts.get(t)!.add(p.id);
      themePostMap.get(t)!.push(p);
    }
  }

  // Sort themes by unique post count, keep top N, merge rest into "other"
  const sortedThemes = [...themeCounts.entries()]
    .sort((a, b) => b[1].size - a[1].size);

  const keptThemes = sortedThemes.slice(0, MAX_THEMES);
  const mergedThemes = sortedThemes.slice(MAX_THEMES);

  if (mergedThemes.length > 0) {
    const otherIds = new Set<string>();
    for (const [, ids] of mergedThemes) {
      for (const id of ids) otherIds.add(id);
    }
    // Collect unique posts that belong to merged themes
    const seen = new Set<string>();
    const otherPosts: Post[] = [];
    for (const p of posts) {
      if (otherIds.has(p.id) && !seen.has(p.id)) {
        seen.add(p.id);
        otherPosts.push(p);
      }
    }
    keptThemes.push(["other topics", otherIds]);
    themePostMap.set("other topics", otherPosts);
  }

  // ── 3. Aggregate emotions ──
  const emotionGroups = new Map<string, Post[]>();
  for (const p of posts) {
    const em = p.emotion || "grief";
    if (!emotionGroups.has(em)) emotionGroups.set(em, []);
    emotionGroups.get(em)!.push(p);
  }

  // ── 4. Build link counts FIRST (before nodes) ──
  // We need flow totals to size nodes correctly.
  // A post with N themes creates N flows, so flow total ≠ unique post count.

  // Source → Theme
  const stCounts = new Map<string, number>();
  for (const p of posts) {
    const srcKey = `source:${p.sourceType || "other"}`;
    const themes = p.themes && p.themes.length > 0 ? p.themes : ["untagged"];
    for (const raw of themes) {
      let t = raw.toLowerCase().trim();
      if (!t) continue;
      const isKept = keptThemes.some(([k]) => k === t);
      if (!isKept && mergedThemes.length > 0) t = "other topics";
      const themeKey = `theme:${t}`;
      const linkKey = `${srcKey}→${themeKey}`;
      stCounts.set(linkKey, (stCounts.get(linkKey) || 0) + 1);
    }
  }

  // Theme → Emotion
  const teCounts = new Map<string, number>();
  for (const p of posts) {
    const emKey = `emotion:${p.emotion || "grief"}`;
    const themes = p.themes && p.themes.length > 0 ? p.themes : ["untagged"];
    for (const raw of themes) {
      let t = raw.toLowerCase().trim();
      if (!t) continue;
      const isKept = keptThemes.some(([k]) => k === t);
      if (!isKept && mergedThemes.length > 0) t = "other topics";
      const themeKey = `theme:${t}`;
      const linkKey = `${themeKey}→${emKey}`;
      teCounts.set(linkKey, (teCounts.get(linkKey) || 0) + 1);
    }
  }

  // ── 5. Compute flow totals per node ──
  // For a Sankey to align, node.value must equal the sum of its flows.
  // Source nodes: value = sum of outgoing flows (to themes)
  // Theme nodes: value = sum of incoming flows = sum of outgoing flows
  // Emotion nodes: value = sum of incoming flows (from themes)
  const nodeOutFlow = new Map<string, number>();
  const nodeInFlow = new Map<string, number>();

  for (const [key, value] of stCounts) {
    const [srcId, tgtId] = key.split("→");
    nodeOutFlow.set(srcId, (nodeOutFlow.get(srcId) || 0) + value);
    nodeInFlow.set(tgtId, (nodeInFlow.get(tgtId) || 0) + value);
  }
  for (const [key, value] of teCounts) {
    const [srcId, tgtId] = key.split("→");
    nodeOutFlow.set(srcId, (nodeOutFlow.get(srcId) || 0) + value);
    nodeInFlow.set(tgtId, (nodeInFlow.get(tgtId) || 0) + value);
  }

  // ── 6. Build nodes using flow-based values ──
  const nodes: SankeyNode[] = [];
  const postsByNode = new Map<string, Post[]>();

  // Source nodes — sized by outgoing flow
  const sourceEntries = [...sourceGroups.entries()].sort(
    (a, b) => b[1].length - a[1].length
  );
  for (const [key, ps] of sourceEntries) {
    const id = `source:${key}`;
    nodes.push({
      id,
      column: 0,
      label: SOURCE_LABELS[key] || key,
      value: nodeOutFlow.get(id) || ps.length,
      color: SOURCE_COLORS[key] || SOURCE_COLORS.other,
      y: 0,
      height: 0,
    });
    postsByNode.set(id, ps);
  }

  // Theme nodes — sized by max(inFlow, outFlow) to ensure both sides fit
  for (const [theme, ids] of keptThemes) {
    const id = `theme:${theme}`;
    const emotionCount = new Map<string, number>();
    const ps = themePostMap.get(theme) || [];
    for (const p of ps) {
      emotionCount.set(p.emotion, (emotionCount.get(p.emotion) || 0) + 1);
    }
    let dominantEmotion = "grief";
    let maxCount = 0;
    for (const [em, c] of emotionCount) {
      if (c > maxCount) {
        maxCount = c;
        dominantEmotion = em;
      }
    }

    const inF = nodeInFlow.get(id) || 0;
    const outF = nodeOutFlow.get(id) || 0;
    // "Other topics" gets a neutral color — it's an aggregate bucket, not a signal
    const themeColor = theme === "other topics"
      ? "#9A9080"
      : EMOTION_COLORS[dominantEmotion] || "#8A7860";

    nodes.push({
      id,
      column: 1,
      label: capitalize(theme),
      value: Math.max(inF, outF, ids.size),
      color: themeColor,
      y: 0,
      height: 0,
    });
    postsByNode.set(id, ps);
  }

  // Emotion nodes — sized by incoming flow
  const emotionOrder: Emotion[] = ["anger", "grief", "fear", "hope", "joy"];
  for (const em of emotionOrder) {
    const ps = emotionGroups.get(em) || [];
    const id = `emotion:${em}`;
    nodes.push({
      id,
      column: 2,
      label: EMOTION_LABELS[em],
      value: nodeInFlow.get(id) || ps.length,
      color: EMOTION_COLORS[em],
      y: 0,
      height: 0,
    });
    postsByNode.set(id, ps);
  }

  // ── 7. Layout nodes within columns ──
  layoutColumn(nodes, 0, NODE_GAP);
  layoutColumn(nodes, 1, NODE_GAP);
  layoutColumn(nodes, 2, NODE_GAP);

  // ── 8. Build link objects with ribbon offsets ──
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const links: SankeyLink[] = [];

  const outOffset = new Map<string, number>();
  const inOffset = new Map<string, number>();

  // Source→Theme links (sorted by value desc for visual stability)
  const stLinks = [...stCounts.entries()]
    .map(([key, value]) => {
      const [sourceId, targetId] = key.split("→");
      return { sourceId, targetId, value };
    })
    .sort((a, b) => b.value - a.value);

  for (const { sourceId, targetId, value } of stLinks) {
    const src = nodeMap.get(sourceId);
    const tgt = nodeMap.get(targetId);
    if (!src || !tgt || src.value === 0 || tgt.value === 0) continue;

    const srcRibbonH = (value / src.value) * src.height;
    const tgtRibbonH = (value / tgt.value) * tgt.height;
    const srcOff = outOffset.get(sourceId) || 0;
    const tgtOff = inOffset.get(targetId) || 0;

    links.push({
      sourceId,
      targetId,
      value,
      sourceColor: src.color,
      targetColor: tgt.color,
      sourceY: src.y + srcOff,
      sourceHeight: srcRibbonH,
      targetY: tgt.y + tgtOff,
      targetHeight: tgtRibbonH,
    });

    outOffset.set(sourceId, srcOff + srcRibbonH);
    inOffset.set(targetId, tgtOff + tgtRibbonH);
  }

  // Theme→Emotion links
  const teLinks = [...teCounts.entries()]
    .map(([key, value]) => {
      const [sourceId, targetId] = key.split("→");
      return { sourceId, targetId, value };
    })
    .sort((a, b) => b.value - a.value);

  for (const { sourceId, targetId, value } of teLinks) {
    const src = nodeMap.get(sourceId);
    const tgt = nodeMap.get(targetId);
    if (!src || !tgt || src.value === 0 || tgt.value === 0) continue;

    const srcRibbonH = (value / src.value) * src.height;
    const tgtRibbonH = (value / tgt.value) * tgt.height;
    const srcOff = outOffset.get(sourceId) || 0;
    const tgtOff = inOffset.get(targetId) || 0;

    links.push({
      sourceId,
      targetId,
      value,
      sourceColor: src.color,
      targetColor: tgt.color,
      sourceY: src.y + srcOff,
      sourceHeight: srcRibbonH,
      targetY: tgt.y + tgtOff,
      targetHeight: tgtRibbonH,
    });

    outOffset.set(sourceId, srcOff + srcRibbonH);
    inOffset.set(targetId, tgtOff + tgtRibbonH);
  }

  return { nodes, links, postsByNode };
}

// ─── Layout helper ──────────────────────────────────────

function layoutColumn(
  nodes: SankeyNode[],
  column: 0 | 1 | 2,
  gap: number
) {
  const colNodes = nodes.filter((n) => n.column === column && n.value > 0);
  if (colNodes.length === 0) return;

  const total = colNodes.reduce((s, n) => s + n.value, 0);
  const totalGap = gap * (colNodes.length - 1);
  const available = 1 - totalGap;

  let y = 0;
  for (const node of colNodes) {
    node.height = (node.value / total) * available;
    node.y = y;
    y += node.height + gap;
  }
}

// ─── Morph interpolation ────────────────────────────────

export function interpolateLayouts(
  from: SankeyLayout,
  to: SankeyLayout,
  t: number
): SankeyLayout {
  const fromNodeMap = new Map(from.nodes.map((n) => [n.id, n]));
  const toNodeMap = new Map(to.nodes.map((n) => [n.id, n]));

  // All unique node IDs
  const allIds = new Set([
    ...from.nodes.map((n) => n.id),
    ...to.nodes.map((n) => n.id),
  ]);

  const nodes: SankeyNode[] = [];
  for (const id of allIds) {
    const f = fromNodeMap.get(id);
    const toNode = toNodeMap.get(id);

    if (f && toNode) {
      // Both exist — lerp
      nodes.push({
        ...toNode,
        y: lerp(f.y, toNode.y, t),
        height: lerp(f.height, toNode.height, t),
        value: Math.round(lerp(f.value, toNode.value, t)),
      });
    } else if (toNode) {
      // Appearing — grow from zero height at its target position
      nodes.push({
        ...toNode,
        height: toNode.height * t,
        value: Math.round(toNode.value * t),
      });
    } else if (f) {
      // Disappearing — shrink to zero
      nodes.push({
        ...f,
        height: f.height * (1 - t),
        value: Math.round(f.value * (1 - t)),
      });
    }
  }

  // Interpolate links
  const fromLinkMap = new Map(
    from.links.map((l) => [`${l.sourceId}→${l.targetId}`, l])
  );
  const toLinkMap = new Map(
    to.links.map((l) => [`${l.sourceId}→${l.targetId}`, l])
  );
  const allLinkKeys = new Set([...fromLinkMap.keys(), ...toLinkMap.keys()]);

  const links: SankeyLink[] = [];
  for (const key of allLinkKeys) {
    const fl = fromLinkMap.get(key);
    const tl = toLinkMap.get(key);

    if (fl && tl) {
      links.push({
        ...tl,
        value: Math.round(lerp(fl.value, tl.value, t)),
        sourceY: lerp(fl.sourceY, tl.sourceY, t),
        sourceHeight: lerp(fl.sourceHeight, tl.sourceHeight, t),
        targetY: lerp(fl.targetY, tl.targetY, t),
        targetHeight: lerp(fl.targetHeight, tl.targetHeight, t),
      });
    } else if (tl) {
      links.push({
        ...tl,
        value: Math.round(tl.value * t),
        sourceHeight: tl.sourceHeight * t,
        targetHeight: tl.targetHeight * t,
      });
    } else if (fl) {
      links.push({
        ...fl,
        value: Math.round(fl.value * (1 - t)),
        sourceHeight: fl.sourceHeight * (1 - t),
        targetHeight: fl.targetHeight * (1 - t),
      });
    }
  }

  return { nodes, links, postsByNode: t < 0.5 ? from.postsByNode : to.postsByNode };
}

// ─── Easing ─────────────────────────────────────────────

export function cubicEaseInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ─── Utilities ──────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
