# Text and languages

All user-facing text lives in `locales/<language>/<namespace>.ts`. Screens never contain
literal text: they call `t('namespace.key')`. Arabic is the only language today and the
source of truth: its catalog defines every key, placeholder and plural form, and
TypeScript checks every `t()` call against it.

```ts
import { t, formatNumber, formatDate, formatList } from '@/i18n';

t('common.retry');                                   // 'إعادة المحاولة'
t('home.hero.page', { page: 12 });                   // 'صفحة ١٢'  (message: 'صفحة {{page, number}}')
t('revision.days', { count: 3 });                    // picks days_few: '٣ أيام'
```

## Messages

- **Arabic wording** follows `locales/ar/STYLE.md`: voice, grammar, the glossary of Quran
  terms, and the calques to avoid. Read it before writing new text.

- **Namespaces** follow the areas of the app: `home`, `reader`, `settings`, `themes`,
  `library` (index, search, bookmarks), `share`, `plans` (list, chooser, archive, shared
  goal pieces), `khatma` (khatma and daily wird), `session` (schedules and the reading bar),
  `recurring`, `memorization`, `revision`, `app` (startup and errors). `common` and `goals`
  hold text that means the same thing everywhere.
- **Keys** are camelCase English, grouped by screen or component, then element:
  `revision.detail.settings.title`. Underscores are reserved for plural suffixes.
- **One message per sentence.** Put the variable parts in placeholders instead of
  gluing fragments, so a translator can reorder them.
- **Placeholders**: `{{name}}` inserts a value as is; `{{n, number}}` formats a number for
  the language (Arabic-Indic digits in Arabic). Use the plain form where the app shows Latin
  digits on purpose, such as page numbers inside bidi isolates.
- **Plurals**: give the forms as sibling keys with CLDR suffixes `_zero`, `_one`, `_two`,
  `_few`, `_many`, `_other`, and pass `count`. Arabic needs all six; English would need
  only `_one` and `_other`. Missing forms fall back to `_other`.
- **Rich text**: when part of a sentence is styled, use `tRich` from `@/i18n/rich`, whose
  placeholders accept React nodes.
- **Constants defined at module level** (weekday lists, presets, theme names) read their
  labels through getters or at render time, never by calling `t()` while the module loads.
- **Same words, different meaning** get different keys: a translator may need two words.

## Numbers, dates and lists

`formatNumber`, `formatDate('2026-10-10', { day: 'numeric', month: 'long' })` and
`formatList(['الكهف', 'الملك'])` use the current language's conventions. Never write a
locale tag such as `'ar-MA'` in a component.

## Arabic that is not interface text

Quran text, surah and ayah data, search normalization tables and parsers of Quranpedia
pages stay where they are. ESLint flags any Arabic literal outside `locales/`; such lines
carry `// eslint-disable-next-line no-restricted-syntax -- <why>`.

## Adding a language

1. Create `locales/<tag>/` with the same namespaces, typed as `LocaleMessages`. Missing
   keys fall back to Arabic.
2. Register it in `locales/index.ts` with its number and date locales, direction and
   plural rule (Hermes has no `Intl.PluralRules`, so the rule is a small function like
   `arabicPlural`).
3. Call `setLocale()` before the first render, for example from `expo-localization`.
   The app forces right-to-left layout today (`_layout.tsx` and the `expo-localization`
   plugin in `app.json`); a left-to-right language needs that switch to follow the locale.
   Switching language while the app runs would need screens to re-render, for example by
   keeping the locale in React context.
