import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "./db.js";
import { person, invitedPerson } from "../shared/schema.js";
import { eq } from "drizzle-orm";

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
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
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "/auth/callback",
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(null, false, { message: "No email found in Google profile" });
        }

        // Check whitelist — admin is always allowed
        const isAdmin = email === process.env.ADMIN_EMAIL;
        if (!isAdmin) {
          const [invite] = await db
            .select()
            .from(invitedPerson)
            .where(eq(invitedPerson.email, email));

          if (!invite || !invite.active) {
            return done(null, false, {
              message: "This is a private space. Access is by invitation only.",
            });
          }

          // Record first login if not yet set
          if (!invite.firstLogin) {
            await db
              .update(invitedPerson)
              .set({ firstLogin: new Date(), personId: profile.id })
              .where(eq(invitedPerson.id, invite.id));
          }
        }

        // Upsert person record
        const [existing] = await db
          .select()
          .from(person)
          .where(eq(person.id, profile.id));

        if (existing) {
          await db
            .update(person)
            .set({
              lastActive: new Date(),
              name: profile.displayName,
              avatar: profile.photos?.[0]?.value || existing.avatar,
            })
            .where(eq(person.id, profile.id));
          return done(null, existing);
        }

        const [newPerson] = await db
          .insert(person)
          .values({
            id: profile.id,
            email,
            name: profile.displayName,
            avatar: profile.photos?.[0]?.value || null,
          })
          .returning();

        return done(null, newPerson);
      } catch (err) {
        return done(err as Error, undefined);
      }
    }
  )
);

export default passport;
