import { normalizeChannelName, hashId } from './util';
import { load } from 'cheerio';
import { distance as levenshtein } from 'fast-levenshtein';

export type StationMatch = {
  stationName: string;
  stationUrl: string;
  score: number;
};

export type Programme = {
  channelId: string;
  channelName: string;
  start: Date;
  stop: Date;
  title: string;
  desc?: string;
  category?: string;
  episode?: string;
};

const BASE = 'https://www.tvpassport.com';

export async function searchStationsByName(name: string): Promise<StationMatch[]> {
  const q = encodeURIComponent(name);
  const url = `${BASE}/tv-listings?search=${q}`;
  const res = await fetch(url, { headers: defaultHeaders() });
  if (!res.ok) return [];
  const html = await res.text();
  const $ = load(html);

  const candidates: StationMatch[] = [];
  $('.listings .station .title a').each((_, el) => {
    const stationName = $(el).text().trim();
    const stationHref = $(el).attr('href') || '';
    if (stationHref.startsWith('/')) {
      const score = similarityScore(name, stationName);
      candidates.push({ stationName, stationUrl: BASE + stationHref, score });
    }
  });

  // sort by approximate similarity descending
  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

export async function scrapeSchedule(stationUrl: string, days = 1): Promise<Programme[]> {
  const res = await fetch(stationUrl, { headers: defaultHeaders() });
  if (!res.ok) return [];
  const html = await res.text();
  const $ = load(html);

  const channelName = $('h1').first().text().trim() || 'Unknown';
  const channelId = hashId(channelName);

  const programmes: Programme[] = [];

  // Primary structure
  $('.listings .program').each((_, el) => {
    const title = $(el).find('.program-title').text().trim();
    const timeStr = $(el).find('.program-time').text().trim();
    const desc = $(el).find('.program-description').text().trim();
    const category = $(el).find('.program-genre').text().trim();

    const [start, stop] = parseTimeRange(timeStr);
    if (!start || !stop || !title) return;

    programmes.push({
      channelId,
      channelName,
      start,
      stop,
      title,
      desc: desc || undefined,
      category: category || undefined
    });
  });

  // Secondary fallback
  if (programmes.length === 0) {
    $('.listings .row').each((_, el) => {
      const title = $(el).find('.title').text().trim();
      const timeStr = $(el).find('.time').text().trim();
      const desc = $(el).find('.description').text().trim();
      const [start, stop] = parseTimeRange(timeStr);
      if (!start || !stop || !title) return;
      programmes.push({
        channelId,
        channelName,
        start,
        stop,
        title,
        desc: desc || undefined
      });
    });
  }

  return programmes;
}

function similarityScore(a: string, b: string): number {
  const na = normalizeChannelName(a);
  const nb = normalizeChannelName(b);
  if (!na || !nb) return 0;
  const maxLen = Math.max(na.length, nb.length);
  const dist = levenshtein(na, nb);
  return 1 - dist / maxLen;
}

function defaultHeaders() {
  return {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml'
  };
}

function parseTimeRange(s: string): [Date | null, Date | null] {
  const m = s.match(/(.+?)\s*-\s*(.+)/);
  if (!m) return [null, null];
  const now = new Date();
  const start = tryParseTime(m[1], now);
  const stop = tryParseTime(m[2], now);
  // Handle overnight wrap if stop < start: add 1 day to stop
  if (start && stop && stop.getTime() < start.getTime()) {
    stop.setDate(stop.getDate() + 1);
  }
  return [start, stop];
}

function tryParseTime(timeStr: string, baseDate: Date): Date | null {
  const d12 = new Date(baseDate);
  const m12 = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/i);
  if (m12) {
    let hour = parseInt(m12[1], 10);
    const minute = m12[2] ? parseInt(m12[2], 10) : 0;
    const ampm = m12[3].toUpperCase();
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    d12.setHours(hour, minute, 0, 0);
    return d12;
  }
  const m24 = timeStr.match(/(\d{1,2}):?(\d{2})/);
  if (m24) {
    const d24 = new Date(baseDate);
    d24.setHours(parseInt(m24[1], 10), parseInt(m24[2], 10), 0, 0);
    return d24;
  }
  return null;
        }
