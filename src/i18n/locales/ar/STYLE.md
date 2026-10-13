# Arabic wording guide — «قرآني»

The app is a Quran reader and companion for reading, memorizing and revising (khatma, daily wird,
recurring surahs, memorization, revision). Its users are Arabic-speaking Muslims, many in Morocco
(Warsh is the default riwayah). Every message should read as if a careful native writer of Arabic
wrote it for this app first — never as a translation from English. Follow this guide when adding
or changing text.

## Voice

- **Modern Standard Arabic**: clear, warm, dignified; never dialect, never stiff officialese,
  never marketing English in Arabic letters.
- **Respectful of the Quran.** Gentle encouragement is welcome at meaningful moments (finishing a
  wird, a khatma, a memorization step): «تقبّل الله منك», «بارك الله لك», «هنيئًا لك ختم القرآن».
  Use them sparingly; not every empty state needs a du'a. Never preachy, never guilt-inducing
  about missed days.
- **Short.** Mobile UI. Prefer the shortest wording that is fully natural. Say one thing per
  sentence. No filler («بالفعل», «حاليًا», «فقط» when it adds nothing).
- **Direct address** in the masculine singular, as Arabic apps conventionally do («اختر»، «لديك»،
  «محفوظك»). Where a neutral construction is just as natural (verbal noun, passive, «لك»), prefer it.
- **Natural, explicit sentences.** Name the action and its object when a pronoun would be unclear:
  «تعديل بيانات المشاركين», «تسجيل الخروج من الجهاز», «حفظ التغييرات».
  Avoid personifying the account («لم يقبل حسابك الاسم») or vague promises («أهدافك ماضية»).
  Explain what happened and what the reader can do next.

## Grammar and spelling (non-negotiable)

- Correct hamzas: «الاثنين» (hamzat wasl, not «الإثنين»), «إنشاء», «ابتداءً», «أُرشِف», «استئناف».
- **Numbers and nouns agree** (العدد والمعدود): 1 → «آية واحدة», 2 → «آيتان/آيتين» (case!),
  3–10 → plural genitive «٣ آيات», 11–99 → singular accusative «١١ آية», «١١ يومًا», 100+ → singular
  genitive «١٠٠ آية». A message that puts a variable number before a noun MUST be a plural message
  (see "Plurals" below) unless the noun is a unit that never changes («٪», «ص»), or the number is a
  label/ordinal («الصفحة ٥», «الجزء ٣», «السورة ٢»), which needs no agreement.
- Duals change with case: «يومان» (subject) but «خلال يومين», «كل يومين».
- Tanween fatha on the alif: «يومًا», «أسبوعيًا», «مؤقتًا» (not «يوماً»).
- Use shadda/diacritics only where they prevent a misreading («تقبّل», «حُفظ» vs «حفظ», «يُحذف»).
- Match the verb to its subject: «ستُعاد المحاولة تلقائيًا», not «سيُعاد المحاولة».
  Check pronouns against their referents in the complete sentence, including inserted phrases.
- Arabic punctuation: «،» «؛» «؟», quotes «…», ellipsis «…». No space before punctuation.
  No exclamation marks except a genuine congratulation.
- Titles, buttons, tabs, labels: no final period. Full sentences (descriptions, errors): end with «.».

## Conventions by element

- **Buttons and menu items for system actions**: verbal noun — «حفظ», «إلغاء», «حذف», «مشاركة»,
  «نسخ», «إغلاق», «استعادة», «إنشاء الختمة».
- **Invitations to do the activity itself** (the main call to action of a screen): imperative is
  warmer and natural — «ابدأ القراءة», «تابع الحفظ», «ابدأ المراجعة». Keep each screen consistent.
- **Accessibility labels** (spoken by screen readers): verbal-noun phrases describing the action or
  the element — «فتح الفهرس», «إغلاق الإعدادات», «الآية ٥ من سورة البقرة».
- **Section titles**: short noun phrases — «إعدادات الهدف», «مواعيدك», «محفوظك».
- **Empty states**: one short title + one helpful sentence of what to do. No «لا يوجد X بعد» calque
  when a more natural phrasing exists («لم تضع علامة على أي آية بعد»).
