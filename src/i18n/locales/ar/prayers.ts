/** Prayer times, their alerts and the athan. Times are shown as «05:04» (24-hour, Latin digits, like the app's time fields). */
export default {
  title: 'مواقيت الصلاة',
  storageError: 'تعذّر تسجيل إعدادات المواقيت على جهازك، وسيُعاد المحاولة تلقائيًا.',
  names: { fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' },
  /** The prayer with its noun, for sentences: «صلاة الظهر»; sunrise is not a prayer. */
  prayerOf: { fajr: 'صلاة الفجر', sunrise: 'الشروق', dhuhr: 'صلاة الظهر', asr: 'صلاة العصر', maghrib: 'صلاة المغرب', isha: 'صلاة العشاء' },
  location: {
    /** Above the place's name. */
    label: 'الموقع',
    change: 'تغيير',
    changeLabel: 'تغيير الموقع: {{place}}',
    /** A position found by GPS with no bundled city near. */
    current: 'موقعي الحالي',
    /** A position found by GPS outside the bundled cities: «قرب أكادير». */
    near: 'قرب {{city}}',
    emptyTitle: 'حدّد موقعك',
    emptyText: 'تُحسب المواقيت على هاتفك، ولا يرسل التطبيق موقعك إلى أي جهة.',
    useMine: 'استخدام موقعي',
    chooseCity: 'اختيار مدينة',
    locating: 'جارٍ تحديد موقعك…',
    denied: 'لم يُسمح للتطبيق بمعرفة موقعك. اختر مدينتك من القائمة، أو اسمح بذلك من إعدادات الهاتف.',
    failed: 'تعذّر تحديد موقعك. أعد المحاولة، أو اختر مدينتك من القائمة.',
    sheetTitle: 'موقعك',
    sheetSubtitle: 'تُحسب المواقيت لأقرب مدينة أو لموقعك بالضبط.',
    searchLabel: 'البحث عن مدينة',
    searchPlaceholder: 'ابحث باسم المدينة',
    empty: 'لا مدينة بهذا الاسم. جرّب «استخدام موقعي».',
    morocco: 'المغرب',
    others: 'مدن أخرى',
    /** Under «استخدام موقعي» when the place came from the phone: «الرباط، حُدِّد من موقع الهاتف». */
    gpsDetail: '{{place}}، حُدِّد من موقع الهاتف',
  },
  next: {
    /** Above the next prayer's name. */
    label: 'الصلاة القادمة',
    sunriseLabel: 'الشروق القادم',
    /** Before the countdown «2:14:05». */
    in: 'بعد',
    /** Spoken: «العصر الساعة 15:33، بعد 2:14:05». */
    spoken: '{{prayer}} الساعة {{time}}، بعد {{countdown}}',
  },
  /** Browsing the times of other days, a week at a time. */
  week: {
    /** «5 – 11 أكتوبر». */
    range: '{{from}} – {{to}}',
    label: 'أسبوع {{range}}',
    previous: 'الأسبوع السابق',
    next: 'الأسبوع التالي',
    /** Short weekday names over the day numbers, from Sunday (d0) to Saturday (d6). */
    days: { d0: 'أحد', d1: 'اثنين', d2: 'ثلاثاء', d3: 'أربعاء', d4: 'خميس', d5: 'جمعة', d6: 'سبت' },
    /** Spoken label of today's day: «اليوم، الأحد 11 أكتوبر». */
    todayLabel: 'اليوم، {{date}}',
    /** Above the times of the chosen day; other days show their date. */
    titles: { today: 'مواقيت اليوم', tomorrow: 'مواقيت الغد', yesterday: 'مواقيت الأمس' },
    today: 'اليوم',
    backToToday: 'العودة إلى اليوم',
  },
  /** The last row of the prayer times, to their settings. */
  settingsLink: { title: 'إعدادات الصلاة', detail: 'التنبيهات والأذان وطريقة الحساب' },
  today: {
    /** Spoken label of a row: «العصر 15:33، أذان قصير». */
    row: '{{prayer}} {{time}}، {{alert}}',
    current: 'الوقت الحالي',
    alertLabel: 'تنبيه {{prayer}}: {{alert}}',
    /** In a row's spoken label while alerts are turned off. */
    alertsOff: 'التنبيهات متوقفة',
  },
  /** «٢٨ ربيع الآخر ١٤٤٨ هـ»; the year comes formatted without a thousands separator. */
  hijri: '{{day, number}} {{month}} {{year}} هـ',
  hijriMonths: {
    m1: 'محرم', m2: 'صفر', m3: 'ربيع الأول', m4: 'ربيع الآخر', m5: 'جمادى الأولى', m6: 'جمادى الآخرة',
    m7: 'رجب', m8: 'شعبان', m9: 'رمضان', m10: 'شوال', m11: 'ذو القعدة', m12: 'ذو الحجة',
  },
  alerts: {
    title: 'التنبيهات',
    description: 'إشعار أو أذان عند دخول وقت كل صلاة.',
    enable: 'التنبيه عند دخول الوقت',
    phoneOnly: 'تعمل التنبيهات في التطبيق على الهاتف.',
    permissionDenied: 'لم يُسمح للتطبيق بالإشعارات. اسمح بها من إعدادات الهاتف ثم أعد المحاولة.',
    unavailable: 'تعذّر إعداد التنبيهات على هذا الجهاز.',
    syncFailed: 'تعذّر جدولة بعض التنبيهات. افتح هذه الصفحة لاحقًا لإعادة المحاولة.',
    noLocation: 'حدّد موقعك أولًا لتصلك التنبيهات.',
    kinds: { off: 'بلا تنبيه', notify: 'إشعار', takbir: 'تكبير', full: 'الأذان كاملًا' },
    details: {
      off: 'لا يصلك شيء في هذا الوقت.',
      notify: 'إشعار بنغمة الهاتف المعتادة.',
      takbir: 'إشعار يُسمعك التكبير: الله أكبر، الله أكبر.',
      full: 'يُرفع الأذان كاملًا وتظهر شاشته، وتوقفه متى شئت.',
      /** Expo Go, iOS or the web: the whole athan needs the installed Android app. */
      fullFallback: 'يحتاج إلى التطبيق المثبّت على أندرويد. يُسمعك هنا التكبير.',
    },
    sheetTitle: 'تنبيه {{prayer}}',
    /** In a prayer's alert sheet while alerts are off. */
    offNote: 'التنبيهات متوقفة. إذا اخترت تنبيهًا هنا شُغِّلت لكل الصلوات بما ضُبط لها.',
    voice: 'صوت الأذان كاملًا',
    takbirSound: 'صوت التكبير',
    /** A switch; once on, the lengths below it. */
    before: 'تذكير قبل الوقت',
    /** Spoken name of the lengths. */
    beforeLength: 'مدة التذكير قبل الوقت',
    /** A length of the reminder before: «١٠ دقائق». */
    beforeChip_zero: 'بلا تذكير',
    beforeChip_one: 'دقيقة',
    beforeChip_two: 'دقيقتان',
    beforeChip_few: '{{count, number}} دقائق',
    beforeChip_many: '{{count, number}} دقيقة',
    beforeChip_other: '{{count, number}} دقيقة',
    channels: { alerts: 'تنبيهات الصلاة', takbir: 'التكبير: {{voice}}', full: 'الأذان كاملًا' },
  },
  notification: {
    title: { fajr: 'حان وقت صلاة الفجر', sunrise: 'أشرقت الشمس', dhuhr: 'حان وقت صلاة الظهر', asr: 'حان وقت صلاة العصر', maghrib: 'حان وقت صلاة المغرب', isha: 'حان وقت صلاة العشاء' },
    /** «05:04 · الدار البيضاء». */
    body: '{{time}} · {{place}}',
    /** Sunrise ends the time of Fajr. */
    sunriseBody: 'خرج وقت صلاة الفجر · {{time}}',
    before_zero: '{{prayer}} الآن',
    before_one: '{{prayer}} بعد دقيقة',
    before_two: '{{prayer}} بعد دقيقتين',
    before_few: '{{prayer}} بعد {{count, number}} دقائق',
    before_many: '{{prayer}} بعد {{count, number}} دقيقة',
    before_other: '{{prayer}} بعد {{count, number}} دقيقة',
    /** The button on the whole athan's notification. */
    stop: 'إيقاف الأذان',
  },
  voices: {
    title: 'صوت الأذان كاملًا',
    subtitle: 'يُرفع في وقت الصلاة التي اخترت لها «الأذان كاملًا». تسمع هنا مطلعه.',
    play: 'استماع',
    stop: 'إيقاف',
    playLabel: 'الاستماع إلى {{voice}}',
    stopLabel: 'إيقاف {{voice}}',
    playFailed: 'تعذّر تشغيل المقطع. أعد المحاولة.',
    /** The voices in groups, the athans of the three mosques first. */
    groups: { mosques: 'الحرمان والأقصى', muezzins: 'بأصوات المؤذنين' },
    makkah: { name: 'المسجد الحرام', source: 'أذان مكة المكرمة · ثلاث دقائق ونصف' },
    madinah: { name: 'المسجد النبوي', source: 'أذان المدينة المنورة · ثلاث دقائق ونصف' },
    aqsa: { name: 'المسجد الأقصى', source: 'أذان القدس · أربع دقائق' },
    alafasy: { name: 'مشاري راشد العفاسي', source: 'الكويت · أربع دقائق' },
    alafasy2: { name: 'مشاري راشد العفاسي، أذان آخر', source: 'الكويت · ثلاث دقائق ونصف' },
    nufais: { name: 'أحمد النفيس', source: 'الكويت · ثلاث دقائق' },
    zahrani: { name: 'منصور الزهراني', source: 'السعودية · دقيقتان' },
    qatami: { name: 'ناصر القطامي', source: 'السعودية · دقيقتان' },
    dosari: { name: 'ياسر الدوسري', source: 'السعودية · ثلاث دقائق' },
    kurdi: { name: 'أحمد الكوردي', source: 'ثلاث دقائق' },
    abdulbasit: { name: 'عبد الباسط عبد الصمد', source: 'مصر · تسجيل قديم · ثلاث دقائق' },
    ozcan: { name: 'حافظ مصطفى أوزجان', source: 'تركيا · أربع دقائق' },
  },
  /** The takbir notification's sounds: «الله أكبر، الله أكبر» from each voice, and a single takbir. */
  takbirs: {
    title: 'صوت التكبير',
    subtitle: 'يُسمع مع إشعار «تكبير» في وقت الصلاة.',
    /** A takbir alone, before the voices. */
    single: { name: 'تكبيرة واحدة', source: '«الله أكبر» مرة واحدة · ست ثوانٍ' },
    makkah: { name: 'المسجد الحرام', source: 'من أذان مكة المكرمة' },
    madinah: { name: 'المسجد النبوي', source: 'من أذان المدينة المنورة' },
    aqsa: { name: 'المسجد الأقصى', source: 'من أذان القدس' },
    alafasy: { name: 'مشاري راشد العفاسي', source: 'الكويت' },
    alafasy2: { name: 'مشاري راشد العفاسي، أذان آخر', source: 'الكويت' },
    nufais: { name: 'أحمد النفيس', source: 'الكويت' },
    zahrani: { name: 'منصور الزهراني', source: 'السعودية' },
    qatami: { name: 'ناصر القطامي', source: 'السعودية' },
    dosari: { name: 'ياسر الدوسري', source: 'السعودية' },
    kurdi: { name: 'أحمد الكوردي', source: 'من أذانه' },
    abdulbasit: { name: 'عبد الباسط عبد الصمد', source: 'مصر' },
    ozcan: { name: 'حافظ مصطفى أوزجان', source: 'تركيا' },
  },
  /** Sending an alert now, to see and hear it without waiting for a prayer. */
  test: {
    heading: 'تجربة التنبيه',
    detail: 'يصلك التنبيه بعد {{seconds, number}} ثوانٍ كما يصل في وقت الصلاة.',
    /** With the Android app: the whole athan opens its screen on a locked phone. */
    detailScreen: 'يصلك التنبيه بعد {{seconds, number}} ثوانٍ كما يصل في وقت الصلاة. أقفل الشاشة لترى شاشة الأذان.',
    takbir: 'تجربة التكبير',
    /** iOS: alerts there are plain notifications. */
    notify: 'تجربة الإشعار',
    full: 'تجربة الأذان كاملًا',
    stop: 'إيقاف الأذان',
    sent: 'أُرسل التنبيه، ويصلك بعد {{seconds, number}} ثوانٍ.',
    failed: 'تعذّر إرسال التنبيه. تأكّد من السماح بالإشعارات ثم أعد المحاولة.',
    /** Title of a test notification: «تجربة: حان وقت صلاة العصر». */
    title: 'تجربة: {{title}}',
  },
  reliability: {
    title: 'لتصلك التنبيهات في وقتها',
    exact: 'اسمح للتطبيق بضبط المنبّهات، وإلا تأخّرت التنبيهات أحيانًا عن وقتها.',
    exactAction: 'السماح بالمنبّهات',
    screen: 'اسمح للتطبيق بالإشعارات على الشاشة كاملة لتظهر شاشة الأذان والهاتف مقفل.',
    screenAction: 'السماح بالشاشة الكاملة',
    battery: 'قد يؤخّر توفير البطارية التنبيهات أو يمنعها. استثنِ التطبيق منه.',
    batteryAction: 'إعدادات البطارية',
    silent: 'لا يُرفع الأذان كاملًا والهاتف صامت أو في وضع «عدم الإزعاج»، ويصلك الإشعار وحده. التجربة تُرفع في كل حال.',
    ok: 'كل شيء جاهز لتصلك التنبيهات في وقتها.',
  },
  calculation: {
    title: 'طريقة الحساب',
    description: 'تُعتمد طريقة وزارة الأوقاف والشؤون الإسلامية المغربية ما لم تختر غيرها.',
    method: 'الطريقة',
    madhab: 'وقت العصر',
    madhabs: { shafi: 'الجمهور', hanafi: 'الحنفية' },
    madhabDetail: { shafi: 'إذا صار ظل الشيء مثله', hanafi: 'إذا صار ظل الشيء مثليه' },
    adjustments: 'تعديل الدقائق',
    adjustmentsNone: 'بلا تعديل',
    /** «الفجر +2، العشاء −1». */
    adjustmentItem: '{{prayer}} {{minutes}}',
    adjustmentsTitle: 'تعديل المواقيت',
    adjustmentsSubtitle: 'لموافقة توقيت مسجدك بالدقيقة.',
    /** Signed minutes, kept left to right: «+2 د», «−1 د». */
    minutes: '{{minutes}} د',
    later: 'تأخير {{prayer}} دقيقة',
    earlier: 'تقديم {{prayer}} دقيقة',
    reset: 'إلغاء التعديلات',
    hijri: 'التاريخ الهجري',
    hijriDetail: 'تاريخ حسابي، وقد يختلف بيوم عن الإعلان الرسمي.',
    hijriLater: 'زيادة يوم على التاريخ الهجري',
    hijriEarlier: 'إنقاص يوم من التاريخ الهجري',
    methodsTitle: 'طريقة الحساب',
  },
  methods: {
    habous: { name: 'وزارة الأوقاف المغربية', detail: 'الفجر ١٩°، العشاء ١٧°، مع تعديلات الوزارة' },
    algeria: { name: 'وزارة الشؤون الدينية الجزائرية', detail: 'الفجر ١٨°، العشاء ١٧°' },
    tunisia: { name: 'وزارة الشؤون الدينية التونسية', detail: 'الفجر ١٨°، العشاء ١٨°' },
    france: { name: 'اتحاد المنظمات الإسلامية في فرنسا', detail: 'الفجر ١٢°، العشاء ١٢°' },
    mwl: { name: 'رابطة العالم الإسلامي', detail: 'الفجر ١٨°، العشاء ١٧°' },
    egyptian: { name: 'الهيئة المصرية العامة للمساحة', detail: 'الفجر ١٩٫٥°، العشاء ١٧٫٥°' },
    ummAlQura: { name: 'أم القرى، مكة المكرمة', detail: 'الفجر ١٨٫٥°، العشاء بعد المغرب بـ٩٠ دقيقة' },
    dubai: { name: 'دبي', detail: 'الفجر ١٨٫٢°، العشاء ١٨٫٢°، مع تعديلات' },
    qatar: { name: 'قطر', detail: 'الفجر ١٨°، العشاء بعد المغرب بـ٩٠ دقيقة' },
    kuwait: { name: 'الكويت', detail: 'الفجر ١٨°، العشاء ١٧٫٥°' },
    karachi: { name: 'جامعة العلوم الإسلامية، كراتشي', detail: 'الفجر ١٨°، العشاء ١٨°' },
    turkey: { name: 'رئاسة الشؤون الدينية التركية', detail: 'الفجر ١٨°، العشاء ١٧°، مع تعديلات' },
    singapore: { name: 'سنغافورة وماليزيا وإندونيسيا', detail: 'الفجر ٢٠°، العشاء ١٨°' },
    northAmerica: { name: 'الجمعية الإسلامية لأمريكا الشمالية', detail: 'الفجر ١٥°، العشاء ١٥°' },
    moonsighting: { name: 'لجنة رؤية الهلال', detail: 'الفجر ١٨°، العشاء ١٨°، مع تعديلات فصلية' },
    tehran: { name: 'معهد الجيوفيزياء، جامعة طهران', detail: 'الفجر ١٧٫٧°، العشاء ١٤°، المغرب ٤٫٥°' },
  },
  /** The whole athan's screen over the lock screen, and the page that designs it. */
  screen: {
    /** The row in the alerts card, and the page's title. */
    title: 'شاشة الأذان',
    subtitle: 'تظهر مع الأذان كاملًا والهاتف مقفل. اختر خلفيتها وحركتها.',
    /** Above the prayer's name on the screen: «حان وقت صلاة / العصر». */
    heading: 'حان وقت صلاة',
    previewLabel: 'معاينة شاشة الأذان',
    preview: 'معاينة على الشاشة كاملة',
    previewHint: 'تظهر الشاشة كما تظهر مع الأذان، دون صوت.',
    previewFailed: 'تعذّر فتح الشاشة. أعد المحاولة.',
    /** The button of the preview, which plays nothing. */
    close: 'إغلاق',
    background: 'الخلفية',
    backgrounds: {
      makkah_night: 'المسجد الحرام ليلًا',
      makkah_day: 'الكعبة المشرفة',
      madinah: 'المسجد النبوي',
      madinah_night: 'المسجد النبوي ليلًا',
      aqsa: 'قبة الصخرة',
      hassan2: 'مسجد الحسن الثاني',
      koutoubia: 'جامع الكتبية',
      green: 'أخضر',
      night: 'كحلي',
    },
    dim: 'تعتيم الخلفية',
    dims: { light: 'خفيف', medium: 'متوسط', strong: 'قوي' },
    motion: 'الحركة',
    motions: { pulse: 'نبض', glow: 'توهّج', none: 'بلا حركة' },
    date: 'التاريخ الهجري',
    dateDetail: 'تحت وقت الصلاة.',
    unavailable: 'تتوفر شاشة الأذان في تطبيق أندرويد المثبّت.',
  },
  /** The prayer times notification, always shown (Android app). */
  timesNotification: {
    title: 'إشعار المواقيت',
    label: 'المواقيت في الإشعارات',
    detail: 'إشعار ثابت فيه مواقيت اليوم والصلاة القادمة والوقت الباقي عليها.',
    /** Without exact alarms, Android may refresh it up to ten minutes late, so it hides the countdown. */
    exact: 'اسمح للتطبيق بضبط المنبّهات ليتجدّد الإشعار مع دخول كل وقت ويُظهر الوقت الباقي.',
    /** Its notification channel, in the system settings. */
    channel: 'مواقيت الصلاة',
    /** Before the date, after Isha, when it shows the next day's times. */
    tomorrow: 'غدًا',
    /** The live countdown to the next prayer; %s is the time left, «1:23:45». */
    countdown: 'بعد %s',
  },
  /** The first card of the home screen. */
  home: {
    /** Spoken: the whole card, which opens the prayer times. */
    label: 'مواقيت الصلاة في {{place}}. الصلاة القادمة {{prayer}} الساعة {{time}}، بعد {{countdown}}. افتح المواقيت.',
    /** After Isha the card shows the next day: «غدًا، 29 ربيع الآخر 1448 هـ». */
    tomorrow: 'غدًا، {{date}}',
    setupTitle: 'مواقيت الصلاة',
    setup: 'حدّد مدينتك لترى مواقيت اليوم هنا، والصلاة القادمة والوقت الباقي عليها.',
    setupAction: 'تحديد الموقع',
    setupLabel: 'مواقيت الصلاة: حدّد مدينتك',
  },
  countries: {
    MA: 'المغرب', SA: 'السعودية', EG: 'مصر', DZ: 'الجزائر', TN: 'تونس', LY: 'ليبيا', MR: 'موريتانيا', SN: 'السنغال',
    SD: 'السودان', PS: 'فلسطين', JO: 'الأردن', LB: 'لبنان', SY: 'سوريا', IQ: 'العراق', KW: 'الكويت', BH: 'البحرين',
    QA: 'قطر', AE: 'الإمارات', OM: 'عُمان', YE: 'اليمن', TR: 'تركيا', FR: 'فرنسا', BE: 'بلجيكا', NL: 'هولندا',
    ES: 'إسبانيا', IT: 'إيطاليا', CH: 'سويسرا', DE: 'ألمانيا', GB: 'المملكة المتحدة', SE: 'السويد', CA: 'كندا',
    US: 'الولايات المتحدة', ID: 'إندونيسيا', MY: 'ماليزيا',
  },
  cities: {
    casablanca: 'الدار البيضاء', rabat: 'الرباط', sale: 'سلا', temara: 'تمارة', skhirate: 'الصخيرات', tamesna: 'تامسنا',
    kenitra: 'القنيطرة', mohammedia: 'المحمدية', bouznika: 'بوزنيقة', benslimane: 'بنسليمان', fes: 'فاس', meknes: 'مكناس',
    marrakesh: 'مراكش', tangier: 'طنجة', tetouan: 'تطوان', martil: 'مرتيل', mdiq: 'المضيق', fnideq: 'الفنيدق',
    asilah: 'أصيلة', larache: 'العرائش', ksarElKebir: 'القصر الكبير', chefchaouen: 'شفشاون', ouezzane: 'وزان',
    alHoceima: 'الحسيمة', imzouren: 'إمزورن', nador: 'الناظور', driouch: 'الدريوش', zaio: 'زايو', berkane: 'بركان',
    ahfir: 'أحفير', oujda: 'وجدة', jerada: 'جرادة', taourirt: 'تاوريرت', guercif: 'جرسيف', taza: 'تازة',
    taounate: 'تاونات', sefrou: 'صفرو', ifrane: 'إفران', azrou: 'أزرو', boulemane: 'بولمان', missour: 'ميسور',
    midelt: 'ميدلت', khenifra: 'خنيفرة', khemisset: 'الخميسات', tiflet: 'تيفلت', sidiKacem: 'سيدي قاسم',
    sidiSlimane: 'سيدي سليمان', soukElArbaa: 'سوق الأربعاء الغرب', settat: 'سطات', berrechid: 'برشيد',
    elJadida: 'الجديدة', sidiBennour: 'سيدي بنور', safi: 'آسفي', youssoufia: 'اليوسفية', benGuerir: 'ابن جرير',
    kelaaSraghna: 'قلعة السراغنة', khouribga: 'خريبكة', ouedZem: 'وادي زم', beniMellal: 'بني ملال',
    fquihBenSalah: 'الفقيه بن صالح', kasbaTadla: 'قصبة تادلة', azilal: 'أزيلال', chichaoua: 'شيشاوة',
    essaouira: 'الصويرة', agadir: 'أكادير', inezgane: 'إنزكان', aitMelloul: 'أيت ملول', taroudant: 'تارودانت',
    tiznit: 'تيزنيت', sidiIfni: 'سيدي إفني', guelmim: 'كلميم', tanTan: 'طانطان', assa: 'أسا', tata: 'طاطا',
    ouarzazate: 'ورزازات', zagora: 'زاكورة', tinghir: 'تنغير', errachidia: 'الرشيدية', figuig: 'فجيج',
    bouarfa: 'بوعرفة', laayoune: 'العيون', smara: 'السمارة', boujdour: 'بوجدور', dakhla: 'الداخلة',
    mecca: 'مكة المكرمة', medina: 'المدينة المنورة', riyadh: 'الرياض', jeddah: 'جدة', cairo: 'القاهرة',
    alexandria: 'الإسكندرية', algiers: 'الجزائر العاصمة', oran: 'وهران', constantine: 'قسنطينة', tunis: 'تونس العاصمة',
    sfax: 'صفاقس', tripoli: 'طرابلس', nouakchott: 'نواكشوط', dakar: 'داكار', khartoum: 'الخرطوم', jerusalem: 'القدس',
    gaza: 'غزة', amman: 'عمّان', beirut: 'بيروت', damascus: 'دمشق', baghdad: 'بغداد', kuwait: 'مدينة الكويت',
    manama: 'المنامة', doha: 'الدوحة', abuDhabi: 'أبوظبي', dubai: 'دبي', muscat: 'مسقط', sanaa: 'صنعاء',
    istanbul: 'إسطنبول', paris: 'باريس', marseille: 'مرسيليا', lyon: 'ليون', toulouse: 'تولوز', montpellier: 'مونبلييه',
    bordeaux: 'بوردو', lille: 'ليل', nice: 'نيس', strasbourg: 'ستراسبورغ', brussels: 'بروكسل', antwerp: 'أنتويرب',
    amsterdam: 'أمستردام', rotterdam: 'روتردام', madrid: 'مدريد', barcelona: 'برشلونة', valencia: 'فالنسيا',
    seville: 'إشبيلية', malaga: 'مالقة', granada: 'غرناطة', murcia: 'مرسية', rome: 'روما', milan: 'ميلانو',
    turin: 'تورينو', bologna: 'بولونيا', geneva: 'جنيف', berlin: 'برلين', frankfurt: 'فرانكفورت', london: 'لندن',
    stockholm: 'ستوكهولم', montreal: 'مونتريال', toronto: 'تورونتو', newYork: 'نيويورك', jakarta: 'جاكرتا',
    kualaLumpur: 'كوالالمبور',
  },
} as const;
