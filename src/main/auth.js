import { Auth } from 'msmc'
import { getStore } from './store'
import { setActivity } from './rpc'
import icon from '../../resources/icon.ico?asset'
import axios from 'axios'
import { syncUserToDb, checkUserBanStatus } from './supabase'

function toErrorMessage(err) {
    if (!err) return 'Unknown error'
    if (typeof err === 'string') return err
    if (err instanceof Error && typeof err.message === 'string' && err.message) return err.message
    const axiosMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.statusText
    if (typeof axiosMsg === 'string' && axiosMsg) return axiosMsg
    if (typeof err?.message === 'string' && err.message) return err.message
    if (typeof err?.error === 'string' && err.error) return err.error
    try { return JSON.stringify(err) } catch { return String(err) }
}

function classifyAuthError(err) {
    const msg = toErrorMessage(err)
    const lower = msg.toLowerCase()
    const status = err?.response?.status
    const code = err?.code

    if (lower.includes('user does not own minecraft') || lower.includes('user does not own the game')) {
        return { code: 'NO_MINECRAFT', message: 'NO_MINECRAFT' }
    }

    if (code === 'ERR_CANCELED' || lower.includes('cancel') || lower.includes('aborted') || lower.includes('closed') || lower.includes('window closed')) {
        return { code: 'LOGIN_CANCELLED', message: 'LOGIN_CANCELLED' }
    }

    if (status === 429 || lower.includes('too many requests') || lower.includes('rate limit') || lower.includes('too many')) {
        return { code: 'LOGIN_RATE_LIMITED', message: 'LOGIN_RATE_LIMITED' }
    }

    if (lower.includes('aadsts50076') || lower.includes('aadsts50079')) {
        return { code: 'LOGIN_MFA_REQUIRED', message: 'LOGIN_MFA_REQUIRED' }
    }
    if (lower.includes('aadsts50126')) {
        return { code: 'LOGIN_INVALID_CREDENTIALS', message: 'LOGIN_INVALID_CREDENTIALS' }
    }
    if (lower.includes('aadsts50034')) {
        return { code: 'LOGIN_ACCOUNT_NOT_FOUND', message: 'LOGIN_ACCOUNT_NOT_FOUND' }
    }

    if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT' || lower.includes('timeout') || lower.includes('timed out')) {
        return { code: 'LOGIN_TIMEOUT', message: 'LOGIN_TIMEOUT' }
    }

    if (code === 'ENOTFOUND' || code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'EAI_AGAIN' || lower.includes('network error') || lower.includes('getaddrinfo') || lower.includes('certificate') || lower.includes('dns')) {
        return { code: 'LOGIN_NETWORK_ERROR', message: 'LOGIN_NETWORK_ERROR' }
    }

    if ((typeof status === 'number' && status >= 500) || lower.includes('service unavailable') || lower.includes('bad gateway') || lower.includes('gateway timeout')) {
        return { code: 'LOGIN_SERVICE_UNAVAILABLE', message: 'LOGIN_SERVICE_UNAVAILABLE' }
    }

    return { code: 'LOGIN_FAILED', message: msg }
}

async function validateSession(accessToken) {
    try {
        const response = await axios.get('https://api.minecraftservices.com/entitlements/mcstore', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            timeout: 15000
        });
        
        // Check if user has Minecraft entitlements
        const items = response.data.items || [];
        const hasMinecraft = items.some(i => i.name === 'product_minecraft' || i.name === 'game_minecraft');
        
        if (!hasMinecraft) {
            return { valid: false, error: 'NO_MINECRAFT' };
        }
        
        return { valid: true };
    } catch (error) {
        const classified = classifyAuthError(error)
        return { valid: false, error: classified.message };
    }
}

// Helper to save/update account
function saveAccount(store, mclcToken, msmcToken) {
    const accounts = store.get('accounts', [])
    const uuid = mclcToken.uuid
    
    // Find existing
    const index = accounts.findIndex(a => a.uuid === uuid)
    
    const newAccount = {
        uuid: uuid,
        name: mclcToken.name,
        mclc: mclcToken,
        msmc: msmcToken,
        lastUsed: Date.now()
    }
    
    if (index >= 0) {
        accounts[index] = newAccount
    } else {
        accounts.push(newAccount)
    }
    
    store.set('accounts', accounts)
    store.set('selectedAccountId', uuid)
    
    // Sync Legacy 'auth' for compatibility
    store.set('auth', mclcToken)
    try {
        store.set('msmc_raw', msmcToken)
    } catch (e) {}
    
    return newAccount
}

