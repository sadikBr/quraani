/** The "share an ayah" screen and the image card it exports. */
export default {
  title: 'بطاقة آية',
  subtitle: 'شارك الآية في صورة تليق بها',
  preparing: 'جارٍ تجهيز البطاقة',
  notFound: 'لم نعثر على هذه الآية.',
  loadError: 'تعذّر تجهيز البطاقة. أعد المحاولة.',
  /** `title` heads the choice of the image's shape. */
  format: { title: 'شكل البطاقة', status: 'حالة واتساب · 9:16', square: 'منشور مربع · 1:1' },
  preview: { title: 'معاينة البطاقة', extended: 'طالت البطاقة لتتسع للنص كاملًا.' },
  /** `app`: the swatch that follows the app's current theme; the other swatches are named in reader.ayahCard.themes. */
  color: { title: 'لون البطاقة', app: 'مظهر التطبيق' },
  /** Shows the app's logo and name at the bottom of the card. */
  showBrand: 'إظهار شعار التطبيق',
  translation: {
    add: 'إضافة ترجمة المعاني',
    loading: 'جارٍ تحميل الترجمة',
    error: 'تعذّر تحميل ترجمة كاملة لهذه الآية. أعد المحاولة، أو شارك الآية دون ترجمة.',
    reload: 'إعادة تحميل الترجمة',
    source: 'المصدر: {{source}}',
    /** {{refs}} is a list of "surah:ayah" references in Hafs numbering, which translations follow. */
    parallel: 'ما يقابلها في ترقيم حفص: {{refs}}',
  },
  errors: {
    unavailable: 'لا يمكن إنشاء صورة البطاقة لأن هذا الجهاز لا يدعم المشاركة.',
    image: 'تعذّر إنشاء الصورة. أعد المحاولة.',
    brand: 'تعذّر تحميل شعار التطبيق. أعد المحاولة.',
    share: 'تعذّرت المشاركة. أعد المحاولة.',
  },
  downloaded: 'نُزِّلت البطاقة. يمكنك مشاركتها من الصور أو الملفات.',
  retryImage: 'إعادة تجهيز الصورة',
  shareImage: 'مشاركة الصورة',
  downloadImage: 'تنزيل الصورة',
  sharing: 'جارٍ المشاركة…',
  preparingImage: 'جارٍ تجهيز الصورة…',
  /** Text drawn on the exported image, which people send to others. */
  card: {
    ayah: 'الآية {{ayah}}',
    translation: 'ترجمة المعاني · {{source}}',
    /** {{refs}} is a list of "surah:ayah" references. */
    numbering: 'ترقيم حفص: {{refs}}',
  },
} as const;
