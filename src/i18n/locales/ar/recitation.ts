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
  },
  repeat: {
    /** How many times each ayah is recited, in a sentence: "تكرار كل آية: ٣ مرات". */
    spoken: 'تكرار كل آية: {{times}}',
    times_zero: 'دون تكرار',
    times_one: 'مرة واحدة',
    times_two: 'مرتان',
    times_few: '{{count, number}} مرات',
    times_many: '{{count, number}} مرة',
    times_other: '{{count, number}} مرة',
    /** Repeat until the listener stops. */
    endless: 'حتى تُوقفها',
    /** Short chip text beside the repeat icon: the number of times, or ∞. */
    chip: '{{count, number}}',
    chipEndless: '∞',
  },
  ayahSheet: {
    fromHere: 'الاستماع من هذه الآية',
    fromHereDetail: 'تمضي التلاوة آيةً بعد آية',
    repeatAyah: 'تكرار هذه الآية',
    /** How many times the ayah is recited (the chosen repetition, always 2 or more). */
    repeatAyahDetail_zero: 'تُتلى مكررةً حتى تُوقفها',
    repeatAyahDetail_one: 'تُتلى مرة واحدة',
    repeatAyahDetail_two: 'تُتلى مرتين',
    repeatAyahDetail_few: 'تُتلى {{count, number}} مرات',
    repeatAyahDetail_many: 'تُتلى {{count, number}} مرة',
    repeatAyahDetail_other: 'تُتلى {{count, number}} مرة',
    /** No repetition chosen: the ayah repeats until the listener stops it. */
    repeatAyahEndless: 'تُتلى مكررةً حتى تُوقفها',
  },
  styles: { murattal: 'مرتّل', mujawwad: 'مجوّد', muallim: 'معلّم' },
  /** A reciter who recorded only part of the Quran. */
  partial_zero: 'لا سور مسجلة',
  partial_one: 'سورة واحدة مسجلة',
  partial_two: 'سورتان مسجلتان',
  partial_few: '{{count, number}} سور مسجلة',
  partial_many: '{{count, number}} سورة مسجلة',
  partial_other: '{{count, number}} سورة مسجلة',
  settings: {
    reciter: {
      title: 'القارئ',
      /** {{riwayah}} is e.g. «ورش عن نافع». */
      description: 'تلاوات برواية {{riwayah}} من الموسوعة القرآنية.',
      change: 'تغيير القارئ',
      /** Visible text of the change button beside the reciter's name. */
      changeShort: 'تغيير',
      loading: 'جارٍ تحميل قائمة القرّاء…',
    },
    repeat: {
      title: 'تكرار الآيات',
      description: 'عدد مرات تلاوة كل آية قبل الانتقال إلى التي تليها. يعين على الحفظ والمراجعة.',
    },
    offline: {
      title: 'الاستماع دون اتصال',
      description: 'نزّل تلاوة القارئ إلى جهازك لتستمع إليها دون إنترنت.',
      phoneOnly: 'التنزيل متوفر في تطبيق الهاتف.',
      none: 'لم تنزّل شيئًا من هذه التلاوة بعد.',
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
      deleteConfirm: 'حذف كل ما نُزّل من تلاوة {{name}}؟',
      /** Delete button of another saved reciter. */
      deleteOther: 'حذف تلاوة {{name}} من جهازك',
      confirmDelete: 'حذف',
      keep: 'إلغاء',
      networkError: 'توقف التنزيل لانقطاع الاتصال، وما نُزّل باقٍ على جهازك. أعد المحاولة حين يتوفر الإنترنت.',
      storageError: 'لا توجد مساحة كافية على جهازك لإكمال التنزيل.',
      /** Downloads continue only while the app is open. */
      keepOpen: 'يستمر التنزيل ما دام التطبيق مفتوحًا.',
      others: 'تلاوات أخرى على جهازك',
    },
  },
  reciterSheet: {
    title: 'اختيار القارئ',
    /** {{riwayah}} is e.g. «ورش عن نافع». */
    subtitle: 'القرّاء برواية {{riwayah}}',
    close: 'إغلاق اختيار القارئ',
    searchLabel: 'البحث عن قارئ',
    searchPlaceholder: 'اسم القارئ',
    empty: 'لا يوجد قارئ بهذا الاسم.',
    onDevice: 'على جهازك',
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
  },
} as const;