export function setupAuth(ipcMain, mainWindow) {
  const store = getStore()

  // Migration: If we have 'auth' but no 'accounts', migrate
  const savedAuth = store.get('auth')
  const accounts = store.get('accounts', [])
  if (savedAuth && accounts.length === 0) {
      console.log("Migrating single account to multi-account storage...")
      const msmcRaw = store.get('msmc_raw')
      saveAccount(store, savedAuth, msmcRaw)
  }

  ipcMain.handle('login', async () => {
    try {
        const authManager = new Auth("select_account")
        const xboxManager = await authManager.launch("electron", {
            icon: icon,
            title: "StarHub",
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
        
        // Save to Accounts list
        saveAccount(store, mclcToken, token)

        // 🟢 SYNC TO SUPABASE & CHECK BAN
        console.log(`[AUTH] Syncing user ${mclcToken.name} to database...`)
        try {
            const dbUsers = await syncUserToDb({ uuid: mclcToken.uuid, name: mclcToken.name })
            console.log(`[AUTH] Sync result:`, dbUsers ? 'SUCCESS' : 'FAILED')
            const dbUser = Array.isArray(dbUsers) ? dbUsers[0] : null
            
            const isBanned = await checkUserBanStatus(mclcToken.uuid)
            if (isBanned) {
                console.error(`[AUTH] User ${mclcToken.name} is BANNED.`)
                return { success: false, error: { message: 'USER_BANNED' } }
            }
            
            // Update RPC with new user info
            setActivity('Browsing StarHub', 'In Launcher')
            
            return { 
                success: true, 
                profile: { 
                    name: mclcToken.name, 
                    id: mclcToken.uuid,
                    account_type: dbUser?.account_type || 'normal'
                }, 
                access_token: mclcToken 
            }
        } catch (dbErr) {
            console.error(`[AUTH] Database sync error:`, dbErr)
            // Still allow login even if DB fails, but log it
            return { 
                success: true, 
                profile: { 
                    name: mclcToken.name, 
                    id: mclcToken.uuid,
                    account_type: 'normal'
                }, 
                access_token: mclcToken 
            }
        }
    } catch (err) {
        console.error("Login Error:", err)
        const classified = classifyAuthError(err)
        return { success: false, error: { code: classified.code, message: classified.message } }
    }
  })

  ipcMain.handle('refresh-token', async () => {
    const selectedId = store.get('selectedAccountId')
    let currentAccount = null
    
    // Try to find by ID
    const accounts = store.get('accounts', [])
    if (selectedId) {
        currentAccount = accounts.find(a => a.uuid === selectedId)
    }
    
    // Fallback to legacy 'auth' if not found in accounts
    if (!currentAccount) {
        const legacyAuth = store.get('auth')
        const legacyMsmc = store.get('msmc_raw')
        if (legacyAuth) {
            currentAccount = {
                uuid: legacyAuth.uuid,
                name: legacyAuth.name,
                mclc: legacyAuth.access_token || legacyAuth, // Handle structure variations
                msmc: legacyMsmc
            }
        }
    }
    
    if (!currentAccount || !currentAccount.mclc) {
        return { success: false, error: { message: 'No token found' } }
    }

    try {
        const mclcToken = currentAccount.mclc
        const accessToken = mclcToken.access_token || mclcToken.accessToken // mclc format varies

        // 1. Validate the current session against Mojang API
        console.log(`Validating session for ${currentAccount.name}...`)
        const validation = await validateSession(accessToken)

        if (validation.valid) {
            console.log("Session is valid.")
            
            // 🟢 SYNC TO SUPABASE & CHECK BAN ON REFRESH
            console.log(`[AUTH] Syncing user ${currentAccount.name} to database (session check)...`)
            try {
                const dbUsers = await syncUserToDb({ uuid: currentAccount.uuid, name: currentAccount.name })
                console.log(`[AUTH] Refresh sync result:`, dbUsers ? 'SUCCESS' : 'FAILED')
                const dbUser = Array.isArray(dbUsers) ? dbUsers[0] : null
                
                const isBanned = await checkUserBanStatus(currentAccount.uuid)
                if (isBanned) {
                    console.error(`[AUTH] User ${currentAccount.name} is BANNED.`)
                    return { success: false, error: { message: 'USER_BANNED' } }
                }

                setActivity('Browsing StarHub', 'In Launcher')
                return { 
                    success: true, 
                    profile: { 
                        name: currentAccount.name, 
                        id: currentAccount.uuid,
                        account_type: dbUser?.account_type || 'normal'
                    }, 
                    access_token: mclcToken 
                }
            } catch (dbErr) {
                console.error(`[AUTH] Refresh DB sync error:`, dbErr)
                return { 
                    success: true, 
                    profile: { 
                        name: currentAccount.name, 
                        id: currentAccount.uuid,
                        account_type: 'normal'
                    }, 
                    access_token: mclcToken 
                }
            }
        }
        
        if (validation.error === 'NO_MINECRAFT') {
            console.warn("User does not own Minecraft.")
            return { success: false, error: { message: 'NO_MINECRAFT' } }
        }

        console.warn("Session expired. Attempting auto-refresh...")
        
        // 2. Auto-Refresh Logic
        if (currentAccount.msmc) {
            try {
                const authManager = new Auth("select_account")
                // Refresh using the saved MSMC object
                const newToken = await authManager.refresh(currentAccount.msmc)
                
                const newMclc = newToken.mclc()
                
                console.log("Auto-refresh successful!")
                
                // Update Storage
                saveAccount(store, newMclc, newToken)
                
                setActivity('Browsing StarHub', 'In Launcher')
                return { 
                    success: true, 
                    profile: { name: newMclc.name, id: newMclc.uuid }, 
                    access_token: newMclc 
                }
            } catch (refreshErr) {
                console.error("Auto-refresh failed:", refreshErr)
                const classified = classifyAuthError(refreshErr)
                return { success: false, error: { code: classified.code, message: classified.message } }
            }
        } else {
            console.warn("No MSMC token available for refresh.")
        }

        return { success: false, error: { code: 'SESSION_EXPIRED', message: 'SESSION_EXPIRED' } }

    } catch (e) {
        console.error("Refresh/Validation Error:", e)
        const classified = classifyAuthError(e)
        return { success: false, error: { code: classified.code, message: classified.message } }
    }
  })

  ipcMain.handle('logout', () => {
    // Just remove the current session from active, but maybe keep in accounts?
    // User requested "Change Account", so logout usually implies "Sign out of this account"
    // We will remove the current active account from storage
    
    const selectedId = store.get('selectedAccountId')
    let accounts = store.get('accounts', [])
    
    if (selectedId) {
        accounts = accounts.filter(a => a.uuid !== selectedId)
        store.set('accounts', accounts)
    }
    
    // Clear legacy
    store.delete('auth')
    store.delete('msmc_raw')
    store.delete('selectedAccountId')
    
    // If there are other accounts, maybe we don't select one automatically to force "Login or Select" UI?
    // But for now, complete logout.
    
    setActivity('Browsing StarHub', 'In Launcher')
    return { success: true }
  })
  
  // New Handlers for Multi-Account
  
  ipcMain.handle('get-accounts', () => {
      let accounts = store.get('accounts', [])
      let selectedId = store.get('selectedAccountId')
      
      // Self-healing: If no accounts but we have legacy auth, add it
      if (accounts.length === 0) {
          const legacyAuth = store.get('auth')
          if (legacyAuth) {
             const msmcRaw = store.get('msmc_raw')
             console.log("[Auth] Self-healing: Migrating legacy account to accounts list...")
             const newAcc = saveAccount(store, legacyAuth, msmcRaw)
             accounts = [newAcc]
             // Ensure selectedId is set
             if (!selectedId) {
                 selectedId = newAcc.uuid
                 store.set('selectedAccountId', selectedId)
             }
          }
      }

      // Return safe info only
      return accounts.map(a => ({
          uuid: a.uuid,
          name: a.name,
          active: a.uuid === selectedId,
          lastUsed: a.lastUsed || 0
      }))
  })
  
  ipcMain.handle('switch-account', (event, uuid) => {
      const accounts = store.get('accounts', [])
      const idx = accounts.findIndex(a => a.uuid === uuid)
      const target = idx >= 0 ? accounts[idx] : null
      
      if (target) {
          const updated = { ...target, lastUsed: Date.now() }
          accounts[idx] = updated
          store.set('accounts', accounts)
          store.set('selectedAccountId', uuid)
          store.set('auth', updated.mclc)
          try {
             store.set('msmc_raw', updated.msmc)
          } catch(e) {}
          
          return { success: true, profile: { name: updated.name, id: updated.uuid }, lastUsed: updated.lastUsed }
      }
      return { success: false, error: 'Account not found' }
  })
  
  ipcMain.handle('remove-account', (event, uuid) => {
      let accounts = store.get('accounts', [])
      accounts = accounts.filter(a => a.uuid !== uuid)
      store.set('accounts', accounts)
      
      const selectedId = store.get('selectedAccountId')
      const legacyAuth = store.get('auth')
      
      let isRemovedActive = false

      if (selectedId === uuid) {
          isRemovedActive = true
      } else if (!selectedId && legacyAuth && (legacyAuth.uuid === uuid || legacyAuth.id === uuid)) {
          // Legacy auth matches removal target
          isRemovedActive = true
      }

      if (isRemovedActive) {
          store.delete('selectedAccountId')
          store.delete('auth')
          store.delete('msmc_raw')
          // Try to select another one
          if (accounts.length > 0) {
              const next = accounts[0]
              store.set('selectedAccountId', next.uuid)
              store.set('auth', next.mclc)
              try {
                  store.set('msmc_raw', next.msmc)
              } catch(e) {}
          }
      }
      
      return { success: true }
  })
}
