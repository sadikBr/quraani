/** The revision goal: going over everything memorized, a daily amount at a time, in passes. */
export default {
  /** The activity: revising what one has memorized. */
  title: 'مراجعة المحفوظ',
  /** Default name of a new revision goal. */
  defaultName: 'مراجعة المحفوظ',
  /** A number of ayahs, shown on its own (hero, goal card, a day of the schedule). */
  ayahCount_zero: '{{count, number}} آية',
  ayahCount_one: 'آية واحدة',
  ayahCount_two: 'آيتان',
  ayahCount_few: '{{count, number}} آيات',
  ayahCount_many: '{{count, number}} آية',
  ayahCount_other: '{{count, number}} آية',
  percent: '{{percent, number}}٪',
  /**
   * A number of revision days, inserted as {{days}} after «في» (hero.passLength, creation.passEvery),
   * so the forms are genitive: «في يوم واحد», «في يومين», «في ١٢ يومًا».
   */
  days_zero: '{{count, number}} يوم',
  days_one: 'يوم واحد',
  days_two: 'يومين',
  days_few: '{{count, number}} أيام',
  days_many: '{{count, number}} يومًا',
  days_other: '{{count, number}} يوم',
  /** A pass is one full round over everything memorized. */
  passNumber: 'الدورة {{pass, number}}',
  /** The amount revised on each revision day. {{amount}} is an amount of Quran, e.g. "نصف حزب". */
  perSession: '{{amount}} في اليوم',
  dailyAmount: '{{amount}} في كل يوم مراجعة',
  remindMe: 'ذكّرني بالمراجعة',
  chooseMemorized: 'تحديد محفوظك',
  amount: {
    /** Accessibility label of the amount field, also inside "زيادة {{label}}". */
    label: 'مقدار المراجعة اليومي بأرباع الأحزاب',
    /** Caption under the chosen number (and after each preset number); worded so it fits any number. */
    unit: 'بأرباع الأحزاب في اليوم',
  },
  /** Quick choices for the revision days. */
  weekdays: {
    exceptFriday: 'عدا الجمعة',
    mondayThursday: 'الاثنين والخميس',
  },
  errors: {
    dailyAmount: 'اختر مقدارًا يوميًا من ربع حزب إلى القرآن كاملًا.',
    weekdays: 'اختر يومًا واحدًا على الأقل للمراجعة.',
    nameAndRiwayah: 'تحقّق من اسم الهدف وروايته.',
    startDate: 'حدّد تاريخ البدء بشكل صحيح.',
    reminderTime: 'حدّد وقت التذكير بشكل صحيح.',
    memorizedRequired: 'حدّد محفوظك أولًا لتبدأ المراجعة.',
    /** {{what}} is an internal field name, e.g. "log". */
    invalidData: 'بيانات المراجعة غير صالحة ({{what}}).',
  },
  hero: {
    /** {{ordinal}} is a feminine ordinal agreeing with الدورة (hero.ordinal.*), or a number past the tenth. */
    pass: 'الدورة {{ordinal}} من المراجعة',
    ordinal: {
      first: 'الأولى',
      second: 'الثانية',
      third: 'الثالثة',
      fourth: 'الرابعة',
      fifth: 'الخامسة',
      sixth: 'السادسة',
      seventh: 'السابعة',
      eighth: 'الثامنة',
      ninth: 'التاسعة',
      tenth: 'العاشرة',
    },
    emptyTitle: 'حدّد محفوظك لتبدأ',
    /** Title while nothing of the current pass is revised yet. */
    newPass: 'بداية دورة جديدة',
    steady: 'بالمراجعة يثبت الحفظ',
    emptyDetail: 'تشمل المراجعة جميع ما تحفظه',
    /** {{days}} is a number of revision days in the genitive (revision.days): "دورة كاملة في يومين". */
    passLength: 'دورة كاملة في {{days}}',
    progressLabel: 'ما راجعته في الدورة الحالية',
  },
  /** The band of ajza' under the hero. */
  band: {
    juzCount_zero: 'محفوظك في {{count, number}} جزء',
    juzCount_one: 'محفوظك في جزء واحد',
    juzCount_two: 'محفوظك في جزأين',
    juzCount_few: 'محفوظك في {{count, number}} أجزاء',
    juzCount_many: 'محفوظك في {{count, number}} جزءًا',
    juzCount_other: 'محفوظك في {{count, number}} جزء',
    current: 'تراجع الآن في الجزء {{juz, number}}',
    /** Accessibility label of the band. */
    label_zero: 'ما راجعته وما تبقّى للمراجعة في {{count, number}} جزء',
    label_one: 'ما راجعته وما تبقّى للمراجعة في جزء واحد',
    label_two: 'ما راجعته وما تبقّى للمراجعة في جزأين',
    label_few: 'ما راجعته وما تبقّى للمراجعة في {{count, number}} أجزاء',
    label_many: 'ما راجعته وما تبقّى للمراجعة في {{count, number}} جزءًا',
    label_other: 'ما راجعته وما تبقّى للمراجعة في {{count, number}} جزء',
    revised: 'راجعته في هذه الدورة',
    ahead: 'محفوظ لم تراجعه بعد',
  },
  /** The goal's card in the list of goals. */
  card: {
    chooseToStart: 'حدّد محفوظك لتبدأ المراجعة',
    due: 'مراجعة اليوم بانتظارك',
    doneToday: 'أتممت مراجعة اليوم',
    next: 'المراجعة القادمة · {{date}}',
    /** Days of revision completed since the goal began, after "الدورة ٢ · ". */
    daysRevised_zero: '{{count, number}} يوم من المراجعة',
    daysRevised_one: 'يوم واحد من المراجعة',
    daysRevised_two: 'يومان من المراجعة',
    daysRevised_few: '{{count, number}} أيام من المراجعة',
    daysRevised_many: '{{count, number}} يومًا من المراجعة',
    daysRevised_other: '{{count, number}} يوم من المراجعة',
    notStarted: 'لم تبدأ بعد',
  },
  creation: {
    backToSetup: 'العودة إلى إعداد المراجعة',
    heading: {
      setup: 'ثبّت ما حفظت',
      review: 'جدول مراجعتك',
    },
    intro: {
      setup: 'حدّد مقدار المراجعة وأيامها. بعد مراجعة محفوظك كاملًا، تبدأ دورة جديدة.',
      review: 'تأكّد من مقدار المراجعة ومواعيدها قبل البدء.',
    },
    memory: {
      title: 'ما تراجعه',
      description: 'تراجع محفوظك بترتيب المصحف، ويُضاف إلى المراجعة تلقائيًا كل ما تحفظه لاحقًا.',
      count_zero: 'لم تضف أي آية إلى محفوظك بعد',
      count_one: 'آية واحدة في محفوظك',
      count_two: 'آيتان في محفوظك',
      count_few: '{{count, number}} آيات في محفوظك',
      count_many: '{{count, number}} آية في محفوظك',
      count_other: '{{count, number}} آية في محفوظك',
      none: 'لم تحدّد محفوظك بعد',
      /** {{name}} is the running memorization goal, which keeps the memorized record. */
      followedBy: 'يُسجَّل محفوظك في هدف «{{name}}»، ويُضاف كل ما تحفظه فيه إلى المراجعة تلقائيًا.',
      /** How the memorized part can be chosen. */
      kinds: 'سور أو أجزاء أو أحزاب أو أرباع أو آيات محددة',
      edit: 'تعديل محفوظك',
      chooseLabel: 'تحديد محفوظك من القرآن',
      existing: 'لديك هدف مراجعة قائم لرواية {{riwayah}}. يمكنك تعديل مقداره وأيامه من إعداداته.',
      continueExisting: 'متابعة {{name}}',
    },
    amount: {
      title: 'كم تراجع في اليوم؟',
      description: 'حدّد مقدار المراجعة بعدد أرباع الحزب. ينتهي ورد كل يوم عند نهاية آية، وإذا كان محفوظك أقل من المقدار المحدد فتراجعه كاملًا.',
    },
    days: {
      title: 'أيام المراجعة',
      description: 'إذا فاتك يوم، ينتقل ورده إلى يوم المراجعة التالي دون مضاعفة المقدار.',
    },
    schedule: {
      /** {{amount}} is the daily amount, e.g. "نصف حزب"; the count is the number of revision days in a week (1–7). */
      description_zero: 'وردك {{amount}} في كل يوم مراجعة، وتراجع {{count, number}} يوم في الأسبوع. ينتهي كل ورد عند نهاية آية. بعد مراجعة محفوظك كاملًا، تبدأ دورة جديدة من أوله.',
      description_one: 'وردك {{amount}} في يوم واحد كل أسبوع. ينتهي كل ورد عند نهاية آية. بعد مراجعة محفوظك كاملًا، تبدأ دورة جديدة من أوله.',
      description_two: 'وردك {{amount}} في كل يوم مراجعة، وتراجع يومين في الأسبوع. ينتهي كل ورد عند نهاية آية. بعد مراجعة محفوظك كاملًا، تبدأ دورة جديدة من أوله.',
      description_few: 'وردك {{amount}} في كل يوم مراجعة، وتراجع {{count, number}} أيام في الأسبوع. ينتهي كل ورد عند نهاية آية. بعد مراجعة محفوظك كاملًا، تبدأ دورة جديدة من أوله.',
      description_many: 'وردك {{amount}} في كل يوم مراجعة، وتراجع {{count, number}} يومًا في الأسبوع. ينتهي كل ورد عند نهاية آية. بعد مراجعة محفوظك كاملًا، تبدأ دورة جديدة من أوله.',
      description_other: 'وردك {{amount}} في كل يوم مراجعة، وتراجع {{count, number}} يوم في الأسبوع. ينتهي كل ورد عند نهاية آية. بعد مراجعة محفوظك كاملًا، تبدأ دورة جديدة من أوله.',
      /** Segments of a day not listed above. */
      moreSpans_zero: 'و{{count, number}} مقطع آخر',
      moreSpans_one: 'ومقطع آخر',
      moreSpans_two: 'ومقطعان آخران',
      moreSpans_few: 'و{{count, number}} مقاطع أخرى',
      moreSpans_many: 'و{{count, number}} مقطعًا آخر',
      moreSpans_other: 'و{{count, number}} مقطع آخر',
      /** Revision days until the first pass is complete. */
      sessions_zero: 'تكتمل الدورة في {{count, number}} يوم من المراجعة',
      sessions_one: 'تكتمل الدورة في يوم واحد من المراجعة',
      sessions_two: 'تكتمل الدورة في يومين من المراجعة',
      sessions_few: 'تكتمل الدورة في {{count, number}} أيام من المراجعة',
      sessions_many: 'تكتمل الدورة في {{count, number}} يومًا من المراجعة',
      sessions_other: 'تكتمل الدورة في {{count, number}} يوم من المراجعة',
      expectedEnd: 'الموعد المتوقع للإتمام: {{date}}',
      /** {{name}} is the running memorization goal. */
      ownerEmpty: 'لم تُضف محفوظًا إلى سجلّك بعد. تبدأ مواعيد المراجعة بعد تسجيل أول مقطع تحفظه في «{{name}}»، ويُضاف إليها ما تحفظه لاحقًا تلقائيًا.',
      chooseFirst: 'حدّد محفوظك لتبدأ المراجعة.',
    },
    reminderDetail: 'في أيام المراجعة فقط.',
    /** {{days}} is a number of revision days in the genitive (revision.days): "دورة كاملة في يومين من المراجعة". */
    passEvery: 'دورة كاملة في {{days}} من المراجعة',
    submit: 'إنشاء هدف المراجعة',
    /** Goes from the setup step to the schedule step (same label in every creation flow). */
    showDays: 'متابعة',
  },
  detail: {
    portion: {
      due: 'مراجعة اليوم',
      doneNext: 'أتممت مراجعة اليوم · المراجعة القادمة',
      next: 'مراجعتك القادمة',
      /** The portion runs into another surah. */
      fromAyah: 'من الآية {{ayah, number}}',
      ayah: 'الآية {{ayah, number}}',
      ayahs: 'الآيات {{from, number}} – {{to, number}}',
      /** {{surah}} already includes the word سورة: "حتى الآية ٥ من سورة البقرة". */
      until: 'حتى الآية {{ayah, number}} من {{surah}}',
      /** The portion is made of several separate segments (always two or more here). */
      spans_zero: 'تضم هذه المراجعة {{count, number}} مقطع من محفوظك، ويُفتح كل مقطع على حدة.',
      spans_one: 'تضم هذه المراجعة مقطعًا واحدًا من محفوظك.',
      spans_two: 'تضم هذه المراجعة مقطعين من محفوظك، ويُفتح كل مقطع على حدة.',
      spans_few: 'تضم هذه المراجعة {{count, number}} مقاطع من محفوظك، ويُفتح كل مقطع على حدة.',
      spans_many: 'تضم هذه المراجعة {{count, number}} مقطعًا من محفوظك، ويُفتح كل مقطع على حدة.',
      spans_other: 'تضم هذه المراجعة {{count, number}} مقطع من محفوظك، ويُفتح كل مقطع على حدة.',
      resumeNote: 'تكمل من حيث توقفت.',
      accepted: 'تقبّل الله منك.',
      opensOn: 'تُفتح هذه المراجعة يوم {{date}}.',
    },
    stats: {
      ayahs: 'الآيات',
      words: 'الكلمات',
      page: 'الصفحة',
      pages: 'الصفحات',
      /** First and last page, kept left to right inside an isolate. */
      pageRange: '⁦{{from, number}}–{{to, number}}⁩',
    },
    actions: {
      start: 'ابدأ المراجعة',
      continue: 'تابع المراجعة',
      finishToday: 'أتممت مراجعة اليوم',
      undo: 'التراجع عن آخر ما سجّلته اليوم',
      resume: 'استئناف المراجعة',
      pause: 'إيقاف المراجعة مؤقتًا',
      /** {{name}} is the running memorization goal. */
      openGoal: 'فتح {{name}}',
      editMemorized: 'تعديل محفوظك',
    },
    empty: {
      title: 'لم تحدّد محفوظك بعد',
      /** {{name}} is the running memorization goal. */
      owner: 'يُضاف إلى المراجعة تلقائيًا كل ما تحفظه في «{{name}}».',
      choose: 'حدّد محفوظك لتبدأ دورتك الأولى.',
    },
    paused: {
      title: 'المراجعة متوقفة مؤقتًا',
      detail: 'يبقى موضعك في الدورة كما هو. عند الاستئناف، تتابع من حيث توقفت في أول يوم مراجعة.',
    },
    archived: {
      keepsRecord: 'يبقى سجلّ محفوظك كما هو عند حذف الهدف.',
      deletedOn: 'يُحذف الهدف في {{date}}.',
      otherGoal: 'لديك هدف مراجعة آخر لهذه الرواية. أرشفه أولًا لاستعادة هذا الهدف.',
    },
    scheduleFooter: 'الموعد المتوقع لإتمام الدورة: {{date}} · يتغيّر بتغيّر محفوظك.',
    memorized: {
      title: 'محفوظك',
      /** The number of memorized ayahs, then who keeps the record; {{name}} is the running memorization goal. */
      owner_zero: '{{count, number}} آية. يُسجَّل محفوظك في هدف «{{name}}»، ويُضاف كل ما تحفظه فيه إلى المراجعة تلقائيًا.',
      owner_one: 'آية واحدة. يُسجَّل محفوظك في هدف «{{name}}»، ويُضاف كل ما تحفظه فيه إلى المراجعة تلقائيًا.',
      owner_two: 'آيتان. يُسجَّل محفوظك في هدف «{{name}}»، ويُضاف كل ما تحفظه فيه إلى المراجعة تلقائيًا.',
      owner_few: '{{count, number}} آيات. يُسجَّل محفوظك في هدف «{{name}}»، ويُضاف كل ما تحفظه فيه إلى المراجعة تلقائيًا.',
      owner_many: '{{count, number}} آية. يُسجَّل محفوظك في هدف «{{name}}»، ويُضاف كل ما تحفظه فيه إلى المراجعة تلقائيًا.',
      owner_other: '{{count, number}} آية. يُسجَّل محفوظك في هدف «{{name}}»، ويُضاف كل ما تحفظه فيه إلى المراجعة تلقائيًا.',
      /** The number of memorized ayahs, when this goal keeps the record itself. */
      own_zero: '{{count, number}} آية. أضف ما حفظته أو صحّح اختيارًا سابقًا دون أن تفقد موضعك في الدورة.',
      own_one: 'آية واحدة. أضف ما حفظته أو صحّح اختيارًا سابقًا دون أن تفقد موضعك في الدورة.',
      own_two: 'آيتان. أضف ما حفظته أو صحّح اختيارًا سابقًا دون أن تفقد موضعك في الدورة.',
      own_few: '{{count, number}} آيات. أضف ما حفظته أو صحّح اختيارًا سابقًا دون أن تفقد موضعك في الدورة.',
      own_many: '{{count, number}} آية. أضف ما حفظته أو صحّح اختيارًا سابقًا دون أن تفقد موضعك في الدورة.',
      own_other: '{{count, number}} آية. أضف ما حفظته أو صحّح اختيارًا سابقًا دون أن تفقد موضعك في الدورة.',
    },
    logTitle: 'آخر مراجعاتك',
    settings: {
      keepsPlace: 'يُطبَّق تغيير المقدار أو الأيام على المواعيد القادمة، مع الاحتفاظ بموضعك في الدورة.',
      reminderDetail: 'في أيام المراجعة فقط.',
      archiveNote: 'يبقى سجلّ محفوظك كما هو عند أرشفة هدف المراجعة أو حذفه.',
    },
    errors: {
      memoryChanged: 'تغيّر محفوظك. أغلق النافذة وافتحها مجددًا.',
      portionChanged: 'تغيّرت مراجعة اليوم. تحقّق من المقطع المعروض ثم أعد المحاولة.',
      nameAndTime: 'تحقّق من اسم الهدف ووقت التذكير.',
      daysAndAmount: 'اختر أيام المراجعة، ومقدارًا من ربع حزب إلى القرآن كاملًا.',
    },
  },
} as const;
