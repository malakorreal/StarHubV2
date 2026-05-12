const { json, allowCors, readJsonBody, bumpOnline } = require('./_utils')

module.exports = async (req, res) => {
  if (allowCors(req, res)) return
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method Not Allowed' })

  let body
  try {
    body = await readJsonBody(req)
  } catch (e) {
    return json(res, 400, { ok: false, error: e.message || 'Invalid JSON' })
  }

  const deviceId = typeof body?.deviceId === 'string' ? body.deviceId.trim() : ''
  if (!deviceId) return json(res, 400, { ok: false, error: 'deviceId is required' })

  const onlineUsers = await bumpOnline(deviceId).catch(() => null)

  return json(res, 200, { ok: true, onlineUsers })
}

