import { distance as levenshtein } from 'fast-levenshtein';
import { normalizeChannelName } from './util';

// Synonyms map: normalized key -> array of canonical/expanded names.
// Keep keys short-form that might appear in M3U; values should bias to US naming.
const SYNONYMS: Record<string, string[]> = {
  // General abbreviations
  'ae': ['a&e', 'a&e usa'],
  'a&e': ['a&e', 'a&e usa'],
  'amc': ['amc', 'amc usa'],
  'bbc america': ['bbc america'],
  'bet': ['bet'],
  'bloomberg': ['bloomberg tv', 'bloomberg television'],
  'bravo': ['bravo usa'],
  'cartoon network': ['cartoon network', 'cartoon network usa', 'cn'],
  'cn': ['cartoon network', 'cartoon network usa'],
  'cmt': ['cmt', 'cmt usa', 'country music television'],
  'cnn': ['cnn', 'cnn usa', 'cable news network'],
  'cnn international': ['cnn international'],
  'comedy central': ['comedy central', 'comedy central usa'],
  'discovery': ['discovery channel', 'discovery channel usa'],
  'discovery channel': ['discovery channel', 'discovery channel usa'],
  'disney': ['disney channel', 'disney channel usa'],
  'disney channel': ['disney channel', 'disney channel usa'],
  'disney xd': ['disney xd'],
  'e': ['e!', 'e! entertainment', 'e! usa'],
  'e!': ['e!', 'e! entertainment', 'e! usa'],
  'espn': ['espn', 'espn usa'],
  'espn2': ['espn2', 'espn 2'],
  'espnews': ['espnews'],
  'espnu': ['espnu'],
  'food network': ['food network', 'food network usa'],
  'fox': ['fox network', 'fox broadcasting company', 'fox network east', 'fox'],
  'fs1': ['fox sports 1', 'fs1'],
  'fs2': ['fox sports 2', 'fs2'],
  'fx': ['fx', 'fx network'],
  'fxx': ['fxx'],
  'fxm': ['fxm'],
  'hallmark': ['hallmark channel', 'hallmark channel usa'],
  'hallmark movies & mysteries': ['hallmark movies & mysteries', 'hmm'],
  'hbo': ['hbo', 'hbo usa'],
  'hbo2': ['hbo 2', 'hbo2'],
  'hgtv': ['hgtv', 'home & garden television'],
  'history': ['history channel', 'history', 'history usa'],
  'lifetime': ['lifetime', 'lifetime usa'],
  'max': ['max', 'cinemax', 'hbo max linear'], // depending on tvpassport naming
  'msnbc': ['msnbc'],
  'mtv': ['mtv', 'mtv usa'],
  'nat geo': ['national geographic', 'nat geo', 'nat geo usa'],
  'national geographic': ['national geographic', 'nat geo', 'national geographic usa'],
  'nbc': ['nbc network', 'nbc'],
  'nbc sports': ['nbc sports network', 'nbcsn'],
  'nick': ['nickelodeon', 'nickelodeon usa'],
  'nickelodeon': ['nickelodeon', 'nickelodeon usa'],
  'nicktoons': ['nicktoons'],
  'nick jr': ['nick jr', 'nick jr.'],
  'own': ['own', 'oprah winfrey network'],
  'oxygen': ['oxygen', 'oxygen usa'],
  'paramount network': ['paramount network'],
  'science': ['science channel', 'science'],
  'showtime': ['showtime', 'showtime usa'],
  'showtime 2': ['showtime 2', 'sho2'],
  'smithsonian': ['smithsonian channel'],
  'syfy': ['syfy'],
  'tbs': ['tbs', 'turner broadcasting system'],
  'telemundo': ['telemundo'],
  'tlc': ['tlc', 'the learning channel'],
  'tnt': ['tnt', 'turner network television', 'tnt usa'],
  'travel': ['travel channel', 'travel channel usa'],
  'trutv': ['trutv'],
  'turner classic movies': ['tcm', 'turner classic movies'],
  'tcm': ['tcm', 'turner classic movies'],
  'tv land': ['tv land'],
  'univision': ['univision'],
  'usa': ['usa network', 'usa'],
  'vh1': ['vh1'],
  'vice': ['vice tv', 'viceland'],

  // Broadcast networks (US)
  'abc': ['abc network', 'american broadcasting company', 'abc'],
  'cbs': ['cbs network', 'columbia broadcasting system', 'cbs'],
  'fox network': ['fox network', 'fox broadcasting company', 'fox'],
  'nbc network': ['nbc network', 'nbc'],

  // News
  'fox news': ['fox news channel'],
  'cnbc': ['cnbc'],
  'fox business': ['fox business network', 'fbn'],
  'newsnation': ['newsnation'],
  'bbc world news': ['bbc world news'],

  // Sports
  'espn classic': ['espn classic'],
  'espn deportes': ['espn deportes'],
  'nbatv': ['nba tv', 'nba television'],
  'nfl network': ['nfl network'],
  'nhl network': ['nhl network'],
  'mlb network': ['mlb network'],
  'golf': ['golf channel', 'golf'],
  'tennis': ['tennis channel', 'tennis'],

  // Premium + film
  'starz': ['starz'],
  'starz encore': ['starz encore'],
  'encore': ['starz encore'],
  'epix': ['mgm+','epix'], // tvpassport renamed to MGM+
  'mgm+': ['mgm+','epix'],

  // Kids variants
  'disney junior': ['disney junior'],
  'nicktoons': ['nicktoons'],
  'boomerang': ['boomerang'],

  // Canadian exclusives (allowed when M3U truly intends CA)
  'crave': ['crave'],
  'ctv': ['ctv'],
  'ctv2': ['ctv 2', 'ctv two'],
  'global': ['global'],
  'citytv': ['citytv'],
  'cbc': ['cbc'],
  'tsn': ['tsn', 'tsn1', 'tsn2', 'tsn3', 'tsn4', 'tsn5'],
  'sportsnet': ['sportsnet', 'sportsnet one', 'sportsnet 360'],
  'ytn': ['ytn'], // example misc
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
