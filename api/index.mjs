var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  answerToneEnum: () => answerToneEnum,
  dailyCycleLog: () => dailyCycleLog,
  emotionEnum: () => emotionEnum,
  invitedPerson: () => invitedPerson,
  person: () => person,
  personSource: () => personSource,
  personWorld: () => personWorld,
  postSummary: () => postSummary,
  proxy: () => proxy,
  proxyEdit: () => proxyEdit,
  proxyEditFieldEnum: () => proxyEditFieldEnum,
  question: () => question,
  questionTerritoryEnum: () => questionTerritoryEnum,
  rawPost: () => rawPost,
  sessions: () => sessions,
  source: () => source,
  sourceRegionEnum: () => sourceRegionEnum,
  sourceRunStatusEnum: () => sourceRunStatusEnum,
  sourceTypeEnum: () => sourceTypeEnum,
  systemPrompt: () => systemPrompt,
  worldSnapshot: () => worldSnapshot
});
import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  jsonb,
  real,
  integer,
  date,
  pgEnum
} from "drizzle-orm/pg-core";
var questionTerritoryEnum, answerToneEnum, sourceTypeEnum, sourceRegionEnum, sourceRunStatusEnum, proxyEditFieldEnum, emotionEnum, person, invitedPerson, proxy, question, worldSnapshot, personWorld, source, personSource, proxyEdit, rawPost, postSummary, systemPrompt, sessions, dailyCycleLog;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    questionTerritoryEnum = pgEnum("question_territory", [
      "values",
      "tension",
      "unknown",
      "blind_spot",
      "world"
    ]);
    answerToneEnum = pgEnum("answer_tone", [
      "analytical",
      "emotional",
      "resistant",
      "open",
      "brief"
    ]);
    sourceTypeEnum = pgEnum("source_type", [
      "reddit",
      "reliefweb",
      "pmg",
      "telegram",
      "rss",
      "twitter",
      "bluesky",
      "other"
    ]);
    sourceRegionEnum = pgEnum("source_region", [
      "national",
      "provincial",
      "local"
    ]);
    sourceRunStatusEnum = pgEnum("source_run_status", [
      "success",
      "failed",
      "rate_limited",
      "empty"
    ]);
    proxyEditFieldEnum = pgEnum("proxy_edit_field", [
      "values",
      "tensions",
      "unknowns",
      "blind_spots"
    ]);
    emotionEnum = pgEnum("emotion", [
      "anger",
      "hope",
      "fear",
      "joy",
      "grief"
    ]);
    person = pgTable("person", {
      id: text("id").primaryKey(),
      // Google OAuth sub
      email: text("email").notNull().unique(),
      name: text("name").notNull(),
      avatar: text("avatar"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      lastActive: timestamp("last_active").defaultNow().notNull(),
      onboardingComplete: boolean("onboarding_complete").default(false).notNull()
    });
    invitedPerson = pgTable("invited_person", {
      id: uuid("id").defaultRandom().primaryKey(),
      email: text("email").notNull().unique(),
      invitedBy: text("invited_by").references(() => person.id),
      invitedAt: timestamp("invited_at").defaultNow().notNull(),
      note: text("note"),
      firstLogin: timestamp("first_login"),
      lastLogin: timestamp("last_login"),
      loginCount: integer("login_count").default(0).notNull(),
      active: boolean("active").default(true).notNull(),
      personId: text("person_id").references(() => person.id)
    });
    proxy = pgTable("proxy", {
      id: uuid("id").defaultRandom().primaryKey(),
      personId: text("person_id").references(() => person.id).notNull().unique(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull(),
      values: jsonb("values").default([]).notNull(),
      tensions: jsonb("tensions").default([]).notNull(),
      unknowns: jsonb("unknowns").default([]).notNull(),
      blindSpots: jsonb("blind_spots").default([]).notNull(),
      overrides: jsonb("overrides").default([]).notNull(),
      confidenceScore: real("confidence_score").default(0).notNull(),
      daysActive: integer("days_active").default(0).notNull()
    });
    question = pgTable("question", {
      id: uuid("id").defaultRandom().primaryKey(),
      personId: text("person_id").references(() => person.id).notNull(),
      date: date("date").notNull(),
      generatedAt: timestamp("generated_at").defaultNow().notNull(),
      text: text("text").notNull(),
      territory: questionTerritoryEnum("territory").notNull(),
      depthLevel: integer("depth_level").notNull(),
      proxySnapshot: jsonb("proxy_snapshot"),
      weatherSnapshot: jsonb("weather_snapshot"),
      worldConnection: text("world_connection"),
      answeredAt: timestamp("answered_at"),
      answerText: text("answer_text"),
      answerTone: answerToneEnum("answer_tone"),
      answerLength: integer("answer_length"),
      extractedValues: jsonb("extracted_values"),
      extractedTensions: jsonb("extracted_tensions"),
      extractedUnknowns: jsonb("extracted_unknowns"),
      proxyUpdated: boolean("proxy_updated").default(false).notNull(),
      personCorrection: text("person_correction")
    });
    worldSnapshot = pgTable("world_snapshot", {
      id: uuid("id").defaultRandom().primaryKey(),
      date: date("date").notNull().unique(),
      generatedAt: timestamp("generated_at").defaultNow().notNull(),
      sourceIds: jsonb("source_ids").default([]).notNull(),
      fieldState: text("field_state"),
      nationalEmotion: jsonb("national_emotion"),
      nationalIntensity: real("national_intensity"),
      nationalConsensus: real("national_consensus"),
      provinces: jsonb("provinces").default([]).notNull(),
      totalPostsAnalysed: integer("total_posts_analysed").default(0).notNull(),
      analysisCost: real("analysis_cost").default(0).notNull()
    });
    personWorld = pgTable("person_world", {
      id: uuid("id").defaultRandom().primaryKey(),
      personId: text("person_id").references(() => person.id).notNull(),
      snapshotId: uuid("snapshot_id").references(() => worldSnapshot.id).notNull(),
      date: date("date").notNull(),
      weightedProvinces: jsonb("weighted_provinces"),
      weightedThemes: jsonb("weighted_themes"),
      personalDigest: text("personal_digest"),
      personalQuestionContext: text("personal_question_context")
    });
    source = pgTable("source", {
      id: uuid("id").defaultRandom().primaryKey(),
      name: text("name").notNull(),
      type: sourceTypeEnum("type").notNull(),
      identifier: text("identifier").notNull(),
      region: sourceRegionEnum("region").notNull(),
      province: text("province"),
      language: text("language").default("en").notNull(),
      active: boolean("active").default(true).notNull(),
      difficulty: integer("difficulty").default(1).notNull(),
      costPerRun: real("cost_per_run").default(0).notNull(),
      lastRun: timestamp("last_run"),
      lastRunStatus: sourceRunStatusEnum("last_run_status"),
      lastRunCost: real("last_run_cost"),
      postsRetrieved: integer("posts_retrieved"),
      signalQuality: integer("signal_quality").default(3).notNull(),
      notes: text("notes"),
      addedBy: text("added_by").references(() => person.id),
      addedAt: timestamp("added_at").defaultNow().notNull()
    });
    personSource = pgTable("person_source", {
      id: uuid("id").defaultRandom().primaryKey(),
      personId: text("person_id").references(() => person.id).notNull(),
      sourceId: uuid("source_id").references(() => source.id).notNull(),
      active: boolean("active").default(true).notNull(),
      weight: real("weight").default(1).notNull(),
      addedAt: timestamp("added_at").defaultNow().notNull()
    });
    proxyEdit = pgTable("proxy_edit", {
      id: uuid("id").defaultRandom().primaryKey(),
      personId: text("person_id").references(() => person.id).notNull(),
      editedAt: timestamp("edited_at").defaultNow().notNull(),
      field: proxyEditFieldEnum("field").notNull(),
      originalValue: jsonb("original_value"),
      correctedValue: jsonb("corrected_value"),
      reason: text("reason"),
      applied: boolean("applied").default(false).notNull()
    });
    rawPost = pgTable("raw_post", {
      id: uuid("id").defaultRandom().primaryKey(),
      date: date("date").notNull(),
      sourceType: sourceTypeEnum("source_type").notNull(),
      sourceId: uuid("source_id").references(() => source.id),
      externalId: text("external_id"),
      title: text("title"),
      body: text("body").notNull(),
      author: text("author"),
      url: text("url"),
      publishedAt: timestamp("published_at"),
      fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
      engagement: jsonb("engagement"),
      metadata: jsonb("metadata"),
      provinceHint: text("province_hint")
    });
    postSummary = pgTable("post_summary", {
      id: uuid("id").defaultRandom().primaryKey(),
      date: date("date").notNull(),
      rawPostId: uuid("raw_post_id").references(() => rawPost.id).notNull(),
      provinceId: text("province_id").notNull(),
      sourceType: sourceTypeEnum("source_type").notNull(),
      themes: jsonb("themes").notNull(),
      emotion: emotionEnum("emotion").notNull(),
      intensity: real("intensity").notNull(),
      signalStrength: real("signal_strength").notNull(),
      voiceWorthy: boolean("voice_worthy").default(false).notNull(),
      voiceText: text("voice_text"),
      voiceAttribution: text("voice_attribution"),
      batchId: text("batch_id")
    });
    systemPrompt = pgTable("system_prompt", {
      id: text("id").primaryKey(),
      // "haiku_summarise" | "sonnet_synthesise"
      name: text("name").notNull(),
      description: text("description"),
      prompt: text("prompt").notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull(),
      updatedBy: text("updated_by").references(() => person.id)
    });
    sessions = pgTable("session", {
      sid: text("sid").primaryKey(),
      sess: jsonb("sess").notNull(),
      expire: timestamp("expire", { precision: 6 }).notNull()
    });
    dailyCycleLog = pgTable("daily_cycle_log", {
      id: uuid("id").defaultRandom().primaryKey(),
      date: date("date").notNull().unique(),
      startedAt: timestamp("started_at").defaultNow().notNull(),
      completedAt: timestamp("completed_at"),
      status: text("status").default("in_progress").notNull(),
      failedAtStep: text("failed_at_step"),
      totalCost: real("total_cost").default(0).notNull(),
      sourcesRun: integer("sources_run").default(0).notNull(),
      personsProcessed: integer("persons_processed").default(0).notNull()
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  pool: () => pool
});
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
var pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    neonConfig.webSocketConstructor = ws;
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set");
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema: schema_exports });
  }
});

