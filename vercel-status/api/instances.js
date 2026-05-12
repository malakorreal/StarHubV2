const { json, allowCors, loadInstances } = require('./_utils')

module.exports = async (req, res) => {
  if (allowCors(req, res)) return
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'Method Not Allowed' })

  try {
    const data = await loadInstances()
    return json(res, 200, { ok: true, data })
  } catch (e) {
    return json(res, 502, { ok: false, error: String(e && e.message ? e.message : e) })
  }
}

