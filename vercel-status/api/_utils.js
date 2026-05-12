const fs = require('fs')
const path = require('path')

const DEFAULT_NPOINT_INSTANCES_URL = 'https://api.npoint.io/e941143771dfcea29992'
const memoryServerStatusCache = new Map()
const memoryOnlineCache = new Map()

function boolFromEnv(value, fallback = false) {
  if (typeof value !== 'string') return fallback
  const v = value.trim().toLowerCase()
  if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false
  return fallback
}

function json(res, statusCode, data) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

function allowCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end('')
    return true
  }
  return false
}

async function readJsonBody(req) {
  return await new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 1_000_000) {
        reject(new Error('Body too large'))
      }
    })
    req.on('end', () => {
      if (!body) return resolve({})
      try {
        resolve(JSON.parse(body))
      } catch (e) {
        reject(new Error('Invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

async function fetchJson(url, { timeoutMs = 8000 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`)
    }
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

function resolveDataPath(...parts) {
  return path.join(process.cwd(), 'data', ...parts)
}

function safeReadJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch (e) {
    return null
  }
}

function normalizeRelPath(p) {
  return String(p || '').replace(/\\/g, '/').replace(/^\/+/, '')
}

function basename(p) {
  const parts = normalizeRelPath(p).split('/').filter(Boolean)
  return parts.length ? parts[parts.length - 1] : ''
}

function shouldIgnore(relPath, ignoreList) {
  if (!relPath) return false

  const normPath = normalizeRelPath(relPath).toLowerCase()
  const systemWhitelist = ['figura', 'fragmentskin', 'cache', 'shaderpacks', 'screenshots', 'emotes', 'logs', 'crash-reports']
  const combined = [...systemWhitelist, ...(Array.isArray(ignoreList) ? ignoreList : [])]

  return combined.some((pattern) => {
    if (!pattern) return false

    let p = String(pattern)
      .replace(/\\/g, '/')
      .toLowerCase()
      .replace(/^\/+/, '')
      .replace(/\/+\.\/+/g, '/')
      .replace(/\/+\.$/, '/')

    if (!p) return false

    if (normPath === p) return true

    const dirPattern = p.endsWith('/') ? p : p + '/'
    if (normPath.startsWith(dirPattern)) return true

    if (p.includes('*')) {
      const regexPattern = p
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\\\*/g, '.*')
      try {
        const regex = new RegExp(`^${regexPattern}$`)
        if (regex.test(normPath)) return true

        if (p.includes('/') && !p.endsWith('*')) {
          const folderPart = p.substring(0, p.lastIndexOf('/') + 1)
          if (normPath.startsWith(folderPart)) {
            const filePart = normPath.substring(folderPart.length)
            const filePattern = p.substring(folderPart.length)
            const fileRegex = new RegExp(`^${filePattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*')}$`)
            if (fileRegex.test(filePart)) return true
          }
        }
      } catch (e) {}
    }

    if (basename(normPath) === p) return true

    return false
  })
}

function matchSegment(text, pattern) {
  if (pattern === '*') return true
  if (!pattern.includes('*')) return text === pattern
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`).test(text)
}

function matchGlob(p, glob) {
  const pathParts = normalizeRelPath(p).split('/').filter(Boolean)
  const globParts = normalizeRelPath(glob).split('/').filter(Boolean)

  function walk(i, j) {
    while (j < globParts.length && globParts[j] === '**') {
      if (j === globParts.length - 1) return true
      for (let k = i; k <= pathParts.length; k++) {
        if (walk(k, j + 1)) return true
      }
      return false
    }
    if (i === pathParts.length && j === globParts.length) return true
    if (i >= pathParts.length || j >= globParts.length) return false
    if (!matchSegment(pathParts[i], globParts[j])) return false
    return walk(i + 1, j + 1)
  }

  return walk(0, 0)
}

async function loadInstances() {
  const npointUrl = process.env.NPOINT_INSTANCES_URL
  const url = (typeof npointUrl === 'string' && npointUrl.trim()) ? npointUrl.trim() : DEFAULT_NPOINT_INSTANCES_URL
  if (url) return await fetchJson(url, { timeoutMs: 9000 })
  const local = safeReadJsonFile(resolveDataPath('instances.json'))
  return local || []
}

function getUpstash() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return { url: String(url).replace(/\/+$/, ''), token: String(token) }
}

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return { url: String(url).replace(/\/+$/, ''), key: String(key) }
}

async function fetchSupabaseJson(pathWithQuery) {
  const supabase = getSupabase()
  if (!supabase) return null
  const url = `${supabase.url}${pathWithQuery.startsWith('/') ? '' : '/'}${pathWithQuery}`
  const res = await fetch(url, {
    headers: {
      apikey: supabase.key,
      Authorization: `Bearer ${supabase.key}`,
      Accept: 'application/json'
    },
    cache: 'no-store'
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Supabase request failed: HTTP ${res.status}${t ? `: ${t.slice(0, 200)}` : ''}`)
  }
  return await res.json()
}

