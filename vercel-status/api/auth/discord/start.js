const { json, allowCors, issueOauthState, getBaseUrl, setCookie } = require('../../_utils')

module.exports = async (req, res) => {
  if (allowCors(req, res)) return
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'Method Not Allowed' })

  const clientId = typeof process.env.DISCORD_CLIENT_ID === 'string' ? process.env.DISCORD_CLIENT_ID.trim() : ''
  if (!clientId) return json(res, 500, { ok: false, error: 'DISCORD_CLIENT_ID is not configured' })

  const baseUrl = getBaseUrl(req)
  const redirectUri = (typeof process.env.DISCORD_REDIRECT_URI === 'string' && process.env.DISCORD_REDIRECT_URI.trim())
    ? process.env.DISCORD_REDIRECT_URI.trim()
    : `${baseUrl}/api/auth/discord/callback`

  const url = new URL(req.url, baseUrl || 'https://example.invalid')
  const nextRaw = String(url.searchParams.get('next') || '').trim().toLowerCase()
  const next = nextRaw === 'announcements' ? 'announcements' : 'dashboard'
  const proto = req && req.headers ? req.headers['x-forwarded-proto'] : null
  const secure = typeof proto === 'string' ? proto.toLowerCase().includes('https') : false
  setCookie(res, 'starhub_oauth_next', next, { path: '/', httpOnly: true, secure, sameSite: 'Lax', maxAgeSeconds: 10 * 60 })

  const state = issueOauthState(res, req)
  if (!state) return json(res, 500, { ok: false, error: 'Failed to issue OAuth state' })

  const authUrl = new URL('https://discord.com/oauth2/authorize')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'identify')
  authUrl.searchParams.set('state', state)

  res.statusCode = 302
  res.setHeader('Location', authUrl.toString())
  res.end('')
}
