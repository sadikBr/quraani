/** The Quran index, search and saved bookmarks. */
export default {
  searchResults: 'نتائج البحث',
  index: {
    title: 'فهرس القرآن',
    tabs: { label: 'أقسام الفهرس', surah: 'السور', juz: 'الأجزاء', hizb: 'الأحزاب' },
    search: {
      label: 'البحث في الفهرس',
      placeholder: { surah: 'اسم السورة أو رقمها', juz: 'رقم الجزء أو سورة بدايته', hizb: 'رقم الحزب أو سورة بدايته' },
    },
    prompt: 'اختر موضعًا وابدأ القراءة',
    /** Number of listed items; {{n}} keeps Latin digits. */
    count: { surah: '{{n}} سورة', juz: '{{n}} جزءًا', hizb: '{{n}} حزبًا' },
    loading: 'جارٍ تحميل الفهرس',
    error: { title: 'تعذر فتح الفهرس', unavailable: 'الفهرس غير متوفر الآن.' },
    empty: { title: 'لا توجد نتائج', description: 'جرّب اسمًا أو رقمًا آخر، أو امسح البحث لعرض الفهرس كاملًا.' },
    item: {
      /** e.g. "البقرة، الآيات: 286، الصفحة 2". */
      label: '{{title}}، {{detail}}، الصفحة {{page}}',
      hint: 'افتح المصحف عند بداية الموضع',
      page: 'صفحة {{page}}',
    },
  },
  search: {
    title: 'البحث في القرآن',
    label: 'البحث في نص القرآن',
    placeholder: 'اكتب كلمة أو عبارة من الآية',
    tip: 'ابحث بالتشكيل أو بدونه، في روايتك المختارة.',
    searching: 'جارٍ البحث',
    /** {{n}} keeps Latin digits. */
    count: '{{n}} نتيجة',
    suggestion: 'البحث عن {{query}}',
    showMore: 'عرض المزيد من النتائج',
    empty: {
      title: 'تذكّر كلمة، واعثر على الآية',
      description: 'اكتب حرفين على الأقل، أو ابدأ بأحد هذه الاقتراحات.',
      noMatchTitle: 'لم نعثر على هذه الكلمات',
      noMatchDescription: 'جرّب كلمات أقل، أو صياغة أخرى من الآية.',
    },
  },
  bookmarks: {
    title: 'العلامات المحفوظة',
    search: { label: 'البحث في العلامات المحفوظة', placeholder: 'اسم السورة أو كلمات من الآية' },
    order: { label: 'ترتيب العلامات', quran: 'ترتيب المصحف', recent: 'الأحدث حفظًا' },
    removed: 'أُزيلت العلامة من المحفوظات',
    undoLabel: 'التراجع عن إزالة العلامة',
    undo: 'تراجع',
    storageError: 'تعذر قراءة العلامات أو حفظها على الجهاز. تغييراتك متاحة في هذه الجلسة.',
    summary: {
      title: 'آيات ترجع إليها',
      /** {{bookmarks}} and {{surahs}} keep Latin digits. */
      counts: 'العلامات: {{bookmarks}} · السور: {{surahs}}',
    },
    results: { filtered: 'نتائج المحفوظات', recent: 'آخر ما حفظته', quran: 'آياتك بترتيب المصحف' },
    /** {{n}} keeps Latin digits. */
    count: '{{n}} علامة',
    empty: {
      title: 'آيات تحب أن تبقى قريبة',
      description: 'احفظ أي آية من المصحف أو نتائج البحث، وستجدها هنا للعودة إليها بسهولة.',
      noMatchTitle: 'لا توجد علامة مطابقة',
      noMatchDescription: 'جرّب اسم السورة أو كلمات أخرى من الآية.',
      showAll: 'عرض كل العلامات',
      findAyah: 'البحث عن آية',
    },
  },
  stale: 'تستخدم نسخة المصحف المحفوظة على الجهاز.',
  loadError: 'تعذر تحميل المحتوى',
  preparing: 'جارٍ تجهيز النتائج',
  /** One ayah in search results or bookmarks. */
  result: {
    label: '{{surah}}، الآية {{ayah}}، صفحة {{page}}. {{text}}',
    hint: 'فتح الآية وتحديدها في المصحف',
    position: 'الآية {{ayah}} · صفحة {{page}}',
    saveLabel: 'حفظ {{surah}}، الآية {{ayah}}',
    unsaveLabel: 'إزالة حفظ {{surah}}، الآية {{ayah}}',
    unsave: 'إزالة الحفظ',
    saved: 'محفوظة',
    save: 'حفظ الآية',
    openLabel: 'فتح {{surah}}، الآية {{ayah}}',
    open: 'فتح في المصحف',
  },
} as const;
