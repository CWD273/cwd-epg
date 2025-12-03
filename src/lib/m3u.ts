export type M3UChannel = {
  name: string;
  tvgId?: string;
  tvgName?: string;
  groupTitle?: string;
  logo?: string;
  url?: string;
};

export async function fetchM3U(url: string, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`M3U fetch failed: ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

export function parseM3U(text: string): M3UChannel[] {
  const lines = text.split(/\r?\n/);
  const channels: M3UChannel[] = [];
  let currentMeta: Partial<M3UChannel> | null = null;

  for (const line of lines) {
    if (line.startsWith('#EXTINF')) {
      currentMeta = {};
      // Example: #EXTINF:-1 tvg-id="xxx" tvg-name="CNN" group-title="News" tvg-logo="...","CNN HD"
      const attrsPart = line.substring(line.indexOf(':') + 1);
      const [attrs, name] = splitAttrsAndName(attrsPart);
      currentMeta.name = (name || '').trim();

      const rx = /(\w[\w-]*)="([^"]*)"/g;
      let m: RegExpExecArray | null;
      while ((m = rx.exec(attrs)) !== null) {
        const key = m[1];
        const val = m[2];
        if (key === 'tvg-id') currentMeta.tvgId = val;
        if (key === 'tvg-name') currentMeta.tvgName = val;
        if (key === 'group-title') currentMeta.groupTitle = val;
        if (key === 'tvg-logo' || key === 'logo') currentMeta.logo = val;
      }
    } else if (line.startsWith('http://') || line.startsWith('https://')) {
      if (currentMeta) {
        channels.push({ ...currentMeta, url: line.trim() } as M3UChannel);
        currentMeta = null;
      }
    }
  }
  return channels;
}

function splitAttrsAndName(s: string): [string, string] {
  const idx = s.lastIndexOf(',');
  if (idx === -1) return [s.trim(), ''];
  return [s.slice(0, idx).trim(), s.slice(idx + 1).trim()];
}
