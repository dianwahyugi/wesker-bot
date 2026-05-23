/* ════════════════════════════════════════════
 * Wesker-MD  ╌  febry wesker
 * ════════════════════════════════════════════
 * file    : system/helper/telegram-backup.js
 * desc    : helper › telegram backup
 * author  : febry  ⪩  2026
 * ════════════════════════════════════════════ */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { downloadMedia } from './download-media.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH   = path.join(__dirname, '../cache/telegram-backup.json')

// ── struktur db ───────────────────────────────
// {
//   statusBackup: { on: false, tgId: '123456' },
//   chats: [
//     { jid: '628xxx@s.whatsapp.net', tgId: '123456',  label: 'Nama' },
//     { jid: '120363xxx@g.us',        tgId: '-100xxx', label: 'Grup A' }
//   ]
// }

// ── db helpers ───────────────────────────────

function loadDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const dir = path.dirname(DB_PATH)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      const def = { statusBackup: { on: false, tgId: null }, chats: [] }
      fs.writeFileSync(DB_PATH, JSON.stringify(def, null, 2))
      return def
    }
    const raw = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
    if (!raw.statusBackup) raw.statusBackup = { on: false, tgId: null }
    if (!raw.chats)        raw.chats        = []
    return raw
  } catch {
    return { statusBackup: { on: false, tgId: null }, chats: [] }
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

// ── status backup ─────────────────────────────

export function getStatusBackup() {
  return loadDB().statusBackup
}

export function setStatusBackupOn(bool) {
  const db = loadDB()
  db.statusBackup.on = bool
  saveDB(db)
}

export function setStatusTarget(tgId) {
  const db = loadDB()
  db.statusBackup.tgId = String(tgId)
  saveDB(db)
}

// ── chat backup (group / private) ────────────

export function addChatBackup(jid, tgId, label = '') {
  const db  = loadDB()
  const str = String(tgId)
  if (db.chats.find(c => c.jid === jid && c.tgId === str)) return false
  db.chats.push({ jid, tgId: str, label })
  saveDB(db)
  return true
}

export function removeChatBackup(jid, tgId) {
  const db  = loadDB()
  const str = String(tgId)
  const len = db.chats.length
  db.chats  = db.chats.filter(c => !(c.jid === jid && c.tgId === str))
  saveDB(db)
  return db.chats.length < len
}

export function getChatTargets(jid) {
  return loadDB().chats.filter(c => c.jid === jid)
}

export function getAllChats() {
  return loadDB().chats
}

// ── kirim ke telegram ─────────────────────────

function toCapitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const MEDIA_EXT = {
  audio   : ['audio/mp3',       'mp3'],
  photo   : ['image/jpeg',      'jpg'],
  sticker : ['image/webp',      'webp'],
  video   : ['video/mp4',       'mp4'],
  document: ['application/pdf', 'pdf'],
  voice   : ['audio/ogg',       'ogg'],
}

async function tgSend(chatId, media = '', options = {}, tokenKey = 'TELEGRAM_TOKEN') {
  const token = process.env[tokenKey]
  if (!token) throw new Error(`${tokenKey} belum diisi di .env`)

  const type = (options.type || 'text')
    .replace('image', 'photo')
    .replace('audio', 'voice')

  const url = `https://api.telegram.org/bot${token}/send${
    type === 'text' ? 'Message' : toCapitalize(type)
  }`

  const form = new FormData()
  form.append('chat_id', String(chatId))
  if (options.parse_mode) form.append('parse_mode', options.parse_mode)

  if (type === 'text') {
    form.append('text', String(media || options.caption || ''))
  } else {
    if (!Buffer.isBuffer(media)) throw new Error('media harus Buffer')
    const ext = MEDIA_EXT[type] || ['application/octet-stream', 'bin']
    form.append(type, new Blob([media], { type: ext[0] }), `file.${ext[1]}`)
    if (options.caption) form.append('caption', options.caption)
  }

  // jangan set Content-Type manual — fetch otomatis set boundary untuk FormData
  const res  = await fetch(url, { method: 'POST', body: form })
  const data = await res.json()
  if (!data.ok) throw new Error(`Telegram: ${data.description}`)
  return data
}

// ── detect media dari raw WA message ─────────

function detectMedia(rawMsg) {
  const m = rawMsg?.message || {}
  if (m.imageMessage)    return { key: m.imageMessage,    type: 'image' }
  if (m.videoMessage)    return { key: m.videoMessage,    type: 'video' }
  if (m.audioMessage)    return { key: m.audioMessage,    type: 'audio' }
  if (m.documentMessage) return { key: m.documentMessage, type: 'document' }
  if (m.stickerMessage)  return { key: m.stickerMessage,  type: 'sticker' }

  const inner = m.viewOnceMessage?.message || m.ephemeralMessage?.message
  if (inner) {
    if (inner.imageMessage) return { key: inner.imageMessage, type: 'image' }
    if (inner.videoMessage) return { key: inner.videoMessage, type: 'video' }
    if (inner.audioMessage) return { key: inner.audioMessage, type: 'audio' }
  }
  return null
}

// ── build caption ─────────────────────────────

function buildCaption({ sender, source, type, text }) {
  const snippet = text?.length > 900 ? text.slice(0, 900) + '…' : (text || '')
  return [
    `📲 *Backup WA*`,
    `👤 ${sender}`,
    source ? `💬 ${source}` : null,
    `📦 ${type}`,
    snippet ? `\n${snippet}` : null,
  ].filter(Boolean).join('\n')
}

// ── kirim satu pesan ke satu tgId ─────────────

async function sendOne(tgId, m, rawMsg, sourceLabel) {
  const media   = detectMedia(rawMsg)
  const sender  = m.pushName || m.sender?.split('@')[0] || 'unknown'
  const text    = typeof m.text === 'string' ? m.text : ''
  const caption = buildCaption({
    sender,
    source : sourceLabel,
    type   : media ? media.type : 'text',
    text,
  })

  if (media) {
    const buf    = await downloadMedia(media.key, media.type)
    const tgType = media.type === 'image' ? 'photo'
                 : media.type === 'audio' ? 'voice'
                 : media.type
    await tgSend(tgId, buf, { type: tgType, caption, parse_mode: 'Markdown' }, 'TELEGRAM_TOKEN')
  } else {
    if (!text) return
    await tgSend(tgId, caption, { type: 'text', parse_mode: 'Markdown' }, 'TELEGRAM_TOKEN')
  }
}

// ── dispatcher: chat (group / private) ────────

export async function dispatchBackup(m, rawMsg) {
  try {
    const targets = getChatTargets(m.chat)
    if (!targets.length) return
    for (const t of targets) {
      try { await sendOne(t.tgId, m, rawMsg, t.label || m.chat) }
      catch (e) { console.error('[TG-BACKUP] gagal →', t.tgId, ':', e.message) }
    }
  } catch (e) {
    console.error('[TG-BACKUP] error:', e.message)
  }
}

// ── dispatcher: status backup ─────────────────

export async function dispatchStatusBackup(m, rawMsg) {
  try {
    const { on } = getStatusBackup()
    const tgId   = process.env.ID_TG
    console.log('[TG-BACKUP][STATUS] on:', on, '| tgId:', tgId)
    if (!on || !tgId) return

    const media   = detectMedia(rawMsg)
    const sender  = m.pushName || rawMsg?.key?.participant?.split('@')[0] || 'unknown'
    const text    = m.text || ''
    const caption = `📺 *Story WA*\n👤 ${sender}`

    console.log('[TG-BACKUP][STATUS] sender:', sender, '| hasMedia:', !!media, '| text:', text?.slice(0, 30))

    try {
      if (media) {
        const buf    = await downloadMedia(media.key, media.type)
        const tgType = media.type === 'image' ? 'photo'
                     : media.type === 'audio' ? 'voice'
                     : media.type
        await tgSend(tgId, buf, { type: tgType, caption, parse_mode: 'Markdown' }, 'TELEGRAM_TOKEN_SW')
        console.log('[TG-BACKUP][STATUS] ✅ media terkirim ke', tgId)
      } else {
        if (!text) {
          console.log('[TG-BACKUP][STATUS] skip — tidak ada teks & media')
          return
        }
        await tgSend(tgId, `${caption}\n\n${text}`, { type: 'text', parse_mode: 'Markdown' }, 'TELEGRAM_TOKEN_SW')
        console.log('[TG-BACKUP][STATUS] ✅ teks terkirim ke', tgId)
      }
    } catch (e) {
      console.error('[TG-BACKUP][STATUS] gagal →', tgId, ':', e.message)
    }
  } catch (e) {
    console.error('[TG-BACKUP][STATUS] error:', e.message)
  }
}