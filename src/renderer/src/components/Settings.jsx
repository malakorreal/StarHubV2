import React, { useEffect, useState } from 'react'
import { themes as availableThemes } from '../themes'
import RepairConfirmationModal from './RepairConfirmationModal'

function Settings({ onClose, onLogout, onSwitchAccount, user, redeemedCodes = [], onAddCode, onRemoveCode, t, changeLanguage, currentLanguage, showToast, onInstalledVersionsChange, onUninstallInstance, selectedInstance, enableAnimation, setEnableAnimation }) {
  const [activeTab, setActiveTab] = useState('general')
  const [ram, setRam] = useState(4096)
  const [systemRam, setSystemRam] = useState(0) // Default 0 to check if value is received
  const [javaArgs, setJavaArgs] = useState('')
  const [autoJoin, setAutoJoin] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showRepairModal, setShowRepairModal] = useState(false)
  const [redeemInput, setRedeemInput] = useState('')
  const [redeemError, setRedeemError] = useState('')
  const [resolutionWidth, setResolutionWidth] = useState(854)
  const [resolutionHeight, setResolutionHeight] = useState(480)
  const [fullscreen, setFullscreen] = useState(false)
  const [maxDownloadSpeed, setMaxDownloadSpeed] = useState(0)
  const [maxConcurrentDownloads, setMaxConcurrentDownloads] = useState(5)
  const [autoCheckUpdates, setAutoCheckUpdates] = useState(true)
  const [checkingForUpdates, setCheckingForUpdates] = useState(false)
  const [themeId, setThemeId] = useState(localStorage.getItem('theme_id') || 'gold')
  const [closeBehavior, setCloseBehavior] = useState('ask')
  const [bgAnimation, setBgAnimation] = useState(!!enableAnimation)
  const [accounts, setAccounts] = useState([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  useEffect(() => {
      if (activeTab === 'account' && window.api && window.api.getAccounts) {
          setLoadingAccounts(true)
          window.api.getAccounts()
            .then(accs => {
                setAccounts(accs)
            })
            .catch(console.error)
            .finally(() => setLoadingAccounts(false))
      }
  }, [activeTab, user])

  const handleRestartLauncher = () => {
    if (window.api && window.api.restartLauncher) {
      window.api.restartLauncher()
    }
  }
  const handleBackup = async () => {
    if (selectedInstance && window.api && window.api.backupInstanceData) {
      const res = await window.api.backupInstanceData(selectedInstance)
      if (res && res.success) {
        if (showToast) showToast(t('settings.backupSuccess') || 'Backup created and folder opened.', 'success')
      } else {
        if (showToast) showToast(res?.error || (t('settings.backupFailed') || 'Backup failed'), 'error')
      }
    }
  }
  const handleOpenCrashReports = async () => {
    if (selectedInstance && window.api && window.api.openCrashReports) {
      if (showToast) showToast(currentLanguage === 'th' ? 'กำลังเปิดโฟลเดอร์ Crash Reports...' : 'Opening Crash Reports folder...', 'info')
      const res = await window.api.openCrashReports(selectedInstance)
      if (res && res.success) {
        if (showToast) showToast((currentLanguage === 'th' ? 'เปิดโฟลเดอร์ Crash Reports แล้ว' : 'Opened Crash Reports folder'), 'success')
      } else if (res && res.reason === 'not_found') {
        if (showToast) showToast((currentLanguage === 'th' ? 'ยังไม่มีไฟล์ Crash Reports ในเครื่องนี้' : 'No crash reports found on this machine'), 'warning')
      } else {
        if (showToast) showToast(res?.error || (currentLanguage === 'th' ? 'เปิดโฟลเดอร์ไม่สำเร็จ' : 'Failed to open folder'), 'error')
      }
    }
  }
  const handleUninstallInstance = () => {
    if (!selectedInstance) return
    if (!onUninstallInstance) return
    onUninstallInstance()
  }

  useEffect(() => {
    if (window.api && window.api.getSettings) {
        window.api.getSettings().then(s => {
            if (s && s.ram) setRam(s.ram)
            if (s && typeof s.systemRam !== 'undefined') setSystemRam(s.systemRam)
            if (s && s.javaArgs) setJavaArgs(s.javaArgs)
            if (s && typeof s.autoJoin !== 'undefined') setAutoJoin(s.autoJoin)
            if (s && s.resolution) {
                setResolutionWidth(s.resolution.width || 854)
                setResolutionHeight(s.resolution.height || 480)
            }
            if (s && typeof s.fullscreen !== 'undefined') setFullscreen(s.fullscreen)
            if (s && typeof s.maxDownloadSpeed !== 'undefined') setMaxDownloadSpeed(s.maxDownloadSpeed)
            if (s && typeof s.maxConcurrentDownloads !== 'undefined') setMaxConcurrentDownloads(s.maxConcurrentDownloads)
            if (s && typeof s.autoCheckUpdates !== 'undefined') setAutoCheckUpdates(s.autoCheckUpdates)
            if (s && typeof s.closeBehavior !== 'undefined') setCloseBehavior(s.closeBehavior)
            if (s && typeof s.bgAnimation !== 'undefined') {
                setBgAnimation(!!s.bgAnimation)
                if (setEnableAnimation) setEnableAnimation(!!s.bgAnimation)
            }
        })
    }
  }, [])

  const save = () => {
      if (window.api && window.api.setSettings) {
        window.api.setSettings({ 
            ram, 
            javaArgs, 
            autoJoin, 
            resolution: { width: resolutionWidth, height: resolutionHeight },
            fullscreen,
            maxDownloadSpeed,
            maxConcurrentDownloads,
            autoCheckUpdates,
            closeBehavior,
            bgAnimation
        })
      }
      if (setEnableAnimation) setEnableAnimation(bgAnimation)
      if (showToast) showToast(t('settings.saved'), 'success')
      onClose()
  }

  const handleRedeemSubmit = (e) => {
      e.preventDefault()
      const trimmedCode = redeemInput.trim()
      if (!trimmedCode) return

      const result = onAddCode(trimmedCode)
      
      if (result && result.success) {
          setRedeemInput('')
          setRedeemError('')
      } else {
          setRedeemError(result?.message || t('settings.invalidCode'))
      }
  }

  const handleLogoutClick = () => {
      setShowLogoutConfirm(true)
  }

  const handleReset = async () => {
    // Check if confirm is available, otherwise use window.confirm
    const confirmFn = window.confirm
    if (confirmFn(t('settings.resetConfirm') || "Are you sure you want to reset all settings?")) {
        if (window.api && window.api.resetSettings) {
            const defaults = await window.api.resetSettings()
            if (defaults) {
                setRam(defaults.ram)
                if (defaults.systemRam) setSystemRam(defaults.systemRam)
                setJavaArgs(defaults.javaArgs)
                setAutoJoin(defaults.autoJoin)
                setResolutionWidth(defaults.resolution.width)
                setResolutionHeight(defaults.resolution.height)
                setFullscreen(defaults.fullscreen)
                setMaxDownloadSpeed(defaults.maxDownloadSpeed)
                setMaxConcurrentDownloads(defaults.maxConcurrentDownloads)
                setAutoCheckUpdates(defaults.autoCheckUpdates)
                setCloseBehavior(defaults.closeBehavior || 'ask')
                setBgAnimation(!!defaults.bgAnimation)
                if (setEnableAnimation) setEnableAnimation(!!defaults.bgAnimation)
                if (showToast) showToast(t('settings.saved'), 'success')
            }
        }
    }
  }

  const confirmLogout = () => {
      onLogout()
      onClose()
  }

  const handleThemeChange = (id) => {
      setThemeId(id)
      localStorage.setItem('theme_id', id)
      
      const theme = availableThemes[id]
      if (theme) {
          Object.entries(theme.colors).forEach(([key, value]) => {
              document.documentElement.style.setProperty(key, value)
          })
      }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(5px)', willChange: 'opacity, transform' }}>
       <div style={{ background: 'var(--modal-bg)', borderRadius: '12px', width: '600px', height: '480px', display: 'flex', overflow: 'hidden', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
          
          {/* Sidebar */}
          <div style={{ width: '180px', background: 'var(--sidebar-bg)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ marginBottom: '20px', fontWeight: 'bold', fontSize: '1.2em', color: 'var(--text-primary)' }}>{t('settings.title')}</div>
              
              <button 
                onClick={() => setActiveTab('general')}
                style={{ 
                    textAlign: 'left', 
                    padding: '10px 15px', 
                    background: activeTab === 'general' ? 'var(--accent)' : 'transparent', 
                    color: activeTab === 'general' ? '#000' : 'var(--text-secondary)', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    fontWeight: activeTab === 'general' ? 'bold' : 'normal',
                    transition: 'all 0.2s'
                }}
              >
                {t('settings.general')}
              </button>

              <button 
                onClick={() => setActiveTab('launcher')}
                style={{ 
                    textAlign: 'left', 
                    padding: '10px 15px', 
                    background: activeTab === 'launcher' ? 'var(--accent)' : 'transparent', 
                    color: activeTab === 'launcher' ? '#000' : 'var(--text-secondary)', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    fontWeight: activeTab === 'launcher' ? 'bold' : 'normal',
                    transition: 'all 0.2s'
                }}
              >
                {t('settings.launcherGraphics') || 'Launcher Interface'}
              </button>

              <button 
                onClick={() => setActiveTab('graphics')}
                style={{ 
                    textAlign: 'left', 
                    padding: '10px 15px', 
                    background: activeTab === 'graphics' ? 'var(--accent)' : 'transparent', 
                    color: activeTab === 'graphics' ? '#000' : 'var(--text-secondary)', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    fontWeight: activeTab === 'graphics' ? 'bold' : 'normal',
                    transition: 'all 0.2s'
                }}
              >
                {t('settings.gameGraphics') || 'Game Graphics'}
              </button>

              <button 
                onClick={() => setActiveTab('account')}
                style={{ 
                    textAlign: 'left', 
                    padding: '10px 15px', 
                    background: activeTab === 'account' ? 'var(--accent)' : 'transparent', 
                    color: activeTab === 'account' ? '#000' : 'var(--text-secondary)', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    fontWeight: activeTab === 'account' ? 'bold' : 'normal',
                    transition: 'all 0.2s'
                }}
              >
                {t('settings.account')}
              </button>

              <button 
                onClick={() => setActiveTab('redeem')}
                style={{ 
                    textAlign: 'left', 
                    padding: '10px 15px', 
                    background: activeTab === 'redeem' ? 'var(--accent)' : 'transparent', 
                    color: activeTab === 'redeem' ? '#000' : 'var(--text-secondary)', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    fontWeight: activeTab === 'redeem' ? 'bold' : 'normal',
                    transition: 'all 0.2s'
                }}
              >
                {t('settings.redeemCode')}
              </button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: '30px', display: 'flex', flexDirection: 'column', position: 'relative', overflowY: 'auto', overflowX: 'hidden' }}>
              
              {/* General Tab */}
              {activeTab === 'general' && (
                  <div style={{ animation: 'fadeIn 0.3s' }}>
                      <h3 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--text-primary)' }}>{t('settings.general')}</h3>
                      
                      {/* Theme Selector */}
                      <div style={{ marginBottom: '25px' }}>
                          <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)' }}>{t('settings.theme') || 'Theme'}</label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                              {Object.values(availableThemes).map(theme => (
                                  <div 
                                      key={theme.id}
                                      onClick={() => handleThemeChange(theme.id)}
                                      style={{
                                          padding: '10px',
                                          borderRadius: '8px',
                                          border: `2px solid ${themeId === theme.id ? 'var(--accent)' : 'transparent'}`,
                                          background: theme.colors['--card-bg'],
                                          cursor: 'pointer',
                                          textAlign: 'center',
                                          transition: 'all 0.2s',
                                          opacity: 0.9
                                      }}
                                      onMouseOver={e => e.currentTarget.style.opacity = 1}
                                      onMouseOut={e => e.currentTarget.style.opacity = 0.9}
                                  >
                                      <div style={{ 
                                          width: '100%', height: '30px', 
                                          background: theme.colors['--sidebar-bg'], 
                                          borderRadius: '4px', marginBottom: '8px',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                                      }}>
                                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: theme.colors['--accent'] }}></div>
                                      </div>
                                      <div style={{ fontSize: '0.85em', color: theme.colors['--text-primary'], fontWeight: 'bold' }}>{theme.name}</div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* RAM Allocation */}
                      <div style={{ marginBottom: '25px' }}>
                          <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>
                            {t('settings.ramAllocation')}: <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{ram} MB</span>
                          </label>
                          <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                              {t('settings.systemRam') || (currentLanguage === 'th' ? 'RAM ทั้งหมดในเครื่อง' : 'System RAM')}: {systemRam > 0 ? systemRam : '...'} MB
                          </div>
                          <input 
                            type="range" 
                            min="1024" 
                            max={Math.max(16384, systemRam > 0 ? systemRam : 16384)} // Limit max slider to system ram if possible, or 16GB
                            step="512" 
                            value={ram} 
                            onChange={e => setRam(Number(e.target.value))}
                            className="ram-slider"
                            style={{ width: '100%', cursor: 'pointer', margin: '10px 0' }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8em', color: 'var(--text-secondary)', marginTop: '5px' }}>
                              <span>1 GB</span>
                              <span>{Math.round(Math.max(16384, systemRam > 0 ? systemRam : 16384) / 1024)} GB</span>
                          </div>
                      </div>

                      {/* Java Arguments */}
                      <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)' }}>{t('settings.javaArgs')}</label>
                        <input
                            type="text"
                            value={javaArgs}
                            onChange={(e) => setJavaArgs(e.target.value)}
                            placeholder="-XX:+UseG1GC -Xmx4G"
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: 'var(--input-bg)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                color: 'var(--text-primary)',
                                fontFamily: 'monospace'
                            }}
                        />
                      </div>

                      {/* Auto Join Toggle */}
                      <div style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label style={{ color: 'var(--text-secondary)' }}>{t('settings.autoJoin') || 'Auto Join Server'}</label>
                        <div 
                            onClick={() => setAutoJoin(!autoJoin)}
                            style={{
                                width: '50px',
                                height: '26px',
                                background: autoJoin ? 'var(--accent)' : 'var(--input-bg)',
                                borderRadius: '13px',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'background 0.3s'
                            }}
                        >
                            <div style={{
                                width: '20px',
                                height: '20px',
                                background: 'var(--text-primary)',
                                borderRadius: '50%',
                                position: 'absolute',
                                top: '3px',
                                left: autoJoin ? '27px' : '3px',
                                transition: 'left 0.3s'
                            }} />
                        </div>
                      </div>

                      {/* Repair Game Files */}
                      {selectedInstance && (
                          <>
                              <div style={{ marginBottom: '25px' }}>
                                  <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)' }}>{t('settings.troubleshoot') || 'Troubleshoot'}</label>
                                  <button
                                      onClick={() => setShowRepairModal(true)}
                                      style={{
                                          width: '100%',
                                          padding: '12px',
                                          background: 'var(--danger)',
                                          color: 'var(--text-primary)',
                                          border: 'none',
                                          borderRadius: '6px',
                                          cursor: 'pointer',
                                          fontWeight: 'bold',
                                          transition: 'background 0.2s',
                                          marginBottom: '5px'
                                      }}
                                      onMouseOver={(e) => e.target.style.opacity = '0.8'}
                                      onMouseOut={(e) => e.target.style.opacity = '1'}
                                  >
                                      {t('settings.repairGame') || (currentLanguage === 'th' ? 'ซ่อมแซมไฟล์เกม (แก้เกมเด้ง)' : 'Repair Game Files')}
                                  </button>
                                  <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                      {t('settings.repairDesc') || (currentLanguage === 'th' ? 'ใช้เมื่อเข้าเกมไม่ได้ หรือไฟล์ไม่ครบ' : 'Use this if game crashes on startup.')}
                                  </div>
                              </div>

                              <div style={{ marginBottom: '25px' }}>
                                  <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)' }}>{t('settings.backupData') || 'Backup Data'}</label>
                                  <button
                                      onClick={handleBackup}
                                      style={{
                                          width: '100%',
                                          padding: '12px',
                                          background: 'var(--input-bg)',
                                          border: '1px solid var(--border-color)',
                                          color: 'var(--text-primary)',
                                          borderRadius: '6px',
                                          cursor: 'pointer',
                                          fontWeight: 'bold',
                                          transition: 'all 0.2s',
                                          marginBottom: '5px'
                                      }}
                                      onMouseOver={(e) => { e.target.style.background = 'var(--border-color)'; }}
                                      onMouseOut={(e) => { e.target.style.background = 'var(--input-bg)'; }}
                                  >
                                      {t('settings.backupNow') || 'Backup Now'}
                                  </button>
                                  <button
                                      onClick={handleOpenCrashReports}
                                      style={{
                                          width: '100%',
                                          padding: '12px',
                                          background: 'var(--input-bg)',
                                          border: '1px solid var(--border-color)',
                                          color: 'var(--text-primary)',
                                          borderRadius: '6px',
                                          cursor: 'pointer',
                                          fontWeight: 'bold',
                                          transition: 'all 0.2s',
                                          marginBottom: '5px'
                                      }}
                                      onMouseOver={(e) => { e.target.style.background = 'var(--border-color)'; }}
                                      onMouseOut={(e) => { e.target.style.background = 'var(--input-bg)'; }}
                                  >
                                      {currentLanguage === 'th' ? 'เปิดโฟลเดอร์ Crash Reports' : 'Open Crash Reports Folder'}
                                  </button>
                                  <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                      {t('settings.backupDataDesc') || 'Backup Emotes, Skin, Figura, etc.'}
                                  </div>
                              </div>
                          </>
                      )}

                      <div style={{ marginBottom: '25px' }}>
                          <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)' }}>
                              {t('settings.troubleshoot') || 'Troubleshoot'}
                          </label>
                          <button
                              onClick={handleRestartLauncher}
                              style={{
                                  width: '100%',
                                  padding: '12px',
                                  background: 'var(--input-bg)',
                                  border: '1px solid var(--border-color)',
                                  color: 'var(--text-primary)',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  transition: 'background 0.2s',
                                  marginBottom: '5px'
                              }}
                              onMouseOver={(e) => { e.target.style.background = 'var(--border-color)' }}
                              onMouseOut={(e) => { e.target.style.background = 'var(--input-bg)' }}
                          >
                              {t('settings.restartLauncher') || (currentLanguage === 'th' ? 'รีสตาร์ท Launcher' : 'Restart Launcher')}
                          </button>
                      </div>

                      {/* Download Speed */}
                      <div style={{ marginBottom: '25px' }}>
                          <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)' }}>
                              {t('settings.downloadSpeed') || (currentLanguage === 'th' ? 'ความเร็วการดาวน์โหลด (สูงสุด)' : 'Max Download Speed')}
                          </label>
                          <select
                              value={maxDownloadSpeed}
                              onChange={(e) => setMaxDownloadSpeed(Number(e.target.value))}
                              style={{
                                  width: '100%',
                                  padding: '10px',
                                  background: 'var(--input-bg)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '4px',
                                  color: 'var(--text-primary)'
                              }}
                          >
                              <option value={0}>{currentLanguage === 'th' ? 'ไม่จำกัด (Unlimited)' : 'Unlimited'}</option>
                              <option value={1}>1 MB/s</option>
                              <option value={2}>2 MB/s</option>
                              <option value={5}>5 MB/s</option>
                              <option value={10}>10 MB/s</option>
                              <option value={20}>20 MB/s</option>
                          </select>
                      </div>

                      {/* Concurrent Downloads */}
                      <div style={{ marginBottom: '25px' }}>
                          <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)' }}>
                              {t('settings.concurrentDownloads') || (currentLanguage === 'th' ? 'จำนวนไฟล์ที่โหลดพร้อมกัน' : 'Concurrent Downloads')}: <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{maxConcurrentDownloads}</span>
                          </label>
                          <input 
                            type="range" 
                            min="1" 
                            max="10" 
                            step="1" 
                            value={maxConcurrentDownloads} 
                            onChange={e => setMaxConcurrentDownloads(Number(e.target.value))}
                            className="ram-slider"
                            style={{ width: '100%', cursor: 'pointer', margin: '10px 0' }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8em', color: 'var(--text-secondary)', marginTop: '5px' }}>
                              <span>1</span>
                              <span>10</span>
                          </div>
                      </div>

                      {/* Updates */}
                      <div style={{ marginBottom: '25px' }}>
                          <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)' }}>
                              {t('settings.updates') || (currentLanguage === 'th' ? 'การอัปเดต' : 'Updates')}
                          </label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {/* Auto Check Toggle */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--text-secondary)' }}>{t('settings.autoCheckUpdate') || (currentLanguage === 'th' ? 'ตรวจสอบอัตโนมัติเมื่อเปิดโปรแกรม' : 'Auto-check on startup')}</span>
                                  <div 
                                      onClick={() => setAutoCheckUpdates(!autoCheckUpdates)}
                                      style={{
                                          width: '40px',
                                          height: '20px',
                                          background: autoCheckUpdates ? 'var(--accent)' : 'var(--input-bg)',
                                          borderRadius: '10px',
                                          position: 'relative',
                                          cursor: 'pointer',
                                          transition: 'background 0.3s'
                                      }}
                                  >
                                      <div style={{
                                          width: '16px',
                                          height: '16px',
                                          background: 'var(--text-primary)',
                                          borderRadius: '50%',
                                          position: 'absolute',
                                          top: '2px',
                                          left: autoCheckUpdates ? '22px' : '2px',
                                          transition: 'left 0.3s'
                                      }} />
                                  </div>
                              </div>
                              
                              {/* Check Now Button */}
                              <button
                                  onClick={async () => {
                                      setCheckingForUpdates(true)
                                      if (window.api && window.api.checkForUpdates) {
                                          await window.api.checkForUpdates()
                                          if (showToast) showToast(currentLanguage === 'th' ? 'กำลังตรวจสอบการอัปเดต...' : 'Checking for updates...', 'info')
                                      }
                                      setTimeout(() => setCheckingForUpdates(false), 2000)
                                  }}
                                  disabled={checkingForUpdates}
                                  style={{
                                      width: '100%',
                                      padding: '10px',
                                      background: 'var(--input-bg)',
                                      border: '1px solid var(--border-color)',
                                      color: checkingForUpdates ? 'var(--text-secondary)' : 'var(--text-primary)',
                                      borderRadius: '4px',
                                      cursor: checkingForUpdates ? 'default' : 'pointer'
                                  }}
                              >
                                  {checkingForUpdates ? (currentLanguage === 'th' ? 'กำลังตรวจสอบ...' : 'Checking...') : (currentLanguage === 'th' ? 'ตรวจสอบการอัปเดตเดี๋ยวนี้' : 'Check for Updates Now')}
                              </button>
                          </div>
                      </div>

                      {/* Language Selection */}
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)' }}>{t('settings.language')}</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => changeLanguage('th')}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: currentLanguage === 'th' ? 'var(--accent)' : 'var(--input-bg)',
                                    color: currentLanguage === 'th' ? '#000' : 'var(--text-primary)',
                                    border: '1px solid',
                                    borderColor: currentLanguage === 'th' ? 'var(--accent)' : 'var(--border-color)',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontWeight: currentLanguage === 'th' ? 'bold' : 'normal',
                                    opacity: currentLanguage === 'th' ? 1 : 0.7
                                }}
                            >
                                ไทย
                            </button>
                            <button
                                onClick={() => changeLanguage('en')}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: currentLanguage === 'en' ? 'var(--accent)' : 'var(--input-bg)',
                                    color: currentLanguage === 'en' ? '#000' : 'var(--text-primary)',
                                    border: '1px solid',
                                    borderColor: currentLanguage === 'en' ? 'var(--accent)' : 'var(--border-color)',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    fontWeight: currentLanguage === 'en' ? 'bold' : 'normal',
                                    opacity: currentLanguage === 'en' ? 1 : 0.7
                                }}
                            >
                                English
                            </button>
                        </div>
                    </div>

                    {/* Reset Settings */}
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                        <label style={{ display: 'block', marginBottom: '10px', color: 'var(--danger)', fontWeight: 'bold' }}>{t('settings.troubleshoot') || 'Troubleshoot'}</label>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ fontSize: '0.9em', color: 'var(--text-secondary)', maxWidth: '70%' }}>
                                {t('settings.resetDesc') || 'Reset all settings to default'}
                            </div>
                            <button
                                onClick={handleReset}
                                style={{
                                    padding: '8px 15px',
                                    background: 'transparent',
                                    border: '1px solid var(--danger)',
                                    color: 'var(--danger)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.9em',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => { e.target.style.background = 'var(--danger)'; e.target.style.color = 'var(--text-primary)' }}
                                onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--danger)' }}
                            >
                                {t('settings.reset') || 'Reset'}
                            </button>
                        </div>
                    </div>
                  </div>
              )}

              {/* Launcher Graphics Tab */}
              {activeTab === 'launcher' && (
                  <div style={{ animation: 'fadeIn 0.3s' }}>
                      <h3 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--text-primary)' }}>{t('settings.launcherGraphics') || 'Launcher Interface'}</h3>
                      
                      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                              <div style={{ display: 'block', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
                                  {t('settings.bgAnimation') || (currentLanguage === 'th' ? 'ภาพเคลื่อนไหวพื้นหลัง' : 'Background Animation')}
                              </div>
                              <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                  {t('settings.bgAnimationDesc') || (currentLanguage === 'th' ? 'เปิด/ปิด วิดีโอหรือ GIF พื้นหลัง' : 'Enable video/GIF background')}
                              </div>
                          </div>
                          <div 
                              onClick={() => setBgAnimation(!bgAnimation)}
                              style={{
                                  width: '50px',
                                  height: '26px',
                                  background: bgAnimation ? 'var(--accent)' : 'var(--input-bg)',
                                  borderRadius: '13px',
                                  position: 'relative',
                                  cursor: 'pointer',
                                  flexShrink: 0
                              }}
                          >
                              <div
                                  style={{
                                      position: 'absolute',
                                      top: '3px',
                                      left: bgAnimation ? '26px' : '3px',
                                      width: '20px',
                                      height: '20px',
                                      borderRadius: '50%',
                                      background: 'var(--text-primary)',
                                      transition: 'left 0.2s'
                                  }}
                              />
                          </div>
                      </div>

                      <div style={{ marginBottom: '25px' }}>
                          <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)' }}>
                              {t('settings.closeBehavior') || (currentLanguage === 'th' ? 'ตั้งค่าการปิด Launcher' : 'Launcher Close Behavior')}
                          </label>
                          <select
                              value={closeBehavior}
                              onChange={(e) => setCloseBehavior(e.target.value)}
                              style={{
                                  width: '100%',
                                  padding: '10px',
                                  background: 'var(--input-bg)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '4px',
                                  color: 'var(--text-primary)'
                              }}
                          >
                              <option value="ask">{t('settings.closeBehaviorAsk') || (currentLanguage === 'th' ? 'ถามทุกครั้ง' : 'Ask Every Time')}</option>
                              <option value="tray">{t('settings.closeBehaviorTray') || (currentLanguage === 'th' ? 'พับหน้าจอลง (Tray)' : 'Minimize to Tray')}</option>
                              <option value="quit">{t('settings.closeBehaviorQuit') || (currentLanguage === 'th' ? 'ปิดโปรแกรม' : 'Exit Application')}</option>
                          </select>
                      </div>
                  </div>
              )}

              {/* Graphics Tab (Now Game Graphics) */}
              {activeTab === 'graphics' && (
                  <div style={{ animation: 'fadeIn 0.3s' }}>
                      <h3 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--text-primary)' }}>{t('settings.gameGraphics') || 'Game Graphics'}</h3>
                      
                      {/* Resolution */}
                      <div style={{ marginBottom: '25px' }}>
                          <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-secondary)' }}>{t('settings.resolution') || 'Screen Resolution'}</label>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)', marginBottom: '5px' }}>{t('settings.width') || 'Width'}</div>
                                  <input 
                                    type="number" 
                                    value={resolutionWidth} 
                                    onChange={(e) => setResolutionWidth(Number(e.target.value))}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        background: 'var(--input-bg)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '4px',
                                        color: 'var(--text-primary)',
                                        textAlign: 'center'
                                    }}
                                  />
                              </div>
                              <span style={{ color: 'var(--text-secondary)', marginTop: '20px' }}>x</span>
                              <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)', marginBottom: '5px' }}>{t('settings.height') || 'Height'}</div>
                                  <input 
                                    type="number" 
                                    value={resolutionHeight} 
                                    onChange={(e) => setResolutionHeight(Number(e.target.value))}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        background: 'var(--input-bg)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '4px',
                                        color: 'var(--text-primary)',
                                        textAlign: 'center'
                                    }}
                                  />
                              </div>
                          </div>
                      </div>

                      {/* Fullscreen Toggle */}
                      <div style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <label style={{ display: 'block', color: 'var(--text-secondary)', fontWeight: 'bold' }}>{t('settings.fullscreen') || 'Fullscreen'}</label>
                        </div>
                        <div 
                            onClick={() => setFullscreen(!fullscreen)}
                            style={{
                                width: '50px',
                                height: '26px',
                                background: fullscreen ? 'var(--accent)' : 'var(--input-bg)',
                                borderRadius: '13px',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'background 0.3s'
                            }}
                        >
                            <div style={{
                                width: '20px',
                                height: '20px',
                                background: 'var(--text-primary)',
                                borderRadius: '50%',
                                position: 'absolute',
                                top: '3px',
                                left: fullscreen ? '27px' : '3px',
                                transition: 'left 0.3s'
                            }} />
                        </div>
                      </div>
                  </div>
              )}

              {/* Account Tab */}
              {activeTab === 'account' && (
                  <div style={{ animation: 'fadeIn 0.3s' }}>
                      <h3 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', color: 'var(--text-primary)' }}>{t('settings.account')}</h3>
                      
                      {/* Account List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                           {loadingAccounts && (
                               <div style={{ padding: '10px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                   {t('settings.loadingAccounts') || 'Loading accounts...'}
                               </div>
                           )}

                           {/* Compute display accounts to ensure current user is always shown */}
                           {(() => {
                               let displayAccounts = [...accounts];
                               if (user && !loadingAccounts) {
                                   const exists = displayAccounts.find(a => a.uuid === user.id);
                                   if (!exists) {
                                       // Virtual entry for current legacy user
                                       displayAccounts.unshift({
                                           uuid: user.id,
                                           name: user.name,
                                           active: true
                                       });
                                   }
                               }

                               if (!loadingAccounts && displayAccounts.length === 0 && user) {
                                   // Should not happen due to above logic, but fallback
                                    return (
                                       <div style={{ padding: '10px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                           {t('settings.noAccounts') || 'No accounts found.'}
                                       </div>
                                   )
                               }

                               if (!loadingAccounts && displayAccounts.length === 0 && !user) {
                                    return (
                                       <div style={{ padding: '10px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                           {t('settings.noAccounts') || 'No accounts found.'}
                                       </div>
                                   )
                               }

                               return !loadingAccounts && displayAccounts.map(acc => {
                                   const isActive = user && user.id === acc.uuid;
                                   return (
                                       <div key={acc.uuid} style={{ 
                        display: 'flex', alignItems: 'center', gap: '15px', 
                        background: 'var(--card-bg)', 
                        border: isActive ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                        padding: '10px', borderRadius: '8px' 
                    }}>
                                           {/* Avatar */}
                                           <div style={{ 
                                                width: '40px', height: '40px', borderRadius: '50%', 
                                                backgroundImage: `url(https://minotar.net/avatar/${acc.name}/50.png)`,
                                                backgroundSize: 'cover', backgroundColor: 'var(--input-bg)'
                                           }} />
                                           
                                           {/* Info */}
                                           <div style={{ flex: 1 }}>
                                               <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{acc.name}</div>
                                               <div style={{ fontSize: '0.8em', color: isActive ? 'var(--success)' : 'var(--text-secondary)' }}>
                                                   {isActive ? '● ' + (t('settings.active') || 'Active') : (t('settings.inactive') || 'Inactive')}
                                               </div>
                                           </div>
                                           
                                           {/* Actions */}
                                           {!isActive && (
                                               <button 
                                                   onClick={() => { onSwitchAccount(acc.uuid); onClose(); }}
                                                   style={{ 
                                                       padding: '6px 12px', background: 'var(--accent)', color: 'var(--main-bg)', 
                                                       border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em', fontWeight: 'bold' 
                                                   }}
                                               >
                                                   {t('settings.switch') || 'Switch'}
                                               </button>
                                           )}

                                           <button 
                                               onClick={async (e) => {
                                                   e.stopPropagation();
                                                   if (window.confirm(t('settings.confirmRemoveAccount') || 'Remove this account?')) {
                                                       if (window.api && window.api.removeAccount) {
                                                           await window.api.removeAccount(acc.uuid);
                                                           if (window.api.getAccounts) {
                                                               window.api.getAccounts().then(setAccounts);
                                                           }
                                                           // If removing active account, logout
                                                           if (isActive) {
                                                               onLogout();
                                                           }
                                                       }
                                                   }
                                               }}
                                               style={{ 
                                                   width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                   background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', opacity: 0.7 
                                               }}
                                               title={t('settings.removeAccount') || 'Remove Account'}
                                               onMouseOver={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.opacity = 1; }}
                                               onMouseOut={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.opacity = 0.7; }}
                                           >
                                               ✕
                                           </button>
                                       </div>
                                   )
                               })
                           })()}
                      </div>

                      {/* Add Account Button */}
                      <button 
                          onClick={() => { onSwitchAccount(); onClose(); }} // No UUID means add/login new
                          style={{ 
                              width: '100%', padding: '12px', 
                              background: 'var(--input-bg)', border: '1px dashed var(--text-secondary)', borderRadius: '6px', 
                              color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
                              transition: 'all 0.2s'
                          }}
                          onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                          onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--text-secondary)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                      >
                          <span style={{ fontSize: '1.2em' }}>+</span>
                          <span>{t('settings.addAccount') || 'Add Account'}</span>
                      </button>

                      <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                           <button 
                             onClick={handleLogoutClick}
                             style={{ 
                                 width: '100%', padding: '12px', background: 'rgba(255, 0, 0, 0.1)', border: '1px solid var(--danger)', borderRadius: '6px', 
                                 color: 'var(--danger)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px',
                                 transition: 'background 0.2s'
                             }}
                             onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 0, 0, 0.2)'}
                             onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)'}
                           >
                               <span>{t('settings.signOut')}</span>
                               <span style={{ fontSize: '1.2em' }}>⏻</span>
                           </button>
                      </div>
                  </div>
              )}

              {/* Redeem Tab */}
              {activeTab === 'redeem' && (
                  <div style={{ animation: 'fadeIn 0.3s' }}>
                      <h3 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>{t('settings.redeemCode')}</h3>
                      
                      <p style={{ color: 'var(--text-secondary)', marginTop: 0, marginBottom: '20px', fontSize: '0.9em' }}>
                          {t('settings.enterCodeDesc')}
                      </p>

                      <form onSubmit={handleRedeemSubmit} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                          <input 
                              type="text" 
                              value={redeemInput} 
                              onChange={(e) => { setRedeemInput(e.target.value); setRedeemError('') }} 
                              placeholder={t('settings.enterCodePlaceholder')}
                              style={{
                                  flex: 1,
                                  padding: '12px 16px',
                                  background: 'var(--input-bg)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '8px',
                                  color: 'var(--text-primary)',
                                  outline: 'none',
                                  fontSize: '1em'
                              }}
                          />
                          <button 
                              type="submit"
                              disabled={!redeemInput.trim()}
                              style={{
                                  padding: '0 20px',
                                  background: redeemInput.trim() ? 'var(--accent)' : 'var(--input-bg)',
                                  color: redeemInput.trim() ? 'var(--main-bg)' : 'var(--text-secondary)',
                                  border: 'none',
                                  borderRadius: '8px',
                                  cursor: redeemInput.trim() ? 'pointer' : 'default',
                                  fontWeight: '600',
                                  transition: 'all 0.2s'
                              }}
                          >
                              {t('settings.add')}
                          </button>
                      </form>
                      
                      {redeemError && <div style={{ color: 'var(--danger)', fontSize: '0.85em', marginTop: '-15px', marginBottom: '15px' }}>{redeemError}</div>}

                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                          <h4 style={{ color: 'var(--text-primary)', margin: '0 0 10px 0', fontSize: '0.9em', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7 }}>{t('settings.activeCodes')}</h4>
                          
                          {redeemedCodes.length === 0 ? (
                              <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9em', padding: '10px 0' }}>{t('settings.noCodes')}</div>
                          ) : (
                              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                  {redeemedCodes.map(c => (
                                      <div key={c} style={{ 
                                          display: 'flex', 
                                          justifyContent: 'space-between', 
                                          alignItems: 'center',
                                          padding: '10px',
                                          background: 'var(--card-bg)',
                                          borderRadius: '6px',
                                          marginBottom: '8px',
                                          border: '1px solid var(--border-color)'
                                      }}>
                                          <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '1.1em' }}>{c}</span>
                                          <button 
                                              onClick={() => onRemoveCode(c)}
                                              style={{
                                                  background: 'transparent',
                                                  border: 'none',
                                                  color: 'var(--danger)',
                                                  cursor: 'pointer',
                                                  padding: '5px',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  opacity: 0.7,
                                                  transition: 'opacity 0.2s'
                                              }}
                                              onMouseOver={(e) => e.target.style.opacity = 1}
                                              onMouseOut={(e) => e.target.style.opacity = 0.7}
                                              title="Remove code"
                                          >
                                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                              </svg>
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
              )}



              {/* Footer Actions */}
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                  <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-secondary)', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}>{t('settings.cancel')}</button>
                  <button onClick={save} style={{ background: 'var(--accent)', color: 'var(--main-bg)', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>{t('settings.save')}</button>
              </div>

              {/* Logout Confirmation Overlay */}
              {showLogoutConfirm && (
                  <div style={{ 
                      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)', 
                      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                      animation: 'fadeIn 0.2s', zIndex: 10
                  }}>
                      <div style={{ fontSize: '1.1em', marginBottom: '20px' }}>{t('settings.signOutConfirm')}</div>
                      <div style={{ display: 'flex', gap: '15px' }}>
                          <button 
                            onClick={() => setShowLogoutConfirm(false)}
                            style={{ padding: '8px 20px', background: 'var(--input-bg)', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
                          >
                              {t('settings.cancel')}
                          </button>
                          <button 
                            onClick={confirmLogout}
                            style={{ padding: '8px 20px', background: 'var(--danger)', border: 'none', borderRadius: '4px', color: 'var(--text-primary)', cursor: 'pointer' }}
                          >
                              {t('settings.signOut')}
                          </button>
                      </div>
                  </div>
              )}

              {/* Repair Confirmation Modal */}
              {showRepairModal && (
                  <RepairConfirmationModal
                      instanceName={selectedInstance?.name || 'Game'}
                      actionName="Repair"
                      t={t}
                      onCancel={() => setShowRepairModal(false)}
                      onConfirm={async () => {
                          setShowRepairModal(false)
                          try {
                              if (window.api && window.api.repairInstance) {
                                  showToast(currentLanguage === 'th' ? 'กำลังซ่อมแซม...' : 'Repairing...', 'info')
                                  const result = await window.api.repairInstance(selectedInstance)
                                  if (result.success) {
                                      showToast(currentLanguage === 'th' ? 'ซ่อมแซมเสร็จสิ้น! กรุณากดเข้าเกมใหม่' : 'Repair successful! Please launch the game.', 'success')
                                  } else {
                                      showToast((currentLanguage === 'th' ? 'ซ่อมแซมล้มเหลว: ' : 'Repair failed: ') + result.error, 'error')
                                  }
                              } else {
                                  console.error("repairInstance API not available")
                              }
                          } catch (e) {
                              showToast('Error: ' + e.message, 'error')
                          }
                      }}
                  />
              )}

          </div>
       </div>
       <style>{`
         @keyframes fadeIn {
             from { opacity: 0; transform: scale(0.95); }
             to { opacity: 1; transform: scale(1); }
         }
         
         /* Custom Range Slider */
         .ram-slider {
            -webkit-appearance: none;
            width: 100%;
            height: 6px;
            border-radius: 5px;
            background: var(--input-bg);
            outline: none;
            transition: background 0.2s;
         }
         
         .ram-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: var(--accent);
            cursor: pointer;
            border: 2px solid var(--card-bg);
            transition: transform 0.1s;
         }
         
         .ram-slider::-webkit-slider-thumb:hover {
            transform: scale(1.2);
         }
       `}</style>
    </div>
  )
}
export default Settings
