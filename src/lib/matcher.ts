import { distance as levenshtein } from 'fast-levenshtein';
import { normalizeChannelName } from './util';

// Synonyms map: normalized key -> array of canonical/expanded names.
// Keep keys short-form that might appear in M3U; values should bias to US naming.
const SYNONYMS: Record<string, string[]> = {
  // Broadcast networks (US)
  'abc': ['abc network', 'american broadcasting company'],
  'cbs': ['cbs network', 'columbia broadcasting system'],
  'fox': ['fox network', 'fox broadcasting company'],
  'nbc': ['nbc network', 'national broadcasting company'],

  // News
  'bbc america': ['bbc america'],
  'bbc world news': ['bbc world news'],
  'bloomberg': ['bloomberg tv', 'bloomberg television'],
  'cnbc': ['cnbc'],
  'cnn': ['cnn', 'cnn usa', 'cable news network'],
  'cnn international': ['cnn international'],
  'fox business': ['fox business network', 'fbn'],
  'fox news': ['fox news channel'],
  'msnbc': ['msnbc'],
  'newsnation': ['newsnation'],

  // Entertainment & general cable
  'ae': ['a&e', 'a&e usa'],
  'a&e': ['a&e', 'a&e usa'],
  'amc': ['amc'],
  'bet': ['bet'],
  'bravo': ['bravo usa'],
  'comedy central': ['comedy central'],
  'e': ['e!', 'e! entertainment'],
  'e!': ['e!', 'e! entertainment'],
  'fx': ['fx'],
  'fxm': ['fxm'],
  'fxx': ['fxx'],
  'hallmark': ['hallmark channel'],
  'hallmark movies & mysteries': ['hallmark movies & mysteries'],
  'lifetime': ['lifetime'],
  'mtv': ['mtv'],
  'oxygen': ['oxygen'],
  'paramount network': ['paramount network'],
  'syfy': ['syfy'],
  'tbs': ['tbs', 'turner broadcasting system'],
  'tlc': ['tlc', 'the learning channel'],
  'tnt': ['tnt', 'turner network television'],
  'travel': ['travel channel'],
  'trutv': ['trutv'],
  'tv land': ['tv land'],
  'usa': ['usa network'],
  'vh1': ['vh1'],
  'vice': ['vice tv', 'viceland'],

  // Kids & family
  'boomerang': ['boomerang'],
  'cartoon network': ['cartoon network', 'cartoon network usa'],
  'cn': ['cartoon network', 'cartoon network usa'],
  'disney': ['disney channel'],
  'disney channel': ['disney channel'],
  'disney junior': ['disney junior'],
  'disney xd': ['disney xd'],
  'nick': ['nickelodeon'],
  'nick jr': ['nick jr', 'nick jr.'],
  'nickelodeon': ['nickelodeon'],
  'nicktoons': ['nicktoons'],

  // Sports
  'espn': ['espn'],
  'espn2': ['espn2'],
  'espn classic': ['espn classic'],
  'espn deportes': ['espn deportes'],
  'espnews': ['espnews'],
  'espnu': ['espnu'],
  'fs1': ['fox sports 1'],
  'fs2': ['fox sports 2'],
  'golf': ['golf channel'],
  'mlb network': ['mlb network'],
  'nba tv': ['nba tv'],
  'nbatv': ['nba tv'],
  'nbc sports': ['nbc sports network', 'nbcsn'],
  'nfl network': ['nfl network'],
  'nhl network': ['nhl network'],
  'tennis': ['tennis channel'],

  // Premium & film
  'encore': ['starz encore'],
  'epix': ['mgm+', 'epix'],
  'hbo': ['hbo'],
  'hbo2': ['hbo 2'],
  'max': ['cinemax', 'hbo max linear'],
  'mgm+': ['mgm+', 'epix'],
  'showtime': ['showtime'],
  'showtime 2': ['showtime 2'],
  'starz': ['starz'],
  'starz encore': ['starz encore'],
  'turner classic movies': ['tcm', 'turner classic movies'],
  'tcm': ['tcm', 'turner classic movies'],

  // Lifestyle & factual
  'discovery': ['discovery channel'],
  'discovery channel': ['discovery channel'],
  'food network': ['food network'],
  'hgtv': ['hgtv', 'home & garden television'],
  'history': ['history channel'],
  'nat geo': ['national geographic'],
  'national geographic': ['national geographic'],
  'own': ['own', 'oprah winfrey network'],
  'science': ['science channel'],
  'smithsonian': ['smithsonian channel'],

  // Spanish-language
  'telemundo': ['telemundo'],
  'univision': ['univision'],

  // Canadian exclusives
  'cbc': ['cbc'],
  'citytv': ['citytv'],
  'crave': ['crave'],
  'ctv': ['ctv'],
  'ctv2': ['ctv 2', 'ctv two'],
  'global': ['global'],
  'sportsnet': ['sportsnet', 'sportsnet one', 'sportsnet 360'],
  'tsn': ['tsn', 'tsn1', 'tsn2', 'tsn3', 'tsn4', 'tsn5'],
  'ytn': ['ytn']
};

const CANADA_EXCLUSIVE_MARKERS = /(crave|ctv|global|citytv|tsn|sportsnet|cbc|ytn)/i;

export function similarity(a: string, b: string): number {
  const na = normalizeChannelName(a);
  const nb = normalizeChannelName(b);
  if (!na || !nb) return 0;
  const maxLen = Math.max(na.length, nb.length);
  const dist = levenshtein(na, nb);
  return 1 - dist / maxLen;
}

export function expandSynonyms(name: string): string[] {
  const key = normalizeChannelName(name);
  return SYNONYMS[key] || [];
}

// Prefer US stations when both exist; allow Canadian exclusives.
export function preferUSStations(candidateNames: string[]): string[] {
  return candidateNames.filter((c) => {
    const name = c.toLowerCase();
    // If clearly marked Canada and not exclusive, drop it
    if (name.includes('canada') || /\bca\b/.test(name) || /\(canada\)/.test(name)) {
      // Keep only if the brand is Canadian-exclusive
      return CANADA_EXCLUSIVE_MARKERS.test(name);
    }
    return true;
  });
}

export function matchChannel(m3uName: string, candidates: string[]): string | null {
  const filtered = preferUSStations(candidates);
  const synonyms = expandSynonyms(m3uName);
  const allCandidates = [...filtered, ...synonyms];

  let best: { name: string; score: number } | null = null;
  for (const cand of allCandidates) {
    const score = similarity(m3uName, cand);
    if (!best || score > best.score) best = { name: cand, score };
  }

  // Slightly conservative threshold to avoid accidental CA picks
  return best && best.score > 0.45 ? best.name : null;
                                  }
