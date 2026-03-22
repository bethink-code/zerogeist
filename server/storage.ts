import { db } from "./db.js";
import {
  person,
  invitedPerson,
  proxy,
  question,
  worldSnapshot,
  personWorld,
  source,
  personSource,
  proxyEdit,
  dailyCycleLog,
  rawPost,
  postSummary,
} from "../shared/schema.js";
import { eq, desc, and, lt } from "drizzle-orm";

// ─── Person ──────────────────────────────────────────────
export async function getPersonById(id: string) {
  const [p] = await db.select().from(person).where(eq(person.id, id));
  return p || null;
}

export async function updatePersonLastActive(id: string) {
  await db.update(person).set({ lastActive: new Date() }).where(eq(person.id, id));
}

// ─── Invited Persons ─────────────────────────────────────
export async function listInvitedPersons() {
  return db.select().from(invitedPerson).orderBy(desc(invitedPerson.invitedAt));
}

export async function addInvitedPerson(email: string, note: string | null, invitedBy: string | null) {
  const [result] = await db
    .insert(invitedPerson)
    .values({ email, note, invitedBy })
    .returning();
  return result;
}

export async function updateInvitedPerson(id: string, data: Partial<typeof invitedPerson.$inferInsert>) {
  const [result] = await db
    .update(invitedPerson)
    .set(data)
    .where(eq(invitedPerson.id, id))
    .returning();
  return result;
}

// ─── Proxy ───────────────────────────────────────────────
export async function getProxy(personId: string) {
  const [p] = await db.select().from(proxy).where(eq(proxy.personId, personId));
  return p || null;
}

export async function createProxy(personId: string) {
  const [p] = await db
    .insert(proxy)
    .values({ personId })
    .returning();
  return p;
}

export async function updateProxy(personId: string, data: Partial<typeof proxy.$inferInsert>) {
  const [p] = await db
    .update(proxy)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(proxy.personId, personId))
    .returning();
  return p;
}

// ─── Questions ───────────────────────────────────────────
export async function getTodaysQuestion(personId: string) {
  const today = new Date().toISOString().split("T")[0];
  const [q] = await db
    .select()
    .from(question)
    .where(and(eq(question.personId, personId), eq(question.date, today)));
  return q || null;
}

export async function getLatestUnansweredQuestion(personId: string) {
  const [q] = await db
    .select()
    .from(question)
    .where(and(eq(question.personId, personId)))
    .orderBy(desc(question.date))
    .limit(1);
  if (q && !q.answeredAt) return q;
  return null;
}

export async function getQuestionHistory(personId: string) {
  return db
    .select()
    .from(question)
    .where(eq(question.personId, personId))
    .orderBy(desc(question.date));
}

export async function createQuestion(data: typeof question.$inferInsert) {
  const [q] = await db.insert(question).values(data).returning();
  return q;
}

export async function submitAnswer(questionId: string, answerText: string) {
  const [q] = await db
    .update(question)
    .set({
      answeredAt: new Date(),
      answerText,
      answerLength: answerText.length,
    })
    .where(eq(question.id, questionId))
    .returning();
  return q;
}

export async function updateQuestionExtraction(
  questionId: string,
  data: {
    answerTone?: string;
    extractedValues?: any;
    extractedTensions?: any;
    extractedUnknowns?: any;
    proxyUpdated?: boolean;
  }
) {
  const [q] = await db
    .update(question)
    .set(data)
    .where(eq(question.id, questionId))
    .returning();
  return q;
}

export async function submitQuestionCorrection(questionId: string, correction: string) {
  const [q] = await db
    .update(question)
    .set({ personCorrection: correction })
    .where(eq(question.id, questionId))
    .returning();
  return q;
}

// ─── World Snapshots ─────────────────────────────────────
export async function getTodaysSnapshot() {
  const today = new Date().toISOString().split("T")[0];
  const [s] = await db
    .select()
    .from(worldSnapshot)
    .where(eq(worldSnapshot.date, today));
  return s || null;
}

export async function getSnapshotById(id: string) {
  const [s] = await db.select().from(worldSnapshot).where(eq(worldSnapshot.id, id));
  return s || null;
}

export async function getLatestSnapshot() {
  const [s] = await db
    .select()
    .from(worldSnapshot)
    .orderBy(desc(worldSnapshot.date))
    .limit(1);
  return s || null;
}

export async function createWorldSnapshot(data: typeof worldSnapshot.$inferInsert) {
  const [s] = await db.insert(worldSnapshot).values(data).returning();
  return s;
}