// server/storage.ts
import { eq as eq2, desc, and, lt } from "drizzle-orm";
async function listInvitedPersons() {
  return db.select().from(invitedPerson).orderBy(desc(invitedPerson.invitedAt));
}
async function addInvitedPerson(email, note, invitedBy) {
  const [result] = await db.insert(invitedPerson).values({ email, note, invitedBy }).returning();
  return result;
}
async function updateInvitedPerson(id, data) {
  const [result] = await db.update(invitedPerson).set(data).where(eq2(invitedPerson.id, id)).returning();
  return result;
}
async function getProxy(personId) {
  const [p] = await db.select().from(proxy).where(eq2(proxy.personId, personId));
  return p || null;
}
async function createProxy(personId) {
  const [p] = await db.insert(proxy).values({ personId }).returning();
  return p;
}
async function updateProxy(personId, data) {
  const [p] = await db.update(proxy).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(proxy.personId, personId)).returning();
  return p;
}
async function getTodaysQuestion(personId) {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const [q] = await db.select().from(question).where(and(eq2(question.personId, personId), eq2(question.date, today)));
  return q || null;
}
async function getLatestUnansweredQuestion(personId) {
  const [q] = await db.select().from(question).where(and(eq2(question.personId, personId))).orderBy(desc(question.date)).limit(1);
  if (q && !q.answeredAt) return q;
  return null;
}
async function submitAnswer(questionId, answerText) {
  const [q] = await db.update(question).set({
    answeredAt: /* @__PURE__ */ new Date(),
    answerText,
    answerLength: answerText.length
  }).where(eq2(question.id, questionId)).returning();
  return q;
}
async function submitQuestionCorrection(questionId, correction) {
  const [q] = await db.update(question).set({ personCorrection: correction }).where(eq2(question.id, questionId)).returning();
  return q;
}
async function getTodaysSnapshot() {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const [s] = await db.select().from(worldSnapshot).where(eq2(worldSnapshot.date, today));
  return s || null;
}
async function getSnapshotById(id) {
  const [s] = await db.select().from(worldSnapshot).where(eq2(worldSnapshot.id, id));
  return s || null;
}
async function getLatestSnapshot() {
  const [s] = await db.select().from(worldSnapshot).orderBy(desc(worldSnapshot.date)).limit(1);
  return s || null;
}
async function createWorldSnapshot(data) {
  const [s] = await db.insert(worldSnapshot).values(data).returning();
  return s;
}
async function getPersonWorldToday(personId) {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const [pw] = await db.select().from(personWorld).where(and(eq2(personWorld.personId, personId), eq2(personWorld.date, today)));
  if (pw) return pw;
  const [latest] = await db.select().from(personWorld).where(eq2(personWorld.personId, personId)).orderBy(desc(personWorld.date)).limit(1);
  return latest || null;
}
async function createPersonWorld(data) {
  const [pw] = await db.insert(personWorld).values(data).returning();
  return pw;
}
async function listSources() {
  return db.select().from(source).orderBy(source.name);
}
async function getActiveSources() {
  return db.select().from(source).where(eq2(source.active, true));
}
async function addSource(data) {
  const [s] = await db.insert(source).values(data).returning();
  return s;
}
async function updateSource(id, data) {
  const [s] = await db.update(source).set(data).where(eq2(source.id, id)).returning();
  return s;
}
async function createProxyEdit(data) {
  const [e] = await db.insert(proxyEdit).values(data).returning();
  return e;
}
async function getProxyEditHistory(personId) {
  return db.select().from(proxyEdit).where(eq2(proxyEdit.personId, personId)).orderBy(desc(proxyEdit.editedAt));
}
async function getTodaysCycleLog() {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const [log] = await db.select().from(dailyCycleLog).where(eq2(dailyCycleLog.date, today));
  return log || null;
}
async function getRecentCycleLogs(limit = 14) {
  return db.select().from(dailyCycleLog).orderBy(desc(dailyCycleLog.date)).limit(limit);
}
async function createCycleLog(data) {
  const [log] = await db.insert(dailyCycleLog).values(data).returning();
  return log;
}
async function updateCycleLog(id, data) {
  const [log] = await db.update(dailyCycleLog).set(data).where(eq2(dailyCycleLog.id, id)).returning();
  return log;
}
async function getActivePersonCount() {
  const persons = await db.select().from(person);
  return persons.length;
}
async function getActiveSourceCount() {
  const sources = await db.select().from(source).where(eq2(source.active, true));
  return sources.length;
}
async function getAllActivePersons() {
  return db.select().from(person);
}
async function getSystemPrompt(id) {
  const [row] = await db.select().from(systemPrompt).where(eq2(systemPrompt.id, id));
  return row || null;
}
async function getAllSystemPrompts() {
  return db.select().from(systemPrompt).orderBy(systemPrompt.id);
}
async function upsertSystemPrompt(id, data) {
  const existing = await getSystemPrompt(id);
  if (existing) {
    const [row2] = await db.update(systemPrompt).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(systemPrompt.id, id)).returning();
    return row2;
  }
  const [row] = await db.insert(systemPrompt).values({ id, ...data }).returning();
  return row;
}
function inferProvinceHint(post) {
  if (post.sourceType === "reddit" && post.metadata?.subreddit) {
    return PROVINCE_HINTS[post.metadata.subreddit.toLowerCase()] || null;
  }
  if (post.sourceType === "twitter" && post.metadata?.provinceTag) {
    return post.metadata.provinceTag;
  }
  if (post.sourceType === "twitter" && post.metadata?.authorLocation) {
    const loc = post.metadata.authorLocation.toLowerCase();
    for (const [keyword, province] of Object.entries(PROVINCE_HINTS)) {
      if (loc.includes(keyword)) return province;
    }
  }
  const text2 = ((post.title || "") + " " + (post.body || "")).toLowerCase();
  for (const [keyword, province] of Object.entries(PROVINCE_HINTS)) {
    if (text2.includes(keyword)) return province;
  }
  return null;
}
async function storeRawPosts(posts, date2) {
  let stored = 0;
  for (const post of posts) {
    try {
      const hint = inferProvinceHint(post);
      await db.insert(rawPost).values({
        date: date2,
        sourceType: post.sourceType,
        externalId: post.url || `${post.sourceType}-${Date.now()}-${stored}`,
        title: post.title || null,
        body: post.body.slice(0, 5e3),
        author: post.author || null,
        url: post.url || null,
        publishedAt: post.publishedAt || null,
        engagement: post.engagement || null,
        metadata: post.metadata || null,
        provinceHint: hint
      });
      stored++;
    } catch (err) {
      if (!err.message?.includes("duplicate") && !err.message?.includes("unique")) {
        console.error(`[storage] Failed to store raw post: ${err.message}`);
      }
    }
  }
  return stored;
}
async function getRawPostsByDate(date2) {
  return db.select().from(rawPost).where(eq2(rawPost.date, date2));
}
async function rescanProvinceHints(date2) {
  const posts = await db.select().from(rawPost).where(eq2(rawPost.date, date2));
  let updated = 0;
  for (const post of posts) {
    const newHint = inferProvinceHint({
      sourceType: post.sourceType,
      metadata: post.metadata,
      body: post.body,
      title: post.title || void 0
    });
    if (newHint !== post.provinceHint) {
      await db.update(rawPost).set({ provinceHint: newHint }).where(eq2(rawPost.id, post.id));
      updated++;
    }
  }
  return { updated, total: posts.length };
}
async function pruneOldRawPosts(daysToKeep = 30) {
  const cutoff = /* @__PURE__ */ new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);
  const cutoffDate = cutoff.toISOString().split("T")[0];
  await db.delete(postSummary).where(lt(postSummary.date, cutoffDate));
  await db.delete(rawPost).where(lt(rawPost.date, cutoffDate));
}
async function storeSummaries(summaries) {
  let stored = 0;
  for (const s of summaries) {
    await db.insert(postSummary).values(s);
    stored++;
  }
  return stored;
}
async function getSummariesByDate(date2) {
  return db.select().from(postSummary).where(eq2(postSummary.date, date2));
}
async function getPostCountsByProvince(date2) {
  const rows = await db.select({
    provinceId: postSummary.provinceId
  }).from(postSummary).where(eq2(postSummary.date, date2));
  const counts = /* @__PURE__ */ new Map();
  for (const r of rows) {
    counts.set(r.provinceId, (counts.get(r.provinceId) || 0) + 1);
  }
  return Object.fromEntries(counts);
}
async function getPostsForProvince(date2, provinceId) {
  return db.select({
    id: rawPost.id,
    title: rawPost.title,
    body: rawPost.body,
    author: rawPost.author,
    url: rawPost.url,
    sourceType: rawPost.sourceType,
    publishedAt: rawPost.publishedAt,
    fetchedAt: rawPost.fetchedAt,
    engagement: rawPost.engagement,
    metadata: rawPost.metadata,
    provinceId: postSummary.provinceId,
    themes: postSummary.themes,
    emotion: postSummary.emotion,
    intensity: postSummary.intensity,
    signalStrength: postSummary.signalStrength,
    voiceWorthy: postSummary.voiceWorthy,
    voiceText: postSummary.voiceText,
    voiceAttribution: postSummary.voiceAttribution
  }).from(rawPost).innerJoin(postSummary, eq2(rawPost.id, postSummary.rawPostId)).where(and(eq2(postSummary.date, date2), eq2(postSummary.provinceId, provinceId))).orderBy(desc(postSummary.signalStrength));
}
async function clearTodaysCycle() {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const [snapshot] = await db.select().from(worldSnapshot).where(eq2(worldSnapshot.date, today));
  if (snapshot) {
    await db.delete(personWorld).where(eq2(personWorld.snapshotId, snapshot.id));
    await db.delete(worldSnapshot).where(eq2(worldSnapshot.id, snapshot.id));
  }
  await db.delete(postSummary).where(eq2(postSummary.date, today));
  await db.delete(rawPost).where(eq2(rawPost.date, today));
  await db.delete(dailyCycleLog).where(eq2(dailyCycleLog.date, today));
}
async function clearFromSummarise() {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const [snapshot] = await db.select().from(worldSnapshot).where(eq2(worldSnapshot.date, today));
  if (snapshot) {
    await db.delete(personWorld).where(eq2(personWorld.snapshotId, snapshot.id));
    await db.delete(worldSnapshot).where(eq2(worldSnapshot.id, snapshot.id));
  }
  await db.delete(postSummary).where(eq2(postSummary.date, today));
  await db.delete(dailyCycleLog).where(eq2(dailyCycleLog.date, today));
}
async function clearFromSynthesise() {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const [snapshot] = await db.select().from(worldSnapshot).where(eq2(worldSnapshot.date, today));
  if (snapshot) {
    await db.delete(personWorld).where(eq2(personWorld.snapshotId, snapshot.id));
    await db.delete(worldSnapshot).where(eq2(worldSnapshot.id, snapshot.id));
  }
  await db.delete(dailyCycleLog).where(eq2(dailyCycleLog.date, today));
}
async function clearTodaysSummaries() {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  await db.delete(postSummary).where(eq2(postSummary.date, today));
}
async function clearTodaysSnapshot() {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const [snapshot] = await db.select().from(worldSnapshot).where(eq2(worldSnapshot.date, today));
  if (snapshot) {
    await db.delete(personWorld).where(eq2(personWorld.snapshotId, snapshot.id));
    await db.delete(worldSnapshot).where(eq2(worldSnapshot.id, snapshot.id));
  }
}
var PROVINCE_HINTS;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_db();
    init_schema();
    PROVINCE_HINTS = {
      // GP — Gauteng
      "johannesburg": "GP",
      "joburg": "GP",
      "jozi": "GP",
      "jhb": "GP",
      "soweto": "GP",
      "alexandra": "GP",
      "sandton": "GP",
      "randburg": "GP",
      "roodepoort": "GP",
      "boksburg": "GP",
      "benoni": "GP",
      "germiston": "GP",
      "pretoria": "GP",
      "tshwane": "GP",
      "centurion": "GP",
      "midrand": "GP",
      "hatfield": "GP",
      "sunnyside": "GP",
      "mabopane": "GP",
      "mamelodi": "GP",
      "steyn city": "GP",
      // WC — Western Cape
      "cape town": "WC",
      "kaapstad": "WC",
      "capetown": "WC",
      "stellenbosch": "WC",
      "paarl": "WC",
      "franschhoek": "WC",
      "george": "WC",
      "knysna": "WC",
      "worcester": "WC",
      "hermanus": "WC",
      "bellville": "WC",
      "durbanville": "WC",
      "mitchells plain": "WC",
      "khayelitsha": "WC",
      "table mountain": "WC",
      "cape flats": "WC",
      "sea point": "WC",
      "camps bay": "WC",
      // KZN — KwaZulu-Natal
      "durban": "KZN",
      "ethekwini": "KZN",
      "pietermaritzburg": "KZN",
      "pmb": "KZN",
      "umhlanga": "KZN",
      "ballito": "KZN",
      "richards bay": "KZN",
      "newcastle": "KZN",
      "ladysmith": "KZN",
      "margate": "KZN",
      "tongaat": "KZN",
      "pinetown": "KZN",
      "umlazi": "KZN",
      "king shaka": "KZN",
      // EC — Eastern Cape
      "gqeberha": "EC",
      "port elizabeth": "EC",
      "east london": "EC",
      "mthatha": "EC",
      "grahamstown": "EC",
      "makhanda": "EC",
      "butterworth": "EC",
      "king william's town": "EC",
      "bisho": "EC",
      "queenstown": "EC",
      // FS — Free State
      "bloemfontein": "FS",
      "mangaung": "FS",
      "welkom": "FS",
      "bethlehem": "FS",
      "kroonstad": "FS",
      // NW — North West
      "rustenburg": "NW",
      "mahikeng": "NW",
      "mafikeng": "NW",
      "klerksdorp": "NW",
      "potchefstroom": "NW",
      "brits": "NW",
      "hartbeespoort": "NW",
      // NC — Northern Cape
      "kimberley": "NC",
      "upington": "NC",
      "springbok": "NC",
      "de aar": "NC",
      // MP — Mpumalanga
      "nelspruit": "MP",
      "mbombela": "MP",
      "witbank": "MP",
      "emalahleni": "MP",
      "secunda": "MP",
      "middelburg": "MP",
      "white river": "MP",
      "hazyview": "MP",
      // LP — Limpopo
      "polokwane": "LP",
      "limpopo": "LP",
      "tzaneen": "LP",
      "musina": "LP",
      "thohoyandou": "LP",
      "bela-bela": "LP",
      "mokopane": "LP"
    };
  }
});

