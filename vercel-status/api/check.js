const { json, allowCors, readJsonBody, loadInstances, normalizeRelPath, shouldIgnore: shouldIgnoreFromUtils } = require('./_utils')

function defaultIgnoreRules() {
  return ['config/**/cache/**', 'logs/**', 'crash-reports/**']
}

function isCriticalPath(p) {
  const rel = normalizeRelPath(p)
  if (rel.startsWith('mods/')) return true
  if (rel.startsWith('config/') && !rel.includes('/cache/')) return true
  return false
}

module.exports = async (req, res) => {
  if (allowCors(req, res)) return
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method Not Allowed' })

  let body
  try {
    body = await readJsonBody(req)
  } catch (e) {
    return json(res, 400, { ok: false, error: e.message || 'Invalid JSON' })
  }

  const instanceId = typeof body?.instanceId === 'string' ? body.instanceId.trim() : ''
  const missing = Array.isArray(body?.missing) ? body.missing : []
  const corrupt = Array.isArray(body?.corrupt) ? body.corrupt : []

  let ignoreRules = defaultIgnoreRules()
  if (instanceId) {
    try {
      const data = await loadInstances()
      const instances = Array.isArray(data) ? data : (Array.isArray(data?.instances) ? data.instances : [])
      const inst = instances.find((x) => x && String(x.id || '') === instanceId)
      if (inst && Array.isArray(inst.ignoreFiles)) {
        ignoreRules = [...defaultIgnoreRules(), ...inst.ignoreFiles]
      }
    } catch (e) {}
  }

  const normalizedMissing = missing.map(normalizeRelPath).filter(Boolean)
  const normalizedCorrupt = corrupt.map(normalizeRelPath).filter(Boolean)

  const ignoredMissing = normalizedMissing.filter((p) => shouldIgnoreFromUtils(p, ignoreRules))
  const ignoredCorrupt = normalizedCorrupt.filter((p) => shouldIgnoreFromUtils(p, ignoreRules))

  const criticalMissing = normalizedMissing.filter((p) => isCriticalPath(p) && !shouldIgnoreFromUtils(p, ignoreRules))
  const criticalCorrupt = normalizedCorrupt.filter((p) => isCriticalPath(p) && !shouldIgnoreFromUtils(p, ignoreRules))

  return json(res, 200, {
    ok: true,
    instanceId: instanceId || null,
    ignoreRules,
    totals: {
      missing: normalizedMissing.length,
      corrupt: normalizedCorrupt.length,
      ignored: ignoredMissing.length + ignoredCorrupt.length,
      critical: criticalMissing.length + criticalCorrupt.length
    },
    ignored: {
      missing: ignoredMissing,
      corrupt: ignoredCorrupt
    },
    critical: {
      missing: criticalMissing,
      corrupt: criticalCorrupt
    }
  })
}
