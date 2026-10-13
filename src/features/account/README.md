# Account and sync

An account keeps a copy of the user's data with their email address (Supabase), so it comes back
on a new phone and two phones stay in step. The phone keeps the main copy: without an account,
or offline, nothing changes.

- **Sign-in** (`auth-client.ts`): an email and a password (Supabase Auth over `fetch`, with a
  30-second timeout; no native module). Signing up sends a confirmation email whose link opens
  the app at `/account/callback`, signed in; a forgotten password is reset the same way, then
  `/account/password`. The links' tokens come after `#` (Supabase's implicit flow), and the
  project must allow `quranmobile://**` as a redirect URL. The session is kept on the phone
  (`account:session:v1`) and refreshed one request at a time; a session the account ended signs
  out here too, and signing out (or in as someone else) wins over a refresh still on its way.
- **The account's data** (`api.ts`): the database functions of `supabase/migrations`, called as
  the user, so row-level security always applies. `config.ts` holds the project URL and
  publishable key (public by design).
- **What syncs** (`registry.ts`, `sources.ts`): each store that syncs registers itself from its
  provider. Whole documents: goals and the memorization record (`plans:v1`), adhkar, practice,
  bookmarks per riwayah, and reading preferences (`restore`: they come from the account only to
  a phone that has none of its own). Halaqat as records (the halaqa, each participant, each
  participant's day), ready to be shared later. Prayer settings stay on the phone (they hold its
  location).
- **Sync** (`sync/`, pure and tested in `tests/account-sync.test.js` against a fake account that
  follows the SQL): the phone keeps, per account, each item's revision and fingerprint when last
  in step (`sync:v1:<user>`; a failed read stops the sync rather than start over). Only what
  changed since moves: a change on one side goes to the other; a document changed on both sides
  is either the same, or waits for the user (keep this phone's copy or the account's); a halaqa
  record changed on both keeps the phone's, and without marks takes the account's; a deleted
  halaqa is deleted everywhere. A copy from the account goes through the store's own decoder and
  write queue (`replace`/`transform`), never straight to storage, so it can't race a change on
  the phone; one the decoder can't read whole (written by a newer version of the app) is left
  alone, and nothing goes over it.
- **When** (`provider.tsx`): when the app opens or comes back, 10 seconds after a change, and
  when it goes to the background.
- **Profile** (`profile.ts`, tested in `tests/account-profile.test.js`): a name and a photo,
  kept in the account (`profiles`, and the private `avatars` bucket, one folder per user) and
  remembered on the phone (`account:profile:v1:<user>`), so they show at once and offline. The
  photo is picked and cropped square (`photo-picker.ts`: expo-image-picker, then
  expo-image-manipulator to a 512-pixel JPEG; `photo-picker.web.ts`: a file input and a canvas),
  uploaded under a new name each time, and shown through a signed link renewed a day before its
  week is up. A photo the profile couldn't take is removed again; the old one goes once the new
  one is in place. Shown framed in the app's eight-pointed star (`avatar.tsx`), or the name's
  first letter without one.
- **Devices** (`device.ts`, `devices-section.tsx`): each sign-in names itself once signed in
  («Samsung SM-A546E · Android 14», «Chrome · Windows»; `register_device`); the account lists
  its sessions, this one first, with when each was last active, and signs out any other one
  (`end_session`) or all of them (`/logout?scope=others`). A device signed out this way keeps
  its data, and stops syncing once its access token expires (within the hour).

Screens: `/account` (what an account gives; or, signed in, the name and photo under an arch,
the sync's state, a choice between copies, the devices, the password, signing out and deleting
the account), `/account/profile` (the name and photo, changed together with «تسجيل التغييرات»),
`/account/sign-in` (sign in, or a new account), `/account/callback` (where email links open the
app) and `/account/password`. The home
screen's top bar opens the account, with a gold dot when a choice waits.
