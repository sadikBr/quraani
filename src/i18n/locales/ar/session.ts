/** Week schedules, session lists and the goal bar inside the reader. */
export default {
  /** Weekly schedule of a khatma or daily wird. */
  plan: {
    khatmaTitle: 'جدول الختمة',
    wirdTitle: 'مسار القراءة',
    total: '{{total, number}} وردًا',
    wirdNote: 'المواعيد القادمة تقديرية، وتتبع آخر ورد أكملته.',
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
  /** The goal bar and markers shown in the reader during a goal's session. */
  reader: {
    memorization: {
      portion: 'مقطع الحفظ',
      complete: 'حفظت هذا المقطع',
      page: 'حفظت حتى نهاية الصفحة',
      pageLabel: 'حفظت حتى نهاية هذه الصفحة',
      end: 'بلغت نهاية مقطع الحفظ',
      note: 'أكد إتمام الحفظ لإضافة هذه الآيات إلى محفوظك.',
      afterSave: 'بعد الحفظ نعود إلى هدفك لمتابعة المقطع التالي.',
    },
    revision: {
      portion: 'مراجعتك',
      complete: 'أتممت المراجعة',
      page: 'راجعت حتى نهاية الصفحة',
      pageLabel: 'راجعت حتى نهاية هذه الصفحة',
      end: 'بلغت نهاية مراجعتك',
      note: 'ثبّت الله حفظك. أكد الإتمام عندما تنتهي.',
      afterSave: 'بعد الحفظ نعود إلى هدفك لمتابعة المقطع التالي من محفوظك.',
    },
    /** Khatma, daily wird and recurring reading. */
    reading: {
      portion: 'وردك',
      complete: 'أكملت الورد',
      completeSurah: 'أكملت السورة',
      page: 'حفظ حتى نهاية الصفحة',
      pageLabel: 'حفظ حتى نهاية هذه الصفحة والعودة إلى الهدف',
      end: 'بلغت نهاية وردك',
      endSurah: 'بلغت نهاية السورة',
      note: 'تقبّل الله قراءتك. احفظ إتمامك عندما تنتهي.',
      afterSave: 'بعد الحفظ نعود إلى هدفك لمتابعة السورة التالية.',
    },
    start: 'البداية:',
    ayah: 'الآية {{ayah, number}}',
    until: 'حتى {{surah}}، الآية {{ayah, number}}',
    savingProgress: 'جارٍ حفظ التقدم…',
    errors: {
      saveProgress: 'تعذر حفظ التقدم. أعد المحاولة.',
    },
  },
} as const;