// server/sources/reddit.ts
async function fetchSubreddit(subreddit) {
  const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=25`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "zerogeist/1.0 (mzansi.zerogeist.me)"
    }
  });
  if (!res.ok) {
    console.error(`[reddit] Failed to fetch r/${subreddit}: ${res.status}`);
    return [];
  }
  const data = await res.json();
  const posts = data.data.children.map((c) => c.data);
  const now = Date.now();
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1e3;
  return posts.filter((p) => !p.selftext.includes("[removed]") && !p.selftext.includes("[deleted]")).map((p) => ({
    title: p.title,
    body: p.selftext.slice(0, 2e3),
    score: p.score,
    comments: p.num_comments,
    subreddit: p.subreddit,
    createdAt: new Date(p.created_utc * 1e3),
    url: `https://reddit.com${p.permalink}`,
    flair: p.link_flair_text,
    source: "reddit"
  })).filter((p) => now - p.createdAt.getTime() < SEVEN_DAYS);
}
async function fetchReddit() {
  const allPosts = [];
  const errors = [];
  for (const sub of SUBREDDITS) {
    try {
      const posts = await fetchSubreddit(sub);
      allPosts.push(...posts);
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err) {
      errors.push(`r/${sub}: ${err.message}`);
    }
  }
  return {
    posts: allPosts,
    error: errors.length > 0 ? errors.join("; ") : null
  };
}
var SUBREDDITS;
var init_reddit = __esm({
  "server/sources/reddit.ts"() {
    "use strict";
    SUBREDDITS = [
      "southafrica",
      "joburg",
      "capetown",
      "durban",
      "pretoria"
    ];
  }
});

// server/sources/reliefweb.ts
async function fetchReliefWeb() {
  try {
    const url = "https://api.reliefweb.int/v1/reports?appname=zerogeist&filter[field]=country.name&filter[value]=South Africa&limit=20&sort[]=date:desc&fields[include][]=title&fields[include][]=body&fields[include][]=date.original&fields[include][]=source.name&fields[include][]=url&fields[include][]=theme.name";
    const res = await fetch(url);
    if (!res.ok) {
      return { posts: [], error: `ReliefWeb API returned ${res.status}` };
    }
    const data = await res.json();
    const reports = (data.data || []).map((item) => {
      const fields = item.fields || {};
      return {
        title: fields.title || "",
        body: (fields.body || "").slice(0, 3e3),
        date: fields["date"]?.original || "",
        source: Array.isArray(fields.source) ? fields.source.map((s) => s.name).join(", ") : "",
        url: fields.url || `https://reliefweb.int/node/${item.id}`,
        theme: Array.isArray(fields.theme) ? fields.theme.map((t) => t.name).join(", ") : null,
        fetchedSource: "reliefweb"
      };
    });
    return { posts: reports, error: null };
  } catch (err) {
    return { posts: [], error: `ReliefWeb fetch failed: ${err.message}` };
  }
}
var init_reliefweb = __esm({
  "server/sources/reliefweb.ts"() {
    "use strict";
  }
});

// server/sources/pmg.ts
async function fetchPMG() {
  try {
    const url = "https://api.pmg.org.za/committee-meeting/?format=json&page_size=20";
    const res = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });
    if (!res.ok) {
      return { posts: [], error: `PMG API returned ${res.status}` };
    }
    const data = await res.json();
    const results = data.results || [];
    const items = results.map((item) => ({
      title: item.title || "",
      body: (item.summary || item.body || "").slice(0, 3e3),
      date: item.date || "",
      committee: item.committee?.name || "Unknown Committee",
      url: item.url || `https://pmg.org.za/committee-meeting/${item.id}/`,
      fetchedSource: "pmg"
    }));
    return { posts: items, error: null };
  } catch (err) {
    return { posts: [], error: `PMG fetch failed: ${err.message}` };
  }
}
var init_pmg = __esm({
  "server/sources/pmg.ts"() {
    "use strict";
  }
});

