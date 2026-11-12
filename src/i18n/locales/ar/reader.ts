/** The mushaf reader: pages, toolbars, quick jump, ayah actions and tajweed. */
export default {
  /** A surah referred to by its number, e.g. "السورة 2". */
  surahNumber: 'السورة {{surah}}',
  ayah: {
    /** "سورة البقرة · الآية 5"; {{surah}} already includes the word سورة. */
    reference: '{{surah}} · الآية {{ayah}}',
    /** "الآية 5 · الصفحة 2" */
    location: 'الآية {{ayah}} · الصفحة {{page}}',
    /**
     * Screen reader label of an ayah; {{surah}} is the surah number, {{text}} the Quran text (or the
     * hidden-ayah label). Each placeholder must appear once: the tajweed text view fills them in itself.
     */
    spokenLabel: 'الآية {{ayah}} من السورة {{surah}}. {{text}}',
    /** Read instead of the text while an ayah is hidden for revision. */
    hidden: 'آية مخفية',
    /** Spoken label of the ayah-number marker, which opens the ayah's actions; {{surah}} is a number. */
    actions: 'خيارات الآية {{ayah}} من السورة {{surah}}',
    /** Screen reader custom action (the long press). */
    openActions: 'فتح خيارات الآية',
    /** Screen reader hint of an ayah's text. */
    hint: 'اضغط لإظهار أدوات القراءة، واضغط مطوّلًا لفتح خيارات الآية.',
    showTools: 'إظهار أدوات القراءة',
    /**
     * iOS hint for a group of {{count}} ayahs read as one paragraph. VoiceOver lists each ayah's
     * actions in its «الإجراءات» rotor.
     */
    groupHint_zero: 'اضغط مرتين لإظهار أدوات القراءة. وتجد خيارات الآية في قائمة الإجراءات.',
    groupHint_one: 'اضغط مرتين لإظهار أدوات القراءة. وتجد خيارات الآية في قائمة الإجراءات.',
    groupHint_two: 'اضغط مرتين لإظهار أدوات القراءة. وتجد خيارات كل آية في قائمة الإجراءات.',
    groupHint_few: 'اضغط مرتين لإظهار أدوات القراءة. وتجد خيارات كل آية في قائمة الإجراءات.',
    groupHint_many: 'اضغط مرتين لإظهار أدوات القراءة. وتجد خيارات كل آية في قائمة الإجراءات.',
    groupHint_other: 'اضغط مرتين لإظهار أدوات القراءة. وتجد خيارات كل آية في قائمة الإجراءات.',
  },
  divisions: {
    /** "الجزء 2", or several: "الجزء 2–3". */
    juz: 'الجزء {{juz}}',
    /** "الحزب 5", or several: "الحزب 5–6". */
    hizb: 'الحزب {{hizb}}',
    quarter: 'الحزب {{hizb}} · الربع {{rub}}/4',
    /** {{range}} is "1–2" or "1، 3"; the isolates keep "1–2/4" in order inside right-to-left text. */
    quarterRange: 'الحزب {{hizb}} · الربع ⁦{{range}}/4⁩',
  },
  /** The reader paged by thumun (Warsh, an eighth of a hizb to a page, 480 in all). */
  thumun: {
    /** A page's name, in place of its number: "الحزب 2 · الثمن 1". */
    position: 'الحزب {{hizb}} · الثمن {{thumun}}',
    /** Spoken page indicator: "الحزب 2 · الثمن 1، 9 من 480". */
    spoken: '{{position}}، {{page}} من {{total}}',
    /** Under an ayah: "الآية 5 · الحزب 2 · الثمن 1". */
    ayahLocation: 'الآية {{ayah}} · {{position}}',
    /** Jump drawer subtitle: "ورش · أنت في الحزب 2 · الثمن 1". */
    currentPosition: '{{riwayah}} · أنت في {{position}}',
    /** Jump tab and fields. */
    byThumun: 'بالثمن',
    hizb: 'الحزب',
    thumun: 'الثمن',
    next: 'الثمن التالي',
    previous: 'الثمن السابق',
    error: 'أدخل رقم الحزب من {{firstHizb}} إلى {{lastHizb}}، ورقم الثمن من 1 إلى 8.',
    /** Jump button: "الانتقال إلى الحزب 2 · الثمن 1". */
    to: 'الانتقال إلى {{position}}',
  },
  screen: {
    sessionError: 'تعذّر فتح الورد. أعد المحاولة.',
    openMushaf: 'فتح المصحف',
    fontError: 'تعذّر تحميل خط المصحف',
    fontErrorDetail: 'أعد فتح التطبيق لتحميل خط المصحف.',
    /** The Quran text could not be downloaded. */
    quranError: 'تعذّر تحميل المصحف',
    quranErrorDetail: 'تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.',
    preparing: 'جارٍ تجهيز المصحف…',
    preparingDetail: 'جارٍ تحميل الرواية المختارة وخطها.',
    pageUnavailable: 'تعذّر عرض هذه الصفحة.',
    /** Page pill inside a goal's reading: "2 من 5 · ص 13" (ص = page of the mushaf; space is tight). */
    sessionPage: '{{index, number}} من {{total, number}} · ص {{page, number}}',
  },
  toolbar: {
    label: 'أدوات القراءة',
    settings: 'إعدادات القراءة',
    search: 'البحث في القرآن',
    /** Spoken label of the location chip: "سورة البقرة، الجزء 1 · الحزب 2، فتح الفهرس". */
    location: '{{surah}}، {{location}}، فتح الفهرس',
    menu: 'فتح قائمة التطبيق',
  },
  controls: {
    navigation: 'التنقل في المصحف',
    practiceTools: 'أدوات مراجعة الصفحة',
    showAll: 'إظهار الكل',
    showAllLabel: 'إظهار الصفحة كاملة وإنهاء المراجعة',
    /** Button that reveals the next hidden word. */
    word: 'كلمة',
    wordLabel: 'إظهار الكلمة التالية',
    /** Button that reveals the next hidden ayah. */
    ayah: 'آية',
    ayahLabel: 'إظهار الآية التالية كاملة',
    /** Spoken label of the link to the bookmarked ayahs. */
    bookmarks: 'العلامات',
    nextPage: 'الصفحة التالية',
    previousPage: 'الصفحة السابقة',
    pageOf: 'الصفحة {{page}} من {{total}}',
    /** {{position}} is the page indicator, e.g. "الصفحة 3 من 604". */
    jump: '{{position}}، الانتقال إلى صفحة أو آية',
    page: 'صفحة {{page}}',
    hideTools: 'إخفاء أدوات القراءة',
    practice: 'إخفاء آيات الصفحة للمراجعة',
  },
  drawer: {
    close: 'إغلاق الانتقال السريع',
    title: 'انتقال سريع',
    titleSession: 'انتقال داخل الورد',
    /** "ورش · أنت في الصفحة 12" */
    currentPosition: '{{riwayah}} · أنت في الصفحة {{page}}',
  },
  jump: {
    method: 'طريقة الانتقال',
    byPage: 'بالصفحة',
    byAyah: 'بالآية',
    /** Hint under a number field: "من 1 إلى 604". */
    range: 'من {{first}} إلى {{last}}',
    sessionPages: 'صفحات الورد: من {{first}} إلى {{last}}',
    chooseSurahFirst: 'اختر السورة أولًا',
    withinSession: 'ضمن الورد',
    pageError: 'أدخل رقم صفحة من {{first}} إلى {{last}}.',
    sessionAyahError: 'اختر آية من آيات الورد.',
    /** Ayah numbering differs between riwayat. */
    ayahError: 'تحقّق من رقمي السورة والآية في الرواية المختارة.',
    toPage: 'الانتقال إلى الصفحة {{page}}',
    toAyah: 'الانتقال إلى الآية {{ayah}}',
    toDestination: 'الانتقال إلى الموضع',
    increasePage: 'زيادة رقم الصفحة',
    decreasePage: 'تقليل رقم الصفحة',
    pageNumber: 'رقم الصفحة',
    surah: 'السورة',
    /** Under the chosen surah's name. */
    surahHint: 'رقمها {{number}}',
    /** Spoken hint of the surah field, and the title of the list of surahs. */
    changeSurah: 'اضغط لاختيار سورة أخرى',
    chooseSurah: 'اختيار السورة',
    sessionSurahs: 'سور الورد',
    backToForm: 'العودة إلى اختيار الموضع',
    surahCount_zero: 'لا سور',
    surahCount_one: 'سورة واحدة',
    surahCount_two: 'سورتان',
    surahCount_few: '{{count, number}} سور',
    surahCount_many: '{{count, number}} سورة',
    surahCount_other: '{{count, number}} سورة',
    searchSurah: 'البحث عن سورة',
    searchPlaceholder: 'اسم السورة أو رقمها',
    noSurah: 'لا توجد سورة بهذا الاسم أو الرقم.',
    /** Under each surah in the list: its ayahs and the page it starts on. */
    ayahs_zero: 'لا آيات',
    ayahs_one: 'آية واحدة',
    ayahs_two: 'آيتان',
    ayahs_few: '{{count, number}} آيات',
    ayahs_many: '{{count, number}} آية',
    ayahs_other: '{{count, number}} آية',
    startPage: 'صفحة {{page, number}}',
    ayahNumber: 'رقم الآية',
    /** Small caption above the destination's surah name. */
    destination: 'الموضع',
    destinationSession: 'الموضع في الورد',
    chooseDestination: 'اختر موضعًا للانتقال إليه',
  },
  actions: {
    close: 'إغلاق خيارات الآية',
    copied: 'نُسخت الآية.',
    copyFailed: 'تعذّر نسخ الآية. أعد المحاولة.',
    /** Shown on the bookmark button once the ayah is bookmarked ("marked"; not محفوظة, which reads as memorized). */
    bookmarked: 'مُعلَّمة',
    bookmark: 'وضع علامة',
    removeBookmark: 'إزالة العلامة',
    copy: 'نسخ الآية',
    share: 'مشاركة',
    /** Short labels under the icons; what each does is spoken from the recitation's keys. */
    listen: 'استماع',
    repeat: 'تكرار',
    /** Bookmarks stay in memory until the app is closed. */
    bookmarkStorageError: 'تعذّر حفظ العلامات على جهازك. ستبقى متوفرة إلى أن تُغلق التطبيق.',
  },
  /** An ayah of prostration (سجدة التلاوة): its sign on the page, and a note in the ayah's sheet. */
  sajda: {
    /** Spoken on the sign ۩ at the end of the ayah. */
    sign: 'علامة السجدة',
    signHint: 'فتح الآية ودعاء سجود التلاوة',
    title: 'آية سجدة',
    lead: 'يُشرع السجود عند تلاوة هذه الآية. ومما يُقال في سجود التلاوة:',
    dua: 'سَجَدَ وَجْهِي لِلَّذِي خَلَقَهُ، وَشَقَّ سَمْعَهُ وَبَصَرَهُ، بِحَوْلِهِ وَقُوَّتِهِ',
    source: 'رواه الترمذي وأبو داود والنسائي',
  },
  /**
   * The ayah's sciences in its sheet, as Quranpedia gives them: three arches (its meaning; its
   * revelation and recitation; what was handed down about it), each name opening its content.
   */
  sciences: {
    title: 'علوم الآية',
    /** The way back from a science to the arches. */
    back: 'العودة إلى علوم الآية',
    /** Spoken on an ayah that opens in the mushaf. */
    open: 'فتح الآية في المصحف',
    /** Under prose shown in part. */
    more: 'قراءة المزيد',
    less: 'إخفاء',
    groups: { meaning: 'المعنى', revelation: 'النزول والتلاوة', narration: 'الأثر والتدبر' },
    names: {
      tafsir: 'التفسير',
      meanings: 'معاني الكلمات',
      e3rab: 'الإعراب',
      translations: 'الترجمات',
      asbab: 'أسباب النزول',
      qiraat: 'القراءات',
      similar: 'المتشابهات',
      nasekh: 'الناسخ والمنسوخ',
      mutshabeh: 'متشابه القرآن',
      sayings: 'المرويات',
      notes: 'التدبر',
      topics: 'الموضوعات',
      fatwa: 'الفتاوى',
    },
    /** Spoken after each name in the arches: what it holds of the ayah. */
    hints: {
      tafsir: 'ما قاله المفسرون فيها',
      meanings: 'معاني غريب ألفاظها',
      e3rab: 'إعراب كلماتها',
      translations: 'معانيها بلغات أخرى',
      asbab: 'الأحداث المرتبطة بنزولها',
      qiraat: 'أوجه قراءتها',
      similar: 'الآيات التي تشبهها في لفظها',
      nasekh: 'ما قيل في نسخها',
      mutshabeh: 'بيان ما قد يُشكِل من معناها',
      sayings: 'ما رُوي فيها عن السلف',
      notes: 'وقفات وتأملات فيها',
      topics: 'موضوعات القرآن التي تتناولها',
      fatwa: 'فتاوى العلماء فيها',
    },
    books: {
      choose: 'اختيار الكتاب',
      /** Under the open book: how many books treat the ayah, all of them to choose from. */
      among_zero: 'كتاب واحد',
      among_one: 'كتاب واحد',
      among_two: 'واحد من كتابين',
      among_few: 'واحد من {{count}} كتب',
      among_many: 'واحد من {{count}} كتابًا',
      among_other: 'واحد من {{count}} كتاب',
      fundamental: 'الكتب المعتمدة',
      rest: 'سائر الكتب',
      search: 'البحث باسم الكتاب أو مؤلفه',
      none: 'لم نعثر على كتاب بهذا الاسم.',
      /** The author's death, in years of the Hijra: "ت 774هـ". */
      died: 'ت {{year}}هـ',
      /** Where the text is in the book. */
      partPage: 'الجزء {{part}}، الصفحة {{page}}',
      page: 'الصفحة {{page}}',
    },
    qiraat: {
      intro_zero: 'لم يختلف القراء في كلماتها.',
      intro_one: 'اختلف القراء في كلمة واحدة منها.',
      intro_two: 'اختلف القراء في كلمتين منها.',
      intro_few: 'اختلف القراء في {{count}} كلمات منها.',
      intro_many: 'اختلف القراء في {{count}} كلمة منها.',
      intro_other: 'اختلف القراء في {{count}} كلمة منها.',
      /** A rawi and the imam of his qira'a: "ورش عن نافع". */
      rawi: '{{rawi}} عن {{qiraa}}',
      /** The rawi of the riwayah the reader reads. */
      own: '{{name}}، روايتك',
      listen: 'الاستماع إلى قراءة {{name}}',
      stop: 'إيقاف قراءة {{name}}',
      failed: 'تعذّر تشغيل هذه القراءة. أعد المحاولة.',
    },
    similar: {
      /** Above the note that tells the similar ayahs apart. */
      note: 'للتمييز بينها',
      here: 'هذه الآية',
      video: 'شرح المتشابهات',
    },
    topics: {
      /** How many ayahs speak of the topic; opens them. */
      ayahs_zero: 'لا آيات',
      ayahs_one: 'آية واحدة',
      ayahs_two: 'آيتان',
      ayahs_few: '{{count}} آيات',
      ayahs_many: '{{count}} آية',
      ayahs_other: '{{count}} آية',
    },
    fatwa: {
      /** The marks of a question and its answer, as in the books of fatwas. */
      question: 'س',
      answer: 'ج',
      /** Who gave the fatwa. */
      by: '{{names}}',
    },
    notes: {
      more: 'عرض المزيد',
      image: 'فتح الصورة',
      video: 'مقطع مرئي',
    },
    sayings: {
      all: 'الكل',
      /** Who narrated it: "عن عبد الله بن عباس". */
      from: 'عن {{names}}',
    },
    translations: {
      languages: 'لغات الترجمة',
    },
  },
  related: {
    /** {{references}} lists the matching "surah:ayah" references in the Hafs numbering, used by the source. */
    sources: 'موضع الآية بترقيم حفص: {{references}}. المصدر: الموسوعة القرآنية.',
    loading: 'جارٍ تحميل المحتوى…',
    loadError: 'تعذّر تحميل المحتوى. تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.',
    empty: 'لا يتوفر محتوى لهذه الآية.',
    /** Caption above each tafsir or translation: the Hafs-numbered ayah it explains, e.g. "الآية 2:5 بترقيم حفص". */
    parallelReference: 'الآية {{surah}}:{{ayah}} بترقيم حفص',
    /** Content shown from the offline cache; follows the caption above after " · ". */
    stale: 'نسخة مخزّنة على الجهاز',
  },
  page: {
    tajweedError: 'تعذّر تحميل ألوان التجويد. يظهر النص كاملًا دون ألوان.',
  },
  printed: {
    /** Spoken label of the printed page. */
    pageLabel: 'الصفحة {{page}} من المصحف',
    /** Screen reader label of an ayah on the printed page; {{surah}} is a number, {{text}} the Quran text. */
    regionLabel: 'الآية {{ayah}} من السورة {{surah}}. {{text}}. اضغط لإظهار أدوات القراءة، واضغط على رقم الآية أو اضغط عليها مطوّلًا لفتح خياراتها.',
    regionHint: 'اضغط لإظهار أدوات القراءة، واضغط على رقم الآية أو اضغط عليها مطوّلًا لفتح خياراتها.',
    loadError: 'تعذّر تحميل هذه الصفحة من المصحف.',
    loading: 'جارٍ تحميل صفحة المصحف…',
    /** "سورة الفاتحة" */
    surahTitle: 'سورة {{name}}',
  },
  tajweed: {
    loadError: 'تعذّر تحميل مصحف التجويد.',
    loading: 'جارٍ تحميل مصحف التجويد…',
    /** Spoken title of the Hafs tajweed page. */
    pageTitle: 'مصحف التجويد برواية حفص، الصفحة {{page}}',
    textError: 'تعذّر عرض النص القرآني.',
    fontLoading: 'جارٍ تحميل خط المصحف…',
    /** {{riwayah}} is the short riwayah name, e.g. "ورش". */
    previewTitle: 'معاينة ألوان التجويد برواية {{riwayah}}',
    /** Spoken title; {{surah}} is the surah number. */
    textTitle: 'رواية {{riwayah}} بألوان التجويد، الصفحة {{page}}، السورة {{surah}}',
    /** Label of a word of the ayah numbered {{ayah}}. */
    ayah: 'الآية {{ayah}}',
    /** Label of the ayah-number marker, which opens the ayah's actions. */
    ayahActions: 'خيارات الآية {{ayah}}',
  },
  /**
   * A tajweed rule, opened by a tap on a coloured part of the text: its name, and what it is in a
   * sentence or two for someone who has not studied tajweed. `warsh`: the wording for Warsh (by
   * al-Azraq's way) where the length differs from Hafs's.
   */
  tajweedRules: {
    /** Spoken title of the dialog: «حكم التجويد: قلقلة». */
    spoken: 'حكم التجويد: {{rule}}',
    /** Over the word the coloured part is in. */
    inWord: 'في كلمة',
    listen: 'استمع إلى الآية',
    note: 'قد تجتمع في الحرف أحكام متعددة، فيظهر بلون أحدها.',
    ghunna: { name: 'غنة', text: 'صوت يخرج من الخيشوم مع النون والميم المشدّدتين، ويُمدّ بمقدار حركتين.' },
    qalqala: { name: 'قلقلة', text: 'اضطراب خفيف في صوت الحرف الساكن حتى تُسمع له نبرة. حروفها خمسة: ق، ط، ب، ج، د.' },
    idghamGhunna: { name: 'إدغام بغنة', text: 'إدخال النون الساكنة أو التنوين في الحرف الذي بعدهما مع غنة بمقدار حركتين. حروفه: ي، ن، م، و.' },
    idghamNoGhunna: { name: 'إدغام بغير غنة', text: 'إدخال النون الساكنة أو التنوين في اللام أو الراء بعدهما دون غنة.' },
    iqlab: { name: 'إقلاب', text: 'قلب النون الساكنة أو التنوين ميمًا مخفاة مع غنة إذا جاءت بعدهما باء.' },
    ikhfa: { name: 'إخفاء حقيقي', text: 'النطق بالنون الساكنة أو التنوين بين الإظهار والإدغام مع غنة بمقدار حركتين، وذلك عند خمسة عشر حرفًا.' },
    ikhfaShafawi: { name: 'إخفاء شفوي', text: 'إخفاء الميم الساكنة مع غنة إذا جاءت بعدها باء.' },
    idghamShafawi: { name: 'إدغام شفوي', text: 'إدغام الميم الساكنة في ميم بعدها مع غنة بمقدار حركتين.' },
    idghamLetters: { name: 'إدغام حرف في حرف', text: 'يُدغم الحرف في الذي بعده لتماثلهما أو تقاربهما، فلا يُنطق بالأول ويُشدَّد الثاني.' },
    silent: { name: 'حرف لا يُنطق', text: 'حرف مرسوم في المصحف لا يُنطق به عند القراءة.' },
    hamzatWasl: { name: 'همزة وصل', text: 'همزة تُنطق عند البدء بالكلمة، وتسقط عند وصل الكلمة بما قبلها.' },
    maddNatural: { name: 'مد طبيعي', text: 'مدّ حرف المد بمقدار حركتين، دون زيادة.' },
    maddSeparate: {
      name: 'مد منفصل',
      text: 'حرف مد في آخر كلمة بعده همزة في أول الكلمة التالية. يُمدّ عند حفص أربع حركات أو خمسًا.',
      warsh: 'حرف مد في آخر كلمة بعده همزة في أول الكلمة التالية. يُمدّ عند ورش ست حركات.',
    },
    maddConnected: {
      name: 'مد متصل',
      text: 'حرف مد بعده همزة في الكلمة نفسها. يُمدّ عند حفص أربع حركات أو خمسًا.',
      warsh: 'حرف مد بعده همزة في الكلمة نفسها. يُمدّ عند ورش ست حركات.',
    },
    maddNecessary: { name: 'مد لازم', text: 'حرف مد بعده حرف ساكن سكونًا أصليًا أو مشدّد. يُمدّ ست حركات.' },
    maddBadal: { name: 'مد البدل', text: 'حرف مد قبله همزة، مثل «ءَامَنوا». يُمدّ عند ورش حركتين أو أربعًا أو ستًّا.' },
    maddLeen: { name: 'مد اللين المهموز', text: 'واو أو ياء ساكنة قبلها فتحة وبعدها همزة في الكلمة نفسها، مثل «شَيْء». يُمدّ عند ورش أربع حركات أو ستًّا.' },
    maddStop: { name: 'مد عارض للسكون', text: 'حرف مد بعده حرف يُسكَّن عند الوقف عليه. يُمدّ حركتين أو أربعًا أو ستًّا.' },
    naql: { name: 'نقل الهمز', text: 'تُنقل حركة الهمزة إلى الحرف الساكن قبلها وتُحذف الهمزة، مثل «قَدَ افْلَحَ».' },
    ibdal: { name: 'إبدال الهمز', text: 'تُبدل الهمزة الساكنة حرف مد يناسب حركة ما قبلها، مثل «يُومِنون».' },
    tashil: { name: 'تسهيل الهمز', text: 'تُنطق الهمزة بينها وبين حرف المد الذي يناسب حركتها، فلا تُحقَّق كاملة.' },
    taqlil: { name: 'تقليل', text: 'النطق بالألف بين الفتح والإمالة، فتميل قليلًا نحو الياء.' },
    imala: { name: 'إمالة', text: 'تقريب الفتحة من الكسرة والألف من الياء.' },
    raTarqiq: { name: 'ترقيق الراء', text: 'تُنطق الراء رقيقة غير مفخّمة. ومن ذلك عند ورش أن تسبقها كسرة أو ياء ساكنة.' },
    lamTaghliz: { name: 'تغليظ اللام', text: 'تُنطق اللام مفخّمة، وذلك عند ورش إذا كانت مفتوحة وقبلها صاد أو طاء أو ظاء.' },
  },
  warshLegend: {
    /** Expandable row in the settings, under the Warsh tajweed option. */
    title: 'دليل ألوان التجويد',
    note: 'قد تنطبق على الحرف أحكام متعددة، فيظهر بلون أحدها. ولا يدل اللون على عدد حركات المد.',
    /** Tajweed rules, as named in the Warsh color legend. */
    rules: {
      maddaNormal: 'مد طبيعي أو عارض للسكون',
      maddaPermissible: 'مد منفصل أو بدل أو لين مهموز',
      maddaObligatory: 'مد متصل',
      maddaNecessary: 'مد لازم',
      ghunna: 'غنة',
      /** Covers idgham with and without ghunna (same color). */
      idgham: 'إدغام',
      ikhfa: 'إخفاء حقيقي',
      ikhfaShafawi: 'إخفاء شفوي',
      iqlab: 'إقلاب',
      qalqala: 'قلقلة',
      naql: 'نقل الهمز أو إبداله',
      tashil: 'تسهيل الهمز',
      taqlil: 'تقليل أو إمالة',
      raTarqiq: 'ترقيق الراء',
      lamTaghliz: 'تغليظ اللام',
      silent: 'حرف لا يُنطق',
    },
  },
  index: {
    /** Where a surah was revealed, as the mushaf's surah titles say it. */
    revelation: { meccan: 'مكية', medinan: 'مدنية' },
    /** Detail under a surah in the index: "مدنية · 286 آية". */
    surahDetail: '{{revelation}} · {{ayahs}}',
    /** The surah's size in that detail: "286 آية", "7 آيات". Latin digits, like the rest of the index. */
    ayahCount_zero: '{{count}} آية',
    ayahCount_one: 'آية واحدة',
    ayahCount_two: 'آيتان',
    ayahCount_few: '{{count}} آيات',
    ayahCount_many: '{{count}} آية',
    ayahCount_other: '{{count}} آية',
  },
  ayahCard: {
    themes: { emerald: 'زمردي', paper: 'ورقي', night: 'ليلي' },
    shareDialogTitle: 'مشاركة بطاقة الآية',
    /** Title of the shared image file: "بطاقة آية · قرآني". */
    shareTitle: 'بطاقة آية · {{app}}',
  },
} as const;
