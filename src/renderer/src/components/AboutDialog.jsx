import React, { useEffect, useRef } from 'react'

const devTeam = [
  { name: 'Malakor', role: 'ผู้สร้าง', avatar: 'Malakor_Real', link: 'https://malakor.online' },
]

const starlightTeam = [
  { name: 'Malakor', role: 'หัวหน้าทีม', avatar: 'Malakor_Real', link: 'https://malakor.online' },
  { name: 'New_Weeix', role: 'สมาชิก', avatar: 'OOLLOOL' },
  { name: 'Astra', role: 'สมาชิก', avatar: 'ASTRAv0' }
]

function AboutDialog({ onClose }) {
  const audioElRef = useRef(null)
  const synthRef = useRef({ ctx: null, osc: null, gain: null, timer: null, step: 0 })

  useEffect(() => {
    const stopHtmlAudio = () => {
      const a = audioElRef.current
      audioElRef.current = null
      if (!a) return
      try { a.pause() } catch (e) {}
      try { a.removeAttribute('src') } catch (e) {}
      try { a.load() } catch (e) {}
    }

    const stopSynth = () => {
      const { timer, osc, ctx } = synthRef.current
      if (timer) clearInterval(timer)
      synthRef.current.timer = null
      if (osc) {
        try { osc.stop() } catch (e) {}
        try { osc.disconnect() } catch (e) {}
      }
      synthRef.current.osc = null
      if (ctx) {
        try { ctx.close() } catch (e) {}
      }
      synthRef.current.ctx = null
      synthRef.current.gain = null
    }

    const startSynth = async () => {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return

      const ctx = new AudioCtx()
      const gain = ctx.createGain()
      gain.gain.value = 0.02
      gain.connect(ctx.destination)

      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = 440
      osc.connect(gain)
      osc.start()

      synthRef.current.ctx = ctx
      synthRef.current.osc = osc
      synthRef.current.gain = gain
      synthRef.current.step = 0

      try {
        await ctx.resume()
      } catch (e) {}

      const notes = [
        440, 523.25, 659.25, 523.25,
        392, 493.88, 587.33, 493.88,
        349.23, 440, 523.25, 440,
        329.63, 392, 493.88, 392
      ]
      const stepMs = 280

      const tick = () => {
        const { ctx, osc } = synthRef.current
        if (!ctx || !osc) return
        const i = synthRef.current.step % notes.length
        const f = notes[i]
        const t = ctx.currentTime
        osc.frequency.setValueAtTime(f, t)
        synthRef.current.step++
      }

      tick()
      synthRef.current.timer = setInterval(tick, stepMs)
    }

    let cancelled = false
    const start = async () => {
      try {
        const res = await window?.api?.getAboutAudioUrl?.()
        const url = res && res.success && typeof res.url === 'string' ? res.url : ''
        if (!url) {
          await startSynth()
          return
        }

        if (cancelled) return
        stopSynth()
        const el = new Audio(url)
        el.loop = true
        el.volume = 0.25
        audioElRef.current = el
        el.play().catch(() => {})
      } catch (e) {
        await startSynth()
      }
    }
    start()

    return () => {
      cancelled = true
      stopHtmlAudio()
      stopSynth()
    }
  }, [])

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2000,
      animation: 'fadeIn 0.2s ease-out'
    }} onClick={onClose}>
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#121212',
          width: '760px',
          maxWidth: '92%',
          borderRadius: '24px',
          padding: '40px',
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.08)',
          animation: 'scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxHeight: '85vh',
          overflowY: 'auto'
        }}
      >
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: '#666',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '10px',
            lineHeight: 1,
            transition: 'color 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.color = '#fff'}
          onMouseOut={e => e.currentTarget.style.color = '#666'}
        >
          ×
        </button>

        {/* Logo Removed */}
        
        <h2 style={{ 
          margin: '0 0 8px 0', 
          color: '#fff', 
          fontSize: '32px',
          fontWeight: '700' 
        }}>StarHub</h2>
        
        <div style={{ 
          color: '#888', 
          fontSize: '14px', 
          fontWeight: '500', 
          marginBottom: '30px',
          letterSpacing: '0.5px'
        }}>
          
        </div>
        
        <p style={{ 
          color: '#aaa', 
          lineHeight: '1.6', 
          marginBottom: '50px',
          maxWidth: '500px',
          fontSize: '15px'
        }}>
          เป็น Launcher Minecraft ที่จะทําให้คุณเล่นมายคราฟได้สะดวกมากขึ้น โดยคุณไม่ต้องวุ้นวายกับการ Download Mods ใหม่ทุกๆครั้งที่เจ้าของเชิฟ Update Modpack เพราะ StarHub นั้นมีระบบ Auto Update ให้ทุกๆคนใช้งานได้สะดวกสบายขึ้น !
        </p>

        {/* Divider with Text */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          width: '100%', 
          marginBottom: '40px',
          color: '#444'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
          <span style={{ padding: '0 20px', fontSize: '13px', color: '#888', fontWeight: '500' }}>ทีมพัฒนา</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
        </div>

        {/* Team Grid */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '40px', 
          flexWrap: 'wrap',
          width: '100%',
          marginBottom: '40px'
        }}>
          {devTeam.map((member) => (
            <a key={member.name} href={member.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '140px' }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '16px', 
                marginBottom: '15px',
                overflow: 'hidden',
                background: '#222',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <img 
                  src={`https://minotar.net/avatar/${member.avatar}/128.png`} 
                  alt={member.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.src = 'https://minotar.net/avatar/Steve/128.png' }}
                />
              </div>
              <div style={{ color: '#fff', fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>{member.name}</div>
              <div style={{ color: '#666', fontSize: '12px' }}>{member.role}</div>
            </a>
          ))}
        </div>

        {/* Divider with Text */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          width: '100%', 
          marginBottom: '40px',
          color: '#444'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
          <span style={{ padding: '0 20px', fontSize: '13px', color: '#888', fontWeight: '500' }}>Starlight Team</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
        </div>

        {starlightTeam.length > 0 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '40px', 
            flexWrap: 'wrap',
            width: '100%'
          }}>
            {starlightTeam.map((member) => (
              <a key={member.name} href={member.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '140px' }}>
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '16px', 
                  marginBottom: '15px',
                  overflow: 'hidden',
                  background: '#222',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <img 
                    src={`https://minotar.net/avatar/${member.avatar}/128.png`} 
                    alt={member.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.src = 'https://minotar.net/avatar/Steve/128.png' }}
                  />
                </div>
                <div style={{ color: '#fff', fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>{member.name}</div>
                <div style={{ color: '#666', fontSize: '12px' }}>{member.role}</div>
              </a>
            ))}
          </div>
        )}
        
      </div>
    </div>
  )
}

export default AboutDialog
