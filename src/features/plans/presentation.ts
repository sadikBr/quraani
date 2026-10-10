export const arabicNumber = (n: number) => n.toLocaleString('ar');
export const shortDate = (date: string) => new Intl.DateTimeFormat('ar-MA', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));

export const weekdayDateLabel = (date: string) => new Intl.DateTimeFormat('ar-MA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
