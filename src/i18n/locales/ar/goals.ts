/** Text shared by every goal type (khatma, wird, recurring, memorization, revision). */
export default {
  newGoal: 'هدف جديد',
  goals: 'الأهداف',
  name: 'اسم الهدف',
  setup: 'الإعداد',
  /** On a button while a goal or progress is being saved; avoids «الحفظ», which reads as memorizing. */
  saving: 'جارٍ التسجيل…',
  startingFrom: 'تاريخ البدء',
  /** Section with the goal's name and reminder. */
  makeItYours: 'الاسم والتذكير',
  firstSchedule: 'مواعيدك الأولى',
  viewCurrent: 'فتح هدفك الحالي',
  backToGoals: 'العودة إلى الأهداف',
  backToGoal: 'العودة إلى الهدف',
  backToGoalTypes: 'العودة إلى أنواع الأهداف',
  unavailable: 'لم يعد هذا الهدف موجودًا.',
  startReading: 'ابدأ القراءة',
  continueReading: 'تابع القراءة',
  previousWeek: 'الأسبوع السابق',
  nextWeek: 'الأسبوع التالي',
  /** Short names of the goal types, e.g. in a list of today's portions. */
  types: { khatma: 'ختمة', wird: 'ورد يومي', recurring: 'قراءة متكررة', memorization: 'حفظ', revision: 'مراجعة' },
  status: { paused: 'متوقف مؤقتًا', archived: 'مؤرشف', completed: 'مكتمل' },
  reminder: {
    time: 'وقت التذكير',
    enableOnPhone: 'التذكير متوفر في تطبيق الهاتف.',
    changeOnPhone: 'تُعدَّل التذكيرات من تطبيق الهاتف.',
  },
  archived: { title: 'هذا الهدف في الأرشيف' },
  actions: {
    saveSettings: 'حفظ الإعدادات',
    pause: 'إيقاف الهدف مؤقتًا',
    resume: 'استئناف الهدف',
    archive: 'أرشفة الهدف',
    restore: 'استعادة الهدف',
    delete: 'حذف الهدف',
  },
  errors: {
    startDate: 'اختر تاريخ بدء من اليوم فصاعدًا.',
    reminderTime: 'اختر وقتًا صالحًا للتذكير.',
    /** Also shown in the revision flow: «تحقّق» rather than «راجع», which reads as revising. */
    checkChoices: 'تحقّق من اختياراتك.',
    saveGoal: 'تعذّر حفظ الهدف. أعد المحاولة.',
    saveChange: 'تعذّر حفظ التعديل. أعد المحاولة.',
    saveSettings: 'تعذّر حفظ الإعدادات. أعد المحاولة.',
  },
} as const;
