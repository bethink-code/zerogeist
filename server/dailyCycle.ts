/**
 * Daily Cycle — Resumable state machine.
 *
 * Each call to advanceCycle() runs ONE logical step and persists state to
 * daily_cycle_log. A HTTP endpoint chains itself via self-fetch so each step
 * gets a fresh Vercel lambda invocation and budget.
 *
 * Steps:
 *   reddit, twitter, bluesky, reliefweb, pmg  — fetch + store + update source row
 *   summarise                                  — Haiku (batch-bounded, may stay on step)
 *   synthesise                                 — Sonnet → world_snapshot
 *   personalise                                — person_world rows
 *   finalise                                   — totals + completed
 *
 * Modes:
 *   full          — default: fetch any missing sources, summarise, synthesise, personalise
 *   fetch-only    — stop after store
 *   resummarize   — skip fetches, clear summaries+snapshot, re-run from summarise
 *   resynthesize  — skip fetches+summarise, clear snapshot, re-run from synthesise
 */

import { fetchReddit } from "./sources/reddit.js";
import { fetchReliefWeb } from "./sources/reliefweb.js";
import { fetchPMG } from "./sources/pmg.js";
import { fetchTwitter } from "./sources/apify.js";
import { fetchBluesky } from "./sources/bluesky.js";
import { summariseBatch, buildBatches } from "./sources/summarise.js";
import { synthesiseWorld, estimateCost, estimateHaikuCost } from "./sources/synthesise.js";
import * as storage from "./storage.js";
import { db } from "./db.js";
import { source } from "../shared/schema.js";
import { eq } from "drizzle-orm";

export type CycleMode = "full" | "fetch-only" | "resummarize" | "resynthesize";

export type StepStatus = "pending" | "running" | "done" | "failed" | "skipped";

export interface StepState {
  name: string;
  status: StepStatus;
  detail?: string;
}

// Shape returned to the admin UI (maintained for UI compatibility)
export interface CycleProgress {
  step: string;
  detail: string;
  startedAt: number;
  steps: StepState[];
  status: string;
  cycleLogId: string;
}

const SOURCE_STEPS = ["reddit", "twitter", "bluesky", "reliefweb", "pmg"] as const;
const ALL_STEPS = [
  ...SOURCE_STEPS,
  "summarise",
  "synthesise",
  "personalise",
  "finalise",
] as const;

// How many Haiku batches to process in one advance invocation.
// Each batch is one API call; keep the total under ~45s.
const SUMMARISE_BATCHES_PER_ADVANCE = 4;

// ─── Public entry points ─────────────────────────────────────

/**
 * Initialise (or resume) today's cycle. Returns the cycle log id.
 * Safe to call multiple times — idempotent per-day.
 */
export async function initCycle(mode: CycleMode): Promise<{
  cycleLogId: string;
  alreadyComplete: boolean;
  alreadyRunning: boolean;
}> {
  const today = new Date().toISOString().split("T")[0];
  const existing = await storage.getTodaysCycleLog();

  // Handle mode-specific clears
  if (mode === "resummarize") {
    await storage.clearTodaysSummaries();
    await storage.clearTodaysSnapshot();
  } else if (mode === "resynthesize") {
    await storage.clearTodaysSnapshot();
  }

  // If an existing full run completed with every source present, skip.
  if (mode === "full" && existing?.status === "completed") {
    const existingPosts = await storage.getRawPostsByDate(today);
    const haveTypes = new Set(existingPosts.map((p: any) => p.sourceType));
    const missing = SOURCE_STEPS.filter((s) => !haveTypes.has(s));
    if (missing.length === 0) {
      return { cycleLogId: existing.id, alreadyComplete: true, alreadyRunning: false };
    }
  }

  // Determine which steps apply to this mode
  const steps = buildInitialSteps(mode);

  // Mark sources we already have as "skipped (cached)" for full/fetch-only modes
  if (mode === "full" || mode === "fetch-only") {
    const existingPosts = await storage.getRawPostsByDate(today);
    const haveTypes = new Set(existingPosts.map((p: any) => p.sourceType));
    for (const s of steps) {
      if (SOURCE_STEPS.includes(s.name as any) && haveTypes.has(s.name)) {
        s.status = "skipped";
        s.detail = "already fetched";
      }
    }
  }

  if (existing) {
    // Resume the existing record. If it was failed, reset it.
    await storage.updateCycleLog(existing.id, {
      status: "in_progress",
      failedAtStep: null,
      mode,
      steps,
      currentStep: null,
      stepDetail: "Ready",
      lastAdvanceAt: new Date(),
      completedAt: null,
    });
    return { cycleLogId: existing.id, alreadyComplete: false, alreadyRunning: false };
  }

  const created = await storage.createCycleLog({
    date: today,
    status: "in_progress",
    sourcesRun: 0,
    personsProcessed: 0,
    totalCost: 0,
    mode,
    steps,
    stepDetail: "Ready",
    lastAdvanceAt: new Date(),
  });
  return { cycleLogId: created.id, alreadyComplete: false, alreadyRunning: false };
}

