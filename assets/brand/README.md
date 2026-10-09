# قرآني identity

The open Quran and pointed arch share one mark. Warm gold on deep emerald is the
launch identity; the in-app mark takes its color from the selected reading theme.
The name is **قرآني**, with a madda above the alif (U+0622).

## Production assets

- `logo.png`: transparent 1024 px master mark used in app headers, the index and
  shared ayah cards. Cards retain the original gold artwork and wait for it to
  render before preparing the exported image.
- `icon.png`: opaque 1024 px square icon for iOS and the Android fallback.
- `adaptive-foreground.png`: transparent, centered Android foreground with generous mask-safe margins.
- `adaptive-monochrome.png`: the same alpha silhouette for Android themed icons.
- `splash.png`: transparent gold-and-ivory lockup with the corrected Arabic name.
- `favicon.png`: 64 px browser icon.

Launch background: `#103E35`. All icon masking is left to the OS. The splash
uses Expo's native splash configuration rather than a timed JavaScript overlay;
it disappears when the existing startup font-loading work is finished.

The in-app logo updates during development. Launcher icons, the installed app name,
and the native splash need a new app build. Verify the launch screen in a preview
or production build; Expo Go and development clients show their own launch behavior.

Artwork was generated with the built-in image-generation tool. Exact prompts and
the madda correction are recorded in `prompts.json`. Original generations remain
available in the tool's generated-image directory; only production exports are
referenced by the app.
