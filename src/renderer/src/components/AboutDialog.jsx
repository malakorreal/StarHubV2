import React from 'react'

function AboutDialog({ onClose }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2000,
      animation: 'fadeIn 0.2s ease-out'
    }} onClick={onClose}>
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--sidebar-bg)',
          width: '400px',
          borderRadius: '16px',
          padding: '30px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
          animation: 'scaleIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
      >
        <div style={{
            margin: '0 auto 20px auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
        }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
        </div>
        
        <h2 style={{ margin: '0 0 10px 0', color: '#fff' }}>StarHub</h2>
        <div style={{ color: 'var(--accent)', fontWeight: '600', marginBottom: '20px' }}>Created by Malakor</div>
        
        <p style={{ color: '#aaa', lineHeight: '1.6', marginBottom: '30px' }}>
          StarHub เป็นโปรเจคที่มุ่งมั่นในการสร้างประสบการณ์การเล่นเกม Minecraft ที่ดีขึ้น
          <br/>
          <span style={{ fontSize: '0.9em', opacity: 0.7 }}>Version 2.0.0</span>
        </p>

        <button 
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: 'white',
            padding: '10px 30px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1em',
            transition: 'background 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        >
          Close
        </button>
        
        <div style={{ marginTop: '20px', fontSize: '0.7em', color: '#555' }}>
            © 2025 All Rights Reserved
        </div>
      </div>
    </div>
  )
}

export default AboutDialog