export default {
  areas: {
    plans: { label: 'الأهداف', detail: 'ختمة، وورد، وحفظ، ومراجعة' },
    adhkar: { label: 'الأذكار', detail: 'أذكار الصباح والمساء والنوم وبعد الصلاة' },
    practice: { label: 'التسميع', detail: 'اختبر حفظك موضعًا بعد موضع' },
    index: { label: 'الفهرس', detail: 'السور والأجزاء والأحزاب' },
    bookmarks: { label: 'العلامات', detail: 'آيات علّمت عليها لتعود إليها' },
    search: { label: 'البحث', detail: 'بكلمة، أو برقم السورة والآية' },
    settings: { label: 'الإعدادات', detail: 'الرواية والمظهر والخط' },
  },
  hero: {
    /** {{surah}} already includes the word سورة. */
    continueIn: 'متابعة القراءة من {{surah}}، الصفحة {{page}}',
    openMushaf: 'فتح المصحف',
    resume: 'تابع من حيث توقفت',
    open: 'افتح المصحف',
    page: 'الصفحة {{page, number}}',
    juz: 'الجزء {{juz, number}}',
    hizb: 'الحزب {{hizb, number}}',
    progress: '{{percent, number}}٪ من المصحف',
    continue: 'تابع القراءة',
  },
  today: {
    title: 'وردك اليوم',
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
  explore: 'أقسام التطبيق',
} as const;
