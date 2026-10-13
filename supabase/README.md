# Supabase

The database behind accounts (see `src/features/account/README.md`).

- `migrations/` — run each file once, in order, in the project's SQL Editor (or with
  `supabase db push`). They create the tables, their row-level security and the functions the
  app calls.
- `tests/` — the migrations' tests (never run them in the SQL Editor), on a plain local Postgres with Supabase's `auth.uid()` and
  roles emulated:

  ```bash
  PGHOST=/var/run/postgresql PGUSER=postgres supabase/tests/run.sh   # every tests/*.test.sql
  ```

Project settings the app relies on (dashboard):

- Authentication → Sign In / Providers → Email: enabled; "Confirm email" off for now (on once
  our own SMTP is set up); "Require current password when updating" on.
- Storage: the `avatars` bucket (private, 512 KB, JPEG only) is made by
  `20261013160000_profiles_and_devices.sql`, with its access rules; nothing to set by hand.
- Authentication → URL Configuration → Redirect URLs: `quranmobile://**` (the email links open
  the app; add `exp://**` to try them in Expo Go).
- Before real users: Authentication → SMTP Settings with an email provider on our own domain (the
  built-in sender only reaches the project's team, about 2 emails an hour, and its templates
  can't be changed).
