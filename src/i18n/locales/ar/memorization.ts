/** Memorization goal: creation, detail, goal card, progress hero and the memorized-ayahs picker (the picker is shared with the revision goal). */
export default {
  /** Name given to a memorization goal when the user leaves the name empty; also the name field's placeholder. */
  defaultName: 'حفظ القرآن',
  /** Goal kind shown in the creation screen header. */
  kind: 'حفظ القرآن',
  /**
   * A share of the Quran measured in quarters of a hizb (4 quarters = 1 hizb, 8 quarters = 1 juz).
   * Inserted as {{amount}} into other messages: "ربع حزب أسبوعيًا", "حزب كل أسبوع".
   */
  quarterAmount: {
    quarter: 'ربع حزب',
    half: 'نصف حزب',
    threeQuarters: 'ثلاثة أرباع حزب',
    oneHizb: 'حزب',
    oneJuz: 'جزء',
    /**
     * Any other amount, as a number of ahzab that may be fractional ("١٫٢٥ حزب" uses the `other` form).
     * `zero` only appears in the progress hero, when less than half a quarter is memorized.
     */
    hizbs_zero: 'أقل من ربع حزب',
    hizbs_one: 'حزب',
    hizbs_two: 'حزبان',
    hizbs_few: '{{count, number}} أحزاب',
    hizbs_many: '{{count, number}} حزبًا',
    hizbs_other: '{{count, number}} حزب',
  },
  percent: '{{percent, number}}٪',
  /** A number of ayahs: under a surah name in the picker, beside a day in the first schedule. */
  ayahCount_zero: '{{count, number}} آية',
  ayahCount_one: 'آية واحدة',
  ayahCount_two: 'آيتان',
  ayahCount_few: '{{count, number}} آيات',
  ayahCount_many: '{{count, number}} آية',
  ayahCount_other: '{{count, number}} آية',
  /** Size of what the user has memorized, on the goal card and the creation screen. */
  memorizedAyahs_zero: 'لم تضف أي آية إلى محفوظك بعد',
  memorizedAyahs_one: 'آية واحدة في محفوظك',
  memorizedAyahs_two: 'آيتان في محفوظك',
  memorizedAyahs_few: '{{count, number}} آيات في محفوظك',
  memorizedAyahs_many: '{{count, number}} آية في محفوظك',
  memorizedAyahs_other: '{{count, number}} آية في محفوظك',
  /** Label of the weekly amount field, counted in quarters of a hizb. */
  weeklyAmountLabel: 'المقدار الأسبوعي بأرباع الأحزاب',
  remindMe: 'ذكّرني بالحفظ',
  /** Quick choice in the weekday picker. */
  mondayAndWednesday: 'الاثنين والأربعاء',
  errors: {
    invalidSegments: 'مقاطع الحفظ غير صالحة.',
    invalidBounds: 'حدود أحد المقاطع غير صالحة.',
    recordMismatch: 'سجلّ محفوظك غير متوافق مع هذه النسخة من المصحف. لم يتغيّر شيء في السجلّ.',
    weeklyAmount: 'اختر مقدارًا أسبوعيًا بين ربع حزب والقرآن كاملًا.',
    weekdays: 'اختر يومًا واحدًا على الأقل للحفظ.',
    reminderTime: 'وقت التذكير غير صالح.',
    startDate: 'تاريخ البدء غير صالح.',
    nameAndRiwayah: 'تحقّق من اسم الهدف وروايته.',
    mushafMismatch: 'هذه النسخة من المصحف لا تطابق سجلّ محفوظك.',
    undoMismatch: 'تعذّر التراجع لعدم تطابق نسخة المصحف أو التاريخ مع سجلّ محفوظك.',
    invalidSchedule: 'جدول الحفظ غير صالح.',
    invalidDates: 'مواعيد الحفظ غير صالحة.',
    overlapping: 'مقاطع الحفظ متداخلة.',
    scheduleMismatch: 'جدول الحفظ لا يطابق محفوظك.',
    /** The list of confirmed memorization portions. */
    invalidLog: 'سجلّ الإنجاز غير صالح.',
    invalidUndoDate: 'تاريخ التراجع غير صالح.',
    invalidLastEntry: 'بيانات آخر مقطع حفظته غير صالحة.',
  },
  hero: {
    label: 'محفوظك من القرآن',
    complete: 'هنيئًا لك حفظ القرآن',
    growing: 'آية بعد آية',
    /** Nothing memorized yet. */
    start: 'ابدأ الحفظ آيةً آية',
    /** Memorized ayahs and their rough size: "١٢ آية · ربع حزب تقريبًا". {{amount}} is hero.approximately, or «أقل من ربع حزب». */
    approximately: '{{amount}} تقريبًا',
    summary_zero: 'لم تضف أي آية بعد',
    summary_one: 'آية واحدة · {{amount}}',
    summary_two: 'آيتان · {{amount}}',
    summary_few: '{{count, number}} آيات · {{amount}}',
    summary_many: '{{count, number}} آية · {{amount}}',
    summary_other: '{{count, number}} آية · {{amount}}',
    progressLabel: 'نسبة الحفظ من القرآن',
  },
  /** Status line and description of the goal card in the goals list. */
  card: {
    completed: 'أتممت حفظ القرآن',
    due: 'ورد اليوم',
    next: 'الورد القادم · {{date}}',
    description: 'حفظ القرآن · {{amount}} أسبوعيًا',
  },
  juzChart: {
    /** Number of fully memorized ajza' (0–29; all thirty use `all`). */
    complete_zero: 'لم تُتمّ حفظ جزء بعد',
    complete_one: 'جزء واحد محفوظ',
    complete_two: 'جزءان محفوظان',
    complete_few: '{{count, number}} أجزاء محفوظة',
    complete_many: '{{count, number}} جزءًا محفوظًا',
    complete_other: '{{count, number}} جزء محفوظ',
    all: 'ثلاثون جزءًا، هنيئًا لك',
    outOfThirty: 'من ثلاثين',
    /** Accessibility label: the summary above, then the juz being memorized now. */
    labelWithCurrent: '{{summary}}، وتحفظ الآن في الجزء {{juz, number}}',
    current: 'تحفظ الآن في الجزء {{juz, number}}',
    currentWithProgress: 'تحفظ الآن في الجزء {{juz, number}} · اكتمل منه {{percent, number}}٪',
  },
  creation: {
    /** Shown instead of the creation screen while another memorization goal is in progress. */
    blocked: {
      title: 'هدف حفظ واحد في كل مرة',
      subtitle: 'لتتابع حفظك بانتظام وفق ترتيب المصحف.',
      notice: 'لديك هدف حفظ قائم. أتمّه أو أرشفه قبل إنشاء هدف حفظ جديد.',
      continue: 'تابع {{name}}',
    },
    backToSetup: 'العودة إلى إعداد الهدف',
    setupTitle: 'احفظ على قدر طاقتك',
    setupSubtitle: 'حدّد أيام الحفظ ومقداره الأسبوعي لنرتّب لك الأوراد.',
    reviewTitle: 'جدول حفظك',
    reviewSubtitle: 'تأكّد من مقدار الحفظ ومواعيده، ثم ابدأ على بركة الله.',
    memorized: {
      title: 'ما حفظته من قبل',
      description: 'يستثني الجدول ما سبق أن حفظته. وكل مقطع تتمّ حفظه يُضاف إلى سجلّ محفوظك تلقائيًا.',
      /** Accessibility label of the button that opens the memorized-ayahs picker. */
      chooseLabel: 'تحديد محفوظك من القرآن',
      empty: 'هل تحفظ شيئًا من القرآن؟',
      units: 'سور أو أجزاء أو أحزاب أو أرباع أو آيات محددة',
      edit: 'تعديل محفوظك',
      choose: 'تحديد محفوظك',
      note: 'يمكنك تركه فارغًا للبدء من الفاتحة. لكل رواية سجلّ مستقل.',
    },
    amount: {
      title: 'مقدار الحفظ',
      description: 'حدّد مقدار الحفظ الأسبوعي بعدد أرباع الحزب. كل أربعة أرباع تساوي حزبًا.',
      /** Caption under the number in the amount field, also read after each quick-choice number (plans.creation.amount.preset): must fit any number. */
      unit: 'بأرباع الأحزاب في الأسبوع',
      summary: '{{amount}} كل أسبوع',
    },
    days: {
      title: 'أيام الحفظ',
      description: 'يُوزَّع المقدار الأسبوعي على الأيام المختارة، وينتهي كل ورد عند نهاية آية.',
    },
    schedule: {
      /** {{count}} is the number of memorization days in the week (1–7). */
      description_zero: '{{amount}} أسبوعيًا. مقدار كل ورد تقريبي ليلائم نهايات الآيات.',
      description_one: '{{amount}} أسبوعيًا، في يوم واحد. مقدار كل ورد تقريبي ليلائم نهايات الآيات.',
      description_two: '{{amount}} أسبوعيًا، على يومين. مقدار كل ورد تقريبي ليلائم نهايات الآيات.',
      description_few: '{{amount}} أسبوعيًا، على {{count, number}} أيام. مقدار كل ورد تقريبي ليلائم نهايات الآيات.',
      description_many: '{{amount}} أسبوعيًا، على {{count, number}} يومًا. مقدار كل ورد تقريبي ليلائم نهايات الآيات.',
      description_other: '{{amount}} أسبوعيًا، على {{count, number}} يوم. مقدار كل ورد تقريبي ليلائم نهايات الآيات.',
      /** A day's portion has more segments than the three listed above it. */
      moreSegments_zero: 'و{{count, number}} مقطع آخر',
      moreSegments_one: 'ومقطع آخر',
      moreSegments_two: 'ومقطعان آخران',
      moreSegments_few: 'و{{count, number}} مقاطع أخرى',
      moreSegments_many: 'و{{count, number}} مقطعًا آخر',
      moreSegments_other: 'و{{count, number}} مقطع آخر',
      /** Number of memorization portions left until the whole Quran is memorized. */
      sessions_zero: '{{count, number}} ورد حتى إتمام الحفظ',
      sessions_one: 'ورد واحد حتى إتمام الحفظ',
      sessions_two: 'وردان حتى إتمام الحفظ',
      sessions_few: '{{count, number}} أوراد حتى إتمام الحفظ',
      sessions_many: '{{count, number}} وردًا حتى إتمام الحفظ',
      sessions_other: '{{count, number}} ورد حتى إتمام الحفظ',
      expectedEnd: 'الموعد المتوقع للإتمام: {{date}}',
      allMemorized: 'حدّدت القرآن كاملًا ضمن محفوظك، هنيئًا لك. سيُسجَّل محفوظك دون إنشاء أوراد جديدة.',
    },
    reminderDetail: 'في أيام الحفظ فقط.',
    howItWorks: 'نبدأ من أول آية لم تحفظها، ونتابع بترتيب المصحف. إذا فاتك يوم، ينتقل ورده إلى يوم الحفظ التالي. ويمكنك تعديل أيامك ومقدارك لاحقًا.',
    start: 'إنشاء هدف الحفظ',
    /** Final button when everything is already memorized: records the memorized ayahs, with no schedule. */
    saveRecord: 'تسجيل محفوظك',
    /** Goes from the setup step to the schedule step (same label in every creation flow). */
    review: 'متابعة',
  },
  detail: {
    next: {
      todayTitle: 'وردك اليوم',
      upcomingTitle: 'وردك القادم',
      ayah: 'الآية {{ayah, number}}',
      ayahs: 'الآيات {{from, number}} – {{to, number}}',
      /** The portion ends in another surah: "حتى الآية ٥ من سورة البقرة". {{surah}} is the surah name. */
      until: 'حتى الآية {{ayah, number}} من {{surah}}',
      stats: { ayahs: 'الآيات', words: 'الكلمات', page: 'الصفحة' },
      /** First and last page, kept left to right inside an isolate. */
      pageRange: '⁦{{from, number}}–{{to, number}}⁩',
      /** The next portion is made of several separate segments (shown from 2). */
      segments_zero: 'يضم هذا الورد {{count, number}} مقطع، ويُفتح كل مقطع على حدة.',
      segments_one: 'يضم هذا الورد مقطعًا واحدًا.',
      segments_two: 'يضم هذا الورد مقطعين، ويُفتح كل مقطع على حدة.',
      segments_few: 'يضم هذا الورد {{count, number}} مقاطع، ويُفتح كل مقطع على حدة.',
      segments_many: 'يضم هذا الورد {{count, number}} مقطعًا، ويُفتح كل مقطع على حدة.',
      segments_other: 'يضم هذا الورد {{count, number}} مقطع، ويُفتح كل مقطع على حدة.',
      start: 'ابدأ الحفظ',
      done: 'أتممت حفظ هذا المقطع',
      confirmNote: 'يُضاف المقطع إلى محفوظك بعد تأكيد إتمام حفظه.',
      /** {{date}} includes the weekday: "الاثنين، 12 أكتوبر". */
      opensOn: 'موعد حفظ هذا المقطع: {{date}}. يمكنك مراجعة محفوظك حتى يحين الموعد.',
    },
    completedTitle: 'أتممت حفظ القرآن، هنيئًا لك',
    completedNote: 'يبقى سجلّ محفوظك كما هو، ويمكنك تصحيحه متى احتجت.',
    pausedTitle: 'الحفظ متوقف مؤقتًا',
    pausedNote: 'عند الاستئناف، تتابع الحفظ من حيث توقفت في الأيام التي اخترتها.',
    /** Followed by deletesOn when the deletion date is known. */
    archivedNote: 'يبقى سجلّ محفوظك كما هو عند حذف الهدف.',
    deletesOn: 'يُحذف الهدف في {{date}}.',
    resume: 'استئناف الحفظ',
    pause: 'إيقاف الحفظ مؤقتًا',
    record: {
      title: 'سجلّ محفوظك',
      description: 'أضف ما حفظته خارج الهدف أو صحّح اختيارًا سابقًا.',
      edit: 'تعديل محفوظك',
    },
    /** Undoes the last confirmed memorization portion. */
    undo: 'التراجع عن آخر ما سجّلته اليوم',
    /** "ربع حزب أسبوعيًا · الاثنين والأربعاء" */
    scheduleSummary: '{{amount}} أسبوعيًا · {{days}}',
    scheduleFooter: 'الموعد المتوقع لإتمام الحفظ: {{date}} · يتغيّر بحسب تقدّمك.',
    recent: 'آخر ما أضفته إلى محفوظك',
    settings: {
      /** Same caption as creation.amount.unit. */
      amountUnit: 'بأرباع الأحزاب في الأسبوع',
      note: 'عند تغيير الأيام أو المقدار، يُعاد توزيع ما تبقّى دون تغيير محفوظك.',
      reminderDetail: 'في أيام الحفظ فقط.',
      recordKept: 'يبقى سجلّ محفوظك بعد أرشفة الهدف أو حذفه.',
    },
    errors: {
      memoryChanged: 'تغيّر محفوظك. أغلق النافذة وافتحها مجددًا.',
      nameAndTime: 'تحقّق من اسم الهدف ووقت التذكير.',
      daysAndAmount: 'اختر أيام الحفظ وحدّد مقدارًا لا يقل عن ربع حزب.',
    },
  },
  /** The memorized-ayahs picker, used by both the memorization and the revision goal. */
  selection: {
    title: 'محفوظك',
    subtitle: 'حدّد ما تحفظه ليُرتَّب جدولك بناءً عليه.',
    close: 'إغلاق اختيار المحفوظ',
    /** Accessibility label of the tabs below. */
    tabsLabel: 'طريقة تحديد المحفوظ',
    tabs: { surahs: 'سور', juzs: 'أجزاء', hizbs: 'أحزاب', quarters: 'أرباع', ayahs: 'آيات' },
    searchPlaceholder: 'ابحث بالاسم أو الرقم',
    searchLabel: 'البحث في القائمة',
    juz: 'الجزء {{juz, number}}',
    hizb: 'الحزب {{hizb, number}}',
    quarter: 'الحزب {{hizb, number}} · الربع {{quarter, number}}',
    custom: {
      title: 'تحديد مقطع بالآيات',
      hint: 'أدخل رقم السورة ورقم الآية لبداية المقطع ونهايته.',
      fromSurah: 'من السورة',
      fromAyah: 'من الآية',
      toSurah: 'إلى السورة',
      toAyah: 'إلى الآية',
      invalid: 'تحقّق من أرقام السور والآيات، ومن أن نهاية المقطع لا تسبق بدايته.',
      remove: 'إزالة المقطع من محفوظك',
      add: 'إضافة المقطع إلى محفوظك',
      note: 'يمكنك إضافة أكثر من مقطع، وتُحتسب الآيات المشتركة بينها مرة واحدة.',
    },
    noResults: 'لا توجد نتائج.',
    /** Under a surah memorized in part; {{count}} is the surah's number of ayahs (3 or more). */
    partial_zero: '{{count, number}} آية · تحفظ بعضها',
    partial_one: 'آية واحدة',
    partial_two: 'آيتان · تحفظ إحداهما',
    partial_few: '{{count, number}} آيات · تحفظ بعضها',
    partial_many: '{{count, number}} آية · تحفظ بعضها',
    partial_other: '{{count, number}} آية · تحفظ بعضها',
    /** Live total of the selection, above the confirm button. */
    total_zero: 'لم تحدّد أي آية بعد',
    total_one: 'حدّدت آية واحدة',
    total_two: 'حدّدت آيتين',
    total_few: 'حدّدت {{count, number}} آيات',
    total_many: 'حدّدت {{count, number}} آية',
    total_other: 'حدّدت {{count, number}} آية',
    /** On the confirm button while the selection is being stored; avoids «الحفظ», which reads as memorizing. */
    saving: 'جارٍ التسجيل…',
    confirm: 'اعتماد المحفوظ',
  },
} as const;