// server/sources/apify.ts
import fs from "fs";
import path from "path";
function getTodaySince() {
  const d = /* @__PURE__ */ new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().replace("T", "_").replace("Z", "_UTC").slice(0, 23) + "_UTC";
}
async function fetchTwitter() {
  if (!APIFY_TOKEN) {
    return { posts: [], error: "APIFY_API_KEY not configured", cost: 0 };
  }
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  if (dailyCostDate !== today) {
    dailyCostAccumulated = 0;
    dailyCostDate = today;
  }
  const timeSinceLastRun = Date.now() - lastRunTime;
  if (lastRunTime > 0 && timeSinceLastRun < MIN_RUN_INTERVAL_MS) {
    const waitMins = Math.ceil((MIN_RUN_INTERVAL_MS - timeSinceLastRun) / 6e4);
    console.log(`[apify] Rate limited \u2014 next run in ${waitMins}min, checking cache...`);
    const cached = loadTweetCache(today);
    if (cached) return { posts: cached, error: null, cost: 0 };
    return { posts: [], error: `Rate limited \u2014 next run in ${waitMins}min`, cost: 0 };
  }
  if (dailyCostAccumulated >= MAX_DAILY_COST) {
    console.log(`[apify] Daily budget cap reached, checking cache...`);
    const cached = loadTweetCache(today);
    if (cached) return { posts: cached, error: null, cost: 0 };
    return { posts: [], error: `Daily budget cap reached`, cost: 0 };
  }
  try {
    lastRunTime = Date.now();
    const maxTweets = 200;
    const maxChargeUsd = 0.15;
    const since = getTodaySince();
    const searchTerms = PROVINCE_SEARCHES.map((s) => s.terms);
    console.log(`[apify] Scraping Twitter: ${searchTerms.length} geo terms (${PROVINCE_SEARCHES.filter((s) => s.province).length} provincial), ${maxTweets} max, $${maxChargeUsd} cap`);
    const input = {
      searchTerms,
      maxItems: maxTweets,
      sort: "Latest",
      tweetLanguage: "",
      since,
      "filter:nativeretweets": false,
      "include:nativeretweets": false,
      "filter:replies": false,
      "filter:quote": false
    };
    const startRes = await fetch(
      `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}&maxTotalChargeUsd=${maxChargeUsd}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      }
    );
    if (!startRes.ok) {
      return { posts: [], error: `Failed to start actor: ${startRes.status}`, cost: 0 };
    }
    const runData = await startRes.json();
    const runId = runData.data?.id;
    const datasetId = runData.data?.defaultDatasetId;
    if (!runId || !datasetId) {
      return { posts: [], error: "No run ID returned", cost: 0 };
    }
    console.log(`[apify] Run started: ${runId}`);
    let status = "RUNNING";
    for (let i = 0; i < 60 && (status === "RUNNING" || status === "READY"); i++) {
      await new Promise((r) => setTimeout(r, 5e3));
      const statusRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
      );
      const statusData = await statusRes.json();
      status = statusData.data?.status || "FAILED";
      if (i % 6 === 0) console.log(`[apify] Status: ${status}`);
    }
    if (status !== "SUCCEEDED") {
      return { posts: [], error: `Run ended with status: ${status}`, cost: 0 };
    }
    const resultsRes = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=${maxTweets}`
    );
    const items = await resultsRes.json();
    if (!Array.isArray(items)) {
      return { posts: [], error: "Unexpected response format", cost: 0 };
    }
    const seenUrls = /* @__PURE__ */ new Set();
    const posts = items.filter((item) => item.type === "tweet" && item.text).map((item) => {
      const termIndex = item.searchTermIndex ?? -1;
      const provinceTag = termIndex >= 0 && termIndex < PROVINCE_SEARCHES.length ? PROVINCE_SEARCHES[termIndex].province : null;
      return {
        text: item.text,
        author: item.author?.userName || "unknown",
        authorLocation: item.author?.location || null,
        likes: item.likeCount || 0,
        retweets: item.retweetCount || 0,
        replies: item.replyCount || 0,
        createdAt: new Date(item.createdAt || Date.now()),
        url: item.url || "",
        source: `x/@${item.author?.userName || "unknown"}`,
        fetchedSource: "twitter",
        provinceTag
      };
    }).filter((p) => {
      if (seenUrls.has(p.url)) return false;
      seenUrls.add(p.url);
      return true;
    });
    const provCounts = /* @__PURE__ */ new Map();
    for (const p of posts) {
      const key = p.provinceTag || "national";
      provCounts.set(key, (provCounts.get(key) || 0) + 1);
    }
    const distStr = [...provCounts.entries()].map(([k, v]) => `${k}:${v}`).join(" ");
    const cost = Math.round(posts.length * 25e-5 * 1e4) / 1e4;
    dailyCostAccumulated += cost;
    console.log(`[apify] Got ${posts.length} tweets (${distStr}), cost: $${cost}`);
    saveTweetCache(today, posts);
    return { posts, error: null, cost };
  } catch (err) {
    return { posts: [], error: `Twitter scrape failed: ${err.message}`, cost: 0 };
  }
}
function saveTweetCache(date2, posts) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(path.join(CACHE_DIR, `tweets-${date2}.json`), JSON.stringify(posts));
    console.log(`[apify] Cached ${posts.length} tweets to data/tweets-${date2}.json`);
  } catch (err) {
    console.error(`[apify] Failed to cache tweets: ${err.message}`);
  }
}
function loadTweetCache(date2) {
  for (const d of [date2, yesterdayDate(date2)]) {
    const filePath = path.join(CACHE_DIR, `tweets-${d}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
        const posts = raw.filter((item) => item.type === "tweet" && item.text || item.fetchedSource === "twitter").map((item) => {
          if (item.fetchedSource === "twitter") return item;
          return {
            text: item.text,
            author: item.author?.userName || "unknown",
            likes: item.likeCount || 0,
            retweets: item.retweetCount || 0,
            replies: item.replyCount || 0,
            createdAt: new Date(item.createdAt || Date.now()),
            url: item.url || "",
            source: `x/@${item.author?.userName || "unknown"}`,
            fetchedSource: "twitter"
          };
        });
        console.log(`[apify] Loaded ${posts.length} tweets from cache (${d})`);
        return posts;
      } catch {
      }
    }
  }
  return null;
}
function yesterdayDate(date2) {
  const d = new Date(date2);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}
var APIFY_TOKEN, ACTOR_ID, CACHE_DIR, PROVINCE_SEARCHES, lastRunTime, dailyCostAccumulated, dailyCostDate, MIN_RUN_INTERVAL_MS, MAX_DAILY_COST;
var init_apify = __esm({
  "server/sources/apify.ts"() {
    "use strict";
    APIFY_TOKEN = process.env.APIFY_API_KEY || "";
    ACTOR_ID = "kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest";
    CACHE_DIR = path.join(process.cwd(), "data");
    PROVINCE_SEARCHES = [
      // National (broad)
      { terms: "South Africa", province: null },
      { terms: "Mzansi", province: null },
      // Gauteng
      { terms: "Johannesburg OR Joburg OR Jozi", province: "GP" },
      { terms: "Pretoria OR Tshwane OR Centurion", province: "GP" },
      { terms: "Soweto OR Sandton OR Midrand", province: "GP" },
      // Western Cape
      { terms: "Cape Town OR Kaapstad OR Stellenbosch", province: "WC" },
      // KwaZulu-Natal
      { terms: "Durban OR eThekwini OR Pietermaritzburg OR Umhlanga", province: "KZN" },
      // Eastern Cape
      { terms: "Port Elizabeth OR Gqeberha OR East London OR Mthatha", province: "EC" },
      // Free State
      { terms: "Bloemfontein OR Mangaung OR Welkom", province: "FS" },
      // North West
      { terms: "Rustenburg OR Mahikeng OR Potchefstroom", province: "NW" },
      // Northern Cape
      { terms: "Kimberley OR Upington", province: "NC" },
      // Mpumalanga
      { terms: "Nelspruit OR Mbombela OR Witbank OR eMalahleni", province: "MP" },
      // Limpopo
      { terms: "Polokwane OR Tzaneen OR Musina OR Limpopo", province: "LP" }
    ];
    lastRunTime = 0;
    dailyCostAccumulated = 0;
    dailyCostDate = "";
    MIN_RUN_INTERVAL_MS = 60 * 60 * 1e3;
    MAX_DAILY_COST = 1;
  }
});

// server/sources/bluesky.ts
function getTodayRange() {
  const now = /* @__PURE__ */ new Date();
  const since = new Date(now);
  since.setHours(0, 0, 0, 0);
  const until = new Date(since);
  until.setDate(until.getDate() + 1);
  return {
    since: since.toISOString(),
    until: until.toISOString()
  };
}
function postUrl(uri, handle) {
  const rkey = uri.split("/").pop();
  return `https://bsky.app/profile/${handle}/post/${rkey}`;
}
async function searchPosts(query, province, since, until) {
  const posts = [];
  let cursor;
  let pages = 0;
  const MAX_PAGES = 3;
  while (pages < MAX_PAGES) {
    const params = new URLSearchParams({
      q: query,
      sort: "latest",
      since,
      until,
      limit: "100"
    });
    if (cursor) params.set("cursor", cursor);
    const url = `${API_BASE}/app.bsky.feed.searchPosts?${params}`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "zerogeist/1.0 (mzansi.zerogeist.me)" }
      });
      if (!res.ok) {
        if (res.status === 429) {
          console.log(`[bluesky] Rate limited on "${query}", stopping pagination`);
          break;
        }
        console.error(`[bluesky] Search failed for "${query}": ${res.status}`);
        break;
      }
      const data = await res.json();
      const results = data.posts || [];
      for (const post of results) {
        const record = post.record || {};
        posts.push({
          text: record.text || "",
          author: post.author?.handle || "unknown",
          displayName: post.author?.displayName || null,
          likes: post.likeCount || 0,
          reposts: post.repostCount || 0,
          replies: post.replyCount || 0,
          quotes: post.quoteCount || 0,
          createdAt: new Date(record.createdAt || post.indexedAt || Date.now()),
          url: postUrl(post.uri, post.author?.handle || "unknown"),
          source: "bluesky",
          langs: record.langs || [],
          provinceTag: province
        });
      }
      cursor = data.cursor;
      pages++;
      if (!cursor || results.length < 100) break;
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.error(`[bluesky] Error searching "${query}": ${err.message}`);
      break;
    }
  }
  return posts;
}
async function fetchBluesky() {
  const allPosts = [];
  const errors = [];
  const seenUrls = /* @__PURE__ */ new Set();
  const { since, until } = getTodayRange();
  console.log(`[bluesky] Searching ${SEARCHES.length} queries for ${since.split("T")[0]}`);
  for (const { query, province } of SEARCHES) {
    try {
      const posts = await searchPosts(query, province, since, until);
      for (const p of posts) {
        if (!seenUrls.has(p.url) && p.text.length > 10) {
          seenUrls.add(p.url);
          allPosts.push(p);
        }
      }
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      errors.push(`"${query}": ${err.message}`);
    }
  }
  const provCounts = /* @__PURE__ */ new Map();
  for (const p of allPosts) {
    const key = p.provinceTag || "national";
    provCounts.set(key, (provCounts.get(key) || 0) + 1);
  }
  const distStr = [...provCounts.entries()].map(([k, v]) => `${k}:${v}`).join(" ");
  console.log(`[bluesky] Got ${allPosts.length} posts (${distStr})`);
  return {
    posts: allPosts,
    error: errors.length > 0 ? errors.join("; ") : null
  };
}
var API_BASE, SEARCHES;
var init_bluesky = __esm({
  "server/sources/bluesky.ts"() {
    "use strict";
    API_BASE = "https://api.bsky.app/xrpc";
    SEARCHES = [
      // National
      { query: "South Africa", province: null },
      { query: "Mzansi", province: null },
      // Gauteng
      { query: "Johannesburg OR Joburg OR Pretoria OR Tshwane", province: "GP" },
      // Western Cape
      { query: "Cape Town OR Stellenbosch OR Kaapstad", province: "WC" },
      // KwaZulu-Natal
      { query: "Durban OR eThekwini OR Pietermaritzburg", province: "KZN" },
      // Eastern Cape
      { query: "Gqeberha OR East London OR Mthatha", province: "EC" },
      // Free State
      { query: "Bloemfontein OR Mangaung", province: "FS" },
      // North West
      { query: "Rustenburg OR Mahikeng", province: "NW" },
      // Northern Cape
      { query: "Kimberley OR Upington", province: "NC" },
      // Mpumalanga
      { query: "Mbombela OR Nelspruit OR eMalahleni", province: "MP" },
      // Limpopo
      { query: "Polokwane OR Limpopo OR Tzaneen", province: "LP" }
    ];
  }
});

