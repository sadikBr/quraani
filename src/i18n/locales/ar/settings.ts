/** The settings screen: the mushaf (riwayah, reading mode), the Quran text's look, recitation, appearance, prayers. */
export default {
  tabs: { label: 'أقسام الإعدادات', reading: 'القراءة', recitation: 'التلاوة', appearance: 'المظهر', prayers: 'الصلاة' },
  /** Headline and sentence at the top of each settings tab (the reading tab has group headings instead). */
  intro: {
    recitation: { title: 'تلاوة تعينك على الحفظ', detail: 'اختر قارئك وعدد مرات التكرار، ونزّل التلاوة لتستمع إليها دون اتصال.' },
    appearance: { title: 'ألوان تريح عينك', detail: 'اختر مظهرًا يرافقك في كل صفحة.' },
    prayers: { title: 'صلاتك في وقتها', detail: 'اختر كيف ينبّهك التطبيق لكل صلاة، وطريقة حساب المواقيت.' },
  },
  /** The reading tab's last section: how the Quran text looks. */
  groups: {
    text: {
      title: 'النص القرآني',
      detail: 'في وضع النص، والأذكار، والبحث. كل تغيير يظهر في المعاينة.',
      /** Added for Warsh while the printed pages are chosen: the letter style and colours leave them as they are. */
      pagesStay: 'صفحات المصحف تبقى كما طُبعت.',
    },
  },
  riwayah: {
    title: 'رواية القرآن',
    /** Shown under the riwayah name, e.g. "ورش" then "عن نافع". */
    from: { warsh: 'عن نافع', hafs: 'عن عاصم' },
    savedSeparately: 'يُحتفظ بموضع القراءة والعلامات لكل رواية على حدة.',
  },
  mode: {
    title: 'طريقة القراءة',
    page: { label: 'صفحات المصحف', detail: 'كالمصحف المطبوع' },
    text: { label: 'النص القرآني', detail: 'بالحجم الذي يناسبك' },
    /** Warsh in the text view: one page per thumun (eighth of a hizb) instead of the mushaf's pages. */
    thumun: {
      label: 'صفحة لكل ثمن',
      detail: 'تُقسَّم القراءة إلى {{count, number}} صفحة: لكل ثمن صفحته، تُعرَف بحزبها وثمنها.',
    },
  },
  textLayout: {
    title: 'عرض الآيات',
    label: 'طريقة عرض الآيات',
    ayah: 'آيات منفصلة',
    flowing: 'نص متصل',
    ayahDetail: 'تبدأ كل آية في سطر جديد.',
    flowingDetail: 'تتوالى الآيات متصلة، وتتكيّف السطور مع شاشتك.',
  },
  /** Warsh only: the letters as in the Maghrib (the Warsh font) or the East (the Madinah mushaf's font). */
  warshScript: {
    title: 'شكل الحروف',
    /** On the Maghribi choice: the letters Warsh's own mushafs are written in. */
    recommended: 'موصى به',
    /** Under the choice, for the one chosen; the preview shows the dots of ق and ف. */
    maghribi: { label: 'مغاربي', detail: 'كمصاحف المغرب، وهو الموصى به لرواية ورش' },
    mashriqi: { label: 'مشرقي', detail: 'كمصحف المدينة. والموصى به لرواية ورش هو المغاربي' },
  },
  tajweed: {
    title: 'ألوان التجويد',
    /** Under the switch: whose rules (Warsh), or where the colours show (Hafs: the printed pages too). */
    warshDetail: 'وفق رواية ورش من طريق الأزرق',
    hafsDetail: 'ألوان مصحف التجويد، في الصفحات والنص معًا',
    stopNote: 'تُعرض الأحكام باعتبار الوقف على رأس كل آية.',
  },
  footer: {
    /** Avoids «تُحفظ», which reads as memorizing. */
    autoSaved: 'تُسجَّل اختياراتك تلقائيًا',
    /** Link to the credits page, which names the sources (the Quran content is Quranpedia's). */
    credits: 'المصادر والتراخيص',
  },
  textComfort: {
    /** Labels at the two ends of the size slider. */
    rangeSmall: 'صغير',
    rangeLarge: 'كبير',
    lineSpacing: 'تباعد السطور',
    spacing: { normal: 'معتدل', spacious: 'واسع' },
    preview: {
      live: 'معاينة مباشرة',
      /** Shown while the surah name of the preview (Al-Mulk 9) is not loaded yet. */
      fallbackSurah: 'سورة الملك',
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
