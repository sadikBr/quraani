export const readerThemes = {
  light: {
    background: '#F5F3ED', paper: '#FFFEFA', text: '#203D38', muted: '#607169',
    accent: '#24685B', accentSoft: '#E8EFEB', border: '#E2E6DD', ornament: '#8B713D',
    selected: '#DAEAE0', warning: '#96552D',
    hero: '#153F38', onHero: '#FFF9EB', heroMuted: '#B9CFC4', goldSoft: '#F0E9D8',
  },
  dark: {
    background: '#101E1B', paper: '#172924', text: '#EAF0E7', muted: '#A0B4AA',
    accent: '#AFD8C4', accentSoft: '#253F35', border: '#2F453B', ornament: '#CCB77F',
    selected: '#355643', warning: '#E9BB8D',
    hero: '#1D3B32', onHero: '#F5F1DF', heroMuted: '#B9CFC4', goldSoft: '#363829',
  },
  emerald: {
    background: '#0C2520', paper: '#153B32', text: '#F0F3DE', muted: '#B2C8BA',
    accent: '#E0C16F', accentSoft: '#294A37', border: '#395A47', ornament: '#E0C16F',
    selected: '#3B5A3C', warning: '#F1B58B',
    hero: '#204A3B', onHero: '#FFF3CD', heroMuted: '#C7D5B7', goldSoft: '#384B2F',
  },
  sand: {
    background: '#F2EADB', paper: '#FFF9ED', text: '#493924', muted: '#78664D',
    accent: '#7D552A', accentSoft: '#F0E2CB', border: '#DDCBAE', ornament: '#906327',
    selected: '#E8D6B8', warning: '#99502B',
    hero: '#604426', onHero: '#FFF6E3', heroMuted: '#DEC9A8', goldSoft: '#F2E5CB',
  },
  rose: {
    background: '#F7EDF0', paper: '#FFF8FA', text: '#512F3D', muted: '#82606E',
    accent: '#963D62', accentSoft: '#F3E0E8', border: '#E8C9D5', ornament: '#9A4767',
    selected: '#ECCBD9', warning: '#9A522E',
    hero: '#623447', onHero: '#FFF2F6', heroMuted: '#E6BECF', goldSoft: '#F3E2D9',
  },
  midnight: {
    background: '#0D1628', paper: '#162238', text: '#E6EDF7', muted: '#A7B7D0',
    accent: '#AEC9FF', accentSoft: '#263A58', border: '#344660', ornament: '#E2C789',
    selected: '#354E70', warning: '#F1B58B',
    hero: '#1E304E', onHero: '#F3F0E6', heroMuted: '#B8CBE6', goldSoft: '#363C42',
  },
  olive: {
    background: '#EFF0E3', paper: '#F9FAF0', text: '#344125', muted: '#65714F',
    accent: '#526C35', accentSoft: '#E5EBD7', border: '#CED7BA', ornament: '#78642C',
    selected: '#D5E0BF', warning: '#94512C',
    hero: '#3C512D', onHero: '#F8F8E7', heroMuted: '#D0DDB9', goldSoft: '#EFEBCE',
  },
  aurora: {
    background: '#1B172A', paper: '#262038', text: '#EEE9F8', muted: '#BEB1D2',
    accent: '#9EDCCD', accentSoft: '#373348', border: '#4A405C', ornament: '#BAA5E5',
    selected: '#46415E', warning: '#F0B694',
    hero: '#352C48', onHero: '#F4EFFB', heroMuted: '#C8BADF', goldSoft: '#3E354F',
  },
  sea: {
    background: '#EAF6F3', paper: '#F7FFFC', text: '#234741', muted: '#51756D',
    accent: '#14756C', accentSoft: '#D9EFEB', border: '#B9DBD3', ornament: '#327B75',
    selected: '#BFE3DB', warning: '#92532D',
    hero: '#185A52', onHero: '#EEFFFA', heroMuted: '#B2DED2', goldSoft: '#E2EEDC',
  },
  lavender: {
    background: '#F1EDF8', paper: '#FBF8FF', text: '#433451', muted: '#756385',
    accent: '#77529A', accentSoft: '#EBE1F4', border: '#D8C8E6', ornament: '#7E589C',
    selected: '#DCCCEB', warning: '#98532D',
    hero: '#503965', onHero: '#FCF3FF', heroMuted: '#DDC9EC', goldSoft: '#EFE5F0',
  },
  copper: {
    background: '#211B18', paper: '#30251F', text: '#F5E9DC', muted: '#C6AE9A',
    accent: '#EBAE84', accentSoft: '#4B3529', border: '#644838', ornament: '#EBAE84',
    selected: '#664834', warning: '#F0B58A',
    hero: '#483023', onHero: '#FFF0DD', heroMuted: '#DFC0A4', goldSoft: '#4A3827',
  },
} as const;

export type ReaderPalette = { [K in keyof typeof readerThemes.light]: string };
export type ReaderThemeId = keyof typeof readerThemes;
export type ReaderAppearance = 'system' | ReaderThemeId;

export const readerThemeOptions = [
  { id: 'system', label: 'حسب الجهاز', dark: false },
  { id: 'light', label: 'فاتح', dark: false },
  { id: 'dark', label: 'داكن', dark: true },
  { id: 'emerald', label: 'زمرد وذهب', dark: true },
  { id: 'sand', label: 'لؤلؤة الصحراء', dark: false },
  { id: 'rose', label: 'كوارتز وردي', dark: false },
  { id: 'midnight', label: 'ياقوت ليلي', dark: true },
  { id: 'olive', label: 'حرير الزيتون', dark: false },
  { id: 'aurora', label: 'الشفق القطبي', dark: true },
  { id: 'sea', label: 'زجاج البحر', dark: false },
  { id: 'lavender', label: 'فجر الوستيريا', dark: false },
  { id: 'copper', label: 'ليل النحاس', dark: true },
] as const satisfies readonly { id: ReaderAppearance; label: string; dark: boolean }[];

export function isReaderAppearance(value: unknown): value is ReaderAppearance {
  return value === 'system' || (typeof value === 'string' && Object.hasOwn(readerThemes, value));
}

export function resolveReaderTheme(appearance: ReaderAppearance, systemTheme: string | null | undefined) {
  const id = appearance === 'system' ? (systemTheme === 'dark' ? 'dark' : 'light') : appearance;
  return { palette: readerThemes[id], dark: readerThemeOptions.some((option) => option.id === id && option.dark) };
}

export const READER_FONT_MIN = 24;
export const READER_FONT_MAX = 48;
export const READER_FONT_DEFAULT = 32;
