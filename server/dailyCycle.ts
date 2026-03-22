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

export async function runDailyCycle(): Promise<void> {
  if (cycleRunning) {
    console.log("[cycle] Already running, skipping.");
    return;
  }

  cycleRunning = true;
  const today = new Date().toISOString().split("T")[0];
  console.log(`[cycle] Starting daily cycle for ${today}`);

  // Check if cycle already ran today
  const existing = await storage.getTodaysCycleLog();
  if (existing && existing.status === "completed") {
    console.log("[cycle] Already completed today, skipping.");
    cycleRunning = false;
    return;
  }

  // Check if we can resume from stored raw posts (skip fetch to save money)
  const existingRawPosts = await storage.getRawPostsByDate(today);
  const resumeFromStore = existingRawPosts.length > 0;
  if (resumeFromStore) {
    console.log(`[cycle] Found ${existingRawPosts.length} stored raw posts for today — skipping fetch, resuming from summarise`);
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

    if (resumeFromStore) {
      // Skip fetch — mark steps as done with cached counts
      for (const step of ["reddit", "twitter", "reliefweb", "pmg", "store"]) {
        completeStep(step, "skipped (cached)");
      }
    } else {
    // ─── FETCH ──────────────────────────────────────────────
    setStep("reddit", "Fetching Reddit posts...");
    const redditResult = await fetchReddit();
    completeStep("reddit", `${redditResult.posts.length} posts`);

    setStep("twitter", "Scraping Twitter via Apify...");
    const twitterResult = await fetchTwitter();
    totalCost += twitterResult.cost || 0;
    completeStep("twitter", `${twitterResult.posts.length} tweets`);

    setStep("reliefweb", "Fetching ReliefWeb reports...");
    const reliefwebResult = await fetchReliefWeb();
    completeStep("reliefweb", `${reliefwebResult.posts.length} reports`);

    setStep("pmg", "Fetching PMG committee meetings...");
    const pmgResult = await fetchPMG();
    completeStep("pmg", `${pmgResult.posts.length} items`);

    // Update source records
    const activeSources = await storage.getActiveSources();
    for (const s of activeSources) {
      let status: "success" | "failed" | "rate_limited" | "empty" = "success";
      let postsRetrieved = 0;

      if (s.type === "reddit") {
        postsRetrieved = redditResult.posts.length;
        status = redditResult.error ? "failed" : postsRetrieved === 0 ? "empty" : "success";
      } else if (s.type === "reliefweb") {
        postsRetrieved = reliefwebResult.posts.length;
        status = reliefwebResult.error ? "failed" : postsRetrieved === 0 ? "empty" : "success";
      } else if (s.type === "pmg") {
        postsRetrieved = pmgResult.posts.length;
        status = pmgResult.error ? "failed" : postsRetrieved === 0 ? "empty" : "success";
      } else if (s.type === "twitter") {
        postsRetrieved = twitterResult.posts.length;
        status = twitterResult.error ? "failed" : postsRetrieved === 0 ? "empty" : "success";
      }

      await db.update(source).set({
        lastRun: new Date(),
        lastRunStatus: status,
        lastRunCost: 0,
        postsRetrieved,
      }).where(eq(source.id, s.id));
      sourcesRun++;
    }

    const totalPosts = redditResult.posts.length + twitterResult.posts.length +
      reliefwebResult.posts.length + pmgResult.posts.length;

    if (totalPosts === 0) {
      failStep("store", "No posts fetched");
      await storage.updateCycleLog(cycleLog.id, {
        status: "failed", failedAtStep: "fetch_sources", completedAt: new Date(), sourcesRun,
      });
      cycleRunning = false;
      currentProgress = null;
      return;
    }

    // ─── STAGE 1: STORE RAW POSTS ───────────────────────────
    setStep("store", `Storing ${totalPosts} raw posts...`);

    // Convert fetcher results to raw post format
    const rawPosts: Parameters<typeof storage.storeRawPosts>[0] = [];

    for (const p of redditResult.posts) {
      rawPosts.push({
        sourceType: "reddit",
        title: p.title,
        body: p.body || p.title,
        author: undefined,
        url: p.url,
        publishedAt: p.createdAt,
        engagement: { score: p.score, comments: p.comments },
        metadata: { subreddit: p.subreddit, flair: p.flair },
      });
    }

    for (const p of twitterResult.posts) {
      rawPosts.push({
        sourceType: "twitter",
        body: p.text,
        author: p.author,
        url: p.url,
        publishedAt: p.createdAt,
        engagement: { likes: p.likes, retweets: p.retweets, replies: p.replies },
        metadata: { provinceTag: p.provinceTag, authorLocation: p.authorLocation },
      });
    }

    for (const p of reliefwebResult.posts) {
      rawPosts.push({
        sourceType: "reliefweb",
        title: p.title,
        body: p.body || p.title,
        url: p.url,
        metadata: { theme: p.theme },
      });
    }

    for (const p of pmgResult.posts) {
      rawPosts.push({
        sourceType: "pmg",
        title: p.title,
        body: p.body || p.title,
        url: p.url,
        metadata: { committee: p.committee },
      });
    }

    const storedCount = await storage.storeRawPosts(rawPosts, today);
    completeStep("store", `${storedCount} stored`);
    } // end of fetch block

    // ─── STAGE 2: SUMMARISE ─────────────────────────────────
    setStep("summarise", "Loading raw posts for summarisation...");

    const rawPostRows = await storage.getRawPostsByDate(today);

    // Check if summaries already exist (resume scenario)
    const existingSummaries = await storage.getSummariesByDate(today);
    if (existingSummaries.length > 0) {
      console.log(`[cycle] Found ${existingSummaries.length} existing summaries — skipping to synthesise`);
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
        nationalDigest: analysis.nationalDigest, nationalEmotion: analysis.nationalEmotion,
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
            personalDigest: analysis.nationalDigest, personalQuestionContext: analysis.nationalDigest,
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

    setStep("summarise", `Summarising ${rawPostRows.length} posts in batches (Haiku)...`);

    const { summaries, totalInputTokens: sumIn, totalOutputTokens: sumOut } = await summariseAll(
      rawPostRows as any,
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
      nationalDigest: analysis.nationalDigest,
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
          personalDigest: analysis.nationalDigest,
          personalQuestionContext: analysis.nationalDigest,
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
