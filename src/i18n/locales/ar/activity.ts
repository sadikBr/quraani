/**
 * The days the user read, memorized or revised («مواظبتك»): the run of days in a row, and each
 * month's days. Encouraging, never reproachful about a day missed.
 */
export default {
  title: 'مواظبتك',
  subtitle: 'الأيام التي سجّلت فيها قراءة أو حفظًا أو مراجعة.',
  /** Spoken on the home card: «مواظبتك: ٥ أيام متتالية. فتح سجلّ الأيام». */
  open: 'فتح سجلّ الأيام',
  /** The run of days, as a count under the flame. */
  run_zero: 'لا أيام متتالية بعد',
  run_one: 'يوم واحد',
  run_two: 'يومان متتاليان',
  run_few: '{{count, number}} أيام متتالية',
  run_many: '{{count, number}} يومًا متتاليًا',
  run_other: '{{count, number}} يوم متتالٍ',
  /** The run that today's reading reaches, after «لتبلغ»: «لتبلغ ٥ أيام متتالية». */
  reach_zero: 'يومك الأول',
  reach_one: 'يومك الأول',
  reach_two: 'يومين متتاليين',
  reach_few: '{{count, number}} أيام متتالية',
  reach_many: '{{count, number}} يومًا متتاليًا',
  reach_other: '{{count, number}} يوم متتالٍ',
  message: {
    /** Nothing recorded yet, ever. */
    start: 'سجّل وردك اليوم في أحد أهدافك، ليبدأ عدّ أيامك.',
    /** Today is done. */
    done: 'سجّلت قراءة اليوم، بارك الله لك. واصل غدًا لتبلغ {{reach}}.',
    /** A run is under way, and today is still to come. */
    keep: 'اقرأ وردك اليوم لتبلغ {{reach}}، ولا تنقطع مواظبتك.',
    /** No run under way, after earlier days. */
    again: 'ابدأ اليوم من جديد، ولو بورد قصير.',
  },
  /** A saying of the Prophet ﷺ on steady deeds, at the head of the page. */
  hadith: '«أحبُّ الأعمال إلى الله أدومُها وإن قلّ»',
  hadithSource: 'متفق عليه',
  stats: {
    current: 'الأيام المتتالية',
    best: 'أطول مواظبة',
    total: 'مجموع الأيام',
  },
  /** A plain count of days: «١٢ يومًا». */
  days_zero: 'لا أيام',
  days_one: 'يوم واحد',
  days_two: 'يومان',
  days_few: '{{count, number}} أيام',
  days_many: '{{count, number}} يومًا',
  days_other: '{{count, number}} يوم',
  month: {
    previous: 'الشهر السابق',
    next: 'الشهر التالي',
    /** Under the month's name: how many of its days have something recorded. */
    count: 'سجّلت فيه {{days}}',
    none: 'لم تسجّل فيه شيئًا',
    /** Spoken on a day of the calendar. */
    done: '{{date}}: سجّلت فيه',
    notDone: '{{date}}',
    today: 'اليوم',
  },
  /** Spoken on the home card's strip of the last seven days. */
  week: 'آخر سبعة أيام: سجّلت في {{days}}',
  note: 'يُحتسب اليوم إذا سجّلت فيه تقدّمًا في أحد أهدافك: ختمة أو ورد يومي أو حفظ أو مراجعة أو سور متكررة.',
} as const;
