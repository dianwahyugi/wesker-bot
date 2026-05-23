/* ════════════════════════════════════════════
 * Wesker-MD  ╌  febry wesker
 * ════════════════════════════════════════════
 * file    : plugins/menu/help.js
 * desc    : plugins › help
 * author  : febry  ⪩  2026
 * ════════════════════════════════════════════
 * © 2026 febry wesker. all rights reserved.
 * do not resell, redistribute, or claim as
 * your own work without explicit permission.
 * ────────────────────────────────────────────
 * © 2026 febry wesker. semua hak dilindungi.
 * dilarang menjual, menyebarkan, atau mengaku
 * sebagai karya sendiri tanpa izin tertulis.
 * ════════════════════════════════════════════ */

import fs    from 'fs'
import fetch from 'node-fetch'

const VIDEO_PATH  = './assets/shinichi.mp4'
const DEFAULT_URL = 'https://api.azbry.com/api/wesker.jpg'

async function getThumbBuffer(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw 0
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

export default {
  name       : 'help',
  command    : ['help'],
  category   : ['main'],
  description: 'tampilkan daftar command + detail',

  async run({ feb, m, args, wesker }) {
    const pm = wesker
    if (!pm) return

    const plugins = pm.getPublicPlugins()
    const video   = fs.readFileSync(VIDEO_PATH)

    /* ─ help <command> ─ */
    if (args[0]) {
      const target = args[0].toLowerCase()
      const plugin = plugins.find(p =>
        Array.isArray(p.command) && p.command.includes(target)
      )

      if (!plugin) return m.reply('command tidak ditemukan')

      const thumbUrl = plugin.thumbnail || DEFAULT_URL
      const thumb    =
        (await getThumbBuffer(thumbUrl)) ||
        (await getThumbBuffer(DEFAULT_URL))

      const caption =
`• command    : ${plugin.command[0]}
• category   : ${plugin.category?.[0] || 'other'}
• aliases    : ${plugin.command.join(', ')}
• description:
${plugin.description || 'tidak ada deskripsi'}`

      return feb.sendMessage(
        m.chat,
        {
          video      : video,
          gifPlayback: true,
          caption,
        },
        { quoted: m.raw }
      )
    }

    /* ─ help (semua) ─ */
    const map = new Map()
    for (const p of plugins) {
      const cat = (p.category?.[0] || 'other').toLowerCase()
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat).push(p)
    }

    let text = 'command information\n\n'
    for (const [cat, list] of [...map.entries()].sort()) {
      text += `❯ ${cat}\n`
      for (const p of list.sort((a, b) => a.command[0].localeCompare(b.command[0]))) {
        text += `• ${p.command[0]}\n`
        text += `  └ ${p.description || 'no desc'}\n`
      }
      text += '\n'
    }
    text += 'ketik *help <command>* untuk detail'

    return feb.sendMessage(
      m.chat,
      {
        video      : video,
        gifPlayback: true,
        caption    : text
      },
      { quoted: m.raw }
    )
  }
}