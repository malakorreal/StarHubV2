const { json, allowCors, resolveAdminUserId, getAllowedDiscordIds } = require('../_utils')

module.exports = async (req, res) => {
  if (allowCors(req, res)) return
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'Method Not Allowed' })

  const userId = await resolveAdminUserId(req)
  const allowed = userId ? await getAllowedDiscordIds().catch(() => null) : null
  const isAllowed = !!(userId && allowed && allowed.has(userId))

  return json(res, 200, {
    ok: true,
    authenticated: isAllowed,
    userId: isAllowed ? userId : null
  })
}
