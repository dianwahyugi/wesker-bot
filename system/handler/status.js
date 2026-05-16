/* ════════════════════════════════════════════
 * Wesker-MD  ╌  febry wesker
 * ════════════════════════════════════════════
 * file    : system/handler/status.js
 * desc    : handler › status broadcast
 * author  : febry  ⪩  2026
 * ════════════════════════════════════════════ */

import chalk               from 'chalk'
import { jidNormalizedUser } from 'baileys'
import { Settings }        from '../helper/settings.js'

export const handleStatus = async (feb, msg) => {
  if (msg.key.remoteJid !== 'status@broadcast') return false

  const { statusAutoread, statusReact } = Settings()
  const pushName  = msg.pushName || msg.key.participant || 'unknown'
  const senderJid = jidNormalizedUser(msg.key.participant || msg.key.remoteJid)

  /* ─ autoread ─ */
  if (statusAutoread) {
    await feb.readMessages([msg.key]).catch(() => {})

    const typ = msg.message
      ? Object.keys(msg.message).find(
          k => k !== 'messageContextInfo' && k !== 'senderKeyDistributionMessage'
        )
      : ''

    console.log(
      /protocolMessage/i.test(typ)
        ? chalk.yellowBright(`${pushName} menghapus story ❗`)
        : chalk.greenBright(`melihat story : ${pushName}`)
    )
  }

  /* ─ auto react ─ */
  if (statusReact?.on) {
    const emojis = statusReact.emojis?.length
      ? statusReact.emojis
      : ['😍', '😂', '😬', '🤢', '🤮', '🥰', '😭']

    const emoji = emojis[Math.floor(Math.random() * emojis.length)]

    await feb.sendMessage(
      'status@broadcast',
      { react: { key: msg.key, text: emoji } },
      { statusJidList: [jidNormalizedUser(feb.user.id), senderJid] }
    ).catch(() => {})
  }

  return true
}