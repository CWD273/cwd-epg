import he from 'he';
import { toXmlDate, hashId } from './util';

export type XmltvChannel = {
  id: string;
  displayName: string;
  icon?: string;
};

export type XmltvProgramme = {
  channelId: string;
  start: Date;
  stop: Date;
  title: string;
  desc?: string;
  category?: string;
};

export function buildXmltv(
  channels: XmltvChannel[],
  programmes: XmltvProgramme[]
): string {
  const header =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<tv generator-info-name="xmltv-vercel" source-info-name="M3U+TVPassport">\n';

  const chXml = channels
    .map((c) => {
      const icon = c.icon
        ? `  <icon src="${escapeAttr(c.icon)}" />\n`
        : '';
      return (
        `  <channel id="${escapeAttr(c.id)}">\n` +
        `    <display-name>${escapeText(c.displayName)}</display-name>\n` +
        icon +
        `  </channel>\n`
      );
    })
    .join('');

  const progXml = programmes
    .map((p) => {
      return (
        `  <programme start="${escapeAttr(toXmlDate(p.start))}" stop="${escapeAttr(toXmlDate(p.stop))}" channel="${escapeAttr(p.channelId)}">\n` +
        `    <title>${escapeText(p.title)}</title>\n` +
        (p.desc ? `    <desc>${escapeText(p.desc)}</desc>\n` : '') +
        (p.category ? `    <category>${escapeText(p.category)}</category>\n` : '') +
        `  </programme>\n`
      );
    })
    .join('');

  return header + chXml + progXml + '</tv>\n';
}

function escapeText(s: string): string {
  return he.encode(s, { useNamedReferences: true });
}
function escapeAttr(s: string): string {
  return he.encode(s, { useNamedReferences: true });
}

export function channelIdFromName(name: string): string {
  return hashId(name);
}
