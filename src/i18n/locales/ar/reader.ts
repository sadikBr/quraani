/** The mushaf reader: pages, toolbars, quick jump, ayah actions and tajweed. */
export default {
  /** A surah referred to by its number, e.g. "السورة 2". */
  surahNumber: 'السورة {{surah}}',
  ayah: {
    /** "سورة البقرة · الآية 5"; {{surah}} already includes the word سورة. */
    reference: '{{surah}} · الآية {{ayah}}',
    /** "الآية 5 · الصفحة 2" */
    location: 'الآية {{ayah}} · الصفحة {{page}}',
    /**
     * Screen reader label of an ayah; {{surah}} is the surah number, {{text}} the Quran text (or the
     * hidden-ayah label). Each placeholder must appear once: the tajweed text view fills them in itself.
     */
    spokenLabel: 'الآية {{ayah}} من السورة {{surah}}. {{text}}',
    /** Read instead of the text while an ayah is hidden for revision. */
    hidden: 'آية مخفية',
    /** Spoken label of the ayah-number marker, which opens the ayah's actions; {{surah}} is a number. */
    actions: 'إجراءات الآية {{ayah}} من السورة {{surah}}',
    /** Screen reader custom action (the long press). */
    openActions: 'فتح إجراءات الآية',
    /** Screen reader hint of an ayah's text. */
    hint: 'اضغط لإظهار أدوات القراءة، واضغط مطوّلًا لفتح إجراءات الآية.',
    showTools: 'إظهار أدوات القراءة',
    /**
     * iOS hint for a group of {{count}} ayahs read as one paragraph. VoiceOver lists each ayah's
     * actions in its «الإجراءات» rotor.
     */
    groupHint_zero: 'اضغط مرتين لإظهار أدوات القراءة. وتجد إجراءات الآية في قائمة الإجراءات.',
    groupHint_one: 'اضغط مرتين لإظهار أدوات القراءة. وتجد إجراءات الآية في قائمة الإجراءات.',
    groupHint_two: 'اضغط مرتين لإظهار أدوات القراءة. وتجد إجراءات كل آية في قائمة الإجراءات.',
    groupHint_few: 'اضغط مرتين لإظهار أدوات القراءة. وتجد إجراءات كل آية في قائمة الإجراءات.',
    groupHint_many: 'اضغط مرتين لإظهار أدوات القراءة. وتجد إجراءات كل آية في قائمة الإجراءات.',
    groupHint_other: 'اضغط مرتين لإظهار أدوات القراءة. وتجد إجراءات كل آية في قائمة الإجراءات.',
  },
  divisions: {
    /** "الجزء 2", or several: "الجزء 2–3". */
    juz: 'الجزء {{juz}}',
    /** "الحزب 5", or several: "الحزب 5–6". */
    hizb: 'الحزب {{hizb}}',
    quarter: 'الحزب {{hizb}} · الربع {{rub}}/4',
    /** {{range}} is "1–2" or "1، 3"; the isolates keep "1–2/4" in order inside right-to-left text. */
    quarterRange: 'الحزب {{hizb}} · الربع ⁦{{range}}/4⁩',
  },
  screen: {
    sessionError: 'تعذّر فتح الورد.',
    openMushaf: 'فتح المصحف',
    fontError: 'تعذّر تحميل خط المصحف',
    fontErrorDetail: 'أعد فتح التطبيق لتحميل خط المصحف.',
    /** The Quran text could not be downloaded. */
    quranError: 'تعذّر تحميل المصحف',
    quranErrorDetail: 'تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.',
    preparing: 'جارٍ تجهيز المصحف…',
    preparingDetail: 'جارٍ تحميل الرواية المختارة وخطها.',
    pageUnavailable: 'تعذّر عرض هذه الصفحة.',
    /** Page pill inside a goal's reading: "2 من 5 · ص 13" (ص = page of the mushaf; space is tight). */
    sessionPage: '{{index, number}} من {{total, number}} · ص {{page, number}}',
  },
  toolbar: {
    label: 'أدوات القراءة',
    settings: 'إعدادات القراءة',
    search: 'البحث في القرآن',
    /** Spoken label of the location chip: "سورة البقرة، الجزء 1 · الحزب 2، فتح الفهرس". */
    location: '{{surah}}، {{location}}، فتح الفهرس',
    menu: 'فتح قائمة التطبيق',
  },
  controls: {
    navigation: 'التنقل في المصحف',
    practiceTools: 'أدوات مراجعة الصفحة',
    showAll: 'إظهار الكل',
    showAllLabel: 'إظهار الصفحة كاملة وإنهاء المراجعة',
    /** Button that reveals the next hidden word. */
    word: 'كلمة',
    wordLabel: 'إظهار الكلمة التالية',
    /** Button that reveals the next hidden ayah. */
    ayah: 'آية',
    ayahLabel: 'إظهار الآية التالية كاملة',
    /** Spoken label of the link to the bookmarked ayahs. */
    bookmarks: 'العلامات',
    nextPage: 'الصفحة التالية',
    previousPage: 'الصفحة السابقة',
    pageOf: 'الصفحة {{page}} من {{total}}',
    /** {{position}} is the page indicator, e.g. "الصفحة 3 من 604". */
    jump: '{{position}}، الانتقال إلى صفحة أو آية',
    page: 'صفحة {{page}}',
    hideTools: 'إخفاء أدوات القراءة',
    practice: 'إخفاء آيات الصفحة للمراجعة',
  },
  drawer: {
    close: 'إغلاق الانتقال السريع',
    title: 'انتقال سريع',
    titleSession: 'انتقال داخل الورد',
    /** "ورش · أنت في الصفحة 12" */
    currentPosition: '{{riwayah}} · أنت في الصفحة {{page}}',
  },
  jump: {
    method: 'طريقة الانتقال',
    byPage: 'بالصفحة',
    byAyah: 'بالآية',
    /** Hint under a number field: "من 1 إلى 604". */
    range: 'من {{first}} إلى {{last}}',
    sessionPages: 'صفحات الورد: من {{first}} إلى {{last}}',
    chooseSurahFirst: 'اختر السورة أولًا',
    withinSession: 'ضمن الورد',
    pageError: 'اختر صفحة بين {{first}} و{{last}}.',
    sessionAyahError: 'اختر آية من آيات الورد.',
    /** Ayah numbering differs between riwayat. */
    ayahError: 'تحقّق من رقم السورة والآية في الرواية المختارة.',
    toPage: 'الانتقال إلى الصفحة {{page}}',
    toAyah: 'الانتقال إلى الآية {{ayah}}',
    toDestination: 'الانتقال إلى الموضع',
    increasePage: 'زيادة رقم الصفحة',
    decreasePage: 'تقليل رقم الصفحة',
    pageNumber: 'رقم الصفحة',
    surahNumber: 'رقم السورة',
    ayahNumber: 'رقم الآية',
    /** Small caption above the destination's surah name. */
    destination: 'وجهتك',
    destinationSession: 'وجهتك في الورد',
    chooseDestination: 'اختر موضعًا للانتقال',
    /** Small caption above the destination page number. */
    page: 'صفحة',
  },
  actions: {
    close: 'إغلاق إجراءات الآية',
    copied: 'نُسخت الآية.',
    copyFailed: 'تعذّر نسخ الآية. أعد المحاولة.',
    /** Shown on the bookmark button once the ayah is bookmarked ("marked"; not محفوظة, which reads as memorized). */
    bookmarked: 'مُعلَّمة',
    bookmark: 'وضع علامة',
    removeBookmark: 'إزالة العلامة',
    copy: 'نسخ الآية',
    share: 'مشاركة',
    /** Bookmarks stay in memory until the app is closed. */
    bookmarkStorageError: 'تعذّر تسجيل العلامات على جهازك. ستبقى حتى تغلق التطبيق.',
    tafsir: 'التفسير',
    tafsirDetail: 'شرح الآية ومعانيها',
    translation: 'ترجمة المعاني',
    translationDetail: 'بالفرنسية والإنجليزية',
  },
  related: {
    /** {{references}} lists the matching "surah:ayah" references in the Hafs numbering, used by the source. */
    sources: 'موضع الآية بترقيم حفص: {{references}}. المصدر: الموسوعة القرآنية.',
    loading: 'جارٍ تحميل المحتوى',
    loadError: 'تعذّر تحميل المحتوى. تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.',
    empty: 'لا يتوفر محتوى لهذه الآية.',
    /** Caption above each tafsir or translation: the Hafs-numbered ayah it explains, e.g. "الآية 2:5 بترقيم حفص". */
    parallelReference: 'الآية {{surah}}:{{ayah}} بترقيم حفص',
    /** Content shown from the offline cache; follows the caption above after " · ". */
    stale: 'نسخة مخزّنة على الجهاز',
    openSource: 'فتح المصدر',
  },
  page: {
    tajweedError: 'تعذّر تحميل ألوان التجويد. يظهر النص كاملًا دون ألوان.',
  },
  printed: {
    /** Spoken label of the printed page. */
    pageLabel: 'الصفحة {{page}} من المصحف',
    /** Screen reader label of an ayah on the printed page; {{surah}} is a number, {{text}} the Quran text. */
    regionLabel: 'الآية {{ayah}} من السورة {{surah}}. {{text}}. اضغط لإظهار أدوات القراءة، واضغط على رقم الآية أو اضغط عليها مطوّلًا لفتح إجراءاتها.',
    regionHint: 'اضغط لإظهار أدوات القراءة، واضغط على رقم الآية أو اضغط عليها مطوّلًا لفتح إجراءاتها.',
    loadError: 'تعذّر تحميل هذه الصفحة من المصحف.',
    loading: 'جارٍ تحميل صفحة المصحف',
    /** "سورة الفاتحة" */
    surahTitle: 'سورة {{name}}',
  },
  tajweed: {
    loadError: 'تعذّر تحميل مصحف التجويد.',
    loading: 'جارٍ تحميل مصحف التجويد',
    /** Spoken title of the Hafs tajweed page. */
    pageTitle: 'مصحف التجويد برواية حفص، الصفحة {{page}}',
    textError: 'تعذّر عرض النص القرآني.',
    fontLoading: 'جارٍ تحميل خط المصحف',
    /** {{riwayah}} is the short riwayah name, e.g. "ورش". */
    previewTitle: 'معاينة ألوان التجويد برواية {{riwayah}}',
    /** Spoken title; {{surah}} is the surah number. */
    textTitle: 'رواية {{riwayah}} بألوان التجويد، الصفحة {{page}}، السورة {{surah}}',
    /** Label of a word of the ayah numbered {{ayah}}. */
    ayah: 'الآية {{ayah}}',
    /** Label of the ayah-number marker, which opens the ayah's actions. */
    ayahActions: 'إجراءات الآية {{ayah}}',
  },
  warshLegend: {
    /** Expandable row in the settings, under the Warsh tajweed option. */
    title: 'دليل ألوان التجويد',
    note: 'قد يجتمع في الحرف أكثر من حكم، فيُكتفى بلون واحد للتوضيح. ولا يدل اللون على عدد حركات المد.',
    /** Tajweed rules, as named in the Warsh color legend. */
    rules: {
      maddaNormal: 'مد طبيعي أو عارض للسكون',
      maddaPermissible: 'مد منفصل أو بدل أو لين مهموز',
      maddaObligatory: 'مد متصل',
      maddaNecessary: 'مد لازم',
      ghunna: 'غنة',
      /** Covers idgham with and without ghunna (same color). */
      idgham: 'إدغام',
      ikhfa: 'إخفاء حقيقي',
      ikhfaShafawi: 'إخفاء شفوي',
      iqlab: 'إقلاب',
      qalqala: 'قلقلة',
      naql: 'نقل الهمز أو إبداله',
      tashil: 'تسهيل الهمز',
      taqlil: 'تقليل أو إمالة',
      raTarqiq: 'ترقيق الراء',
      lamTaghliz: 'تغليظ اللام',
      silent: 'حرف لا يُنطق',
    },
  },
  index: {
    /** Detail under a surah in the index: "286 آية", "7 آيات". Latin digits, like the rest of the index. */
    ayahCount_zero: '{{count}} آية',
    ayahCount_one: 'آية واحدة',
    ayahCount_two: 'آيتان',
    ayahCount_few: '{{count}} آيات',
    ayahCount_many: '{{count}} آية',
    ayahCount_other: '{{count}} آية',
  },
  ayahCard: {
    themes: { emerald: 'زمردي', paper: 'ورقي', night: 'ليلي' },
    shareDialogTitle: 'مشاركة بطاقة الآية',
    /** Title of the shared image file: "بطاقة آية · قرآني". */
    shareTitle: 'بطاقة آية · {{app}}',
  },
} as const;
