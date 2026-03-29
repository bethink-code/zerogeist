// Vercel serverless entry point
// This file mirrors server/index.ts but exports a handler for Vercel

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
app.set("trust proxy", 1); // Trust Vercel's HTTPS proxy
const PgStore = ConnectPgSimple(session);

app.use(helmet());
app.use(
  cors({
    origin: ["https://mzansi.zerogeist.me"],
    credentials: true,
  })
);
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    store: new PgStore({
      pool: pool as any,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "zerogeist-prod-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/callback",
  passport.authenticate("google", {
    failureRedirect: "/?error=access_denied",
  }),
  (_req, res) => res.redirect("/")
);

app.post("/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });
    res.json({ success: true });
  });
});

app.use(routes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "An unexpected error occurred" });
});

export default app;
