/** The Quran index, search and bookmarks (ayahs marked to come back to; never «حفظ», which means memorizing here). */
export default {
  searchResults: 'نتائج البحث',
  index: {
    title: 'فهرس القرآن',
    tabs: { label: 'أقسام الفهرس', surah: 'السور', juz: 'الأجزاء', hizb: 'الأحزاب' },
    search: {
      label: 'البحث في الفهرس',
      /** A juz or hizb also matches the name of the surah it starts in. */
      placeholder: { surah: 'اسم السورة أو رقمها', juz: 'رقم الجزء أو سورته الأولى', hizb: 'رقم الحزب أو سورته الأولى' },
    },
    prompt: 'اختر موضعًا وابدأ القراءة',
    /** Number of listed items; {{count}} keeps Latin digits, like the numbers in the list. Zero only after a search. */
    count: {
      surah_zero: 'لا نتائج',
      surah_one: 'سورة واحدة',
      surah_two: 'سورتان',
      surah_few: '{{count}} سور',
      surah_many: '{{count}} سورة',
      surah_other: '{{count}} سورة',
      juz_zero: 'لا نتائج',
      juz_one: 'جزء واحد',
      juz_two: 'جزءان',
      juz_few: '{{count}} أجزاء',
      juz_many: '{{count}} جزءًا',
      juz_other: '{{count}} جزء',
      hizb_zero: 'لا نتائج',
      hizb_one: 'حزب واحد',
      hizb_two: 'حزبان',
      hizb_few: '{{count}} أحزاب',
      hizb_many: '{{count}} حزبًا',
      hizb_other: '{{count}} حزب',
    },
    loading: 'جارٍ تحميل الفهرس',
    error: { title: 'تعذّر فتح الفهرس', unavailable: 'لا يمكن عرض الفهرس الآن. أعد المحاولة.' },
    empty: { title: 'لا شيء يطابق بحثك', description: 'جرّب اسمًا أو رقمًا آخر، أو امسح البحث لعرض الفهرس كاملًا.' },
    item: {
      /** e.g. "سورة البقرة، الآيات: 286، الصفحة 2". */
      label: '{{title}}، {{detail}}، الصفحة {{page}}',
      hint: 'فتح المصحف عند بداية هذا الموضع',
      page: 'صفحة {{page}}',
      /** Where a juz' starts in its surah, under the surah's name. */
      ayah: 'الآية {{ayah}}',
    },
    /** Marks the surah, juz' or hizb the reader last stopped in. */
    current: 'موضع قراءتك',
  },
  search: {
    title: 'البحث في القرآن',
    label: 'البحث في نص القرآن',
    placeholder: 'اكتب كلمة أو عبارة من الآية',
    tip: 'ابحث بالتشكيل أو دونه، في روايتك المختارة.',
    searching: 'جارٍ البحث',
    /** {{count}} keeps Latin digits. */
    count_zero: 'لا نتائج',
    count_one: 'نتيجة واحدة',
    count_two: 'نتيجتان',
    count_few: '{{count}} نتائج',
    count_many: '{{count}} نتيجة',
    count_other: '{{count}} نتيجة',
    /** Accessibility label of a suggested search. */
    suggestion: 'البحث عن {{query}}',
    showMore: 'عرض المزيد من النتائج',
    empty: {
      title: 'ابحث بكلمة تتذكرها',
      description: 'اكتب حرفين على الأقل، أو ابدأ بأحد هذه الاقتراحات.',
      noMatchTitle: 'لم نعثر على هذه الكلمات',
      noMatchDescription: 'جرّب كلمات أقل، أو كلمات أخرى من الآية.',
    },
  },
  bookmarks: {
    title: 'العلامات',
    search: { label: 'البحث في العلامات', placeholder: 'اسم السورة أو كلمات من الآية' },
    order: { label: 'ترتيب العلامات', quran: 'ترتيب المصحف', recent: 'الأحدث أولًا' },
    removed: 'أُزيلت العلامة',
    undoLabel: 'التراجع عن إزالة العلامة',
    undo: 'تراجع',
    storageError: 'تعذّر قراءة العلامات أو تسجيلها على جهازك. ستبقى تغييراتك حتى تغلق التطبيق.',
    summary: {
      title: 'آيات تعود إليها',
      /** {{bookmarks}} and {{surahs}} keep Latin digits. */
      counts: 'العلامات: {{bookmarks}} · السور: {{surahs}}',
    },
    /** Heading of the list: while searching, or in each sort order. */
    results: { filtered: 'العلامات المطابقة', recent: 'أحدث العلامات', quran: 'العلامات بترتيب المصحف' },
    /** {{count}} keeps Latin digits. */
    count_zero: 'لا نتائج',
    count_one: 'علامة واحدة',
    count_two: 'علامتان',
    count_few: '{{count}} علامات',
    count_many: '{{count}} علامة',
    count_other: '{{count}} علامة',
    empty: {
      title: 'لم تضع علامة على أي آية بعد',
      description: 'ضع علامة على أي آية من المصحف أو من نتائج البحث، وستجدها هنا متى أردت العودة إليها.',
      noMatchTitle: 'لا علامة تطابق بحثك',
      noMatchDescription: 'جرّب اسم السورة أو كلمات أخرى من الآية.',
      showAll: 'عرض كل العلامات',
      findAyah: 'البحث عن آية',
    },
  },
  /** The mushaf text comes from the device's cache. */
  stale: 'تُستخدم نسخة المصحف المخزَّنة على جهازك.',
  loadError: 'تعذّر تحميل المصحف',
  preparing: 'جارٍ تجهيز النتائج',
  /** One ayah in search results or bookmarks. {{surah}} already includes the word سورة. */
  result: {
    label: '{{surah}}، الآية {{ayah}}، الصفحة {{page}}. {{text}}',
    hint: 'فتح الآية وتحديدها في المصحف',
    /** Bookmark button: "وضع علامة على الآية 5 من سورة البقرة". */
    saveLabel: 'وضع علامة على الآية {{ayah}} من {{surah}}',
    unsaveLabel: 'إزالة العلامة عن الآية {{ayah}} من {{surah}}',
    /** On the bookmark button in the bookmarks list. */
    unsave: 'إزالة العلامة',
    /** On the bookmark button in search results once the ayah is bookmarked. */
    saved: 'في العلامات',
    save: 'وضع علامة',
    openLabel: 'فتح الآية {{ayah}} من {{surah}}',
    open: 'فتح في المصحف',
  },
} as const;
