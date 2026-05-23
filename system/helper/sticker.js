/* ════════════════════════════════════════════
 * Wesker-MD  ╌  febry wesker
 * ════════════════════════════════════════════
 * file    : system/helper/sticker.js
 * desc    : helper › sticker — convert & exif
 * author  : febry  ⪩  2026
 * ════════════════════════════════════════════ */
import sharp from 'sharp'
import webp from 'node-webpmux'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeFile, unlink, readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

const execFileAsync = promisify(execFile)
const MAX_SIDE      = 512
const MAX_VIDEO_SEC = 8
const VIDEO_FPS     = 15

// ── image → webp buffer ───────────────────────

export async function imageToSticker(buffer, crop = false) {
  let img = sharp(buffer)
  const meta = await img.metadata()

  if (crop) {
    const size = Math.min(meta.width, meta.height)
    img = img.extract({
      left  : Math.floor((meta.width  - size) / 2),
      top   : Math.floor((meta.height - size) / 2),
      width : size,
      height: size
    })
  }

  return img
    .resize(MAX_SIDE, MAX_SIDE, {
      fit       : crop ? 'fill' : 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .webp({ quality: 80 })
    .toBuffer()
}

// ── video → animated webp buffer ─────────────

export async function videoToSticker(buffer, ext = 'mp4', crop = false) {
  const id     = randomUUID()
  const input  = join(tmpdir(), `stk_in_${id}.${ext}`)
  const output = join(tmpdir(), `stk_out_${id}.webp`)

  await writeFile(input, buffer)

  const vf = []
  if (crop) {
    vf.push(`crop=min(iw\\,ih):min(iw\\,ih):(iw-min(iw\\,ih))/2:(ih-min(iw\\,ih))/2`)
  }
  vf.push(`scale=${MAX_SIDE}:${MAX_SIDE}:force_original_aspect_ratio=${crop ? 'disable' : 'decrease'}`)
  vf.push(`fps=${VIDEO_FPS}`)
  if (!crop) {
    vf.push(`pad=${MAX_SIDE}:${MAX_SIDE}:(${MAX_SIDE}-iw)/2:(${MAX_SIDE}-ih)/2:color=#00000000`)
  }

  try {
    await execFileAsync('ffmpeg', [
      '-y',
      '-t', String(MAX_VIDEO_SEC),
      '-i', input,
      '-vf', vf.join(','),
      '-c:v', 'libwebp',
      '-lossless', '0',
      '-quality', '80',
      '-loop', '0',
      '-preset', 'default',
      '-an',
      '-vsync', '0',
      output
    ])
    return await readFile(output)
  } finally {
    await unlink(input).catch(() => {})
    await unlink(output).catch(() => {})
  }
}

// ── tulis exif ke webp buffer ─────────────────

export async function writeExif(buffer, metadata = {}) {
  const id     = randomUUID()
  const input  = join(tmpdir(), `stk_exif_in_${id}.webp`)
  const output = join(tmpdir(), `stk_exif_out_${id}.webp`)

  await writeFile(input, buffer)

  try {
    const img      = new webp.Image()
    const json     = {
      'sticker-pack-id'        : 'https://github.com/MaouDabi0',
      'sticker-pack-name'      : metadata.packname   ?? '',
      'sticker-pack-publisher' : metadata.author     ?? '',
      'emojis'                 : metadata.categories ?? ['']
    }
    const exifAttr = Buffer.from([
      0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x16, 0x00, 0x00, 0x00
    ])
    const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8')
    const exif     = Buffer.concat([exifAttr, jsonBuff])
    exif.writeUIntLE(jsonBuff.length, 14, 4)

    await img.load(input)
    img.exif = exif
    await img.save(output)

    return await readFile(output)
  } finally {
    await unlink(input).catch(() => {})
    await unlink(output).catch(() => {})
  }
}
