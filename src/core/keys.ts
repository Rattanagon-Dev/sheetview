import { Merge } from './types';

export function key(r: number, c: number): number {
  return r * 16384 + c;
}

export function rc(k: number): { r: number; c: number } {
  return {
    r: Math.floor(k / 16384),
    c: k % 16384,
  };
}

export function colName(c: number): string {
  let s = '';
  let n = c + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function colIndex(name: string): number {
  let c = 0;
  const upper = name.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    c = c * 26 + (upper.charCodeAt(i) - 64);
  }
  return c - 1;
}

export function addr(r: number, c: number): string {
  return `${colName(c)}${r + 1}`;
}

export function parseAddr(a: string): { r: number; c: number } {
  const m = a.match(/^([A-Za-z]+)(\d+)$/);
  if (!m) return { r: 0, c: 0 };
  return {
    r: parseInt(m[2], 10) - 1,
    c: colIndex(m[1]),
  };
}

export function parseRange(rng: string): Merge {
  const parts = rng.split(':');
  const p1 = parseAddr(parts[0]);
  const p2 = parts[1] ? parseAddr(parts[1]) : p1;
  return {
    r1: Math.min(p1.r, p2.r),
    c1: Math.min(p1.c, p2.c),
    r2: Math.max(p1.r, p2.r),
    c2: Math.max(p1.c, p2.c),
  };
}
