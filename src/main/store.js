import Store from 'electron-store'

const store = new Store()

export function setupStore(ipcMain) {
  ipcMain.handle('get-settings', () => {
    return {
      ram: store.get('ram', 4096),
      javaPath: store.get('javaPath', ''),
      instances: store.get('instances', []),
      installedVersions: store.get('installed_versions', {})
    }
  })

  ipcMain.handle('get-installed-versions', () => {
      return store.get('installed_versions', {})
  })

  ipcMain.handle('set-settings', (event, settings) => {
    store.set(settings)
    return true
  })

  ipcMain.handle('get-auth', () => {
    return store.get('auth', null)
  })
}

export const getStore = () => store
