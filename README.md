# قرآني · Quraani

An Arabic Quran reader built with Expo SDK 57 and Expo Router, with Warsh and Hafs editions, reading goals, and recurring readings.

## Development

Use Bun to install dependencies and start the app:

```bash
bun install --frozen-lockfile
bun start
```

Screens live in `src/app/`; reader and goal features live in `src/features/`.

Before creating a test release:

```bash
bun run lint
bun run typecheck
bun test tests
```

## Build a shareable Android APK

The `preview` profile in `eas.json` creates a signed, standalone release APK through [EAS Build](https://docs.expo.dev/build-reference/apk/). Testers do not need Expo Go, a running development server, or a Google Play account.

### First build

1. Sign in to the Expo account that will own the app:

   ```bash
   bunx eas-cli login
   ```

2. Start the Android build:

   ```bash
   bun run build:apk
   ```

3. If prompted, create/link the `quran-mobile` EAS project under your account and let EAS generate the Android signing keystore. EAS writes the project ID to `app.json`; keep that configuration for subsequent builds. No credentials need to be committed.

4. When the build finishes, open its EAS link and download the `.apk`, or share the installation link directly with testers. They open it on Android, download the APK, and allow installation from their browser or file manager when Android asks.

The app uses the existing قرآني name, icon, and splash screen. It needs internet access to download Quranpedia content that has not already been cached. Each installation keeps its own goals, bookmarks, and preferences; Expo Go data is separate from the installed app.

### GitHub builds

`.github/workflows/android-apk.yml` builds a signed release APK on every push to `main` (download it
from the run's artifacts), on manual runs (Actions → Android APK → Run workflow), and on
`v1.2.0`-style tags, which also create a GitHub Release with the APK attached. It runs the
type-check, lint and tests first, generates `android/` with `expo prebuild`, and signs with the
keystore in the `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and
`ANDROID_KEY_PASSWORD` repository secrets (`plugins/with-release-signing.js`). The build number is
the run number, so each APK installs over the previous one. APKs signed with another key (EAS,
debug) cannot be updated by these; switching needs one uninstall.

### Subsequent test releases

Run `bun run build:apk` again after your changes and checks. EAS automatically increases Android's build number. Keep the same EAS project, Android package (`com.bsadik.quraani`), and signing keystore so testers can install each new APK as an update without uninstalling and losing their local data.

These are manual APK updates; over-the-air updates and Play Store submission are not configured. The user-visible version is `expo.version` in `app.json`.

You can find previous builds with:

```bash
bunx eas-cli build:list --platform android
```

[Expo's internal distribution guide](https://docs.expo.dev/build/internal-distribution/) explains sharing links and their access settings. Android APKs cannot be installed on iPhones.
