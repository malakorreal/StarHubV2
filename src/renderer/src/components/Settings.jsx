import React, { useEffect, useState } from 'react'
import RepairConfirmationModal from './RepairConfirmationModal'

function Settings({ onClose, onLogout, onSwitchAccount, user, redeemedCodes = [], onAddCode, onRemoveCode, t, changeLanguage, currentLanguage, showToast, selectedInstance }) {
  const [activeTab, setActiveTab] = useState('general')
  const [ram, setRam] = useState(4096)
  const [javaArgs, setJavaArgs] = useState('')
  const [autoJoin, setAutoJoin] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showRepairModal, setShowRepairModal] = useState(false)
  const [redeemInput, setRedeemInput] = useState('')
  const [redeemError, setRedeemError] = useState('')
  const [resolutionWidth, setResolutionWidth] = useState(854)
  const [resolutionHeight, setResolutionHeight] = useState(480)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    if (window.api && window.api.getSettings) {
        window.api.getSettings().then(s => {
            if (s && s.ram) setRam(s.ram)
            if (s && s.javaArgs) setJavaArgs(s.javaArgs)
            if (s && typeof s.autoJoin !== 'undefined') setAutoJoin(s.autoJoin)
            if (s && s.resolution) {
                setResolutionWidth(s.resolution.width || 854)
                setResolutionHeight(s.resolution.height || 480)
            }
            if (s && typeof s.fullscreen !== 'undefined') setFullscreen(s.fullscreen)
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
            fullscreen
        })
      }
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

  const confirmLogout = () => {
      onLogout()
      onClose()
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(5px)', willChange: 'opacity, transform' }}>
       <div style={{ background: '#222', borderRadius: '12px', width: '600px', height: '480px', display: 'flex', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          
          {/* Sidebar */}
          <div style={{ width: '180px', background: '#2a2a2a', padding: '20px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ marginBottom: '20px', fontWeight: 'bold', fontSize: '1.2em', color: '#fff' }}>{t('settings.title')}</div>
              
              <button 
                onClick={() => setActiveTab('general')}
                style={{ 
                    textAlign: 'left', 
                    padding: '10px 15px', 
                    background: activeTab === 'general' ? 'var(--accent)' : 'transparent', 
                    color: activeTab === 'general' ? '#000' : '#aaa', 
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
                onClick={() => setActiveTab('graphics')}
                style={{ 
                    textAlign: 'left', 
                    padding: '10px 15px', 
                    background: activeTab === 'graphics' ? 'var(--accent)' : 'transparent', 
                    color: activeTab === 'graphics' ? '#000' : '#aaa', 
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
                    color: activeTab === 'account' ? '#000' : '#aaa', 
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
                    color: activeTab === 'redeem' ? '#000' : '#aaa', 
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
                      <h3 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid #444', paddingBottom: '10px' }}>{t('settings.general')}</h3>
                      
                      {/* RAM Allocation */}
                      <div style={{ marginBottom: '25px' }}>
                          <label style={{ display: 'block', marginBottom: '10px', color: '#ccc' }}>{t('settings.ramAllocation')}: <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{ram} MB</span></label>
                          <input 
                            type="range" 
                            min="1024" 
                            max="16384" 
                            step="512" 
                            value={ram} 
                            onChange={e => setRam(Number(e.target.value))}
                            className="ram-slider"
                            style={{ width: '100%', cursor: 'pointer', margin: '10px 0' }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8em', color: '#666', marginTop: '5px' }}>
                              <span>1 GB</span>
                              <span>16 GB</span>
                          </div>
                      </div>

                      {/* Java Arguments */}
                      <div style={{ marginBottom: '25px' }}>
                        <label style={{ display: 'block', marginBottom: '10px', color: '#ccc' }}>{t('settings.javaArgs')}</label>
                        <input
                            type="text"
                            value={javaArgs}
                            onChange={(e) => setJavaArgs(e.target.value)}
                            placeholder="-XX:+UseG1GC -Xmx4G"
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: '#333',
                                border: '1px solid #444',
                                borderRadius: '4px',
                                color: '#fff',
                                fontFamily: 'monospace'
                            }}
                        />
                      </div>

                      {/* Auto Join Toggle */}
                      <div style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label style={{ color: '#ccc' }}>{t('settings.autoJoin') || 'Auto Join Server'}</label>
                        <div 
                            onClick={() => setAutoJoin(!autoJoin)}
                            style={{
                                width: '50px',
                                height: '26px',
                                background: autoJoin ? 'var(--accent)' : '#444',
                                borderRadius: '13px',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'background 0.3s'
                            }}
                        >
                            <div style={{
                                width: '20px',
                                height: '20px',
                                background: '#fff',
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
                          <div style={{ marginBottom: '25px' }}>
                              <label style={{ display: 'block', marginBottom: '10px', color: '#ccc' }}>{t('settings.troubleshoot') || 'Troubleshoot'}</label>
                              <button
                                  onClick={() => setShowRepairModal(true)}
                                  style={{
                                      width: '100%',
                                      padding: '10px',
                                      background: '#d9534f',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontWeight: 'bold',
                                      transition: 'background 0.2s'
                                  }}
                                  onMouseOver={(e) => e.target.style.background = '#c9302c'}
                                  onMouseOut={(e) => e.target.style.background = '#d9534f'}
                              >
                                  {t('settings.repairGame') || (currentLanguage === 'th' ? 'ซ่อมแซมไฟล์เกม (แก้เกมเด้ง)' : 'Repair Game Files')}
                              </button>
                              <div style={{ fontSize: '0.8em', color: '#888', marginTop: '5px' }}>
                                  {t('settings.repairDesc') || (currentLanguage === 'th' ? 'ใช้เมื่อเข้าเกมไม่ได้ หรือไฟล์ไม่ครบ' : 'Use this if game crashes on startup.')}
                              </div>
                          </div>
                      )}

                      {/* Language Selection */}
                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '10px', color: '#ccc' }}>{t('settings.language')}</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => changeLanguage('th')}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: currentLanguage === 'th' ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                                    color: currentLanguage === 'th' ? '#000' : '#fff',
                                    border: '1px solid',
                                    borderColor: currentLanguage === 'th' ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
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
                                    background: currentLanguage === 'en' ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                                    color: currentLanguage === 'en' ? '#000' : '#fff',
                                    border: '1px solid',
                                    borderColor: currentLanguage === 'en' ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
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
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #444' }}>
                        <label style={{ display: 'block', marginBottom: '10px', color: '#ff4d4d', fontWeight: 'bold' }}>{t('settings.troubleshoot') || 'Troubleshoot'}</label>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ fontSize: '0.9em', color: '#ccc', maxWidth: '70%' }}>
                                {t('settings.resetDesc') || 'Reset all settings to default'}
                            </div>
                            <button
                                onClick={handleReset}
                                style={{
                                    padding: '8px 15px',
                                    background: 'transparent',
                                    border: '1px solid #ff4d4d',
                                    color: '#ff4d4d',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.9em',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => { e.target.style.background = '#ff4d4d'; e.target.style.color = '#fff' }}
                                onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#ff4d4d' }}
                            >
                                {t('settings.reset') || 'Reset'}
                            </button>
                        </div>
                    </div>
                  </div>
              )}

              {/* Graphics Tab (Now Game Graphics) */}
              {activeTab === 'graphics' && (
                  <div style={{ animation: 'fadeIn 0.3s' }}>
                      <h3 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid #444', paddingBottom: '10px' }}>{t('settings.gameGraphics') || 'Game Graphics'}</h3>
                      
                      {/* Resolution */}
                      <div style={{ marginBottom: '25px' }}>
                          <label style={{ display: 'block', marginBottom: '10px', color: '#ccc' }}>{t('settings.resolution') || 'Screen Resolution'}</label>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '0.8em', color: '#888', marginBottom: '5px' }}>{t('settings.width') || 'Width'}</div>
                                  <input 
                                    type="number" 
                                    value={resolutionWidth} 
                                    onChange={(e) => setResolutionWidth(Number(e.target.value))}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        background: '#333',
                                        border: '1px solid #444',
                                        borderRadius: '4px',
                                        color: '#fff',
                                        textAlign: 'center'
                                    }}
                                  />
                              </div>
                              <span style={{ color: '#888', marginTop: '20px' }}>x</span>
                              <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '0.8em', color: '#888', marginBottom: '5px' }}>{t('settings.height') || 'Height'}</div>
                                  <input 
                                    type="number" 
                                    value={resolutionHeight} 
                                    onChange={(e) => setResolutionHeight(Number(e.target.value))}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        background: '#333',
                                        border: '1px solid #444',
                                        borderRadius: '4px',
                                        color: '#fff',
                                        textAlign: 'center'
                                    }}
                                  />
                              </div>
                          </div>
                      </div>

                      {/* Fullscreen Toggle */}
                      <div style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <label style={{ display: 'block', color: '#ccc', fontWeight: 'bold' }}>{t('settings.fullscreen') || 'Fullscreen'}</label>
                        </div>
                        <div 
                            onClick={() => setFullscreen(!fullscreen)}
                            style={{
                                width: '50px',
                                height: '26px',
                                background: fullscreen ? 'var(--accent)' : '#444',
                                borderRadius: '13px',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'background 0.3s'
                            }}
                        >
                            <div style={{
                                width: '20px',
                                height: '20px',
                                background: '#fff',
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
                      <h3 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid #444', paddingBottom: '10px' }}>{t('settings.account')}</h3>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px', background: '#333', padding: '15px', borderRadius: '8px' }}>
                          <div style={{ 
                              width: '60px', height: '60px', 
                              background: '#444', borderRadius: '50%', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '24px', color: '#aaa',
                              backgroundImage: `url(https://minotar.net/avatar/${user?.name || 'steve'}/100.png)`,
                              backgroundSize: 'cover'
                          }}>
                              {!user && '?'}
                          </div>
                          <div>
                              <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{user?.name || t('auth.guest')}</div>
                              <div style={{ fontSize: '0.9em', color: '#4caf50' }}>● {t('settings.online')}</div>
                              <div style={{ fontSize: '0.8em', color: '#888', marginTop: '4px', userSelect: 'text', fontFamily: 'monospace' }}>
                                  UUID: {user?.id || 'N/A'}
                              </div>
                          </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <button 
                            onClick={() => { onSwitchAccount(); onClose(); }}
                            style={{ 
                                padding: '12px', background: '#444', border: 'none', borderRadius: '6px', 
                                color: 'white', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                transition: 'background 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = '#555'}
                            onMouseOut={e => e.currentTarget.style.background = '#444'}
                          >
                              <span>{t('settings.switchAccount')}</span>
                              <span style={{ fontSize: '1.2em' }}>⇄</span>
                          </button>

                          <button 
                            onClick={handleLogoutClick}
                            style={{ 
                                padding: '12px', background: 'rgba(232, 17, 35, 0.1)', border: '1px solid rgba(232, 17, 35, 0.3)', borderRadius: '6px', 
                                color: '#ff4d4d', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                marginTop: '10px', transition: 'all 0.2s'
                            }}
                            onMouseOver={e => {
                                e.currentTarget.style.background = 'rgba(232, 17, 35, 0.2)'
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.background = 'rgba(232, 17, 35, 0.1)'
                            }}
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
                      <h3 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid #444', paddingBottom: '10px' }}>{t('settings.redeemCode')}</h3>
                      
                      <p style={{ color: '#ccc', marginTop: 0, marginBottom: '20px', fontSize: '0.9em' }}>
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
                                  background: 'rgba(0,0,0,0.3)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: '8px',
                                  color: 'white',
                                  outline: 'none',
                                  fontSize: '1em'
                              }}
                          />
                          <button 
                              type="submit"
                              disabled={!redeemInput.trim()}
                              style={{
                                  padding: '0 20px',
                                  background: redeemInput.trim() ? '#ffd700' : 'rgba(255,255,255,0.1)',
                                  color: redeemInput.trim() ? '#000' : '#555',
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
                      
                      {redeemError && <div style={{ color: '#ff6b6b', fontSize: '0.85em', marginTop: '-15px', marginBottom: '15px' }}>{redeemError}</div>}

                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
                          <h4 style={{ color: '#fff', margin: '0 0 10px 0', fontSize: '0.9em', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7 }}>{t('settings.activeCodes')}</h4>
                          
                          {redeemedCodes.length === 0 ? (
                              <div style={{ color: '#666', fontStyle: 'italic', fontSize: '0.9em', padding: '10px 0' }}>{t('settings.noCodes')}</div>
                          ) : (
                              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                  {redeemedCodes.map(c => (
                                      <div key={c} style={{ 
                                          display: 'flex', 
                                          justifyContent: 'space-between', 
                                          alignItems: 'center',
                                          padding: '10px',
                                          background: 'rgba(255,255,255,0.05)',
                                          borderRadius: '6px',
                                          marginBottom: '8px',
                                          border: '1px solid rgba(255,255,255,0.05)'
                                      }}>
                                          <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '1.1em' }}>{c}</span>
                                          <button 
                                              onClick={() => onRemoveCode(c)}
                                              style={{
                                                  background: 'transparent',
                                                  border: 'none',
                                                  color: '#ff6b6b',
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
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #333', paddingTop: '20px' }}>
                  <button onClick={onClose} style={{ background: 'transparent', color: '#ccc', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}>{t('settings.cancel')}</button>
                  <button onClick={save} style={{ background: 'var(--accent)', color: 'black', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>{t('settings.save')}</button>
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
                            style={{ padding: '8px 20px', background: '#444', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
                          >
                              {t('settings.cancel')}
                          </button>
                          <button 
                            onClick={confirmLogout}
                            style={{ padding: '8px 20px', background: '#e81123', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}
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
                              if (window.api && window.api.invoke) {
                                  showToast(currentLanguage === 'th' ? 'กำลังซ่อมแซม...' : 'Repairing...', 'info')
                                  const result = await window.api.invoke('repair-game', selectedInstance.id)
                                  if (result.success) {
                                      showToast(currentLanguage === 'th' ? 'ซ่อมแซมเสร็จสิ้น! กรุณากดเข้าเกมใหม่' : 'Repair successful! Please launch the game.', 'success')
                                  } else {
                                      showToast((currentLanguage === 'th' ? 'ซ่อมแซมล้มเหลว: ' : 'Repair failed: ') + result.error, 'error')
                                  }
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
            background: #444;
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
            border: 2px solid #222;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
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
