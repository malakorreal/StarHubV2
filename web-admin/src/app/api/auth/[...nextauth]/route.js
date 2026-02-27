
import NextAuth from "next-auth"
import DiscordProvider from "next-auth/providers/discord"

const allowedUserIds = (process.env.ALLOWED_USER_IDS || "").split(",").map(id => id.trim())

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (allowedUserIds.length > 0 && !allowedUserIds.includes(user.id)) {
        return false // Deny access
      }
      return true
    },
    async session({ session, token, user }) {
      session.user.id = token.sub
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error', // Error code passed in query string as ?error=
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
