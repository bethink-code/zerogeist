/**
 * Daily Cycle — 3-Stage Pipeline
 *
 * Stage 1: FETCH & STORE — raw posts saved to raw_post table
 * Stage 2: SUMMARISE — Haiku processes posts in batches → post_summary table
 * Stage 3: SYNTHESISE — Sonnet reads summaries → world_snapshot
 * Stage 4: PERSONALISE — person_world records
 * Stage 5: FINALISE — cost logging
 */

import { fetchReddit } from "./sources/reddit.js";
import { fetchReliefWeb } from "./sources/reliefweb.js";
import { fetchPMG } from "./sources/pmg.js";
import { fetchTwitter } from "./sources/apify.js";
import { fetchBluesky } from "./sources/bluesky.js";
import { summariseAll } from "./sources/summarise.js";
import { synthesiseWorld, estimateCost, estimateHaikuCost } from "./sources/synthesise.js";
import * as storage from "./storage.js";
import { db } from "./db.js";
import { source } from "../shared/schema.js";
import { eq } from "drizzle-orm";

let cycleRunning = false;

// Live status for the UI to poll
export interface CycleProgress {
  step: string;
  detail: string;
  startedAt: number;
  steps: { name: string; status: "pending" | "running" | "done" | "failed"; detail?: string }[];
}

let currentProgress: CycleProgress | null = null;

export function getCycleProgress(): CycleProgress | null {
  return currentProgress;
}

function setStep(stepName: string, detail: string) {
  if (!currentProgress) return;
  currentProgress.step = stepName;
  currentProgress.detail = detail;
  for (const s of currentProgress.steps) {
    if (s.name === stepName) {
      s.status = "running";
      s.detail = detail;
    }
  }
  console.log(`[cycle] ${stepName}: ${detail}`);
}

function completeStep(stepName: string, detail?: string) {
  if (!currentProgress) return;
  for (const s of currentProgress.steps) {
    if (s.name === stepName) {
      s.status = "done";
      if (detail) s.detail = detail;
    }
  }
}

function failStep(stepName: string, detail: string) {
  if (!currentProgress) return;
  for (const s of currentProgress.steps) {
    if (s.name === stepName) {
      s.status = "failed";
      s.detail = detail;
    }
  }
}

export type CycleMode = "full" | "fetch-only" | "resummarize" | "resynthesize";

