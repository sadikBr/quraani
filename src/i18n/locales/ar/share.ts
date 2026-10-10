/** The "share an ayah" screen and the image card it exports. */
export default {
  title: 'بطاقة آية',
  subtitle: 'آية تتأملها، وأثر تشاركه',
  preparing: 'جارٍ تجهيز البطاقة',
  notFound: 'لم نعثر على هذه الآية.',
  loadError: 'تعذر تجهيز البطاقة. أعد المحاولة.',
  format: { status: 'حالة واتساب · 9:16', square: 'منشور مربع · 1:1' },
  preview: { title: 'معاينة البطاقة', extended: 'امتدت البطاقة لإظهار النص كاملًا.' },
  color: { title: 'لون البطاقة', app: 'مثل التطبيق' },
  showBrand: 'إظهار شعار قرآني',
  translation: {
    add: 'إضافة ترجمة المعاني',
    loading: 'جارٍ تحميل الترجمة',
    error: 'تعذر تحميل ترجمة كاملة لهذه الآية. أعد المحاولة أو أوقف الترجمة.',
    reload: 'إعادة تحميل الترجمة',
    source: 'المصدر: {{source}}',
    /** {{refs}} is a list of "surah:ayah" references in Hafs numbering. */
    parallel: 'المراجع الموازية حسب ترقيم حفص: {{refs}}',
  },
  errors: {
    unavailable: 'المشاركة غير متاحة على هذا الجهاز، لذا لا يمكن إنشاء صورة البطاقة.',
    image: 'تعذر إنشاء الصورة. أعد المحاولة.',
    brand: 'تعذر تحميل شعار التطبيق. أعد المحاولة.',
    share: 'تعذرت المشاركة. حاول مرة أخرى.',
  },
  downloaded: 'تم تنزيل البطاقة. يمكنك مشاركتها من الصور أو الملفات.',
  retryImage: 'إعادة تجهيز الصورة',
  shareImage: 'مشاركة الصورة',
  downloadImage: 'تنزيل الصورة',
  sharing: 'جارٍ المشاركة…',
  preparingImage: 'جارٍ تجهيز الصورة…',
  /** Text drawn on the exported image. */
  card: {
    ayah: 'الآية {{ayah}}',
    translation: 'ترجمة المعاني · {{source}}',
    /** {{refs}} is a list of "surah:ayah" references. */
    numbering: 'ترقيم حفص: {{refs}}',
  },
} as const;