async function supabaseRequest(pathWithQuery, { method = 'GET', body = null, headers = {} } = {}) {
  const supabase = getSupabase()
  if (!supabase) return null
  const url = `${supabase.url}${pathWithQuery.startsWith('/') ? '' : '/'}${pathWithQuery}`
  const hasBody = body !== null && body !== undefined
  const res = await fetch(url, {
    method,
    headers: {
      apikey: supabase.key,
      Authorization: `Bearer ${supabase.key}`,
      Accept: 'application/json',
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    },
    body: hasBody ? JSON.stringify(body) : undefined,
    cache: 'no-store'
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Supabase request failed: HTTP ${res.status}${t ? `: ${t.slice(0, 200)}` : ''}`)
  }
  const text = await res.text().catch(() => '')
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function upsertStarhubSettings(id, patch) {
  const safeId = typeof id === 'string' && id.trim() ? id.trim() : '1'
  const payload = { id: safeId, ...(patch && typeof patch === 'object' ? patch : {}) }
  return await supabaseRequest('/rest/v1/starhub_settings?on_conflict=id', {
    method: 'POST',
    body: payload,
    headers: { Prefer: 'return=representation,resolution=merge-duplicates' }
  })
}

async function getStarhubSettings() {
  const supabase = getSupabase()
  if (!supabase) return null
  try {
    const data = await fetchSupabaseJson('/rest/v1/starhub_settings?select=id,maintenance,maintenance_message,announcements,announcement_min_close_seconds&order=updated_at.desc&limit=1')
    const row = Array.isArray(data) ? data[0] : null
    if (!row) return null

    const announcementsRaw = row.announcements
    const announcements = Array.isArray(announcementsRaw) ? announcementsRaw : []
    const minCloseSecondsRaw = row.announcement_min_close_seconds
    const minCloseSeconds = Number.isFinite(Number(minCloseSecondsRaw)) ? Math.max(0, Math.floor(Number(minCloseSecondsRaw))) : 5

    return {
      maintenance: row.maintenance === true,
      maintenanceMessage: typeof row.maintenance_message === 'string' ? row.maintenance_message : '',
      announcements,
      announcementMinCloseSeconds: minCloseSeconds
    }
  } catch (e) {
    return null
  }
}

function cleanupMemoryOnline(now, ttlMs) {
  for (const [k, v] of memoryOnlineCache.entries()) {
    if (!v || typeof v.lastSeen !== 'number' || v.lastSeen <= now - ttlMs) {
      memoryOnlineCache.delete(k)
    }
  }
}

async function upstashGet(key) {
  const cfg = getUpstash()
  if (!cfg) return null
  const res = await fetch(`${cfg.url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${cfg.token}` },
    cache: 'no-store'
  })
  if (!res.ok) return null
  const data = await res.json().catch(() => null)
  return data?.result ?? null
}

async function upstashSet(key, value, exSeconds) {
  const cfg = getUpstash()
  if (!cfg) return null
  const url = `${cfg.url}/set/${encodeURIComponent(key)}${typeof exSeconds === 'number' ? `?EX=${exSeconds}` : ''}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'text/plain; charset=utf-8'
    },
    body: String(value ?? ''),
    cache: 'no-store'
  })
  if (!res.ok) return null
  const data = await res.json().catch(() => null)
  return data?.result ?? null
}

