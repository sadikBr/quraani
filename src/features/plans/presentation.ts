import { formatDate } from '@/i18n';

export const shortDate = (date: string) => formatDate(date, { day: 'numeric', month: 'long' });
export const weekdayDateLabel = (date: string) => formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
