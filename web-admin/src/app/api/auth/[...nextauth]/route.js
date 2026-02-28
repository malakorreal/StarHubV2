
import NextAuth from "next-auth"
import DiscordProvider from "next-auth/providers/discord"

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        const discordId = String(account?.providerAccountId || profile?.id || user?.id || "")
        const allowedIdsEnv = (process.env.ALLOWED_USER_IDS || "").split(",").map(v => v.trim()).filter(Boolean).map(String)
        if (allowedIdsEnv.length > 0 && allowedIdsEnv.includes(discordId)) return true
        const npointUrl = process.env.NPOINT_AUTH_URL || 'https://api.npoint.io/6d71db871d844b9ec40f'
        const authRes = await fetch(npointUrl, { cache: 'no-store' })
        if (!authRes.ok) return false
        const authData = await authRes.json()
        let allowedIds = []
        if (Array.isArray(authData)) {
          allowedIds = authData.map(v => String(v))
        } else {
          const keys = ['admins', 'allowed_users', 'users', 'ids']
          for (const k of keys) {
            if (Array.isArray(authData?.[k])) {
              allowedIds = authData[k].map(v => String(v))
              break
            }
          }
        }
        if (allowedIds.includes(discordId)) return true
        return false
      } catch (_) {
        return false
      }
    },
    async session({ session, token, user }) {
      session.user.id = token.sub
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error', 
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