- **Errors**: say what happened, then what to do: «تعذّر حفظ الهدف. أعد المحاولة.» Avoid blame,
  avoid technical words for the user («بيانات غير صالحة» is acceptable only for internal-data errors
  the user can't act on — keep those short and calm).
- **Confirmations**: a direct question: «حذف الهدف نهائيًا؟» then a plain sentence of consequence.
- **Progress**: «جارٍ الحفظ…», «جارٍ التحميل…».

## Calques to remove

| Avoid (translated from English) | Prefer |
|---|---|
| «رحلة/رحلتك» for a goal or the app ("journey") | the thing itself: «ختمتك», «حفظك», «طريقك مع القرآن» only if truly fitting — usually just drop it |
| «خطوة صغيرة/خطوة أخرى» ("one more step") | «ورد جديد أتممته», «زادك الله حرصًا» … or nothing |
| «تم + مصدر» («تم حفظ الهدف») | passive/past: «حُفظ الهدف», «أُرشِف الهدف» |
| «قم بـ», «يرجى», «بنجاح» | plain imperative or nothing |
| «الخاص بك/به» | pronoun suffix: «سجلّك», «إعداداته» |
| «متاح/غير متاح» everywhere | «يمكنك…», «لا يمكن…», «يُتاح…» — keep «متاح» only where it is the natural word |
| «بالفعل» ("already") | «لديك ختمة قائمة», «سبق أن…» |
| «جلسة» ("session") for a day's portion | «ورد» (reading/revision/memorization portion of a day), «مقدار اليوم», or rephrase |
| «مخصص» ("custom") | «من اختيارك», «تختاره بنفسك» |
| «عرض X» for every link | «X» alone when it is clearly a link, or a verb that fits («افتح», «اطّلع على») |
| «إعادة المحاولة» inside sentences | «أعد المحاولة» in sentences; «إعادة المحاولة» is fine as a button |
| «قيد X» overuse | fine for statuses («قيد الحفظ»), not in sentences |

## Glossary (use these terms consistently)

| Concept | Arabic |
|---|---|
| goal (umbrella for all types) | هدف / أهدافي / الأهداف |
| khatma (reading the whole Quran) | ختمة؛ finishing it: «ختم القرآن», «أتممت الختمة» |
| a repeated khatma, its n-th round | «الختمة {{n}}» rather than «الدورة {{n}}» for khatmas |
| daily wird (fixed daily amount, no end date) | ورد يومي |
| one day's portion of any goal | ورد (وردك اليوم، ورد اليوم، ورد فائت) |
| overdue portion | ورد فائت (not «ورد سابق») |
| recurring reading (surahs on chosen weekdays) | قراءة متكررة؛ each occurrence: «موعد» |
| memorization | الحفظ؛ what the user has memorized: «محفوظك» |
| revision of memorized Quran | المراجعة؛ a full pass over everything memorized: «دورة مراجعة» / «الدورة {{n}}» |
| segment of ayahs | مقطع |
| hizb, quarter of a hizb | حزب (ج أحزاب)، ربع حزب (ج أرباع)؛ «نصف حزب», «ثلاثة أرباع حزب» |
| juz | جزء (ج أجزاء) |
| page of the mushaf | صفحة (ج صفحات)؛ abbreviation «ص» only where space is tight |
| ayah, surah | آية (ج آيات)، سورة (ج سور) |
| mushaf | المصحف |
| riwayah | رواية؛ «رواية ورش عن نافع», «رواية حفص عن عاصم» |
| tajweed | التجويد؛ «أحكام التجويد» |
| bookmark (an ayah marked to come back to) | علامة / «وضع علامة» / «إزالة العلامة» / «الآيات المعلَّمة» — never «حفظ/محفوظة» (that means memorized here) |
| saving data | «حفظ» only as a button or where it can't be read as memorizing; otherwise «تُسجَّل», «يُحتفظ بـ» |
| progress | «تقدّمك» is acceptable; often «ما أنجزته» / «إنجازك» reads better |
| archive | الأرشيف؛ «أرشفة الهدف»؛ «الأهداف المؤرشفة» |
| reminder / notifications | تذكير / الإشعارات |
| settings | الإعدادات |
| theme / appearance | المظهر |
| index | الفهرس |

**Important ambiguity:** «حفظ» means both "save" and "memorize". In this app, memorization is a
core feature, so wherever the two could be confused, use «حفظ/محفوظ» only for memorization and
pick another wording for saving. In settings and profile editing, «حفظ الإعدادات» and
«حفظ التغييرات» are clear, conventional Arabic; do not replace them with awkward wording merely
to avoid the word «حفظ».

## Plurals and placeholders (technical rules — the build depends on them)

- Edit only the Arabic **values**. Keep every key. Keep each message's placeholders exactly:
  same names, and every `{{name}}` still present (a plural form may omit `{{count}}`, e.g.
  «آية واحدة»). Keep `, number` on placeholders that have it. Keep bidi characters
  (`⁦ … ⁩`, written as `⁦ ⁩`) exactly where they are.
- To fix number agreement, a message may become a **plural message**: replace `key` with
  `key_zero`, `key_one`, `key_two`, `key_few`, `key_many`, `key_other` (CLDR: zero=0, one=1,
  two=2, few = n%100 in 3..10, many = n%100 in 11..99, other = 100–102, 200–202…).
  Plural messages need a `count` param: rename the counted placeholder to `{{count, number}}` and
  update the call sites (`t('ns.key', { count: n, ... })`). TypeScript will list every call site
  you must update. Keep other placeholders.
- A message used inside another message (e.g. `{{days}}` filled with `revision.days`) must read
  correctly in every sentence that embeds it — check case (dual nominative vs genitive) and grammar
  of the combined sentence. `grep -rn "<key>" src` shows where a key is used.
- Keep short UI labels short: tabs, badges, chips, buttons, toolbar labels, weekday letters, stat
  labels. If you can't tell what kind of element a key is, read the component that uses it.
  As a rule, a short label must not grow by more than about a third.

## House spellings

- «تعذّر» (with shadda) in every error; «جارٍ …» for progress; «أعد المحاولة.» at the end of
  errors the user can retry.
- No tanween mark on taa marbuta in counts («١٢ آية», «١٥ سورة»); keep the tanween alif where
  spelling requires it («يومًا», «جزءًا», «أسبوعيًا»).
- «جزءان», «سجلّ», «الاثنين».
