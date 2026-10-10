/** The revision goal: going over everything memorized, a daily amount at a time, in passes. */
export default {
  /** The activity: revising what one has memorized. */
  title: 'مراجعة المحفوظ',
  /** Default name of a new revision goal. */
  defaultName: 'مراجعة المحفوظ',
  ayahCount: '{{count, number}} آية',
  percent: '{{percent, number}}٪',
  /** A number of revision days, inserted into other messages as {{days}}. */
  days_zero: '{{count, number}} يومًا',
  days_one: 'يوم واحد',
  days_two: 'يومان',
  days_few: '{{count, number}} أيام',
  days_many: '{{count, number}} يومًا',
  days_other: '{{count, number}} يومًا',
  /** A pass is one full round over everything memorized. */
  passNumber: 'الدورة {{pass, number}}',
  /** {{amount}} is an amount of Quran, e.g. "نصف حزب". */
  perSession: '{{amount}} في الجلسة',
  dailyAmount: '{{amount}} في كل يوم مراجعة',
  remindMe: 'ذكّرني بالمراجعة',
  chooseMemorized: 'تحديد ما أحفظه',
  amount: {
    label: 'مقدار المراجعة اليومي بأرباع الأحزاب',
    unit: 'ربع حزب في اليوم',
  },
  /** Quick choices for the revision days. */
  weekdays: {
    exceptFriday: 'عدا الجمعة',
    mondayThursday: 'الإثنين والخميس',
  },
  errors: {
    dailyAmount: 'اختر مقدارًا يوميًا من ربع حزب إلى القرآن كاملًا.',
    weekdays: 'اختر يومًا واحدًا على الأقل للمراجعة.',
    nameAndRiwayah: 'راجع اسم الهدف وروايته.',
    startDate: 'تاريخ البداية غير صالح.',
    reminderTime: 'وقت التذكير غير صالح.',
    memorizedRequired: 'حدد ما تحفظه أولًا؛ المراجعة تدور على محفوظك.',
    /** {{what}} is an internal field name, e.g. "log". */
    invalidData: 'بيانات المراجعة غير صالحة ({{what}})',
  },
  hero: {
    /** {{ordinal}} is a feminine ordinal agreeing with الدورة (hero.ordinal.*), or a number past the tenth. */
    pass: 'الدورة {{ordinal}} على محفوظك',
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
    newPass: 'دورة جديدة تبدأ',
    steady: 'تثبيتٌ يومًا بعد يوم',
    emptyDetail: 'المراجعة تدور على ما تحفظه',
    /** {{days}} is a number of days (revision.days). */
    passLength: 'دورة كاملة في {{days}}',
    progressLabel: 'ما روجع من الدورة الحالية',
  },
  /** The band of ajza' under the hero. */
  band: {
    juzCount_zero: 'محفوظك في {{count, number}} أجزاء',
    juzCount_one: 'محفوظك في جزء واحد',
    juzCount_two: 'محفوظك في جزأين',
    juzCount_few: 'محفوظك في {{count, number}} أجزاء',
    juzCount_many: 'محفوظك في {{count, number}} جزءًا',
    juzCount_other: 'محفوظك في {{count, number}} جزءًا',
    current: 'تراجع الآن في الجزء {{juz, number}}',
    label: 'ما روجع وما ينتظر في {{count, number}} أجزاء',
    revised: 'روجع في هذه الدورة',
    ahead: 'محفوظ ينتظر دوره',
  },
  /** The goal's card in the list of goals. */
  card: {
    chooseToStart: 'حدد محفوظك لتبدأ المراجعة',
    due: 'مراجعة اليوم بانتظارك',
    doneToday: 'أتممت مراجعة اليوم',
    next: 'المراجعة القادمة · {{date}}',
    /** {{days}} is a number of days (revision.days). */
    daysRevised: '{{days}} من المراجعة',
    notStarted: 'لم تبدأ بعد',
  },
  creation: {
    backToSetup: 'العودة إلى إعداد المراجعة',
    heading: {
      setup: 'ثبّت ما حفظت',
      review: 'دورتك على محفوظك',
    },
    intro: {
      setup: 'مقدار تختاره، في أيام تختارها، يمر على محفوظك كله ثم يبدأ من جديد.',
      review: 'راجع أيامك الأولى، واجعل لها وقتًا.',
    },
    memory: {
      title: 'ما تراجعه',
      description: 'المراجعة تمر على محفوظك بترتيب المصحف. كل ما تحفظه لاحقًا ينضم إليها تلقائيًا.',
      count: '{{count, number}} آية في محفوظك',
      none: 'لم تحدد محفوظك بعد',
      /** {{name}} is the running memorization goal. */
      followedBy: 'يتابعه هدف «{{name}}»، وما تحفظه فيه ينضم إلى المراجعة.',
      kinds: 'سور، أجزاء، أحزاب، أرباع، أو آيات محددة',
      edit: 'مراجعة المحفوظ وتعديله',
      chooseLabel: 'تحديد ما أحفظه من القرآن',
      existing: 'لديك هدف مراجعة جارٍ لرواية {{riwayah}}. يمكنك تعديل مقداره وأيامه من إعداداته.',
      continueExisting: 'متابعة {{name}}',
    },
    amount: {
      title: 'كم تراجع في اليوم؟',
      description: 'بأرباع الأحزاب؛ ينتهي كل يوم عند أقرب آية كاملة. إذا كان محفوظك أقل من المقدار، تراجعه كله.',
    },
    days: {
      title: 'أيام المراجعة',
      description: 'إذا فاتك يوم، تنتظرك المراجعة نفسها في اليوم التالي من أيامك، دون تراكم.',
    },
    schedule: {
      description: '{{amount}} في الجلسة، في {{count, number}} أيام من الأسبوع. ينتهي كل يوم عند آية كاملة، ثم تبدأ الدورة من أول محفوظك.',
      moreSpans: 'و{{count, number}} مقاطع إضافية',
      sessions: '{{count, number}} جلسة لإتمام الدورة',
      expectedEnd: 'الإتمام المتوقع: {{date}}',
      /** {{name}} is the running memorization goal. */
      ownerEmpty: 'لا محفوظ بعد. ما تحفظه في «{{name}}» ينضم إلى المراجعة تلقائيًا، وتبدأ أيامك معه.',
      chooseFirst: 'حدد ما تحفظه لتبدأ المراجعة.',
    },
    reminderDetail: 'تذكير في أيام المراجعة فقط.',
    /** {{days}} is a number of days (revision.days). */
    passEvery: 'دورة كاملة كل {{days}} مراجعة',
    submit: 'ابدأ المراجعة',
    showDays: 'عرض أيام المراجعة',
  },
  detail: {
    portion: {
      due: 'مراجعة اليوم',
      doneNext: 'أتممت مراجعة اليوم · القادمة',
      next: 'مراجعتك القادمة',
      /** The portion runs into another surah. */
      fromAyah: 'من الآية {{ayah, number}}',
      ayah: 'الآية {{ayah, number}}',
      ayahs: 'الآيات {{from, number}} – {{to, number}}',
      until: 'حتى {{surah}}، الآية {{ayah, number}}',
      spans: 'تضم مراجعتك {{count, number}} مقاطع من محفوظك؛ نفتح كل مقطع وحده.',
      resumeNote: 'نكمل من حيث توقفت.',
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
      undo: 'التراجع عن آخر تسجيل مراجعة',
      resume: 'استئناف المراجعة',
      pause: 'إيقاف المراجعة مؤقتًا',
      /** {{name}} is the running memorization goal. */
      openGoal: 'فتح {{name}}',
      editMemorized: 'عرض المحفوظ وتعديله',
    },
    empty: {
      title: 'لا محفوظ لنراجعه بعد',
      owner: 'ما تحفظه في «{{name}}» ينضم إلى المراجعة تلقائيًا.',
      choose: 'حدد ما تحفظه من القرآن، ونبدأ دورتك من أوله.',
    },
    paused: {
      title: 'المراجعة متوقفة مؤقتًا',
      detail: 'موضعك في الدورة محفوظ. عند الاستئناف تنتظرك المراجعة نفسها في أول يوم من أيامك.',
    },
    archived: {
      keepsRecord: 'حذف الهدف لا يمس سجل محفوظك.',
      deletedOn: 'يُحذف الهدف في {{date}}.',
      otherGoal: 'لديك هدف مراجعة آخر لهذه الرواية. أرشفه أولًا لاستعادة هذا الهدف.',
    },
    scheduleFooter: 'الموعد المتوقع لإتمام الدورة: {{date}} · يتحدّث مع محفوظك.',
    memorized: {
      title: 'محفوظك',
      owner: '{{count, number}} آية. يتابعه هدف «{{name}}»، وكل ما تحفظه فيه ينضم إلى المراجعة.',
      own: '{{count, number}} آية. أضف ما حفظته أو صحح اختيارًا سابقًا؛ نحافظ على موضعك في الدورة.',
    },
    logTitle: 'آخر مراجعاتك',
    settings: {
      keepsPlace: 'تغيير المقدار أو الأيام يحافظ على موضعك في الدورة؛ يتغير ما بعده فقط.',
      reminderDetail: 'في أيام المراجعة فقط.',
      archiveNote: 'أرشفة هدف المراجعة أو حذفه لا يمس سجل محفوظك.',
    },
    errors: {
      memoryChanged: 'تغيّر محفوظك. أغلق النافذة وافتحها مجددًا.',
      portionChanged: 'تغيّرت مراجعتك. راجع المقطع المعروض ثم أعد المحاولة.',
      nameAndTime: 'راجع اسم الهدف والوقت.',
      daysAndAmount: 'اختر أيام المراجعة ومقدارًا صحيحًا يبدأ من ربع حزب.',
    },
  },
} as const;
