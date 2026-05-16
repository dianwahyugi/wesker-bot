/* ════════════════════════════════════════════
 * Wesker-MD  ╌  febry wesker
 * ════════════════════════════════════════════
 * file    : system/helper/message-logger.js
 * desc    : message log formatter (importable)
 * author  : febry  ⪩  2026
 * ════════════════════════════════════════════ */

import moment from 'moment'
import chalk  from 'chalk'

const c = chalk

/**
 * Log satu pesan ke console — kompatibel dengan struktur
 * serialize() yang dipakai di message-upsert.js.
 *
 * @param {object} m         - hasil serialize(feb, msg, messageStore)
 * @param {string} type      - tipe upsert: 'notify' | 'append'
 * @param {number} startTime - unix timestamp (detik) saat bot start
 * @returns {boolean}        - true jika pesan offline-sync (untuk `continue`)
 */
export function logMessage(m, type, startTime = 0) {

  /* ── konten ── */
  const safeText = typeof m.text === 'string' ? m.text : ''

  const media = m.message?.imageMessage    ? 'image'
              : m.message?.videoMessage    ? 'video'
              : m.message?.audioMessage    ? 'audio'
              : m.message?.documentMessage ? 'document'
              : m.message?.stickerMessage  ? 'sticker'
              : null

  /* ── waktu ── */
  const rawTimestamp = m.raw?.messageTimestamp?.low
                    || m.raw?.messageTimestamp
                    || Math.floor(Date.now() / 1000)

  const time = (() => {
    const t = moment(rawTimestamp * 1000)
    const n = moment()
    if (!t.isValid()) return moment().format('HH:mm')
    return t.isSame(n, 'day') ? t.format('HH:mm') : t.format('DD/MM HH:mm')
  })()

  /* ── konteks — pakai field dari serialize ── */
  const groupName = m.isGroup   ? (m.groupMetadata?.subject || m.chat || 'GROUP')
                  : m.isChannel ? m.chat
                  : 'PRIVATE'

  const name = m.pushName || m.sender || m.chat

  /* ── offline sync ── */
  const isOfflineSync = type === 'append' || rawTimestamp < (startTime - 10)
  const statusIcon    = isOfflineSync
    ? c.yellowBright('[OFFLINE]')
    : c.greenBright('[ONLINE]')

  /* ── print ── */
  const lines = safeText ? safeText.trim().split('\n') : []

  console.log(
    c.cyan.bold('┌── ') +
    c.cyan.bold(` ${groupName} `) +
    c.cyan.bold(' ── ') +
    c.blueBright.bold(`[ ${time} ] `) +
    statusIcon
  )

  if (media || lines.length > 0) {
    const firstLine = lines.shift() || ''
    console.log(
      c.cyan.bold('│ ') +
      c.yellowBright.bold(`${name}: `) +
      c.white(
        [media && c.magenta.italic(`[${media}]`), firstLine]
          .filter(Boolean)
          .join(' ')
      )
    )
    for (const line of lines)
      console.log(c.cyan.bold('│ ') + c.white(line))
  }

  console.log(c.cyan.bold('└────────────'))

  return isOfflineSync
}