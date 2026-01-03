import axios from 'axios'

export function setupStatus(ipcMain) {
  ipcMain.handle('get-server-status', async (event, ip) => {
    if (!ip) return { online: false, error: 'No IP provided' }
    
    try {
      // Use mcstatus.io API (free, reliable)
      const response = await axios.get(`https://api.mcstatus.io/v2/status/java/${ip}`)
      
      if (response.data) {
        return {
            online: response.data.online,
            players: response.data.players ? {
                online: response.data.players.online,
                max: response.data.players.max
            } : { online: 0, max: 0 },
            motd: response.data.motd ? response.data.motd.clean : '',
            icon: response.data.icon,
            version: response.data.version ? response.data.version.name_clean : ''
        }
      }
      return { online: false }
    } catch (error) {
      console.error(`Status Check Error (${ip}):`, error.message)
      return { online: false, error: error.message }
    }
  })
}
