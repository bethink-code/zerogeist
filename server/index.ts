import "dotenv/config";
import express from "express";
import session from "express-session";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import ConnectPgSimple from "connect-pg-simple";
import passport from "./auth.js";
import routes from "./routes.js";
import { pool } from "./db.js";

const app = express();
const PgStore = ConnectPgSimple(session);

// Security headers — relaxed CSP for development
app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === "production"
        ? undefined
        : false,
  })
);

// CORS
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://mzansi.zerogeist.me"]
        : ["http://localhost:5173", "http://localhost:5000"],
    credentials: true,
  })
);

// Rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Sessions
app.use(
  session({
    store: new PgStore({
      pool: pool as any,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "zerogeist-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Auth routes
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/callback",
  passport.authenticate("google", {
    failureRedirect: process.env.NODE_ENV === "production" ? "/?error=access_denied" : "http://localhost:5173/?error=access_denied",
    failureMessage: true,
  }),
  (_req, res) => {
    res.redirect(process.env.NODE_ENV === "production" ? "/" : "http://localhost:5173/");
  }
);

app.post("/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.json({ success: true });
  });
});

// API routes
app.use(routes);

// Error sanitization — never expose stack traces
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: process.env.NODE_ENV === "production"
      ? "An unexpected error occurred"
      : err.message,
  });
});

// Daily cycle scheduler
import cron from "node-cron";
import { runDailyCycle } from "./dailyCycle.js";

const cronExpression = process.env.DAILY_CYCLE_CRON || "0 3 * * *";
const cronTimezone = process.env.DAILY_CYCLE_TIMEZONE || "Africa/Johannesburg";

cron.schedule(cronExpression, () => {
  console.log("[cron] Triggering daily cycle...");
  runDailyCycle().catch((err) => console.error("[cron] Daily cycle failed:", err));
}, { timezone: cronTimezone });

console.log(`[cron] Daily cycle scheduled: ${cronExpression} (${cronTimezone})`);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[zerogeist] Server running on port ${PORT}`);
});

export default app;
