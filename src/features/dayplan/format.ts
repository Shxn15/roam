const shortDate = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const longDate = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const asDate = (iso: string) => new Date(`${iso}T12:00:00Z`);

/** "Mo., 2. Nov." */
export const formatDayShort = (iso: string) => shortDate.format(asDate(iso));

/** "Montag, 2. November 2026" */
export const formatDayLong = (iso: string) => longDate.format(asDate(iso));

/** „A“, „A“ und „B“, „A“, „B“ und „C“ */
export function listTitles(titles: string[]): string {
  const quoted = titles.map((t) => `„${t}“`);
  if (quoted.length <= 1) return quoted.join('');
  return `${quoted.slice(0, -1).join(', ')} und ${quoted[quoted.length - 1]}`;
}
