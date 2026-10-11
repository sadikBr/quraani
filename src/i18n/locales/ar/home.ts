export default {
  /** The home screen's tabs: what matters now, then each section in place. */
  tabs: { today: 'اليوم', prayers: 'الصلاة', goals: 'الأهداف', adhkar: 'الأذكار', practice: 'التسميع' },
  /** The cards to swipe on «اليوم». */
  now: {
    title: 'لهذا اليوم',
    /** Above the adhkar of this part of the day. */
    adhkar: 'أذكار هذا الوقت',
    begin: 'ابدأ',
    dhikr: 'الذكر',
    noGoals: 'ضع لنفسك هدفًا',
    goalsDone: 'أتممت ورد اليوم',
    goalsLater: 'تجد أهدافك ومواعيدها في «الأهداف».',
  },
  /** The reader's tools on «اليوم». */
  tools: 'المصحف',
  areas: {
    index: { label: 'الفهرس', detail: 'السور والأجزاء والأحزاب' },
    bookmarks: { label: 'العلامات', detail: 'آيات علّمت عليها لتعود إليها' },
    search: { label: 'البحث', detail: 'بكلمة، أو برقم السورة والآية' },
    settings: { label: 'الإعدادات', detail: 'الرواية والمظهر والخط' },
  },
  today: {
    allGoals: 'كل الأهداف',
    createGoal: 'إنشاء هدف',
    emptyTitle: 'لم تضع لنفسك هدفًا بعد: ختمة، أو حفظ، أو سورة تعود إليها كل أسبوع.',
    emptyAction: 'أنشئ هدفك الأول',
    completed: 'أتممت ورد اليوم، تقبّل الله منك.',
    nothingDue: 'لا ورد عليك اليوم.',
    upcoming: 'موعدك القادم: {{name}} · {{date}}',
    overdue: 'ورد فائت',
    start: 'ابدأ',
    /** Spoken label of the start button; {{name}} is the goal's name (may be «سورة الكهف يوم الجمعة», «حفظ القرآن»). */
    startGoal: 'بدء ورد اليوم: {{name}}',
  },
} as const;
