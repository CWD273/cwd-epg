import { DateTime } from 'luxon';

export function normalizeChannelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(hd|sd|east|west|channel|ch|tv|network)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function toXmlDate(dt: Date): string {
  // XMLTV requires YYYYMMDDHHMMSS + tz offset as +/-HHMM
  const ldt = DateTime.fromJSDate(dt).setZone('America/Chicago');
  const offset = ldt.toFormat('ZZ'); // e.g., -0600
  return ldt.toFormat('yyyyLLddHHmmss') + ' ' + offset;
}

export function clamp<T>(val: T | undefined, fallback: T): T {
  return val === undefined || val === null ? fallback : val;
}

export function hashId(s: string): string {
  return Buffer.from(s).toString('base64').replace(/=+$/,''); // readable, stable
}
