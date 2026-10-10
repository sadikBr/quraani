/** Week schedules, session lists and the goal bar inside the reader. */
export default {
  /** Weekly schedule of a khatma or daily wird. */
  plan: {
    khatmaTitle: 'جدول الختمة',
    wirdTitle: 'جدول الورد',
    /** Number of portions in the schedule, beside its title. */
    total_zero: 'لا أوراد',
    total_one: 'ورد واحد',
    total_two: 'وردان',
    total_few: '{{count, number}} أوراد',
    total_many: '{{count, number}} وردًا',
    total_other: '{{count, number}} ورد',
    wirdNote: 'المواعيد تقديرية، فكل ورد يأتي بعد إتمام الذي قبله.',
    /** {{of}} is the muted "من …" part (weekOf). */
    week: 'الأسبوع {{week, number}} {{of}}',
    weekOf: 'من {{total, number}}',
    /** Status of one session in the schedule. */
    status: {
      done: 'مكتمل',
      current: 'وردك الحالي',
      upcoming: 'القادم',
    },
    /** Screen reader name of a session; the number is in Latin digits. */
    sessionNumber: 'الورد {{number}}',
  },
  /** Weekly schedule shared by memorization and revision goals. */
  weekly: {
    week: 'الأسبوع {{week, number}} من {{total, number}}',
    memorization: { today: 'ورد اليوم', next: 'الورد القادم', following: 'الورد التالي', later: 'ورد لاحق' },
    revision: { today: 'مراجعة اليوم', next: 'المراجعة القادمة', following: 'المراجعة التالية', later: 'مراجعة لاحقة' },
    ayahCount_zero: '{{count, number}} آية',
    ayahCount_one: 'آية واحدة',
    ayahCount_two: 'آيتان',
    ayahCount_few: '{{count, number}} آيات',
    ayahCount_many: '{{count, number}} آية',
    ayahCount_other: '{{count, number}} آية',
  },
  /**
   * The goal bar and markers shown in the reader during a goal's session.
   * Here «حفظ» always means memorizing: recording progress is «تسجيل».
   */
  reader: {
    memorization: {
      /** Badge at the top of the portion, before its page range. */
      portion: 'مقطع الحفظ',
      /** Button that records the whole portion (last page and end card). */
      complete: 'أتممت حفظ المقطع',
      /** Toolbar button that records progress up to the end of the visible page. */
      page: 'حفظت حتى نهاية الصفحة',
      /** Screen reader label of that button; it then returns to the goal. */
      pageLabel: 'تسجيل حفظك حتى نهاية هذه الصفحة والعودة إلى الهدف',
      end: 'بلغت نهاية مقطع الحفظ',
      note: 'أكّد إتمام حفظ المقطع لتُضاف آياته إلى محفوظك.',
      /** Shown above the button when more passages remain. */
      afterSave: 'بعد التأكيد نعود بك إلى هدفك لتنتقل إلى المقطع التالي.',
    },
    revision: {
      portion: 'مراجعتك',
      complete: 'أتممت المراجعة',
      page: 'راجعت حتى نهاية الصفحة',
      pageLabel: 'تسجيل مراجعتك حتى نهاية هذه الصفحة والعودة إلى الهدف',
      end: 'بلغت نهاية مراجعتك',
      note: 'ثبّت الله حفظك. أكّد الإتمام عندما تنتهي.',
      afterSave: 'بعد التأكيد نعود بك إلى هدفك لتنتقل إلى المقطع التالي من محفوظك.',
    },
    /** Khatma, daily wird and recurring reading. */
    reading: {
      portion: 'وردك',
      complete: 'أتممت الورد',
      completeSurah: 'أتممت السورة',
      page: 'قرأت حتى نهاية الصفحة',
      pageLabel: 'تسجيل قراءتك حتى نهاية هذه الصفحة والعودة إلى الهدف',
      end: 'بلغت نهاية وردك',
      endSurah: 'بلغت نهاية السورة',
      note: 'تقبّل الله قراءتك. أكّد الإتمام عندما تنتهي.',
      /** Recurring reading only, when more surahs remain today. */
      afterSave: 'بعد التأكيد نعود بك إلى هدفك لتنتقل إلى السورة التالية.',
    },
    /** Followed by the surah name (calligraphy) and «الآية ٥». */
    start: 'تبدأ من',
    ayah: 'الآية {{ayah, number}}',
    /** {{surah}} already includes the word سورة: "حتى الآية ٥ من سورة آل عمران". */
    until: 'حتى الآية {{ayah, number}} من {{surah}}',
    /** On the end-card button while progress is recorded; avoids «حفظ», which reads as memorizing. */
    savingProgress: 'جارٍ التسجيل…',
    errors: {
      saveProgress: 'تعذّر تسجيل ما أنجزته. أعد المحاولة.',
    },
  },
} as const;
