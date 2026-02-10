import React, { memo, useState, useEffect, useMemo } from 'react'

const MainContent = memo(({ instance, installedVersion, status, progress, onLaunch, onCancel, onOpenSettings, onOpenFolder, onRepair, onOpenConsole, onUninstallInstance, user, paused, t, enableAnimation, toggleAnimation, enableCubes, showToast }) => {
  const [bgLoaded, setBgLoaded] = useState(false)
  const [staticGif, setStaticGif] = useState(null)
  const [serverStatus, setServerStatus] = useState(null)
  const videoRef = React.useRef(null)
  const [progressSteps, setProgressSteps] = useState([])
  const [showToolsMenu, setShowToolsMenu] = useState(false)
  const [toolsMenuAnimate, setToolsMenuAnimate] = useState(false)
  
  // Determine Video Source
  const { videoSrc, isVideoOnly, isBgGif } = useMemo(() => {
      if (!instance) return { videoSrc: null, isVideoOnly: false, isBgGif: false }
      
      const isBgVideo = instance.backgroundImage && /\.(mp4|webm|ogg|mov)$/i.test(instance.backgroundImage)
      const isBgGif = instance.backgroundImage && /\.gif$/i.test(instance.backgroundImage)
      
      if (instance.backgroundVideo) {
          return { videoSrc: instance.backgroundVideo, isVideoOnly: false, isBgGif: false }
      }
      
      if (isBgVideo) {
          return { videoSrc: instance.backgroundImage, isVideoOnly: true, isBgGif: false }
      }

      if (isBgGif) {
        return { videoSrc: null, isVideoOnly: false, isBgGif: true }
      }
      
      return { videoSrc: null, isVideoOnly: false, isBgGif: false }
  }, [instance])

  // Handle Play/Pause for Video
  useEffect(() => {
      if (videoRef.current) {
          if (enableAnimation) {
              videoRef.current.play().catch(() => {})
          } else {
              videoRef.current.pause()
          }
      }
  }, [enableAnimation])

  // Check update status
  const isUpdateAvailable = useMemo(() => {
      // Prioritize modpackVersion if available, otherwise use version (MC version)
      const currentRemoteVersion = instance?.modpackVersion || instance?.version
      
      if (!currentRemoteVersion) return false
      if (!installedVersion) return false 
      
      return installedVersion !== currentRemoteVersion
  }, [instance, installedVersion])

  const isMaintenance = instance?.maintenance === true
  const canModifyInstance = status === 'idle'

  useEffect(() => {
      if (showToolsMenu) {
          const id = setTimeout(() => setToolsMenuAnimate(true), 10)
          return () => clearTimeout(id)
      } else {
          setToolsMenuAnimate(false)
      }
  }, [showToolsMenu])

  // Fetch Server Status
  useEffect(() => {
      let mounted = true
      setServerStatus(null) // Reset on instance change
      let intervalId = null

      const fetchStatus = () => {
          if (instance?.serverIp) {
              window.api.getServerStatus(instance.serverIp).then(status => {
                  if (mounted) setServerStatus(status)
              })
          }
      }

      if (status === 'running') {
          return () => {
              mounted = false
              if (intervalId) clearInterval(intervalId)
          }
      }

      // Initial Fetch
      fetchStatus()

      // Poll every 10 seconds for real-time updates
      if (instance?.serverIp) {
          intervalId = setInterval(fetchStatus, 10000)
      }

      return () => { 
          mounted = false 
          if (intervalId) clearInterval(intervalId)
      }
  }, [instance?.serverIp, status])

  useEffect(() => {
      if (progress && progress.task) {
          setProgressSteps(prev => {
              const last = prev[prev.length - 1]
              if (last === progress.task) return prev
              const next = [...prev, progress.task]
              return next.slice(-4)
          })
      }
  }, [progress?.task])

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
    setStaticGif(null)
    if (instance?.backgroundImage && !isVideoOnly) {
        const img = new Image()
        img.src = instance.backgroundImage
        img.onload = () => {
            setBgLoaded(true)
            if (isBgGif) {
                // Try to generate static frame using Canvas
                const generateStaticFrame = async () => {
                    try {
                        const img = new Image()
                        img.crossOrigin = "anonymous" // Try anonymous first
                        img.src = instance.backgroundImage
                        await new Promise((resolve, reject) => {
                            img.onload = resolve
                            img.onerror = reject
                        })

                        const canvas = document.createElement('canvas')
                        canvas.width = img.width
                        canvas.height = img.height
                        const ctx = canvas.getContext('2d')
                        ctx.drawImage(img, 0, 0)
                        const dataUrl = canvas.toDataURL()
                        setStaticGif(dataUrl)
                        console.log("Static GIF generated via standard Canvas")
                    } catch (e) {
                        console.warn("Standard Canvas failed (CORS?), trying main process fetch...", e)
                        try {
                            const base64 = await window.api.fetchImageBase64(instance.backgroundImage)
                            if (base64) {
                                const proxyImg = new Image()
                                await new Promise((resolve, reject) => {
                                    proxyImg.onload = resolve
                                    proxyImg.onerror = reject
                                    proxyImg.src = base64
                                })
                                
                                const canvas = document.createElement('canvas')
                                canvas.width = proxyImg.width
                                canvas.height = proxyImg.height
                                const ctx = canvas.getContext('2d')
                                ctx.drawImage(proxyImg, 0, 0)
                                setStaticGif(canvas.toDataURL())
                                console.log("Static GIF generated via Main Process proxy")
                            } else {
                                console.error("Main process returned null for image fetch")
                            }
                        } catch (err) {
                            console.error("Failed to generate static frame even with proxy", err)
                        }
                    }
                }
                generateStaticFrame()
            }
        }
    } else if (isVideoOnly && videoSrc) {
        // If only video, we might want to set bgLoaded when video is ready, 
        // but video tag has its own onLoadedData. 
        // We'll handle it in the render.
    }
  }, [instance?.backgroundImage, isVideoOnly, videoSrc, isBgGif])

  if (!instance) return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#111' }}>
      {enableCubes && (
        <>
            <div className="cube" style={{ left: '10%' }}></div>
            <div className="cube" style={{ left: '30%', animationDelay: '-5s' }}></div>
            <div className="cube" style={{ left: '70%', animationDelay: '-10s' }}></div>
        </>
      )}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#666', fontSize: '1.5em' }}>
        {t('main.selectInstance')}
      </div>
    </div>
  )

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'var(--sidebar-bg)' }}>
      {/* Background Image with Transition */}
      {!isVideoOnly && (
        <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: (bgLoaded && instance.backgroundImage) ? `url(${(isBgGif && !enableAnimation && staticGif) ? staticGif : instance.backgroundImage})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: bgLoaded ? 1 : 0,
            transition: 'opacity 0.5s ease-in-out',
            zIndex: 0,
            transform: 'translateZ(0)', // Force GPU layer
            willChange: 'opacity'
        }}></div>
      )}

      {/* Video Background */}
      {videoSrc && (
          <video
              ref={videoRef}
              src={videoSrc}
              autoPlay={enableAnimation}
              loop
              muted
              playsInline
              style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  zIndex: 0,
                  opacity: (isVideoOnly || bgLoaded) ? (enableAnimation || isVideoOnly ? 1 : 0) : 0, // Show if enabled OR if it's the only source
                  transition: 'opacity 1s ease-in-out',
                  filter: 'brightness(0.8)', // Slightly darken video to make text readable
                  display: (enableAnimation || isVideoOnly) ? 'block' : 'none'
              }}
              onLoadedData={() => { if(isVideoOnly) setBgLoaded(true) }}
          />
      )}

      {/* Overlay */}
      <div style={{ 
          position: 'absolute', inset: 0, 
          background: instance.backgroundImage ? 'linear-gradient(to right, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.8) 40%, rgba(0,0,0,0.3) 100%)' : 'transparent',
          zIndex: 1,
          pointerEvents: 'none' // Let clicks pass through if needed, optimize hit testing
      }}></div>

      {/* Floating Cubes Animation (Always Visible) */}
      {!paused && enableCubes && (
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
                alt="Logo" 
                style={{ 
                    height: '420px',
                    maxWidth: '900px',
                    objectFit: 'contain', 
                    willChange: 'transform'
                }} 
            />
        ) : (
            <h1 style={{ 
                margin: 0, 
                color: 'var(--text-primary)', 
                fontSize: '4em', 
                fontWeight: '800', 
                lineHeight: 1.1
            }}>
                {instance.name}
            </h1>
        )}
      </div>

      {/* Header */}
      <div style={{ position: 'absolute', top: '40px', right: '40px', display: 'flex', alignItems: 'center', gap: '15px', zIndex: 10 }}>
        <div style={{ textAlign: 'right' }}>
           <div style={{ fontWeight: 'bold', fontSize: '1.1em', color: 'var(--text-primary)' }}>{user ? user.name : t('auth.guest')}</div>
           <div 
             onClick={onOpenSettings}
             style={{ fontSize: '0.9em', color: 'var(--text-secondary)', cursor: 'pointer', opacity: 0.8, transition: 'opacity 0.2s' }}
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
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2em', fontWeight: 'bold', marginBottom: '8px' }}>
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
                    <span style={{ fontSize: '0.9em', color: '#69f0ae' }}>
                        Online ({serverStatus.players.online}/{serverStatus.players.max})
                        {serverStatus.ping ? ` • ${serverStatus.ping}ms` : ''}
                    </span>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00e676' }}></div>
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

            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95em', lineHeight: '1.5' }}>
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
                    background: 'var(--input-bg)', color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    transition: 'transform 0.2s',
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
                       background: 'var(--input-bg)', color: 'var(--text-primary)',
                       border: '1px solid var(--border-color)',
                       transition: 'transform 0.2s',
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
                        background: 'var(--input-bg)',
                        color: '#ff6b6b',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        animation: 'fadeIn 0.3s ease-out'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'var(--card-bg)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'var(--input-bg)'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            )}

            <button
                onClick={isMaintenance ? null : (isUpdateAvailable ? () => onRepair('Update') : onLaunch)}
                    disabled={status !== 'idle' || isMaintenance}
                    style={{
                        padding: '12px 40px',
                        minWidth: '220px',
                        minHeight: '64px',
                        fontSize: '1.2em',
                        fontWeight: '600',
                        background: status === 'idle' ? (isMaintenance ? 'var(--input-bg)' : isUpdateAvailable ? '#e67e22' : 'var(--accent)') : 'var(--input-bg)', // Orange for Update, Dark for Maintenance
                        color: status === 'idle' ? (isMaintenance ? 'var(--text-secondary)' : isUpdateAvailable ? '#fff' : '#000') : 'var(--text-primary)',
                        border: isMaintenance ? '1px solid var(--border-color)' : 'none',
                        borderRadius: '12px',
                        cursor: (status === 'idle' && !isMaintenance) ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        letterSpacing: '0.5px'
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
                            <div style={{ width: '100%', marginTop: '8px' }}>
                                <div style={{ 
                                    width: '100%', 
                                    height: '6px', 
                                    background: 'rgba(255,255,255,0.15)', 
                                    borderRadius: '4px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%`,
                                        height: '100%',
                                        background: 'var(--accent)',
                                        transition: 'width 0.2s ease'
                                    }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.8em', color: '#ddd' }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                                        {progress.task}{progress.message ? `: ${progress.message}` : ''}
                                    </span>
                                    <span>{progress.total > 0 ? `${Math.round((progress.current / progress.total) * 100)}%` : ''}</span>
                                </div>
                                {progressSteps.length > 0 && (
                                    <div style={{ marginTop: '4px', fontSize: '0.7em', opacity: 0.8, maxWidth: '220px' }}>
                                        {progressSteps
                                            .filter(step => step !== progress.task) // Filter out current task
                                            .map((step, idx) => (
                                            <div key={`${step}-${idx}`} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                • {step}
                                            </div>
                                        ))}
                                    </div>
                                )}
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

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', position: 'relative' }}>
            <button
                onClick={() => setShowToolsMenu(!showToolsMenu)}
                title={t('main.tools') || "Instance Tools"}
                style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '26px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(0,0,0,0.6)',
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
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ width: '18px', height: '2px', borderRadius: '999px', background: '#fff', opacity: 0.9 }} />
                    <span style={{ width: '18px', height: '2px', borderRadius: '999px', background: '#fff', opacity: 0.9 }} />
                    <span style={{ width: '18px', height: '2px', borderRadius: '999px', background: '#fff', opacity: 0.9 }} />
                </div>
            </button>

            {showToolsMenu && (
                <div
                    style={{
                        position: 'absolute',
                        left: 0,
                        bottom: 68,
                        background: 'rgba(0,0,0,0.9)',
                        borderRadius: '14px',
                        padding: '8px 0',
                        border: '1px solid rgba(255,255,255,0.08)',
                        minWidth: '220px',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                        zIndex: 20,
                        opacity: toolsMenuAnimate ? 1 : 0,
                        transform: toolsMenuAnimate ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.96)',
                        transition: 'all 0.18s cubic-bezier(0.25, 0.8, 0.25, 1)'
                    }}
                >
                    <button
                        onClick={() => { setShowToolsMenu(false); onOpenFolder && onOpenFolder() }}
                        style={{
                            width: '100%',
                            padding: '10px 16px',
                            background: 'transparent',
                            border: 'none',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            gap: '10px',
                            cursor: 'pointer',
                            fontSize: '0.9em'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                        <span
                            style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '999px',
                                background: 'rgba(255,255,255,0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </span>
                        <span>{t('main.openFolder') || "Open Instance Folder"}</span>
                    </button>

                    <button
                        onClick={() => {
                            if (!canModifyInstance) return
                            setShowToolsMenu(false)
                            onRepair && onRepair('Repair')
                        }}
                        disabled={!canModifyInstance}
                        style={{
                            width: '100%',
                            padding: '10px 16px',
                            background: 'transparent',
                            border: 'none',
                            color: canModifyInstance ? '#fff' : 'rgba(255,255,255,0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            gap: '10px',
                            cursor: canModifyInstance ? 'pointer' : 'not-allowed',
                            fontSize: '0.9em'
                        }}
                        onMouseOver={(e) => { if (canModifyInstance) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                        <span
                            style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '999px',
                                background: 'rgba(255,255,255,0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                            </svg>
                        </span>
                        <span>{t('settings.repairGame') || "Repair Game Files"}</span>
                    </button>

                    {onUninstallInstance && (
                        <button
                            onClick={() => {
                                if (!canModifyInstance) return
                                setShowToolsMenu(false)
                                onUninstallInstance()
                            }}
                            disabled={!canModifyInstance}
                            style={{
                                width: '100%',
                                padding: '10px 16px',
                                background: 'transparent',
                                border: 'none',
                                color: canModifyInstance ? '#ff8a80' : 'rgba(255,255,255,0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-start',
                                gap: '10px',
                                cursor: canModifyInstance ? 'pointer' : 'not-allowed',
                                fontSize: '0.9em'
                            }}
                            onMouseOver={(e) => { if (canModifyInstance) e.currentTarget.style.background = 'rgba(255,64,64,0.16)' }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}
                        >
                            <span
                                style={{
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '999px',
                                    background: 'rgba(255,64,64,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6l-1 14H6L5 6"></path>
                                    <path d="M10 11v6"></path>
                                    <path d="M14 11v6"></path>
                                    <path d="M9 6V4h6v2"></path>
                                </svg>
                            </span>
                            <span>{t('settings.uninstallInstance') || "Uninstall Instance"}</span>
                        </button>
                    )}
                </div>
            )}

            {(videoSrc || isBgGif) && (
                <button 
                    onClick={toggleAnimation}
                    title={enableAnimation ? (t('main.disableAnimation') || "Disable Animation") : (t('main.enableAnimation') || "Enable Animation")}
                    style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '14px',
                        border: 'none',
                        background: 'rgba(20, 20, 20, 0.6)',
                        color: enableAnimation ? 'var(--accent)' : 'rgba(255, 255, 255, 0.6)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        willChange: 'transform, background'
                    }}
                    onMouseOver={(e) => { 
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; 
                        e.currentTarget.style.transform = 'scale(1.05)'; 
                        e.currentTarget.style.color = 'var(--accent)';
                    }}
                    onMouseOut={(e) => { 
                        e.currentTarget.style.background = 'rgba(20, 20, 20, 0.6)'; 
                        e.currentTarget.style.transform = 'scale(1)'; 
                        e.currentTarget.style.color = enableAnimation ? 'var(--accent)' : 'rgba(255, 255, 255, 0.6)';
                    }}
                >
                    {enableAnimation ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="6" y="4" width="4" height="16"></rect>
                            <rect x="14" y="4" width="4" height="16"></rect>
                        </svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                    )}
                </button>
            )}
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
