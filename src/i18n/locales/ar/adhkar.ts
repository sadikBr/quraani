/** The daily adhkar from Hisn al-Muslim: their list, the counter, reminders and their recordings. */
export default {
  title: 'الأذكار',
  subtitle: 'أذكار اليوم والليلة، من كتاب «حصن المسلم».',
  /** Credit under the list. */
  source: 'النصوص والتسجيلات من كتاب «حصن المسلم» لسعيد بن علي بن وهف القحطاني.',
  collections: {
    morning: { title: 'أذكار الصباح', detail: 'تبدأ بها يومك' },
    evening: { title: 'أذكار المساء', detail: 'تختم بها نهارك' },
    afterPrayer: { title: 'أذكار بعد الصلاة', detail: 'بعد السلام من الصلاة' },
    sleep: { title: 'أذكار النوم', detail: 'قبل أن تنام' },
    waking: { title: 'أذكار الاستيقاظ', detail: 'حين تستيقظ من نومك' },
  },
  /** How many adhkar a collection holds. */
  size_zero: 'لا أذكار',
  size_one: 'ذكر واحد',
  size_two: 'ذكران',
  size_few: '{{count, number}} أذكار',
  size_many: '{{count, number}} ذكرًا',
  size_other: '{{count, number}} ذكر',
  /** Adhkar finished today out of all: "٧ من ٢٣". */
  progress: '{{done, number}} من {{total, number}}',
  completed: 'أتممتها اليوم',
  /** Spoken label of a collection in the list. */
  openLabel: '{{title}}، {{state}}',
  notStarted: 'لم تبدأها اليوم',
  /** On the collection of this part of the day: not started yet, or started today. */
  begin: 'ابدأ',
  resume: 'تابع',
  /** How many times a dhikr is said. */
  times_zero: 'دون عدد',
  times_one: 'مرة واحدة',
  times_two: 'مرتان',
  times_few: '{{count, number}} مرات',
  times_many: '{{count, number}} مرة',
  times_other: '{{count, number}} مرة',
  session: {
    back: 'العودة إلى الأذكار',
    hint: 'اضغط الدائرة كلما قلت الذكر، واسحب يمينًا أو يسارًا للتنقل بين الأذكار.',
    /** Which dhikr is shown: "الذكر ٣ من ٢٣". */
    position: 'الذكر {{position, number}} من {{total, number}}',
    next: 'الذكر التالي',
    previous: 'الذكر السابق',
    remaining: 'بقي {{remaining, number}} من {{count, number}}',
    done: 'تمّ',
    /** Spoken label of the counter: {{state}} is remaining or done. */
    countLabel: 'العدّاد، {{state}}',
    countHint: 'اضغط لتعدّ مرة',
    undo: 'إنقاص العدّ',
    /** Under the number in the counter: "من ٣٣". */
    of: 'من {{count, number}}',
    index: 'فهرس الأذكار',
    /** {{title}} is e.g. «أذكار الصباح». */
    indexTitle: 'فهرس {{title}}',
    closeIndex: 'إغلاق الفهرس',
    /** A dhikr partly said: "٢ من ٣". */
    partial: '{{said, number}} من {{count, number}}',
    restart: 'البدء من جديد',
    restartConfirm: 'مسح عدّ {{title}} اليوم والبدء من جديد؟',
    restartAction: 'نعم، من جديد',
    keep: 'إلغاء',
    finishedTitle: 'تقبّل الله منك',
    /** {{title}} is e.g. «أذكار الصباح». */
    finishedDetail: 'أتممت {{title}} اليوم.',
    /** Shown after the last dhikr when some are not finished. */
    left_zero: 'أتممتها كلها',
    left_one: 'بقي ذكر واحد لم تتمّه',
    left_two: 'بقي ذكران لم تتمّهما',
    left_few: 'بقيت {{count, number}} أذكار لم تتمّها',
    left_many: 'بقي {{count, number}} ذكرًا لم تتمّه',
    left_other: 'بقي {{count, number}} ذكر لم تتمّه',
    leftDetail: 'يمكنك العودة إليها الآن، أو متى شئت اليوم.',
    goToRemaining: 'الذهاب إلى ما بقي',
    /** Opens a surah a dhikr asks to read; {{surah}} already includes the word سورة. */
    readSurah: 'قراءة {{surah}}',
    /** The header button that shows the text size bar, and the bar's label. */
    textSize: 'حجم النص',
    /** Drawn small then large on that button. */
    textSizeGlyph: 'ع',
    smaller: 'تصغير النص',
    larger: 'تكبير النص',
    /** Spoken: "حجم النص ٣ من ٧". */
    textSizeValue: 'حجم النص {{step, number}} من {{total, number}}',
  },
  audio: {
    listen: 'الاستماع إلى الذكر',
    stop: 'إيقاف الاستماع',
    error: 'تعذّر تشغيل التسجيل. تحقّق من اتصالك بالإنترنت، أو نزّل التسجيلات لتستمع دون اتصال.',
    title: 'التسجيلات دون اتصال',
    description: 'نزّل تسجيلات الأذكار إلى جهازك لتستمع إليها دون إنترنت.',
    phoneOnly: 'التنزيل متوفر في تطبيق الهاتف.',
    /** {{size}} is e.g. «٣٥ ميغابايت». */
    download: 'تنزيل التسجيلات ({{size}})',
    resume: 'إكمال التنزيل',
    progress: 'جارٍ التنزيل ({{done, number}} من {{total, number}})',
    keepOpen: 'يستمر التنزيل ما دام التطبيق مفتوحًا.',
    cancel: 'إيقاف التنزيل',
    saved: 'التسجيلات على جهازك · {{size}}',
    partial: 'نُزّل {{done, number}} من {{total, number}} · {{size}}',
    delete: 'حذف التسجيلات من جهازك',
    deleteConfirm: 'حذف تسجيلات الأذكار من جهازك؟',
    networkError: 'توقف التنزيل لانقطاع الاتصال، وما نُزّل باقٍ على جهازك. أعد المحاولة حين يتوفر الإنترنت.',
    storageError: 'لا توجد مساحة كافية على جهازك لإكمال التنزيل.',
  },
  reminders: {
    title: 'التذكير',
    description: 'تذكير يومي بأذكار الصباح والمساء، ولا يصلك في يوم أتممتها فيه.',
    morning: 'تذكير بأذكار الصباح',
    evening: 'تذكير بأذكار المساء',
    time: 'وقت التذكير',
    phoneOnly: 'التذكير متوفر في تطبيق الهاتف.',
    permissionDenied: 'لم يُسمح بالإشعارات. يمكنك تفعيلها من إعدادات الهاتف.',
    unavailable: 'تعذّر تفعيل التذكير على هذا الجهاز.',
    syncFailed: 'تعذّر تحديث تذكير الأذكار. أعد المحاولة لاحقًا.',
    /** Name of the Android notification channel. */
    channelName: 'تذكير الأذكار',
    /** Notification text, read on the lock screen. */
    notification: {
      morning: { title: 'أذكار الصباح', body: 'ابدأ يومك بذكر الله.' },
      evening: { title: 'أذكار المساء', body: 'اختم نهارك بذكر الله.' },
    },
  },
  misbaha: {
    title: 'المسبحة',
    hint: 'اضغط في أي مكان كلما سبّحت.',
    /** Under the beads counted in this round: "من ٣٣". */
    of: 'من {{count, number}}',
    /** Under the beads: all tasbihat counted, and the rounds of 33 completed. */
    total: 'المجموع',
    rounds: 'الدورات المكتملة',
    totalLabel: 'المجموع {{count, number}}',
    roundsLabel_zero: 'لم تكتمل دورة بعد',
    roundsLabel_one: 'اكتملت دورة واحدة',
    roundsLabel_two: 'اكتملت دورتان',
    roundsLabel_few: 'اكتملت {{count, number}} دورات',
    roundsLabel_many: 'اكتملت {{count, number}} دورة',
    roundsLabel_other: 'اكتملت {{count, number}} دورة',
    /** Spoken label of the tap area. */
    label: 'المسبحة: {{round, number}} من {{beads, number}}، والمجموع {{count, number}}',
    tapHint: 'اضغط لتعدّ تسبيحة',
    restart: 'البدء من جديد',
    restartLabel: 'تصفير المسبحة والبدء من جديد',
    /** After restarting, with a way to take it back; counts the tasbihat before. */
    restarted_zero: 'صُفّرت المسبحة.',
    restarted_one: 'صُفّرت المسبحة بعد تسبيحة واحدة.',
    restarted_two: 'صُفّرت المسبحة بعد تسبيحتين.',
    restarted_few: 'صُفّرت المسبحة بعد {{count, number}} تسبيحات.',
    restarted_many: 'صُفّرت المسبحة بعد {{count, number}} تسبيحة.',
    restarted_other: 'صُفّرت المسبحة بعد {{count, number}} تسبيحة.',
    undo: 'تراجع',
    /** In lists: the count so far, or an invitation when it is empty. */
    count: 'المجموع {{count, number}}',
    empty: 'عدّاد تسبيح تضغطه حيثما كنت',
  },
  home: {
    title: 'أذكار اليوم',
    all: 'كل الأذكار',
  },
  storageError: 'تعذّر تسجيل عدّ الأذكار على جهازك، وسيُعاد المحاولة تلقائيًا.',
} as const;
