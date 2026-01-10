import axios from 'axios'
import { getStore } from './store'

// ----------------------------------------------------------------------
// 🔧 CONFIGURATION: Link to your online JSON file
// ----------------------------------------------------------------------
const INSTANCES_URL = 'https://api.npoint.io/e941143771dfcea29992' 

export async function getInstances(mainWindow = null, force = false) {
  const store = getStore()
  // Use a new cache key to invalidate old/ghost data
  const CACHE_KEY = 'cached_instances_v2'
  const cached = store.get(CACHE_KEY, [])

  if (force) {
    console.log("Forcing instance refresh...")
    return await fetchAndCache(CACHE_KEY)
  }

  // If we have cached instances, return them immediately for speed,
  // but trigger a background refresh to keep data up-to-date.
  if (mainWindow) {
    fetchAndNotify(mainWindow, CACHE_KEY) // Background refresh
    if (cached && cached.length > 0) {
      console.log("Returning cached instances immediately.")
      return cached
    }
  }

  // If no cache or no window (headless mode), fetch and wait
  return await fetchAndCache(CACHE_KEY)
}

async function fetchAndNotify(mainWindow, cacheKey) {
    console.log("Background fetching instances...")
    try {
        const data = await fetchAndCache(cacheKey)
        if (mainWindow && !mainWindow.isDestroyed()) {
            console.log("Sending updated instances to UI")
            mainWindow.webContents.send('instances-updated', data)
        }
    } catch (err) {
        console.error("Background fetch failed:", err.message)
    }
}

async function fetchAndCache(cacheKey = 'cached_instances_v2') {
  try {
    // Add timestamp to bypass GitHub Gist caching (5 mins default)
    const urlWithTs = `${INSTANCES_URL}?t=${Date.now()}`
    console.log(`Fetching instances from: ${urlWithTs}`)
    
    // Add headers to prevent caching
    const response = await axios.get(urlWithTs, {
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        },
        timeout: 10000 // 10 seconds timeout
    })
    
    let instances = []
    
    // Attempt to parse/fix data if it's a string (common with raw Gist text/plain)
    let rawData = response.data
    
    if (typeof rawData === 'string') {
        // FAST PATH: Try parsing directly first
        try {
            const parsed = JSON.parse(rawData)
            if (Array.isArray(parsed)) {
                instances = parsed
                rawData = null 
            } else if (typeof parsed === 'object') {
                instances = [parsed]
                rawData = null
            }
        } catch (quickParseErr) {
            // Failed, proceed to cleanup
        }

        if (rawData !== null) {
            rawData = rawData.trim()
            
            // PROTECT URLs from comment stripping
            rawData = rawData.replace(/:\/\//g, '___COLON_SLASH_SLASH___')

            // Remove comments (// and /* */)
            rawData = rawData.replace(/\/\/.*$/gm, "")
            rawData = rawData.replace(/\/\*[\s\S]*?\*\//g, "")

            // RESTORE URLs
            rawData = rawData.replace(/___COLON_SLASH_SLASH___/g, '://')
            
            // Remove whitespace again after comment removal
            rawData = rawData.trim()

            // Fix: Wrap in array if it looks like multiple objects separated by comma but no brackets
            if (rawData.startsWith('{') && rawData.endsWith('}') && /}\s*,\s*{/.test(rawData)) {
                  rawData = `[${rawData}]`
            }
            // Case 2: {...}, {...}, (trailing comma at end of file)
            else if (rawData.startsWith('{') && rawData.endsWith(',')) {
                  rawData = rawData.replace(/,\s*$/, '')
                  if (/}\s*,\s*{/.test(rawData)) {
                      rawData = `[${rawData}]`
                  }
            }

            // Fix: Replace single quotes with double quotes for keys and values (basic heuristic)
            rawData = rawData.replace(/([{,]\s*)'([a-zA-Z0-9_]+)'\s*:/g, '$1"$2":') // keys
            rawData = rawData.replace(/:\s*'([^']*)'(?=[,}])/g, ': "$1"') // values

            // Fix: Fix unquoted keys { key: "value" } -> { "key": "value" }
            rawData = rawData.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')

            // Fix: Remove trailing commas
            let oldData
            do {
                oldData = rawData
                rawData = rawData.replace(/,(\s*[}\]])/g, '$1')
            } while (oldData !== rawData)

            try {
                const parsed = JSON.parse(rawData)
                if (Array.isArray(parsed)) instances = parsed
                else if (typeof parsed === 'object') instances = [parsed]
            } catch (e) {
                console.log("Failed to auto-fix JSON with JSON.parse:", e.message)
                
                // LAST RESORT: Try to eval if safe-ish
                if (rawData.startsWith('[') || rawData.startsWith('{')) {
                    try {
                        console.log("Attempting to parse via Function constructor...")
                        const looseParsed = new Function(`return ${rawData}`)()
                        if (Array.isArray(looseParsed)) instances = looseParsed
                        else if (typeof looseParsed === 'object') instances = [looseParsed]
                        console.log("Function constructor parse success.")
                    } catch (evalErr) {
                        console.error("Function constructor parse failed:", evalErr.message)
                        console.log("Problematic Raw Data Snippet (First 500 chars):")
                        console.log(rawData.substring(0, 500))
                    }
                }
            }
        }
    } else if (Array.isArray(response.data)) {
        instances = response.data
    } else if (typeof response.data === 'object') {
        instances = [response.data]
    }

    // Post-processing: Map fields and defaults
    instances = instances.map(inst => {
        // Clean up URLs (remove backticks and surrounding whitespace)
        const cleanUrl = (url) => {
            if (!url) return ""
            return url.replace(/[`]/g, '').trim()
        }

        if (inst.modpackUrl) inst.modpackUrl = cleanUrl(inst.modpackUrl)
        if (inst.fileUrl) inst.fileUrl = cleanUrl(inst.fileUrl)
        if (inst.announcementImage) inst.announcementImage = cleanUrl(inst.announcementImage)
        if (inst.backgroundImage) inst.backgroundImage = cleanUrl(inst.backgroundImage)
        if (inst.logo) inst.logo = cleanUrl(inst.logo)
        if (inst.icon) inst.icon = cleanUrl(inst.icon)
        if (inst.discord) inst.discord = cleanUrl(inst.discord)
        
        // Ensure modpackUrl exists (map from fileUrl if needed)
        if (!inst.modpackUrl && inst.fileUrl) {
            inst.modpackUrl = inst.fileUrl
        }
        
        // Ensure ID
        if (!inst.id) {
             inst.id = inst.name ? inst.name.toLowerCase().replace(/\s+/g, '-') : 'unknown-instance'
        }

        // Ensure modpackVersion for update system
        if (!inst.modpackVersion) {
            inst.modpackVersion = "1.0.0" // Default if missing
        }

        return inst
    })
    
    // Filter out invalid instances
    instances = instances.filter(i => i && i.id && i.name)

    if (instances.length > 0) {
        console.log(`Loaded ${instances.length} instances from Gist.`)
        const store = getStore()
        store.set(cacheKey, instances)
        return instances
    } else {
        console.error("No valid instances found from Gist.")
        throw new Error("No valid instances found")
    }

  } catch (error) {
    console.error('Failed to fetch instances:', error.message)
    // Return cached if fetch fails
    const store = getStore()
    return store.get(cacheKey, [])
  }
}