async function upstashCommand(commandPath) {
  const cfg = getUpstash()
  if (!cfg) return null
  const res = await fetch(`${cfg.url}${commandPath}`, {
    headers: { Authorization: `Bearer ${cfg.token}` },
    cache: 'no-store'
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Upstash HTTP ${res.status}${t ? `: ${t.slice(0, 200)}` : ''}`)
  }
  const data = await res.json()
  return data?.result
}

async function bumpOnline(deviceId) {
  const id = typeof deviceId === 'string' ? deviceId.trim() : ''
  if (!id) return null

  const ttlMs = 5 * 60 * 1000
  const now = Date.now()

  const upstash = getUpstash()
  if (upstash) {
    const key = 'starhub:online'
    await upstashCommand(`/zadd/${encodeURIComponent(key)}/${now}/${encodeURIComponent(id)}`)
    await upstashCommand(`/zremrangebyscore/${encodeURIComponent(key)}/-inf/${now - ttlMs}`)
    const count = await upstashCommand(`/zcard/${encodeURIComponent(key)}`)
    return typeof count === 'number' ? count : (typeof count === 'string' ? Number(count) : null)
  }

  const supabase = getSupabase()
  if (supabase) {
    const table = 'starhub_online'
    const upsertUrl = `${supabase.url}/rest/v1/${table}?on_conflict=device_id`
    const res = await fetch(upsertUrl, {
      method: 'POST',
      headers: {
        apikey: supabase.key,
        Authorization: `Bearer ${supabase.key}`,
        'Content-Type': 'application/json; charset=utf-8',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({ device_id: id, last_seen: new Date(now).toISOString() })
    })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      throw new Error(`Supabase upsert failed: HTTP ${res.status}${t ? `: ${t.slice(0, 200)}` : ''}`)
    }
    return await getOnlineUsers()
  }

  memoryOnlineCache.set(id, { lastSeen: now })
  cleanupMemoryOnline(now, ttlMs)
  return memoryOnlineCache.size
}

async function getOnlineUsers() {
  const ttlMs = 5 * 60 * 1000
  const now = Date.now()

  const upstash = getUpstash()
  if (upstash) {
    const key = 'starhub:online'
    await upstashCommand(`/zremrangebyscore/${encodeURIComponent(key)}/-inf/${now - ttlMs}`)
    const count = await upstashCommand(`/zcard/${encodeURIComponent(key)}`)
    return typeof count === 'number' ? count : (typeof count === 'string' ? Number(count) : null)
  }

  const supabase = getSupabase()
  if (supabase) {
    const table = 'starhub_online'
    const cutoffIso = new Date(now - ttlMs).toISOString()
    const url = `${supabase.url}/rest/v1/${table}?select=device_id&last_seen=gt.${encodeURIComponent(cutoffIso)}`
    const res = await fetch(url, {
      headers: {
        apikey: supabase.key,
        Authorization: `Bearer ${supabase.key}`,
        Prefer: 'count=exact'
      },
      cache: 'no-store'
    })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      throw new Error(`Supabase select failed: HTTP ${res.status}${t ? `: ${t.slice(0, 200)}` : ''}`)
    }
    const contentRange = res.headers.get('content-range') || ''
    const m = contentRange.match(/\/(\d+)\s*$/)
    if (m) return Number(m[1])
    const data = await res.json().catch(() => null)
    return Array.isArray(data) ? data.length : null
  }

  cleanupMemoryOnline(now, ttlMs)
  return memoryOnlineCache.size
}

async function getMinecraftServerStatus(ip) {
  const value = typeof ip === 'string' ? ip.trim() : ''
  if (!value) return null
  try {
    const data = await fetchJson(`https://api.mcstatus.io/v2/status/java/${encodeURIComponent(value)}`, { timeoutMs: 5000 })
    return {
      online: !!data?.online,
      playersOnline: typeof data?.players?.online === 'number' ? data.players.online : null,
      playersMax: typeof data?.players?.max === 'number' ? data.players.max : null,
      version: data?.version?.name_clean || data?.version?.name || null
    }
  } catch (e) {
    return { online: false, error: String(e && e.message ? e.message : e) }
  }
}

async function getMinecraftServerStatusCached(ip, { ttlSeconds = 20 } = {}) {
  const value = typeof ip === 'string' ? ip.trim() : ''
  if (!value) return null

  const now = Date.now()
  const mem = memoryServerStatusCache.get(value)
  if (mem && typeof mem.expiresAt === 'number' && mem.expiresAt > now && mem.data) {
    return mem.data
  }

  const cacheKey = `starhub:serverStatus:${value}`
  const cached = await upstashGet(cacheKey).catch(() => null)
  if (typeof cached === 'string' && cached) {
    try {
      const parsed = JSON.parse(cached)
      if (parsed && typeof parsed === 'object') {
        memoryServerStatusCache.set(value, { data: parsed, expiresAt: now + ttlSeconds * 1000 })
        return parsed
      }
    } catch (e) {}
  }

  const status = await getMinecraftServerStatus(value)
  const wrapped = {
    ...(status || { online: false }),
    checkedAt: Date.now()
  }
  await upstashSet(cacheKey, JSON.stringify(wrapped), ttlSeconds).catch(() => null)
  memoryServerStatusCache.set(value, { data: wrapped, expiresAt: Date.now() + ttlSeconds * 1000 })
  return wrapped
}

async function mapLimit(items, limit, mapper) {
  const arr = Array.isArray(items) ? items : []
  const concurrency = Math.max(1, Math.floor(limit || 1))
  const results = new Array(arr.length)
  let idx = 0

  const worker = async () => {
    while (true) {
      const i = idx
      idx += 1
      if (i >= arr.length) return
      results[i] = await mapper(arr[i], i)
    }
  }

  const workers = new Array(Math.min(concurrency, arr.length)).fill(0).map(() => worker())
  await Promise.all(workers)
  return results
}

module.exports = {
  DEFAULT_NPOINT_INSTANCES_URL,
  boolFromEnv,
  json,
  allowCors,
  readJsonBody,
  loadInstances,
  resolveDataPath,
  safeReadJsonFile,
  normalizeRelPath,
  shouldIgnore,
  matchGlob,
  getOnlineUsers,
  bumpOnline,
  getStarhubSettings,
  upsertStarhubSettings,
  getMinecraftServerStatus,
  getMinecraftServerStatusCached,
  mapLimit
}
