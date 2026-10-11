import { t } from '@/i18n';
import { cityById, type CityId } from './cities';
import type { PrayerLocation } from './settings';

export const cityName = (id: CityId) => t(`prayers.cities.${id}`);
export const countryName = (id: CityId) => t(`prayers.countries.${cityById(id).country}`);

/** The place's name: its city, near a city, or "my location". */
export function placeName(location: PrayerLocation): string {
  if (location.city) return cityName(location.city);
  if (location.near) return t('prayers.location.near', { city: cityName(location.near) });
  return location.name ?? t('prayers.location.current');
}
