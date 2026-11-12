/** What the app adds in Ramadan: the fast's two times on the home screen, and a khatma for the month. */
export default {
  /** The card's title: «رمضان · اليوم ١٢». */
  title: 'رمضان',
  day: 'اليوم {{day, number}}',
  /** Spoken name of the card. */
  label: 'رمضان، اليوم {{day, number}}',
  imsak: 'الإمساك',
  iftar: 'الإفطار',
  /** Over the time left, while fasting and after the fast is broken. */
  untilIftar: 'بقي على الإفطار',
  untilImsak: 'بقي على الإمساك',
  /** Without a place, the times cannot be shown. */
  noPlace: 'حدّد موقعك في مواقيت الصلاة لعرض وقتي الإمساك والإفطار.',
  note: 'الإمساك عند أذان الفجر، والإفطار عند أذان المغرب.',
  khatma: {
    /** The goal's name, filled in for the user. */
    name: 'ختمة رمضان',
    title: 'اختم القرآن في رمضان',
    detail: 'جزء واحد كل يوم يتمّ الختمة في ثلاثين يومًا.',
    action: 'إنشاء ختمة رمضان',
    /** In place of the invitation when a khatma or daily wird is already under way. */
    open: 'متابعة وردك',
  },
} as const;
