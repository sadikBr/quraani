/**
 * Everything the app is built on that others made: the Quran content, the athan recordings, the
 * calculation, fonts and icons. Each work keeps its own title and author as published (`work`),
 * with its source and licence; Arabic titles and notes are in the `credits` catalog. Licences that
 * ask for attribution (CC BY, CC BY-SA, OFL, MIT, ISC) are met here.
 */
export interface Credit {
  id: string;
  work: string;
  source: string;
  /** A licence with its text online, by its usual name. */
  licence?: string;
  licenceUrl?: string;
  /**
   * Otherwise its kind, named in the catalog: no licence needed, the publisher's own terms, used
   * with the publisher's leave, or no licence stated (the rights stay with their owners).
   */
  terms?: 'publicDomain' | 'kfgqpc' | 'permission' | 'rights';
}

const CC = {
  zero: { licence: 'CC0 1.0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/' },
  by3: { licence: 'CC BY 3.0', licenceUrl: 'https://creativecommons.org/licenses/by/3.0/' },
  by4: { licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/' },
  bySa3: { licence: 'CC BY-SA 3.0', licenceUrl: 'https://creativecommons.org/licenses/by-sa/3.0/' },
  bySa4: { licence: 'CC BY-SA 4.0', licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' },
};
const OFL = { licence: 'SIL OFL 1.1', licenceUrl: 'https://openfontlicense.org' };
const MIT = { licence: 'MIT', licenceUrl: 'https://opensource.org/license/mit' };
const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
/** Where the athans came from: AlAdhan's recordings, Islamweb's, and two open-source athan apps. */
const ALADHAN = 'https://aladhan.com';
const ISLAMWEB = 'https://audio.islamweb.net';
const MUEZZIN = 'https://github.com/DBChoco/Muezzin';
const AL_AZAN = 'https://github.com/meypod/al-azan-compose';

export const CREDIT_SECTIONS = [
  { id: 'quran', items: [
    { id: 'quranpedia', work: 'Quranpedia', source: 'https://quranpedia.net' },
    { id: 'mushafFonts', work: 'KFGQPC Uthmanic Hafs V22, KFGQPC Uthmanic Warsh V21', source: 'https://qurancomplex.gov.sa', terms: 'kfgqpc' },
    { id: 'tajweed', work: 'QUD Quranic Phonemizer', source: 'https://github.com/QUD-Technologies/quranic-phonemizer', ...MIT },
    { id: 'surahFont', work: 'arab quran islamic 140', source: 'http://quranb1og.blogspot.com' },
    { id: 'athman', work: 'ma-mushaf-muhammadi-data by Noureddine El-Ahmadi', source: 'https://github.com/smartmaker-devs/nuralhifz-data', ...CC.by4 },
  ] },
  { id: 'adhkar', items: [
    { id: 'hisn', work: 'Hisn al-Muslim', source: 'https://www.hisnmuslim.com' },
  ] },
  { id: 'recordings', items: [
    { id: 'makkah', work: '"Adhan - Mecca", in Muezzin by DBChoco', source: MUEZZIN, terms: 'rights' },
    { id: 'madinah', work: '"masjid_an_nabawi", in Al-Azan by meypod', source: AL_AZAN, terms: 'rights' },
    { id: 'aqsa', work: '"Adhan - al-Aqsa", in Muezzin by DBChoco', source: MUEZZIN, terms: 'rights' },
    { id: 'alafasy', work: '"Another Adhan by Mishary Rashid Alafasy", AlAdhan', source: ALADHAN, terms: 'permission' },
    { id: 'alafasy2', work: 'Adhan by Mishary Rashid Alafasy (Dubai One TV), AlAdhan', source: ALADHAN, terms: 'permission' },
    { id: 'nufais', work: 'Adhan by Ahmad al-Nafees, AlAdhan', source: ALADHAN, terms: 'permission' },
    { id: 'zahrani', work: 'Adhan by Mansour Al-Zahrani, AlAdhan', source: ALADHAN, terms: 'permission' },
    { id: 'qatami', work: 'Adhan by Nasser Al-Qatami, Islamweb', source: ISLAMWEB, terms: 'rights' },
    { id: 'dosari', work: 'Adhan by Yasser Al-Dosari, Islamweb', source: ISLAMWEB, terms: 'rights' },
    { id: 'kurdi', work: 'Adhan by Ahmad Al-Kurdi, Islamweb', source: ISLAMWEB, terms: 'rights' },
    { id: 'abdulbasit', work: '"abdul_basit_abdus_samad", in Al-Azan by meypod', source: AL_AZAN, terms: 'rights' },
    { id: 'ozcan', work: 'Adhan by Hafiz Mustafa Özcan, AlAdhan', source: ALADHAN, terms: 'permission' },
    { id: 'single', work: '"AllahuAkbar", in Muezzin by DBChoco', source: MUEZZIN, terms: 'rights' },
  ] },
  { id: 'photos', items: [
    { id: 'photoMakkahNight', work: '"Al Haram, Mecca 24231, Saudi Arabia" by TaLha Hussain (BAIG)', source: commons('Al_Haram,_Mecca_24231,_Saudi_Arabia_-_panoramio_(6).jpg'), ...CC.by3 },
    { id: 'photoMakkahDay', work: '"The historic and most phenomenonal view of The Holy kabah and the clock tower" by FAREHA HASAN', source: commons('The_historic_and_most_phenomenonal_view_of_The_Holy_kabah_and_the_clock_tower.jpg'), ...CC.by4 },
    { id: 'photoMadinah', work: '"Close-up shot of the Green Dome at The Prophet\'s Mosque" by TheHadiRahim', source: commons('Close-up_shot_of_the_Green_Dome_at_The_Prophet%27s_Mosque_(Al_Masjid-e-Nabawi).jpg'), ...CC.zero },
    { id: 'photoMadinahNight', work: '"Al-Masjid al-Nabawi in Medina" by Mardetanha', source: commons('Outsideofmasjedonnabi11.JPG'), ...CC.bySa3 },
    { id: 'photoAqsa', work: '"Dome of the Rock (Dome)" by Andrew Shiva / Wikipedia', source: commons('Jerusalem-2013-Temple_Mount-_Dome_of_the_Rock_(Dome).jpg'), ...CC.bySa4 },
    { id: 'photoHassan2', work: '"Corridor at the Hassan II Mosque, Casablanca, Morocco" by Tinuzzo', source: commons('Corridor_at_the_Hassan_II_Mosque,_Casablanca,_Morocco.jpg'), ...CC.by4 },
    { id: 'photoKoutoubia', work: '"The Koutoubia Mosque" by Holger Uwe Schmitt', source: commons('1158_wurde_die_Koutoubia-Moschee_in_Marrakesch_er%C3%B6fnet._04.jpg'), ...CC.bySa4 },
  ] },
  { id: 'prayers', items: [
    { id: 'adhan', work: 'Adhan JavaScript by Batoul Apps', source: 'https://github.com/batoulapps/adhan-js', ...MIT },
    { id: 'geonames', work: 'GeoNames', source: 'https://www.geonames.org', ...CC.by4 },
  ] },
  { id: 'interface', items: [
    { id: 'plex', work: 'IBM Plex Sans Arabic by IBM', source: 'https://github.com/IBM/plex', ...OFL },
    { id: 'geist', work: 'Geist by Vercel', source: 'https://github.com/vercel/geist-font', ...OFL },
    { id: 'noto', work: 'Noto Naskh Arabic, Noto Sans Arabic by the Noto Project Authors', source: 'https://github.com/notofonts/arabic', ...OFL },
    { id: 'lucide', work: 'Lucide', source: 'https://lucide.dev', licence: 'ISC', licenceUrl: 'https://lucide.dev/license' },
    { id: 'expo', work: 'Expo, React Native', source: 'https://expo.dev', ...MIT },
  ] },
] as const satisfies readonly { id: string; items: readonly Credit[] }[];
