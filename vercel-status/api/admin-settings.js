const { json, allowCors, readJsonBody, getStarhubSettings, upsertStarhubSettings, resolveAdminUserId, getAllowedDiscordIds } = require('./_utils')

function toCleanString(v, { max = 5000 } = {}) {
  if (typeof v !== 'string') return ''
  const s = v.replace(/\r/g, '').trim()
  return s.length > max ? s.slice(0, max) : s
}

function normalizeAnnouncements(raw) {
  const arr = Array.isArray(raw) ? raw : []
  const out = []
  for (let i = 0; i < arr.length && out.length < 20; i++) {
    const a = arr[i] && typeof arr[i] === 'object' ? arr[i] : {}
    const id = toCleanString(a.id, { max: 80 }) || `announcement_${Date.now()}_${i}`
    const title = toCleanString(a.title, { max: 200 })
    const message =
      toCleanString(a.message, { max: 8000 }) ||
      toCleanString(a.description, { max: 8000 })
    const footer =
      toCleanString(a.footer, { max: 2000 }) ||
      toCleanString(a.bottomText, { max: 2000 })

    const item = { id }
    if (title) item.title = title
    if (message) item.message = message
    if (footer) item.footer = footer

    out.push(item)
  }
  return out
}

module.exports = async (req, res) => {
  if (allowCors(req, res)) return

  const userId = await resolveAdminUserId(req)
  if (!userId) return json(res, 401, { ok: false, error: 'Unauthorized' })
  const allowed = await getAllowedDiscordIds().catch(() => null)
  if (!allowed || !allowed.has(userId)) return json(res, 403, { ok: false, error: 'Forbidden' })

  if (req.method === 'GET') {
    const settings = await getStarhubSettings()
    return json(res, 200, { ok: true, settings: settings || { maintenance: false, maintenanceMessage: '', announcements: [], announcementMinCloseSeconds: 5 } })
  }

  if (req.method !== 'PUT') return json(res, 405, { ok: false, error: 'Method Not Allowed' })

  let body = {}
  try {
    body = await readJsonBody(req)
  } catch (e) {
    return json(res, 400, { ok: false, error: String(e && e.message ? e.message : e) })
  }

  const announcements = normalizeAnnouncements(body.announcements)
  const minCloseRaw = body.announcementMinCloseSeconds
  const announcementMinCloseSeconds = Number.isFinite(Number(minCloseRaw)) ? Math.max(0, Math.min(120, Math.floor(Number(minCloseRaw)))) : undefined

  const maintenance = typeof body.maintenance === 'boolean' ? body.maintenance : undefined
  const maintenanceMessage = typeof body.maintenanceMessage === 'string' ? toCleanString(body.maintenanceMessage, { max: 8000 }) : undefined

  const patch = {
    ...(typeof maintenance === 'boolean' ? { maintenance } : {}),
    ...(typeof maintenanceMessage === 'string' ? { maintenance_message: maintenanceMessage } : {}),
    announcements,
    ...(typeof announcementMinCloseSeconds === 'number' ? { announcement_min_close_seconds: announcementMinCloseSeconds } : {})
  }

  const settingsId = typeof process.env.STARHUB_SETTINGS_ID === 'string' && process.env.STARHUB_SETTINGS_ID.trim()
    ? process.env.STARHUB_SETTINGS_ID.trim()
    : '1'

  try {
    await upsertStarhubSettings(settingsId, patch)
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e && e.message ? e.message : e) })
  }

  const settings = await getStarhubSettings()
  return json(res, 200, { ok: true, settings: settings || null })
}