// server/sources/summarise.ts
import Anthropic from "@anthropic-ai/sdk";
function buildBatches(posts) {
  const groups = /* @__PURE__ */ new Map();
  for (const post of posts) {
    const key = post.provinceHint || "national";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(post);
  }
  const batches = [];
  for (const [hint, groupPosts] of groups) {
    for (let i = 0; i < groupPosts.length; i += BATCH_SIZE) {
      batches.push({
        provinceHint: hint,
        posts: groupPosts.slice(i, i + BATCH_SIZE)
      });
    }
  }
  return batches;
}
function formatAttribution(post) {
  if (post.sourceType === "reddit") {
    return `r/${post.metadata?.subreddit || "southafrica"}`;
  }
  if (post.sourceType === "twitter") {
    return `x/@${post.author || "unknown"}`;
  }
  if (post.sourceType === "bluesky") {
    return `bsky/@${post.author || "unknown"}`;
  }
  if (post.sourceType === "reliefweb") return "ReliefWeb";
  if (post.sourceType === "pmg") return "PMG";
  return post.sourceType;
}
async function summariseBatch(batch, batchIndex) {
  const provinceContext = batch.provinceHint === "national" ? `These posts are not geo-attributed yet. You MUST assign each to a South African province based on ANY geographic clue \u2014 city names, landmarks, institutions, universities, slang, area codes, anything. Use these mappings:
- Johannesburg, Joburg, Jozi, Soweto, Sandton, Alexandra, Randburg, Tshwane, Pretoria, Centurion, Midrand \u2192 GP
- Cape Town, Kaapstad, Stellenbosch, Paarl, Table Mountain, UCT, Cape Flats \u2192 WC
- Durban, eThekwini, Pietermaritzburg, Umhlanga, Ballito, Richards Bay \u2192 KZN
- Port Elizabeth, Gqeberha, East London, Mthatha, Grahamstown \u2192 EC
- Bloemfontein, Mangaung, Welkom \u2192 FS
- Rustenburg, Mahikeng, Klerksdorp, Potchefstroom \u2192 NW
- Kimberley, Upington \u2192 NC
- Nelspruit, Mbombela, Witbank, eMalahleni \u2192 MP
- Polokwane, Limpopo, Tzaneen, Musina \u2192 LP
Only use "national" if there is genuinely NO geographic signal \u2014 the post discusses South Africa as a whole with no regional specificity.` : `These posts are pre-attributed to province ${batch.provinceHint}. Confirm or correct the attribution.`;
  const postsText = batch.posts.map((p, i) => {
    const attribution = formatAttribution(p);
    const engagement = p.engagement ? ` | engagement: ${JSON.stringify(p.engagement)}` : "";
    return `[${i + 1}] (${attribution}) ${p.title ? p.title + ": " : ""}${p.body.slice(0, 300)}${engagement}`;
  }).join("\n\n");
  const customPrompt = await getSystemPrompt("haiku_summarise");
  const defaultPrompt = `You are analysing South African social media and news posts for geographic and emotional content.

\${provinceContext}

Province codes: GP (Gauteng), WC (Western Cape), KZN (KwaZulu-Natal), EC (Eastern Cape), FS (Free State), NW (North West), NC (Northern Cape), MP (Mpumalanga), LP (Limpopo).

Posts to analyse:

\${postsText}

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
  const promptTemplate = customPrompt?.prompt || defaultPrompt;
  const prompt = promptTemplate.replace("${provinceContext}", provinceContext).replace("${postsText}", postsText);
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4e3,
    messages: [{ role: "user", content: prompt }]
  });
  const text2 = response.content[0].type === "text" ? response.content[0].text : "[]";
  let parsed;
  try {
    parsed = JSON.parse(text2);
  } catch {
    const match = text2.match(/\[[\s\S]*\]/);
    parsed = match ? JSON.parse(match[0]) : [];
  }
  const VALID_EMOTIONS = /* @__PURE__ */ new Set(["anger", "hope", "fear", "joy", "grief"]);
  const EMOTION_MAP = {
    neutral: "hope",
    sad: "grief",
    sadness: "grief",
    happy: "joy",
    happiness: "joy",
    anxious: "fear",
    anxiety: "fear",
    frustrated: "anger",
    frustration: "anger",
    hopeful: "hope",
    angry: "anger",
    scared: "fear",
    joyful: "joy",
    grieving: "grief",
    worried: "fear",
    excited: "joy",
    disappointed: "grief",
    outraged: "anger",
    optimistic: "hope",
    pessimistic: "grief",
    concerned: "fear",
    relieved: "hope"
  };
  function normaliseEmotion(raw) {
    const lower = (raw || "").toLowerCase().trim();
    if (VALID_EMOTIONS.has(lower)) return lower;
    return EMOTION_MAP[lower] || "grief";
  }
  const summaries = parsed.map((item) => {
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
      voiceAttribution: formatAttribution(post)
    };
  });
  return {
    summaries,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens
  };
}
async function summariseAll(posts, onBatchComplete) {
  const batches = buildBatches(posts);
  const allSummaries = [];
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
    } catch (err) {
      console.error(`[summarise] Batch ${i + 1}/${batches.length} FAILED (${batches[i].provinceHint}, ${batches[i].posts.length} posts): ${err.message}`);
      onBatchComplete?.(i + 1, batches.length, 0);
    }
  }
  return { summaries: allSummaries, totalInputTokens, totalOutputTokens };
}
var client, BATCH_SIZE;
var init_summarise = __esm({
  "server/sources/summarise.ts"() {
    "use strict";
    init_storage();
    client = new Anthropic();
    BATCH_SIZE = 30;
  }
});

// server/sources/synthesise.ts
import Anthropic2 from "@anthropic-ai/sdk";
function buildProvinceSummaries(summaries) {
  const byProvince = /* @__PURE__ */ new Map();
  for (const s of summaries) {
    const key = s.provinceId;
    if (!byProvince.has(key)) byProvince.set(key, []);
    byProvince.get(key).push(s);
  }
  const sections = [];
  for (const { id, name } of PROVINCES) {
    const provinceSummaries = byProvince.get(id) || [];
    if (provinceSummaries.length === 0) {
      sections.push(`### ${name} (${id})
No direct data. Infer from national trends.`);
      continue;
    }
    const emotions = { anger: 0, hope: 0, fear: 0, joy: 0, grief: 0 };
    for (const s of provinceSummaries) {
      emotions[s.emotion] = (emotions[s.emotion] || 0) + 1;
    }
    const total = provinceSummaries.length;
    const emotionPcts = Object.entries(emotions).map(([e, count]) => `${e}: ${(count / total * 100).toFixed(0)}%`).join(", ");
    const themeCounts = /* @__PURE__ */ new Map();
    for (const s of provinceSummaries) {
      for (const t of s.themes || []) {
        themeCounts.set(t, (themeCounts.get(t) || 0) + 1);
      }
    }
    const topThemes = [...themeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([theme, count]) => `"${theme}" (${count})`).join(", ");
    const sourceCounts = /* @__PURE__ */ new Map();
    for (const s of provinceSummaries) {
      sourceCounts.set(s.sourceType, (sourceCounts.get(s.sourceType) || 0) + 1);
    }
    const sourceMix = [...sourceCounts.entries()].map(([type, count]) => `${type}: ${count}`).join(", ");
    const avgIntensity = provinceSummaries.reduce((sum, s) => sum + s.intensity, 0) / total;
    const voices = provinceSummaries.filter((s) => s.voiceWorthy && s.voiceText).sort((a, b) => b.signalStrength - a.signalStrength).slice(0, 10).map((s) => `  - [${s.voiceAttribution}] "${s.voiceText}" (${s.emotion}, signal: ${s.signalStrength.toFixed(2)})`).join("\n");
    sections.push(`### ${name} (${id})
Posts: ${total} | Sources: ${sourceMix}
Emotions: ${emotionPcts}
Avg intensity: ${avgIntensity.toFixed(2)}
Top themes: ${topThemes}
Voices (${provinceSummaries.filter((s) => s.voiceWorthy).length} voice-worthy):
${voices || "  (none extracted)"}`);
  }
  const national = byProvince.get("national") || [];
  if (national.length > 0) {
    const natVoices = national.filter((s) => s.voiceWorthy && s.voiceText).sort((a, b) => b.signalStrength - a.signalStrength).slice(0, 5).map((s) => `  - [${s.voiceAttribution}] "${s.voiceText}" (${s.emotion})`).join("\n");
    sections.push(`### National (unattributed)
Posts: ${national.length}
Voices:
${natVoices || "  (none)"}`);
  }
  return sections.join("\n\n");
}
async function synthesiseWorld(summaries, totalRawPosts, retryCount = 0) {
  const provinceSummaryText = buildProvinceSummaries(summaries);
  const customPrompt = await getSystemPrompt("sonnet_synthesise");
  const defaultPrompt = `You are the sensing voice of Zerogeist \u2014 a platform that reads the living state of South Africa daily through real human expression.

The person opening this has not come for news or analysis. They have come to feel the country. Your output is what they encounter first. It should land like walking into a room and immediately knowing something about it \u2014 the charge in the air, what is alive, what is suppressed, where energy is concentrating and where it has gone quiet.

This is not weather. It is geist \u2014 the spirit of a place at a moment in time.

## Pre-Analysed Province Data

\${provinceSummaryText}

## What to produce

{
  "field_state": "2-3 sentences. What is the state of the field today \u2014 the ambient condition of South Africa as a whole? Speak to energy, charge, tension, presence. Where is the country's attention concentrating? What is unresolved? What is alive? Do not smooth contradiction \u2014 if hope and anger are both high, that is the reading. Make it feel true, not tidy.",

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
      "geist_reading": "One sentence. What is the felt presence of this province today? Not what is happening \u2014 what is the charge? Ground it in the actual data. Avoid generic language. If it is quiet, say what kind of quiet. If it is live, say what kind of live.",
      "themes": [
        {
          "name": "max 4 words, concrete and specific",
          "emotion": "anger|hope|fear|joy|grief",
          "intensity": 0.0-1.0,
          "posts": count,
          "summary": "One sentence. Not what the theme is \u2014 what people are feeling about it right now."
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
- Provinces with 0 posts get empty arrays. Their geist_reading reflects genuine absence \u2014 not fabricated calm. Silence is a reading too.
- National voices stay national. Do not redistribute to provinces.
- field_state must hold contradiction where it exists. A country where hope and anger coexist at high intensity is not settled \u2014 say so.

Return ONLY the JSON. No markdown. No preamble.`;
  const promptTemplate = customPrompt?.prompt || defaultPrompt;
  const prompt = promptTemplate.replace("${totalRawPosts}", String(totalRawPosts)).replace("${provinceSummaryText}", provinceSummaryText).replace(/\$\{totalRawPosts\}/g, String(totalRawPosts)).replace(/\$\{provinceSummaryText\}/g, provinceSummaryText);
  try {
    const response = await client2.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16e3,
      messages: [{ role: "user", content: prompt }]
    });
    const text2 = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text2);
    return {
      fieldState: parsed.field_state,
      nationalEmotion: parsed.national_emotion,
      nationalIntensity: parsed.national_intensity,
      nationalConsensus: parsed.national_consensus,
      provinces: parsed.provinces,
      totalPostsAnalysed: totalRawPosts,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens
    };
  } catch (err) {
    if (retryCount < 3) {
      console.error(`[synthesise] Retry ${retryCount + 1}/3: ${err.message}`);
      await new Promise((r) => setTimeout(r, 2e3 * (retryCount + 1)));
      return synthesiseWorld(summaries, totalRawPosts, retryCount + 1);
    }
    throw new Error(`Synthesis failed after 3 retries: ${err.message}`);
  }
}
function estimateCost(inputTokens, outputTokens) {
  const inputCost = inputTokens / 1e6 * 3;
  const outputCost = outputTokens / 1e6 * 15;
  return Math.round((inputCost + outputCost) * 1e4) / 1e4;
}
function estimateHaikuCost(inputTokens, outputTokens) {
  const inputCost = inputTokens / 1e6 * 0.8;
  const outputCost = outputTokens / 1e6 * 4;
  return Math.round((inputCost + outputCost) * 1e4) / 1e4;
}
var client2, PROVINCES;
var init_synthesise = __esm({
  "server/sources/synthesise.ts"() {
    "use strict";
    init_storage();
    client2 = new Anthropic2();
    PROVINCES = [
      { id: "GP", name: "Gauteng" },
      { id: "WC", name: "Western Cape" },
      { id: "KZN", name: "KwaZulu-Natal" },
      { id: "EC", name: "Eastern Cape" },
      { id: "FS", name: "Free State" },
      { id: "NW", name: "North West" },
      { id: "NC", name: "Northern Cape" },
      { id: "MP", name: "Mpumalanga" },
      { id: "LP", name: "Limpopo" }
    ];
  }
});

// server/dailyCycle.ts
var dailyCycle_exports = {};
__export(dailyCycle_exports, {
  getCycleProgress: () => getCycleProgress,
  runDailyCycle: () => runDailyCycle
});
import { eq as eq3 } from "drizzle-orm";
function getCycleProgress() {
  return currentProgress;
}
function setStep(stepName, detail) {
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
function completeStep(stepName, detail) {
  if (!currentProgress) return;
  for (const s of currentProgress.steps) {
    if (s.name === stepName) {
      s.status = "done";
      if (detail) s.detail = detail;
    }
  }
}
function failStep(stepName, detail) {
  if (!currentProgress) return;
  for (const s of currentProgress.steps) {
    if (s.name === stepName) {
      s.status = "failed";
      s.detail = detail;
    }
  }
}
async function runDailyCycle(mode = "full") {
  if (cycleRunning) {
    console.log("[cycle] Already running, skipping.");
    return;
  }
  cycleRunning = true;
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  console.log(`[cycle] Starting daily cycle for ${today} (mode: ${mode})`);
  const existing = await getTodaysCycleLog();
  const existingRawPosts = await getRawPostsByDate(today);
  const existingSourceTypes = new Set(existingRawPosts.map((p) => p.sourceType));
  const allSourceTypes = ["reddit", "twitter", "bluesky", "reliefweb", "pmg"];
  const missingSourceTypes = allSourceTypes.filter((s) => !existingSourceTypes.has(s));
  if (mode === "full" && existing && existing.status === "completed" && missingSourceTypes.length === 0) {
    console.log("[cycle] Already completed today, all sources present, skipping.");
    cycleRunning = false;
    return;
  }
  if (mode === "full" && existing && existing.status === "completed" && missingSourceTypes.length > 0) {
    console.log(`[cycle] Completed but missing sources: ${missingSourceTypes.join(", ")} \u2014 re-running fetch`);
  }
  const skipFetch = mode === "resummarize" || mode === "resynthesize";
  function shouldFetchSource(sourceType) {
    if (skipFetch) return false;
    if (mode === "fetch-only" || mode === "full") {
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
    console.log(`[cycle] All sources already have posts \u2014 skipping to ${mode === "fetch-only" ? "done" : "summarise"}`);
  }
  const cycleLog = existing || await createCycleLog({
    date: today,
    status: "in_progress",
    sourcesRun: 0,
    personsProcessed: 0,
    totalCost: 0
  });
  if (existing) {
    await updateCycleLog(cycleLog.id, { status: "in_progress" });
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
      { name: "finalise", status: "pending" }
    ]
  };
  let totalCost = 0;
  let sourcesRun = 0;
  try {
    await pruneOldRawPosts(30);
    const fetch2 = shouldFetchSource;
    let redditResult = { posts: [], error: null };
    let twitterResult = { posts: [], error: null, cost: 0 };
    let blueskyResult = { posts: [], error: null };
    let reliefwebResult = { posts: [], error: null };
    let pmgResult = { posts: [], error: null };
    if (fetch2("reddit")) {
      setStep("reddit", "Fetching Reddit posts...");
      redditResult = await fetchReddit();
      completeStep("reddit", `${redditResult.posts.length} posts`);
    } else {
      completeStep("reddit", "skipped (already fetched)");
    }
    if (fetch2("twitter")) {
      setStep("twitter", "Scraping Twitter via Apify...");
      twitterResult = await fetchTwitter();
      totalCost += twitterResult.cost || 0;
      completeStep("twitter", `${twitterResult.posts.length} tweets`);
    } else {
      completeStep("twitter", "skipped (already fetched)");
    }
    if (fetch2("bluesky")) {
      setStep("bluesky", "Searching Bluesky...");
      blueskyResult = await fetchBluesky();
      completeStep("bluesky", `${blueskyResult.posts.length} posts`);
    } else {
      completeStep("bluesky", "skipped (already fetched)");
    }
    if (fetch2("reliefweb")) {
      setStep("reliefweb", "Fetching ReliefWeb reports...");
      reliefwebResult = await fetchReliefWeb();
      completeStep("reliefweb", `${reliefwebResult.posts.length} reports`);
    } else {
      completeStep("reliefweb", "skipped (already fetched)");
    }
    if (fetch2("pmg")) {
      setStep("pmg", "Fetching PMG committee meetings...");
      pmgResult = await fetchPMG();
      completeStep("pmg", `${pmgResult.posts.length} items`);
    } else {
      completeStep("pmg", "skipped (already fetched)");
    }
    const activeSources = await getActiveSources();
    const fetchResults = {
      reddit: redditResult,
      twitter: twitterResult,
      bluesky: blueskyResult,
      reliefweb: reliefwebResult,
      pmg: pmgResult
    };
    for (const s of activeSources) {
      const result = fetchResults[s.type];
      if (!result || !fetch2(s.type)) continue;
      const postsRetrieved = result.posts.length;
      const status = result.error ? "failed" : postsRetrieved === 0 ? "empty" : "success";
      await db.update(source).set({
        lastRun: /* @__PURE__ */ new Date(),
        lastRunStatus: status,
        lastRunCost: 0,
        postsRetrieved
      }).where(eq3(source.id, s.id));
      sourcesRun++;
    }
    const rawPosts = [];
    for (const p of redditResult.posts) {
      rawPosts.push({
        sourceType: "reddit",
        title: p.title,
        body: p.body || p.title,
        author: void 0,
        url: p.url,
        publishedAt: p.createdAt,
        engagement: { score: p.score, comments: p.comments },
        metadata: { subreddit: p.subreddit, flair: p.flair }
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
        metadata: { provinceTag: p.provinceTag, authorLocation: p.authorLocation }
      });
    }
    for (const p of blueskyResult.posts) {
      rawPosts.push({
        sourceType: "bluesky",
        body: p.text,
        author: p.author,
        url: p.url,
        publishedAt: p.createdAt,
        engagement: { likes: p.likes, reposts: p.reposts, replies: p.replies, quotes: p.quotes },
        metadata: { provinceTag: p.provinceTag, displayName: p.displayName, langs: p.langs }
      });
    }
    for (const p of reliefwebResult.posts) {
      rawPosts.push({
        sourceType: "reliefweb",
        title: p.title,
        body: p.body || p.title,
        url: p.url,
        metadata: { theme: p.theme }
      });
    }
    for (const p of pmgResult.posts) {
      rawPosts.push({
        sourceType: "pmg",
        title: p.title,
        body: p.body || p.title,
        url: p.url,
        metadata: { committee: p.committee }
      });
    }
    if (rawPosts.length > 0) {
      setStep("store", `Storing ${rawPosts.length} new raw posts...`);
      const storedCount = await storeRawPosts(rawPosts, today);
      completeStep("store", `${storedCount} stored`);
    } else {
      completeStep("store", "no new posts to store");
    }
    if (mode === "fetch-only") {
      await updateCycleLog(cycleLog.id, {
        status: "completed",
        completedAt: /* @__PURE__ */ new Date(),
        sourcesRun,
        totalCost
      });
      cycleRunning = false;
      currentProgress = null;
      console.log(`[cycle] Fetch-only complete. ${rawPosts.length} new posts stored.`);
      return;
    }
    const allPostsCount = existingRawPosts.length + rawPosts.length;
    if (allPostsCount === 0) {
      failStep("store", "No posts available");
      await updateCycleLog(cycleLog.id, {
        status: "failed",
        failedAtStep: "fetch_sources",
        completedAt: /* @__PURE__ */ new Date(),
        sourcesRun
      });
      cycleRunning = false;
      currentProgress = null;
      return;
    }
    setStep("summarise", "Loading raw posts for summarisation...");
    const rawPostRows = await getRawPostsByDate(today);
    if (mode === "resummarize") {
      console.log("[cycle] Resummarize mode \u2014 clearing existing summaries and snapshot");
      await clearTodaysSummaries();
      await clearTodaysSnapshot();
    }
    if (mode === "resynthesize" || existing && existing.status === "completed") {
      console.log("[cycle] Clearing existing snapshot for re-synthesis");
      await clearTodaysSnapshot();
    }
    const existingSummaries = await getSummariesByDate(today);
    const summarisedPostIds = new Set(existingSummaries.map((s) => s.rawPostId));
    const unsummarisedPosts = rawPostRows.filter((p) => !summarisedPostIds.has(p.id));
    if (existingSummaries.length > 0 && unsummarisedPosts.length === 0 && mode !== "resummarize") {
      console.log(`[cycle] All ${rawPostRows.length} posts already summarised \u2014 skipping to synthesise`);
      completeStep("summarise", `${existingSummaries.length} summaries (cached)`);
      setStep("synthesise", `Synthesising from ${existingSummaries.length} cached summaries (Sonnet)...`);
      const analysis2 = await synthesiseWorld(existingSummaries, rawPostRows.length);
      const sonnetCost2 = estimateCost(analysis2.inputTokens, analysis2.outputTokens);
      totalCost += sonnetCost2;
      completeStep("synthesise", `$${sonnetCost2.toFixed(4)}`);
      const activeSources3 = await getActiveSources();
      const sourceIds2 = activeSources3.map((s) => s.id);
      const snapshot2 = await createWorldSnapshot({
        date: today,
        sourceIds: sourceIds2,
        fieldState: analysis2.fieldState,
        nationalEmotion: analysis2.nationalEmotion,
        nationalIntensity: analysis2.nationalIntensity,
        nationalConsensus: analysis2.nationalConsensus,
        provinces: analysis2.provinces,
        totalPostsAnalysed: rawPostRows.length,
        analysisCost: sonnetCost2
      });
      setStep("personalise", "Generating personalised world views...");
      const persons2 = await getAllActivePersons();
      let personsProcessed2 = 0;
      for (const p of persons2) {
        try {
          await createPersonWorld({
            personId: p.id,
            snapshotId: snapshot2.id,
            date: today,
            weightedProvinces: analysis2.provinces,
            weightedThemes: null,
            personalDigest: analysis2.fieldState,
            personalQuestionContext: analysis2.fieldState
          });
          personsProcessed2++;
        } catch (err) {
        }
      }
      completeStep("personalise", `${personsProcessed2} persons`);
      setStep("finalise", `Total cost: $${totalCost.toFixed(4)}`);
      await updateCycleLog(cycleLog.id, {
        status: "completed",
        completedAt: /* @__PURE__ */ new Date(),
        totalCost,
        sourcesRun,
        personsProcessed: personsProcessed2
      });
      completeStep("finalise", `Done \u2014 $${totalCost.toFixed(4)}`);
      cycleRunning = false;
      currentProgress = null;
      return;
    }
    const postsToSummarise = unsummarisedPosts.length > 0 ? unsummarisedPosts : rawPostRows;
    const label = unsummarisedPosts.length > 0 && unsummarisedPosts.length < rawPostRows.length ? `Summarising ${unsummarisedPosts.length} new posts (${existingSummaries.length} already done)` : `Summarising ${postsToSummarise.length} posts in batches (Haiku)`;
    setStep("summarise", `${label}...`);
    const { summaries, totalInputTokens: sumIn, totalOutputTokens: sumOut } = await summariseAll(
      postsToSummarise,
      (batchIndex, total, count) => {
        if (currentProgress) {
          const step = currentProgress.steps.find((s) => s.name === "summarise");
          if (step) step.detail = `Batch ${batchIndex}/${total} (${count} summaries)`;
        }
      }
    );
    const summaryRows = summaries.map((s) => ({
      date: today,
      rawPostId: s.rawPostId,
      provinceId: s.provinceId,
      sourceType: s.sourceType,
      themes: s.themes,
      emotion: s.emotion,
      intensity: s.intensity,
      signalStrength: s.signalStrength,
      voiceWorthy: s.voiceWorthy,
      voiceText: s.voiceText,
      voiceAttribution: s.voiceAttribution
    }));
    await storeSummaries(summaryRows);
    const haikuCost = estimateHaikuCost(sumIn, sumOut);
    totalCost += haikuCost;
    completeStep("summarise", `${summaries.length} summaries, $${haikuCost.toFixed(4)} (${sumIn} in, ${sumOut} out)`);
    setStep("synthesise", `Synthesising world snapshot from ${summaries.length} summaries (Sonnet)...`);
    const analysis = await synthesiseWorld(summaries, rawPostRows.length);
    const sonnetCost = estimateCost(analysis.inputTokens, analysis.outputTokens);
    totalCost += sonnetCost;
    completeStep("synthesise", `$${sonnetCost.toFixed(4)} (${analysis.inputTokens} in, ${analysis.outputTokens} out)`);
    const activeSources2 = await getActiveSources();
    const sourceIds = activeSources2.map((s) => s.id);
    const snapshot = await createWorldSnapshot({
      date: today,
      sourceIds,
      fieldState: analysis.fieldState,
      nationalEmotion: analysis.nationalEmotion,
      nationalIntensity: analysis.nationalIntensity,
      nationalConsensus: analysis.nationalConsensus,
      provinces: analysis.provinces,
      totalPostsAnalysed: rawPostRows.length,
      analysisCost: haikuCost + sonnetCost
    });
    console.log(`[cycle] World snapshot stored: ${snapshot.id}`);
    setStep("personalise", "Generating personalised world views...");
    const persons = await getAllActivePersons();
    let personsProcessed = 0;
    for (const p of persons) {
      try {
        await createPersonWorld({
          personId: p.id,
          snapshotId: snapshot.id,
          date: today,
          weightedProvinces: analysis.provinces,
          weightedThemes: null,
          personalDigest: analysis.fieldState,
          personalQuestionContext: analysis.fieldState
        });
        personsProcessed++;
      } catch (err) {
        console.error(`[cycle] Failed to create person_world for ${p.id}: ${err.message}`);
      }
    }
    completeStep("personalise", `${personsProcessed} persons`);
    setStep("finalise", `Total cost: $${totalCost.toFixed(4)}`);
    await updateCycleLog(cycleLog.id, {
      status: "completed",
      completedAt: /* @__PURE__ */ new Date(),
      totalCost,
      sourcesRun,
      personsProcessed
    });
    completeStep("finalise", `Done \u2014 $${totalCost.toFixed(4)}`);
    console.log(`[cycle] Daily cycle complete for ${today}`);
  } catch (err) {
    console.error(`[cycle] Daily cycle failed:`, err);
    failStep(currentProgress?.step || "unknown", err.message?.slice(0, 200) || "unknown");
    await updateCycleLog(cycleLog.id, {
      status: "failed",
      failedAtStep: err.message?.slice(0, 200) || "unknown",
      completedAt: /* @__PURE__ */ new Date(),
      totalCost,
      sourcesRun
    });
  } finally {
    cycleRunning = false;
    currentProgress = null;
  }
}
var cycleRunning, currentProgress;
var init_dailyCycle = __esm({
  "server/dailyCycle.ts"() {
    "use strict";
    init_reddit();
    init_reliefweb();
    init_pmg();
    init_apify();
    init_bluesky();
    init_summarise();
    init_synthesise();
    init_storage();
    init_db();
    init_schema();
    cycleRunning = false;
    currentProgress = null;
  }
});

// server/api.ts
import "dotenv/config";
import express from "express";
import session from "express-session";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import ConnectPgSimple from "connect-pg-simple";

// server/auth.ts
init_db();
init_schema();
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { eq } from "drizzle-orm";
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const [p] = await db.select().from(person).where(eq(person.id, id));
    done(null, p || null);
  } catch (err) {
    done(err, null);
  }
});
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/callback"
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(null, false, { message: "No email found in Google profile" });
        }
        const isAdmin2 = email === process.env.ADMIN_EMAIL;
        const [invite] = await db.select().from(invitedPerson).where(eq(invitedPerson.email, email));
        if (!isAdmin2 && (!invite || !invite.active)) {
          return done(null, false, {
            message: "This is a private space. Access is by invitation only."
          });
        }
        const now = /* @__PURE__ */ new Date();
        if (invite) {
          await db.update(invitedPerson).set({
            ...invite.firstLogin ? {} : { firstLogin: now },
            lastLogin: now,
            loginCount: (invite.loginCount || 0) + 1,
            personId: profile.id
          }).where(eq(invitedPerson.id, invite.id));
        } else if (isAdmin2) {
          await db.insert(invitedPerson).values({
            email,
            firstLogin: now,
            lastLogin: now,
            loginCount: 1,
            personId: profile.id,
            note: "admin (auto-created)"
          });
        }
        const [existing] = await db.select().from(person).where(eq(person.id, profile.id));
        if (existing) {
          await db.update(person).set({
            lastActive: /* @__PURE__ */ new Date(),
            name: profile.displayName,
            avatar: profile.photos?.[0]?.value || existing.avatar
          }).where(eq(person.id, profile.id));
          return done(null, existing);
        }
        const [newPerson] = await db.insert(person).values({
          id: profile.id,
          email,
          name: profile.displayName,
          avatar: profile.photos?.[0]?.value || null
        }).returning();
        return done(null, newPerson);
      } catch (err) {
        console.error("[auth] Login error:", err.message, err);
        return done(err, void 0);
      }
    }
  )
);
var auth_default = passport;

// server/routes.ts
import { Router } from "express";
import { z } from "zod";

// server/auditLog.ts
function audit(entry) {
  const log = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    ...entry
  };
  setImmediate(() => {
    console.log("[AUDIT]", JSON.stringify(log));
  });
}

// server/routes.ts
init_storage();
var router = Router();
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated" });
}
function isAdmin(req, res, next) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const user = req.user;
  if (user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}
router.get("/api/auth/user", (req, res) => {
  if (req.isAuthenticated() && req.user) {
    const user = req.user;
    res.json({
      ...user,
      isAdmin: user.email === process.env.ADMIN_EMAIL
    });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});
router.get("/api/world/today", isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const pw = await getPersonWorldToday(user.id);
    if (!pw) {
      const todaysSnapshot = await getTodaysSnapshot();
      const snapshot2 = todaysSnapshot || await getLatestSnapshot();
      if (!snapshot2) return res.json({ snapshot: null, personalised: false, stale: false });
      const postCounts2 = await getPostCountsByProvince(snapshot2.date);
      const stale2 = snapshot2.date !== today;
      return res.json({ snapshot: snapshot2, postCounts: postCounts2, personalised: false, stale: stale2, snapshotDate: snapshot2.date });
    }
    const snapshot = await getSnapshotById(pw.snapshotId);
    const postCounts = snapshot ? await getPostCountsByProvince(snapshot.date) : {};
    const stale = snapshot ? snapshot.date !== today : false;
    res.json({ ...pw, snapshot, postCounts, personalised: true, stale, snapshotDate: snapshot?.date });
  } catch (err) {
    console.error("Error fetching world:", err);
    res.status(500).json({ error: "Failed to fetch world data" });
  }
});
router.get("/api/question/today", isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    let q = await getTodaysQuestion(user.id);
    if (!q) {
      q = await getLatestUnansweredQuestion(user.id);
    }
    res.json(q);
  } catch (err) {
    console.error("Error fetching question:", err);
    res.status(500).json({ error: "Failed to fetch question" });
  }
});
var answerSchema = z.object({
  questionId: z.string().uuid(),
  answerText: z.string().min(1)
});
router.post("/api/question/answer", isAuthenticated, async (req, res) => {
  try {
    const { questionId, answerText } = answerSchema.parse(req.body);
    const user = req.user;
    const q = await submitAnswer(questionId, answerText);
    audit({
      action: "question.answered",
      userId: user.id,
      resourceType: "question",
      resourceId: questionId
    });
    if (!user.onboardingComplete) {
      const { person: person2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq4 } = await import("drizzle-orm");
      const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      await db2.update(person2).set({ onboardingComplete: true }).where(eq4(person2.id, user.id));
    }
    res.json(q);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    console.error("Error submitting answer:", err);
    res.status(500).json({ error: "Failed to submit answer" });
  }
});
var correctionSchema = z.object({
  questionId: z.string().uuid(),
  correction: z.string().min(1)
});
router.post("/api/question/correct", isAuthenticated, async (req, res) => {
  try {
    const { questionId, correction } = correctionSchema.parse(req.body);
    const user = req.user;
    const q = await submitQuestionCorrection(questionId, correction);
    audit({
      action: "question.corrected",
      userId: user.id,
      resourceType: "question",
      resourceId: questionId
    });
    res.json(q);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    res.status(500).json({ error: "Failed to submit correction" });
  }
});
router.get("/api/proxy", isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    let p = await getProxy(user.id);
    if (!p) {
      p = await createProxy(user.id);
    }
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch proxy" });
  }
});
router.get("/api/settings", isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const p = await getProxy(user.id);
    const history = await getProxyEditHistory(user.id);
    res.json({ proxy: p, editHistory: history });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});
var settingsEditSchema = z.object({
  originalValue: z.any(),
  correctedValue: z.any(),
  reason: z.string().optional()
});
for (const field of ["values", "tensions", "unknowns", "blind_spots"]) {
  const route = field === "blind_spots" ? "blind-spots" : field;
  router.patch(`/api/settings/${route}`, isAuthenticated, async (req, res) => {
    try {
      const user = req.user;
      const data = settingsEditSchema.parse(req.body);
      await createProxyEdit({
        personId: user.id,
        field,
        originalValue: data.originalValue,
        correctedValue: data.correctedValue,
        reason: data.reason || null,
        applied: true
      });
      const currentProxy = await getProxy(user.id);
      if (currentProxy) {
        await updateProxy(user.id, {
          [field === "blind_spots" ? "blindSpots" : field]: data.correctedValue
        });
      }
      audit({
        action: `settings.${field}.edited`,
        userId: user.id,
        resourceType: "proxy"
      });
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors });
      }
      res.status(500).json({ error: "Failed to update settings" });
    }
  });
}
router.get("/api/settings/history", isAuthenticated, async (req, res) => {
  try {
    const user = req.user;
    const history = await getProxyEditHistory(user.id);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch edit history" });
  }
});
router.get("/api/admin/persons", isAdmin, async (_req, res) => {
  try {
    const persons = await listInvitedPersons();
    res.json(persons);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch persons" });
  }
});
var addPersonSchema = z.object({
  email: z.string().email(),
  note: z.string().optional()
});
router.post("/api/admin/persons", isAdmin, async (req, res) => {
  try {
    const { email, note } = addPersonSchema.parse(req.body);
    const user = req.user;
    const result = await addInvitedPerson(email, note || null, user.id);
    audit({
      action: "admin.person.invited",
      userId: user.id,
      resourceType: "invited_person",
      resourceId: result.id,
      detail: email
    });
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    res.status(500).json({ error: "Failed to add person" });
  }
});
var updatePersonSchema = z.object({
  active: z.boolean().optional(),
  note: z.string().optional()
});
router.patch("/api/admin/persons/:id", isAdmin, async (req, res) => {
  try {
    const data = updatePersonSchema.parse(req.body);
    const result = await updateInvitedPerson(req.params.id, data);
    const user = req.user;
    audit({
      action: data.active === false ? "admin.person.revoked" : "admin.person.updated",
      userId: user.id,
      resourceType: "invited_person",
      resourceId: req.params.id
    });
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    res.status(500).json({ error: "Failed to update person" });
  }
});
router.get("/api/admin/sources", isAdmin, async (_req, res) => {
  try {
    const sources = await listSources();
    res.json(sources);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sources" });
  }
});
var addSourceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["reddit", "reliefweb", "pmg", "telegram", "rss", "twitter", "other"]),
  identifier: z.string().min(1),
  region: z.enum(["national", "provincial", "local"]),
  province: z.string().optional(),
  language: z.string().default("en"),
  difficulty: z.number().min(1).max(5).default(1),
  costPerRun: z.number().default(0),
  signalQuality: z.number().min(1).max(5).default(3),
  notes: z.string().optional()
});
router.post("/api/admin/sources", isAdmin, async (req, res) => {
  try {
    const data = addSourceSchema.parse(req.body);
    const user = req.user;
    const result = await addSource({
      ...data,
      province: data.province || null,
      notes: data.notes || null,
      addedBy: user.id
    });
    audit({
      action: "admin.source.added",
      userId: user.id,
      resourceType: "source",
      resourceId: result.id,
      detail: data.name
    });
    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    res.status(500).json({ error: "Failed to add source" });
  }
});
router.patch("/api/admin/sources/:id", isAdmin, async (req, res) => {
  try {
    const result = await updateSource(req.params.id, req.body);
    const user = req.user;
    audit({
      action: "admin.source.updated",
      userId: user.id,
      resourceType: "source",
      resourceId: req.params.id
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to update source" });
  }
});
router.get("/api/admin/health", isAdmin, async (_req, res) => {
  try {
    const [personCount, sourceCount, cycleLog, snapshot, latestSnapshot, sources, todaysRawPosts, recentReadings] = await Promise.all([
      getActivePersonCount(),
      getActiveSourceCount(),
      getTodaysCycleLog(),
      getTodaysSnapshot(),
      getLatestSnapshot(),
      getActiveSources(),
      getRawPostsByDate((/* @__PURE__ */ new Date()).toISOString().split("T")[0]),
      getRecentCycleLogs(14)
    ]);
    const postsByType = /* @__PURE__ */ new Map();
    for (const p of todaysRawPosts) {
      const t = p.sourceType;
      postsByType.set(t, (postsByType.get(t) || 0) + 1);
    }
    const sourceByType = /* @__PURE__ */ new Map();
    for (const s of sources) {
      const existing = sourceByType.get(s.type);
      if (!existing || s.lastRun && (!existing.lastRun || s.lastRun > existing.lastRun)) {
        sourceByType.set(s.type, { lastRun: s.lastRun, lastRunStatus: s.lastRunStatus });
      }
    }
    const allTypes = ["reddit", "twitter", "bluesky", "reliefweb", "pmg"];
    const sourceBreakdown = allTypes.map((type) => ({
      type,
      postsToday: postsByType.get(type) || 0,
      lastRunStatus: sourceByType.get(type)?.lastRunStatus || null,
      lastRun: sourceByType.get(type)?.lastRun || null
    }));
    const activeSnapshot = snapshot || latestSnapshot;
    res.json({
      activePersons: personCount,
      activeSources: sourceCount,
      todaysCycle: cycleLog,
      todaysSnapshot: snapshot ? { generated: true, date: snapshot.date, analysisCost: snapshot.analysisCost, totalPosts: snapshot.totalPostsAnalysed } : { generated: false },
      showingSnapshotDate: activeSnapshot?.date || null,
      sourceBreakdown,
      recentReadings: recentReadings.filter((r) => r.date !== (/* @__PURE__ */ new Date()).toISOString().split("T")[0])
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch health" });
  }
});
router.post("/api/admin/cycle/trigger", isAdmin, async (req, res) => {
  try {
    const user = req.user;
    const mode = req.query.mode || "full";
    const validModes = ["full", "fetch-only", "resummarize", "resynthesize"];
    if (!validModes.includes(mode)) {
      return res.status(400).json({ error: `Invalid mode. Use: ${validModes.join(", ")}` });
    }
    audit({
      action: `admin.cycle.triggered.${mode}`,
      userId: user.id
    });
    const { runDailyCycle: runDailyCycle2 } = await Promise.resolve().then(() => (init_dailyCycle(), dailyCycle_exports));
    runDailyCycle2(mode).catch((err) => console.error("[cycle] Trigger failed:", err));
    const messages = {
      "full": "Full daily cycle triggered. New/missing sources will be fetched, then summarise + synthesise.",
      "fetch-only": "Fetch-only triggered. New/missing sources will be fetched and stored. No summarisation.",
      "resummarize": "Re-summarise triggered. Existing posts will be re-processed by Haiku + Sonnet.",
      "resynthesize": "Re-synthesise triggered. Existing summaries will be re-aggregated by Sonnet."
    };
    res.json({ message: messages[mode], mode });
  } catch (err) {
    res.status(500).json({ error: "Failed to trigger cycle" });
  }
});
router.get("/api/posts/today", isAuthenticated, async (req, res) => {
  try {
    const province = req.query.province;
    if (!province) {
      return res.status(400).json({ error: "province query param required" });
    }
    const latestSnapshot = await getLatestSnapshot();
    const date2 = latestSnapshot?.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const posts = await getPostsForProvince(date2, province);
    res.json(posts);
  } catch (err) {
    console.error("Error fetching posts:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});
router.post("/api/admin/rescan-hints", isAdmin, async (req, res) => {
  try {
    const user = req.user;
    const latestSnapshot = await getLatestSnapshot();
    const date2 = latestSnapshot?.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const result = await rescanProvinceHints(date2);
    audit({
      action: "admin.rescan.hints",
      userId: user.id,
      detail: `${result.updated}/${result.total} updated`
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to rescan hints" });
  }
});
router.get("/api/admin/prompts", isAdmin, async (_req, res) => {
  try {
    const prompts = await getAllSystemPrompts();
    res.json(prompts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch prompts" });
  }
});
router.put("/api/admin/prompts/:id", isAdmin, async (req, res) => {
  try {
    const { name, description, prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt is required" });
    const user = req.user;
    const result = await upsertSystemPrompt(req.params.id, {
      name: name || req.params.id,
      description,
      prompt,
      updatedBy: user.id
    });
    audit({
      action: "admin.prompt.updated",
      userId: user.id,
      resourceType: "system_prompt",
      resourceId: req.params.id
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to update prompt" });
  }
});
router.get("/api/admin/cycle/progress", isAdmin, async (_req, res) => {
  try {
    const { getCycleProgress: getCycleProgress2 } = await Promise.resolve().then(() => (init_dailyCycle(), dailyCycle_exports));
    const progress = getCycleProgress2();
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch progress" });
  }
});
router.delete("/api/admin/cycle/today", isAdmin, async (req, res) => {
  try {
    const user = req.user;
    const from = req.query.from || "all";
    if (from === "summarise") {
      await clearFromSummarise();
    } else if (from === "synthesise") {
      await clearFromSynthesise();
    } else {
      await clearTodaysCycle();
    }
    audit({
      action: `admin.cycle.reset.${from}`,
      userId: user.id
    });
    res.json({ message: `Cycle reset from ${from}.` });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset cycle" });
  }
});
router.get("/api/cron/daily-cycle", async (req, res) => {
  const secret = req.headers.authorization?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const { runDailyCycle: runDailyCycle2 } = await Promise.resolve().then(() => (init_dailyCycle(), dailyCycle_exports));
    runDailyCycle2("full").catch((err) => console.error("[cron] Cycle failed:", err));
    res.json({ message: "Daily cycle triggered via cron" });
  } catch (err) {
    res.status(500).json({ error: "Failed to trigger cycle" });
  }
});
var routes_default = router;

// server/api.ts
init_db();
var app = express();
app.set("trust proxy", 1);
var PgStore = ConnectPgSimple(session);
app.use(helmet());
app.use(
  cors({
    origin: ["https://mzansi.zerogeist.me"],
    credentials: true
  })
);
app.use(rateLimit({ windowMs: 15 * 60 * 1e3, max: 200 }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    store: new PgStore({
      pool,
      tableName: "session",
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || "zerogeist-prod-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1e3
    }
  })
);
app.use(auth_default.initialize());
app.use(auth_default.session());
app.get(
  "/auth/google",
  auth_default.authenticate("google", { scope: ["profile", "email"] })
);
app.get(
  "/auth/callback",
  (req, res, next) => {
    auth_default.authenticate("google", (err, user, info) => {
      if (err) {
        console.error("[auth] Callback error:", err.message);
        return res.redirect("/?error=auth_error");
      }
      if (!user) {
        console.log("[auth] Login rejected:", info?.message || "unknown");
        return res.redirect("/?error=access_denied");
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error("[auth] Session error:", loginErr.message);
          return res.redirect("/?error=auth_error");
        }
        return res.redirect("/");
      });
    })(req, res, next);
  }
);
app.post("/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.json({ success: true });
  });
});
app.use(routes_default);
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "An unexpected error occurred" });
});
var api_default = app;
export {
  api_default as default
};
