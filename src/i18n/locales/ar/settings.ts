/** The settings screen: riwayah, reading mode, tajweed, text comfort and appearance. */
export default {
  tabs: { label: 'أقسام الإعدادات', reading: 'القراءة', recitation: 'التلاوة', appearance: 'المظهر', prayers: 'الصلاة' },
  /** Headline and sentence at the top of each settings tab. */
  intro: {
    reading: { title: 'قراءة تناسبك', detail: 'اختر روايتك وطريقة العرض التي تريحك.' },
    recitation: { title: 'تلاوة تعينك على الحفظ', detail: 'اختر قارئك وعدد مرات التكرار، ونزّل التلاوة لتستمع إليها دون اتصال.' },
    appearance: { title: 'ألوان تريح عينك', detail: 'اختر مظهرًا يرافقك في كل صفحة.' },
    prayers: { title: 'صلاتك في وقتها', detail: 'اختر كيف ينبّهك التطبيق لكل صلاة، وطريقة حساب المواقيت.' },
  },
  riwayah: {
    title: 'رواية القرآن',
    /** Shown under the riwayah name, e.g. "ورش" then "عن نافع". */
    from: { warsh: 'عن نافع', hafs: 'عن عاصم' },
    savedSeparately: 'يُحتفظ بموضع القراءة والعلامات لكل رواية على حدة.',
  },
  mode: {
    title: 'طريقة القراءة',
    detail: 'اختر كيف يظهر لك المصحف.',
    page: { label: 'صفحات المصحف', detail: 'كالمصحف المطبوع' },
    text: { label: 'النص القرآني', detail: 'بالحجم الذي يناسبك' },
    /** Shown when the printed pages are chosen: their font size and spacing can't be changed. */
    pageNote: 'يبقى حجم الخط وتباعد السطور كما في المصحف المطبوع.',
  },
  textLayout: {
    title: 'عرض الآيات',
    label: 'طريقة عرض الآيات',
    ayah: 'آيات منفصلة',
    flowing: 'نص متصل',
    ayahDetail: 'تبدأ كل آية في سطر جديد.',
    flowingDetail: 'تتوالى الآيات متصلة، وتتكيّف السطور مع شاشتك.',
  },
  tajweed: {
    title: 'ألوان التجويد',
    /** State of the tajweed colors (feminine: agrees with ألوان). */
    on: 'مفعّلة',
    off: 'غير مفعّلة',
    detail: 'تمييز أحكام التجويد',
    warshNote: 'الأحكام وفق رواية ورش من طريق الأزرق. تظهر الألوان في النص القرآني، وتبقى صفحات المصحف كما هي.',
    hafsNote: 'تظهر ألوان مصحف التجويد من الموسوعة القرآنية في الصفحات والنص معًا.',
    stopNote: 'تُعرض الأحكام باعتبار الوقف على رأس كل آية.',
  },
  footer: {
    /** Avoids «تُحفظ», which reads as memorizing. */
    autoSaved: 'تُسجَّل اختياراتك تلقائيًا',
    sourceLabel: 'المحتوى القرآني من الموسوعة القرآنية',
    /** Link text; the arrow marks an external link. */
    source: 'المحتوى من الموسوعة القرآنية ↗',
    /** Link to the credits page. */
    credits: 'المصادر والتراخيص',
  },
  textComfort: {
    title: 'راحة القراءة',
    detail: 'اضبط حجم الخط وتباعد السطور، وعاين النتيجة فورًا.',
    /** Labels at the two ends of the size slider. */
    rangeSmall: 'صغير',
    rangeLarge: 'كبير',
    lineSpacing: 'تباعد السطور',
    spacing: { normal: 'معتدل', spacious: 'واسع' },
    preview: {
      live: 'معاينة مباشرة',
      /** Shown while the surah name of the preview is not loaded yet. */
      fallbackSurah: 'سورة الفاتحة',
      loading: 'جارٍ تحميل المعاينة',
      error: 'تعذّر عرض المعاينة، ويمكنك مع ذلك ضبط الخط والتباعد.',
      reload: 'إعادة تحميل المعاينة',
      tajweedError: 'تعذّر تحميل ألوان التجويد، فعُرض النص دونها.',
      reloadTajweed: 'إعادة تحميل الألوان',
    },
  },
  fontSize: {
    label: 'حجم الخط',
    hint: 'سبعة أحجام، من الأصغر إلى الأكبر',
    /** Spoken value of the slider: "عادي، 3 من 7". */
    value: '{{label}}، {{step}} من {{total}}',
    /** The seven sizes in order; «عادي» is the default and «مكبَّر» the step just above it. */
    steps: { smallest: 'الأصغر', small: 'صغير', normal: 'عادي', medium: 'مكبَّر', large: 'كبير', larger: 'أكبر', largest: 'الأكبر' },
  },
  appearance: {
    label: 'مظهر التطبيق',
    /** {{theme}} is the selected theme name, shown in bold. */
    current: 'المظهر الحالي: {{theme}}',
    systemDetail: 'يتبدّل تلقائيًا بين الفاتح والداكن.',
    /** Headings of the two groups of themes. */
    darkShades: 'ألوان داكنة',
    lightShades: 'ألوان فاتحة',
    /** Accessibility hint of each theme. */
    themeHint: 'يُطبَّق على التطبيق والمصحف، ويُحتفظ به تلقائيًا',
  },
} as const;
