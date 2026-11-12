import { CellValue } from './types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isDateFormat(fmt: string): boolean {
  const stripped = fmt
    .replace(/"[^"]*"/g, '')
    .replace(/\[[^\]]*\]/g, '');
  return /[ydhs]|am\/pm/i.test(stripped) || /(?:^|[^a-z0-9])m+(?:$|[^a-z0-9])/i.test(stripped);
}

function formatDate(d: Date, fmt?: string): string {
  if (!fmt || fmt.toLowerCase() === 'general') {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hh = d.getUTCHours();
    const mm = d.getUTCMinutes();
    const ss = d.getUTCSeconds();
    if (hh !== 0 || mm !== 0 || ss !== 0) {
      return `${y}-${m}-${day} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }
    return `${y}-${m}-${day}`;
  }

  // Tokenize the format string preserving quotes
  let cleanFmt = fmt.replace(/\[\$[^\]]*\]/g, '').replace(/\[[A-Za-z]+\]/g, '');
  const is12Hour = /am\/pm/i.test(cleanFmt);

  // Split into tokens: quoted strings or date tokens or literals
  const tokenRegex = /"[^"]*"|yyyy|yy|mmmm|mmm|mm|m|dddd|ddd|dd|d|hh|h|ss|s|am\/pm|a\/p|./gi;
  const rawTokens = cleanFmt.match(tokenRegex) || [];

  // Determine for each 'm' / 'mm' whether it is minute or month
  // A token is minute if the nearest preceding date token is h/hh or nearest following is s/ss
  const tokens: { text: string; isMinute?: boolean }[] = rawTokens.map(t => ({ text: t }));
  for (let i = 0; i < tokens.length; i++) {
    const lower = tokens[i].text.toLowerCase();
    if (lower === 'm' || lower === 'mm') {
      let isMinute = false;
      for (let j = i - 1; j >= 0; j--) {
        const prev = tokens[j].text.toLowerCase();
        if (prev.startsWith('h')) {
          isMinute = true;
          break;
        }
        if (prev.startsWith('d') || prev.startsWith('y') || prev.startsWith('m')) {
          break;
        }
      }
      if (!isMinute) {
        for (let j = i + 1; j < tokens.length; j++) {
          const next = tokens[j].text.toLowerCase();
          if (next.startsWith('s')) {
            isMinute = true;
            break;
          }
          if (next.startsWith('d') || next.startsWith('y') || next.startsWith('h')) {
            break;
          }
        }
      }
      tokens[i].isMinute = isMinute;
    }
  }

  let out = '';
  for (const token of tokens) {
    const t = token.text;
    if (t.startsWith('"') && t.endsWith('"')) {
      out += t.slice(1, -1);
      continue;
    }
    const lower = t.toLowerCase();
    switch (lower) {
      case 'yyyy':
        out += String(d.getUTCFullYear());
        break;
      case 'yy':
        out += String(d.getUTCFullYear()).slice(-2);
        break;
      case 'mmmm':
        out += MONTH_NAMES[d.getUTCMonth()];
        break;
      case 'mmm':
        out += MONTH_ABBR[d.getUTCMonth()];
        break;
      case 'mm':
        if (token.isMinute) {
          out += String(d.getUTCMinutes()).padStart(2, '0');
        } else {
          out += String(d.getUTCMonth() + 1).padStart(2, '0');
        }
        break;
      case 'm':
        if (token.isMinute) {
          out += String(d.getUTCMinutes());
        } else {
          out += String(d.getUTCMonth() + 1);
        }
        break;
      case 'dddd':
        out += DAY_NAMES[d.getUTCDay()];
        break;
      case 'ddd':
        out += DAY_ABBR[d.getUTCDay()];
        break;
      case 'dd':
        out += String(d.getUTCDate()).padStart(2, '0');
        break;
      case 'd':
        out += String(d.getUTCDate());
        break;
      case 'hh': {
        const h = is12Hour ? (d.getUTCHours() % 12 || 12) : d.getUTCHours();
        out += String(h).padStart(2, '0');
        break;
      }
      case 'h': {
        const h = is12Hour ? (d.getUTCHours() % 12 || 12) : d.getUTCHours();
        out += String(h);
        break;
      }
      case 'ss':
        out += String(d.getUTCSeconds()).padStart(2, '0');
        break;
      case 's':
        out += String(d.getUTCSeconds());
        break;
      case 'am/pm':
        out += d.getUTCHours() >= 12 ? (t === 'AM/PM' ? 'PM' : 'pm') : (t === 'AM/PM' ? 'AM' : 'am');
        break;
      case 'a/p':
        out += d.getUTCHours() >= 12 ? (t === 'A/P' ? 'P' : 'p') : (t === 'A/P' ? 'A' : 'a');
        break;
      default:
        out += t;
    }
  }

  return out;
}

export function formatValue(v: CellValue, numFmt?: string): string {
  try {
    if (v === null || v === undefined) return '';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'string') return v;

    if (v instanceof Date) {
      return formatDate(v, numFmt);
    }

    if (typeof v === 'number') {
      if (isNaN(v)) return 'NaN';

      // Check if numFmt indicates a date
      if (numFmt && isDateFormat(numFmt)) {
        const date = new Date(Math.round((v - 25569) * 86400000));
        return formatDate(date, numFmt);
      }

      if (!numFmt || numFmt.toLowerCase() === 'general') {
        if (Number.isInteger(v)) return String(v);
        return Number(v.toPrecision(10)).toString();
      }

      // Format custom number pattern
      let fmt = numFmt;

      // Turn [$฿-41E] into its symbol ฿
      fmt = fmt.replace(/\[\$([^\]\-]+)(?:-[^\]]*)?\]/g, '$1');
      // Strip [Red], [Color], etc.
      fmt = fmt.replace(/\[[A-Za-z0-9_]+\]/g, '');
      // Strip _x (padding) and *x (repeat)
      fmt = fmt.replace(/_./g, '').replace(/\*./g, '');

      // Split sections by ; outside quotes
      const sections: string[] = [];
      let cur = '';
      let inQuote = false;
      for (let i = 0; i < fmt.length; i++) {
        const ch = fmt[i];
        if (ch === '"') {
          inQuote = !inQuote;
          cur += ch;
        } else if (ch === ';' && !inQuote) {
          sections.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
      sections.push(cur);

      let section = sections[0];
      let num = v;
      let isNegWithSeparateSection = false;

      if (sections.length >= 2) {
        if (v < 0) {
          section = sections[1];
          num = Math.abs(v);
          isNegWithSeparateSection = true;
        } else if (v === 0 && sections.length >= 3) {
          section = sections[2];
        } else {
          section = sections[0];
        }
      }

      // Check for %
      let hasPercent = false;
      // check if % is outside quotes
      let inQ = false;
      for (const ch of section) {
        if (ch === '"') inQ = !inQ;
        else if (ch === '%' && !inQ) {
          hasPercent = true;
          break;
        }
      }

      if (hasPercent) {
        num = num * 100;
      }

      // Decimals = number of 0 after .
      // We look for . followed by [0#]+ outside quotes
      const decMatch = section.match(/\.([0#]+)/);
      const decimals = decMatch ? (decMatch[1].match(/0/g) || []).length : 0;

      // Grouping separator
      const useGrouping = /[#0],[#0]/.test(section);

      const formattedNumber = Math.abs(num).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping,
      });

      const finalNumber = (!isNegWithSeparateSection && num < 0) ? `-${formattedNumber}` : formattedNumber;

      // Replace numeric placeholders in section
      const numMatch = section.match(/[#0\?,\.]+/);
      if (!numMatch || numMatch.index === undefined) {
        return finalNumber;
      }

      const prefix = section.slice(0, numMatch.index).replace(/"/g, '');
      const suffix = section.slice(numMatch.index + numMatch[0].length).replace(/"/g, '');

      return `${prefix}${finalNumber}${suffix}`;
    }

    return String(v);
  } catch {
    return String(v);
  }
}
