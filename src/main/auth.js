import { Auth } from 'msmc'
import { getStore } from './store'
import { setActivity } from './rpc'
import icon from '../../resources/icon.ico?asset'

export function setupAuth(ipcMain, mainWindow) {
  const store = getStore()

  ipcMain.handle('login', async () => {
    try {
        const authManager = new Auth("select_account")
        const xboxManager = await authManager.launch("electron", {
            icon: icon,
            title: "StarHub Login",
            width: 600,
            height: 700,
            autoHideMenuBar: true,
            resizable: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        })
        const token = await xboxManager.getMinecraft()
        
        // Save the MCLC object directly because it's JSON serializable
        const mclcToken = token.mclc()
        store.set('auth', mclcToken)
        
        // Update RPC with new user info
        setActivity('Browsing StarHub', 'In Launcher')
        
        return { 
            success: true, 
            profile: { name: mclcToken.name, id: mclcToken.uuid }, 
            access_token: mclcToken 
        }
    } catch (err) {
        console.error("Login Error:", err)
        return { success: false, error: { message: err.message || String(err) } }
    }
  })

  ipcMain.handle('refresh-token', async () => {
    const savedAuth = store.get('auth')
    if (!savedAuth) return { success: false, error: { message: 'No token found' } }

    try {
        // Since we saved the mclc() object, we can just use it.
        // In a real production app, we should check expiry.
        // But for now, we assume it's valid or the game will fail to launch (and user can re-login).
        
        // Update RPC with existing user info
        setActivity('Browsing StarHub', 'In Launcher')

        return { 
            success: true, 
            profile: { name: savedAuth.name, id: savedAuth.uuid }, 
            access_token: savedAuth 
        }

    } catch (e) {
        console.error("Refresh Error:", e)
        return { success: false, error: { message: e.message } }
    }
  })

  ipcMain.handle('logout', () => {
    store.delete('auth')
    // Update RPC to remove user info
    setActivity('Browsing StarHub', 'In Launcher')
    return { success: true }
  })
}
