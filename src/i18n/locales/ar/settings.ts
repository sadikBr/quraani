/** The settings screen: riwayah, reading mode, tajweed, text comfort and appearance. */
export default {
  tabs: { label: 'أقسام الإعدادات', reading: 'القراءة', appearance: 'المظهر' },
  intro: {
    reading: { title: 'قراءتك، كما تحب', detail: 'روايتك المفضّلة، والطريقة الأقرب إليك.' },
    appearance: { title: 'ألوان تريح عينك', detail: 'اختر طابعًا يرافقك في كل صفحة.' },
  },
  riwayah: {
    title: 'رواية القرآن',
    /** Shown under the riwayah name, e.g. "ورش" then "عن نافع". */
    from: { warsh: 'عن نافع', hafs: 'عن عاصم' },
    savedSeparately: 'موضع القراءة والعلامات محفوظة لكل رواية.',
  },
  mode: {
    title: 'طريقة القراءة',
    detail: 'اختر كيف تظهر لك صفحات القرآن.',
    page: { label: 'صفحات المصحف', detail: 'التنسيق الأصلي' },
    text: { label: 'النص القرآني', detail: 'مرن وقابل للتكبير' },
    pageNote: 'يحافظ على حجم الخط وتباعد المصحف المطبوع.',
  },
  textLayout: {
    title: 'تنسيق الآيات',
    label: 'تنسيق النص القرآني',
    ayah: 'آيات منفصلة',
    flowing: 'نص متصل',
    ayahDetail: 'كل آية في سطر مستقل.',
    flowingDetail: 'آيات متتابعة، بسطور تتكيّف مع شاشتك.',
  },
  tajweed: {
    title: 'ألوان التجويد',
    /** State of the tajweed colors (feminine: agrees with ألوان). */
    on: 'مفعّلة',
    off: 'غير مفعّلة',
    detail: 'تمييز أحكام التلاوة',
    warshNote: 'ورش من طريق الأزرق. تظهر الألوان في النص القرآني، وتبقى صفحات المصحف المطبوع كما هي.',
    hafsNote: 'ألوان مصحف التجويد في الموسوعة القرآنية، في الصفحات والنص.',
    stopNote: 'تُعرض الأحكام على أساس الوقف عند نهاية كل آية.',
  },
  footer: {
    autoSaved: 'تُحفظ اختياراتك تلقائيًا',
    sourceLabel: 'المحتوى القرآني من الموسوعة القرآنية',
    /** Link text; the arrow marks an external link. */
    source: 'المحتوى من الموسوعة القرآنية ↗',
  },
  textComfort: {
    title: 'راحة النص',
    detail: 'اضبط الحجم والتباعد، وشاهد الفرق مباشرةً.',
    /** Labels at the two ends of the size slider. */
    rangeSmall: 'صغير',
    rangeLarge: 'كبير',
    lineSpacing: 'تباعد السطور',
    spacing: { normal: 'معتدل', spacious: 'واسع' },
    preview: {
      live: 'معاينة مباشرة',
      /** Shown while the surah name of the preview is not loaded yet. */
      fallbackSurah: 'سورة الفاتحة',
      loading: 'جارٍ تحميل معاينة النص',
      error: 'تعذر عرض المعاينة. يمكنك متابعة ضبط النص.',
      reload: 'إعادة تحميل المعاينة',
      tajweedError: 'تعذر تحميل ألوان التجويد. النص ظاهر دون ألوان.',
      reloadTajweed: 'إعادة تحميل الألوان',
    },
  },
  fontSize: {
    label: 'حجم نص القرآن',
    hint: 'سبعة أحجام، من الأصغر إلى الأكبر',
    /** Spoken value of the slider: "عادي، 3 من 7". */
    value: '{{label}}، {{step}} من {{total}}',
    steps: { smallest: 'الأصغر', small: 'صغير', normal: 'عادي', medium: 'متوسط', large: 'كبير', larger: 'أكبر', largest: 'الأكبر' },
  },
  appearance: {
    label: 'مظهر التطبيق',
    /** {{theme}} is the selected theme name, shown in bold. */
    current: 'المظهر الحالي: {{theme}}',
    systemDetail: 'يتبدّل تلقائيًا بين الفاتح والداكن.',
    darkShades: 'درجات داكنة',
    lightShades: 'درجات فاتحة',
    themeHint: 'يُطبّق على التطبيق والمصحف ويُحفظ تلقائيًا',
  },
} as const;
