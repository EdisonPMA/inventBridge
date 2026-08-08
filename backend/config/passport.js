/**
 * Passport.js configuration — Google OAuth 2.0 strategy.
 *
 * Called once in server.js: require('./config/passport')(passport)
 * Stateless — no sessions. JWT is issued after callback and sent to frontend.
 */
const passport       = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const db             = require("./database");
const { v4: uuidv4 } = require("uuid");

require("./env");

module.exports = function configurePassport() {
  passport.use(
    new GoogleStrategy(
      {
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:  process.env.GOOGLE_CALLBACK_URL,
        scope:        ["profile", "email"],
        // passReqToCallback not needed — keep it stateless
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const googleId    = profile.id;
          const email       = profile.emails?.[0]?.value?.toLowerCase().trim();
          const firstName   = profile.name?.givenName  || profile.displayName?.split(" ")[0] || "User";
          const lastName    = profile.name?.familyName || profile.displayName?.split(" ").slice(1).join(" ") || "";
          const profilePhoto = profile.photos?.[0]?.value || null;

          if (!email) {
            return done(null, false, { message: "No email returned by Google. Enable email scope." });
          }

          // 1. Does the email already exist?
          const [[existing]] = await db.execute(
            `SELECT u.id, u.uuid, u.email, u.role, u.status, u.token_version,
                    u.google_id, u.provider,
                    p.first_name, p.last_name, p.profile_photo AS profile_photo_p,
                    p.headline, p.verification_level
             FROM users u
             LEFT JOIN profiles p ON p.user_id = u.id
             WHERE LOWER(u.email) = ? LIMIT 1`,
            [email]
          );

          if (existing) {
            // Account exists — check not suspended
            if (existing.status === "suspended") {
              return done(null, false, { message: "Your account has been suspended." });
            }

            // Link Google if not already linked
            if (!existing.google_id) {
              await db.execute(
                "UPDATE users SET google_id = ?, provider = 'google', email_verified = TRUE WHERE id = ?",
                [googleId, existing.id]
              );
              // Store Google photo in profile if none set
              if (profilePhoto && !existing.profile_photo_p) {
                await db.execute(
                  "UPDATE profiles SET profile_photo = ? WHERE user_id = ?",
                  [profilePhoto, existing.id]
                );
              }
            }

            // Touch last_login
            await db.execute(
              "UPDATE users SET last_login = NOW() WHERE id = ?",
              [existing.id]
            );

            // Return enriched user row
            const [[fresh]] = await db.execute(
              `SELECT u.id, u.uuid, u.email, u.role, u.status, u.token_version,
                      p.first_name, p.last_name, p.profile_photo,
                      p.headline, p.verification_level
               FROM users u LEFT JOIN profiles p ON p.user_id = u.id
               WHERE u.id = ? LIMIT 1`,
              [existing.id]
            );
            return done(null, fresh);
          }

          // 2. New user — create account + profile
          const uuid = uuidv4();
          const [result] = await db.execute(
            `INSERT INTO users
               (uuid, email, password_hash, role, status, provider,
                google_id, email_verified, profile_photo)
             VALUES (?, ?, '', 'inventor', 'active', 'google', ?, TRUE, ?)`,
            [uuid, email, googleId, profilePhoto]
          );
          const newUserId = result.insertId;

          await db.execute(
            `INSERT INTO profiles (user_id, first_name, last_name, profile_photo)
             VALUES (?, ?, ?, ?)`,
            [newUserId, firstName, lastName, profilePhoto]
          );

          await db.execute(
            "UPDATE users SET last_login = NOW() WHERE id = ?",
            [newUserId]
          );

          const [[newUser]] = await db.execute(
            `SELECT u.id, u.uuid, u.email, u.role, u.status, u.token_version,
                    p.first_name, p.last_name, p.profile_photo,
                    p.headline, p.verification_level
             FROM users u LEFT JOIN profiles p ON p.user_id = u.id
             WHERE u.id = ? LIMIT 1`,
            [newUserId]
          );

          return done(null, newUser);
        } catch (err) {
          console.error("[Passport:Google] strategy error:", err.message);
          return done(err);
        }
      }
    )
  );

  // No serializeUser/deserializeUser — JWT-only, no sessions needed
  return passport;
};
