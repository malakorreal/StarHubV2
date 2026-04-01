import axios from 'axios'
import { getStore } from './store'

const JSON_URL = 'https://api.npoint.io/e941143771dfcea29992' // Primary API URL

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
    // Use npoint.io as primary source as requested
    const response = await axios.get(JSON_URL + '?t=' + Date.now())
    let data = response.data

    if (typeof data === 'string') {
      // Remove comments if any
      data = data.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").trim()
    }

    let instances = []
    if (typeof data === 'object') {
        instances = Array.isArray(data) ? data : [data]
    } else {
        try {
             instances = JSON.parse(data)
        } catch (e) {
            console.error("JSON Parse error, attempting fix...")
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
         
         inst.modpackUrl = clean(inst.modpackUrl) || clean(inst.fileUrl) || clean(inst.modpack_url)
         inst.loader = clean(inst.loader) || clean(inst.modLoader) || clean(inst.mod_loader) || clean(inst.loader_type) || clean(inst.loaderType)
         if (inst.loader) inst.loader = String(inst.loader).toLowerCase()
         inst.forgeVersion = clean(inst.forgeVersion) || clean(inst.forge_version)
         inst.customVersionId = clean(inst.customVersionId) || clean(inst.custom_version_id) || clean(inst.custom_version)
         inst.loaderVersion = clean(inst.loaderVersion) || clean(inst.loader_version)
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
