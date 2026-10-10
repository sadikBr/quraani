/** The mushaf reader: pages, toolbars, quick jump, ayah actions and tajweed. */
export default {
  /** A surah referred to by its number, e.g. "السورة 2". */
  surahNumber: 'السورة {{surah}}',
  ayah: {
    /** "البقرة · الآية 5" */
    reference: '{{surah}} · الآية {{ayah}}',
    /** "الآية 5 · صفحة 2" */
    location: 'الآية {{ayah}} · صفحة {{page}}',
    /** Screen reader label of an ayah; {{text}} is the Quran text (or the hidden-ayah label). */
    spokenLabel: 'السورة {{surah}}، الآية {{ayah}}. {{text}}',
    /** Read instead of the text while an ayah is hidden for revision. */
    hidden: 'آية مخفية',
    /** Label of the ayah-number marker, which opens the ayah's actions. */
    actions: 'إجراءات الآية {{ayah}}، السورة {{surah}}',
    openActions: 'فتح إجراءات الآية',
    hint: 'اضغط لإظهار أدوات القراءة، واضغط مطولاً لفتح إجراءات الآية',
    showTools: 'إظهار أدوات القراءة',
    /** iOS hint for a group of {{count}} ayahs read as one paragraph. */
    groupHint_zero: 'اضغط مرتين لإظهار أدوات القراءة، واستخدم الإجراءات لفتح إجراءات الآية',
    groupHint_one: 'اضغط مرتين لإظهار أدوات القراءة، واستخدم الإجراءات لفتح إجراءات الآية',
    groupHint_two: 'اضغط مرتين لإظهار أدوات القراءة، واستخدم الإجراءات لفتح إجراءات آية',
    groupHint_few: 'اضغط مرتين لإظهار أدوات القراءة، واستخدم الإجراءات لفتح إجراءات آية',
    groupHint_many: 'اضغط مرتين لإظهار أدوات القراءة، واستخدم الإجراءات لفتح إجراءات آية',
    groupHint_other: 'اضغط مرتين لإظهار أدوات القراءة، واستخدم الإجراءات لفتح إجراءات آية',
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
    sessionError: 'تعذر فتح الورد.',
    openMushaf: 'فتح المصحف',
    fontError: 'تعذر تحميل خط المصحف',
    fontErrorDetail: 'أعد فتح التطبيق لتحميل خط المصحف.',
    quranError: 'تعذر تحميل القرآن',
    quranErrorDetail: 'تحقق من الاتصال ثم أعد المحاولة.',
    preparing: 'جارٍ تجهيز المصحف',
    preparingDetail: 'جارٍ تحميل الرواية المختارة وخطها.',
    pageUnavailable: 'هذه الصفحة غير متوفرة.',
    /** Position inside a goal's reading: "2 من 5 · ص 13" (ص = page). */
    sessionPage: '{{index, number}} من {{total, number}} · ص {{page, number}}',
  },
  toolbar: {
    label: 'أدوات القراءة',
    settings: 'إعدادات القراءة',
    search: 'البحث في القرآن',
    /** "البقرة، الجزء 1 · الحزب 2، فتح الفهرس" */
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
    bookmarks: 'العلامات المحفوظة',
    nextPage: 'انتقل إلى الصفحة التالية',
    previousPage: 'انتقل إلى الصفحة السابقة',
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
    /** "ورش · موضعك الحالي: صفحة 12" */
    currentPosition: '{{riwayah}} · موضعك الحالي: صفحة {{page}}',
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
    sessionAyahError: 'اختر آية ضمن الورد المحدد.',
    ayahError: 'تحقق من رقم السورة والآية في الرواية المختارة.',
    toPage: 'انتقل إلى الصفحة {{page}}',
    toAyah: 'انتقل إلى الآية {{ayah}}',
    toDestination: 'الانتقال إلى الموضع',
    increasePage: 'زيادة رقم الصفحة',
    decreasePage: 'تقليل رقم الصفحة',
    pageNumber: 'رقم الصفحة',
    surahNumber: 'رقم السورة',
    ayahNumber: 'رقم الآية',
    destination: 'وجهتك في المصحف',
    destinationSession: 'وجهتك داخل الورد',
    chooseDestination: 'اختر موضعًا للانتقال',
    /** Small caption above the destination page number. */
    page: 'صفحة',
  },
  actions: {
    close: 'إغلاق إجراءات الآية',
    copied: 'تم نسخ الآية',
    copyFailed: 'تعذر النسخ، حاول مرة أخرى',
    /** Shown on the bookmark button once the ayah is bookmarked. */
    bookmarked: 'محفوظة',
    bookmark: 'حفظ علامة',
    removeBookmark: 'إزالة العلامة',
    copy: 'نسخ الآية',
    share: 'مشاركة',
    bookmarkStorageError: 'تعذر حفظ العلامات على الجهاز. تبقى متاحة في هذه الجلسة.',
    tafsir: 'التفسير',
    tafsirDetail: 'شرح الآية ومعانيها',
    translation: 'ترجمة المعاني',
    translationDetail: 'بالفرنسية والإنجليزية',
  },
  related: {
    /** {{references}} lists "surah:ayah" references in the Hafs numbering. */
    sources: 'المراجع الموازية حسب ترقيم حفص: {{references}}. المصدر: الموسوعة القرآنية.',
    loading: 'جارٍ تحميل المحتوى',
    loadError: 'تعذر تحميل المحتوى. تحقق من الاتصال ثم أعد المحاولة.',
    empty: 'لا يتوفر محتوى لهذا الموضع.',
    parallelReference: 'المرجع الموازي {{surah}}:{{ayah}}',
    /** Content shown from the offline cache. */
    stale: 'نسخة محفوظة دون تحديث',
    openSource: 'فتح المصدر',
  },
  page: {
    tajweedError: 'تعذر تحميل ألوان التجويد. النص الكامل ظاهر دون ألوان.',
  },
  printed: {
    pageLabel: 'صفحة المصحف {{page}}',
    /** Screen reader label of an ayah on the printed page; {{text}} is the Quran text. */
    regionLabel: 'السورة {{surah}}، الآية {{ayah}}. {{text}}. اضغط لإظهار أدوات القراءة، واضغط رقم الآية أو اضغط مطولاً لفتح إجراءاتها',
    regionHint: 'اضغط لإظهار أدوات القراءة. اضغط رقم الآية أو اضغط مطولاً لفتح إجراءاتها.',
    loadError: 'تعذر تحميل هذه الصفحة من المصحف.',
    loading: 'جارٍ تحميل صفحة المصحف',
    /** "سورة الفاتحة" */
    surahTitle: 'سورة {{name}}',
  },
  tajweed: {
    loadError: 'تعذر تحميل مصحف التجويد.',
    loading: 'جارٍ تحميل مصحف التجويد',
    pageTitle: 'مصحف حفص بألوان التجويد · صفحة {{page}}',
    textError: 'تعذر عرض النص القرآني.',
    fontLoading: 'جارٍ تحميل خط القرآن',
    /** {{riwayah}} is the short riwayah name, e.g. "ورش". */
    previewTitle: 'معاينة نص {{riwayah}} بألوان التجويد',
    textTitle: 'نص {{riwayah}} بألوان التجويد · صفحة {{page}} · سورة {{surah}}',
    /** Label of a word of the ayah numbered {{ayah}}. */
    ayah: 'الآية {{ayah}}',
    /** Label of the ayah-number marker, which opens the ayah's actions. */
    ayahActions: 'إجراءات الآية {{ayah}}',
  },
  warshLegend: {
    title: 'دليل ألوان ورش',
    note: 'قد يجتمع أكثر من حكم في الحرف؛ يُعرض لون واحد للتوضيح. اللون لا يحدد عدد حركات المد.',
    /** Tajweed rules, as named in the Warsh color legend. */
    rules: {
      maddaNormal: 'مد طبيعي أو عارض للسكون',
      maddaPermissible: 'مد منفصل أو بدل أو لين مهموز',
      maddaObligatory: 'مد متصل',
      maddaNecessary: 'مد لازم',
      ghunna: 'غنة',
      idgham: 'إدغام',
      ikhfa: 'إخفاء حقيقي',
      ikhfaShafawi: 'إخفاء شفوي',
      iqlab: 'إقلاب',
      qalqala: 'قلقلة',
      naql: 'نقل أو إبدال الهمز',
      tashil: 'تسهيل الهمز',
      taqlil: 'تقليل أو إمالة',
      raTarqiq: 'ترقيق الراء',
      lamTaghliz: 'تغليظ اللام',
      silent: 'حرف غير منطوق',
    },
  },
  index: {
    ayahCount: 'الآيات: {{ayahs}}',
  },
  ayahCard: {
    themes: { emerald: 'زمردي', paper: 'ورقي', night: 'ليلي' },
    shareDialogTitle: 'مشاركة بطاقة الآية',
    /** Title of the shared image file: "بطاقة آية · قرآني". */
    shareTitle: 'بطاقة آية · {{app}}',
  },
} as const;
