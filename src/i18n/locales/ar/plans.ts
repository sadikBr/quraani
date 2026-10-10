/** The goals list, the goal chooser, the archive, shared goal pieces, the plan engine, reminders and storage. */
export default {
  back: 'رجوع',
  loading: 'جارٍ تحميل الهدف',
  /** Reading units of khatma and daily wird goals, after a number: "٥ صفحات". */
  units: { pages: 'صفحات', hizbs: 'أحزاب', juzs: 'أجزاء' },
  /** A progress percentage: "٤٥٪". */
  percent: '{{percent, number}}٪',
  /** One-line description of a goal under its name. */
  summary: {
    khatma: 'ختمة · {{weeks, number}} أسابيع',
    /** {{unit}} is one of plans.units. */
    wird: 'ورد يومي · {{amount, number}} {{unit}}',
    /** {{amount}} is a quarter-hizb amount such as "ربع حزب". */
    memorization: 'حفظ القرآن · {{amount}} أسبوعيًا',
    /** {{days}} is a list of weekdays or "كل يوم". */
    recurring: 'قراءة متكررة · {{days}}',
    revision: 'مراجعة · {{amount}} في الجلسة',
  },
  progress: {
    ofTotal: '{{completed, number}} من {{total, number}} وردًا',
    completedOfTotal: '{{completed, number}} من {{total, number}} وردًا مكتملًا',
  },
  /** Page ranges of a portion; page numbers stay Latin inside a left-to-right isolate. */
  range: {
    page: 'صفحة {{page}}',
    pages: 'الصفحات ⁦{{first}}–{{last}}⁩',
    /** First and last ayah of a portion, e.g. "البقرة 5 ← البقرة 20". */
    ayahs: '{{fromSurah}} {{fromAyah}} ← {{toSurah}} {{toAyah}}',
  },
  portion: {
    from: 'من',
    to: 'إلى',
    ayah: 'الآية {{ayah, number}}',
    ayahs: 'الآيات {{first, number}} – {{last, number}}',
    ayahCount_zero: '{{count, number}} آيات',
    ayahCount_one: 'آية واحدة',
    ayahCount_two: 'آيتان',
    ayahCount_few: '{{count, number}} آيات',
    ayahCount_many: '{{count, number}} آية',
    ayahCount_other: '{{count, number}} آية',
    page: 'صفحة {{page, number}}',
    pages: 'الصفحات {{first, number}}–{{last, number}}',
  },
  list: {
    mushaf: 'المصحف',
    createLabel: 'إنشاء هدف جديد',
    title: 'أهدافك القرآنية',
    subtitle: 'قراءة وحفظ، ومواعيد تتجدد مع القرآن.',
    tabs: { label: 'عرض الأهداف', mine: 'أهدافي', archive: 'الأرشيف' },
    overview: {
      dueTitle: 'وردك بانتظارك',
      completedTitle: 'خطوة أخرى أنجزتها',
      idleTitle: 'وقتٌ للقرآن',
      dueDetail: 'خطوة صغيرة اليوم، تقرّبك من هدفك.',
      ongoingDetail: 'رحلتك مستمرة، على مهلٍ وثبات.',
      emptyDetail: 'اجعل للقرآن نصيبًا من يومك.',
      /** Next to the number of portions due today. */
      due: 'بانتظارك اليوم',
      /** Next to the number of portions completed today. */
      completed: 'أوراد أتممتها اليوم',
    },
    empty: {
      archiveTitle: 'أرشيفك فارغ',
      completedTitle: 'أتممت وردك، تقبّل الله منك',
      nothingDueTitle: 'لا أوراد مطلوبة الآن',
      startTitle: 'لكل رحلة بداية',
      archiveDetail: 'تُحفظ الأهداف هنا لمدة أسبوعين بعد أرشفتها، ثم تُحذف نهائيًا.',
      waitingDetail: 'تجد أهدافك القادمة والموقوفة في «أهدافي».',
      startDetail: 'ختمة، أو حفظ متدرّج ومراجعته، أو سور تختار لها مواعيد تتجدد.',
      showMine: 'عرض أهدافي',
      createFirst: 'إنشاء أول هدف',
    },
  },
  card: {
    /** {{detail}} is empty or starts with "، ", e.g. "، اكتمل 45 بالمئة". */
    openLabel: 'فتح هدف {{name}}، {{status}}{{detail}}',
    /** Spoken after the status; the percentage uses Latin digits. */
    percentDetail: '، اكتمل {{percent}} بالمئة',
    status: {
      nextCycleSoon: 'تبدأ الدورة التالية قريبًا',
      nextCycleTomorrow: 'الدورة التالية غدًا',
      next: 'الورد القادم · {{date}}',
      overdue: 'ورد سابق بانتظارك',
      today: 'ورد اليوم',
    },
  },
  chooser: {
    subtitle: 'اختر ما تحب أن تواظب عليه.',
    recurring: {
      title: 'مواعيد تتجدد مع القرآن',
      description: 'سور تختارها، في أيام تناسبك. ابدأ باقتراح جاهز أو اصنع موعدك الخاص.',
      customLabel: 'إنشاء قراءة متكررة مخصصة',
      customTitle: 'قراءة متكررة من اختيارك',
      customDetail: 'سورة أو أكثر · أيام تختارها',
    },
    presets: {
      kahf: { surah: 'سورة الكهف', when: 'كل جمعة' },
      mulk: { surah: 'سورة الملك', when: 'كل ليلة' },
      review: 'راجع الموعد وابدأ',
    },
    /** Under a goal type that already has a goal in progress. */
    continueGoal: 'تابع {{name}}',
    memorization: {
      continueLabel: 'متابعة هدف الحفظ',
      createLabel: 'إنشاء هدف حفظ القرآن',
      title: 'القرآن في صدرك',
      detail: 'حفظ متدرّج، يبدأ من ربع حزب أسبوعيًا',
    },
    revision: {
      continueLabel: 'متابعة هدف المراجعة',
      createLabel: 'إنشاء هدف مراجعة المحفوظ',
      title: 'ثبّت محفوظك',
      detail: 'مراجعة دورية تمر على كل ما تحفظه',
    },
    reading: {
      title: 'رحلتك عبر المصحف',
      khatmaDetail: 'ورد محسوب لإتمام القراءة',
      wirdDetail: 'مقدار ثابت، بلا موعد إتمام',
      /** {{goal}} is a goal type name: "إنشاء ختمة". */
      create: 'إنشاء {{goal}}',
      existing: 'لديك هدف قراءة جارٍ. القراءات المتكررة متاحة بجانبه.',
      viewExisting: 'عرض «{{name}}»',
      hint: 'ختمة أو ورد يومي واحد، وقراءات متكررة ترافقه.',
    },
  },
  creation: {
    goalType: {
      label: 'نوع الهدف',
      khatmaDetail: 'ورد محسوب حسب المدة',
      wirdDetail: 'مقدار تختاره، بلا مدة',
      /** {{goal}} is a goal type name. */
      unavailableLabel: '{{goal}}، غير متاح أثناء هدف القراءة الحالي',
      current: 'هدفك الحالي',
      later: 'متاح بعد إتمام هدفك',
    },
    steps: {
      label: 'خطوات إنشاء الهدف',
      /** The second creation step: reviewing the choices before saving. */
      review: 'المراجعة',
    },
    amount: {
      /** {{label}} is the name of the amount field. */
      increase: 'زيادة {{label}}',
      decrease: 'تقليل {{label}}',
      /** A preset amount with its unit: "٥ صفحات يوميًا". */
      preset: '{{amount, number}} {{unit}}',
    },
    existing: {
      khatma: 'لديك ختمة بالفعل',
      wird: 'لديك ورد يومي بالفعل',
      detail: 'تابع هدفك الحالي أو عدّل إعداداته من صفحته.',
      viewLabel: 'عرض الهدف الحالي: {{name}}',
    },
  },
  dateField: {
    /** Spoken label of a date or time field: "تاريخ البداية: ١٠ أكتوبر ٢٠٢٦". */
    label: '{{label}}: {{value}}',
    done: 'تم',
  },
  surahSheet: {
    title: 'سور ترافقك',
    subtitle: 'اختر سورة أو أكثر، بترتيب المصحف.',
    close: 'إغلاق اختيار السور',
    searchLabel: 'البحث عن سورة',
    searchPlaceholder: 'اسم السورة أو رقمها',
    empty: 'لا توجد سورة بهذا الاسم أو الرقم.',
    /** {{selected}} is how many surahs are selected. */
    confirm: 'اعتماد الاختيار · {{selected, number}}',
  },
  detail: {
    settings: 'إعدادات الهدف',
    closeSettings: 'إغلاق إعدادات الهدف',
    status: { reading: 'قيد القراءة', memorizing: 'قيد الحفظ', reviewing: 'قيد المراجعة' },
    hero: {
      cycle: 'رحلتك مع القرآن · الدورة {{cycle, number}}',
      finished: 'هنيئًا لك الإتمام',
      started: 'كل وردٍ يقرّبك',
      notStarted: 'بداية خير وبركة',
      progressLabel: 'تقدم القراءة',
      duration: 'مدة الهدف',
      dailyWird: 'وردك اليومي',
      weeks: '{{weeks, number}} أسابيع',
      /** {{unit}} is one of plans.units. */
      dailyAmount: '{{amount, number}} {{unit}}',
      completedOn: 'تاريخ الإتمام',
      completionDate: 'موعد الإتمام',
      remainingLabel: 'الأوراد المتبقية',
      remaining: '{{remaining, number}} وردًا',
    },
  },
  archive: {
    notice: {
      /** Under the number of days an archived goal is kept (14). */
      days: 'يومًا',
      title: 'أرشيف مؤقت',
      description: 'تُحذف الأهداف نهائيًا بعد أسبوعين من أرشفتها. استعد ما تريد الاحتفاظ به قبل موعد الحذف.',
    },
    card: {
      openLabel: 'تفاصيل الهدف المؤرشف {{name}}',
      memorizationDone: '{{completed, number}} جلسة حفظ مكتملة · محفوظك باقٍ',
      recurringDone: '{{completed, number}} قراءة مكتملة',
      revisionDone: 'أيام المراجعة المكتملة: {{completed, number}} · محفوظك باقٍ',
      autoDelete: 'الحذف التلقائي: {{date}}',
      restoreLabel: 'استعادة {{name}}',
      restore: 'استعادة',
      restoring: 'جارٍ الاستعادة…',
      deleteLabel: 'حذف {{name}}',
      delete: 'حذف',
    },
    dialog: {
      dismiss: 'إلغاء الحذف',
      title: 'حذف الهدف نهائيًا؟',
      body: 'سيُحذف «{{name}}» مع سجل الإنجاز الخاص بهذا الهدف. لا يمكن التراجع عن هذا الحذف.',
      bodyMemorization: 'سيُحذف «{{name}}» مع سجل الإنجاز الخاص بهذا الهدف. يبقى محفوظك من القرآن في سجل الحفظ. لا يمكن التراجع عن هذا الحذف.',
      confirm: 'حذف نهائيًا',
      deleting: 'جارٍ الحذف…',
      keep: 'الاحتفاظ بالهدف',
    },
    errors: {
      restore: 'تعذرت استعادة الهدف.',
      delete: 'تعذر حذف الهدف. حاول مرة أخرى.',
      restoredCannotDelete: 'تمت استعادة هذا الهدف. لا يمكن حذفه إلا من الأرشيف.',
    },
  },
  limit: {
    duplicateKhatma: 'لديك ختمة جارية بالفعل. أكمل هدفك الحالي أو أرشفه قبل بدء هدف قراءة جديد.',
    duplicateWird: 'لديك ورد يومي جارٍ بالفعل. أكمل هدفك الحالي أو أرشفه قبل بدء هدف قراءة جديد.',
    duplicateMemorization: 'لديك هدف حفظ جارٍ بالفعل. تابعه أو أرشفه قبل إنشاء هدف حفظ جديد.',
    duplicateRevision: 'لديك هدف مراجعة جارٍ لهذه الرواية. عدّله أو أرشفه قبل إنشاء هدف مراجعة جديد.',
  },
  start: {
    invalid: 'اختر موضع بداية صالحًا.',
    notFound: 'موضع البداية غير موجود في هذه الرواية.',
  },
  engine: {
    incompleteBoundaries: 'حدود المصحف غير مكتملة',
    editionMismatch: 'لم يتطابق الهدف مع نسخة المصحف. لم يتغير تقدمك.',
    surahBoundsMismatch: 'حدود السور لا تتطابق مع المصحف. لم يتغير تقدمك.',
    invalidWirdAmount: 'اختر مقدارًا صالحًا للورد',
    checkDraft: 'راجع اسم الهدف وتاريخه وروايته',
    khatmaWeeks: 'اختر مدة بين أسبوع و٥٢ أسبوعًا',
    invalidReminderTime: 'وقت التذكير غير صالح',
    periodEnded: 'انتهت المدة المحددة. اختر تمديد الهدف.',
    invalidDate: 'تاريخ غير صالح',
  },
  session: {
    unavailable: 'هذا الورد لم يعد متاحًا. افتح الهدف لاختيار وردك الحالي.',
    changed: 'تغيّر هذا الورد. عد إلى الهدف لعرض تقدمك الحالي.',
  },
  indexLoadFailed: 'تعذر تحميل حدود المصحف. اتصل بالإنترنت لتحميله أول مرة ثم أعد المحاولة.',
  reminders: {
    channelName: 'تذكيرات الأهداف',
    phoneOnly: 'التذكيرات متاحة في تطبيق الهاتف.',
    permissionDenied: 'لم يُسمح بالإشعارات. يمكنك تفعيلها من إعدادات الهاتف.',
    unavailable: 'تعذر تشغيل التذكيرات على هذا الجهاز.',
    savedWithoutPermission: 'تم حفظ الهدف دون تذكير. اسمح بالإشعارات من إعدادات الهاتف، ثم فعّل التذكير من إعدادات الهدف.',
    savedUnavailable: 'تم حفظ الهدف، لكن تعذر تشغيل التذكيرات. يمكنك المحاولة لاحقًا من إعدادات الهدف.',
    syncPermission: 'التذكيرات موقوفة في إعدادات الهاتف. أهدافك وتقدمك محفوظان.',
    syncFailed: 'تعذر تحديث التذكيرات. أهدافك وتقدمك محفوظان. أعد المحاولة من إعدادات الهدف.',
    body: {
      memorization: 'حان موعد الحفظ. خطوة جديدة نحو القرآن في صدرك.',
      revision: 'حان موعد المراجعة. ثبّت محفوظك بوردك اليوم.',
      reading: 'حان وقت وردك. افتح هدفك لمتابعة القراءة.',
    },
  },
  storage: {
    unsupportedVersion: 'نسخة بيانات الأهداف غير مدعومة',
    invalidPlans: 'تعذر التحقق من بيانات الأهداف المحفوظة',
    invalidSettings: 'إعدادات هدف غير صالحة',
    invalidGoalType: 'نوع هدف غير صالح',
    invalidProgress: 'تقدم هدف غير صالح',
    invalidSchedule: 'جدول هدف غير صالح',
    incompleteSchedule: 'جدول هدف غير مكتمل',
    invalidProgressLog: 'سجل تقدم غير صالح',
    mismatchedProgressLog: 'سجل تقدم غير متطابق',
    invalidCycles: 'سجل دورات غير صالح',
    invalidMemorization: 'سجل المحفوظ غير صالح.',
    memorizationChanged: 'تغيّر سجل محفوظك. أعد فتح الهدف لتحديثه.',
    memorizationEditionMismatch: 'نسخة سجل الحفظ لا تطابق الهدف.',
    memorizationChangedDuringCreation: 'تغيّر محفوظك. أعد فتح إنشاء هدف الحفظ لتحديثه.',
    memorizationOwnedByGoal: 'محفوظك يتابعه هدف الحفظ. عدّله من هدف الحفظ.',
    notLoaded: 'لم تُحمّل الأهداف بعد',
    loadFailed: 'تعذر تحميل الأهداف المحفوظة. بياناتك لم تُستبدل. أعد المحاولة.',
    archiveCleanupFailed: 'تعذر تنظيف الأرشيف. بياناتك محفوظة؛ أعد المحاولة.',
    rolloverFailed: 'تعذر بدء دورة جديدة. سنعيد المحاولة تلقائيًا عند توفر المصحف.',
  },
} as const;
