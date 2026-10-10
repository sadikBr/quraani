/** Recurring reading goals: surahs read again on chosen weekdays (e.g. al-Kahf every Friday). */
export default {
  presets: {
    kahf: {
      /** Also the default name of a goal created from this preset. */
      name: 'الكهف كل جمعة',
      description: 'موعد أسبوعي مع سورة الكهف',
    },
    mulk: {
      /** Also the default name of a goal created from this preset. */
      name: 'الملك كل ليلة',
      description: 'سورة الملك في ختام يومك',
    },
  },
  /** Goal type followed by its reading days: "قراءة متكررة · الجمعة". */
  summary: 'قراءة متكررة · {{days}}',
  errors: {
    weekdays: 'اختر يومًا واحدًا على الأقل للقراءة.',
    draft: 'راجع اسم الهدف وتاريخه وروايته.',
    surahs: 'اختر سورة واحدة على الأقل.',
    surahNotFound: 'تعذر العثور على السورة في هذه الرواية.',
    reminderTime: 'وقت التذكير غير صالح.',
    invalidData: 'بيانات القراءة المتكررة غير صالحة',
  },
  weekdayPicker: {
    fridayOnly: 'الجمعة فقط',
    chooseDay: 'اختر يومًا واحدًا على الأقل.',
  },
  card: {
    status: {
      done: 'أتممت قراءة اليوم',
      dueToday: 'موعدك اليوم',
      upcoming: 'الموعد القادم · {{date}}',
    },
    completedOccurrences: '{{n, number}} قراءة مكتملة',
    todayProgress: '{{completed, number}} من {{total, number}} سور اليوم',
    /** Number of surahs read at each scheduled time. The current design uses "سور" for every count except 1. */
    surahsPerOccurrence_zero: '{{count, number}} سور في الموعد',
    surahsPerOccurrence_one: '{{count, number}} سورة في الموعد',
    surahsPerOccurrence_two: '{{count, number}} سور في الموعد',
    surahsPerOccurrence_few: '{{count, number}} سور في الموعد',
    surahsPerOccurrence_many: '{{count, number}} سور في الموعد',
    surahsPerOccurrence_other: '{{count, number}} سور في الموعد',
  },
  creation: {
    /** Default goal name when one surah is chosen: "قراءة الكهف". */
    fallbackNameSurah: 'قراءة {{surah}}',
    /** Default goal name for several surahs. */
    fallbackName: 'قراءتي المتكررة',
    backToSetup: 'العودة إلى إعداد القراءة المتكررة',
    setup: {
      title: 'سور تحب العودة إليها',
      subtitle: 'اختر السور، ثم امنحها موعدًا في أسبوعك.',
    },
    review: {
      title: 'موعد خير يتجدد',
      subtitle: 'هذه قراءتك ومواعيدها. كل موعد بداية جديدة.',
    },
    what: {
      title: 'ماذا تقرأ؟',
      chooseSurahs: 'اختيار السور',
      placeholder: 'اختر سورة أو أكثر',
      change: 'تغيير السور المختارة',
      browse: 'تصفّح سور القرآن',
      riwayah: 'الرواية',
    },
    when: {
      title: 'متى تعود إليها؟',
      description: 'يتجدد الهدف في الأيام المختارة، دون تراكم قراءة الأيام الفائتة.',
    },
    sessions: {
      several: 'تقرأ السور بالترتيب، في جلسة مخصصة لكل سورة.',
      single: 'جلسة قراءة مخصصة للسورة، مع حفظ تقدمك خلال اليوم.',
    },
    firstDates: 'مواعيدك الأولى',
    reminder: 'ذكّرني بالقراءة',
    reminderDetail: 'تذكير في الأيام المختارة فقط.',
    alongside: 'يمكنك متابعة هذا الهدف بجانب ختمتك أو وردك اليومي، وإيقافه أو أرشفته متى شئت.',
    chooseToContinue: 'اختر السور وأيام القراءة للمتابعة.',
    create: 'إنشاء القراءة المتكررة',
    reviewSchedule: 'مراجعة الموعد',
  },
  detail: {
    errors: {
      saveChange: 'تعذر حفظ التغيير.',
      settings: 'راجع اسم الهدف، الأيام ووقت التذكير.',
    },
    title: {
      done: 'قراءة طيبة، تقبّل الله منك',
      dueToday: 'موعدك مع القرآن اليوم',
      waiting: 'رفقة تتجدد',
    },
    completedSinceStart: '{{n, number}} قراءة مكتملة منذ البداية',
    week: {
      /** Accessibility label of a day in the last-7-days strip: "الجمعة ٩ أكتوبر، مكتمل". */
      day: '{{date}}، {{state}}',
      done: 'مكتمل',
      partial: 'قراءة جزئية',
      missed: 'دون تسجيل قراءة',
      notScheduled: 'غير مقرر',
    },
    next: {
      today: 'قراءة اليوم',
      upcoming: 'موعدك القادم',
      /** Badge on the surah the next session reads. */
      continuing: 'نكمل قراءتها',
      starting: 'نبدأ بها',
      /** Disabled action before the date: "متاح السبت ١٠ أكتوبر". */
      availableOn: 'متاح {{date}}',
      finishSurah: 'أتممت هذه السورة',
      several: 'جلسة مخصصة لكل سورة، ثم نتابع إلى التي تليها.',
      single: 'قراءة الأيام الفائتة لا تتراكم. كل موعد بداية جديدة.',
    },
    paused: {
      title: 'موعدك في انتظارك',
      body: 'تذكيراتك متوقفة. عند الاستئناف تعود إلى أيامك المعتادة، دون إضافة قراءة فائتة.',
    },
    archived: {
      deletionOn: 'التذكيرات متوقفة. الحذف التلقائي: {{date}}.',
      deletionLater: 'التذكيرات متوقفة. الحذف التلقائي: بعد أسبوعين.',
    },
    undo: 'التراجع عن آخر تسجيل اليوم',
    history: {
      title: 'سجل القراءة',
      completed: 'قراءة مكتملة',
      partial: 'قراءة جزئية · {{completed, number}} من {{total, number}} سور',
      older: 'عرض قراءات أقدم',
      empty: 'ستجد هنا قراءاتك بعد حفظ تقدمك الأول.',
    },
    /** Reminder time in 24-hour Latin digits: "التذكير 20:00". */
    reminderAt: 'التذكير {{time}}',
    reminderOff: 'التذكير غير مفعّل',
    settings: {
      days: 'أيام القراءة',
      daysNote: 'تطبق الأيام الجديدة على المواعيد القادمة، وتبقى قراءاتك السابقة محفوظة.',
      reminder: 'تذكير بالقراءة',
      reminderDetail: 'في الأيام المختارة فقط.',
      archiveNote: 'الأهداف المؤرشفة تُحذف بعد أسبوعين. يمكنك استعادتها خلال هذه المدة.',
    },
  },
} as const;
