import React, { useEffect, useState, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import MainContent from './components/MainContent'
import Settings from './components/Settings'
import CloseDialog from './components/CloseDialog'
import ErrorDialog from './components/ErrorDialog'
import AboutDialog from './components/AboutDialog'
import NotificationModal from './components/NotificationModal'
import LoginScreen from './components/LoginScreen'
import NoInstancesView from './components/NoInstancesView'
import LaunchConfirmationModal from './components/LaunchConfirmationModal'
import UpdateModal from './components/UpdateModal'
import ConsoleModal from './components/ConsoleModal'
import RepairConfirmationModal from './components/RepairConfirmationModal'
import ToastNotification from './components/ToastNotification'
import { useLanguage } from './contexts/LanguageContext'

// Preload Helper
const preloadImages = (urls) => {
    if (!Array.isArray(urls) || urls.length === 0) return Promise.resolve()
    
    const promises = urls.map(url => {
        return new Promise((resolve) => {
            const img = new Image()
            img.src = url
            img.onload = () => resolve()
            img.onerror = () => {
                console.warn("Failed to preload:", url)
                resolve() // Don't block app on missing image
            }
        })
    })
    
    return Promise.all(promises)
}

function App() {
  const { t, changeLanguage, language } = useLanguage()
  const [user, setUser] = useState(null)
  const [instances, setInstances] = useState([])
  const [installedVersions, setInstalledVersions] = useState({})
  const [selectedInstance, setSelectedInstance] = useState(null)
  const [launchStatus, setLaunchStatus] = useState('idle') // idle, preparing, ready, launching, running, repairing
  const [launchProgress, setLaunchProgress] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [showAboutDialog, setShowAboutDialog] = useState(false)
  const [showLaunchConfirmation, setShowLaunchConfirmation] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [notification, setNotification] = useState(null)
  const [showRepairConfirmation, setShowRepairConfirmation] = useState(false)
  const [repairTargetInstance, setRepairTargetInstance] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoading, setIsLoading] = useState(true) // Start with loading true
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  
  // Update State
  const [updateStatus, setUpdateStatus] = useState('idle') // idle, checking, available, downloading, downloaded, error
  const [updateProgress, setUpdateProgress] = useState(0)
  const [updateError, setUpdateError] = useState(null)
  
  const [showConsole, setShowConsole] = useState(false)
  const [logs, setLogs] = useState([])
  const [toast, setToast] = useState(null)
  const notifiedUpdatesRef = React.useRef(new Set())

  // Graphics Settings State
  const [enableAnimation, setEnableAnimation] = useState(true)
  const [enableCubes, setEnableCubes] = useState(true)

  const toggleAnimation = () => {
      const newState = !enableAnimation
      setEnableAnimation(newState)
      // setEnableCubes(newState) // User requested to keep Cubes always on (or independent)
  }

  const showToast = (message, type = 'info') => {
      setToast({ message, type, id: Date.now() })
  }

  // Check for updates notification
  useEffect(() => {
      if (instances.length > 0 && Object.keys(installedVersions).length > 0) {
          instances.forEach(inst => {
              const installed = installedVersions[inst.id]
              const remote = inst.modpackVersion || inst.version
              
              if (installed && remote && installed !== remote) {
                  const notificationKey = `${inst.id}-${remote}`
                  // Check if already notified for this specific version
                  if (!notifiedUpdatesRef.current.has(notificationKey)) {
                      showToast(`${t('main.updateAvailable') || 'Update Available'}: ${inst.name}`, 'info')
                      notifiedUpdatesRef.current.add(notificationKey)
                  }
              }
          })
      }
  }, [instances, installedVersions])

  const [redeemedCodes, setRedeemedCodes] = useState(() => {
      const saved = localStorage.getItem('redeemedCodes')
      return saved ? JSON.parse(saved) : []
  })

  // Persist redeemed codes
  useEffect(() => {
      localStorage.setItem('redeemedCodes', JSON.stringify(redeemedCodes))
  }, [redeemedCodes])

  const handleAddCode = (code) => {
      if (redeemedCodes.includes(code)) {
          return { success: false, message: 'Code already added.' }
      }

      // Validate against instances
      const isValid = instances.some(inst => {
          if (!inst.requiredCode) return false
          const codes = Array.isArray(inst.requiredCode) ? inst.requiredCode : [inst.requiredCode]
          return codes.includes(code)
      })

      if (isValid) {
          setRedeemedCodes([...redeemedCodes, code])
          return { success: true }
      } else {
          return { success: false, message: 'Invalid code. Please check and try again.' }
      }
  }

  const handleRemoveCode = (code) => {
      setRedeemedCodes(redeemedCodes.filter(c => c !== code))
  }

  const fetchInstances = async (force = false, silent = false) => {
    if (!silent) setIsRefreshing(true)
    try {
        const insts = await window.api.getInstances(force)
        // Only update if we got a valid array
        if (Array.isArray(insts)) {
            // Optimization: Deep compare to prevent unnecessary re-renders
            setInstances(prev => {
                if (JSON.stringify(prev) === JSON.stringify(insts)) return prev
                return insts
            })
            return insts // Return for chaining
        }
    } catch (err) {
        console.error("Failed to fetch instances", err)
    } finally {
        if (!silent) setIsRefreshing(false)
    }
    return []
  }

  const preloadAssets = async (insts, userProfile) => {
      const urls = []
      // Instance Assets
      if (Array.isArray(insts)) {
          insts.forEach(inst => {
              if (inst.icon) urls.push(inst.icon)
              if (inst.backgroundImage) urls.push(inst.backgroundImage)
              if (inst.logo) urls.push(inst.logo)
              if (inst.announcementImage) urls.push(inst.announcementImage)
          })
      }
      // User Skin
      if (userProfile && userProfile.name) {
          urls.push(`https://minotar.net/helm/${userProfile.name}/100.png`)
      }
      
      if (urls.length > 0) {
          // Limit concurrent preloading to avoid network/memory spikes
          // console.log(`Preloading ${urls.length} assets...`)
          // await preloadImages(urls)
          // console.log("Assets preloaded.")
      }
  }

  useEffect(() => {
    // Initial Load
    const init = async () => {
      try {
        let currentUser = null
        // Check Auth
        const storedAuth = await window.api.refreshToken()
        if (storedAuth.success) {
          currentUser = storedAuth.profile
          setUser(currentUser)
        }

        // Fetch Instances
        // Use force=false to load from cache immediately (Fast Startup)
        // The background sync will update to the latest data automatically
        const insts = await fetchInstances(false)
        
        // Fetch Installed Versions (Safe check for API availability)
        if (window.api && window.api.getInstalledVersions) {
            try {
                const installed = await window.api.getInstalledVersions()
                setInstalledVersions(installed || {})
            } catch (e) {
                console.warn("Failed to fetch installed versions:", e)
            }
        }

        // Optimize: Don't preload all instance assets to save RAM
        // Only preload user skin if needed
        if (currentUser) {
            await preloadAssets([], currentUser)
        }

      } catch (err) {
        console.error("Initialization failed:", err)
        setErrorMessage("Initialization failed: " + err.message)
      } finally {
        // Stop Loading
        setIsLoading(false)
      }
    }
    init()

    // Auto-Reload Instances every 3 seconds (Silent)
    const interval = setInterval(() => {
        // Use force=false to leverage Stale-While-Revalidate strategy
        // This returns cached data immediately but triggers background fetch
        fetchInstances(false, true)
    }, 3000)

    // Listen for background updates (caching)
    window.api.onInstancesUpdated((newInstances) => {
        console.log("Instances updated from background sync", newInstances)
        setInstances(newInstances)
    })

    window.api.onLaunchProgress((data) => {
        console.log(data)
        if (data.type === 'progress') {
            setLaunchProgress(data)
        }
    })
    
    window.api.onLaunchSuccess(() => {
        setLaunchStatus('running')
        setLaunchProgress(null)
        // Update installed versions after successful launch (or repair)
        if (window.api.getInstalledVersions) {
            window.api.getInstalledVersions().then(setInstalledVersions).catch(console.error)
        }
    })

    if (window.api.onGameLog) {
        window.api.onGameLog((log) => {
            setLogs(prev => {
                // Limit log size to prevent memory issues
                if (prev.length > 2000) return [...prev.slice(500), log]
                return [...prev, log]
            })
        })
    }
    
    window.api.onGameClosed(() => {
        setLaunchStatus('idle')
        setLaunchProgress(null)
    })

    if (window.api.onWindowVisibility) {
        window.api.onWindowVisibility((visible) => {
            console.log("Window visibility changed:", visible)
            setIsVisible(visible)
        })
    }

    // Updater Events
    if (window.api.onUpdaterEvent) {
        window.api.onUpdaterEvent((data) => {
            console.log("Updater Event:", data)
            setUpdateStatus(data.type)
            if (data.type === 'error' && data.error) {
                setUpdateError(data.error)
            }
            if (data.progress) {
                setUpdateProgress(data.progress)
            }
        })
    }

    return () => {
        clearInterval(interval)
        // Clean up listeners if needed (though usually handled by electron preload)
    }
  }, [])

  // Filter instances based on Whitelist and Access Codes
  const filteredInstances = useMemo(() => {
      if (!user) {
          console.log("Filter: No user logged in, returning empty list.")
          return [] 
      }
      
      console.log(`Filter: User=${user.name}, Total Instances=${instances.length}`)

      return instances.filter(inst => {
          // Check Access Code
          if (inst.requiredCode) {
              // Support both string "CODE" and array ["CODE1", "CODE2"]
              const validCodes = Array.isArray(inst.requiredCode) 
                  ? inst.requiredCode 
                  : [inst.requiredCode]
              
              const hasCode = validCodes.some(code => redeemedCodes.includes(code))
              
              if (!hasCode) {
                  // NEW LOGIC: If whitelist exists and user is in it, bypass code requirement
                  if (inst.whitelist) {
                      const userName = (user.name || '').trim().toLowerCase()
                      const allowed = Array.isArray(inst.whitelist) ? inst.whitelist : [inst.whitelist]
                      const isWhitelisted = allowed.some(w => typeof w === 'string' && w.trim().toLowerCase() === userName)
                      
                      if (isWhitelisted) {
                           // User is special (whitelisted), so let them see it even without code
                           return true 
                      }
                  }
                  
                  // If not whitelisted and no code, hide it
                  console.log(`Instance ${inst.id} hidden (required code missing)`)
                  return false 
              }
          }

          // If whitelist exists
          if (inst.whitelist) {
              const userName = (user.name || '').trim().toLowerCase()
              
              // Normalize whitelist to array (handle string case)
              let allowed = []
              if (Array.isArray(inst.whitelist)) {
                  allowed = inst.whitelist
              } else if (typeof inst.whitelist === 'string') {
                  allowed = [inst.whitelist]
              }
              
              console.log(`Checking ${inst.id}: whitelist=${JSON.stringify(allowed)} vs user=${userName}`)

              const isAllowed = allowed.some(w => 
                  typeof w === 'string' && w.trim().toLowerCase() === userName
              )
              
              if (!isAllowed) console.log(`Instance ${inst.id} hidden (not in whitelist)`)
              return isAllowed
          }
          
          return true // Default public if no whitelist specified
      })
  }, [instances, user, redeemedCodes])

  // Auto-select first filtered instance if none selected or sync with updates
  useEffect(() => {
      if (filteredInstances.length > 0 && !selectedInstance) {
          setSelectedInstance(filteredInstances[0])
      } else if (selectedInstance) {
          // Check if selected instance still exists and update it with fresh data
          const freshInstance = filteredInstances.find(i => i.id === selectedInstance.id)
          if (freshInstance) {
              // If reference is different (data updated), update selection
              if (freshInstance !== selectedInstance) {
                  setSelectedInstance(freshInstance)
              }
          } else {
              // Instance no longer exists in list
              setSelectedInstance(filteredInstances.length > 0 ? filteredInstances[0] : null)
          }
      }
  }, [filteredInstances, selectedInstance])

  const handleLogin = async () => {
    setIsLoggingIn(true)
    try {
        const result = await window.api.login()
        if (result.success) {
            // Fetch instances immediately after login to ensure data is ready before showing main screen
            const insts = await fetchInstances(true)
            await preloadAssets(insts, result.profile)
            setUser(result.profile)
        } else {
            setErrorMessage("Login Failed: " + (result.error?.message || "Unknown error"))
        }
    } catch (err) {
        setErrorMessage("Login Error: " + err.message)
    } finally {
        setIsLoggingIn(false)
    }
  }

  const handleLaunch = async () => {
    if (!user) return handleLogin()
    if (!selectedInstance) return

    setLaunchStatus('launching')
    setErrorMessage(null) // Clear previous errors
    
    const auth = await window.api.refreshToken() // Get fresh token
    if (!auth.success) {
        setLaunchStatus('idle')
        handleLogin() // Re-login needed
        return
    }

    const result = await window.api.launchGame(selectedInstance, auth.access_token)
    if (!result.success) {
        setLaunchStatus('idle')
        if (result.error !== 'Cancelled') {
             setErrorMessage("Launch Failed: " + result.error)
        }
    }
  }

  const handleCancelLaunch = async () => {
      await window.api.cancelLaunch()
      setLaunchStatus('idle')
      setLaunchProgress(null)
  }

  const handleClose = () => {
     setShowCloseDialog(true)
  }

  const handleOpenFolder = async () => {
      if (selectedInstance) {
          const result = await window.api.openInstanceFolder(selectedInstance)
          if (result && !result.success && result.reason === 'not_found') {
             setNotification({
                 title: 'Folder Not Found',
                 message: `The instance folder for "${selectedInstance.name}" does not exist on this machine yet. Try launching the game first.`,
                 type: 'warning'
             })
          }
      }
  }

  const handleRepair = async () => {
    if (!selectedInstance) return
    setRepairTargetInstance(selectedInstance)
    setShowRepairConfirmation(true)
  }

  const confirmRepair = async () => {
    const instance = repairTargetInstance
    if (!instance) return
    
    setShowRepairConfirmation(false)
    setRepairTargetInstance(null)

    const isUpdate = installedVersions[instance.id] !== (instance.modpackVersion || instance.version)
    const actionName = isUpdate ? "Update" : "Repair"
    
    setLaunchStatus('repairing')
    try {
        await window.api.repairInstance(instance)
        
        // Refresh installed versions to update UI state
        if (window.api && window.api.getInstalledVersions) {
            const installed = await window.api.getInstalledVersions()
            setInstalledVersions(installed || {})
        }
    } catch (err) {
        setErrorMessage(`${actionName} failed: ` + err.message)
    } finally {
        setLaunchStatus('idle')
    }
  }

  const handleLogout = async () => {
    await window.api.logout()
    setUser(null)
    setShowSettings(false)
  }

  const handleSwitchAccount = async () => {
      // Force prompt for new login
      const result = await window.api.login()
      if (result.success) {
        setUser(result.profile)
      }
  }

  if (isLoading) {
      return (
        <div className="app-container" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', justifyContent: 'center', alignItems: 'center', background: '#121212' }}>
            <div style={{ zIndex: 10, textAlign: 'center' }}>
                <div style={{ 
                    width: '60px', 
                    height: '60px', 
                    margin: '0 auto 20px auto', 
                    border: '4px solid rgba(255, 215, 0, 0.2)', 
                    borderTop: '4px solid #ffd700', 
                    borderRadius: '50%', 
                    animation: 'spin 1s linear infinite' 
                }}></div>
                <h2 style={{ fontWeight: 300, letterSpacing: 2 }}>{t('main.loading').toUpperCase()}</h2>
            </div>{` ${!isVisible ? 'animations-paused' : ''}`}
        </div>
      )
  }

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--main-bg)', color: 'white', overflow: 'hidden' }}>
      {/* Titlebar Overlay */}
      <div className="titlebar">
        <div className="titlebar-button" onClick={() => window.api.windowMinimize()}>_</div>
        <div className="titlebar-button close" onClick={handleClose}>X</div>
      </div>

      {!user ? (
            <LoginScreen 
                onLogin={handleLogin} 
                isLoggingIn={isLoggingIn} 
                enableCubes={enableCubes}
            />
        ) : (
            <>
            <Sidebar 
                instances={filteredInstances} 
                selectedInstance={selectedInstance} 
                onSelectInstance={setSelectedInstance} 
                onRefresh={() => fetchInstances(true)}
                isRefreshing={isRefreshing}
                user={user}
                onOpenSettings={() => setShowSettings(true)}
                onOpenAbout={() => setShowAboutDialog(true)}
                t={t}
            />
            {filteredInstances.length > 0 ? (
                <MainContent 
                    instance={selectedInstance}
                    installedVersion={installedVersions[selectedInstance?.id]}
                    status={launchStatus}
                    progress={launchProgress}
                    onLaunch={handleLaunch}
                    onCancel={handleCancelLaunch}
                    onOpenSettings={() => setShowSettings(true)}
                    onOpenFolder={handleOpenFolder}
                    onRepair={handleRepair}
                    onOpenConsole={() => setShowConsole(true)}
                    user={user}
                    paused={showSettings}
                    t={t}
                    enableAnimation={enableAnimation}
                    toggleAnimation={toggleAnimation}
                    enableCubes={enableCubes}
                />
            ) : (
                <NoInstancesView 
                    user={user} 
                    onOpenSettings={() => setShowSettings(true)} 
                    t={t}
                />
            )}
            </>
        )}

        {showSettings && (
            <Settings 
                user={user}
                selectedInstance={selectedInstance}
                onClose={() => setShowSettings(false)} 
                onLogout={handleLogout}
                onSwitchAccount={handleSwitchAccount}
                redeemedCodes={redeemedCodes}
                onAddCode={handleAddCode}
                onRemoveCode={handleRemoveCode}
                t={t}
                changeLanguage={changeLanguage}
                currentLanguage={language}
                showToast={showToast}
            />
        )}

        {toast && (
            <ToastNotification
                key={toast.id}
                message={toast.message}
                type={toast.type}
                onClose={() => setToast(null)}
            />
        )}

        {showLaunchConfirmation && (
            <LaunchConfirmationModal 
                onConfirm={confirmLaunch}
                onCancel={cancelLaunch}
                instanceName={selectedInstance?.name}
                t={t}
            />
        )}
        
        {showRepairConfirmation && repairTargetInstance && (
            <RepairConfirmationModal 
                onConfirm={confirmRepair}
                onCancel={() => {
                    setShowRepairConfirmation(false)
                    setRepairTargetInstance(null)
                }}
                instanceName={repairTargetInstance.name}
                actionName={installedVersions[repairTargetInstance.id] !== (repairTargetInstance.modpackVersion || repairTargetInstance.version) ? "Update" : "Repair"}
                t={t}
            />
        )}

        {/* Updater Modal */}
        <UpdateModal 
            status={updateStatus} 
            progress={updateProgress}
            error={updateError}
            onInstall={() => window.api.installUpdate()}
            onClose={() => setUpdateStatus('idle')}
        />

        {showConsole && (
            <ConsoleModal 
                logs={logs} 
                onClose={() => setShowConsole(false)} 
                onClear={() => setLogs([])}
            />
        )}

        {showAboutDialog && (
            <AboutDialog onClose={() => setShowAboutDialog(false)} />
        )}

        {showCloseDialog && (
            <CloseDialog 
                onCancel={() => setShowCloseDialog(false)} 
                onConfirm={(behavior) => {
                    window.api.windowClose(behavior)
                    setShowCloseDialog(false)
                }} 
            />
        )}
        
        {errorMessage && (
            <ErrorDialog message={errorMessage} onClose={() => setErrorMessage(null)} />
        )}

        {notification && (
            <NotificationModal 
                title={notification.title} 
                message={notification.message} 
                type={notification.type} 
                onClose={() => setNotification(null)} 
            />
        )}


    </div>
  )
}

export default App
