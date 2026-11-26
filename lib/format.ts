export function formatNumberEn(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatTripoliDateParts(iso: string): { dateStr: string; timeStr: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { dateStr: '—', timeStr: '—' };

  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Tripoli',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);

  const year = dateParts.find((p) => p.type === 'year')?.value || '2026';
  const month = dateParts.find((p) => p.type === 'month')?.value || '01';
  const day = dateParts.find((p) => p.type === 'day')?.value || '01';

  const timeParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Tripoli',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);

  const hour = timeParts.find((p) => p.type === 'hour')?.value || '00';
  const minute = timeParts.find((p) => p.type === 'minute')?.value || '00';

  return {
    dateStr: `${year}/${month}/${day}`,
    timeStr: `${hour}:${minute}`,
  };
}

export function formatTripoliDateTime(iso: string): string {
  const { dateStr, timeStr } = formatTripoliDateParts(iso);
  return `${dateStr} · ${timeStr}`;
}