// ─── Person World ────────────────────────────────────────
export async function getPersonWorldToday(personId: string) {
  const today = new Date().toISOString().split("T")[0];
  const [pw] = await db
    .select()
    .from(personWorld)
    .where(and(eq(personWorld.personId, personId), eq(personWorld.date, today)));
  if (pw) return pw;

  // Fallback to latest
  const [latest] = await db
    .select()
    .from(personWorld)
    .where(eq(personWorld.personId, personId))
    .orderBy(desc(personWorld.date))
    .limit(1);
  return latest || null;
}

export async function createPersonWorld(data: typeof personWorld.$inferInsert) {
  const [pw] = await db.insert(personWorld).values(data).returning();
  return pw;
}

// ─── Sources ─────────────────────────────────────────────
export async function listSources() {
  return db.select().from(source).orderBy(source.name);
}

export async function getActiveSources() {
  return db.select().from(source).where(eq(source.active, true));
}

export async function addSource(data: typeof source.$inferInsert) {
  const [s] = await db.insert(source).values(data).returning();
  return s;
}

export async function updateSource(id: string, data: Partial<typeof source.$inferInsert>) {
  const [s] = await db
    .update(source)
    .set(data)
    .where(eq(source.id, id))
    .returning();
  return s;
}

// ─── Person Sources ──────────────────────────────────────
export async function getPersonSources(personId: string) {
  return db.select().from(personSource).where(eq(personSource.personId, personId));
}

// ─── Proxy Edits ─────────────────────────────────────────
export async function createProxyEdit(data: typeof proxyEdit.$inferInsert) {
  const [e] = await db.insert(proxyEdit).values(data).returning();
  return e;
}

export async function getProxyEditHistory(personId: string) {
  return db
    .select()
    .from(proxyEdit)
    .where(eq(proxyEdit.personId, personId))
    .orderBy(desc(proxyEdit.editedAt));
}

// ─── Daily Cycle Log ─────────────────────────────────────
export async function getTodaysCycleLog() {
  const today = new Date().toISOString().split("T")[0];
  const [log] = await db
    .select()
    .from(dailyCycleLog)
    .where(eq(dailyCycleLog.date, today));
  return log || null;
}

export async function createCycleLog(data: typeof dailyCycleLog.$inferInsert) {
  const [log] = await db.insert(dailyCycleLog).values(data).returning();
  return log;
}

export async function updateCycleLog(id: string, data: Partial<typeof dailyCycleLog.$inferInsert>) {
  const [log] = await db
    .update(dailyCycleLog)
    .set(data)
    .where(eq(dailyCycleLog.id, id))
    .returning();
  return log;
}

// ─── Admin Health ────────────────────────────────────────
export async function getActivePersonCount() {
  const persons = await db.select().from(person);
  return persons.length;
}

export async function getActiveSourceCount() {
  const sources = await db.select().from(source).where(eq(source.active, true));
  return sources.length;
}

// ─── All Active Persons ─────────────────────────────────
export async function getAllActivePersons() {
  return db.select().from(person);
}

// ─── Raw Posts ──────────────────────────────────────────

// Province hint mapping from known source identifiers
const PROVINCE_HINTS: Record<string, string> = {
  // Reddit subreddits
  joburg: "GP",
  pretoria: "GP",
  capetown: "WC",
  durban: "KZN",
  // Twitter geo search terms (matched by keyword in text)
  johannesburg: "GP", jozi: "GP", joburg_tw: "GP",
  "cape town": "WC", kaapstad: "WC",
  ethekwini: "KZN",
  tshwane: "GP",
  soweto: "GP", alexandra: "GP", sandton: "GP",
  gqeberha: "EC", "port elizabeth": "EC",
  bloemfontein: "FS", mangaung: "FS",
  polokwane: "LP", nelspruit: "MP", mbombela: "MP",
};

function inferProvinceHint(post: {
  sourceType: string;
  metadata?: any;
  body?: string;
  title?: string;
}): string | null {
  // Reddit: use subreddit name
  if (post.sourceType === "reddit" && post.metadata?.subreddit) {
    return PROVINCE_HINTS[post.metadata.subreddit.toLowerCase()] || null;
  }

  // Twitter: use provinceTag from search term (most reliable)
  if (post.sourceType === "twitter" && post.metadata?.provinceTag) {
    return post.metadata.provinceTag;
  }

  // Fallback: scan text for geo keywords
  const text = ((post.title || "") + " " + (post.body || "")).toLowerCase();
  for (const [keyword, province] of Object.entries(PROVINCE_HINTS)) {
    if (text.includes(keyword)) return province;
  }

  return null;
}

