/**
 * Tasmee' (التسميع): a place is shown and what goes with it is recited from memory, then checked;
 * or its surah is chosen. «اختبار الحفظ» mixes the kinds and ends with a score.
 */
export default {
  title: 'التسميع',
  /** {{riwayah}} is e.g. «ورش». */
  riwayah: 'رواية {{riwayah}}',
  loadFailed: 'تعذّر تحميل المصحف. أعد المحاولة.',
  storageError: 'تعذّر تسجيل نتائج التسميع على جهازك، وسيُعاد المحاولة تلقائيًا.',
  scope: {
    /** A selection of more than three surahs: «سورة الملك، سورة القلم و٣ سور أخرى». */
    andMore_zero: '',
    andMore_one: ' وسورة أخرى',
    andMore_two: ' وسورتان أخريان',
    andMore_few: ' و{{count, number}} سور أخرى',
    andMore_many: ' و{{count, number}} سورة أخرى',
    andMore_other: ' و{{count, number}} سورة أخرى',
    /** A selection of several segments: «٣ مقاطع · ٢٥٠ آية». */
    parts_zero: 'لا مقاطع',
    parts_one: 'مقطع واحد',
    parts_two: 'مقطعان',
    parts_few: '{{count, number}} مقاطع',
    parts_many: '{{count, number}} مقطعًا',
    parts_other: '{{count, number}} مقطع',
    ayahs_zero: 'لا آيات',
    ayahs_one: 'آية واحدة',
    ayahs_two: 'آيتان',
    ayahs_few: '{{count, number}} آيات',
    ayahs_many: '{{count, number}} آية',
    ayahs_other: '{{count, number}} آية',
    juz: 'الجزء {{juz, number}}',
    hizb: 'الحزب {{hizb, number}}',
  },
  cue: {
    title: 'ما يُعرض عليك',
    complete: 'أكمل الآية',
    completeDetail: 'أول كلمات الآية، فتكملها',
    next: 'ما بعدها',
    nextDetail: 'آية كاملة، فتقرأ ما بعدها',
    previous: 'ما قبلها',
    previousDetail: 'آية كاملة، فتقرأ ما قبلها',
    surah: 'في أي سورة؟',
    surahDetail: 'آية كاملة، فتختار سورتها',
    /** After the detail of «في أي سورة؟». */
    surahScope: 'يحتاج ثلاث سور أو أكثر',
    /** A portion of fewer than three surahs started with «في أي سورة؟». */
    surahScopeStart: '«في أي سورة؟» يحتاج ثلاث سور أو أكثر. اختر ما هو أوسع، أو طريقة أخرى.',
  },
  /** The lawh at the top of the page: how the session goes. */
  board: {
    typeLabel: 'نوع الجلسة',
    tasmee: 'تسميع',
    /** At the foot of the lawh, pointing to the portions below. */
    then: 'ثم اختر من الأسفل ما تسمّعه',
    thenHelper: 'ثم اختر من الأسفل ما يُسمَّع',
  },
  /** «مقترح لك»: portions offered ready, each started with a tap. */
  presets: {
    title: 'مقترح لك',
    review: 'مواضع المراجعة',
    reviewDetail_zero: '',
    reviewDetail_one: 'موضع ينتظرك',
    reviewDetail_two: 'موضعان ينتظرانك',
    reviewDetail_few: '{{count, number}} مواضع تنتظرك',
    reviewDetail_many: '{{count, number}} موضعًا ينتظرك',
    reviewDetail_other: '{{count, number}} موضع ينتظرك',
    reviewStart: 'راجعها',
    memorized: 'محفوظك كله',
    /** What was memorized in the last two weeks, and before the last month. */
    recent: 'جديد حفظك',
    old: 'قديم حفظك',
    juz30: 'جزء عمّ',
    juz29: 'جزء تبارك',
    surahs_zero: '',
    surahs_one: 'سورة واحدة',
    surahs_two: 'سورتان',
    surahs_few: '{{count, number}} سور',
    surahs_many: '{{count, number}} سورة',
    surahs_other: '{{count, number}} سورة',
    /** On each card, by what the lawh is set to. */
    recite: 'ابدأ التسميع',
    exam: 'ابدأ الاختبار',
    /** Listening to someone else. */
    begin: 'ابدأ',
    preparing: 'جارٍ الإعداد…',
    /** A card, spoken: «ابدأ التسميع: جزء عمّ، الجزء ٣٠ · ٣٧ سورة». */
    label: '{{action}}: {{title}}، {{detail}}',
  },
  /** «مختاراتك»: selections saved under a name. */
  picks: {
    title: 'مختاراتك',
    count_zero: '',
    count_one: 'اختيار واحد',
    count_two: 'اختياران',
    count_few: '{{count, number}} اختيارات',
    count_many: '{{count, number}} اختيارًا',
    count_other: '{{count, number}} اختيار',
    new: 'اختيار جديد',
    firstDetail: 'سمِّ ما تعود إليه كثيرًا، كجزء تراجعه أو حفظ من تسمع له، ليبدأ بنقرة.',
    newDetail: 'اختر سورًا أو أجزاء أو أحزابًا، وسمّه لتعود إليه.',
    full: 'بلغت اثني عشر اختيارًا. احذف واحدًا لتضيف غيره.',
    /** «ابدأ التسميع: مراجعة الجمعة». */
    startLabel: '{{action}}: {{name}}',
    editLabel: 'تعديل {{name}}',
    edit: 'تعديل الاختيار',
    close: 'إغلاق',
    list: 'قائمة',
    listLabel: 'الاختيار من قائمة: السور والأجزاء والأحزاب والأرباع، أو آيات بعينها',
    empty: 'لم تختر شيئًا بعد.',
    nameLabel: 'اسم الاختيار',
    namePlaceholder: 'اسم تعرفه به، مثل: مراجعة الجمعة',
    emblemLabel: 'علامة الاختيار',
    emblems: {
      star: 'نجمة',
      crescent: 'هلال',
      arch: 'قوس',
      lantern: 'فانوس',
      drop: 'قطرة',
      leaf: 'ورقة',
      sun: 'شمس',
      knot: 'زخرفة',
    },
    save: 'حفظ',
    delete: 'حذف',
    confirmDelete: 'تأكيد الحذف',
  },
  /** The wheel of surahs, juz or hizbs a selection is chosen on. */
  dial: {
    /** «دائرة السور». */
    label: 'دائرة {{kind}}',
    kinds: {
      surah: 'السور',
      juz: 'الأجزاء',
      hizb: 'الأحزاب',
    },
    kindsLabel: 'ما في الدائرة',
    /** For a screen reader, on the wheel. */
    hint: 'اسحب للأعلى أو للأسفل للانتقال، وانقر مرتين للاختيار أو الإزالة.',
    how: 'أدِر الدائرة وانقر لتختار، أو اضغط مطولًا واسحب لتختار ما تمرّ عليه.',
    /** Whether the unit at the pointer is chosen (a surah, juz or hizb: no gender). */
    chosen: 'في اختيارك',
    partly: 'بعضه في اختيارك',
    notChosen: 'ليس في اختيارك',
    add: 'إضافة',
    remove: 'إزالة',
    /** How much of the Quran is chosen: «٤٪». */
    share: '{{value, number}}٪',
  },
  reach: {
    title: 'إلى أين تقرأ',
    ayah: 'آية',
    ayahs: 'ثلاث آيات',
    page: 'آخر الصفحة',
  },
  count: {
    title: 'عدد المواضع',
    /** A count option: «١٠ مواضع». */
    label_zero: 'لا مواضع',
    label_one: 'موضع واحد',
    label_two: 'موضعان',
    label_few: '{{count, number}} مواضع',
    label_many: '{{count, number}} موضعًا',
    label_other: '{{count, number}} موضع',
  },
  /**
   * Listening to someone else recite (a teacher, a parent): the text is shown to follow it, and
   * nothing is recorded. The wording speaks to the listener, and never assumes the reciter's
   * gender: verbal nouns and passives («إكمال الآية», «أُتقن»).
   */
  helper: {
    title: 'من يسمّع؟',
    self: 'أنا',
    other: 'غيري',
    selfDetail: 'تتلو من حفظك ثم تتحقق، وتُسجَّل نتائجك لتعود إليك مواضع المراجعة.',
    otherDetail: 'تسمع لغيرك: يظهر لك الموضع كاملًا لتتابع التلاوة، ولا يُسجَّل شيء في سجلك.',
    /** Next to the session's title. */
    badge: 'لغيرك',
    scopeTitle: 'ما يُسمَّع',
    /** Under the selection sheet's title. */
    selectionSubtitle: 'اختر السور أو الأجزاء أو المقاطع التي يُسمَّع منها.',
    /** In place of the kinds' details: what happens, without saying who does it. */
    cue: {
      completeDetail: 'أول كلمات الآية، ثم إكمالها',
      nextDetail: 'آية كاملة، ثم قراءة ما بعدها',
      previousDetail: 'آية كاملة، ثم قراءة ما قبلها',
      surahDetail: 'آية كاملة، ثم اختيار سورتها',
    },
    reach: 'مقدار التلاوة',
    examDescription: 'أسئلة منوّعة تطرحها كما يسأل المعلّم، وفي آخرها النتيجة.',
    /** What is asked at a place, as the task rather than an order to the reciter. */
    completeAyah: 'إكمال الآية',
    completeMore_zero: 'إكمال الآية',
    completeMore_one: 'إكمال الآية والآية التي بعدها',
    completeMore_two: 'إكمال الآية والآيتين بعدها',
    completeMore_few: 'إكمال الآية و{{count, number}} آيات بعدها',
    completeMore_many: 'إكمال الآية و{{count, number}} آية بعدها',
    completeMore_other: 'إكمال الآية و{{count, number}} آية بعدها',
    completePage: 'الإكمال إلى آخر الصفحة',
    after_zero: 'قراءة ما بعدها',
    after_one: 'قراءة الآية التي بعدها',
    after_two: 'قراءة الآيتين بعدها',
    after_few: 'قراءة {{count, number}} آيات بعدها',
    after_many: 'قراءة {{count, number}} آية بعدها',
    after_other: 'قراءة {{count, number}} آية بعدها',
    afterPage: 'قراءة ما بعدها إلى آخر الصفحة',
    before_zero: 'قراءة ما قبلها',
    before_one: 'قراءة الآية التي قبلها',
    before_two: 'قراءة الآيتين قبلها',
    before_few: 'قراءة {{count, number}} آيات قبلها',
    before_many: 'قراءة {{count, number}} آية قبلها',
    before_other: 'قراءة {{count, number}} آية قبلها',
    beforePage: 'قراءة ما قبلها من أول الصفحة',
    /** Above the grades: the highlighted words are read out, then the recitation is followed. */
    question: 'اقرأ المظلَّل، ثم قيّم التلاوة',
    grades: {
      good: 'إتقان',
      hesitant: 'تردّد',
      wrong: 'خطأ',
    },
    right: 'جواب صحيح',
    perfect: 'ما شاء الله، أُتقنت المواضع كلها',
    done: 'انتهى التسميع',
    /** «أُتقن ٨ من ١٠». */
    score: 'أُتقن {{good, number}} من {{total, number}}',
    rightScore: 'صحّ {{good, number}} من {{total, number}}',
    review: 'مواضع للمراجعة',
    retry: 'إعادة ما لم يُتقن',
    /** Under the places missed, and in the exam's result. */
    notRecorded: 'لا يُسجَّل شيء من هذا في سجلك.',
    result: 'النتيجة',
  },
  /** «اختبار الحفظ»: like a teacher's exam, mixed questions and a score at the end. */
  exam: {
    title: 'اختبار الحفظ',
    description: 'أسئلة منوّعة مما تسمّعه، كما يسألك المعلّم، وفي آخرها نتيجتك.',
    /** The number of questions: «١٠ أسئلة», «٢٠ سؤالًا». */
    questions_zero: 'لا أسئلة',
    questions_one: 'سؤال واحد',
    questions_two: 'سؤالان',
    questions_few: '{{count, number}} أسئلة',
    questions_many: '{{count, number}} سؤالًا',
    questions_other: '{{count, number}} سؤال',
    countLabel: 'عدد الأسئلة',
    /** Over the latest results, the last one first in words: «آخر نتيجة: ٨٫٥ من ١٠، جيد جدًا». */
    last: 'آخر نتيجة: {{points, number}} من {{total, number}}، {{grade}}',
    /** Spoken for the small chart of the latest results. */
    historyLabel_zero: '',
    historyLabel_one: 'نتيجة اختبارك الأخير',
    historyLabel_two: 'نتائج اختباريك الأخيرين',
    historyLabel_few: 'نتائج آخر {{count, number}} اختبارات',
    historyLabel_many: 'نتائج آخر {{count, number}} اختبارًا',
    historyLabel_other: 'نتائج آخر {{count, number}} اختبار',
    close: 'إنهاء الاختبار',
    /** «السؤال ٣ من ١٠». */
    position: 'السؤال {{position, number}} من {{total, number}}',
    /** Below a recitation question, before the answer is shown. */
    instruction: 'سمّع من حفظك، ثم اكشف الجواب.',
    show: 'كشف الجواب',
    /** A teacher's grades, from the share of points (a hesitation counts half). */
    grades: {
      excellent: 'ممتاز',
      veryGood: 'جيد جدًا',
      good: 'جيد',
      pass: 'مقبول',
      review: 'يحتاج إلى مراجعة',
    },
    result: 'نتيجتك',
    /** Under the score: «من ١٠». */
    outOf: 'من {{total, number}}',
    /** Spoken for the score: «٨٫٥ من ١٠، جيد جدًا». */
    scoreLabel: '{{points, number}} من {{total, number}}، {{grade}}',
    unanswered_zero: '',
    unanswered_one: 'بقي سؤال لم تُجب عنه.',
    unanswered_two: 'بقي سؤالان لم تُجب عنهما.',
    unanswered_few: 'بقيت {{count, number}} أسئلة لم تُجب عنها.',
    unanswered_many: 'بقي {{count, number}} سؤالًا لم تُجب عنه.',
    unanswered_other: 'بقي {{count, number}} سؤال لم تُجب عنه.',
    toUnanswered: 'الانتقال إلى الأسئلة الباقية',
    /** Under the list of places missed or hesitated over. */
    reviewNote: 'تعود إليك هذه المواضع في التسميع أكثر من غيرها.',
  },
  noPlaces: 'لا يكفي ما اخترته لموضع واحد. اختر سورًا أو مقاطع أطول.',
  review: {
    title: 'مواضع تحتاج مراجعة',
    description: 'ما أخطأت فيه أو تردّدت آخر مرة، ويعود إليك أكثر من غيره.',
    start: 'سمّع هذه المواضع',
    /** Under a place in the list: how it went last, and when. */
    wrong: 'أخطأت فيها · {{date}}',
    hesitant: 'تردّدت فيها · {{date}}',
    /** «سورة البقرة · الآية ٢٥٥» ({{surah}} already includes the word سورة). */
    place: '{{surah}} · الآية {{ayah, number}}',
    /** Below the first five. */
    more_zero: '',
    more_one: 'وموضع آخر ينتظر المراجعة.',
    more_two: 'وموضعان آخران ينتظران المراجعة.',
    more_few: 'و{{count, number}} مواضع أخرى تنتظر المراجعة.',
    more_many: 'و{{count, number}} موضعًا آخر ينتظر المراجعة.',
    more_other: 'و{{count, number}} موضع آخر ينتظر المراجعة.',
  },
  session: {
    close: 'إنهاء التسميع',
    /** «الموضع ٣ من ١٠». */
    position: 'الموضع {{position, number}} من {{total, number}}',
    next: 'الموضع التالي',
    previous: 'الموضع السابق',
    /** What to recite at a place. A short ayah may be shown whole; then what follows is recited. */
    completeAyah: 'أكمل الآية من حفظك',
    /** The rest of the ayah, then {{count}} whole ayahs after it. */
    completeMore_zero: 'أكمل الآية من حفظك',
    completeMore_one: 'أكمل الآية والآية التي بعدها',
    completeMore_two: 'أكمل الآية والآيتين بعدها',
    completeMore_few: 'أكمل الآية و{{count, number}} آيات بعدها',
    completeMore_many: 'أكمل الآية و{{count, number}} آية بعدها',
    completeMore_other: 'أكمل الآية و{{count, number}} آية بعدها',
    completePage: 'أكمل من حفظك إلى آخر الصفحة',
    after_zero: 'اقرأ ما بعدها من حفظك',
    after_one: 'اقرأ الآية التي بعدها',
    after_two: 'اقرأ الآيتين بعدها',
    after_few: 'اقرأ {{count, number}} آيات بعدها',
    after_many: 'اقرأ {{count, number}} آية بعدها',
    after_other: 'اقرأ {{count, number}} آية بعدها',
    afterPage: 'اقرأ ما بعدها إلى آخر الصفحة',
    /** «ما قبلها»: the {{count}} ayahs before the one shown. */
    before_zero: 'اقرأ ما قبلها من حفظك',
    before_one: 'اقرأ الآية التي قبلها',
    before_two: 'اقرأ الآيتين قبلها',
    before_few: 'اقرأ {{count, number}} آيات قبلها',
    before_many: 'اقرأ {{count, number}} آية قبلها',
    before_other: 'اقرأ {{count, number}} آية قبلها',
    beforePage: 'اقرأ ما قبلها من أول الصفحة',
    surahQuestion: 'في أي سورة هذه الآية؟',
    /** After a surah is chosen. */
    right: 'أصبت',
    /** {{surah}} includes the word سورة: «بل هي في سورة البقرة». */
    wrongAnswer: 'بل هي في {{surah}}',
    /** A surah choice, spoken. */
    choiceLabel: '{{surah}}، الخيار {{position, number}} من {{total, number}}',
    hint: 'تلميح',
    hintLabel: 'إظهار السورة ورقم الآية',
    /** The cue repeats elsewhere in the Quran, so the place is named from the start. */
    named: 'تتكرر هذه البداية في القرآن، فذكرنا موضعها.',
    /** Above (in «ما قبلها», below) the lighter ayahs shown with a cue that repeats word for word elsewhere. */
    contextBefore: 'يتكرر هذا الموضع في القرآن، فذكرنا ما قبله.',
    contextAfter: 'يتكرر هذا الموضع في القرآن، فذكرنا ما بعده.',
    /** The place's text with tajweed colours, as a document, named for screen readers. */
    textTitle: 'نص الموضع',
    hidden: 'كلمات مخفية تتلوها من حفظك',
    word: 'كلمة',
    wordLabel: 'كشف الكلمة التالية',
    ayah: 'آية',
    ayahLabel: 'كشف ما بقي من الآية',
    all: 'كشف الكل',
    allLabel: 'كشف ما بقي من الموضع',
    /** Shown once everything is revealed. */
    question: 'كيف كانت تلاوتك؟',
    usedHints: 'استعنت بكشف بعض الكلمات.',
    grades: {
      good: 'أتقنت',
      hesitant: 'تردّدت',
      wrong: 'أخطأت',
    },
    gradeLabel: '{{grade}}، الموضع {{position, number}}',
    listen: 'استماع',
    listenLabel: 'الاستماع إلى الموضع',
    stopListening: 'إيقاف الاستماع',
    open: 'فتح في المصحف',
    openLabel: 'فتح {{place}} في المصحف',
  },
  summary: {
    /** All places said well. */
    perfect: 'أحسنت، بارك الله لك',
    done: 'تقبّل الله منك',
    /** «أتقنت ٨ من ١٠». */
    score: 'أتقنت {{good, number}} من {{total, number}}',
    /** When every place was a surah question: «أصبت في ٨ من ١٠». */
    rightScore: 'أصبت في {{good, number}} من {{total, number}}',
    ungraded_zero: '',
    ungraded_one: 'بقي موضع لم تقيّمه.',
    ungraded_two: 'بقي موضعان لم تقيّمهما.',
    ungraded_few: 'بقيت {{count, number}} مواضع لم تقيّمها.',
    ungraded_many: 'بقي {{count, number}} موضعًا لم تقيّمه.',
    ungraded_other: 'بقي {{count, number}} موضع لم تقيّمه.',
    review: 'راجع هذه المواضع',
    retry: 'إعادة ما لم تتقنه',
    finish: 'العودة إلى التسميع',
  },
  /** On memorization and revision goals. */
  goal: {
    title: 'التسميع',
    description: 'اختبر ما حفظته: نعرض عليك موضعًا، فتسمّع من حفظك ما يتصل به.',
    start: 'سمّع محفوظك',
  },
  /** The selection sheet, when choosing what to recite. */
  selection: {
    title: 'ما تسمّعه',
    subtitle: 'اختر السور أو الأجزاء أو المقاطع التي تسمّعها.',
    close: 'إغلاق الاختيار',
    tabsLabel: 'طريقة الاختيار',
    add: 'إضافة المقطع إلى اختيارك',
    remove: 'إزالة المقطع من اختيارك',
    partial_zero: '{{count, number}} آية · اخترت بعضها',
    partial_one: 'آية واحدة',
    partial_two: 'آيتان · اخترت إحداهما',
    partial_few: '{{count, number}} آيات · اخترت بعضها',
    partial_many: '{{count, number}} آية · اخترت بعضها',
    partial_other: '{{count, number}} آية · اخترت بعضها',
    total_zero: 'لم تختر أي آية بعد',
    total_one: 'اخترت آية واحدة',
    total_two: 'اخترت آيتين',
    total_few: 'اخترت {{count, number}} آيات',
    total_many: 'اخترت {{count, number}} آية',
    total_other: 'اخترت {{count, number}} آية',
    confirm: 'اعتماد الاختيار',
  },
} as const;
