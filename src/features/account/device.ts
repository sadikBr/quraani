import { Platform } from 'react-native';
import { t } from '@/i18n';

const capitalized = (word: string) => word ? word[0].toUpperCase() + word.slice(1) : word;

/**
 * What this device calls itself in the account's list of devices: «Samsung SM-A546E · Android 14»,
 * «iPhone · iOS 18.1», «Chrome · Windows».
 */
export function deviceName(): string {
  if (Platform.OS === 'android') {
    const { Manufacturer, Brand, Model, Release } = Platform.constants;
    const maker = capitalized((Manufacturer || Brand || '').trim());
    const model = (Model || '').trim();
    const name = !maker || model.toLowerCase().startsWith(maker.toLowerCase()) ? model : `${maker} ${model}`;
    return `${name || 'Android'} · Android ${Release}`;
  }
  if (Platform.OS === 'ios') return `${Platform.isPad ? 'iPad' : 'iPhone'} · iOS ${Platform.constants.osVersion}`;
  const agent = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  const browser = /Edg\//.test(agent) ? 'Edge' : /Firefox\//.test(agent) ? 'Firefox' : /Chrome\//.test(agent) ? 'Chrome' : /Safari\//.test(agent) ? 'Safari' : t('account.devices.browser');
  const system = /Windows/.test(agent) ? 'Windows' : /Android/.test(agent) ? 'Android' : /iPhone|iPad/.test(agent) ? 'iOS' : /Mac OS/.test(agent) ? 'macOS' : /Linux/.test(agent) ? 'Linux' : '';
  return system ? `${browser} · ${system}` : browser;
}

export const devicePlatform = (): 'android' | 'ios' | 'web' => Platform.OS === 'android' || Platform.OS === 'ios' ? Platform.OS : 'web';