/**
 * Run one step of the cycle. Returns whether cycle is complete and what's next.
 * Designed to be called repeatedly (by HTTP self-chain) until done=true.
 */
export async function advanceCycle(cycleLogId: string): Promise<{
  done: boolean;
  nextStep: string | null;
  error: string | null;
}> {
  const log = await storage.getCycleLogById(cycleLogId);
  if (!log) return { done: true, nextStep: null, error: "cycle log not found" };
  if (log.status === "completed") return { done: true, nextStep: null, error: null };
  if (log.status === "failed") return { done: true, nextStep: null, error: log.failedAtStep };

  const steps: StepState[] = (log.steps as StepState[]) || buildInitialSteps((log.mode as CycleMode) || "full");

  // Find the next step to run — first not in terminal state.
  const next = steps.find((s) => s.status !== "done" && s.status !== "skipped" && s.status !== "failed");
  if (!next) {
    await storage.updateCycleLog(cycleLogId, {
      status: "completed",
      completedAt: new Date(),
      currentStep: null,
      stepDetail: "Done",
    });
    return { done: true, nextStep: null, error: null };
  }

  // Mark step running
  next.status = "running";
  if (!next.detail) next.detail = "Starting...";
  await storage.updateCycleLog(cycleLogId, {
    currentStep: next.name,
    stepDetail: next.detail,
    steps,
    lastAdvanceAt: new Date(),
  });

  console.log(`[cycle] advance: running step "${next.name}" on cycle ${cycleLogId}`);

  try {
    const result = await runStep(next.name, cycleLogId, log.mode as CycleMode);

    if (result.stayOnStep) {
      // More work to do for this step (e.g., more summarise batches)
      next.status = "running";
      next.detail = result.detail;
      await storage.updateCycleLog(cycleLogId, {
        steps,
        stepDetail: result.detail,
        lastAdvanceAt: new Date(),
      });
      return { done: false, nextStep: next.name, error: null };
    }

    // Step complete
    next.status = "done";
    next.detail = result.detail;

    // Detect last step
    const remaining = steps.find((s) => s.status !== "done" && s.status !== "skipped" && s.status !== "failed");
    if (!remaining) {
      await storage.updateCycleLog(cycleLogId, {
        status: "completed",
        completedAt: new Date(),
        currentStep: null,
        stepDetail: "Done",
        steps,
        lastAdvanceAt: new Date(),
      });
      console.log(`[cycle] complete: ${cycleLogId}`);
      return { done: true, nextStep: null, error: null };
    }

    await storage.updateCycleLog(cycleLogId, {
      currentStep: remaining.name,
      stepDetail: "Pending",
      steps,
      lastAdvanceAt: new Date(),
    });
    return { done: false, nextStep: remaining.name, error: null };
  } catch (err: any) {
    const message = err?.message?.slice(0, 300) || "unknown error";
    console.error(`[cycle] step "${next.name}" failed:`, err);
    next.status = "failed";
    next.detail = message;
    await storage.updateCycleLog(cycleLogId, {
      status: "failed",
      failedAtStep: `${next.name}: ${message}`,
      completedAt: new Date(),
      currentStep: next.name,
      stepDetail: message,
      steps,
      lastAdvanceAt: new Date(),
    });
    return { done: true, nextStep: null, error: message };
  }
}

/**
 * Load current progress for the UI.
 */
export async function loadCycleProgress(): Promise<CycleProgress | null> {
  const log = await storage.getTodaysCycleLog();
  if (!log) return null;
  const steps: StepState[] = (log.steps as StepState[]) || [];
  return {
    step: log.currentStep || "",
    detail: log.stepDetail || "",
    startedAt: log.startedAt ? new Date(log.startedAt).getTime() : Date.now(),
    steps,
    status: log.status,
    cycleLogId: log.id,
  };
}

// ─── Step implementations ────────────────────────────────────

interface StepResult {
  detail: string;
  stayOnStep?: boolean;
}

async function runStep(stepName: string, cycleLogId: string, mode: CycleMode): Promise<StepResult> {
  if (SOURCE_STEPS.includes(stepName as any)) {
    return runSourceStep(stepName, cycleLogId);
  }
  switch (stepName) {
    case "summarise":
      return runSummariseStep(cycleLogId);
    case "synthesise":
      return runSynthesiseStep(cycleLogId);
    case "personalise":
      return runPersonaliseStep(cycleLogId);
    case "finalise":
      return runFinaliseStep(cycleLogId);
    default:
      throw new Error(`Unknown step: ${stepName}`);
  }
}