export async function runDailyCycle(mode: CycleMode = "full"): Promise<void> {
  if (cycleRunning) {
    console.log("[cycle] Already running, skipping.");
    return;
  }

  cycleRunning = true;
  const today = new Date().toISOString().split("T")[0];
  console.log(`[cycle] Starting daily cycle for ${today} (mode: ${mode})`);

  // Check if cycle already ran today
  const existing = await storage.getTodaysCycleLog();

  // Check existing raw posts — used for smart per-source fetching
  const existingRawPosts = await storage.getRawPostsByDate(today);
  const existingSourceTypes = new Set(existingRawPosts.map((p: any) => p.sourceType));
  const allSourceTypes = ["reddit", "twitter", "bluesky", "reliefweb", "pmg"];
  const missingSourceTypes = allSourceTypes.filter((s) => !existingSourceTypes.has(s));

  // In full mode, skip if already completed AND no missing sources
  if (mode === "full" && existing && existing.status === "completed" && missingSourceTypes.length === 0) {
    console.log("[cycle] Already completed today, all sources present, skipping.");
    cycleRunning = false;
    return;
  }

  if (mode === "full" && existing && existing.status === "completed" && missingSourceTypes.length > 0) {
    console.log(`[cycle] Completed but missing sources: ${missingSourceTypes.join(", ")} — re-running fetch`);
  }

  // Determine which sources need fetching
  const skipFetch = mode === "resummarize" || mode === "resynthesize";

  function shouldFetchSource(sourceType: string): boolean {
    if (skipFetch) return false;
    if (mode === "fetch-only" || mode === "full") {
      // Fetch if this source has no posts today
      return !existingSourceTypes.has(sourceType);
    }
    return true;
  }

  if (skipFetch && existingRawPosts.length === 0) {
    console.log(`[cycle] No raw posts to ${mode}, aborting.`);
    cycleRunning = false;
    return;
  }

  const sourcesToFetch = ["reddit", "twitter", "bluesky", "reliefweb", "pmg"].filter(shouldFetchSource);
  if (sourcesToFetch.length > 0) {
    console.log(`[cycle] Sources to fetch: ${sourcesToFetch.join(", ")}`);
  } else if (!skipFetch) {
    console.log(`[cycle] All sources already have posts — skipping to ${mode === "fetch-only" ? "done" : "summarise"}`);
  }

  const cycleLog = existing || await storage.createCycleLog({
    date: today,
    status: "in_progress",
    sourcesRun: 0,
    personsProcessed: 0,
    totalCost: 0,
  });

  if (existing) {
    await storage.updateCycleLog(cycleLog.id, { status: "in_progress" });
  }

  currentProgress = {
    step: "starting",
    detail: "Initialising daily cycle...",
    startedAt: Date.now(),
    steps: [
      { name: "reddit", status: "pending" },
      { name: "twitter", status: "pending" },
      { name: "bluesky", status: "pending" },
      { name: "reliefweb", status: "pending" },
      { name: "pmg", status: "pending" },
      { name: "store", status: "pending" },
      { name: "summarise", status: "pending" },
      { name: "synthesise", status: "pending" },
      { name: "personalise", status: "pending" },
      { name: "finalise", status: "pending" },
    ],
  };

  let totalCost = 0;
  let sourcesRun = 0;

  try {
    // Prune old data (30 days)
    await storage.pruneOldRawPosts(30);

    // ─── FETCH — per-source, skip if already have posts ───────
    const fetch = shouldFetchSource;

    let redditResult = { posts: [] as any[], error: null as string | null };
    let twitterResult = { posts: [] as any[], error: null as string | null, cost: 0 };
    let blueskyResult = { posts: [] as any[], error: null as string | null };
    let reliefwebResult = { posts: [] as any[], error: null as string | null };
    let pmgResult = { posts: [] as any[], error: null as string | null };

    if (fetch("reddit")) {
      setStep("reddit", "Fetching Reddit posts...");
      redditResult = await fetchReddit();
      completeStep("reddit", `${redditResult.posts.length} posts`);
    } else {
      completeStep("reddit", "skipped (already fetched)");
    }

    if (fetch("twitter")) {
      setStep("twitter", "Scraping Twitter via Apify...");
      twitterResult = await fetchTwitter();
      totalCost += twitterResult.cost || 0;
      completeStep("twitter", `${twitterResult.posts.length} tweets`);
    } else {
      completeStep("twitter", "skipped (already fetched)");
    }

    if (fetch("bluesky")) {
      setStep("bluesky", "Searching Bluesky...");
      blueskyResult = await fetchBluesky();
      completeStep("bluesky", `${blueskyResult.posts.length} posts`);
    } else {
      completeStep("bluesky", "skipped (already fetched)");
    }

    if (fetch("reliefweb")) {
      setStep("reliefweb", "Fetching ReliefWeb reports...");
      reliefwebResult = await fetchReliefWeb();
      completeStep("reliefweb", `${reliefwebResult.posts.length} reports`);
    } else {
      completeStep("reliefweb", "skipped (already fetched)");
    }

    if (fetch("pmg")) {
      setStep("pmg", "Fetching PMG committee meetings...");
      pmgResult = await fetchPMG();
      completeStep("pmg", `${pmgResult.posts.length} items`);
    } else {
      completeStep("pmg", "skipped (already fetched)");
    }

    // Update source records for sources that were fetched
    const activeSources = await storage.getActiveSources();
    const fetchResults: Record<string, { posts: any[]; error: string | null }> = {
      reddit: redditResult, twitter: twitterResult, bluesky: blueskyResult,
      reliefweb: reliefwebResult, pmg: pmgResult,
    };

    for (const s of activeSources) {
      const result = fetchResults[s.type];
      if (!result || !fetch(s.type)) continue;

      const postsRetrieved = result.posts.length;
      const status = result.error ? "failed" : postsRetrieved === 0 ? "empty" : "success";

      await db.update(source).set({
        lastRun: new Date(),
        lastRunStatus: status as any,
        lastRunCost: 0,
        postsRetrieved,
      }).where(eq(source.id, s.id));
      sourcesRun++;
    }

    // ─── STORE NEW RAW POSTS ────────────────────────────────
    const rawPosts: Parameters<typeof storage.storeRawPosts>[0] = [];

    for (const p of redditResult.posts) {
      rawPosts.push({
        sourceType: "reddit", title: p.title, body: p.body || p.title,
        author: undefined, url: p.url, publishedAt: p.createdAt,
        engagement: { score: p.score, comments: p.comments },
        metadata: { subreddit: p.subreddit, flair: p.flair },
      });
    }

    for (const p of twitterResult.posts) {
      rawPosts.push({
        sourceType: "twitter", body: p.text, author: p.author, url: p.url,
        publishedAt: p.createdAt,
        engagement: { likes: p.likes, retweets: p.retweets, replies: p.replies },
        metadata: { provinceTag: p.provinceTag, authorLocation: p.authorLocation },
      });
    }

    for (const p of blueskyResult.posts) {
      rawPosts.push({
        sourceType: "bluesky", body: p.text, author: p.author, url: p.url,
        publishedAt: p.createdAt,
        engagement: { likes: p.likes, reposts: p.reposts, replies: p.replies, quotes: p.quotes },
        metadata: { provinceTag: p.provinceTag, displayName: p.displayName, langs: p.langs },
      });
    }

    for (const p of reliefwebResult.posts) {
      rawPosts.push({
        sourceType: "reliefweb", title: p.title, body: p.body || p.title,
        url: p.url, metadata: { theme: p.theme },
      });
    }

    for (const p of pmgResult.posts) {
      rawPosts.push({
        sourceType: "pmg", title: p.title, body: p.body || p.title,
        url: p.url, metadata: { committee: p.committee },
      });
    }

    if (rawPosts.length > 0) {
      setStep("store", `Storing ${rawPosts.length} new raw posts...`);
      const storedCount = await storage.storeRawPosts(rawPosts, today);
      completeStep("store", `${storedCount} stored`);
    } else {
      completeStep("store", "no new posts to store");
    }

    // If fetch-only mode, stop here
    if (mode === "fetch-only") {
      await storage.updateCycleLog(cycleLog.id, {
        status: "completed", completedAt: new Date(), sourcesRun, totalCost,
      });
      cycleRunning = false;
      currentProgress = null;
      console.log(`[cycle] Fetch-only complete. ${rawPosts.length} new posts stored.`);
      return;
    }

    // Check we have SOME posts (existing + new) before continuing
    const allPostsCount = existingRawPosts.length + rawPosts.length;
    if (allPostsCount === 0) {
      failStep("store", "No posts available");
      await storage.updateCycleLog(cycleLog.id, {
        status: "failed", failedAtStep: "fetch_sources", completedAt: new Date(), sourcesRun,
      });
      cycleRunning = false;
      currentProgress = null;
      return;
    }

    // ─── STAGE 2: SUMMARISE ─────────────────────────────────
    setStep("summarise", "Loading raw posts for summarisation...");

    const rawPostRows = await storage.getRawPostsByDate(today);

    // If resummarize mode, clear existing summaries + snapshot first
    if (mode === "resummarize") {
      console.log("[cycle] Resummarize mode — clearing existing summaries and snapshot");
      await storage.clearTodaysSummaries();
      await storage.clearTodaysSnapshot();
    }

    // If resynthesize mode, or if we're re-running with new data, clear snapshot
    if (mode === "resynthesize" || (existing && existing.status === "completed")) {
      console.log("[cycle] Clearing existing snapshot for re-synthesis");
      await storage.clearTodaysSnapshot();
    }

    // Check if ALL posts have been summarised
    const existingSummaries = await storage.getSummariesByDate(today);
    const summarisedPostIds = new Set(existingSummaries.map((s: any) => s.rawPostId));
    const unsummarisedPosts = rawPostRows.filter((p: any) => !summarisedPostIds.has(p.id));

    if (existingSummaries.length > 0 && unsummarisedPosts.length === 0 && mode !== "resummarize") {
      console.log(`[cycle] All ${rawPostRows.length} posts already summarised — skipping to synthesise`);
      completeStep("summarise", `${existingSummaries.length} summaries (cached)`);

      // Jump to synthesis with existing summaries
      setStep("synthesise", `Synthesising from ${existingSummaries.length} cached summaries (Sonnet)...`);
      const analysis = await synthesiseWorld(existingSummaries as any, rawPostRows.length);
      const sonnetCost = estimateCost(analysis.inputTokens, analysis.outputTokens);
      totalCost += sonnetCost;
      completeStep("synthesise", `$${sonnetCost.toFixed(4)}`);

      const activeSources = await storage.getActiveSources();
      const sourceIds = activeSources.map((s) => s.id);
      const snapshot = await storage.createWorldSnapshot({
        date: today, sourceIds,
        fieldState: analysis.fieldState, nationalEmotion: analysis.nationalEmotion,
        nationalIntensity: analysis.nationalIntensity, nationalConsensus: analysis.nationalConsensus,
        provinces: analysis.provinces, totalPostsAnalysed: rawPostRows.length,
        analysisCost: sonnetCost,
      });

      setStep("personalise", "Generating personalised world views...");
      const persons = await storage.getAllActivePersons();
      let personsProcessed = 0;
      for (const p of persons) {
        try {
          await storage.createPersonWorld({
            personId: p.id, snapshotId: snapshot.id, date: today,
            weightedProvinces: analysis.provinces, weightedThemes: null,
            personalDigest: analysis.fieldState, personalQuestionContext: analysis.fieldState,
          });
          personsProcessed++;
        } catch (err: any) { /* skip */ }
      }
      completeStep("personalise", `${personsProcessed} persons`);

      setStep("finalise", `Total cost: $${totalCost.toFixed(4)}`);
      await storage.updateCycleLog(cycleLog.id, {
        status: "completed", completedAt: new Date(), totalCost, sourcesRun, personsProcessed,
      });
      completeStep("finalise", `Done — $${totalCost.toFixed(4)}`);
      cycleRunning = false;
      currentProgress = null;
      return;
    }

    // Only summarise posts that don't have summaries yet
    const postsToSummarise = unsummarisedPosts.length > 0 ? unsummarisedPosts : rawPostRows;
    const label = unsummarisedPosts.length > 0 && unsummarisedPosts.length < rawPostRows.length
      ? `Summarising ${unsummarisedPosts.length} new posts (${existingSummaries.length} already done)`
      : `Summarising ${postsToSummarise.length} posts in batches (Haiku)`;
    setStep("summarise", `${label}...`);

    const { summaries, totalInputTokens: sumIn, totalOutputTokens: sumOut } = await summariseAll(
      postsToSummarise as any,
      (batchIndex, total, count) => {
        if (currentProgress) {
          const step = currentProgress.steps.find((s) => s.name === "summarise");
          if (step) step.detail = `Batch ${batchIndex}/${total} (${count} summaries)`;
        }
      }
    );

    // Store summaries
    const summaryRows = summaries.map((s) => ({
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

    await storage.storeSummaries(summaryRows);

    const haikuCost = estimateHaikuCost(sumIn, sumOut);
    totalCost += haikuCost;
    completeStep("summarise", `${summaries.length} summaries, $${haikuCost.toFixed(4)} (${sumIn} in, ${sumOut} out)`);

    // ─── STAGE 3: SYNTHESISE ────────────────────────────────
    setStep("synthesise", `Synthesising world snapshot from ${summaries.length} summaries (Sonnet)...`);

    const analysis = await synthesiseWorld(summaries as any, rawPostRows.length);
    const sonnetCost = estimateCost(analysis.inputTokens, analysis.outputTokens);
    totalCost += sonnetCost;

    completeStep("synthesise", `$${sonnetCost.toFixed(4)} (${analysis.inputTokens} in, ${analysis.outputTokens} out)`);

    // Store snapshot
    const activeSources2 = await storage.getActiveSources();
    const sourceIds = activeSources2.map((s) => s.id);
    const snapshot = await storage.createWorldSnapshot({
      date: today,
      sourceIds,
      fieldState: analysis.fieldState,
      nationalEmotion: analysis.nationalEmotion,
      nationalIntensity: analysis.nationalIntensity,
      nationalConsensus: analysis.nationalConsensus,
      provinces: analysis.provinces,
      totalPostsAnalysed: rawPostRows.length,
      analysisCost: haikuCost + sonnetCost,
    });

    console.log(`[cycle] World snapshot stored: ${snapshot.id}`);

    // ─── STAGE 4: PERSONALISE ───────────────────────────────
    setStep("personalise", "Generating personalised world views...");

    const persons = await storage.getAllActivePersons();
    let personsProcessed = 0;

    for (const p of persons) {
      try {
        await storage.createPersonWorld({
          personId: p.id,
          snapshotId: snapshot.id,
          date: today,
          weightedProvinces: analysis.provinces,
          weightedThemes: null,
          personalDigest: analysis.fieldState,
          personalQuestionContext: analysis.fieldState,
        });
        personsProcessed++;
      } catch (err: any) {
        console.error(`[cycle] Failed to create person_world for ${p.id}: ${err.message}`);
      }
    }

    completeStep("personalise", `${personsProcessed} persons`);

    // ─── STAGE 5: FINALISE ──────────────────────────────────
    setStep("finalise", `Total cost: $${totalCost.toFixed(4)}`);

    await storage.updateCycleLog(cycleLog.id, {
      status: "completed",
      completedAt: new Date(),
      totalCost,
      sourcesRun,
      personsProcessed,
    });

    completeStep("finalise", `Done — $${totalCost.toFixed(4)}`);
    console.log(`[cycle] Daily cycle complete for ${today}`);
  } catch (err: any) {
    console.error(`[cycle] Daily cycle failed:`, err);
    failStep(currentProgress?.step || "unknown", err.message?.slice(0, 200) || "unknown");
    await storage.updateCycleLog(cycleLog.id, {
      status: "failed",
      failedAtStep: err.message?.slice(0, 200) || "unknown",
      completedAt: new Date(),
      totalCost,
      sourcesRun,
    });
  } finally {
    cycleRunning = false;
    currentProgress = null;
  }
}
