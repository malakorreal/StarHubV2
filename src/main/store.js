import Store from 'electron-store'
import os from 'os'

const store = new Store()

export function setupStore(ipcMain) {
  ipcMain.handle('get-settings', () => {
    return {
      ram: store.get('ram', 4096),
      systemRam: Math.round(os.totalmem() / 1024 / 1024), // Add system RAM in MB
      closeBehavior: store.get('closeBehavior', 'ask'),
      bgAnimation: store.get('bgAnimation', false),
      javaPath: store.get('javaPath', ''),
      instances: store.get('instances', []),
      installedVersions: store.get('installed_versions', {}),
      autoJoin: store.get('autoJoin', false),
      resolution: store.get('resolution', { width: 854, height: 480 }),
      fullscreen: store.get('fullscreen', false),
      maxDownloadSpeed: store.get('maxDownloadSpeed', 0), // 0 = Unlimited (MB/s)
      maxConcurrentDownloads: store.get('maxConcurrentDownloads', 5),
      autoCheckUpdates: store.get('autoCheckUpdates', true)
    }
  })

  ipcMain.handle('get-installed-versions', () => {
      return store.get('installed_versions', {})
  })

  ipcMain.handle('set-settings', (event, settings) => {
    store.set(settings)
    return true
  })

  ipcMain.handle('reset-settings', () => {
    store.delete('ram')
    store.delete('javaArgs')
    store.delete('autoJoin')
    store.delete('resolution')
    store.delete('fullscreen')
    store.delete('maxDownloadSpeed')
    store.delete('maxConcurrentDownloads')
    store.delete('autoCheckUpdates')
    store.delete('closeBehavior')
    store.delete('bgAnimation')
    
    // Return default values
    return {
      ram: 4096,
      systemRam: Math.round(os.totalmem() / 1024 / 1024),
      closeBehavior: 'ask',
      bgAnimation: false,
      javaArgs: '',
      autoJoin: false,
      resolution: { width: 854, height: 480 },
      fullscreen: false,
      maxDownloadSpeed: 0,
      maxConcurrentDownloads: 5,
      autoCheckUpdates: true
    }
  })

  ipcMain.handle('get-auth', () => {
    return store.get('auth', null)
  })
}

export const getStore = () => store