async function runSourceStep(name: string, cycleLogId: string): Promise<StepResult> {
  const today = new Date().toISOString().split("T")[0];
  let result: { posts: any[]; error: string | null; cost?: number };

  if (name === "reddit") result = await fetchReddit();
  else if (name === "twitter") result = await fetchTwitter();
  else if (name === "bluesky") result = await fetchBluesky();
  else if (name === "reliefweb") result = await fetchReliefWeb();
  else if (name === "pmg") result = await fetchPMG();
  else throw new Error(`Unknown source: ${name}`);

  if (result.error) {
    throw new Error(result.error);
  }

  // Map source-specific shapes to raw_post rows
  const rows: Parameters<typeof storage.storeRawPosts>[0] = [];
  for (const p of result.posts) {
    if (name === "reddit") {
      rows.push({
        sourceType: "reddit", title: p.title, body: p.body || p.title,
        url: p.url, publishedAt: p.createdAt,
        engagement: { score: p.score, comments: p.comments },
        metadata: { subreddit: p.subreddit, flair: p.flair },
      });
    } else if (name === "twitter") {
      rows.push({
        sourceType: "twitter", body: p.text, author: p.author, url: p.url,
        publishedAt: p.createdAt,
        engagement: { likes: p.likes, retweets: p.retweets, replies: p.replies },
        metadata: { provinceTag: p.provinceTag, authorLocation: p.authorLocation },
      });
    } else if (name === "bluesky") {
      rows.push({
        sourceType: "bluesky", body: p.text, author: p.author, url: p.url,
        publishedAt: p.createdAt,
        engagement: { likes: p.likes, reposts: p.reposts, replies: p.replies, quotes: p.quotes },
        metadata: { provinceTag: p.provinceTag, displayName: p.displayName, langs: p.langs },
      });
    } else if (name === "reliefweb") {
      rows.push({
        sourceType: "reliefweb", title: p.title, body: p.body || p.title,
        url: p.url, metadata: { theme: p.theme },
      });
    } else if (name === "pmg") {
      rows.push({
        sourceType: "pmg", title: p.title, body: p.body || p.title,
        url: p.url, metadata: { committee: p.committee },
      });
    }
  }

  let stored = 0;
  if (rows.length > 0) {
    stored = await storage.storeRawPosts(rows, today);
  }

  // Update source row
  const activeSources = await storage.getActiveSources();
  const srcRow = activeSources.find((s) => s.type === name);
  if (srcRow) {
    const status = result.posts.length === 0 ? "empty" : "success";
    await db.update(source).set({
      lastRun: new Date(),
      lastRunStatus: status as any,
      lastRunCost: result.cost || 0,
      postsRetrieved: result.posts.length,
    }).where(eq(source.id, srcRow.id));
  }

  // Accumulate cost & sourcesRun on the cycle log
  const log = await storage.getCycleLogById(cycleLogId);
  if (log) {
    await storage.updateCycleLog(cycleLogId, {
      totalCost: (log.totalCost || 0) + (result.cost || 0),
      sourcesRun: (log.sourcesRun || 0) + 1,
    });
  }

  return { detail: `${result.posts.length} fetched, ${stored} stored` };
}

