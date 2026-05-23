/* ════════════════════════════════════════════
 * Wesker-MD  ╌  febry wesker
 * ════════════════════════════════════════════
 * file    : tg-id-checker.js
 * desc    : bot telegram › cek ID grup/chat
 * usage   : node tg-id-checker.js
 * ════════════════════════════════════════════ */

import 'dotenv/config'

const TOKEN  = process.env.TELEGRAM_TOKEN
const BASE   = `https://api.telegram.org/bot${TOKEN}`

if (!TOKEN) {
  console.error('❌ TELEGRAM_TOKEN tidak ada di .env')
  process.exit(1)
}

let offset = 0

async function getUpdates() {
  const res  = await fetch(`${BASE}/getUpdates?offset=${offset}&timeout=30`)
  const data = await res.json()
  if (!data.ok) throw new Error(data.description)
  return data.result
}

async function sendMessage(chatId, text) {
  await fetch(`${BASE}/sendMessage`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
  })
}

async function handleUpdate(update) {
  const msg    = update.message || update.channel_post
  if (!msg) return

  const text   = msg.text || ''
  const chatId = msg.chat.id
  const type   = msg.chat.type  // private | group | supergroup | channel
  const title  = msg.chat.title || msg.chat.username || msg.chat.first_name || 'Chat ini'

  if (text === '/id' || text.startsWith('/id@')) {
    const typeLabel = {
      private   : '👤 Private',
      group     : '👥 Group',
      supergroup: '👥 Supergroup',
      channel   : '📢 Channel',
    }[type] || type

    const reply =
      `🆔 *ID Telegram*\n\n` +
      `Nama  : ${title}\n` +
      `Tipe  : ${typeLabel}\n` +
      `ID    : \`${chatId}\`\n\n` +
      `_Copy ID di atas untuk dipakai di bot WA_`

    await sendMessage(chatId, reply)
    console.log(`[/id] ${title} → ${chatId}`)
  }
}

async function poll() {
  console.log('🤖 Bot ID Checker aktif — ketik /id di grup Telegram\n')
  while (true) {
    try {
      const updates = await getUpdates()
      for (const upd of updates) {
        offset = upd.update_id + 1
        await handleUpdate(upd)
      }
    } catch (e) {
      console.error('❌ Error:', e.message)
      await new Promise(r => setTimeout(r, 5000))
    }
  }
}

poll()