/** Listening to the recitation: the player in the reader, the ayah sheet's actions, and the recitation settings. */
export default {
  /** Lock screen and notification title; {{surah}} already includes the word سورة. */
  lockScreen: { title: '{{surah}} · الآية {{ayah, number}}' },
  /** Reader toolbar button, before listening starts. */
  start: 'الاستماع إلى التلاوة',
  /** Reader toolbar button while listening. */
  stop: 'إيقاف التلاوة',
  play: 'متابعة التلاوة',
  pause: 'إيقاف مؤقت',
  next: 'الآية التالية',
  previous: 'الآية السابقة',
  /** While whole surahs play, the same buttons move by surah. */
  nextSurah: 'السورة التالية',
  previousSurah: 'السورة السابقة',
  bar: {
    label: 'التحكم في التلاوة',
    /** {{surah}} already includes the word سورة. */
    basmala: '{{surah}} · البسملة',
    ayah: '{{surah}} · الآية {{ayah, number}}',
    loading: 'جارٍ التحميل…',
    /** Which recitation of the current ayah is playing: "المرة ٢ من ٣". */
    repeatProgress: 'المرة {{heard, number}} من {{repeat, number}}',
    /** The same, when the ayah repeats until stopped. */
    repeatProgressEndless: 'المرة {{heard, number}}',
    /** The seek bar of a whole surah's recording. */
    seek: 'موضع التلاوة في السورة',
    /** Its spoken value: «3:12 من 24:05». */
    time: '{{position}} من {{duration}}',
  },
  /** Pausing on its own, for falling asleep to the recitation (the moon in the bar). */
  sleep: {
    /** Spoken name of the moon button: «إيقاف التلاوة تلقائيًا: بعد ١٥ دقيقة». */
    spoken: 'إيقاف التلاوة تلقائيًا: {{when}}',
    hint: 'تغيير موعد الإيقاف',
    off: 'غير مفعّل',
    /** Under the title while it is on: «تتوقف بعد ١٥ دقيقة». */
    pauses: 'تتوقف {{when}}',
    atSurahEnd: 'عند نهاية السورة',
    inMinutes_zero: 'الآن',
    inMinutes_one: 'بعد دقيقة واحدة',
    inMinutes_two: 'بعد دقيقتين',
    inMinutes_few: 'بعد {{count, number}} دقائق',
    inMinutes_many: 'بعد {{count, number}} دقيقة',
    inMinutes_other: 'بعد {{count, number}} دقيقة',
  },
  repeat: {
    /** How many times each ayah is recited, in a sentence: "تكرار كل آية: ٣ مرات". */
    spoken: 'تكرار كل آية: {{times}}',
    /** The same while whole surahs play: "تكرار السورة: مرتان". */
    surahSpoken: 'تكرار السورة: {{times}}',
    times_zero: 'دون تكرار',
    times_one: 'مرة واحدة',
    times_two: 'مرتان',
    times_few: '{{count, number}} مرات',
    times_many: '{{count, number}} مرة',
    times_other: '{{count, number}} مرة',
    /** Repeat until the listener stops. */
    endless: 'تكرار مستمر',
    /** Short chip text beside the repeat icon: the number of times, or ∞. */
    chip: '{{count, number}}',
    chipEndless: '∞',
  },
  ayahSheet: {
    fromHere: 'الاستماع من هذه الآية',
    fromHereDetail: 'تستمر التلاوة آية بعد آية',
    /** Whole surahs chosen, and the reciter's timings place the ayah in the recording. */
    fromHereSurahDetail: 'من تسجيل السورة كاملة',
    /** Whole surahs chosen, without timings: the recording can only start from the top. */
    wholeSurah: 'الاستماع إلى السورة كاملة',
    wholeSurahDetail: 'يبدأ التسجيل من أول السورة',
    repeatAyah: 'تكرار هذه الآية',
    /** How many times the ayah is recited (the chosen repetition, always 2 or more). */
    repeatAyahDetail_zero: 'تتكرر حتى توقف التلاوة',
    repeatAyahDetail_one: 'تُتلى مرة واحدة',
    repeatAyahDetail_two: 'تُتلى مرتين',
    repeatAyahDetail_few: 'تُتلى {{count, number}} مرات',
    repeatAyahDetail_many: 'تُتلى {{count, number}} مرة',
    repeatAyahDetail_other: 'تُتلى {{count, number}} مرة',
    /** No repetition chosen: the ayah repeats until the listener stops it. */
    repeatAyahEndless: 'تتكرر حتى توقف التلاوة',
  },
  styles: { murattal: 'مرتّل', mujawwad: 'مجوّد', muallim: 'معلّم' },
  /** A whole-surah recording with ayah timings: the page follows the ayah being recited. */
  follows: 'تتبّع الآيات',
  /** A reciter who recorded only part of the Quran. */
  partial_zero: 'لا سور مسجلة',
  partial_one: 'سورة واحدة مسجلة',
  partial_two: 'سورتان مسجلتان',
  partial_few: '{{count, number}} سور مسجلة',
  partial_many: '{{count, number}} سورة مسجلة',
  partial_other: '{{count, number}} سورة مسجلة',
  settings: {
    /** Ayah by ayah, or whole surahs; each keeps its own reciter and repetition. */
    listening: {
      title: 'طريقة الاستماع',
      description: 'يمكنك اختيار القارئ وعدد مرات التكرار لكل طريقة على حدة.',
      ayah: { label: 'آية بعد آية', detail: 'تسجيل مستقل لكل آية يتيح تكرارها والتنقل بين الآيات، مع انتقال الصفحات تلقائيًا أثناء التلاوة.' },
      surah: { label: 'السورة كاملة', detail: 'تستمع إلى السورة كاملة بتسجيل متصل، ثم تبدأ السورة التالية.' },
      /** Repeating one ayah and a goal's portion need each ayah on its own. */
      surahNote: 'عند تكرار آية واحدة أو الاستماع إلى ورد، تُستخدم تسجيلات «آية بعد آية» والقارئ المحدد لها.',
    },
    reciter: {
      title: 'القارئ',
      /** {{riwayah}} is e.g. «ورش عن نافع». */
      description: 'تلاوات برواية {{riwayah}} من الموسوعة القرآنية.',
      /** The same, for whole-surah recordings. */
      surahDescription: 'تسجيلات السور كاملة برواية {{riwayah}} من الموسوعة القرآنية.',
      change: 'تغيير القارئ',
      /** Visible text of the change button beside the reciter's name. */
      changeShort: 'تغيير',
      loading: 'جارٍ تحميل قائمة القرّاء…',
    },
    repeat: {
      title: 'تكرار الآيات',
      description: 'حدّد عدد مرات تكرار كل آية قبل الانتقال إلى التالية، ليساعدك ذلك على الحفظ والمراجعة.',
      surahTitle: 'تكرار السورة',
      surahDescription: 'عدد مرات تلاوة السورة قبل الانتقال إلى التي تليها.',
      /** Beside the − and + of the count. */
      count: 'عدد المرات',
      fewer: 'مرات أقل',
      more: 'مرات أكثر',
      /** A switch under the count: repeat until the listener stops. */
      endless: 'تكرار دون توقف',
      endlessDetail: 'تتكرر كل آية حتى توقف التلاوة.',
      surahEndlessDetail: 'تتكرر السورة حتى توقف التلاوة.',
    },
    offline: {
      title: 'الاستماع دون اتصال',
      description: 'نزّل تلاوة القارئ إلى جهازك لتستمع إليها دون إنترنت.',
      phoneOnly: 'التنزيل متوفر في تطبيق الهاتف.',
      none: 'لم تنزّل أي سورة بصوت هذا القارئ بعد.',
      complete: 'التلاوة كاملة على جهازك',
      saved_zero: 'لا سور على جهازك',
      saved_one: 'سورة واحدة على جهازك',
      saved_two: 'سورتان على جهازك',
      saved_few: '{{count, number}} سور على جهازك',
      saved_many: '{{count, number}} سورة على جهازك',
      saved_other: '{{count, number}} سورة على جهازك',
      /** After the saved surahs: "١٢ سورة على جهازك · ٨٤ ميغابايت". */
      size: '{{saved}} · {{size}}',
      megabytes: '{{value, number}} ميغابايت',
      gigabytes: '{{value, number}} غيغابايت',
      /** {{surah}} already includes the word سورة; {{done}} of {{total}} counts surahs. */
      progress: 'جارٍ تنزيل {{surah}} ({{done, number}} من {{total, number}})',
      downloadAll: 'تنزيل المصحف كاملًا',
      resume: 'إكمال التنزيل',
      chooseSurahs: 'تنزيل سور مختارة',
      cancel: 'إيقاف التنزيل',
      delete: 'حذف التلاوة من جهازك',
      deleteConfirm: 'حذف جميع تلاوات {{name}} المنزّلة؟',
      /** Delete button of another saved reciter. */
      deleteOther: 'حذف تلاوة {{name}} من جهازك',
      confirmDelete: 'حذف',
      keep: 'إلغاء',
      networkError: 'توقف التنزيل بسبب انقطاع الاتصال. بقيت التلاوات المنزّلة على جهازك. أعد المحاولة عند عودة الاتصال.',
      storageError: 'لا توجد مساحة كافية على جهازك لإكمال التنزيل.',
      /** Downloads continue only while the app is open. */
      keepOpen: 'يستمر التنزيل ما دام التطبيق مفتوحًا.',
      others: 'تلاوات أخرى على جهازك',
    },
  },
  reciterSheet: {
    title: 'اختيار القارئ',
    /** {{riwayah}} is e.g. «ورش عن نافع». */
    subtitle: 'قرّاء رواية {{riwayah}}',
    surahSubtitle: 'تسجيلات السور كاملة برواية {{riwayah}}',
    close: 'إغلاق اختيار القارئ',
    searchLabel: 'البحث عن قارئ',
    searchPlaceholder: 'اسم القارئ',
    empty: 'لا يوجد قارئ بهذا الاسم.',
    onDevice: 'على جهازك',
    /** The listen button of each reciter: a short sample from the opening of Al-Fatiha. */
    sample: 'الاستماع إلى عيّنة من تلاوة {{name}}',
    sampleStop: 'إيقاف عيّنة {{name}}',
    sampleFailed: 'تعذّر تشغيل العيّنة. تحقّق من اتصالك بالإنترنت وأعد المحاولة.',
  },
  surahSheet: {
    title: 'تنزيل سور مختارة',
    subtitle: 'اختر السور التي تريد الاستماع إليها دون اتصال.',
    close: 'إغلاق تنزيل السور',
    searchLabel: 'البحث عن سورة',
    searchPlaceholder: 'اسم السورة أو رقمها',
    empty: 'لا توجد سورة بهذا الاسم.',
    onDevice: 'على جهازك',
    confirm_zero: 'اختر السور أولًا',
    confirm_one: 'تنزيل سورة واحدة',
    confirm_two: 'تنزيل سورتين',
    confirm_few: 'تنزيل {{count, number}} سور',
    confirm_many: 'تنزيل {{count, number}} سورة',
    confirm_other: 'تنزيل {{count, number}} سورة',
  },
  errors: {
    playback: 'تعذّر تشغيل التلاوة. تحقّق من اتصالك بالإنترنت، أو نزّل التلاوة لتستمع دون اتصال.',
    reciters: 'تعذّر تحميل قائمة القرّاء. تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.',
    noReciter: 'لا تتوفر تلاوة لهذه الرواية بعد.',
    noSurahReciter: 'لا تتوفر تسجيلات للسور كاملة بهذه الرواية بعد.',
    /** The chosen whole-surah reciter recorded neither this surah nor any after it. */
    noSurahLeft: 'لا تتوفر لهذا القارئ تسجيلات لهذه السورة أو السور التالية. اختر قارئًا آخر من الإعدادات.',
  },
} as const;