async function runSummariseStep(cycleLogId: string): Promise<StepResult> {
  const today = new Date().toISOString().split("T")[0];
  const rawPosts = await storage.getRawPostsByDate(today);
  if (rawPosts.length === 0) {
    throw new Error("No raw posts to summarise");
  }

  const existingSummaries = await storage.getSummariesByDate(today);
  const summarisedIds = new Set(existingSummaries.map((s: any) => s.rawPostId));
  const unsummarised = rawPosts.filter((p: any) => !summarisedIds.has(p.id));

  if (unsummarised.length === 0) {
    return { detail: `${existingSummaries.length} summaries (cached)` };
  }

  // Build batches for remaining posts
  const batches = buildBatches(unsummarised as any);
  const batchesToRun = batches.slice(0, SUMMARISE_BATCHES_PER_ADVANCE);

  let summariesStored = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  for (let i = 0; i < batchesToRun.length; i++) {
    try {
      const batchResult = await summariseBatch(batchesToRun[i], i);
      inputTokens += batchResult.inputTokens;
      outputTokens += batchResult.outputTokens;

      const rows = batchResult.summaries.map((s) => ({
        date: today,
        rawPostId: s.rawPostId,
        provinceId: s.provinceId,
        sourceType: s.sourceType as any,
        themes: s.themes,
        emotion: s.emotion as any,
        intensity: s.intensity,
        signalStrength: s.signalStrength,
        voiceWorthy: s.voiceWorthy,
        voiceText: s.voiceText,
        voiceAttribution: s.voiceAttribution,
      }));
      await storage.storeSummaries(rows);
      summariesStored += rows.length;
    } catch (err: any) {
      console.error(`[summarise] batch ${i + 1} failed:`, err.message);
    }
  }

  const cost = estimateHaikuCost(inputTokens, outputTokens);
  const log = await storage.getCycleLogById(cycleLogId);
  if (log) {
    await storage.updateCycleLog(cycleLogId, {
      totalCost: (log.totalCost || 0) + cost,
    });
  }

  // Check if more batches remain
  const remaining = batches.length - batchesToRun.length;
  if (remaining > 0) {
    return {
      detail: `${existingSummaries.length + summariesStored}/${rawPosts.length} summarised (${remaining} batches left)`,
      stayOnStep: true,
    };
  }

  const finalCount = existingSummaries.length + summariesStored;
  return { detail: `${finalCount} summaries, $${cost.toFixed(4)}` };
}

async function runSynthesiseStep(cycleLogId: string): Promise<StepResult> {
  const today = new Date().toISOString().split("T")[0];
  const summaries = await storage.getSummariesByDate(today);
  if (summaries.length === 0) throw new Error("No summaries to synthesise");
  const rawPosts = await storage.getRawPostsByDate(today);

  const analysis = await synthesiseWorld(summaries as any, rawPosts.length);
  const cost = estimateCost(analysis.inputTokens, analysis.outputTokens);

  const activeSources = await storage.getActiveSources();
  const sourceIds = activeSources.map((s) => s.id);

  await storage.createWorldSnapshot({
    date: today,
    sourceIds,
    fieldState: analysis.fieldState,
    nationalEmotion: analysis.nationalEmotion,
    nationalIntensity: analysis.nationalIntensity,
    nationalConsensus: analysis.nationalConsensus,
    provinces: analysis.provinces,
    totalPostsAnalysed: rawPosts.length,
    analysisCost: cost,
  });

  const log = await storage.getCycleLogById(cycleLogId);
  if (log) {
    await storage.updateCycleLog(cycleLogId, {
      totalCost: (log.totalCost || 0) + cost,
    });
  }

  return { detail: `$${cost.toFixed(4)} (${analysis.inputTokens} in, ${analysis.outputTokens} out)` };
}

async function runPersonaliseStep(cycleLogId: string): Promise<StepResult> {
  const today = new Date().toISOString().split("T")[0];
  const snapshot = await storage.getLatestSnapshot();
  if (!snapshot || snapshot.date !== today) throw new Error("No snapshot for today");
  const persons = await storage.getAllActivePersons();
  let processed = 0;
  for (const p of persons) {
    try {
      await storage.createPersonWorld({
        personId: p.id,
        snapshotId: snapshot.id,
        date: today,
        weightedProvinces: snapshot.provinces as any,
        weightedThemes: null,
        personalDigest: snapshot.fieldState,
        personalQuestionContext: snapshot.fieldState,
      });
      processed++;
    } catch (err: any) {
      // likely duplicate — skip
    }
  }

  await storage.updateCycleLog(cycleLogId, { personsProcessed: processed });
  return { detail: `${processed} persons` };
}

async function runFinaliseStep(cycleLogId: string): Promise<StepResult> {
  const log = await storage.getCycleLogById(cycleLogId);
  const total = log?.totalCost || 0;
  return { detail: `Done — $${total.toFixed(4)}` };
}

// ─── Helpers ─────────────────────────────────────────────────

function buildInitialSteps(mode: CycleMode): StepState[] {
  const steps: StepState[] = ALL_STEPS.map((name) => ({ name, status: "pending" as StepStatus }));

  if (mode === "fetch-only") {
    for (const s of steps) {
      if (["summarise", "synthesise", "personalise", "finalise"].includes(s.name)) {
        s.status = "skipped";
      }
    }
    // Add a finalise step back in for fetch-only — still need to mark cycle complete.
    // Actually we can leave finalise as skipped; advanceCycle auto-completes.
  } else if (mode === "resummarize") {
    for (const s of steps) {
      if (SOURCE_STEPS.includes(s.name as any)) s.status = "skipped";
    }
  } else if (mode === "resynthesize") {
    for (const s of steps) {
      if (SOURCE_STEPS.includes(s.name as any) || s.name === "summarise") s.status = "skipped";
    }
  }

  return steps;
}
