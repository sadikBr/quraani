/**
 * Cities to choose from without the location permission. Coordinates from GeoNames (CC BY 4.0,
 * https://www.geonames.org), rounded to four decimals (about 10 m); names are in the `prayers`
 * catalog (`prayers.cities.<id>`), countries in `prayers.countries.<code>`.
 * Moroccan cities come first; the rest are where Moroccans and other Arabic speakers often live.
 */
const CITY_DATA = {
  casablanca: ['MA', 33.5883, -7.6114], rabat: ['MA', 34.0133, -6.8326], sale: ['MA', 34.0531, -6.7985],
  temara: ['MA', 33.9287, -6.9066], skhirate: ['MA', 33.8527, -7.0317], tamesna: ['MA', 33.8181, -6.9166],
  kenitra: ['MA', 34.261, -6.5802], mohammedia: ['MA', 33.6861, -7.383], bouznika: ['MA', 33.7894, -7.1597],
  benslimane: ['MA', 33.616, -7.1215], fes: ['MA', 34.0331, -5.0003], meknes: ['MA', 33.8935, -5.5473],
  marrakesh: ['MA', 31.6342, -7.9999], tangier: ['MA', 35.7673, -5.7998], tetouan: ['MA', 35.5785, -5.3684],
  martil: ['MA', 35.6166, -5.2752], mdiq: ['MA', 35.6831, -5.3287], fnideq: ['MA', 35.8491, -5.3575],
  asilah: ['MA', 35.4652, -6.0342], larache: ['MA', 35.1932, -6.1557], ksarElKebir: ['MA', 35.0004, -5.9038],
  chefchaouen: ['MA', 35.1688, -5.2636], ouezzane: ['MA', 34.7958, -5.5785], alHoceima: ['MA', 35.2517, -3.9372],
  imzouren: ['MA', 35.1464, -3.8506], nador: ['MA', 35.1681, -2.9335], driouch: ['MA', 34.9771, -3.379],
  zaio: ['MA', 34.9428, -2.7329], berkane: ['MA', 34.92, -2.32], ahfir: ['MA', 34.9537, -2.1003],
  oujda: ['MA', 34.6814, -1.9086], jerada: ['MA', 34.31, -2.16], taourirt: ['MA', 34.4073, -2.8973],
  guercif: ['MA', 34.2257, -3.3536], taza: ['MA', 34.21, -4.01], taounate: ['MA', 34.5366, -4.6401],
  sefrou: ['MA', 33.8319, -4.828], ifrane: ['MA', 33.5267, -5.1102], azrou: ['MA', 33.4344, -5.2213],
  boulemane: ['MA', 33.3638, -4.729], missour: ['MA', 33.0489, -3.9895], midelt: ['MA', 32.6852, -4.7451],
  khenifra: ['MA', 32.9349, -5.6617], khemisset: ['MA', 33.824, -6.0663], tiflet: ['MA', 33.8947, -6.3065],
  sidiKacem: ['MA', 34.2215, -5.7078], sidiSlimane: ['MA', 34.2648, -5.926], soukElArbaa: ['MA', 34.6847, -6.0034],
  settat: ['MA', 33.001, -7.6166], berrechid: ['MA', 33.2655, -7.5875], elJadida: ['MA', 33.2568, -8.5088],
  sidiBennour: ['MA', 32.6524, -8.4277], safi: ['MA', 32.2994, -9.2372], youssoufia: ['MA', 32.2463, -8.5294],
  benGuerir: ['MA', 32.2409, -7.954], kelaaSraghna: ['MA', 32.0512, -7.4108], khouribga: ['MA', 32.8811, -6.9063],
  ouedZem: ['MA', 32.8627, -6.5736], beniMellal: ['MA', 32.3373, -6.3498], fquihBenSalah: ['MA', 32.5021, -6.6877],
  kasbaTadla: ['MA', 32.5977, -6.2684], azilal: ['MA', 31.9616, -6.5711], chichaoua: ['MA', 31.5435, -8.7628],
  essaouira: ['MA', 31.5125, -9.77], agadir: ['MA', 30.4202, -9.5982], inezgane: ['MA', 30.3554, -9.5364],
  aitMelloul: ['MA', 30.3416, -9.5036], taroudant: ['MA', 30.4703, -8.877], tiznit: ['MA', 29.6974, -9.7316],
  sidiIfni: ['MA', 29.3798, -10.173], guelmim: ['MA', 28.987, -10.0574], tanTan: ['MA', 28.438, -11.1032],
  assa: ['MA', 28.6099, -9.4299], tata: ['MA', 29.7441, -7.973], ouarzazate: ['MA', 30.9189, -6.8934],
  zagora: ['MA', 30.3324, -5.8384], tinghir: ['MA', 31.5147, -5.5328], errachidia: ['MA', 31.9314, -4.4266],
  figuig: ['MA', 32.1089, -1.2286], bouarfa: ['MA', 32.5338, -1.9621], laayoune: ['MA', 27.1418, -13.188],
  smara: ['MA', 26.7384, -11.6719], boujdour: ['MA', 26.1307, -14.4851], dakhla: ['MA', 23.6848, -15.958],

  mecca: ['SA', 21.4266, 39.8256], medina: ['SA', 24.4686, 39.6142], riyadh: ['SA', 24.6877, 46.7219],
  jeddah: ['SA', 21.4901, 39.1862], cairo: ['EG', 30.0626, 31.2497], alexandria: ['EG', 31.2018, 29.9158],
  algiers: ['DZ', 36.7323, 3.0875], oran: ['DZ', 35.6991, -0.6359], constantine: ['DZ', 36.365, 6.6147],
  tunis: ['TN', 36.819, 10.1658], sfax: ['TN', 34.7406, 10.7603], tripoli: ['LY', 32.8874, 13.1873],
  nouakchott: ['MR', 18.0858, -15.9785], dakar: ['SN', 14.6937, -17.4441], khartoum: ['SD', 15.5518, 32.5324],
  jerusalem: ['PS', 31.7834, 35.2339], gaza: ['PS', 31.5016, 34.4667], amman: ['JO', 31.9552, 35.945],
  beirut: ['LB', 33.8933, 35.5016], damascus: ['SY', 33.5102, 36.2913], baghdad: ['IQ', 33.3406, 44.4009],
  kuwait: ['KW', 29.367, 47.9743], manama: ['BH', 26.2279, 50.5857], doha: ['QA', 25.2855, 51.531],
  abuDhabi: ['AE', 24.4512, 54.397], dubai: ['AE', 25.0773, 55.3093], muscat: ['OM', 23.5841, 58.4078],
  sanaa: ['YE', 15.3545, 44.2065], istanbul: ['TR', 41.0138, 28.9497],
  paris: ['FR', 48.8534, 2.3488], marseille: ['FR', 43.297, 5.3811], lyon: ['FR', 45.7491, 4.8479],
  toulouse: ['FR', 43.6043, 1.4437], montpellier: ['FR', 43.6109, 3.8764], bordeaux: ['FR', 44.8412, -0.5805],
  lille: ['FR', 50.6339, 3.0551], nice: ['FR', 43.7031, 7.2661], strasbourg: ['FR', 48.5839, 7.7455],
  brussels: ['BE', 50.8505, 4.3488], antwerp: ['BE', 51.2205, 4.4003], amsterdam: ['NL', 52.374, 4.8897],
  rotterdam: ['NL', 51.9225, 4.4792], madrid: ['ES', 40.4165, -3.7026], barcelona: ['ES', 41.3888, 2.159],
  valencia: ['ES', 39.4739, -0.3797], seville: ['ES', 37.3828, -5.9732], malaga: ['ES', 36.7202, -4.4203],
  granada: ['ES', 37.1882, -3.6067], murcia: ['ES', 37.987, -1.13], rome: ['IT', 41.8919, 12.5113],
  milan: ['IT', 45.4643, 9.1895], turin: ['IT', 45.0705, 7.6868], bologna: ['IT', 44.4938, 11.3388],
  geneva: ['CH', 46.2022, 6.1457], berlin: ['DE', 52.5244, 13.4105], frankfurt: ['DE', 50.1155, 8.6842],
  london: ['GB', 51.5085, -0.1257], stockholm: ['SE', 59.3294, 18.0687], montreal: ['CA', 45.5088, -73.5878],
  toronto: ['CA', 43.7064, -79.3986], newYork: ['US', 40.7143, -74.006], jakarta: ['ID', -6.2146, 106.8451],
  kualaLumpur: ['MY', 3.1412, 101.6865],
} as const satisfies Record<string, readonly [string, number, number]>;

export type CityId = keyof typeof CITY_DATA;
export type CountryCode = typeof CITY_DATA[CityId][0];
export interface City { id: CityId; country: CountryCode; latitude: number; longitude: number }

export const CITIES: City[] = (Object.keys(CITY_DATA) as CityId[]).map((id) => {
  const [country, latitude, longitude] = CITY_DATA[id];
  return { id, country, latitude, longitude };
});
export const isCityId = (value: unknown): value is CityId => typeof value === 'string' && Object.prototype.hasOwnProperty.call(CITY_DATA, value);
export const cityById = (id: CityId): City => CITIES.find((c) => c.id === id)!;

/** Great-circle distance in kilometres. */
export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = Math.PI / 180, dLat = (b.latitude - a.latitude) * rad, dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The bundled city a position belongs to, if one is within `km`. */
export function nearestCity(position: { latitude: number; longitude: number }, km = 25): City | null {
  let best: City | null = null, distance = km;
  for (const city of CITIES) {
    const d = distanceKm(position, city);
    if (d <= distance) { best = city; distance = d; }
  }
  return best;
}
