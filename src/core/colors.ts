// Theme color index order used by Excel (note lt/dk swap vs XML order):
// 0 lt1(bg1) 1 dk1(tx1) 2 lt2 3 dk2 4..9 accent1..6 10 hlink 11 folHlink
export const DEFAULT_THEME = [
  'FFFFFF',
  '000000',
  'E7E6E6',
  '44546A',
  '4472C4',
  'ED7D31',
  'A5A5A5',
  'FFC000',
  '5B9BD5',
  '70AD47',
  '0563C1',
  '954F72',
];

export function parseThemeXml(xml?: string): string[] {
  if (!xml) return DEFAULT_THEME;
  const get = (tag: string) => {
    const m = xml.match(
      new RegExp(
        `<a:${tag}>[\\s\\S]*?(?:srgbClr val="([0-9A-Fa-f]{6})"|lastClr="([0-9A-Fa-f]{6})")`
      )
    );
    return m ? (m[1] ?? m[2]).toUpperCase() : undefined;
  };
  const order = [
    'lt1',
    'dk1',
    'lt2',
    'dk2',
    'accent1',
    'accent2',
    'accent3',
    'accent4',
    'accent5',
    'accent6',
    'hlink',
    'folHlink',
  ];
  return order.map((t, i) => get(t) ?? DEFAULT_THEME[i]);
}

export const INDEXED = [
  '000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF',
  '000000', 'FFFFFF', 'FF0000', '00FF00', '0000FF', 'FFFF00', 'FF00FF', '00FFFF',
  '800000', '008000', '000080', '808000', '800080', '008080', 'C0C0C0', '808080',
  '9999FF', '993366', 'FFFFCC', 'CCFFFF', '660066', 'FF8080', '0066CC', 'CCCCFF',
  '000080', 'FF00FF', 'FFFF00', '00FFFF', '800080', '800000', '008080', '0000FF',
  '00CCFF', 'CCFFFF', 'CCFFCC', 'FFFF99', '99CCFF', 'FF99CC', 'CC99FF', 'FFCC99',
  '3366FF', '33CCCC', '99CC00', 'FFCC00', 'FF9900', 'FF6600', '666699', '969696',
  '003366', '339966', '003300', '333300', '993300', '993366', '333399', '333333',
];

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === rn) {
      h = (gn - bn) / delta + (gn < bn ? 6 : 0);
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number) => {
    let tn = t;
    if (tn < 0) tn += 1;
    if (tn > 1) tn -= 1;
    if (tn < 1 / 6) return p + (q - p) * 6 * tn;
    if (tn < 1 / 2) return q;
    if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
    return p;
  };
  const r = Math.round(hue2rgb(h + 1 / 3) * 255);
  const g = Math.round(hue2rgb(h) * 255);
  const b = Math.round(hue2rgb(h - 1 / 3) * 255);
  return [r, g, b];
}

// 64 = system foreground → undefined (use default text color); 65 = system background → undefined (no fill)
export function applyTint(hex: string, tint = 0): string {
  const clean = hex.replace(/^#/, '');
  if (!tint) return `#${clean.toUpperCase()}`;
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;

  const [h, s, l] = rgbToHsl(r, g, b);
  let newL = l;
  if (tint < 0) {
    newL = l * (1 + tint);
  } else {
    newL = l * (1 - tint) + tint;
  }
  newL = Math.max(0, Math.min(1, newL));

  const [newR, newG, newB] = hslToRgb(h, s, newL);
  const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

export function resolveColor(
  c: { argb?: string; theme?: number; tint?: number; indexed?: number } | undefined,
  theme: string[] = DEFAULT_THEME
): string | undefined {
  if (!c) return undefined;
  if (c.argb) {
    const raw = c.argb.length === 8 ? c.argb.slice(2) : c.argb;
    return c.tint ? applyTint(raw, c.tint) : `#${raw.toUpperCase()}`;
  }
  if (c.theme !== undefined) {
    const base = theme[c.theme] ?? DEFAULT_THEME[c.theme];
    if (base) {
      return applyTint(base, c.tint ?? 0);
    }
  }
  if (c.indexed !== undefined) {
    if (c.indexed >= 0 && c.indexed < 64 && INDEXED[c.indexed]) {
      const hex = INDEXED[c.indexed];
      return c.tint ? applyTint(hex, c.tint) : `#${hex}`;
    }
    return undefined;
  }
  return undefined;
}
