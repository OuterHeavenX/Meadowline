# Meadowline — Cloud Saves & Supabase Auth

Status: draft integration on `feature/cloud-saves-auth` / PR #12.

Production `main` remains local-save-first until owner acceptance is complete.

## Architecture

Meadowline keeps Save V3 (`meadowline.v3`) as the authoritative local/offline save format. Cloud integration wraps that same payload rather than replacing the simulation save architecture.

Guest/local play remains supported with no account.

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

## Current client behavior

The account panel supports:

- passwordless email sign-in
- signed-out/local-only play
- manual `Upload local city`
- manual `Use cloud city`
- explicit confirmation before replacing local Save V3
- current cloud revision display
- previous revision list
- restore of a previous cloud revision
- sign out without deleting the local city
- friendly cloud/auth failure messaging
- 60-second client resend cooldown after a successful sign-in email request

No automatic cloud upload or automatic cloud download is enabled in this draft.

## Cloudflare

Production Pages URL:

`https://meadowline-3mp.pages.dev`

Stable feature-preview alias:

`https://feature-cloud-saves-auth.meadowline-3mp.pages.dev`

Production `main` and non-production branches deploy separately through Cloudflare Pages.

## Physical owner-device evidence — August 25, 2026

Confirmed on physical iPhone:

- [x] Cloudflare production deployment loads Meadowline.
- [x] Cloudflare feature preview loads Meadowline.
- [x] Account & Cloud Saves panel renders in iPhone portrait.
- [x] Passwordless email sign-in completes and returns to the preview deployment.
- [x] Signed-in session is recognized by Meadowline.
- [x] First local Save V3 upload creates a real Supabase cloud save.
- [x] Subsequent uploads increment cloud revision.
- [x] Previous revisions are archived.
- [x] Cloud download replaces local Save V3 only after confirmation.
- [x] Downloaded cloud city reloads successfully in Meadowline.
- [x] Local-only changes can be replaced by the chosen cloud revision.
- [x] Local city remains playable while signed out or while auth email is unavailable.
- [x] Built-in Supabase email rate limiting was encountered during repeated QA; raw provider errors are now mapped to player-friendly language in the feature branch.

Backend evidence observed during this pass included current cloud revisions and archived revisions with the expected Day/coin payload values.

## Remaining owner-device acceptance before merge

- [ ] Latest preview shows the Previous Cloud Saves list comfortably on iPhone.
- [ ] Restore an older revision from the in-game history UI.
- [ ] Confirm restore creates a newer current revision rather than decreasing revision number.
- [ ] Confirm the pre-restore current cloud save remains recoverable in history.
- [ ] Conflict test: two independent sessions begin from the same revision; Session A uploads; stale Session B upload is rejected.
- [ ] Conflict rejection leaves the newer cloud payload unchanged.
- [ ] Sign-out leaves local Save V3 intact after reload.
- [ ] Offline/network failure leaves local Save V3 intact and produces understandable UI.
- [ ] Account panel has no horizontal overflow around 390–430 CSS px.
- [ ] Account panel scrolls comfortably when history reaches five entries.
- [ ] Cloud toggle does not block Build/Move/Look/Remove or the home gesture area.
- [ ] Production auth redirect remains correct after final deployment URL/domain decision.

## Production hardening still planned

Custom SMTP is intentionally deferred. The default Supabase sender is suitable for development but can hit platform email limits during repeated QA. Before a broader release, configure a trusted SMTP provider and branded Meadowline auth email. This will also allow the desired six-digit OTP presentation if the email template is changed to use `{{ .Token }}`.

Do not merge PR #12 solely from CI/browser proof. Physical owner-device acceptance remains authoritative for this integration.
