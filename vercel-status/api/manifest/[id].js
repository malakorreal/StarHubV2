const { json, allowCors, loadInstances } = require('../_utils')

module.exports = async (req, res) => {
  if (allowCors(req, res)) return
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'Method Not Allowed' })

  const url = req.url || ''
  const match = url.match(/\/api\/manifest\/([^/?#]+)/i)
  const id = match ? decodeURIComponent(match[1]) : ''
  if (!id) return json(res, 400, { ok: false, error: 'instanceId is required' })

  try {
    const raw = await loadInstances()
    const instances = Array.isArray(raw) ? raw : (Array.isArray(raw?.instances) ? raw.instances : [])
    const inst = instances.find((x) => x && String(x.id || '') === id)
    if (!inst) return json(res, 404, { ok: false, error: 'instance_not_found', instanceId: id })

    const ignoreRules = [
      'config/**/cache/**',
      'logs/**',
      'crash-reports/**',
      ...(Array.isArray(inst.ignoreFiles) ? inst.ignoreFiles : [])
    ]

    const data = {
      instanceId: id,
      versionKey: inst.modpackVersion || inst.version || null,
      modpackUrl: inst.modpackUrl || null,
      serverIp: inst.serverIp || null,
      ignoreRules,
      files: []
    }

    return json(res, 200, { ok: true, data })
  } catch (e) {
    return json(res, 502, { ok: false, error: String(e && e.message ? e.message : e) })
  }
}
