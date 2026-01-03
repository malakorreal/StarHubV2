import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  login: () => ipcRenderer.invoke('login'),
  logout: () => ipcRenderer.invoke('logout'),
  refreshToken: () => ipcRenderer.invoke('refresh-token'),
  getInstances: (force = false) => ipcRenderer.invoke('get-instances', force),
  launchGame: (instance, auth) => ipcRenderer.invoke('launch-game', { instance, auth }),
  cancelLaunch: () => ipcRenderer.invoke('cancel-launch'),
  prepareLaunch: (instance) => ipcRenderer.invoke('prepare-launch', instance),
  updateLanguage: (lang) => ipcRenderer.invoke('update-language', lang),
  repairInstance: (instance) => ipcRenderer.invoke('repair-instance', instance),
  openInstanceFolder: (instance) => ipcRenderer.invoke('open-instance-folder', instance),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (settings) => ipcRenderer.invoke('set-settings', settings),
  getServerStatus: (ip) => ipcRenderer.invoke('get-server-status', ip),
  getInstalledVersions: () => ipcRenderer.invoke('get-installed-versions'),
  windowClose: (behavior) => ipcRenderer.invoke('window-close', behavior),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  onLaunchProgress: (callback) => ipcRenderer.on('launch-progress', (event, value) => callback(value)),
  onLaunchSuccess: (callback) => ipcRenderer.on('launch-success', (event, value) => callback(value)),
  onGameLog: (callback) => ipcRenderer.on('game-log', (event, value) => callback(value)),
  onGameClosed: (callback) => ipcRenderer.on('game-closed', (event, value) => callback(value)),
  onWindowVisibility: (callback) => ipcRenderer.on('window-visibility', (event, value) => callback(value)),
  onInstancesUpdated: (callback) => {
    // Remove listener to prevent duplicates if called multiple times (though useEffect usually handles cleanup)
    ipcRenderer.removeAllListeners('instances-updated')
    ipcRenderer.on('instances-updated', (event, value) => callback(value))
  },
  // Updater
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdaterEvent: (callback) => ipcRenderer.on('updater-event', (event, value) => callback(value)),
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
