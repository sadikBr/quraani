/** Khatma and daily wird: creation, detail screen and the start point picker. */
export default {
  create: {
    /** Name given to the goal when the user leaves the name field empty (also its placeholder). */
    defaultName: { khatma: 'ختمتي', wird: 'وردي اليومي' },
    backToSetup: 'العودة إلى إعداد الهدف',
    heading: {
      blocked: 'هدفك الحالي أولًا',
      /** Second step: a last look at the goal before creating it. */
      review: 'نظرة أخيرة قبل البدء',
      setup: 'على قدر استطاعتك',
    },
    subheading: {
      blocked: 'هدف قراءة واحد في كل مرة، ومعه ما شئت من القراءات المتكررة.',
      review: 'هذا وردك، فاجعل له وقتًا في يومك.',
      setup: 'اختر المدة أو المقدار، ونرتّب لك وردك.',
    },
    blockedNote: 'الختمة والورد اليومي طريقتان لتنظيم القراءة. يمكنك بدء أيٍّ منهما بعد إتمام هدفك الحالي أو أرشفته.',
    /** Choices of the reading unit (segmented control). */
    units: { pages: 'صفحات', hizbs: 'أحزاب', juzs: 'أجزاء' },
    amount: {
      khatmaTitle: 'في كم أسبوع؟',
      wirdTitle: 'كم تقرأ كل يوم؟',
      khatmaDescription: 'نحسب وردك اليومي لتختم في المدة التي تختارها.',
      wirdDescription: 'مقدارك ثابت، بلا موعد إتمام. إذا فاتك يوم، تتابع من حيث توقفت.',
      khatmaLabel: 'مدة الختمة بالأسابيع',
      wirdLabel: 'مقدار الورد اليومي',
      /** Unit under the number of weeks typed above it; count is that number. */
      weeks_zero: 'أسبوع',
      weeks_one: 'أسبوع',
      weeks_two: 'أسبوعان',
      weeks_few: 'أسابيع',
      weeks_many: 'أسبوعًا',
      weeks_other: 'أسبوع',
      /** Unit under the daily amount typed above it; count is that amount (decimals use _other). */
      perDay: {
        pages_zero: 'صفحة يوميًا',
        pages_one: 'صفحة يوميًا',
        pages_two: 'صفحتان يوميًا',
        pages_few: 'صفحات يوميًا',
        pages_many: 'صفحة يوميًا',
        pages_other: 'صفحة يوميًا',
        hizbs_zero: 'حزب يوميًا',
        hizbs_one: 'حزب يوميًا',
        hizbs_two: 'حزبان يوميًا',
        hizbs_few: 'أحزاب يوميًا',
        hizbs_many: 'حزبًا يوميًا',
        hizbs_other: 'حزب يوميًا',
        juzs_zero: 'جزء يوميًا',
        juzs_one: 'جزء يوميًا',
        juzs_two: 'جزءان يوميًا',
        juzs_few: 'أجزاء يوميًا',
        juzs_many: 'جزءًا يوميًا',
        juzs_other: 'جزء يوميًا',
      },
      divideBy: 'قسّم القراءة حسب',
    },
    timing: {
      title: 'الرواية والموعد',
      riwayah: 'الرواية',
      startDate: 'تاريخ البدء',
    },
    start: {
      title: 'من أين تبدأ؟',
      khatmaDescription: 'نوزّع القراءة من الموضع الذي تختاره إلى آخر المصحف على المدة التي حدّدتها.',
      wirdDescription: 'تبدأ من هنا، ثم تواصل كل يوم بالمقدار الذي اخترته.',
    },
    /** Summary card of the review step. */
    summary: {
      khatma_zero: 'ختمة في {{count, number}} أسبوع',
      khatma_one: 'ختمة في أسبوع واحد',
      khatma_two: 'ختمة في أسبوعين',
      khatma_few: 'ختمة في {{count, number}} أسابيع',
      khatma_many: 'ختمة في {{count, number}} أسبوعًا',
      khatma_other: 'ختمة في {{count, number}} أسبوع',
      /** Daily amount of a wird, by unit; count may be a decimal such as 0.25 (_other). */
      wird: {
        pages_zero: '{{count, number}} صفحة يوميًا',
        pages_one: 'صفحة واحدة يوميًا',
        pages_two: 'صفحتان يوميًا',
        pages_few: '{{count, number}} صفحات يوميًا',
        pages_many: '{{count, number}} صفحة يوميًا',
        pages_other: '{{count, number}} صفحة يوميًا',
        hizbs_zero: '{{count, number}} حزب يوميًا',
        hizbs_one: 'حزب واحد يوميًا',
        hizbs_two: 'حزبان يوميًا',
        hizbs_few: '{{count, number}} أحزاب يوميًا',
        hizbs_many: '{{count, number}} حزبًا يوميًا',
        hizbs_other: '{{count, number}} حزب يوميًا',
        juzs_zero: '{{count, number}} جزء يوميًا',
        juzs_one: 'جزء واحد يوميًا',
        juzs_two: 'جزءان يوميًا',
        juzs_few: '{{count, number}} أجزاء يوميًا',
        juzs_many: '{{count, number}} جزءًا يوميًا',
        juzs_other: '{{count, number}} جزء يوميًا',
      },
      /** Small labels above the start date, the end date (or noEndDate) and the number of portions. */
      start: 'البداية',
      completion: 'الإتمام',
      /** Label above noEndDate for a daily wird. */
      rhythm: 'المدة',
      noEndDate: 'مفتوحة',
      sessions: 'الأوراد',
      from: 'تبدأ من {{surah}}، الآية {{ayah, number}} · الصفحة {{page, number}}',
    },
    firstSteps: {
      /** The first three portions of the new goal. */
      title: 'أورادك الأولى',
      wirdNote: 'المواعيد تقديرية، فكل ورد يأتي بعد إتمام الذي قبله.',
    },
    /** Section with the name, repeat and reminder settings. */
    makeItYours: 'إعدادات الهدف',
    repeatDetail: 'تبدأ من أول المصحف في اليوم التالي للإتمام.',
    reminder: 'ذكّرني بوردي',
    reminderDetail: 'كل يوم، في الوقت الذي تختاره.',
    replacesRepeat: 'بإنشاء هذا الهدف يتوقف التجديد التلقائي لهدف القراءة المكتمل، ويبقى ما أنجزته فيه.',
    /** Under the button of the first step; count is the number of portions. */
    sessionsPreview_zero: 'لا أوراد · التفاصيل في الخطوة التالية',
    sessionsPreview_one: 'ورد واحد · التفاصيل في الخطوة التالية',
    sessionsPreview_two: 'وردان · التفاصيل في الخطوة التالية',
    sessionsPreview_few: '{{count, number}} أوراد · التفاصيل في الخطوة التالية',
    sessionsPreview_many: '{{count, number}} وردًا · التفاصيل في الخطوة التالية',
    sessionsPreview_other: '{{count, number}} ورد · التفاصيل في الخطوة التالية',
    /** Button of the first step; avoids «المراجعة», which names the revision goal. */
    continueToReview: 'متابعة',
    create: 'إنشاء الهدف',
    errors: {
      timeFormat: 'اكتب الوقت مثل 20:00.',
      checkGoal: 'تحقّق من بيانات الهدف.',
      savedPosition: 'تعذّر استرجاع آخر موضع قرأت فيه. اختر موضع البداية.',
    },
  },
  /** Repeat switch, in creation and in the goal settings. A new round starts from the beginning of the mushaf. */
  repeat: 'ابدأ ختمة جديدة عند الإتمام',
  detail: {
    /** Screen title while the goal loads or when it does not exist. */
    title: 'الهدف',
    notFound: 'هذا الهدف غير موجود.',
    next: {
      overdue: 'ورد فائت',
      today: 'ورد اليوم',
      upcoming: 'وردك القادم',
      /** Position of the session in the schedule: "الورد ٣". */
      number: 'الورد {{number, number}}',
      /** After the date, when part of the portion is already read. */
      resume: 'تتابع من حيث توقفت',
      /** Disabled reading button of a portion that is not due yet; {{date}} is "١٢ أكتوبر". */
      availableOn: 'يُتاح يوم {{date}}',
      markDone: 'أتممت هذا الورد',
    },
    catchUp: {
      show: 'تحتاج إلى تعديل الجدول؟',
      hide: 'إخفاء خيارات تعديل الجدول',
      note: 'ما قرأته محسوب لك. يمكنك تمديد الجدول، أو توزيع ما بقي على الأيام حتى الموعد الأصلي.',
      extend: 'تمديد الجدول من اليوم',
      redistribute: 'توزيع المتبقي حتى الموعد الأصلي',
    },
    status: {
      completedTitle: 'أتممت ختمتك، تقبّل الله منك',
      pausedTitle: 'خذ وقتك، ما قرأته لن يضيع',
      completedRepeat: 'تبدأ الختمة التالية في اليوم الذي يلي الإتمام.',
      completedOnce: 'تجد أورادك كلها في الجدول أدناه.',
      paused: 'عند الاستئناف نمدّد الجدول بقدر مدة التوقف.',
      archivedUntil: 'تذكيراته متوقفة. سيُحذف نهائيًا في {{date}}. استعده قبل ذلك للاحتفاظ به.',
      archived: 'تذكيراته متوقفة. سيُحذف نهائيًا بعد أسبوعين. استعده قبل ذلك للاحتفاظ به.',
    },
    undo: 'التراجع عن آخر قراءة سجّلتها',
    /** One line of facts under the schedule, joined with "·". */
    info: {
      /** Khatma: the unit its portions follow. */
      dividedBy: { pages: 'التقسيم بالصفحات', hizbs: 'التقسيم بالأحزاب', juzs: 'التقسيم بالأجزاء' },
      /** Daily wird: its amount by unit; count may be a decimal such as 0.25 (_other). */
      dailyAmount: {
        pages_zero: '{{count, number}} صفحة يوميًا',
        pages_one: 'صفحة واحدة يوميًا',
        pages_two: 'صفحتان يوميًا',
        pages_few: '{{count, number}} صفحات يوميًا',
        pages_many: '{{count, number}} صفحة يوميًا',
        pages_other: '{{count, number}} صفحة يوميًا',
        hizbs_zero: '{{count, number}} حزب يوميًا',
        hizbs_one: 'حزب واحد يوميًا',
        hizbs_two: 'حزبان يوميًا',
        hizbs_few: '{{count, number}} أحزاب يوميًا',
        hizbs_many: '{{count, number}} حزبًا يوميًا',
        hizbs_other: '{{count, number}} حزب يوميًا',
        juzs_zero: '{{count, number}} جزء يوميًا',
        juzs_one: 'جزء واحد يوميًا',
        juzs_two: 'جزءان يوميًا',
        juzs_few: '{{count, number}} أجزاء يوميًا',
        juzs_many: '{{count, number}} جزءًا يوميًا',
        juzs_other: '{{count, number}} جزء يوميًا',
      },
      /** Repeat on / off. */
      repeats: 'ختمة بعد ختمة',
      once: 'ختمة واحدة',
      cycleStart: 'بداية الختمة: {{date}}',
      /** {{time}} is HH:MM in Latin digits. */
      reminderAt: 'التذكير {{time}}',
      reminderOff: 'بلا تذكير',
    },
    history: {
      title: 'الختمات السابقة',
      /** {{date}} is a full date: "١٠ أكتوبر ٢٠٢٦". */
      cycle: 'الختمة {{number, number}} · أتممتها في {{date}}',
    },
    settings: {
      repeatDetail: 'تبدأ من أول المصحف في اليوم التالي للإتمام.',
      reminder: 'ذكّرني بوردي',
      reminderDetail: 'كل يوم، في الوقت الذي تختاره.',
      deletionNote: 'يُحذف الهدف المؤرشف نهائيًا بعد أسبوعين، ويمكنك استعادته قبل ذلك.',
    },
    errors: {
      settings: 'تحقّق من اسم الهدف ووقت التذكير (مثل 20:00).',
    },
  },
  startPoint: {
    /** Screen reader name of the page / surah / hizb choice. */
    modesLabel: 'طريقة اختيار البداية',
    modes: {
      page: { label: 'صفحة', startFrom: 'البداية من صفحة' },
      surah: { label: 'سورة', startFrom: 'البداية من سورة' },
      hizb: { label: 'حزب', startFrom: 'البداية من حزب' },
    },
    /** Text that names the kind of start point (page, surah or hizb). */
    kinds: {
      page: {
        numbered: 'الصفحة {{number, number}}',
        /** {{position}}: the chosen position, or "اختر موضع البداية". */
        change: 'تغيير الصفحة: {{position}}',
        pick: 'اختيار الصفحة',
        title: 'اختر الصفحة',
        search: 'البحث عن الصفحة',
        searchPlaceholder: 'رقم الصفحة أو اسم السورة',
        /** Number of choices in the list. */
        total_zero: '{{count, number}} صفحة',
        total_one: 'صفحة واحدة',
        total_two: 'صفحتان',
        total_few: '{{count, number}} صفحات',
        total_many: '{{count, number}} صفحة',
        total_other: '{{count, number}} صفحة',
      },
      surah: {
        numbered: 'السورة {{number, number}}',
        change: 'تغيير السورة: {{position}}',
        pick: 'اختيار السورة',
        title: 'اختر السورة',
        search: 'البحث عن السورة',
        searchPlaceholder: 'اسم السورة أو رقمها',
        total_zero: '{{count, number}} سورة',
        total_one: 'سورة واحدة',
        total_two: 'سورتان',
        total_few: '{{count, number}} سور',
        total_many: '{{count, number}} سورة',
        total_other: '{{count, number}} سورة',
      },
      hizb: {
        numbered: 'الحزب {{number, number}}',
        change: 'تغيير الحزب: {{position}}',
        pick: 'اختيار الحزب',
        title: 'اختر الحزب',
        search: 'البحث عن الحزب',
        searchPlaceholder: 'رقم الحزب أو اسم السورة',
        total_zero: '{{count, number}} حزب',
        total_one: 'حزب واحد',
        total_two: 'حزبان',
        total_few: '{{count, number}} أحزاب',
        total_many: '{{count, number}} حزبًا',
        total_other: '{{count, number}} حزب',
      },
    },
    /** Screen reader label; page and ayah are in Latin digits. */
    position: '{{surah}}، الصفحة {{page}}، الآية {{ayah}}',
    choosePosition: 'اختر موضع البداية',
    startsHere: 'تبدأ من هنا',
    chooseStart: 'اختر بداية القراءة',
    ayahPage: 'الآية {{ayah, number}} · الصفحة {{page, number}}',
    /** Screen reader label of continueSaved: start from the last position read in the mushaf. */
    useSaved: 'المتابعة من حيث توقفت في المصحف',
    continueSaved: 'أو تابع من حيث توقفت في المصحف',
    sheet: {
      close: 'إغلاق اختيار البداية',
      subtitle: 'ابدأ من حيث شئت',
      results_zero: 'لا نتائج',
      results_one: 'نتيجة واحدة',
      results_two: 'نتيجتان',
      results_few: '{{count, number}} نتائج',
      results_many: '{{count, number}} نتيجة',
      results_other: '{{count, number}} نتيجة',
      empty: 'لم نجد نتيجة. جرّب رقمًا آخر أو اسم السورة.',
      page: 'الصفحة {{page, number}}',
      surahAyah: '{{surah}} · الآية {{ayah, number}}',
    },
  },
} as const;
