import React from 'react'

const team = [
  { name: 'Malakor', role: 'ผู้สร้าง', avatar: 'Malakor_Real' },
  { name: 'ASTRA', role: 'ผู้ให้คําปรึกษา', avatar: 'ASTRAv0' },
  { name: 'NEW_WEEIX', role: 'คนนั่งชมผลงาน', avatar: 'OOLLOOL' },
  
]

function AboutDialog({ onClose }) {
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
          width: '900px',
          maxWidth: '90%',
          borderRadius: '24px',
          padding: '60px',
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.08)',
          animation: 'scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
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
          width: '100%'
        }}>
          {team.map((member) => (
            <div key={member.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '140px' }}>
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
            </div>
          ))}
        </div>
        
      </div>
    </div>
  )
}

export default AboutDialog