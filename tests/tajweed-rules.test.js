import { expect, test } from 'bun:test';
import data from '../assets/tajweed/warsh-azraq-v1.json';
import ar from '../src/i18n/locales/ar/reader';
import { tajweedColor } from '../src/features/quran-reader/utils/tajweed';
import { tajweedRuleKey, toldByRiwayah } from '../src/features/quran-reader/utils/tajweed-rules';

const hafs = ['ghn', 'qlq', 'idgh_ghn', 'idgh_w_ghn', 'iqlb', 'ikhf', 'ikhf_shfw', 'idghm_shfw', 'slnt', 'ham_wasl', 'madda_necessary', 'madda_obligatory', 'madda_pbligatory', 'madda_permissible', 'madda_normal', 'idgh_mus'];

test('every coloured rule has a name and an explanation, and nothing else is taken for a rule', () => {
  const warsh = data.rules.filter((rule) => tajweedColor(rule, false, '') !== '');
  expect(warsh.length).toBeGreaterThan(15);
  for (const rule of [...hafs, ...warsh]) {
    const key = tajweedRuleKey(rule);
    expect(key).toBeDefined();
    expect(ar.tajweedRules[key].name).toBeTruthy();
    expect(ar.tajweedRules[key].text).toBeTruthy();
    if (toldByRiwayah(key)) expect(ar.tajweedRules[key].warsh).toBeTruthy();
  }
  for (const other of ['', 'toString', 'constructor', '__proto__', 42, null, 'x"><script>']) expect(tajweedRuleKey(other)).toBeUndefined();
});
