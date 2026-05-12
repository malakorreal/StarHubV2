const { boolFromEnv, json, allowCors, loadInstances, getOnlineUsers, getMinecraftServerStatusCached, mapLimit, getStarhubSettings } = require('./_utils')

module.exports = async (req, res) => {
  if (allowCors(req, res)) return
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'Method Not Allowed' })

  const settings = await getStarhubSettings()
  const maintenance = settings ? settings.maintenance : boolFromEnv(process.env.STARHUB_MAINTENANCE, false)
  const maintenanceMessage = settings
    ? (settings.maintenanceMessage || '')
    : (typeof process.env.STARHUB_MAINTENANCE_MESSAGE === 'string' ? process.env.STARHUB_MAINTENANCE_MESSAGE : '')

  let instances = []
  let instancesOk = true
  let instancesError = null
  try {
    const data = await loadInstances()
    instances = Array.isArray(data) ? data : (Array.isArray(data?.instances) ? data.instances : [])
  } catch (e) {
    instancesOk = false
    instancesError = String(e && e.message ? e.message : e)
  }

  const onlineUsers = await getOnlineUsers().catch(() => null)

  const primaryInstanceId = (typeof process.env.STARHUB_PRIMARY_INSTANCE_ID === 'string' && process.env.STARHUB_PRIMARY_INSTANCE_ID.trim())
    ? process.env.STARHUB_PRIMARY_INSTANCE_ID.trim()
    : 'luminaevernight'
  const serverIpFromEnv = (typeof process.env.STARHUB_SERVER_IP === 'string' && process.env.STARHUB_SERVER_IP.trim())
    ? process.env.STARHUB_SERVER_IP.trim()
    : ''
  const serverIpFromInstances =
    (instances.find((x) => x && String(x.id || '') === primaryInstanceId && typeof x.serverIp === 'string' && x.serverIp.trim())?.serverIp) ||
    (instances.find((x) => x && typeof x.serverIp === 'string' && x.serverIp.trim())?.serverIp) ||
    ''
  const serverIp = serverIpFromEnv || (typeof serverIpFromInstances === 'string' ? serverIpFromInstances.trim() : '')

  const statusByIp = new Map()
  const getServerStatus = async (ip) => {
    const value = typeof ip === 'string' ? ip.trim() : ''
    if (!value) return null
    if (statusByIp.has(value)) return await statusByIp.get(value)
    const p = getMinecraftServerStatusCached(value, { ttlSeconds: 20 })
    statusByIp.set(value, p)
    return await p
  }

  const server = maintenance ? null : await getServerStatus(serverIp)
  const serverOnline = maintenance ? false : (server ? !!server.online : false)

  const maxChecksRaw = (typeof process.env.STARHUB_MAX_SERVER_CHECKS === 'string' && process.env.STARHUB_MAX_SERVER_CHECKS.trim())
    ? Number(process.env.STARHUB_MAX_SERVER_CHECKS.trim())
    : 12
  const maxChecks = Number.isFinite(maxChecksRaw) ? Math.max(0, Math.min(50, Math.floor(maxChecksRaw))) : 12

  const instancesWithServer = await mapLimit(instances, 4, async (inst, idx) => {
    const ip = (inst && typeof inst.serverIp === 'string') ? inst.serverIp.trim() : ''
    const st = (maintenance || idx >= maxChecks) ? null : await getServerStatus(ip)
    return {
      ...inst,
      serverOnline: maintenance ? false : !!st?.online,
      server: st || null
    }
  })

  return json(res, 200, {
    ok: true,
    maintenance,
    maintenanceMessage,
    announcements: settings ? (Array.isArray(settings.announcements) ? settings.announcements : []) : [],
    announcementMinCloseSeconds: settings ? settings.announcementMinCloseSeconds : 5,
    serverOnline,
    serverIp: serverIp || null,
    primaryInstanceId,
    server,
    onlineUsers,
    instancesOk,
    instancesError,
    instances: instancesWithServer,
    maxServerChecks: maxChecks,
    updatedAt: Date.now()
  })
}
