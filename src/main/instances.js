import axios from 'axios'
import { getStore } from './store'

const JSON_URL = 'https://api.npoint.io/e941143771dfcea29992'

export async function getInstances(mainWindow = null, force = false) {
  const store = getStore()
  const CACHE_KEY = 'cached_instances'
  const cached = store.get(CACHE_KEY)

  if (force) {
    return await fetchAndCache(CACHE_KEY)
  }

  // Return cached immediately if available
  if (cached && !force) {
    // If we have a window, trigger background update
    if (mainWindow) {
        fetchAndNotify(mainWindow, CACHE_KEY)
    }
    return cached
  }

  return await fetchAndCache(CACHE_KEY)
}

async function fetchAndNotify(mainWindow, cacheKey) {
    try {
        const data = await fetchAndCache(cacheKey)
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('instances-updated', data)
        }
    } catch (e) {
        console.error("Background update failed", e)
    }
}

async function fetchAndCache(cacheKey) {
  try {
    const response = await axios.get(JSON_URL + '?t=' + Date.now()) // Anti-cache
    let data = response.data

    if (typeof data === 'string') {
      // Remove comments if any (JSON doesn't support comments but sometimes people add them in Gists)
      data = data.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").trim()
    }

    // Handle potential malformed JSON (like missing brackets if user edited raw)
    // But usually Gist raw is fine. 
    // If response.data is already an object/array, axios parsed it.
    
    let instances = []
    if (typeof data === 'object') {
        instances = Array.isArray(data) ? data : [data]
    } else {
        try {
             instances = JSON.parse(data)
        } catch (e) {
            console.error("JSON Parse error, attempting fix...")
            // Try to wrap in brackets if it's a list of objects without []
            if (data.trim().startsWith('{') && data.trim().endsWith('}')) {
                 const fixed = `[${data}]`
                 instances = JSON.parse(fixed)
            } else {
                throw e
            }
        }
    }
    
    if (!Array.isArray(instances)) {
        instances = [instances]
    }

    // Process instances
    instances = instances.map(inst => {
         // Clean strings
         const clean = (s) => s ? s.replace(/`/g, '').trim() : ""
         
         inst.modpackUrl = clean(inst.modpackUrl) || clean(inst.fileUrl)
         inst.id = inst.id || (inst.name ? inst.name.toLowerCase().replace(/\s+/g, '-') : 'unknown')
         
         return inst
    })

    const store = getStore()
    store.set(cacheKey, instances)
    return instances

  } catch (error) {
    console.error('Failed to fetch instances:', error)
    const store = getStore()
    return store.get(cacheKey, [])
  }
}
