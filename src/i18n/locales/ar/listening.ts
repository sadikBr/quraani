/** «التسميع بالصوت» (experimental): reciting from memory while the app listens and finds the mistakes. */
export default {
  title: 'التسميع بالصوت',
  /** Badge beside the title: the feature is still being tried. */
  beta: 'تجريبي',
  /** The action in the ayah sheet. */
  action: 'التسميع بالصوت',
  actionDetail: 'اقرأ من حفظك من هذه الآية، ويُظهر لك ما أخطأت فيه',
  /** Where the recitation starts: «تبدأ من سورة الملك، الآية ٩». */
  from: 'تبدأ من {{surah}}، الآية {{ayah, number}}',
  /** Before the first words of that ayah, shown as a cue. */
  cue: 'أولها:',
  intro: 'يستمع التطبيق إلى تلاوتك ويقارنها بنص المصحف، فيُظهر الكلمات التي لم تُقرأ، وما قُرئ بغير لفظه، وما زِيد.',
  limits: 'يقارن الكلمات فقط، ولا يحكم على أحكام التجويد ومخارج الحروف. وما زال تجريبيًا، فقد يخطئ أحيانًا.',
  /** Under the limits: who does the listening. */
  service: 'ويستمع إليك عبر خدمة التعرّف على الكلام في هاتفك (من Google عادةً)، وقد تحتاج إلى الإنترنت فتُرسل الصوت إلى خوادمها لتحوّله إلى نص.',
  microphone: {
    denied: 'لم يُسمح باستخدام الميكروفون. اسمح به من إعدادات الهاتف ثم أعد المحاولة.',
  },
  start: 'ابدأ التسميع',
  startHint: 'اقرأ من حفظك، وتظهر كلماتك وأنت تقرأ، ثم اضغط «إيقاف» حين تنتهي.',
  stop: 'إيقاف',
  stopHint: 'اضغط «إيقاف» حين تنتهي.',
  /** While listening: «يستمع… ٠:٢٤». */
  listening: 'يستمع… {{time}}',
  /** Before the first words are heard. */
  waiting: 'ابدأ القراءة…',
  finishing: 'جارٍ إنهاء الاستماع…',
  failed: 'تعذّر الاستماع إلى التلاوة. أعد المحاولة.',
  nothing: 'لم يُسمع شيء من هذه الآيات. اقترب من الهاتف وأعد المحاولة.',
  noService: 'لا تتوفر في هاتفك خدمة للتعرّف على الكلام. ثبّت تطبيق Google أو «خدمات الكلام من Google» وفعّلها، ثم أعد المحاولة.',
  noArabic: 'خدمة التعرّف على الكلام في هاتفك لا تدعم العربية. ثبّت «خدمات الكلام من Google» ثم أعد المحاولة.',
  network: 'تحتاج خدمة التعرّف على الكلام إلى الإنترنت. تحقّق من اتصالك ثم أعد المحاولة.',
  /** On the web, or in a build of the app without its native modules (Expo Go). */
  unavailable: 'التسميع بالصوت يعمل في التطبيق المثبّت على الهاتف.',
  result: {
    perfect: 'أحسنت! قرأت الآيات كما في المصحف.',
    /** Under the counts, and as the legend of the colours. */
    ok: 'صحيحة',
    wrong: 'بغير لفظها',
    missed: 'لم تُقرأ',
    extra: 'زائدة',
    /** Words after where the recitation stopped. */
    after: 'بعد موضع التوقف',
    mistakes: 'المواضع',
    wrongItem: 'الآية {{ayah, number}}: «{{word}}»، وسُمع «{{heard}}»',
    missedItem: 'الآية {{ayah, number}}: «{{word}}» لم تُقرأ',
    extraItem: 'الآية {{ayah, number}}: زِيد «{{heard}}» بعد «{{word}}»',
    extraStartItem: 'في البداية: زِيد «{{heard}}»',
    heard: 'ما سمعه التطبيق',
    /** «تلاوة ٤٢ ث». */
    timing: 'تلاوة {{recorded, number}} ث',
    again: 'أعد المحاولة',
    next: 'تابع من الآية {{ayah, number}}',
  },
} as const;
