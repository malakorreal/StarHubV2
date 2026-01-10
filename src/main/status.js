import axios from 'axios'
import { status } from 'minecraft-server-util'

export function setupStatus(ipcMain) {
  ipcMain.handle('get-server-status', async (event, ip) => {
    if (!ip) return { online: false, error: 'No IP provided' }
    
    // Split IP and Port
    let [host, port] = ip.split(':')
    port = port ? parseInt(port) : 25565

    try {
      // 1. Try Direct Connection (Faster + Ping)
      const result = await status(host, port, {
          timeout: 2000, // Fast timeout
          enableSRV: true
      })

      return {
          online: true,
          players: {
              online: result.players.online,
              max: result.players.max
          },
          motd: result.motd.clean,
          icon: result.favicon,
          version: result.version.name,
          ping: result.roundTripLatency // Real user ping
      }

    } catch (directError) {
        console.warn(`Direct status check failed for ${ip}, falling back to API:`, directError.message)
        
        // 2. Fallback to mcstatus.io API
        try {
            const response = await axios.get(`https://api.mcstatus.io/v2/status/java/${ip}`)
            
            if (response.data && response.data.online) {
                return {
                    online: true,
                    players: {
                        online: response.data.players.online,
                        max: response.data.players.max
                    },
                    motd: response.data.motd ? response.data.motd.clean : '',
                    icon: response.data.icon,
                    version: response.data.version ? response.data.version.name_clean : '',
                    ping: null // API doesn't provide user ping
                }
            }
            return { online: false }
        } catch (apiError) {
            console.error(`Status Check Error (${ip}):`, apiError.message)
            return { online: false, error: apiError.message }
        }
    }
  })
}
