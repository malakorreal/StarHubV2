const { json, allowCors, clearAdminSession } = require('../_utils')

module.exports = async (req, res) => {
  if (allowCors(req, res)) return
  if (req.method !== 'POST' && req.method !== 'GET') return json(res, 405, { ok: false, error: 'Method Not Allowed' })

  await clearAdminSession(res, req)

  const accept = req && req.headers ? req.headers.accept : ''
  if (typeof accept === 'string' && accept.includes('application/json')) {
    return json(res, 200, { ok: true })
  }

  res.statusCode = 302
  res.setHeader('Location', '/#announcements')
  res.end('')
}
