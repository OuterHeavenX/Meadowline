# Meadowline — Cloud Saves & Supabase Auth

Status: production cloud-save foundation on `main`; in-app email OTP replacement under test on `feature/email-otp-auth`.

## Architecture

Meadowline keeps Save V3 (`meadowline.v3`) as the authoritative local/offline save format. Cloud integration wraps that same payload rather than replacing the simulation save architecture.

Guest/local play remains supported with no account.

The Supabase client is loaded with a dynamic `import()` the first time the player opens the Account & Cloud Saves panel, never during boot. A static import would place the entire module graph — game loop, renderer and Save V3 included — behind one CDN request, so an unreachable host would stop Meadowline from starting at all rather than merely disabling cloud saves. `tests/module-hygiene.mjs` fails the build if any module reintroduces a static off-origin import. Vendoring the client under `assets/vendor/` alongside Three.js remains the stronger follow-up and would remove the runtime dependency entirely.

Signed-in play adds a protected Supabase cloud copy per save slot. The browser uses only the Supabase publishable key. No service-role or secret key is shipped to clients.

## Supabase backend

Current foundation includes:

- `player_profiles` keyed to `auth.users`
- `city_saves` with up to 10 slots per user
- RLS ownership policies
- atomic revision-aware writes
- current save integrity validation for Meadowline Save V3
- five previous revisions retained per slot
- protected restore operation
- restore creates a new revision instead of rewinding/deleting history

## Authentication direction

The original production auth flow uses Supabase Magic Links. Physical iPhone testing exposed a poor installed-web-app experience: the email link opens Safari, Safari receives the auth session, and the Home Screen-installed Meadowline instance may remain signed out because it owns a different browser-storage context.

`feature/email-otp-auth` replaces that flow with in-app email OTP:

1. Player enters email inside Meadowline.
2. Supabase emails a six-digit code.
3. Player returns to the same Meadowline instance.
4. Player enters the code inside the Account & Cloud Saves panel.
5. Meadowline verifies the OTP in-place and persists the Supabase session in that app context.

The branch disables URL-session detection because the intended flow no longer depends on a browser callback.

The pending email address is stored locally so leaving Meadowline briefly to read Mail/Gmail does not reset the login screen. Resends remain subject to a 60-second client cooldown.

## Required hosted Auth configuration

The client code is ready for email OTP, but hosted Supabase must send the token in the Magic Link / OTP email template. The template must contain `{{ .Token }}` rather than relying only on `{{ .ConfirmationURL }}`.

The current hosted project requires custom SMTP before Supabase allows editing that template. Until custom SMTP + the token template are configured, the OTP branch should remain unmerged because users would not receive a visible six-digit code.

## Current cloud-save client behavior

The account panel supports:

- signed-out/local-only play
- manual `Upload local city`
- manual `Use cloud city`
- explicit confirmation before replacing local Save V3
- current cloud revision display
- previous revision list
- restore of a previous cloud revision
- sign out without deleting the local city
- friendly cloud/auth failure messaging
- 60-second client resend cooldown

No automatic cloud upload or automatic cloud download is enabled.

Cloud replacement is staged through the Save V3 lifecycle guard before reload.
This prevents `visibilitychange` and `pagehide` from autosaving the old device's
in-memory city over the newly downloaded payload during navigation. The same
guard protects imported files and local recovery restores.

## Cloudflare

Production Pages URL:

`https://meadowline-3mp.pages.dev`

Email-OTP branch preview alias after Cloudflare deploys the branch:

`https://feature-email-otp-auth.meadowline-3mp.pages.dev`

## Previously proven physical iPhone evidence — August 25, 2026

- [x] Cloudflare production deployment loads Meadowline.
- [x] Account & Cloud Saves panel renders in iPhone portrait.
- [x] Original passwordless Magic Link sign-in round trip succeeds in Safari.
- [x] Signed-in session is recognized in the browser context that completed auth.
- [x] First local Save V3 upload creates a real Supabase cloud save.
- [x] Subsequent uploads increment cloud revision.
- [x] Previous revisions are archived.
- [x] Cloud download replaces local Save V3 only after confirmation.
- [x] Downloaded cloud city reloads successfully in Meadowline.
- [x] Local city remains playable while signed out or while auth email is unavailable.
- [x] Built-in Supabase email rate limiting was encountered during repeated QA and is mapped to player-friendly language.

## Email OTP acceptance before merge

- [ ] Configure custom SMTP on the hosted Supabase project.
- [ ] Change the Magic Link / OTP email template to display `{{ .Token }}`.
- [ ] Home Screen-installed Meadowline requests a code without opening Safari.
- [ ] Email visibly contains a six-digit code.
- [ ] Leaving Meadowline for Mail/Gmail and returning preserves the pending-email/code-entry screen.
- [ ] Entering the correct six-digit code signs in without browser redirect.
- [ ] Closing and reopening the Home Screen-installed app keeps the player signed in.
- [ ] Session auto-refresh works without requiring another code during normal use.
- [ ] Incorrect code produces friendly feedback.
- [ ] Expired code produces friendly feedback.
- [ ] Resend respects cooldown and works after cooldown.
- [ ] Change Email returns cleanly to the email-entry step.
- [ ] Existing cloud save remains accessible after signing in through OTP.
- [ ] Existing local Save V3 remains untouched throughout failed/successful login attempts.

Do not merge `feature/email-otp-auth` until the hosted email template is actually sending visible OTP codes and physical installed-app persistence is proven.
