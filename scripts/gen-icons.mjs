// Genera los iconos PWA placeholder sin dependencias externas.
// Fondo carbón #0B0B0D + glifo de rayo en lima #D8FF3E.
// Salida: public/icons/icon-192.png, icon-512.png, icon-512-maskable.png
//         public/apple-touch-icon.png (180x180)
//
// Para reemplazar por el logo real: sustituye estos PNG por los del
// entrenador (mismos nombres y tamaños) o ajusta el polígono BOLT abajo.

import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const BG = [0x0b, 0x0b, 0x0d]
const ACCENT = [0xd8, 0xff, 0x3e]

// Rayo en coordenadas normalizadas (0..1), y hacia abajo.
const BOLT = [
  [0.62, 0.08],
  [0.30, 0.54],
  [0.48, 0.54],
  [0.38, 0.92],
  [0.74, 0.42],
  [0.52, 0.42]
]

function pointInPoly(x, y, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

// CRC32 para chunks PNG
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

function encodePNG(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  // raw scanlines con byte de filtro 0
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    const off = y * (size * 4 + 1)
    raw[off] = 0
    rgba.copy(raw, off + 1, y * size * 4, (y + 1) * size * 4)
  }
  const idat = deflateSync(raw)
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function render(size, { padding = 0.14 } = {}) {
  const rgba = Buffer.alloc(size * size * 4)
  // escala/centra el rayo dentro del área segura (padding extra para maskable)
  const inset = padding
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x / size - inset) / (1 - 2 * inset)
      const ny = (y / size - inset) / (1 - 2 * inset)
      const isBolt = nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1 && pointInPoly(nx, ny, BOLT)
      const [r, g, b] = isBolt ? ACCENT : BG
      const i = (y * size + x) * 4
      rgba[i] = r
      rgba[i + 1] = g
      rgba[i + 2] = b
      rgba[i + 3] = 255
    }
  }
  return encodePNG(size, rgba)
}

function out(rel, buf) {
  const p = resolve(root, rel)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, buf)
  console.log('✓', rel, `(${buf.length} bytes)`)
}

out('public/icons/icon-192.png', render(192, { padding: 0.16 }))
out('public/icons/icon-512.png', render(512, { padding: 0.16 }))
// maskable: más padding para que el glifo quede dentro de la safe-zone
out('public/icons/icon-512-maskable.png', render(512, { padding: 0.26 }))
out('public/apple-touch-icon.png', render(180, { padding: 0.16 }))
console.log('Iconos generados.')
