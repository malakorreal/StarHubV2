import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { ACHIEVEMENTS, getAchievementDetails } from './achievements'

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../../.env') })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.warn('[SUPABASE] Missing credentials in .env file. Database features will be disabled.')
}

export const supabase = (supabaseUrl && supabaseKey) 
    ? createClient(supabaseUrl, supabaseKey) 
    : null

/**
 * Helper to sync user to database
 * Table structure: users (uuid: text primary key, username: text, last_seen: timestamp, is_banned: boolean)
 */
export async function syncUserToDb(profile) {
    if (!supabase || !profile || !profile.uuid) return null

    try {
        const { data, error } = await supabase
            .from('users')
            .upsert({ 
                uuid: profile.uuid, 
                username: profile.name, 
                last_seen: new Date().toISOString(),
                // We don't overwrite is_banned on upsert, it should be managed from dashboard
            }, { onConflict: 'uuid' })
            .select()

        if (error) {
            console.error('[SUPABASE] Sync error:', error.message)
            return null
        }
        return data
    } catch (e) {
        console.error('[SUPABASE] Sync exception:', e.message)
        return null
    }
}

/**
 * Check and grant achievements related to game launch
 */
export async function checkAndGrantLaunchAchievements(uuid) {
    if (!supabase || !uuid) return []

    try {
        // 1. Get current unlocked achievements from users table
        const { data: user, error: userErr } = await supabase
            .from('users')
            .select('unlocked_achievements')
            .eq('uuid', uuid)
            .single()
        
        if (userErr) throw userErr
        
        const unlockedList = Array.isArray(user?.unlocked_achievements) ? user.unlocked_achievements : []
        const toGrant = []
        
        // Check for first launch
        if (!unlockedList.includes('first_launch')) {
            toGrant.push('first_launch')
        }

        // Check for night owl (00:00 - 04:00)
        const now = new Date()
        const hour = now.getHours()
        if (hour >= 0 && hour < 4 && !unlockedList.includes('night_owl')) {
            toGrant.push('night_owl')
        }

        if (toGrant.length > 0) {
            return await grantAchievements(uuid, toGrant)
        }
        return []
    } catch (e) {
        console.error('[SUPABASE] Launch achievement check error:', e.message)
        return []
    }
}

/**
 * Check if user is banned
 */
export async function checkUserBanStatus(uuid) {
    if (!supabase || !uuid) return false

    try {
        const { data, error } = await supabase
            .from('users')
            .select('is_banned')
            .eq('uuid', uuid)
            .single()

        if (error) {
            // If user not found, they are not banned
            if (error.code === 'PGRST116') return false
            console.error('[SUPABASE] Ban check error:', error.message)
            return false
        }

        return !!data?.is_banned
    } catch (e) {
        console.error('[SUPABASE] Ban check exception:', e.message)
        return false
    }
}

/**
 * Get all available achievements from DB
 */
export async function getAllAchievements() {
    if (!supabase) return ACHIEVEMENTS

    try {
        const { data, error } = await supabase
            .from('achievements')
            .select('*')
            .order('id', { ascending: true })

        if (error) {
            console.warn('[SUPABASE] Failed to fetch achievements table, using local fallback:', error.message)
            return ACHIEVEMENTS
        }
        
        // If the query is successful, return the data from DB, even if it's an empty array.
        // The UI is responsible for handling the empty state.
        return data || []
    } catch (e) {
        console.error('[SUPABASE] Fetch achievements exception:', e.message)
        return ACHIEVEMENTS
    }
}

/**
 * Grant an achievement to a user (Single)
 */
export async function grantAchievement(uuid, achievementId) {
    const results = await grantAchievements(uuid, [achievementId])
    return results.length > 0 ? results[0] : false
}

/**
 * Grant multiple achievements to a user at once (Batch)
 */
export async function grantAchievements(uuid, achievementIds) {
    if (!supabase || !uuid || !Array.isArray(achievementIds) || achievementIds.length === 0) return []

    try {
        // 1. Get current unlocked list from users table
        const { data: userData, error: fetchErr } = await supabase
            .from('users')
            .select('unlocked_achievements')
            .eq('uuid', uuid)
            .single()
        
        if (fetchErr) throw fetchErr
        
        const currentList = Array.isArray(userData?.unlocked_achievements) ? userData.unlocked_achievements : []
        const newIds = achievementIds.filter(id => !currentList.includes(id))

        if (newIds.length === 0) return []

        // 2. Update unlocked_achievements list in users table
        const updatedList = Array.from(new Set([...currentList, ...newIds]))
        
        const { error: updateErr } = await supabase
            .from('users')
            .update({ 
                unlocked_achievements: updatedList 
            })
            .eq('uuid', uuid)

        if (updateErr) throw updateErr

        // 3. Return details of newly unlocked achievements
        const all = await getAllAchievements()
        return all.filter(a => newIds.includes(a.id))
    } catch (e) {
        console.error(`[SUPABASE] Failed to grant achievements:`, e.message)
        return []
    }
}

/**
 * Get all unlocked achievements for a user
 */
export async function getUserAchievements(uuid) {
    if (!supabase || !uuid) return []

    try {
        const { data, error } = await supabase
            .from('users')
            .select('unlocked_achievements')
            .eq('uuid', uuid)
            .single()

        if (error) throw error
        
        const unlockedList = Array.isArray(data?.unlocked_achievements) ? data.unlocked_achievements : []
        // Return in format expected by UI (array of objects with achievement_id)
        return unlockedList.map(id => ({ achievement_id: id }))
    } catch (e) {
        console.error('[SUPABASE] Failed to fetch achievements:', e.message)
        return []
    }
}

/**
 * Add playtime and check achievements
 */
export async function addPlaytime(uuid, minutes) {
    if (!supabase || !uuid || minutes <= 0) return null

    try {
        // 1. Get current playtime
        const { data: user, error: getErr } = await supabase
            .from('users')
            .select('playtime_minutes')
            .eq('uuid', uuid)
            .single()

        if (getErr) throw getErr

        const oldTime = user.playtime_minutes || 0
        const newTime = oldTime + minutes

        // 2. Update playtime
        const { error: upErr } = await supabase
            .from('users')
            .update({ playtime_minutes: newTime })
            .eq('uuid', uuid)

        if (upErr) throw upErr

        // 3. Check for playtime achievements
        const toGrant = []
        
        if (oldTime < 60 && newTime >= 60) toGrant.push('playtime_1h')
        if (oldTime < 1440 && newTime >= 1440) toGrant.push('playtime_24h')
        if (oldTime < 6000 && newTime >= 6000) toGrant.push('playtime_100h')

        let unlocked = []
        if (toGrant.length > 0) {
            unlocked = await grantAchievements(uuid, toGrant)
        }

        return { total: newTime, unlocked }
    } catch (e) {
        console.error('[SUPABASE] Playtime update error:', e.message)
        return null
    }
}

