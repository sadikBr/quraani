/**
 * The tajweed rules the coloured text marks, each with the message that names and explains it
 * (`reader.tajweedRules.<key>`). Several ids share a message where they are one rule to the reader.
 */
const keys = {
  ghn: 'ghunna', qlq: 'qalqala', idgh_ghn: 'idghamGhunna', idgh_w_ghn: 'idghamNoGhunna', iqlb: 'iqlab', ikhf: 'ikhfa',
  ikhf_shfw: 'ikhfaShafawi', idghm_shfw: 'idghamShafawi', slnt: 'silent', ham_wasl: 'hamzatWasl', idgh_mus: 'idghamLetters',
  madda_normal: 'maddNatural', madda_permissible: 'maddSeparate', madda_obligatory: 'maddConnected', madda_pbligatory: 'maddConnected',
  madda_necessary: 'maddNecessary',
  warsh_badal: 'maddBadal', warsh_leen: 'maddLeen', warsh_madd_stop: 'maddStop', warsh_naql: 'naql', warsh_ibdal: 'ibdal',
  warsh_tashil: 'tashil', warsh_taqlil: 'taqlil', warsh_imala: 'imala', warsh_ra: 'raTarqiq', warsh_lam: 'lamTaghliz',
} as const;
export type TajweedRuleKey = typeof keys[keyof typeof keys];

/** The message key of a rule id, or undefined for an id the app does not explain. */
export const tajweedRuleKey = (rule: unknown): TajweedRuleKey | undefined =>
  typeof rule === 'string' && Object.hasOwn(keys, rule) ? keys[rule as keyof typeof keys] : undefined;

/** The rules whose length differs in Warsh's way (al-Azraq): they have a wording of their own for it (`warsh`). */
export const toldByRiwayah = (key: TajweedRuleKey): key is 'maddSeparate' | 'maddConnected' => key === 'maddSeparate' || key === 'maddConnected';
