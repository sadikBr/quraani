/** The goals list, the goal chooser, the archive, shared goal pieces, the plan engine, reminders and storage. */
export default {
  back: 'رجوع',
  /** Spoken label of the loading spinner (goals list, creation and detail screens). */
  loading: 'جارٍ التحميل…',
  /**
   * An amount counted in its unit, shown on its own or inserted into other messages as {{amount}}:
   * "٥ صفحات", "حزبان", "١٢ أسبوعًا". Daily wird amounts can be decimals ("٠٫٢٥ حزب"), which use _other.
   */
  units: {
    weeks_zero: '{{count, number}} أسبوع',
    weeks_one: 'أسبوع واحد',
    weeks_two: 'أسبوعان',
    weeks_few: '{{count, number}} أسابيع',
    weeks_many: '{{count, number}} أسبوعًا',
    weeks_other: '{{count, number}} أسبوع',
    pages_zero: '{{count, number}} صفحة',
    pages_one: 'صفحة واحدة',
    pages_two: 'صفحتان',
    pages_few: '{{count, number}} صفحات',
    pages_many: '{{count, number}} صفحة',
    pages_other: '{{count, number}} صفحة',
    hizbs_zero: '{{count, number}} حزب',
    hizbs_one: 'حزب واحد',
    hizbs_two: 'حزبان',
    hizbs_few: '{{count, number}} أحزاب',
    hizbs_many: '{{count, number}} حزبًا',
    hizbs_other: '{{count, number}} حزب',
    juzs_zero: '{{count, number}} جزء',
    juzs_one: 'جزء واحد',
    juzs_two: 'جزءان',
    juzs_few: '{{count, number}} أجزاء',
    juzs_many: '{{count, number}} جزءًا',
    juzs_other: '{{count, number}} جزء',
  },
  /** A progress percentage: "٤٥٪". */
  percent: '{{percent, number}}٪',
  /** One-line description of a goal under its name. */
  summary: {
    /** count is the khatma's duration in weeks. */
    khatma_zero: 'ختمة في {{count, number}} أسبوع',
    khatma_one: 'ختمة في أسبوع واحد',
    khatma_two: 'ختمة في أسبوعين',
    khatma_few: 'ختمة في {{count, number}} أسابيع',
    khatma_many: 'ختمة في {{count, number}} أسبوعًا',
    khatma_other: 'ختمة في {{count, number}} أسبوع',
    /** {{amount}} is the daily amount from plans.units: "٥ صفحات". */
    wird: 'ورد يومي · {{amount}}',
    /** {{amount}} is a quarter-hizb amount such as "ربع حزب". */
    memorization: 'حفظ القرآن · {{amount}} أسبوعيًا',
    /** {{days}} is a list of weekdays or "كل يوم". */
    recurring: 'قراءة متكررة · {{days}}',
    /** {{amount}} is the amount revised on each revision day, e.g. "نصف حزب". */
    revision: 'مراجعة · {{amount}} في اليوم',
  },
  progress: {
    /** Under a goal card's progress bar; count is the total number of portions. */
    ofTotal_zero: '{{completed, number}} من {{count, number}} ورد',
    ofTotal_one: '{{completed, number}} من ورد واحد',
    ofTotal_two: '{{completed, number}} من وردين',
    ofTotal_few: '{{completed, number}} من {{count, number}} أوراد',
    ofTotal_many: '{{completed, number}} من {{count, number}} وردًا',
    ofTotal_other: '{{completed, number}} من {{count, number}} ورد',
    /** Goal detail hero and archived khatma or wird; count is the total number of portions. */
    completedOfTotal_zero: 'أتممت {{completed, number}} من {{count, number}} ورد',
    completedOfTotal_one: 'أتممت {{completed, number}} من ورد واحد',
    completedOfTotal_two: 'أتممت {{completed, number}} من وردين',
    completedOfTotal_few: 'أتممت {{completed, number}} من {{count, number}} أوراد',
    completedOfTotal_many: 'أتممت {{completed, number}} من {{count, number}} وردًا',
    completedOfTotal_other: 'أتممت {{completed, number}} من {{count, number}} ورد',
  },
  /** Page ranges of a portion; page numbers stay Latin inside a left-to-right isolate. */
  range: {
    page: 'الصفحة {{page}}',
    pages: 'الصفحات ⁦{{first}}–{{last}}⁩',
    /** First and last ayah of a portion; surah names already include سورة: "سورة البقرة 5 ← سورة البقرة 20". */
    ayahs: '{{fromSurah}} {{fromAyah}} ← {{toSurah}} {{toAyah}}',
  },
  portion: {
    from: 'من',
    to: 'إلى',
    ayah: 'الآية {{ayah, number}}',
  },
  list: {
    createLabel: 'إنشاء هدف جديد',
    title: 'أهدافك القرآنية',
    subtitle: 'قراءة وحفظ ومراجعة، في مواعيد تناسبك.',
    /** Spoken label of the tabs: today, my goals, archive. */
    tabs: { label: 'أقسام الأهداف', mine: 'أهدافي', archive: 'الأرشيف' },
    /** The card at the top of the goals list, summarizing today. */
    overview: {
      dueTitle: 'وردك بانتظارك',
      completedTitle: 'ورد اليوم مكتمل',
      idleTitle: 'وقتٌ للقرآن',
      dueDetail: 'المواظبة على وردك تقرّبك من هدفك.',
      /** Shown when nothing is due today but the user has goals (whether or not some were completed today). */
      ongoingDetail: 'تابع أهدافك في المواعيد التي اخترتها.',
      emptyDetail: 'اجعل للقرآن نصيبًا من يومك.',
      /** Next to the number of portions due today. */
      due: 'بانتظارك اليوم',
      /** Next to the number of portions completed today, which is shown before it; count is that number. */
      completed_zero: 'أتممتها اليوم',
      completed_one: 'أتممته اليوم',
      completed_two: 'أتممتهما اليوم',
      completed_few: 'أتممتها اليوم',
      completed_many: 'أتممتها اليوم',
      completed_other: 'أتممتها اليوم',
    },
    empty: {
      archiveTitle: 'أرشيفك فارغ',
      completedTitle: 'أتممت وردك، تقبّل الله منك',
      nothingDueTitle: 'ليس لديك ورد مقرر الآن',
      startTitle: 'لم تضع لنفسك هدفًا بعد',
      archiveDetail: 'تبقى الأهداف المؤرشفة هنا أسبوعين، ثم تُحذف نهائيًا.',
      waitingDetail: 'تجد أهدافك القادمة والمتوقفة في «أهدافي».',
      startDetail: 'اختر ختمة، أو خطة للحفظ والمراجعة، أو سورًا تقرؤها في أيام محددة.',
      /** Button that opens the "أهدافي" tab. */
      showMine: 'كل أهدافي',
      createFirst: 'أنشئ هدفك الأول',
    },
  },
  card: {
    /** {{detail}} is empty or starts with "، ", e.g. "، اكتمل 45 بالمئة". */
    openLabel: 'فتح هدف {{name}}، {{status}}{{detail}}',
    /** Spoken after the status; the percentage uses Latin digits. */
    percentDetail: '، اكتمل {{percent}} بالمئة',
    status: {
      /** A completed khatma or wird that repeats: the next round starts soon / tomorrow. */
      nextCycleSoon: 'تبدأ الختمة التالية قريبًا',
      nextCycleTomorrow: 'الختمة التالية غدًا',
      next: 'الورد القادم · {{date}}',
      overdue: 'ورد فائت',
      today: 'ورد اليوم',
    },
  },
  chooser: {
    subtitle: 'اختر ما تحب أن تواظب عليه.',
    recurring: {
      title: 'سور تعود إليها',
      description: 'اختر سورًا تقرؤها بانتظام في أيام تناسبك، أو ابدأ بأحد الاقتراحات.',
      customLabel: 'إنشاء قراءة متكررة',
      customTitle: 'قراءة متكررة',
      customDetail: 'سورة أو أكثر · أيام تختارها',
    },
    presets: {
      kahf: { surah: 'سورة الكهف', when: 'كل جمعة' },
      mulk: { surah: 'سورة الملك', when: 'كل ليلة' },
      /** Under each suggestion: it opens the creation screen with the suggestion filled in. */
      review: 'اضبط الموعد وابدأ',
    },
    /** Under a goal type that already has a goal in progress. */
    continueGoal: 'تابع {{name}}',
    /** Section title over the memorization and revision goals. */
    memory: 'الحفظ والمراجعة',
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
      detail: 'مراجعة دورية تمرّ على كل ما تحفظه',
    },
    reading: {
      title: 'قراءة المصحف',
      khatmaDetail: 'تختم في مدة تختارها',
      wirdDetail: 'مقدار يومي ثابت دون مدة محددة',
      /** {{goal}} is a goal type name: "إنشاء ختمة". */
      create: 'إنشاء {{goal}}',
      existing: 'لديك هدف قراءة قائم. يمكنك إضافة قراءات متكررة إلى جانبه.',
      /** Link to the current reading goal. */
      viewExisting: 'افتح «{{name}}»',
      hint: 'يمكنك متابعة هدف قراءة واحد، وإضافة ما تشاء من القراءات المتكررة.',
    },
  },
  creation: {
    goalType: {
      label: 'نوع الهدف',
      khatmaDetail: 'تختم في مدة تختارها',
      wirdDetail: 'مقدار يومي ثابت دون مدة محددة',
      /** {{goal}} is a goal type name. */
      unavailableLabel: '{{goal}}، لديك هدف قراءة قائم',
      current: 'هدفك الحالي',
      later: 'يُتاح بعد إتمام هدفك',
    },
    steps: {
      label: 'خطوات إنشاء الهدف',
      /** The second creation step: a last look at the choices before creating the goal (not «المراجعة», the revision goal). */
      review: 'التأكيد',
    },
    amount: {
      /** {{label}} is the name of the amount field. */
      increase: 'زيادة {{label}}',
      decrease: 'تقليل {{label}}',
      /**
       * Spoken label of a quick-choice amount: the number, then the caption under the field ({{unit}}),
       * which must read correctly after any number: "بأرباع الأحزاب في اليوم" (revision),
       * "بأرباع الأحزاب في الأسبوع" (memorization). Khatma and wird give counted labels instead (plans.units).
       */
      preset: '{{amount, number}} {{unit}}',
    },
    existing: {
      khatma: 'لديك ختمة قائمة',
      wird: 'لديك ورد يومي قائم',
      detail: 'تابع هدفك الحالي أو عدّل إعداداته من صفحته.',
      viewLabel: 'فتح هدفك الحالي: {{name}}',
    },
  },
  dateField: {
    /** Spoken label of a date or time field: "تاريخ البداية: ١٠ أكتوبر ٢٠٢٦". */
    label: '{{label}}: {{value}}',
    /** Closes the date or time picker. */
    done: 'تم',
  },
  surahSheet: {
    title: 'اختيار السور',
    subtitle: 'اختر سورة أو أكثر لتقرأها بترتيب المصحف.',
    close: 'إغلاق اختيار السور',
    searchLabel: 'البحث عن سورة',
    searchPlaceholder: 'اسم السورة أو رقمها',
    empty: 'لا توجد سورة بهذا الاسم أو الرقم.',
    /** {{selected}} is how many surahs are selected, shown as a count. */
    confirm: 'اعتماد الاختيار · {{selected, number}}',
  },
  detail: {
    settings: 'إعدادات الهدف',
    closeSettings: 'إغلاق إعدادات الهدف',
    status: { reading: 'قيد القراءة', memorizing: 'قيد الحفظ', reviewing: 'قيد المراجعة' },
    /** Progress card of a khatma or a daily wird. */
    hero: {
      /** The current round of a khatma or wird that repeats. */
      cycle: 'الختمة {{cycle, number}}',
      /** Shown once the last ayah of the mushaf is read. */
      finished: 'بلغت نهاية المصحف، تقبّل الله منك',
      started: 'وردًا بعد ورد',
      notStarted: 'على بركة الله',
      progressLabel: 'تقدّم القراءة',
      /** Label of the khatma's duration (its value is plans.units.weeks). */
      duration: 'مدة الختمة',
      /** Label of the daily wird amount (its value is plans.units). */
      dailyWird: 'وردك اليومي',
      completedOn: 'تاريخ الإتمام',
      completionDate: 'موعد الإتمام',
      remainingLabel: 'الأوراد المتبقية',
      /** Value under remainingLabel; count is the number of portions left. */
      remaining_zero: '{{count, number}} ورد',
      remaining_one: 'ورد واحد',
      remaining_two: 'وردان',
      remaining_few: '{{count, number}} أوراد',
      remaining_many: '{{count, number}} وردًا',
      remaining_other: '{{count, number}} ورد',
    },
  },
  archive: {
    notice: {
      /** Under the number of days an archived goal is kept (14), shown above it; count is that number. */
      days_zero: 'يوم',
      days_one: 'يوم',
      days_two: 'يومان',
      days_few: 'أيام',
      days_many: 'يومًا',
      days_other: 'يوم',
      title: 'أرشيف مؤقت',
      description: 'تُحذف الأهداف غير المكتملة نهائيًا بعد أسبوعين من أرشفتها، فاستعد منها ما تريد الاحتفاظ به. أما الأهداف المكتملة فتبقى هنا.',
    },
    card: {
      openLabel: 'فتح الهدف المؤرشف {{name}}',
      /** count is the number of completed memorization portions; archiving keeps the memorized record. */
      memorizationDone_zero: 'لم تُتمّ أي ورد · محفوظك باقٍ',
      memorizationDone_one: 'أتممت وردًا واحدًا · محفوظك باقٍ',
      memorizationDone_two: 'أتممت وردين · محفوظك باقٍ',
      memorizationDone_few: 'أتممت {{count, number}} أوراد · محفوظك باقٍ',
      memorizationDone_many: 'أتممت {{count, number}} وردًا · محفوظك باقٍ',
      memorizationDone_other: 'أتممت {{count, number}} ورد · محفوظك باقٍ',
      /** count is the number of completed recurring readings. */
      recurringDone_zero: 'لم تُتمّ أي قراءة',
      recurringDone_one: 'أتممت قراءة واحدة',
      recurringDone_two: 'أتممت قراءتين',
      recurringDone_few: 'أتممت {{count, number}} قراءات',
      recurringDone_many: 'أتممت {{count, number}} قراءة',
      recurringDone_other: 'أتممت {{count, number}} قراءة',
      /** count is the number of completed revision days (wording of revision.card.daysRevised). */
      revisionDone_zero: 'لم تبدأ المراجعة بعد · محفوظك باقٍ',
      revisionDone_one: 'أتممت يومًا واحدًا من المراجعة · محفوظك باقٍ',
      revisionDone_two: 'أتممت يومين من المراجعة · محفوظك باقٍ',
      revisionDone_few: 'أتممت {{count, number}} أيام من المراجعة · محفوظك باقٍ',
      revisionDone_many: 'أتممت {{count, number}} يومًا من المراجعة · محفوظك باقٍ',
      revisionDone_other: 'أتممت {{count, number}} يوم من المراجعة · محفوظك باقٍ',
      autoDelete: 'يُحذف تلقائيًا في {{date}}',
      /** A goal that holds a finished khatma or a finished memorization: never deleted on its own. */
      kept: 'هدف مكتمل، يبقى في الأرشيف',
      restoreLabel: 'استعادة {{name}}',
      restore: 'استعادة',
      restoring: 'جارٍ الاستعادة…',
      deleteLabel: 'حذف {{name}}',
      delete: 'حذف',
    },
    dialog: {
      dismiss: 'إلغاء الحذف',
      title: 'حذف الهدف نهائيًا؟',
      body: 'سيُحذف «{{name}}» مع سجلّ إنجازه. لا يمكن التراجع عن ذلك.',
      bodyMemorization: 'سيُحذف «{{name}}» مع سجلّ إنجازه، ويبقى محفوظك مسجّلًا كما هو. لا يمكن التراجع عن ذلك.',
      confirm: 'حذف نهائيًا',
      deleting: 'جارٍ الحذف…',
      keep: 'الاحتفاظ بالهدف',
    },
    errors: {
      restore: 'تعذّرت استعادة الهدف. أعد المحاولة.',
      delete: 'تعذّر حذف الهدف. أعد المحاولة.',
      restoredCannotDelete: 'أُعيد هذا الهدف من الأرشيف. أرشفه مجددًا لتتمكّن من حذفه نهائيًا.',
    },
  },
  limit: {
    duplicateKhatma: 'لديك ختمة قائمة. أتمّها أو أرشفها قبل بدء هدف قراءة جديد.',
    duplicateWird: 'لديك ورد يومي قائم. أتمّه أو أرشفه قبل بدء هدف قراءة جديد.',
    duplicateMemorization: 'لديك هدف حفظ قائم. أتمّه أو أرشفه قبل إنشاء هدف حفظ جديد.',
    duplicateRevision: 'لديك هدف مراجعة قائم لهذه الرواية. عدّله أو أرشفه قبل إنشاء هدف مراجعة جديد.',
  },
  start: {
    invalid: 'تحقّق من موضع بداية القراءة.',
    notFound: 'موضع البداية غير موجود في هذه الرواية.',
  },
  engine: {
    incompleteBoundaries: 'بيانات المصحف غير مكتملة.',
    editionMismatch: 'هذا الهدف غير متوافق مع نسخة المصحف الحالية. لم يتغيّر سجلّ إنجازك.',
    surahBoundsMismatch: 'بيانات بدايات السور ونهاياتها لا تتوافق مع المصحف الحالي. لم يتغيّر سجلّ إنجازك.',
    invalidWirdAmount: 'حدّد مقدار الورد بشكل صحيح.',
    checkDraft: 'تحقّق من اسم الهدف وتاريخه وروايته.',
    khatmaWeeks: 'اختر مدة بين أسبوع واحد و٥٢ أسبوعًا.',
    invalidReminderTime: 'حدّد وقت التذكير بشكل صحيح.',
    /** Redistributing a khatma whose end date has passed; extending the schedule still works. */
    periodEnded: 'انتهت مدة الختمة. مدّد الجدول بدءًا من اليوم.',
    invalidDate: 'التاريخ غير صالح.',
  },
  session: {
    unavailable: 'لم يعد هذا الورد موجودًا. افتح الهدف لتجد وردك الحالي.',
    changed: 'تغيّر هذا الورد. عد إلى الهدف للاطّلاع على آخر تحديث.',
  },
  indexLoadFailed: 'تعذّر تحميل بيانات المصحف. يلزم الاتصال بالإنترنت في المرة الأولى؛ تحقّق من اتصالك ثم أعد المحاولة.',
  reminders: {
    /** Name of the Android notification channel. */
    channelName: 'تذكيرات الأهداف',
    /** Same wording as goals.reminder.enableOnPhone. */
    phoneOnly: 'التذكير متوفر في تطبيق الهاتف.',
    permissionDenied: 'الإشعارات غير مفعّلة. يمكنك تفعيلها من إعدادات الهاتف.',
    unavailable: 'تعذّر تفعيل التذكيرات على هذا الجهاز.',
    savedWithoutPermission: 'حُفظ الهدف دون تذكير. فعّل الإشعارات من إعدادات الهاتف، ثم فعّل التذكير من إعدادات الهدف.',
    savedUnavailable: 'حُفظ الهدف، لكن تعذّر تفعيل التذكير. أعد المحاولة لاحقًا من إعدادات الهدف.',
    syncPermission: 'التذكيرات معطّلة في إعدادات الهاتف. أهدافك وسجلّ إنجازك لم يتأثرا.',
    syncFailed: 'تعذّر تحديث التذكيرات. أهدافك وسجلّ إنجازك لم يتأثرا. أعد المحاولة من إعدادات الهدف.',
    /** Notification text under the goal's name, read on the lock screen: short and inviting. */
    body: {
      memorization: 'حان وقت الحفظ، وردك اليوم بانتظارك.',
      revision: 'حان وقت المراجعة، ثبّت ما حفظته.',
      reading: 'حان وقت القراءة، وردك اليوم بانتظارك.',
    },
  },
  /** Errors about the saved goals data; most are internal and the user can't act on them. */
  storage: {
    unsupportedVersion: 'صيغة بيانات الأهداف غير مدعومة.',
    invalidPlans: 'تعذّر التحقّق من بيانات الأهداف المسجّلة.',
    invalidSettings: 'إعدادات أحد الأهداف غير صالحة.',
    invalidGoalType: 'نوع أحد الأهداف غير صالح.',
    invalidProgress: 'بيانات التقدّم في أحد الأهداف غير صالحة.',
    invalidSchedule: 'جدول أحد الأهداف غير صالح.',
    incompleteSchedule: 'جدول أحد الأهداف غير مكتمل.',
    invalidProgressLog: 'سجلّ التقدّم في أحد الأهداف غير صالح.',
    mismatchedProgressLog: 'سجلّ التقدّم في أحد الأهداف غير متّسق.',
    invalidCycles: 'سجلّ الختمات السابقة غير صالح.',
    invalidMemorization: 'سجلّ محفوظك غير صالح.',
    memorizationChanged: 'تغيّر سجلّ محفوظك. أعد فتح الهدف لتحديثه.',
    memorizationEditionMismatch: 'سجلّ محفوظك غير متوافق مع نسخة المصحف المستخدمة في هذا الهدف.',
    memorizationChangedDuringCreation: 'تغيّر سجلّ محفوظك أثناء الإنشاء. ابدأ إنشاء هدف الحفظ من جديد.',
    memorizationOwnedByGoal: 'يرتبط سجلّ محفوظك بهدف الحفظ. يمكنك تعديله من صفحة ذلك الهدف.',
    notLoaded: 'لم تُحمَّل الأهداف بعد.',
    loadFailed: 'تعذّر تحميل أهدافك. بياناتك لم تتغيّر. أعد المحاولة.',
    archiveCleanupFailed: 'تعذّر حذف الأهداف التي انتهت مدة بقائها في الأرشيف. لم تتأثر بياناتك. أعد المحاولة.',
    rolloverFailed: 'تعذّر بدء الختمة التالية. ستُعاد المحاولة تلقائيًا عند توفر بيانات المصحف.',
  },
} as const;
