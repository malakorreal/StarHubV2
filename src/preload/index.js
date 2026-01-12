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
  fetchImageBase64: (url) => ipcRenderer.invoke('fetch-image-base64', url),
  repairInstance: (instance) => ipcRenderer.invoke('repair-instance', instance),
  openInstanceFolder: (instance) => ipcRenderer.invoke('open-instance-folder', instance),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (settings) => ipcRenderer.invoke('set-settings', settings),
  resetSettings: () => ipcRenderer.invoke('reset-settings'),
  getServerStatus: (ip) => ipcRenderer.invoke('get-server-status', ip),
  getInstalledVersions: () => ipcRenderer.invoke('get-installed-versions'),
  windowClose: (behavior) => ipcRenderer.invoke('window-close', behavior),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  onLaunchProgress: (callback) => {
    ipcRenderer.removeAllListeners('launch-progress')
    const listener = (event, value) => callback(value)
    ipcRenderer.on('launch-progress', listener)
    return () => ipcRenderer.removeListener('launch-progress', listener)
  },
  onLaunchSuccess: (callback) => {
    ipcRenderer.removeAllListeners('launch-success')
    const listener = (event, value) => callback(value)
    ipcRenderer.on('launch-success', listener)
    return () => ipcRenderer.removeListener('launch-success', listener)
  },
  onGameLog: (callback) => {
    ipcRenderer.removeAllListeners('game-log')
    const listener = (event, value) => callback(value)
    ipcRenderer.on('game-log', listener)
    return () => ipcRenderer.removeListener('game-log', listener)
  },
  onGameClosed: (callback) => {
    ipcRenderer.removeAllListeners('game-closed')
    const listener = (event, value) => callback(value)
    ipcRenderer.on('game-closed', listener)
    return () => ipcRenderer.removeListener('game-closed', listener)
  },
  onWindowVisibility: (callback) => {
    ipcRenderer.removeAllListeners('window-visibility')
    const listener = (event, value) => callback(value)
    ipcRenderer.on('window-visibility', listener)
    return () => ipcRenderer.removeListener('window-visibility', listener)
  },
  onInstancesUpdated: (callback) => {
    ipcRenderer.removeAllListeners('instances-updated')
    const listener = (event, value) => callback(value)
    ipcRenderer.on('instances-updated', listener)
    return () => ipcRenderer.removeListener('instances-updated', listener)
  },
  // Updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdaterEvent: (callback) => {
    ipcRenderer.removeAllListeners('updater-event')
    const listener = (event, value) => callback(value)
    ipcRenderer.on('updater-event', listener)
    return () => ipcRenderer.removeListener('updater-event', listener)
  },
  // Backup
  backupInstanceData: (instance) => ipcRenderer.invoke('backup-instance-data', instance),
  // RPC
  updateRPC: (status, instanceName) => ipcRenderer.invoke('update-rpc', { status, instanceName }),
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
