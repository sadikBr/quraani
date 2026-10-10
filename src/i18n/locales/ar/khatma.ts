/** Khatma and daily wird: creation, detail screen and the start point picker. */
export default {
  create: {
    /** Name given to the goal when the user leaves the name field empty (also its placeholder). */
    defaultName: { khatma: 'ختمتي', wird: 'وردي اليومي' },
    backToSetup: 'العودة إلى إعداد الهدف',
    heading: {
      blocked: 'هدفك الحالي أولًا',
      review: 'جاهز للبداية؟',
      setup: 'على قدر استطاعتك',
    },
    subheading: {
      blocked: 'رحلة واحدة مع القرآن، على مهلٍ وثبات.',
      review: 'راجع وردك، واجعل له وقتًا في يومك.',
      setup: 'اختر المدة أو المقدار، ونحن نرتّب وردك.',
    },
    blockedNote: 'الختمة والورد اليومي طريقتان لتنظيم القراءة. يمكنك بدء أيٍّ منهما بعد إكمال هدفك الحالي أو أرشفته.',
    units: { pages: 'صفحات', hizbs: 'أحزاب', juzs: 'أجزاء' },
    amount: {
      khatmaTitle: 'في كم أسبوع؟',
      wirdTitle: 'كم تقرأ كل يوم؟',
      khatmaDescription: 'نحسب وردك اليومي لإتمام القراءة في المدة التي تختارها.',
      wirdDescription: 'مقدارك ثابت، بلا موعد إتمام. إذا فاتك يوم، تتابع من حيث توقفت.',
      khatmaLabel: 'مدة الختمة بالأسابيع',
      wirdLabel: 'مقدار الورد اليومي',
      weeks: 'أسابيع',
      /** {{unit}}: صفحات, أحزاب or أجزاء. */
      perDay: '{{unit}} يوميًا',
      divideBy: 'قسّم القراءة حسب',
    },
    timing: {
      title: 'الرواية والموعد',
      riwayah: 'الرواية',
      startDate: 'تاريخ البداية',
    },
    start: {
      title: 'من أين تبدأ؟',
      khatmaDescription: 'نوزّع القراءة من الموضع المختار حتى نهاية المصحف على مدّتك.',
      wirdDescription: 'تبدأ من هنا، ثم تواصل كل يوم بالمقدار الذي اخترته.',
    },
    summary: {
      khatma: 'ختمة في {{weeks, number}} أسابيع',
      /** {{unit}}: صفحات, أحزاب or أجزاء. */
      wird: '{{amount, number}} {{unit}} كل يوم',
      start: 'البداية',
      completion: 'الإتمام',
      rhythm: 'الإيقاع',
      noEndDate: 'بلا موعد إتمام',
      sessions: 'الأوراد',
      from: 'من {{surah}} · الآية {{ayah, number}} · صفحة {{page, number}}',
    },
    firstSteps: {
      title: 'أول خطواتك',
      wirdNote: 'المواعيد تقديرية؛ كل ورد جديد يتبع إتمام سابقه.',
    },
    makeItYours: 'اجعله هدفك',
    repeatDetail: 'دورة جديدة في اليوم التالي للإتمام.',
    reminder: 'ذكّرني بموعد وردي',
    reminderDetail: 'تذكير يومي في الوقت الذي يناسبك.',
    replacesRepeat: 'سيوقف هذا الهدف التكرار التلقائي لهدف القراءة المكتمل، مع الاحتفاظ بإنجازك السابق.',
    sessionsPreview: '{{sessions, number}} وردًا · نراجع التفاصيل في الخطوة التالية',
    continueToReview: 'متابعة إلى المراجعة',
    create: 'إنشاء الهدف',
    errors: {
      timeFormat: 'اكتب الوقت مثل 20:00',
      checkGoal: 'راجع بيانات الهدف.',
      savedPosition: 'تعذر قراءة موضعك المحفوظ. اختر بداية القراءة.',
    },
  },
  /** Repeat switch, in creation and in the goal settings. */
  repeat: 'التكرار بعد الإكمال',
  detail: {
    /** Screen title while the goal loads or when it does not exist. */
    title: 'الهدف',
    notFound: 'هذا الهدف غير موجود.',
    next: {
      overdue: 'ورد بانتظارك',
      today: 'ورد اليوم',
      upcoming: 'وردك القادم',
      /** Position of the session in the schedule: "الورد ٣". */
      number: 'الورد {{number, number}}',
      resume: 'نكمل من حيث توقفت',
      availableOn: 'متاح {{date}}',
      markDone: 'أتممت هذا الورد',
    },
    catchUp: {
      show: 'تحتاج إلى تعديل الجدول؟',
      hide: 'إخفاء خيارات تعديل الجدول',
      note: 'تقدمك محفوظ. يمكنك تمديد الموعد أو توزيع المتبقي على الأيام القادمة.',
      extend: 'تمديد الجدول من اليوم',
      redistribute: 'توزيع المتبقي حتى الموعد الأصلي',
    },
    status: {
      completedTitle: 'أتممت رحلتك، تقبّل الله منك',
      pausedTitle: 'خذ وقتك، تقدمك محفوظ',
      completedRepeat: 'تبدأ دورة جديدة في اليوم التالي للإكمال.',
      completedOnce: 'يمكنك مراجعة جميع أورادك في الجدول أدناه.',
      paused: 'عند الاستئناف نمدد الجدول بمدة التوقف.',
      archivedUntil: 'تذكيراته متوقفة. سيُحذف نهائيًا في {{date}}. استعده قبل ذلك للاحتفاظ به.',
      archived: 'تذكيراته متوقفة. سيُحذف نهائيًا بعد أسبوعين. استعده قبل ذلك للاحتفاظ به.',
    },
    undo: 'التراجع عن آخر تسجيل قراءة',
    info: {
      /** {{unit}}: صفحات, أحزاب or أجزاء. */
      dividedBy: 'التوزيع حسب {{unit}}',
      dailyAmount: 'المقدار اليومي: {{amount, number}} {{unit}}',
      repeats: 'تتكرر بعد الإكمال',
      once: 'دورة واحدة',
      cycleStart: 'بداية الدورة: {{date}}',
      /** {{time}} is HH:MM in Latin digits. */
      reminderAt: 'التذكير {{time}}',
      reminderOff: 'التذكير غير مفعّل',
    },
    history: {
      title: 'الدورات السابقة',
      cycle: 'الدورة {{number, number}} · اكتملت {{date}}',
    },
    settings: {
      repeatDetail: 'ابدأ دورة جديدة في اليوم التالي للإتمام.',
      reminder: 'تذكير بالورد',
      reminderDetail: 'وقت يومي تخصصه لقراءة القرآن.',
      deletionNote: 'يُحذف الهدف نهائيًا بعد أسبوعين من أرشفته. يمكنك استعادته خلال هذه المدة.',
    },
    errors: {
      settings: 'راجع اسم الهدف والوقت (مثل 20:00).',
    },
  },
  startPoint: {
    modesLabel: 'اختيار البداية حسب',
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
        total: '{{total, number}} صفحة',
      },
      surah: {
        numbered: 'السورة {{number, number}}',
        change: 'تغيير السورة: {{position}}',
        pick: 'اختيار السورة',
        title: 'اختر السورة',
        search: 'البحث عن السورة',
        searchPlaceholder: 'اسم السورة أو رقمها',
        total: '{{total, number}} سورة',
      },
      hizb: {
        numbered: 'الحزب {{number, number}}',
        change: 'تغيير الحزب: {{position}}',
        pick: 'اختيار الحزب',
        title: 'اختر الحزب',
        search: 'البحث عن الحزب',
        searchPlaceholder: 'رقم الحزب أو اسم السورة',
        total: '{{total, number}} حزبًا',
      },
    },
    /** Screen reader label; page and ayah are in Latin digits. */
    position: '{{surah}}، الصفحة {{page}}، الآية {{ayah}}',
    choosePosition: 'اختر موضع البداية',
    startsHere: 'تبدأ رحلتك من هنا',
    chooseStart: 'اختر بداية القراءة',
    ayahPage: 'الآية {{ayah, number}} · صفحة {{page, number}}',
    useSaved: 'استخدام موضع القراءة المحفوظ',
    continueSaved: 'أو تابع من موضعك المحفوظ',
    sheet: {
      close: 'إغلاق اختيار البداية',
      subtitle: 'بداية تناسب رحلتك مع القرآن',
      results: '{{results, number}} نتيجة',
      empty: 'لا توجد نتائج. جرّب رقمًا آخر أو اسم السورة.',
      page: 'صفحة {{page, number}}',
      surahAyah: '{{surah}} · الآية {{ayah, number}}',
    },
  },
} as const;
