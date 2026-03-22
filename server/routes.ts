import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { audit } from "./auditLog.js";
import * as storage from "./storage.js";

const router = Router();

// ─── Middleware ───────────────────────────────────────────
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated" });
}

function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  const user = req.user as any;
  if (user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

// ─── Auth Status ─────────────────────────────────────────
router.get("/api/auth/user", (req, res) => {
  if (req.isAuthenticated() && req.user) {
    const user = req.user as any;
    res.json({
      ...user,
      isAdmin: user.email === process.env.ADMIN_EMAIL,
    });
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

// ─── 8.2 Person Interface ────────────────────────────────

// GET /api/world/today
router.get("/api/world/today", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const pw = await storage.getPersonWorldToday(user.id);
    if (!pw) {
      // Fallback to raw snapshot
      const snapshot = await storage.getLatestSnapshot();
      return res.json({ snapshot, personalised: false });
    }
    // Include the underlying snapshot + post counts for the dashboard
    const snapshot = await storage.getSnapshotById(pw.snapshotId);
    const postCounts = snapshot ? await storage.getPostCountsByProvince(snapshot.date) : {};
    res.json({ ...pw, snapshot, postCounts, personalised: true });
  } catch (err) {
    console.error("Error fetching world:", err);
    res.status(500).json({ error: "Failed to fetch world data" });
  }
});

// GET /api/question/today
router.get("/api/question/today", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    // First check for today's question
    let q = await storage.getTodaysQuestion(user.id);
    if (!q) {
      // Check for unanswered question from previous day
      q = await storage.getLatestUnansweredQuestion(user.id);
    }
    res.json(q);
  } catch (err) {
    console.error("Error fetching question:", err);
    res.status(500).json({ error: "Failed to fetch question" });
  }
});

// POST /api/question/answer
const answerSchema = z.object({
  questionId: z.string().uuid(),
  answerText: z.string().min(1),
});

router.post("/api/question/answer", isAuthenticated, async (req, res) => {
  try {
    const { questionId, answerText } = answerSchema.parse(req.body);
    const user = req.user as any;
    const q = await storage.submitAnswer(questionId, answerText);

    audit({
      action: "question.answered",
      userId: user.id,
      resourceType: "question",
      resourceId: questionId,
    });

    // Mark onboarding complete if first answer
    if (!user.onboardingComplete) {
      const { person } = await import("../shared/schema.js");
      const { eq } = await import("drizzle-orm");
      const { db } = await import("./db.js");
      await db.update(person).set({ onboardingComplete: true }).where(eq(person.id, user.id));
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

// POST /api/question/correct
const correctionSchema = z.object({
  questionId: z.string().uuid(),
  correction: z.string().min(1),
});

router.post("/api/question/correct", isAuthenticated, async (req, res) => {
  try {
    const { questionId, correction } = correctionSchema.parse(req.body);
    const user = req.user as any;
    const q = await storage.submitQuestionCorrection(questionId, correction);

    audit({
      action: "question.corrected",
      userId: user.id,
      resourceType: "question",
      resourceId: questionId,
    });

    res.json(q);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    res.status(500).json({ error: "Failed to submit correction" });
  }
});

// GET /api/proxy
router.get("/api/proxy", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    let p = await storage.getProxy(user.id);
    if (!p) {
      p = await storage.createProxy(user.id);
    }
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch proxy" });
  }
});

// ─── 8.3 Person Settings ────────────────────────────────

// GET /api/settings
router.get("/api/settings", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const p = await storage.getProxy(user.id);
    const history = await storage.getProxyEditHistory(user.id);
    res.json({ proxy: p, editHistory: history });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// PATCH /api/settings/:field
const settingsEditSchema = z.object({
  originalValue: z.any(),
  correctedValue: z.any(),
  reason: z.string().optional(),
});

for (const field of ["values", "tensions", "unknowns", "blind_spots"] as const) {
  const route = field === "blind_spots" ? "blind-spots" : field;
  router.patch(`/api/settings/${route}`, isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const data = settingsEditSchema.parse(req.body);

      await storage.createProxyEdit({
        personId: user.id,
        field,
        originalValue: data.originalValue,
        correctedValue: data.correctedValue,
        reason: data.reason || null,
        applied: true,
      });

      // Update the proxy field
      const currentProxy = await storage.getProxy(user.id);
      if (currentProxy) {
        await storage.updateProxy(user.id, {
          [field === "blind_spots" ? "blindSpots" : field]: data.correctedValue,
        });
      }

      audit({
        action: `settings.${field}.edited`,
        userId: user.id,
        resourceType: "proxy",
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

// GET /api/settings/history
router.get("/api/settings/history", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const history = await storage.getProxyEditHistory(user.id);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch edit history" });
  }
});

// ─── 8.4 Admin ───────────────────────────────────────────

// GET /api/admin/persons
router.get("/api/admin/persons", isAdmin, async (_req, res) => {
  try {
    const persons = await storage.listInvitedPersons();
    res.json(persons);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch persons" });
  }
});

// POST /api/admin/persons
const addPersonSchema = z.object({
  email: z.string().email(),
  note: z.string().optional(),
});

router.post("/api/admin/persons", isAdmin, async (req, res) => {
  try {
    const { email, note } = addPersonSchema.parse(req.body);
    const user = req.user as any;
    const result = await storage.addInvitedPerson(email, note || null, user.id);

    audit({
      action: "admin.person.invited",
      userId: user.id,
      resourceType: "invited_person",
      resourceId: result.id,
      detail: email,
    });

    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    res.status(500).json({ error: "Failed to add person" });
  }
});

// PATCH /api/admin/persons/:id
const updatePersonSchema = z.object({
  active: z.boolean().optional(),
  note: z.string().optional(),
});

router.patch("/api/admin/persons/:id", isAdmin, async (req, res) => {
  try {
    const data = updatePersonSchema.parse(req.body);
    const result = await storage.updateInvitedPerson(req.params.id, data);
    const user = req.user as any;

    audit({
      action: data.active === false ? "admin.person.revoked" : "admin.person.updated",
      userId: user.id,
      resourceType: "invited_person",
      resourceId: req.params.id,
    });

    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    res.status(500).json({ error: "Failed to update person" });
  }
});

// GET /api/admin/sources
router.get("/api/admin/sources", isAdmin, async (_req, res) => {
  try {
    const sources = await storage.listSources();
    res.json(sources);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sources" });
  }
});

// POST /api/admin/sources
const addSourceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["reddit", "reliefweb", "pmg", "telegram", "rss", "twitter", "other"]),
  identifier: z.string().min(1),
  region: z.enum(["national", "provincial", "local"]),
  province: z.string().optional(),
  language: z.string().default("en"),
  difficulty: z.number().min(1).max(5).default(1),
  costPerRun: z.number().default(0),
  signalQuality: z.number().min(1).max(5).default(3),
  notes: z.string().optional(),
});

router.post("/api/admin/sources", isAdmin, async (req, res) => {
  try {
    const data = addSourceSchema.parse(req.body);
    const user = req.user as any;
    const result = await storage.addSource({
      ...data,
      province: data.province || null,
      notes: data.notes || null,
      addedBy: user.id,
    });

    audit({
      action: "admin.source.added",
      userId: user.id,
      resourceType: "source",
      resourceId: result.id,
      detail: data.name,
    });

    res.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors });
    }
    res.status(500).json({ error: "Failed to add source" });
  }
});

