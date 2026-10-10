import { isDarkColor, mixColor } from './colors';
import { t } from '@/i18n';

/**
 * Colour roles follow the Universal UI (shadcn/ui) design system, so every
 * component reads the same names in every theme. `ornament` (gold) and
 * `highlight` (selected ayah) are the reader's own additions.
 */
export interface ReaderPalette {
  background: string; foreground: string;
  card: string; popover: string;
  primary: string; primaryForeground: string;
  secondary: string; secondaryForeground: string;
  muted: string; mutedForeground: string;
  accent: string; accentForeground: string;
  destructive: string; destructiveForeground: string;
  success: string; warning: string;
  border: string; input: string; ring: string; overlay: string;
  ornament: string; highlight: string;
}

/** The palette each colour theme was designed with; roles are derived from it. */
interface ThemeSeed {
  background: string; paper: string; text: string; muted: string;
  accent: string; accentSoft: string; border: string; ornament: string;
  selected: string; warning: string;
  hero: string; onHero: string; heroMuted: string; goldSoft: string;
}

function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const c = hex.slice(1, 7).match(/../g)!.map(x => { const v = parseInt(x, 16) / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
const onFill = (fill: string, candidates: string[]) => candidates.reduce((best, c) => contrast(fill, c) > contrast(fill, best) ? c : best);

function fromSeed(seed: ThemeSeed): ReaderPalette {
  const dark = isDarkColor(seed.background);
  // Fills must read against both the page and cards: step away from the darker
  // surface on light themes and from the lighter one on dark themes.
  const fill = dark ? mixColor(seed.paper, seed.text, 0.09) : mixColor(seed.background, seed.text, 0.06);
  return {
    background: seed.background, foreground: seed.text,
    card: seed.paper, popover: seed.paper,
    primary: seed.accent, primaryForeground: onFill(seed.accent, [seed.background, seed.text]),
    secondary: fill, secondaryForeground: seed.text,
    muted: fill, mutedForeground: seed.muted,
    accent: seed.accentSoft, accentForeground: seed.text,
    destructive: seed.warning, destructiveForeground: onFill(seed.warning, [seed.background, '#FFFFFF']),
    success: dark ? '#05DF72' : '#008236', warning: '#FFB900',
    border: seed.border, input: dark ? mixColor(seed.border, seed.text, 0.12) : seed.border,
    ring: mixColor(seed.text, seed.background, 0.5), overlay: '#00000080',
    ornament: seed.ornament, highlight: seed.selected,
  };
}

/** shadcn/ui neutral, exactly; alpha borders are flattened over the card. */
const neutralLight: ReaderPalette = {
  background: '#FFFFFF', foreground: '#0A0A0A', card: '#FFFFFF', popover: '#FFFFFF',
  primary: '#171717', primaryForeground: '#FAFAFA', secondary: '#F5F5F5', secondaryForeground: '#171717',
  muted: '#F5F5F5', mutedForeground: '#737373', accent: '#F5F5F5', accentForeground: '#171717',
  destructive: '#E7000B', destructiveForeground: '#FFFFFF', success: '#008236', warning: '#FFB900',
  border: '#E5E5E5', input: '#E5E5E5', ring: '#A1A1A1', overlay: '#00000080',
  ornament: '#9A7A3A', highlight: '#EDEDED',
};
const neutralDark: ReaderPalette = {
  background: '#0A0A0A', foreground: '#FAFAFA', card: '#171717', popover: '#171717',
  primary: '#E5E5E5', primaryForeground: '#171717', secondary: '#262626', secondaryForeground: '#FAFAFA',
  muted: '#262626', mutedForeground: '#A1A1A1', accent: '#262626', accentForeground: '#FAFAFA',
  destructive: '#FF6467', destructiveForeground: '#0A0A0A', success: '#05DF72', warning: '#FFB900',
  border: '#2E2E2E', input: '#383838', ring: '#737373', overlay: '#00000080',
  ornament: '#D8B875', highlight: '#2A2A2A',
};

const themeSeeds = {
  emerald: {
    background: '#062E25', paper: '#0D4937', text: '#F4F0D6', muted: '#B4D1B9',
    accent: '#F0C85A', accentSoft: '#1B6046', border: '#2A7555', ornament: '#F0C85A',
    selected: '#2C704F', warning: '#F3AD80',
    hero: '#0A6044', onHero: '#FFF9D9', heroMuted: '#C0DFBF', goldSoft: '#465637',
  },
  sand: {
    background: '#F8F0E4', paper: '#FFFDF8', text: '#4A382A', muted: '#7A6654',
    accent: '#8A4F25', accentSoft: '#F5E4D0', border: '#E6CEB4', ornament: '#8E5C2D',
    selected: '#EED8BF', warning: '#A1492C',
    hero: '#6F4129', onHero: '#FFF7E8', heroMuted: '#E2C3A6', goldSoft: '#F3E1BF',
  },
  rose: {
    background: '#FFF1F4', paper: '#FFFAFC', text: '#512F40', muted: '#805C6C',
    accent: '#9C3A65', accentSoft: '#F7DEE8', border: '#EBC4D3', ornament: '#A95070',
    selected: '#F2CDDB', warning: '#A84A2E',
    hero: '#71344F', onHero: '#FFF3F7', heroMuted: '#E9BDD0', goldSoft: '#F3E1D8',
  },
  midnight: {
    background: '#0B1630', paper: '#142348', text: '#EAF1FF', muted: '#A8B9D3',
    accent: '#8FB6FF', accentSoft: '#223A63', border: '#385275', ornament: '#E7C66F',
    selected: '#2E4C78', warning: '#F1B188',
    hero: '#1D3760', onHero: '#F5F8FF', heroMuted: '#B7CBE5', goldSoft: '#3B3C32',
  },
  olive: {
    background: '#F3F5E9', paper: '#FDFFF7', text: '#354526', muted: '#64734F',
    accent: '#4D6732', accentSoft: '#E5EED8', border: '#CAD9B7', ornament: '#8B6B2C',
    selected: '#D9E7C6', warning: '#96512D',
    hero: '#405E31', onHero: '#F9FBEA', heroMuted: '#C9DBB6', goldSoft: '#F0E9C9',
  },
  aurora: {
    background: '#17132B', paper: '#241D3E', text: '#F3EEFF', muted: '#C0B6D6',
    accent: '#95E1D1', accentSoft: '#343050', border: '#4D446B', ornament: '#C8A9F0',
    selected: '#463D64', warning: '#F0B28D',
    hero: '#342850', onHero: '#FFF8FF', heroMuted: '#C9BCE0', goldSoft: '#403751',
  },
  sea: {
    background: '#E8F8F6', paper: '#FCFFFE', text: '#184B46', muted: '#4F7771',
    accent: '#08766D', accentSoft: '#D4F0EC', border: '#B5DDD7', ornament: '#2D8178',
    selected: '#BFE6DF', warning: '#92532F',
    hero: '#126258', onHero: '#EEFFFC', heroMuted: '#B7DDD5', goldSoft: '#DFEEDC',
  },
  lavender: {
    background: '#F6F1FB', paper: '#FFFCFF', text: '#493456', muted: '#766187',
    accent: '#70458E', accentSoft: '#EDE2F5', border: '#D9C8E8', ornament: '#8A63A9',
    selected: '#E0D0EE', warning: '#98502F',
    hero: '#57386E', onHero: '#FFF6FF', heroMuted: '#DFC8EB', goldSoft: '#F0E4F1',
  },
  copper: {
    background: '#241815', paper: '#34211B', text: '#FFF0E3', muted: '#CCB19C',
    accent: '#F0A679', accentSoft: '#523529', border: '#704A37', ornament: '#E6B773',
    selected: '#694634', warning: '#F5B48D',
    hero: '#4B2D23', onHero: '#FFF5E9', heroMuted: '#E0C0A4', goldSoft: '#4A3928',
  },
  porcelain: {
    background: '#EFF7FD', paper: '#FBFEFF', text: '#1D3C57', muted: '#57728A',
    accent: '#2E6899', accentSoft: '#DDECF8', border: '#BED6E8', ornament: '#8C6C3C',
    selected: '#D0E5F4', warning: '#9A4F2D',
    hero: '#2A557A', onHero: '#F4FAFF', heroMuted: '#BDD8EA', goldSoft: '#EEE9D7',
  },
  apricot: {
    background: '#FFF1E8', paper: '#FFFDFC', text: '#57372B', muted: '#806252',
    accent: '#984B30', accentSoft: '#F7E0D3', border: '#EAC8B6', ornament: '#A86A35',
    selected: '#F1D4C4', warning: '#9D4D2B',
    hero: '#743C2B', onHero: '#FFF6E9', heroMuted: '#E9C5B0', goldSoft: '#F4E2C7',
  },
  silver: {
    background: '#12151B', paper: '#1D222B', text: '#F2F4F8', muted: '#AEB8C7',
    accent: '#C9D8ED', accentSoft: '#303A4B', border: '#455365', ornament: '#BCCBE0',
    selected: '#425267', warning: '#EFB18B',
    hero: '#273242', onHero: '#F6F9FF', heroMuted: '#BDC9D8', goldSoft: '#353A41',
  },
  garnet: {
    background: '#27121F', paper: '#391B2B', text: '#FFEAF2', muted: '#D6AFC1',
    accent: '#F0A9BC', accentSoft: '#553047', border: '#74475D', ornament: '#E9C985',
    selected: '#6B3B54', warning: '#F5B296',
    hero: '#4A263D', onHero: '#FFF1F3', heroMuted: '#E4BFD0', goldSoft: '#51383A',
  },
  pearl: {
    background: '#09242B', paper: '#123840', text: '#E6F7F6', muted: '#A6C9CC',
    accent: '#78E2E2', accentSoft: '#1E525C', border: '#3A6972', ornament: '#E6CE96',
    selected: '#2D626C', warning: '#F1B690',
    hero: '#174B55', onHero: '#F1FFFC', heroMuted: '#B8DADB', goldSoft: '#364B48',
  },
  manuscript: {
    background: '#F8F3E8', paper: '#FFFEF7', text: '#30354A', muted: '#686F82',
    accent: '#5D6199', accentSoft: '#EBE8F4', border: '#D9D5DD', ornament: '#9B743B',
    selected: '#DFDDF0', warning: '#97502E',
    hero: '#3B426B', onHero: '#FFF9E8', heroMuted: '#D4D1E4', goldSoft: '#EFE4C5',
  },
  marble: {
    background: '#F5F7F6', paper: '#FFFFFF', text: '#263C40', muted: '#5A7074',
    accent: '#A9444A', accentSoft: '#F5E0DF', border: '#D5DFDE', ornament: '#A06B4E',
    selected: '#EDD0D0', warning: '#994A2E',
    hero: '#405B60', onHero: '#FFF6EF', heroMuted: '#C8D9D9', goldSoft: '#F0E4D8',
  },
  amber: {
    background: '#171910', paper: '#24271A', text: '#F6F0D9', muted: '#C1C39F',
    accent: '#E8D37D', accentSoft: '#3A4128', border: '#56603A', ornament: '#E8D37D',
    selected: '#53623A', warning: '#EFB58D',
    hero: '#313820', onHero: '#FFFBE7', heroMuted: '#D8D9AF', goldSoft: '#42462D',
  },
  andalus: {
    background: '#0E1C2A', paper: '#162D40', text: '#F0F5F4', muted: '#A5BFCA',
    accent: '#F1A78B', accentSoft: '#44343A', border: '#3D5A70', ornament: '#E6C17E',
    selected: '#58454A', warning: '#F1B38B',
    hero: '#24445A', onHero: '#FFF5EB', heroMuted: '#BED6D8', goldSoft: '#3F3D34',
  },
  glacier: {
    background: '#E2F6FF', paper: '#F7FDFF', text: '#082B45', muted: '#3E647C',
    accent: '#0756D9', accentSoft: '#C8E8FF', border: '#8FC7EA', ornament: '#0A7AA5',
    selected: '#B8DDF7', warning: '#92452D',
    hero: '#063A66', onHero: '#F1FBFF', heroMuted: '#A6D5EA', goldSoft: '#E8E0B8',
  },
  glacierNight: {
    background: '#061526', paper: '#0C2843', text: '#ECF8FF', muted: '#A5CFEA',
    accent: '#5BC4FF', accentSoft: '#104C71', border: '#23688C', ornament: '#F2CD70',
    selected: '#145574', warning: '#F0AE82',
    hero: '#062F54', onHero: '#F2FBFF', heroMuted: '#9FD4EA', goldSoft: '#3C3A2A',
  },
  coralMint: {
    background: '#FFFBE8', paper: '#FFFFF6', text: '#2B3343', muted: '#606875',
    accent: '#96305F', accentSoft: '#F4DDE9', border: '#E1D49B', ornament: '#8A6A18',
    selected: '#F3E7B5', warning: '#9B4D2E',
    hero: '#3C345D', onHero: '#FFFDF0', heroMuted: '#D9CCE7', goldSoft: '#F1E4AB',
  },
  coralMintNight: {
    background: '#1E1626', paper: '#2D1D36', text: '#FFF4DA', muted: '#D3B8C9',
    accent: '#FF9B5E', accentSoft: '#5B2F3D', border: '#744454', ornament: '#F4D269',
    selected: '#70404B', warning: '#F2B185',
    hero: '#3A2345', onHero: '#FFF7E2', heroMuted: '#E5BDD0', goldSoft: '#4D412B',
  },
} as const satisfies Record<string, ThemeSeed>;

export const readerThemes = {
  light: neutralLight,
  dark: neutralDark,
  ...Object.fromEntries(Object.entries(themeSeeds).map(([id, seed]) => [id, fromSeed(seed)])) as Record<keyof typeof themeSeeds, ReaderPalette>,
};


export type ReaderThemeId = keyof typeof readerThemes;
export type ReaderAppearance = 'system' | ReaderThemeId;

export const readerThemeOptions = [
  { id: 'system', get label() { return t('themes.system'); }, dark: false },
  { id: 'light', get label() { return t('themes.light'); }, dark: false },
  { id: 'dark', get label() { return t('themes.dark'); }, dark: true },
  { id: 'emerald', get label() { return t('themes.emerald'); }, dark: true },
  { id: 'sand', get label() { return t('themes.sand'); }, dark: false },
  { id: 'rose', get label() { return t('themes.rose'); }, dark: false },
  { id: 'midnight', get label() { return t('themes.midnight'); }, dark: true },
  { id: 'olive', get label() { return t('themes.olive'); }, dark: false },
  { id: 'aurora', get label() { return t('themes.aurora'); }, dark: true },
  { id: 'sea', get label() { return t('themes.sea'); }, dark: false },
  { id: 'lavender', get label() { return t('themes.lavender'); }, dark: false },
  { id: 'copper', get label() { return t('themes.copper'); }, dark: true },
  { id: 'porcelain', get label() { return t('themes.porcelain'); }, dark: false },
  { id: 'apricot', get label() { return t('themes.apricot'); }, dark: false },
  { id: 'silver', get label() { return t('themes.silver'); }, dark: true },
  { id: 'garnet', get label() { return t('themes.garnet'); }, dark: true },
  { id: 'pearl', get label() { return t('themes.pearl'); }, dark: true },
  { id: 'manuscript', get label() { return t('themes.manuscript'); }, dark: false },
  { id: 'marble', get label() { return t('themes.marble'); }, dark: false },
  { id: 'amber', get label() { return t('themes.amber'); }, dark: true },
  { id: 'andalus', get label() { return t('themes.andalus'); }, dark: true },
  { id: 'glacier', get label() { return t('themes.glacier'); }, dark: false },
  { id: 'glacierNight', get label() { return t('themes.glacierNight'); }, dark: true },
  { id: 'coralMint', get label() { return t('themes.coralMint'); }, dark: false },
  { id: 'coralMintNight', get label() { return t('themes.coralMintNight'); }, dark: true },
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
