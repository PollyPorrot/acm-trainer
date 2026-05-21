function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isSameLocalDay(left: Date | string, right: Date | string) {
  const leftDate = toDate(left);
  const rightDate = toDate(right);

  if (!leftDate || !rightDate) {
    return false;
  }

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
}

export function monthKeyFromIso(iso: string) {
  const date = toDate(iso);

  if (!date) {
    return "";
  }

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function formatLocalDateTimeInput(iso: string) {
  const date = toDate(iso);

  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function parseLocalDateTimeInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return "";
  }

  const [, year, month, day, hours, minutes] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    0,
    0
  );

  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
