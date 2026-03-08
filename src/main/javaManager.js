import fs from 'fs'
import path from 'path'
import { app } from 'electron'

export class JavaManager {
    constructor(mainWindow, syncManager) {
        this.mainWindow = mainWindow
        this.syncManager = syncManager
        this.baseDir = path.join(app.getPath('userData'), 'java')
        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true })
        }
    }

    getJavaVersionForMinecraft(mcVersion) {
        const parts = mcVersion.split('.').map(Number)
        const minor = parts[1]
        const patch = parts[2] || 0

        if (minor >= 21) return 21
        if (minor === 20 && patch >= 5) return 21
        if (minor >= 18) return 17
        if (minor === 17) return 17 // Fallback to 17 for 1.17
        return 8
    }

    async ensureJava(mcVersion, signal) {
        const javaVer = this.getJavaVersionForMinecraft(mcVersion)
        const javaTargetDir = path.join(this.baseDir, `jre-${javaVer}`)
        
        // 1. Check if valid Java exists in this folder
        const existingJava = this.findJavaExec(javaTargetDir)
        if (existingJava) {
            console.log(`[JavaManager] Found existing Java ${javaVer} at: ${existingJava}`)
            return existingJava
        }

        // 2. Not found, download
        console.log(`[JavaManager] Java ${javaVer} not found. Downloading JRE...`)
        
        // Clean up partials
        if (fs.existsSync(javaTargetDir)) {
            fs.rmSync(javaTargetDir, { recursive: true, force: true })
        }
        fs.mkdirSync(javaTargetDir, { recursive: true })

        const platform = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'mac' : 'linux'
        const arch = process.arch === 'x64' ? 'x64' : process.arch === 'arm64' ? 'aarch64' : 'x64'
        const downloadUrl = `https://api.adoptium.net/v3/binary/latest/${javaVer}/ga/${platform}/${arch}/jre/hotspot/normal/eclipse`
        const zipExtension = process.platform === 'win32' ? 'zip' : 'tar.gz'
        const zipPath = path.join(this.baseDir, `jre-${javaVer}.${zipExtension}`)

        try {
            this.sendProgress(`Downloading Java ${javaVer}...`, 0)
            
            // Use SyncManager for robust download
            if (this.syncManager) {
                await this.syncManager.downloadFile(downloadUrl, zipPath, { 
                    signal,
                    checkSize: false, // Always download if missing
                    onProgress: (current, total) => {
                        const percent = total ? Math.round((current / total) * 100) : 0
                        this.sendProgress(null, percent)
                    }
                })
            } else {
                 throw new Error("SyncManager not initialized in JavaManager")
            }
            
            this.sendProgress(`Extracting Java ${javaVer}...`, 0)
            
            // Use SyncManager for robust extraction
            if (this.syncManager) {
                 if (zipExtension === 'tar.gz') {
                    // tar.gz extraction logic (if SyncManager doesn't have it, we might need to add it or use child_process)
                    // Let's check if syncManager has extractTarGz or similar.
                    // Based on previous analysis, it only had extractZip.
                    // I'll use child_process for tar.gz if needed.
                    const { execSync } = require('child_process')
                    execSync(`tar -xzf "${zipPath}" -C "${javaTargetDir}"`)
                 } else {
                    await this.syncManager.extractZip(zipPath, javaTargetDir, { signal })
                 }
            }

            // Clean zip
            fs.unlinkSync(zipPath)

            const javaExec = this.findJavaExec(javaTargetDir)
            if (!javaExec) {
                throw new Error(`Java executable not found after extraction in ${javaTargetDir}`)
            }

            console.log(`[JavaManager] Java installed successfully: ${javaExec}`)
            return javaExec

        } catch (e) {
            console.error(`[JavaManager] Failed to install Java ${javaVer}:`, e)
            // Cleanup
            if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath)
            if (fs.existsSync(javaTargetDir)) fs.rmSync(javaTargetDir, { recursive: true, force: true })
            throw e
        }
    }

    findJavaExec(dir) {
        if (!fs.existsSync(dir)) return null

        const items = fs.readdirSync(dir, { withFileTypes: true })
        
        const javaBin = process.platform === 'win32' ? 'java.exe' : 'java'

        // Check for bin/java in current dir
        const binPath = path.join(dir, 'bin', javaBin)
        if (fs.existsSync(binPath)) return binPath

        // Check immediate subdirectories (e.g. jre-17.0.x/bin/java)
        for (const item of items) {
            if (item.isDirectory()) {
                const subBinPath = path.join(dir, item.name, 'bin', javaBin)
                if (fs.existsSync(subBinPath)) return subBinPath
            }
        }
        
        return null
    }

    sendProgress(status, progress) {
        if (this.mainWindow) {
            this.mainWindow.webContents.send('launch-progress', {
                type: 'progress',
                task: status || 'Installing Java',
                total: 100,
                current: progress || 0,
                version: 'Java'
            })
        }
    }
}
