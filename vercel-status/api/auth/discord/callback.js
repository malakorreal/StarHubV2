const { json, allowCors, setCookie, consumeOauthState, getBaseUrl, getAllowedDiscordIds, issueAdminSession, clearAdminSession } = require('../../_utils')

async function exchangeCodeForToken({ clientId, clientSecret, redirectUri, code }) {
  const body = new URLSearchParams()
  body.set('client_id', clientId)
  body.set('client_secret', clientSecret)
  body.set('grant_type', 'authorization_code')
  body.set('code', code)
  body.set('redirect_uri', redirectUri)

  const res = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  })
  const text = await res.text().catch(() => '')
  let data = null
  try { data = text ? JSON.parse(text) : null } catch {}
  if (!res.ok) {
    const msg = data && data.error_description ? data.error_description : `HTTP ${res.status}`
    throw new Error(`Discord token exchange failed: ${msg}`)
  }
  return data
}

async function fetchDiscordMe(accessToken) {
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  const text = await res.text().catch(() => '')
  let data = null
  try { data = text ? JSON.parse(text) : null } catch {}
  if (!res.ok) throw new Error(`Discord /users/@me failed: HTTP ${res.status}`)
  return data
}

module.exports = async (req, res) => {
  if (allowCors(req, res)) return
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'Method Not Allowed' })

  const clientId = typeof process.env.DISCORD_CLIENT_ID === 'string' ? process.env.DISCORD_CLIENT_ID.trim() : ''
  const clientSecret = typeof process.env.DISCORD_CLIENT_SECRET === 'string' ? process.env.DISCORD_CLIENT_SECRET.trim() : ''
  if (!clientId) return json(res, 500, { ok: false, error: 'DISCORD_CLIENT_ID is not configured' })
  if (!clientSecret) return json(res, 500, { ok: false, error: 'DISCORD_CLIENT_SECRET is not configured' })

  const baseUrl = getBaseUrl(req)
  const redirectUri = (typeof process.env.DISCORD_REDIRECT_URI === 'string' && process.env.DISCORD_REDIRECT_URI.trim())
    ? process.env.DISCORD_REDIRECT_URI.trim()
    : `${baseUrl}/api/auth/discord/callback`

  const url = new URL(req.url, baseUrl || 'https://example.invalid')
  const code = url.searchParams.get('code') || ''
  const state = url.searchParams.get('state') || ''

  const proto = req && req.headers ? req.headers['x-forwarded-proto'] : null
  const secure = typeof proto === 'string' ? proto.toLowerCase().includes('https') : false
  setCookie(res, 'starhub_oauth_state', '', { path: '/', httpOnly: true, secure, sameSite: 'Lax', maxAgeSeconds: 0 })

  if (!code) return json(res, 400, { ok: false, error: 'Missing code' })
  if (!state) return json(res, 400, { ok: false, error: 'Missing state' })
  if (!consumeOauthState(req, state)) return json(res, 401, { ok: false, error: 'Invalid state' })

  try {
    const token = await exchangeCodeForToken({ clientId, clientSecret, redirectUri, code })
    const accessToken = typeof token?.access_token === 'string' ? token.access_token : ''
    if (!accessToken) throw new Error('Missing access_token')

    const me = await fetchDiscordMe(accessToken)
    const discordId = me && typeof me.id === 'string' ? me.id.trim() : ''
    if (!discordId) throw new Error('Missing Discord user id')

    const allowed = await getAllowedDiscordIds()
    if (!allowed || !allowed.has(discordId)) {
      await clearAdminSession(res, req)
      res.statusCode = 302
      res.setHeader('Location', '/#announcements?auth=denied')
      res.end('')
      return
    }

    await issueAdminSession(res, req, discordId)
    res.statusCode = 302
    res.setHeader('Location', '/#announcements?auth=ok')
    res.end('')
  } catch (e) {
    await clearAdminSession(res, req)
    res.statusCode = 302
    res.setHeader('Location', `/#announcements?auth=error&msg=${encodeURIComponent(String(e && e.message ? e.message : e))}`)
    res.end('')
  }
}