// PATCH /api/admin/sources/:id
router.patch("/api/admin/sources/:id", isAdmin, async (req, res) => {
  try {
    const result = await storage.updateSource(req.params.id, req.body);
    const user = req.user as any;

    audit({
      action: "admin.source.updated",
      userId: user.id,
      resourceType: "source",
      resourceId: req.params.id,
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to update source" });
  }
});

// GET /api/admin/health
router.get("/api/admin/health", isAdmin, async (_req, res) => {
  try {
    const [personCount, sourceCount, cycleLog, snapshot] = await Promise.all([
      storage.getActivePersonCount(),
      storage.getActiveSourceCount(),
      storage.getTodaysCycleLog(),
      storage.getTodaysSnapshot(),
    ]);

    res.json({
      activePersons: personCount,
      activeSources: sourceCount,
      todaysCycle: cycleLog,
      todaysSnapshot: snapshot
        ? { generated: true, date: snapshot.date, analysisCost: snapshot.analysisCost, totalPosts: snapshot.totalPostsAnalysed }
        : { generated: false },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch health" });
  }
});

// POST /api/admin/cycle/trigger
router.post("/api/admin/cycle/trigger", isAdmin, async (req, res) => {
  try {
    const user = req.user as any;
    audit({
      action: "admin.cycle.triggered",
      userId: user.id,
    });

    // Trigger the daily cycle asynchronously
    const { runDailyCycle } = await import("./dailyCycle.js");
    runDailyCycle().catch((err) => console.error("[cycle] Trigger failed:", err));

    res.json({ message: "Daily cycle triggered. Check platform health for status." });
  } catch (err) {
    res.status(500).json({ error: "Failed to trigger cycle" });
  }
});

// GET /api/posts/today — real posts for province drill-down
router.get("/api/posts/today", isAuthenticated, async (req, res) => {
  try {
    const province = req.query.province as string;
    if (!province) {
      return res.status(400).json({ error: "province query param required" });
    }
    // Use the latest snapshot date, not today — handles timezone/stale data
    const latestSnapshot = await storage.getLatestSnapshot();
    const date = latestSnapshot?.date || new Date().toISOString().split("T")[0];
    const posts = await storage.getPostsForProvince(date, province);
    res.json(posts);
  } catch (err) {
    console.error("Error fetching posts:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// GET /api/admin/cycle/progress
router.get("/api/admin/cycle/progress", isAdmin, async (_req, res) => {
  try {
    const { getCycleProgress } = await import("./dailyCycle.js");
    const progress = getCycleProgress();
    res.json(progress);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch progress" });
  }
});

// DELETE /api/admin/cycle/today?from=summarise|synthesise|all
router.delete("/api/admin/cycle/today", isAdmin, async (req, res) => {
  try {
    const user = req.user as any;
    const from = (req.query.from as string) || "all";

    if (from === "summarise") {
      await storage.clearFromSummarise();
    } else if (from === "synthesise") {
      await storage.clearFromSynthesise();
    } else {
      await storage.clearTodaysCycle();
    }

    audit({
      action: `admin.cycle.reset.${from}`,
      userId: user.id,
    });

    res.json({ message: `Cycle reset from ${from}.` });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset cycle" });
  }
});

export default router;
