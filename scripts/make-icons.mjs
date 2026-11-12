import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
const T = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (b) => { let c = 0xFFFFFFFF; for (const x of b) c = T[(c ^ x) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
function png(size, px) {
  const stride = size * 4 + 1, raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) raw.set(px(x, y, size), y * stride + 1 + x * 4);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const TEAL = [14, 124, 102, 255], WHITE = [255, 255, 255, 255], LIGHT = [204, 236, 228, 255];
// full-bleed teal background (iOS rounds corners itself); white "sheet" with a 4x4 grid and tinted header row
function icon(x, y, s) {
  const a = s * 0.22, b = s * 0.78, line = Math.max(1, Math.round(s / 64));
  if (x < a || x > b || y < a || y > b) return TEAL;
  const cell = (b - a) / 4, gx = (x - a) % cell, gy = (y - a) % cell;
  if (gx < line || gy < line) return TEAL;
  return y < a + cell ? LIGHT : WHITE;
}
mkdirSync('public/icons', { recursive: true });
for (const [name, size] of [['icon-180', 180], ['icon-192', 192], ['icon-512', 512], ['icon-512-maskable', 512]])
  writeFileSync(`public/icons/${name}.png`, png(size, icon));
console.log('icons written');
