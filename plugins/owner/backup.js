/* ════════════════════════════════════════════
 * Wesker-MD  ╌  febry wesker
 * ════════════════════════════════════════════
 * file    : plugins/owner/backup.js
 * desc    : plugin › backup WA ke Telegram
 * author  : febry  ⪩  2026
 * ════════════════════════════════════════════ */

import {
  addChatBackup,
  removeChatBackup,
  getAllChats,
  getStatusBackup,
  setStatusBackupOn,
} from '../../system/helper/telegram-backup.js'

// ─────────────────────────────────────────────
//  Backup chat (group / private):
//    .backup <tgId>           → aktifkan backup chat ini
//    .backup remove <tgId>    → hapus backup chat ini
//    .backup list             → lihat semua backup aktif
//
//  Backup status WA:
//    .backup status on            → nyalakan
//    .backup status off           → matikan
//    .backup status set <tgId>    → set / ganti tujuan
//    .backup status info          → lihat kondisi saat ini
// ─────────────────────────────────────────────

export default {
  name       : 'backup',
  command    : ['backup'],
  category   : ['owner'],
  description: 'backup otomatis WA → Telegram',

  async run({ m, args, react, chat, role }) {

    if (role !== 'owner') return m.reply('khusus owner')

    const sub  = args[0]?.toLowerCase()
    const arg1 = args[1]

    // ══════════════════════════════════════════
    //  .backup status ...
    // ══════════════════════════════════════════
    if (sub === 'status') {
      const statusSub = arg1?.toLowerCase()

      // .backup status on
      if (statusSub === 'on') {
        setStatusBackupOn(true)
        await react('ok')
        return m.reply(
          `✅ Backup status *aktif*\n` +
          `Semua story WA dikirim ke TG ID: *${process.env.ID_TG}*`
        )
      }

      // .backup status off
      if (statusSub === 'off') {
        setStatusBackupOn(false)
        await react('ok')
        return m.reply('🔕 Backup status *dimatikan*')
      }

      // .backup status info (default)
      const { on } = getStatusBackup()
      return m.reply(
        `📺 *Backup Status WA*\n\n` +
        `Status : ${on ? '🟢 aktif' : '🔴 mati'}\n` +
        `TG ID  : ${process.env.ID_TG || '(ID_TG belum diset di .env)'}\n\n` +
        `_.backup status on_ — nyalakan\n` +
        `_.backup status off_ — matikan`
      )
    }

    // ══════════════════════════════════════════
    //  .backup list
    // ══════════════════════════════════════════
    if (sub === 'list') {
      const all = getAllChats()
      if (!all.length) return m.reply('belum ada backup chat yang aktif.')
      const rows = all.map((c, i) =>
        `${i + 1}. ${c.label || c.jid}\n   → TG: ${c.tgId}`
      ).join('\n\n')
      return m.reply(`📋 *Semua backup chat aktif:*\n\n${rows}`)
    }

    // ══════════════════════════════════════════
    //  .backup remove <tgId>
    // ══════════════════════════════════════════
    if (sub === 'remove') {
      if (!arg1) return m.reply('usage: .backup remove <tgId>')
      const ok = removeChatBackup(chat, arg1)
      if (!ok) return m.reply(`backup ke TG *${arg1}* tidak ditemukan untuk chat ini.`)
      await react('ok')
      return m.reply(`✅ Backup dihapus.\nChat : ${chat}\nTG   : ${arg1}`)
    }

    // ══════════════════════════════════════════
    //  .backup <tgId>  → daftarkan chat ini
    // ══════════════════════════════════════════
    if (!sub) {
      return m.reply(
        `*📦 Backup WA → Telegram*\n\n` +
        `*.backup <tgId>*\n  backup chat ini ke ID Telegram\n\n` +
        `*.backup remove <tgId>*\n  hapus backup chat ini\n\n` +
        `*.backup list*\n  lihat semua backup aktif\n\n` +
        `*.backup status on*\n  nyalakan backup semua story WA\n\n` +
        `*.backup status off*\n  matikan backup story WA\n\n` +
        `Contoh:\n` +
        `  .backup 123456789\n` +
        `  .backup -1001234567890\n` +
        `  .backup status on`
      )
    }

    // sub = tgId langsung
    const tgId = sub
    if (!/^-?\d+$/.test(tgId)) {
      return m.reply(
        `ID Telegram tidak valid: *${tgId}*\n` +
        `Harus berupa angka, contoh: 123456789 atau -1001234567890`
      )
    }

    const label = m.isGroup ? (m.groupName || chat) : (m.pushName || chat)
    const ok    = addChatBackup(chat, tgId, label)

    if (!ok) return m.reply(`backup ke TG *${tgId}* sudah aktif untuk chat ini.`)

    await react('ok')
    return m.reply(
      `✅ *Backup aktif!*\n\n` +
      `Chat  : ${label}\n` +
      `TG ID : ${tgId}\n\n` +
      `Semua pesan & media dari chat ini dikirim otomatis ke Telegram.\n` +
      `Ketik *.backup remove ${tgId}* untuk menonaktifkan.`
    )
  }
}