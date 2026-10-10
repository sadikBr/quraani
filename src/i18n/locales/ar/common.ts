/** Words shared across the whole app. Use a feature namespace when the meaning is specific to one screen. */
export default {
  appName: 'قرآني',
  /** Joins list items: "الكهف، الملك". */
  listSeparator: '، ',
  retry: 'إعادة المحاولة',
  close: 'إغلاق',
  cancel: 'إلغاء',
  save: 'حفظ',
  today: 'اليوم',
  settings: 'الإعدادات',
  backToReading: 'العودة إلى المصحف',
  clearSearch: 'مسح البحث',
  checkConnection: 'تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.',
  /** "رواية حفص عن عاصم" */
  riwayahOf: 'رواية {{riwayah}}',
  riwayah: {
    warsh: { name: 'ورش', label: 'ورش عن نافع' },
    hafs: { name: 'حفص', label: 'حفص عن عاصم' },
  },
  weekdays: {
    /** Indexed like Date.getUTCDay(): 0 is Sunday. */
    long: { 0: 'الأحد', 1: 'الاثنين', 2: 'الثلاثاء', 3: 'الأربعاء', 4: 'الخميس', 5: 'الجمعة', 6: 'السبت' },
    /** One-letter labels for compact day pickers. */
    letter: { 0: 'ح', 1: 'ن', 2: 'ث', 3: 'ر', 4: 'خ', 5: 'ج', 6: 'س' },
    everyDay: 'كل يوم',
  },
  languages: { english: 'الإنجليزية', french: 'الفرنسية' },
} as const;