export async function storeRawPosts(
  posts: {
    sourceType: "reddit" | "reliefweb" | "pmg" | "twitter" | "telegram" | "rss" | "other";
    title?: string;
    body: string;
    author?: string;
    url?: string;
    publishedAt?: Date;
    engagement?: any;
    metadata?: any;
  }[],
  date: string
): Promise<number> {
  let stored = 0;
  for (const post of posts) {
    try {
      const hint = inferProvinceHint(post);
      await db.insert(rawPost).values({
        date,
        sourceType: post.sourceType,
        externalId: post.url || `${post.sourceType}-${Date.now()}-${stored}`,
        title: post.title || null,
        body: post.body.slice(0, 5000),
        author: post.author || null,
        url: post.url || null,
        publishedAt: post.publishedAt || null,
        engagement: post.engagement || null,
        metadata: post.metadata || null,
        provinceHint: hint,
      });
      stored++;
    } catch (err: any) {
      // Skip duplicates (unique constraint on date + externalId)
      if (!err.message?.includes("duplicate") && !err.message?.includes("unique")) {
        console.error(`[storage] Failed to store raw post: ${err.message}`);
      }
    }
  }
  return stored;
}

export async function getRawPostsByDate(date: string) {
  return db.select().from(rawPost).where(eq(rawPost.date, date));
}

export async function pruneOldRawPosts(daysToKeep: number = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);
  const cutoffDate = cutoff.toISOString().split("T")[0];
  await db.delete(postSummary).where(lt(postSummary.date, cutoffDate));
  await db.delete(rawPost).where(lt(rawPost.date, cutoffDate));
}

// ─── Post Summaries ─────────────────────────────────────
export async function storeSummaries(
  summaries: (typeof postSummary.$inferInsert)[]
): Promise<number> {
  let stored = 0;
  for (const s of summaries) {
    await db.insert(postSummary).values(s);
    stored++;
  }
  return stored;
}

export async function getSummariesByDate(date: string) {
  return db.select().from(postSummary).where(eq(postSummary.date, date));
}

// ─── Posts with Summaries (for drill-down) ──────────────
export async function getPostCountsByProvince(date: string) {
  const rows = await db
    .select({
      provinceId: postSummary.provinceId,
    })
    .from(postSummary)
    .where(eq(postSummary.date, date));

  const counts = new Map<string, number>();
  for (const r of rows) {
    counts.set(r.provinceId, (counts.get(r.provinceId) || 0) + 1);
  }
  return Object.fromEntries(counts);
}

export async function getPostsForProvince(date: string, provinceId: string) {
  return db
    .select({
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
    })
    .from(rawPost)
    .innerJoin(postSummary, eq(rawPost.id, postSummary.rawPostId))
    .where(and(eq(postSummary.date, date), eq(postSummary.provinceId, provinceId)))
    .orderBy(desc(postSummary.signalStrength));
}

// ─── Clear Today's Cycle ────────────────────────────────
export async function clearTodaysCycle() {
  const today = new Date().toISOString().split("T")[0];
  const [snapshot] = await db.select().from(worldSnapshot).where(eq(worldSnapshot.date, today));
  if (snapshot) {
    await db.delete(personWorld).where(eq(personWorld.snapshotId, snapshot.id));
    await db.delete(worldSnapshot).where(eq(worldSnapshot.id, snapshot.id));
  }
  await db.delete(dailyCycleLog).where(eq(dailyCycleLog.date, today));
}

// Reset from summarise — keeps raw posts, deletes summaries + snapshot + cycle log
export async function clearFromSummarise() {
  const today = new Date().toISOString().split("T")[0];
  const [snapshot] = await db.select().from(worldSnapshot).where(eq(worldSnapshot.date, today));
  if (snapshot) {
    await db.delete(personWorld).where(eq(personWorld.snapshotId, snapshot.id));
    await db.delete(worldSnapshot).where(eq(worldSnapshot.id, snapshot.id));
  }
  await db.delete(postSummary).where(eq(postSummary.date, today));
  await db.delete(dailyCycleLog).where(eq(dailyCycleLog.date, today));
}

// Reset from synthesise — keeps raw posts + summaries, deletes snapshot + cycle log
export async function clearFromSynthesise() {
  const today = new Date().toISOString().split("T")[0];
  const [snapshot] = await db.select().from(worldSnapshot).where(eq(worldSnapshot.date, today));
  if (snapshot) {
    await db.delete(personWorld).where(eq(personWorld.snapshotId, snapshot.id));
    await db.delete(worldSnapshot).where(eq(worldSnapshot.id, snapshot.id));
  }
  await db.delete(dailyCycleLog).where(eq(dailyCycleLog.date, today));
}
