/** Recurring reading goals: surahs read again on chosen weekdays (e.g. al-Kahf every Friday). Each occurrence is a «موعد». */
export default {
  presets: {
    kahf: {
      /** Also the default name of a goal created from this preset, and the title of its creation screen. */
      name: 'سورة الكهف يوم الجمعة',
      description: 'موعد أسبوعي مع سورة الكهف',
    },
    mulk: {
      /** Also the default name of a goal created from this preset, and the title of its creation screen. */
      name: 'سورة الملك كل ليلة',
      description: 'سورة الملك في ختام يومك',
    },
  },
  /** Goal type followed by its reading days: "قراءة متكررة · الجمعة". */
  summary: 'قراءة متكررة · {{days}}',
  errors: {
    weekdays: 'اختر يومًا واحدًا على الأقل للقراءة.',
    draft: 'تحقّق من اسم الهدف وتاريخ البدء والرواية.',
    surahs: 'اختر سورة واحدة على الأقل.',
    surahNotFound: 'تعذّر العثور على السورة في هذه الرواية.',
    reminderTime: 'حدّد وقت التذكير بشكل صحيح.',
    invalidData: 'بيانات القراءة المتكررة غير صالحة.',
  },
  weekdayPicker: {
    /** Quick option chip, next to "كل يوم". */
    fridayOnly: 'الجمعة فقط',
    chooseDay: 'اختر يومًا واحدًا على الأقل.',
  },
  card: {
    status: {
      done: 'أتممت قراءة اليوم',
      dueToday: 'موعدك اليوم',
      upcoming: 'موعدك القادم · {{date}}',
    },
    /** Number of occurrences read in full since the goal began. */
    completedOccurrences_zero: 'لم تكتمل أي قراءة بعد',
    completedOccurrences_one: 'قراءة واحدة مكتملة',
    completedOccurrences_two: 'قراءتان مكتملتان',
    completedOccurrences_few: '{{count, number}} قراءات مكتملة',
    completedOccurrences_many: '{{count, number}} قراءة مكتملة',
    completedOccurrences_other: '{{count, number}} قراءة مكتملة',
    /** Surahs finished today out of the surahs of the occurrence ({{count}}, at least 1): "٢ من ٣ سور اليوم". */
    todayProgress_zero: '{{completed, number}} من {{count, number}} سورة اليوم',
    todayProgress_one: '{{completed, number}} من سورة واحدة اليوم',
    todayProgress_two: '{{completed, number}} من سورتين اليوم',
    todayProgress_few: '{{completed, number}} من {{count, number}} سور اليوم',
    todayProgress_many: '{{completed, number}} من {{count, number}} سورة اليوم',
    todayProgress_other: '{{completed, number}} من {{count, number}} سورة اليوم',
    /** Number of surahs read at each occurrence (always at least 1). */
    surahsPerOccurrence_zero: 'لا سور مختارة',
    surahsPerOccurrence_one: 'سورة واحدة في كل موعد',
    surahsPerOccurrence_two: 'سورتان في كل موعد',
    surahsPerOccurrence_few: '{{count, number}} سور في كل موعد',
    surahsPerOccurrence_many: '{{count, number}} سورة في كل موعد',
    surahsPerOccurrence_other: '{{count, number}} سورة في كل موعد',
  },
  creation: {
    /** Default goal name when one surah is chosen; {{surah}} comes from the data and already includes the word سورة: "سورة الكهف". */
    fallbackNameSurah: '{{surah}}',
    /** Default goal name for several surahs. */
    fallbackName: 'قراءتي المتكررة',
    backToSetup: 'العودة إلى إعداد القراءة المتكررة',
    setup: {
      title: 'سور تحب العودة إليها',
      subtitle: 'اختر السور، ثم الأيام التي تقرؤها فيها.',
    },
    review: {
      title: 'مواعيد قراءتك',
      subtitle: 'تأكّد من السور المختارة ومواعيد قراءتها.',
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
      title: 'أيام القراءة',
      description: 'يتكرر موعد القراءة في الأيام المختارة، ولا تُضاف القراءات الفائتة إلى الموعد التالي.',
    },
    sessions: {
      several: 'تقرأ السور بالترتيب، كل سورة على حدة.',
      single: 'يُحتفظ بموضع توقفك في السورة حتى نهاية اليوم.',
    },
    firstDates: 'المواعيد الأولى',
    reminder: 'ذكّرني بالقراءة',
    reminderDetail: 'في الأيام المختارة فقط.',
    alongside: 'يمكنك متابعة هذا الهدف إلى جانب ختمتك أو وردك اليومي، وإيقافه مؤقتًا أو أرشفته متى شئت.',
    chooseToContinue: 'اختر السور وأيام القراءة للمتابعة.',
    create: 'إنشاء القراءة المتكررة',
    /** Button that opens the second step (avoids «مراجعة», which names the revision goal). */
    reviewSchedule: 'متابعة',
  },
  detail: {
    errors: {
      saveChange: 'تعذّر حفظ التعديل. أعد المحاولة.',
      settings: 'تحقّق من اسم الهدف وأيام القراءة ووقت التذكير.',
    },
    title: {
      done: 'تقبّل الله قراءتك',
      dueToday: 'موعدك مع القرآن اليوم',
      /** Before the next occurrence, and while the goal is paused or archived. */
      waiting: 'موعد يتجدد مع القرآن',
    },
    completedSinceStart_zero: 'لم تكتمل أي قراءة بعد',
    completedSinceStart_one: 'قراءة واحدة مكتملة منذ البداية',
    completedSinceStart_two: 'قراءتان مكتملتان منذ البداية',
    completedSinceStart_few: '{{count, number}} قراءات مكتملة منذ البداية',
    completedSinceStart_many: '{{count, number}} قراءة مكتملة منذ البداية',
    completedSinceStart_other: '{{count, number}} قراءة مكتملة منذ البداية',
    week: {
      /** Accessibility label of a day in the last-7-days strip: "٩ أكتوبر ٢٠٢٦، قراءة مكتملة". */
      day: '{{date}}، {{state}}',
      done: 'قراءة مكتملة',
      partial: 'قراءة جزئية',
      missed: 'لم تُسجَّل قراءة',
      notScheduled: 'ليس من أيام القراءة',
    },
    next: {
      today: 'قراءة اليوم',
      upcoming: 'موعدك القادم',
      /** Badges on the surah the next reading continues or starts with, in a list of several surahs. */
      continuing: 'قيد القراءة',
      starting: 'التالية',
      /** Disabled reading button before the date: "تُتاح يوم ١٧ أكتوبر". */
      availableOn: 'تُتاح يوم {{date}}',
      finishSurah: 'أتممت هذه السورة',
      several: 'تقرأ كل سورة على حدة، ثم تنتقل إلى التي تليها.',
      single: 'لا يتراكم عليك ما فاتك، فكل موعد بداية جديدة.',
    },
    paused: {
      title: 'القراءة متوقفة مؤقتًا',
      body: 'التذكيرات متوقفة. عند الاستئناف، تعود القراءة إلى أيامها المعتادة دون إضافة المواعيد الفائتة.',
    },
    archived: {
      deletionOn: 'تذكيرات هذا الهدف متوقفة. سيُحذف نهائيًا في {{date}}. استعده قبل ذلك للاحتفاظ به.',
      deletionLater: 'تذكيرات هذا الهدف متوقفة. سيُحذف نهائيًا بعد أسبوعين. استعده قبل ذلك للاحتفاظ به.',
    },
    /** Removes the last progress recorded today. */
    undo: 'التراجع عن آخر ما سجّلته اليوم',
    history: {
      title: 'سجلّ القراءة',
      completed: 'قراءة مكتملة',
      /** Surahs finished out of the surahs of the occurrence ({{count}}, at least 1). */
      partial_zero: 'قراءة جزئية · {{completed, number}} من {{count, number}} سورة',
      partial_one: 'قراءة جزئية · {{completed, number}} من سورة واحدة',
      partial_two: 'قراءة جزئية · {{completed, number}} من سورتين',
      partial_few: 'قراءة جزئية · {{completed, number}} من {{count, number}} سور',
      partial_many: 'قراءة جزئية · {{completed, number}} من {{count, number}} سورة',
      partial_other: 'قراءة جزئية · {{completed, number}} من {{count, number}} سورة',
      /** Button under the list that shows more past occurrences. */
      older: 'قراءات أقدم',
      empty: 'ستجد هنا سجلّ قراءاتك في المواعيد المحددة.',
    },
    /** Reminder time in 24-hour Latin digits: "التذكير 20:00". */
    reminderAt: 'التذكير الساعة {{time}}',
    reminderOff: 'بلا تذكير',
    settings: {
      days: 'أيام القراءة',
      daysNote: 'تُطبَّق الأيام الجديدة على المواعيد القادمة. يبقى سجلّ قراءاتك السابقة كما هو.',
      reminder: 'ذكّرني بالقراءة',
      reminderDetail: 'في الأيام المختارة فقط.',
      archiveNote: 'يُحذف الهدف المؤرشف نهائيًا بعد أسبوعين، ويمكنك استعادته قبل ذلك.',
    },
  },
} as const;
