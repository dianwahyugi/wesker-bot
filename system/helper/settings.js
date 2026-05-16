/* ════════════════════════════════════════════
 * Wesker-MD  ╌  febry wesker
 * ════════════════════════════════════════════
 * file    : system/helper/settings.js
 * desc    : load & save settings ke cache
 * author  : febry  ⪩  2026
 * ════════════════════════════════════════════ */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname     = path.dirname(fileURLToPath(import.meta.url))
const SETTINGS_PATH = path.resolve(__dirname, '../../system/cache/settings.json')

const DEFAULTS = {
  msgAutoread   : false,
  statusAutoread: false,
  statusReact   : {
    on    : false,
    emojis: ['😍', '😂', '😬', '🤢', '🤮', '🥰', '😭']
  }
}

let _settings = { ...DEFAULTS }

export function loadSettings() {
  try {
    const raw  = fs.readFileSync(SETTINGS_PATH, 'utf8')
    const data = JSON.parse(raw)
    _settings  = {
      ...DEFAULTS,
      ...data,
      statusReact: { ...DEFAULTS.statusReact, ...data.statusReact }
    }
  } catch {
    _settings = { ...DEFAULTS }
  }
  return _settings
}

export function saveSettings(data) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), 'utf8')
}

export function Settings() {
  return _settings
}

export function updateSetting(key, value) {
  if (key === 'statusReact' && typeof value === 'object') {
    _settings.statusReact = { ..._settings.statusReact, ...value }
  } else {
    _settings[key] = value
  }
  saveSettings(_settings)
}