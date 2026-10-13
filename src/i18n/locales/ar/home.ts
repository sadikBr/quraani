export default {
  /** The home screen's tabs: what matters now, then each section in place. */
  tabs: { today: 'اليوم', prayers: 'الصلاة', goals: 'الأهداف', adhkar: 'الأذكار', practice: 'التسميع', halaqat: 'الحلقات' },
  /** The cards to swipe on «اليوم». */
  now: {
    title: 'اليوم',
    /** A halaqa meeting today, on its tile. */
    halaqaStart: 'ابدأ الحصة',
    halaqaNotStarted: 'لم تبدأ بعد',
    /** Spoken: «حلقة المسجد، سمّع ٣ من ١٠». */
    halaqaLabel: '{{name}}، {{state}}',
    /** Above the adhkar of this part of the day. */
    adhkar: 'حان وقت الذكر',
    begin: 'ابدأ',
    noGoals: 'ضع لنفسك هدفًا',
    goalsDone: 'أتممت ورد اليوم',
    goalsLater: 'تجد أهدافك ومواعيدها في «الأهداف».',
  },
  today: {
    allGoals: 'كل الأهداف',
    createGoal: 'إنشاء هدف',
    emptyTitle: 'ابدأ بختمة، أو خطة للحفظ، أو سورة تقرؤها كل أسبوع.',
    emptyAction: 'أنشئ هدفك الأول',
    completed: 'أتممت ورد اليوم، تقبّل الله منك.',
    nothingDue: 'ليس لديك ورد مقرر اليوم.',
    upcoming: 'موعدك القادم: {{name}} · {{date}}',
    overdue: 'ورد فائت',
    start: 'ابدأ',
    /** Spoken label of the start button; {{name}} is the goal's name (may be «سورة الكهف يوم الجمعة», «حفظ القرآن»). */
    startGoal: 'بدء ورد اليوم: {{name}}',
  },
} as const;
