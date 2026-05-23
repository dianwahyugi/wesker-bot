/* ════════════════════════════════════════════
 * Wesker-MD  ╌  febry wesker
 * ════════════════════════════════════════════
 * file    : plugins/tools/sticker.js
 * desc    : plugins › sticker
 * author  : febry  ⪩  2026
 * ════════════════════════════════════════════ */
import { downloadMedia } from '../../system/helper/download-media.js'

const URL_REGEX = /^https?:\/\/.+/i

const MIME_TYPE_MAP = {
  'image/jpeg'  : 'image',
  'image/jpg'   : 'image',
  'image/png'   : 'image',
  'image/gif'   : 'image',
  'image/webp'  : 'image',
  'video/mp4'   : 'video',
  'video/webm'  : 'video',
  'video/gif'   : 'video',
}

const EXT_TYPE_MAP = {
  jpg  : 'image',
  jpeg : 'image',
  png  : 'image',
  gif  : 'image',
  webp : 'image',
  mp4  : 'video',
  webm : 'video',
}

async function resolveUrl(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const mime     = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  const ext      = url.split('?')[0].split('.').pop().toLowerCase()
  const type     = MIME_TYPE_MAP[mime] ?? EXT_TYPE_MAP[ext] ?? null

  if (!type) throw new Error(`tipe media tidak dikenali (${mime || ext})`)

  const arrayBuf = await res.arrayBuffer()
  const buffer   = Buffer.from(arrayBuf)

  return { buffer, type }
}

async function resolveSource(m, urlArg) {
  // ── 1. URL dari argumen ──────────────────────────────────
  if (urlArg && URL_REGEX.test(urlArg)) {
    return await resolveUrl(urlArg)
  }

  // ── 2. Quoted message ────────────────────────────────────
  if (m.quoted?.raw?.message || m.quoted?.message) {
    const q = m.quoted.raw.message
    if (q.imageMessage)   return { buffer: await downloadMedia(q.imageMessage,   'image'),   type: 'image'   }
    if (q.videoMessage)   return { buffer: await downloadMedia(q.videoMessage,   'video'),   type: 'video'   }
    if (q.stickerMessage) return { buffer: await downloadMedia(q.stickerMessage, 'sticker'), type: 'sticker' }
  }

  // ── 3. Media di pesan sendiri ────────────────────────────
  const raw = m.raw?.message
  if (raw?.imageMessage) return { buffer: await downloadMedia(raw.imageMessage, 'image'), type: 'image' }
  if (raw?.videoMessage) return { buffer: await downloadMedia(raw.videoMessage, 'video'), type: 'video' }

  return null
}

export default {
  name        : 'sticker',
  command     : ['sticker', 'stiker', 'stk', 's'],
  category    : ['tools'],
  description : 'buat sticker dari gambar/video/url',

  async run({ m, args, react }) {
    const flagIdx = args.indexOf('-c')
    const crop    = flagIdx !== -1

    const urlArg  = args.find(a => URL_REGEX.test(a)) ?? null

    await react('⏳')

    let src
    try {
      src = await resolveSource(m, urlArg)
    } catch (e) {
      console.log(e)
      await react('❌')
      return m.reply(`gagal download media${e.message ? `: ${e.message}` : ''}`)
    }

    if (!src) {
      await react('❌')
      return m.reply(
        'kirim/reply gambar atau video dengan caption *sticker*,\n' +
        'atau sertakan URL langsung:\n' +
        '`sticker https://i.imgur.com/xxx.jpg`'
      )
    }

    try {
      await m.sendSticker(src.buffer, { type: src.type, crop })
      await react('✅')
    } catch (e) {
      console.log(e)
      await react('❌')
      return m.reply('gagal convert / kirim sticker')
    }
  }
}
