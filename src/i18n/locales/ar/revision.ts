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
    startDate: 'اختر تاريخ بدء صالحًا.',
    reminderTime: 'اختر وقتًا صالحًا للتذكير.',
    memorizedRequired: 'حدد محفوظك أولًا لتبدأ المراجعة.',
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
    emptyTitle: 'حدد محفوظك لتبدأ',
    /** Title while nothing of the current pass is revised yet. */
    newPass: 'بداية دورة جديدة',
    steady: 'يثبت محفوظك يومًا بعد يوم',
    emptyDetail: 'تمرّ المراجعة على كل ما تحفظه',
    /** {{days}} is a number of revision days in the genitive (revision.days): "دورة كاملة في يومين". */
    passLength: 'دورة كاملة في {{days}}',
    progressLabel: 'ما روجع من الدورة الحالية',
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
    label_zero: 'ما روجع وما ينتظر دوره في {{count, number}} جزء',
    label_one: 'ما روجع وما ينتظر دوره في جزء واحد',
    label_two: 'ما روجع وما ينتظر دوره في جزأين',
    label_few: 'ما روجع وما ينتظر دوره في {{count, number}} أجزاء',
    label_many: 'ما روجع وما ينتظر دوره في {{count, number}} جزءًا',
    label_other: 'ما روجع وما ينتظر دوره في {{count, number}} جزء',
    revised: 'روجع في هذه الدورة',
    ahead: 'محفوظ ينتظر دوره',
  },
  /** The goal's card in the list of goals. */
  card: {
    chooseToStart: 'حدد محفوظك لتبدأ المراجعة',
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
      review: 'هكذا تمضي مراجعتك',
    },
    intro: {
      setup: 'تراجع مقدارًا تختاره في أيام تحددها، حتى تمرّ على محفوظك كله، ثم تبدأ دورة جديدة.',
      review: 'اطّلع على أيامك الأولى، واجعل لها وقتًا.',
    },
    memory: {
      title: 'ما تراجعه',
      description: 'تمرّ المراجعة على محفوظك بترتيب المصحف، وكل ما تحفظه لاحقًا ينضم إليها تلقائيًا.',
      count_zero: 'لم تضف أي آية إلى محفوظك بعد',
      count_one: 'آية واحدة في محفوظك',
      count_two: 'آيتان في محفوظك',
      count_few: '{{count, number}} آيات في محفوظك',
      count_many: '{{count, number}} آية في محفوظك',
      count_other: '{{count, number}} آية في محفوظك',
      none: 'لم تحدد محفوظك بعد',
      /** {{name}} is the running memorization goal, which keeps the memorized record. */
      followedBy: 'يُسجَّل محفوظك في هدف «{{name}}»، وكل ما تحفظه فيه ينضم إلى المراجعة.',
      /** How the memorized part can be chosen. */
      kinds: 'سور أو أجزاء أو أحزاب أو أرباع أو آيات محددة',
      edit: 'تعديل محفوظك',
      chooseLabel: 'تحديد محفوظك من القرآن',
      existing: 'لديك هدف مراجعة جارٍ لرواية {{riwayah}}. يمكنك تعديل مقداره وأيامه من إعداداته.',
      continueExisting: 'متابعة {{name}}',
    },
    amount: {
      title: 'كم تراجع في اليوم؟',
      description: 'يُحسب المقدار بأرباع الأحزاب، وتنتهي مراجعة كل يوم عند تمام أقرب آية. وإذا كان محفوظك أقل من المقدار راجعته كله.',
    },
    days: {
      title: 'أيام المراجعة',
      description: 'إذا فاتك يوم، فالمراجعة نفسها تنتظرك في اليوم التالي من أيامك، ولا تتراكم عليك.',
    },
    schedule: {
      /** {{amount}} is the daily amount, e.g. "نصف حزب"; the count is the number of revision days in a week (1–7). */
      description_zero: '{{amount}} في اليوم، {{count, number}} يوم في الأسبوع. تنتهي مراجعة كل يوم بتمام آية، وإذا بلغت آخر محفوظك بدأت دورة جديدة من أوله.',
      description_one: '{{amount}} في اليوم، يومًا واحدًا في الأسبوع. تنتهي مراجعة كل يوم بتمام آية، وإذا بلغت آخر محفوظك بدأت دورة جديدة من أوله.',
      description_two: '{{amount}} في اليوم، يومين في الأسبوع. تنتهي مراجعة كل يوم بتمام آية، وإذا بلغت آخر محفوظك بدأت دورة جديدة من أوله.',
      description_few: '{{amount}} في اليوم، {{count, number}} أيام في الأسبوع. تنتهي مراجعة كل يوم بتمام آية، وإذا بلغت آخر محفوظك بدأت دورة جديدة من أوله.',
      description_many: '{{amount}} في اليوم، {{count, number}} يومًا في الأسبوع. تنتهي مراجعة كل يوم بتمام آية، وإذا بلغت آخر محفوظك بدأت دورة جديدة من أوله.',
      description_other: '{{amount}} في اليوم، {{count, number}} يوم في الأسبوع. تنتهي مراجعة كل يوم بتمام آية، وإذا بلغت آخر محفوظك بدأت دورة جديدة من أوله.',
      /** Segments of a day not listed above. */
      moreSpans_zero: 'و{{count, number}} مقطع آخر',
      moreSpans_one: 'ومقطع آخر',
      moreSpans_two: 'ومقطعان آخران',
      moreSpans_few: 'و{{count, number}} مقاطع أخرى',
      moreSpans_many: 'و{{count, number}} مقطعًا آخر',
      moreSpans_other: 'و{{count, number}} مقطع آخر',
      /** Revision days until the first pass is complete. */
      sessions_zero: 'تتم الدورة في {{count, number}} يوم من المراجعة',
      sessions_one: 'تتم الدورة في يوم واحد من المراجعة',
      sessions_two: 'تتم الدورة في يومين من المراجعة',
      sessions_few: 'تتم الدورة في {{count, number}} أيام من المراجعة',
      sessions_many: 'تتم الدورة في {{count, number}} يومًا من المراجعة',
      sessions_other: 'تتم الدورة في {{count, number}} يوم من المراجعة',
      expectedEnd: 'الموعد المتوقع للإتمام: {{date}}',
      /** {{name}} is the running memorization goal. */
      ownerEmpty: 'لا محفوظ في سجلّك بعد. كل ما تحفظه في «{{name}}» ينضم إلى المراجعة تلقائيًا، وتبدأ مواعيدها مع أول ما تحفظه.',
      chooseFirst: 'حدد محفوظك لتبدأ المراجعة.',
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
      spans_zero: 'تضم هذه المراجعة {{count, number}} مقطع من محفوظك، ويُفتح كل مقطع وحده.',
      spans_one: 'تضم هذه المراجعة مقطعًا واحدًا من محفوظك.',
      spans_two: 'تضم هذه المراجعة مقطعين من محفوظك، ويُفتح كل مقطع وحده.',
      spans_few: 'تضم هذه المراجعة {{count, number}} مقاطع من محفوظك، ويُفتح كل مقطع وحده.',
      spans_many: 'تضم هذه المراجعة {{count, number}} مقطعًا من محفوظك، ويُفتح كل مقطع وحده.',
      spans_other: 'تضم هذه المراجعة {{count, number}} مقطع من محفوظك، ويُفتح كل مقطع وحده.',
      resumeNote: 'تكمل من حيث توقفت.',
      accepted: 'تقبّل الله منك.',
      opensOn: 'تُفتح هذه المراجعة يوم {{date}}.',
    },
    stats: {
      ayahs: 'الآيات',
      words: 'الكلمات',
      page: 'الصفحة',
      pages: 'الصفحات',
    },
    actions: {
      start: 'ابدأ المراجعة',
      continue: 'تابع المراجعة',
      finishToday: 'أتممت مراجعة اليوم',
      undo: 'التراجع عن آخر ما سجّلته',
      resume: 'استئناف المراجعة',
      pause: 'إيقاف المراجعة مؤقتًا',
      /** {{name}} is the running memorization goal. */
      openGoal: 'فتح {{name}}',
      editMemorized: 'تعديل محفوظك',
    },
    empty: {
      title: 'لا محفوظ تراجعه بعد',
      /** {{name}} is the running memorization goal. */
      owner: 'كل ما تحفظه في «{{name}}» ينضم إلى المراجعة تلقائيًا.',
      choose: 'حدد محفوظك لتبدأ دورتك الأولى.',
    },
    paused: {
      title: 'المراجعة متوقفة مؤقتًا',
      detail: 'يبقى موضعك في الدورة كما هو، وعند الاستئناف تنتظرك المراجعة نفسها في أول يوم من أيامك.',
    },
    archived: {
      keepsRecord: 'حذف الهدف لا يمس سجلّ محفوظك.',
      deletedOn: 'يُحذف الهدف في {{date}}.',
      otherGoal: 'لديك هدف مراجعة آخر لهذه الرواية. أرشفه أولًا لاستعادة هذا الهدف.',
    },
    scheduleFooter: 'الموعد المتوقع لإتمام الدورة: {{date}} · يتغيّر بتغيّر محفوظك.',
    memorized: {
      title: 'محفوظك',
      /** The number of memorized ayahs, then who keeps the record; {{name}} is the running memorization goal. */
      owner_zero: '{{count, number}} آية. يُسجَّل محفوظك في هدف «{{name}}»، وكل ما تحفظه فيه ينضم إلى المراجعة.',
      owner_one: 'آية واحدة. يُسجَّل محفوظك في هدف «{{name}}»، وكل ما تحفظه فيه ينضم إلى المراجعة.',
      owner_two: 'آيتان. يُسجَّل محفوظك في هدف «{{name}}»، وكل ما تحفظه فيه ينضم إلى المراجعة.',
      owner_few: '{{count, number}} آيات. يُسجَّل محفوظك في هدف «{{name}}»، وكل ما تحفظه فيه ينضم إلى المراجعة.',
      owner_many: '{{count, number}} آية. يُسجَّل محفوظك في هدف «{{name}}»، وكل ما تحفظه فيه ينضم إلى المراجعة.',
      owner_other: '{{count, number}} آية. يُسجَّل محفوظك في هدف «{{name}}»، وكل ما تحفظه فيه ينضم إلى المراجعة.',
      /** The number of memorized ayahs, when this goal keeps the record itself. */
      own_zero: '{{count, number}} آية. أضف ما حفظته أو صحح اختيارًا سابقًا دون أن تفقد موضعك في الدورة.',
      own_one: 'آية واحدة. أضف ما حفظته أو صحح اختيارًا سابقًا دون أن تفقد موضعك في الدورة.',
      own_two: 'آيتان. أضف ما حفظته أو صحح اختيارًا سابقًا دون أن تفقد موضعك في الدورة.',
      own_few: '{{count, number}} آيات. أضف ما حفظته أو صحح اختيارًا سابقًا دون أن تفقد موضعك في الدورة.',
      own_many: '{{count, number}} آية. أضف ما حفظته أو صحح اختيارًا سابقًا دون أن تفقد موضعك في الدورة.',
      own_other: '{{count, number}} آية. أضف ما حفظته أو صحح اختيارًا سابقًا دون أن تفقد موضعك في الدورة.',
    },
    logTitle: 'آخر مراجعاتك',
    settings: {
      keepsPlace: 'تغيير المقدار أو الأيام لا يغيّر موضعك في الدورة، بل ما بعده فقط.',
      reminderDetail: 'في أيام المراجعة فقط.',
      archiveNote: 'أرشفة هدف المراجعة أو حذفه لا يمس سجلّ محفوظك.',
    },
    errors: {
      memoryChanged: 'تغيّر محفوظك. أغلق النافذة وافتحها مجددًا.',
      portionChanged: 'تغيّرت مراجعة اليوم. تحقّق من المقطع المعروض ثم أعد المحاولة.',
      nameAndTime: 'تحقّق من اسم الهدف ووقت التذكير.',
      daysAndAmount: 'اختر أيام المراجعة، ومقدارًا من ربع حزب إلى القرآن كاملًا.',
    },
  },
} as const;
