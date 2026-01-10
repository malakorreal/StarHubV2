import React, { memo, useState, useEffect, useMemo } from 'react'

const MainContent = memo(({ instance, installedVersion, status, progress, onLaunch, onCancel, onOpenSettings, onOpenFolder, onRepair, onOpenConsole, user, paused, t }) => {
  const [bgLoaded, setBgLoaded] = useState(false)
  const [serverStatus, setServerStatus] = useState(null)

  // Check update status
  const isUpdateAvailable = useMemo(() => {
      // Prioritize modpackVersion if available, otherwise use version (MC version)
      const currentRemoteVersion = instance?.modpackVersion || instance?.version
      
      if (!currentRemoteVersion) return false
      if (!installedVersion) return false 
      
      return installedVersion !== currentRemoteVersion
  }, [instance, installedVersion])

  const isMaintenance = instance?.maintenance === true

  // Fetch Server Status
  useEffect(() => {
      let mounted = true
      setServerStatus(null) // Reset on instance change

      if (instance?.serverIp) {
          window.api.getServerStatus(instance.serverIp).then(status => {
              if (mounted) setServerStatus(status)
          })
      }

      return () => { mounted = false }
  }, [instance?.serverIp])

  // Generate random cubes configuration once
  const cubes = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => ({
        left: `${(i * 100 / 12) + (Math.random() * 10 - 5)}%`, // Spread evenly with some randomness
        animationDelay: `-${Math.random() * 20}s`, // Random start time
        animationDuration: `${20 + Math.random() * 15}s`, // Slower speed (20-35s)
        size: `${30 + Math.random() * 40}px`, // Larger size (30-70px)
        opacity: Math.random() * 0.2 + 0.05 // Lower opacity for better performance
    }))
  }, [])

  useEffect(() => {
    setBgLoaded(false)
    if (instance?.backgroundImage) {
        const img = new Image()
        img.src = instance.backgroundImage
        img.onload = () => setBgLoaded(true)
    }
  }, [instance?.backgroundImage])

  if (!instance) return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#111' }}>
      <div className="cube" style={{ left: '10%' }}></div>
      <div className="cube" style={{ left: '30%', animationDelay: '-5s' }}></div>
      <div className="cube" style={{ left: '70%', animationDelay: '-10s' }}></div>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#666', fontSize: '1.5em' }}>
        {t('main.selectInstance')}
      </div>
    </div>
  )

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#111' }}>
      {/* Background Image with Transition */}
      <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: (bgLoaded && instance.backgroundImage) ? `url(${instance.backgroundImage})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: bgLoaded ? 1 : 0,
          transition: 'opacity 0.5s ease-in-out',
          zIndex: 0,
          transform: 'translateZ(0)', // Force GPU layer
          willChange: 'opacity'
      }}></div>

      {/* Overlay */}
      <div style={{ 
          position: 'absolute', inset: 0, 
          background: instance.backgroundImage ? 'linear-gradient(to right, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0.3) 100%)' : 'transparent',
          zIndex: 1,
          pointerEvents: 'none' // Let clicks pass through if needed, optimize hit testing
      }}></div>

      {/* Floating Cubes Animation (Always Visible) */}
      {!paused && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', overflow: 'hidden' }}>
              {cubes.map((style, i) => (
                  <div 
                      key={i} 
                      className="cube" 
                      style={{ 
                          left: style.left,
                          width: style.size,
                          height: style.size,
                          animationDelay: style.animationDelay,
                          animationDuration: style.animationDuration,
                          opacity: style.opacity,
                          willChange: 'transform, opacity' // Optimize rendering
                      }}
                  ></div>
              ))}
          </div>
      )}

      {/* Logo (Top Left) */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '40px',
        zIndex: 10,
        animation: 'fadeIn 0.5s ease-out'
      }}>
        {instance.logo ? (
            <img 
                src={instance.logo} 
                alt={instance.name} 
                style={{ 
                    height: '420px',
                    maxWidth: '900px',
                    objectFit: 'contain', 
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                    willChange: 'transform'
                }} 
            />
        ) : (
            <h1 style={{ 
                margin: 0, 
                color: '#fff', 
                fontSize: '4em', 
                fontWeight: '800', 
                textShadow: '0 4px 8px rgba(0,0,0,0.3)',
                lineHeight: 1.1
            }}>
                {instance.name}
            </h1>
        )}
      </div>

      {/* Header */}
      <div style={{ position: 'absolute', top: '40px', right: '40px', display: 'flex', alignItems: 'center', gap: '15px', zIndex: 10 }}>
        <div style={{ textAlign: 'right' }}>
           <div style={{ fontWeight: 'bold', fontSize: '1.1em', color: '#fff' }}>{user ? user.name : t('auth.guest')}</div>
           <div 
             onClick={onOpenSettings}
             style={{ fontSize: '0.9em', color: '#ccc', cursor: 'pointer', opacity: 0.8, transition: 'opacity 0.2s' }}
             onMouseOver={(e) => e.target.style.opacity = 1}
             onMouseOut={(e) => e.target.style.opacity = 0.8}
           >
             {t('settings.title')}
           </div>
        </div>
        <img 
            src={`https://minotar.net/helm/${user ? user.name : 'Steve'}/100.png`} 
            alt="Skin" 
            style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px solid var(--accent)' }}
        />
      </div>

      {/* Right Panel: Description & Announcement */}
      <div style={{
        position: 'absolute',
        top: '110px',
        right: '40px',
        width: '320px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '20px',
        zIndex: 10,
        animation: 'fadeIn 0.5s ease-out',
        textAlign: 'right'
      }}>
        {/* Description */}
        <div>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2em', fontWeight: 'bold', marginBottom: '8px' }}>
                {t('main.serverInfo')}
            </h3>

            {serverStatus && serverStatus.online && (
                 <div style={{ 
                    marginBottom: '10px', 
                    padding: '8px 12px', 
                    background: 'rgba(50, 255, 100, 0.1)', 
                    border: '1px solid rgba(50, 255, 100, 0.3)', 
                    borderRadius: '6px', 
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: 'fit-content'
                }}>
                    <span style={{ fontSize: '0.9em', color: '#69f0ae' }}>Online ({serverStatus.players.online}/{serverStatus.players.max})</span>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00e676', boxShadow: '0 0 5px #00e676' }}></div>
                </div>
            )}
             
            {serverStatus && !serverStatus.online && instance.serverIp && (
                 <div style={{ 
                    marginBottom: '10px', 
                    padding: '8px 12px', 
                    background: 'rgba(255, 50, 50, 0.2)', 
                    border: '1px solid rgba(255, 50, 50, 0.4)', 
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: 'fit-content'
                }}>
                    <span style={{ fontSize: '0.9em', color: '#ff8a80' }}>Offline</span>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff1744' }}></div>
                </div>
            )}

            <p style={{ margin: 0, color: '#ccc', fontSize: '0.95em', lineHeight: '1.5' }}>
                {instance.description || t('main.readyToPlay')}
            </p>
        </div>

        {/* Announcement */}
        {((instance.announcement && instance.announcement.trim().length > 0) || (instance.announcementImage && instance.announcementImage.trim().length > 0)) && (
            <div style={{
                background: 'rgba(255, 215, 0, 0.05)',
                borderRight: '4px solid var(--accent)',
                padding: '15px',
                borderRadius: '8px',
                backdropFilter: 'blur(4px)',
                width: '100%',
                marginTop: '10px',
                maxHeight: '300px',
                overflowY: 'auto',
                scrollbarWidth: 'thin'
            }}>
                <h4 style={{ margin: '0 0 5px 0', color: 'var(--accent)', fontSize: '0.9em', textTransform: 'uppercase' }}>
                    {t('main.announcement')}
                </h4>
                
                {instance.announcementImage && instance.announcementImage.trim().length > 0 && (
                    <img 
                        src={instance.announcementImage} 
                        alt="Announcement" 
                        onError={(e) => e.target.style.display = 'none'}
                        style={{ 
                            width: '100%', 
                            borderRadius: '4px', 
                            marginBottom: (instance.announcement && instance.announcement.trim().length > 0) ? '10px' : '0',
                            objectFit: 'cover',
                            display: 'block'
                        }} 
                    />
                )}

                {instance.announcement && instance.announcement.trim().length > 0 && (
                    <p style={{ margin: 0, color: '#eee', fontSize: '0.9em', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {instance.announcement}
                    </p>
                )}
            </div>
        )}
      </div>

      {/* Play & Social (Bottom Right) */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        right: '40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '20px',
        zIndex: 10
      }}>
        {/* Social Icons Row */}
        <div style={{ display: 'flex', gap: '15px' }}>
            {/* Console Button - Always visible for debugging */}
            <button
                onClick={onOpenConsole}
                title="Game Console"
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '50px', height: '50px', borderRadius: '50%',
                    background: 'rgba(0,0,0,0.5)', color: '#fff',
                    border: '1px solid rgba(255,255,255,0.2)',
                    transition: 'transform 0.2s',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                    cursor: 'pointer'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 17 10 11 4 5"></polyline>
                    <line x1="12" y1="19" x2="20" y2="19"></line>
                </svg>
            </button>

            {/* Discord */}
            {instance.discord && instance.discord.trim().length > 0 && (
                <a href={instance.discord} target="_blank" rel="noopener noreferrer" 
                   style={{ 
                       display: 'flex', alignItems: 'center', justifyContent: 'center',
                       width: '50px', height: '50px', borderRadius: '50%',
                       background: '#5865F2', color: '#fff', 
                       transition: 'transform 0.2s',
                       boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                       textDecoration: 'none'
                   }}
                   onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                   onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                   title="Join Discord"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z"/>
                    </svg>
                </a>
            )}
            
            {/* Website */}
            {instance.website && instance.website.trim().length > 0 && (
                <a href={instance.website} target="_blank" rel="noopener noreferrer"
                   style={{
                       display: 'flex', alignItems: 'center', justifyContent: 'center',
                       width: '50px', height: '50px', borderRadius: '50%',
                       background: 'rgba(255,255,255,0.1)', color: '#fff',
                       border: '1px solid rgba(255,255,255,0.2)',
                       transition: 'transform 0.2s',
                       boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                       textDecoration: 'none'
                   }}
                   onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                   onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                   title="Website"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                </a>
            )}
        </div>

        {/* Play Button Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {status !== 'idle' && (
                <button
                    onClick={onCancel}
                    title={t('main.cancel') || "Cancel"}
                    style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '12px',
                        background: '#333',
                        color: '#ff6b6b',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        animation: 'fadeIn 0.3s ease-out'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#444'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = '#333'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            )}

            <button
                    onClick={isMaintenance ? null : (isUpdateAvailable ? onRepair : onLaunch)}
                    disabled={status !== 'idle' || isMaintenance}
                    style={{
                        padding: '12px 40px',
                        minWidth: '220px',
                        minHeight: '64px',
                        fontSize: '1.2em',
                        fontWeight: '600',
                        background: status === 'idle' ? (isMaintenance ? '#2d2d2d' : isUpdateAvailable ? '#e67e22' : 'var(--accent)') : '#333', // Orange for Update, Dark for Maintenance
                        color: status === 'idle' ? (isMaintenance ? '#666' : isUpdateAvailable ? '#fff' : '#000') : '#fff',
                        border: isMaintenance ? '1px solid #444' : 'none',
                        borderRadius: '12px',
                        cursor: (status === 'idle' && !isMaintenance) ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        letterSpacing: '0.5px',
                        boxShadow: isMaintenance ? 'none' : '0 4px 15px rgba(0,0,0,0.3)'
                    }}
                    onMouseOver={(e) => { if (status === 'idle' && !isMaintenance) { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                    onMouseOut={(e) => { if (status === 'idle' && !isMaintenance) { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.transform = 'translateY(0)'; } }}
                >
                    {status === 'idle' ? (
                        <>
                            {isMaintenance ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                            ) : isUpdateAvailable ? (
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                            ) : (
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8 5V19L19 12L8 5Z" fill="black"/>
                                </svg>
                            )}
                            {isMaintenance ? (instance.maintenance_message || t('main.maintenance') || "Maintenance") : isUpdateAvailable ? t('main.update') : t('main.play')}
                        </>
                    ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="spinner" style={{ width: 20, height: 20, border: '3px solid rgba(255, 215, 0, 0.2)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                            <span>{status === 'launching' ? t('main.launching') : status === 'repairing' ? t('main.repairing') : status === 'preparing' ? t('main.preparing') : t('main.running')}</span>
                        </div>
                        {(status === 'launching' || status === 'repairing' || status === 'preparing') && progress && (
                            <div style={{ fontSize: '0.7em', marginTop: '4px', opacity: 0.8 }}>
                                {progress.task} {progress.total > 0 ? `${Math.round((progress.current / progress.total) * 100)}%` : ''}
                            </div>
                        )}
                    </div>
                )}
            </button>
        </div>
      </div>

      {/* Tools & Version (Bottom Left) */}
      <div style={{ 
          position: 'absolute', 
          bottom: '40px', 
          left: '40px', 
          zIndex: 5, 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '20px',
          animation: 'fadeInUp 0.5s ease-out'
      }}>
        <div style={{ 
            display: 'inline-block', 
            background: 'rgba(255,255,255,0.1)', 
            padding: '5px 15px', 
            borderRadius: '20px', 
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            border: '1px solid rgba(255,255,255,0.2)',
            fontSize: '0.9em',
            fontWeight: '600',
            color: '#ddd',
            willChange: 'transform'
        }}>
            {t('main.version')} {instance.version}
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <button 
                onClick={onOpenFolder}
                title="Open Instance Folder"
                style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    willChange: 'transform, background'
            }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
            </button>

            <button 
                onClick={onRepair}
                title={t('main.repair') || "Repair / Re-download Files"}
                style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    willChange: 'transform, background'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                </svg>
            </button>
        </div>
      </div>
      {/* Copyright (Bottom Right Absolute) */}
      <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '40px',
          color: 'rgba(255, 255, 255, 0.3)',
          fontSize: '0.7em',
          fontWeight: '300',
          letterSpacing: '1px',
          zIndex: 10,
          pointerEvents: 'none',
          userSelect: 'none'
      }}>
          © COPYRIGHT MALAKOR 2025
      </div>
    </div>
  )
})

export default MainContent