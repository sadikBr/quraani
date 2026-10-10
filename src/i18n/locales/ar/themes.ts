/**
 * Names of the app's color themes, keyed by theme id, shown under each swatch.
 * Short evocative names (1–3 words) that call up the theme's colors; they need not translate the id.
 */
export default {
  /** Follows the device's light or dark setting. */
  system: 'حسب الجهاز',
  light: 'فاتح',
  dark: 'داكن',
  /** Deep green with gold. */
  emerald: 'زمرد وذهب',
  /** Sand beige with warm brown. */
  sand: 'لؤلؤة الصحراء',
  /** Soft pink with deep rose. */
  rose: 'ورد جوري',
  /** Navy blue with pale blue and gold. */
  midnight: 'سماء الليل',
  /** Pale green with olive green. */
  olive: 'غصن الزيتون',
  /** Deep violet with mint green. */
  aurora: 'الشفق القطبي',
  /** Pale aqua with teal. */
  sea: 'نسيم البحر',
  /** Pale lilac with purple. */
  lavender: 'حقل الخزامى',
  /** Dark brown with copper. */
  copper: 'نحاس عتيق',
  /** Pale sky blue with blue and gold. */
  porcelain: 'خزف سماوي',
  /** Pale peach with terracotta. */
  apricot: 'زهر المشمش',
  /** Charcoal with silver blue. */
  silver: 'حبر وفضة',
  /** Deep wine red with pink and gold. */
  garnet: 'حبات الرمان',
  /** Deep teal with aqua and pale gold. */
  pearl: 'لؤلؤ الأعماق',
  /** Cream paper with indigo ink. */
  manuscript: 'مداد نيلي',
  /** Pale grey with coral red. */
  marble: 'رخام ومرجان',
  /** Dark olive with amber. */
  amber: 'زيتون وعنبر',
  /** Night blue with terracotta and gold, like Andalusian tilework. */
  andalus: 'زليج أندلسي',
  /** Ice blue with bright blue. */
  glacier: 'الجليد الأزرق',
  /** Night blue with sky blue; the dark companion of glacier. */
  glacierNight: 'ليل جليدي',
  /** Pale lemon cream with raspberry and indigo, like a sunrise. */
  coralMint: 'الشروق',
  /** Plum with orange glow; the dark companion of coralMint, like dusk. */
  coralMintNight: 'الغسق',
} as const;
