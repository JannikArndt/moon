// Draws every icon the app needs from one picture, with no dependencies, so
// the sizes cannot drift apart. Run: node scripts/make-icons.mjs  (npm run icons)
//
// The picture is `ink(x, y)`: a colour (or null for the background) at a
// point in a 0..1 square. Write it as shapes (circles, rounded rects, lines)
// in that square; everything else here is plumbing.
//
// Why PNG: iOS takes `apple-touch-icon` for "Add to Home Screen", Apple
// documents it as PNG, and it wins over the manifest's icons, so an SVG there
// leaves iOS with a screenshot. The manifest gets the same PNGs.
//
// Why full-bleed and opaque: iOS rounds the corners itself; corners drawn
// here would show inside its mask, and transparent pixels are not a
// background anybody chose.
//
// Why a separate maskable icon: Android crops a maskable icon to a circle or
// squircle, keeping the middle 80 %; the picture is shrunk into that zone.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = 'public/icons'; // where index.html and the manifest point
// Tokens from :root in styles.css, not new colours.
const INK = [0x08, 0x0d, 0x1a]; // --ink, the page ground
const PANEL = [0x0d, 0x14, 0x24]; // --panel, the unlit part of the Moon
const LINE = [0x23, 0x2f, 0x49]; // --line, the horizon band
const LUNE = [0xbc, 0xd2, 0xf2]; // --lune, the lit limb
const BONE = [0xe9, 0xe7, 0xdf]; // --bone, the lit crescent
const BG = INK;

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const inCircle = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 < r * r;

// A thick crescent, lit from the right, over a faint full disc (earthshine)
// so it reads as the Moon and not as a "C"; a horizon band under it. The band
// is defined for every y > 0.86 and any x, so the maskable copy keeps it full
// bleed when the picture is shrunk into the safe zone.
function ink(x, y) {
  if (y > 0.86) return LINE;
  const disc = inCircle(x, y, 0.5, 0.45, 0.35);
  const lit = disc && !inCircle(x, y, 0.36, 0.37, 0.31);
  if (lit) return mix(BONE, LUNE, Math.min(1, Math.max(0, (y - 0.2) * 1.2)));
  if (disc) return mix(PANEL, LINE, 0.4);
  return null;
}

const SS = 4; // supersampling: draw 4×4 points per pixel, average them

function render(size, inset) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // PNG filter byte: none
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          // Shrink the picture into the safe zone; the background stays full.
          const c = ink((u - inset) / (1 - 2 * inset), (v - inset) / (1 - 2 * inset)) ?? BG;
          for (let k = 0; k < 3; k++) acc[k] += c[k];
        }
      }
      const o = y * (size * 3 + 1) + 1 + x * 3;
      for (let k = 0; k < 3; k++) raw[o + k] = Math.round(acc[k] / (SS * SS));
    }
  }
  return raw;
}

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, inset) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB, opaque on purpose
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(render(size, inset), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT, { recursive: true });
for (const [name, size, inset] of [
  ['apple-touch-icon.png', 180, 0],
  ['icon-192.png', 192, 0],
  ['icon-512.png', 512, 0],
  ['icon-maskable-512.png', 512, 0.1],
  ['favicon-32.png', 32, 0],
]) {
  writeFileSync(`${OUT}/${name}`, png(size, inset));
  console.log(`${OUT}/${name} ${size}x${size}`);
}
