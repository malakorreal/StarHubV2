const fs = require('fs')
const path = require('path')

const DEFAULT_NPOINT_INSTANCES_URL = 'https://api.npoint.io/e941143771dfcea29992'
const memoryServerStatusCache = new Map()

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
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
  const now = Date.now()
  const ttlMs = 5 * 60 * 1000
  const key = 'starhub:online'
  await upstashCommand(`/zadd/${encodeURIComponent(key)}/${now}/${encodeURIComponent(deviceId)}`)
  await upstashCommand(`/zremrangebyscore/${encodeURIComponent(key)}/-inf/${now - ttlMs}`)
  const count = await upstashCommand(`/zcard/${encodeURIComponent(key)}`)
  return typeof count === 'number' ? count : (typeof count === 'string' ? Number(count) : null)
}

async function getOnlineUsers() {
  const cfg = getUpstash()
  if (!cfg) return null
  const now = Date.now()
  const ttlMs = 5 * 60 * 1000
  const key = 'starhub:online'
  await upstashCommand(`/zremrangebyscore/${encodeURIComponent(key)}/-inf/${now - ttlMs}`)
  const count = await upstashCommand(`/zcard/${encodeURIComponent(key)}`)
  return typeof count === 'number' ? count : (typeof count === 'string' ? Number(count) : null)
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
  getMinecraftServerStatus,
  getMinecraftServerStatusCached,
  mapLimit
}
