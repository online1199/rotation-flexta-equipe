import { parseISO, isWithinInterval } from "date-fns";

export const toISO = (d: Date) => d.toISOString().slice(0, 10);

export function isOnLeave(dateISO: string, leaves: {start: string; end: string}[]): boolean {
  const d = parseISO(dateISO);
  return leaves?.some(({ start, end }) =>
    isWithinInterval(d, { start: parseISO(start), end: parseISO(end) })
  ) ?? false;
}