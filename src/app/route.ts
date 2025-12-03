import { fetchM3U, parseM3U } from '../lib/m3u';
import { searchStationsByName, scrapeSchedule } from '../lib/tvpassport';
import { buildXmltv, channelIdFromName } from '../lib/xmltv';
import { getCache, setCache } from '../lib/caching';
import { matchChannel } from '../lib/matcher';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_M3U = 'https://cwdiptvb.github.io/tv_channles.m3u';
const XML_CACHE_KEY = 'xmltv:root';
const XML_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function GET(req: Request) {
  const cached = getCache<string>(XML_CACHE_KEY);
  if (cached) {
    return new Response(cached, {
      headers: {
        'content-type': 'application/xml; charset=utf-8',
        'cache-control': 'public, max-age=300'
      }
    });
  }

  try {
    const m3uUrl = new URL(req.url).searchParams.get('m3u') || DEFAULT_M3U;
    const text = await fetchM3U(m3uUrl);
    const chans = parseM3U(text);

    // Deduplicate channels by normalized display name
    const uniqueByName = new Map<string, typeof chans[0]>();
    for (const c of chans) {
      const key = (c.tvgName || c.name).toLowerCase();
      if (!uniqueByName.has(key)) uniqueByName.set(key, c);
    }
    const channels = Array.from(uniqueByName.values());

    // Resolve station URLs via search + AI matcher
    const stationMap = new Map<string, string>(); // display -> stationUrl
    await Promise.all(
      channels.map(async (c) => {
        const display = c.tvgName || c.name;
        try {
          const candidates = await searchStationsByName(display);
          const chosenName = matchChannel(
            display,
            candidates.map((x) => x.stationName)
          );
          if (chosenName) {
            const chosen = candidates.find((x) => x.stationName === chosenName);
            if (chosen) stationMap.set(display, chosen.stationUrl);
          }
        } catch {
          // ignore per-channel failures
        }
      })
    );

    // Scrape schedules for matched stations
    const allProgrammes: Awaited<ReturnType<typeof scrapeSchedule>> = [];
    for (const c of channels) {
      const display = c.tvgName || c.name;
      const stationUrl = stationMap.get(display);
      if (!stationUrl) continue;
      try {
        const progs = await scrapeSchedule(stationUrl, 1);
        const channelId = channelIdFromName(display);
        for (const p of progs) {
          allProgrammes.push({
            channelId,
            channelName: display,
            start: p.start,
            stop: p.stop,
            title: p.title,
            desc: p.desc,
            category: p.category
          });
        }
      } catch {
        // continue
      }
    }

    // Build XMLTV channels from M3U
    const xmlChannels = channels.map((c) => ({
      id: channelIdFromName(c.tvgName || c.name),
      displayName: c.tvgName || c.name,
      icon: c.logo
    }));

    const xml = buildXmltv(xmlChannels, allProgrammes);
    setCache(XML_CACHE_KEY, xml, XML_TTL_MS);

    return new Response(xml, {
      headers: {
        'content-type': 'application/xml; charset=utf-8',
        'cache-control': 'public, max-age=300'
      }
    });
  } catch {
    const fallback =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<tv generator-info-name="xmltv-vercel">\n' +
      '</tv>\n';
    return new Response(fallback, {
      status: 200,
      headers: { 'content-type': 'application/xml; charset=utf-8' }
    });
  }
}
