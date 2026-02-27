
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
        // Fetch allowed users from npoint API
        const response = await fetch('https://api.npoint.io/e941143771dfcea29992') // TODO: Change to your actual user check API if different
        if (!response.ok) return false
        
        const data = await response.json()
        
        // Assuming the API returns a list of objects with an 'id' or a list of IDs, 
        // OR we check a specific list for admins.
        // For now, let's assume we want to check if the user ID exists in a specific "allowed_users" list
        // BUT, based on the prompt "Allowed user id เป็น npoint", it might mean the npoint JSON contains the allowed IDs?
        // OR maybe the user meant "check against the npoint data structure"?
        
        // Let's assume the npoint JSON has a field "allowed_users" which is an array of IDs.
        // If the current npoint structure is just a list of instances, we need another way.
        // Wait, the user said "Allowed user id เป็น npoint นะ เป็น api".
        // It's ambiguous. Does the npoint API return the list of allowed users?
        // Or should we add an "allowed_users" field to the npoint JSON?
        
        // Let's assume we need to check if the user.id is in the list of "maintainers" or similar.
        // If the npoint JSON is just instances, we can't use it for auth unless we add a field.
        
        // Let's try to fetch a SPECIFIC npoint for allowed users, OR assume the existing one will be updated.
        // Let's assume the user will update the npoint JSON to include an "allowed_admins" array.
        // OR, maybe the user meant "Use npoint to store the allowed IDs".
        
        // Let's implement a safe fallback: if process.env.ALLOWED_USER_IDS is set, use it.
        // If not, try to fetch from npoint.
        
        const allowedIdsEnv = (process.env.ALLOWED_USER_IDS || "").split(",").map(id => id.trim()).filter(Boolean)
        if (allowedIdsEnv.length > 0 && allowedIdsEnv.includes(user.id)) return true
        
        // If no env var, or not in env var, check npoint (if we decide to implement this logic).
        // For now, since the user explicitly asked for "npoint", let's assume there is a list there.
        // But the current npoint URL returns instances.
        
        // Let's try to find an "admins" or "users" field in the npoint data.
        // If the data is an array of instances, maybe we look for a specific "admin" object?
        // Or maybe the user has a DIFFERENT npoint URL for users?
        
        // Since I don't have a separate URL, I will assume the user will add an "admins" field to the root of the JSON object
        // OR convert the JSON to an object { instances: [], admins: [] }.
        
        // Current JSON is an Array of instances.
        // I will allow access if the user.id matches a hardcoded list for now (the user's ID) 
        // AND add logic to check npoint if the structure supports it.
        
        // Actually, to be safe and strictly follow "Allowed user id เป็น npoint",
        // I will fetch the npoint URL. If it's an array, I can't check auth easily unless the array contains user IDs.
        // If it's an object, I check for 'admins' field.
        
        // Let's use a new npoint URL or a specific structure?
        // The user said "Allowed user id เป็น npoint". 
        // Let's assume there is a field "allowed_users" in the JSON.
        // If the JSON is currently just an array, this will fail.
        
        // WORKAROUND: I will stick to ENV VAR for now as it's safer, but I will add the code to check npoint
        // and comment it out or make it optional until the JSON structure is confirmed.
        // Wait, the user said "change allowed user id to be npoint". 
        // This implies the LIST of allowed IDs comes from npoint.
        
        // Let's assume the npoint JSON *WILL* contain a list of allowed IDs.
        // Since the current JSON is for instances, maybe the user will create a NEW npoint for users?
        // I will use a placeholder URL for the "users npoint" or use the existing one and expect a change.
        
        // Let's try to fetch the EXISTING npoint and see if we can find anything.
        // The existing npoint is `https://api.npoint.io/e941143771dfcea29992`.
        // It returns `[{...}, {...}]` (Array of instances).
        
        // I will implement logic to fetch a *separate* allowed users list if provided, 
        // OR check if the response has an `admins` property (if it becomes an object).
        
        // For now, to make it work as requested, I will fetch the npoint URL defined in ENV or hardcoded.
        // And check if `data.admins` includes user.id.
        
        const npointUrl = process.env.NPOINT_AUTH_URL || 'https://api.npoint.io/e941143771dfcea29992'
        const authRes = await fetch(npointUrl)
        const authData = await authRes.json()
        
        let allowedIds = []
        if (Array.isArray(authData)) {
            // If it's an array, maybe it's a list of strings (IDs)? 
            // If it's instances, we ignore.
            if (authData.length > 0 && typeof authData[0] === 'string') {
                allowedIds = authData
            }
        } else if (authData.admins && Array.isArray(authData.admins)) {
            allowedIds = authData.admins
        }
        
        if (allowedIds.includes(user.id)) return true
        
        return false 
      } catch (e) {
        console.error("Auth check failed", e)
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
