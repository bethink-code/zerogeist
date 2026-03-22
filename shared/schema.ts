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
  pgEnum,
} from "drizzle-orm/pg-core";

// Enums
export const questionTerritoryEnum = pgEnum("question_territory", [
  "values",
  "tension",
  "unknown",
  "blind_spot",
  "world",
]);

export const answerToneEnum = pgEnum("answer_tone", [
  "analytical",
  "emotional",
  "resistant",
  "open",
  "brief",
]);

export const sourceTypeEnum = pgEnum("source_type", [
  "reddit",
  "reliefweb",
  "pmg",
  "telegram",
  "rss",
  "twitter",
  "other",
]);

export const sourceRegionEnum = pgEnum("source_region", [
  "national",
  "provincial",
  "local",
]);

export const sourceRunStatusEnum = pgEnum("source_run_status", [
  "success",
  "failed",
  "rate_limited",
  "empty",
]);

export const proxyEditFieldEnum = pgEnum("proxy_edit_field", [
  "values",
  "tensions",
  "unknowns",
  "blind_spots",
]);

export const emotionEnum = pgEnum("emotion", [
  "anger",
  "hope",
  "fear",
  "joy",
  "grief",
]);

// 3.1 person — Google OAuth sub as primary key
export const person = pgTable("person", {
  id: text("id").primaryKey(), // Google OAuth sub
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActive: timestamp("last_active").defaultNow().notNull(),
  onboardingComplete: boolean("onboarding_complete").default(false).notNull(),
});

// 3.2 invited_person
export const invitedPerson = pgTable("invited_person", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  invitedBy: text("invited_by").references(() => person.id),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  note: text("note"),
  firstLogin: timestamp("first_login"),
  active: boolean("active").default(true).notNull(),
  personId: text("person_id").references(() => person.id),
});

// 3.3 proxy
export const proxy = pgTable("proxy", {
  id: uuid("id").defaultRandom().primaryKey(),
  personId: text("person_id")
    .references(() => person.id)
    .notNull()
    .unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  values: jsonb("values").default([]).notNull(),
  tensions: jsonb("tensions").default([]).notNull(),
  unknowns: jsonb("unknowns").default([]).notNull(),
  blindSpots: jsonb("blind_spots").default([]).notNull(),
  overrides: jsonb("overrides").default([]).notNull(),
  confidenceScore: real("confidence_score").default(0).notNull(),
  daysActive: integer("days_active").default(0).notNull(),
});

// 3.4 question
export const question = pgTable("question", {
  id: uuid("id").defaultRandom().primaryKey(),
  personId: text("person_id")
    .references(() => person.id)
    .notNull(),
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
  personCorrection: text("person_correction"),
});

// 3.5 world_snapshot
export const worldSnapshot = pgTable("world_snapshot", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: date("date").notNull().unique(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  sourceIds: jsonb("source_ids").default([]).notNull(),
  nationalDigest: text("national_digest"),
  nationalEmotion: jsonb("national_emotion"),
  nationalIntensity: real("national_intensity"),
  nationalConsensus: real("national_consensus"),
  provinces: jsonb("provinces").default([]).notNull(),
  totalPostsAnalysed: integer("total_posts_analysed").default(0).notNull(),
  analysisCost: real("analysis_cost").default(0).notNull(),
});

// 3.6 person_world
export const personWorld = pgTable("person_world", {
  id: uuid("id").defaultRandom().primaryKey(),
  personId: text("person_id")
    .references(() => person.id)
    .notNull(),
  snapshotId: uuid("snapshot_id")
    .references(() => worldSnapshot.id)
    .notNull(),
  date: date("date").notNull(),
  weightedProvinces: jsonb("weighted_provinces"),
  weightedThemes: jsonb("weighted_themes"),
  personalDigest: text("personal_digest"),
  personalQuestionContext: text("personal_question_context"),
});

// 3.7 source
export const source = pgTable("source", {
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
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

// 3.8 person_source
export const personSource = pgTable("person_source", {
  id: uuid("id").defaultRandom().primaryKey(),
  personId: text("person_id")
    .references(() => person.id)
    .notNull(),
  sourceId: uuid("source_id")
    .references(() => source.id)
    .notNull(),
  active: boolean("active").default(true).notNull(),
  weight: real("weight").default(1.0).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

// 3.9 proxy_edit
export const proxyEdit = pgTable("proxy_edit", {
  id: uuid("id").defaultRandom().primaryKey(),
  personId: text("person_id")
    .references(() => person.id)
    .notNull(),
  editedAt: timestamp("edited_at").defaultNow().notNull(),
  field: proxyEditFieldEnum("field").notNull(),
  originalValue: jsonb("original_value"),
  correctedValue: jsonb("corrected_value"),
  reason: text("reason"),
  applied: boolean("applied").default(false).notNull(),
});

// Raw post — every fetched item stored for traceability
export const rawPost = pgTable("raw_post", {
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
  provinceHint: text("province_hint"),
});

// Post summary — Claude-generated per-post analysis
export const postSummary = pgTable("post_summary", {
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
  batchId: text("batch_id"),
});

// Sessions table for connect-pg-simple
export const sessions = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

// Daily cycle cost log
export const dailyCycleLog = pgTable("daily_cycle_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: date("date").notNull().unique(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  status: text("status").default("in_progress").notNull(),
  failedAtStep: text("failed_at_step"),
  totalCost: real("total_cost").default(0).notNull(),
  sourcesRun: integer("sources_run").default(0).notNull(),
  personsProcessed: integer("persons_processed").default(0).notNull(),
});
