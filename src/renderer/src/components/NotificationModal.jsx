import React from 'react'

function NotificationModal({ title, message, type = 'info', action, onClose, closeLabel = 'Close' }) {
  // Types: info, success, warning, error
  const colors = {
    info: '#4a90e2',
    success: '#7ed321',
    warning: '#f5a623',
    error: '#e81123'
  }
  
  const color = colors[type] || colors.info
  
  const icons = {
      info: (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      ),
      warning: (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      ),
      error: (
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
             <circle cx="12" cy="12" r="10"></circle>
             <line x1="15" y1="9" x2="9" y2="15"></line>
             <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      )
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.55)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 5000,
      animation: 'fadeIn 0.18s ease-out'
    }}>
      <div style={{
        background: 'rgba(24, 24, 28, 0.92)',
        borderRadius: '22px',
        padding: '26px',
        width: '420px',
        maxWidth: '90%',
        textAlign: 'center',
        transform: 'scale(1)',
        animation: 'scaleUp 0.22s cubic-bezier(0.2, 0.9, 0.2, 1)',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 34,
            height: 34,
            borderRadius: 999,
            border: 'none',
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.9)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            lineHeight: 1
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)' }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
          aria-label="Close"
        >
          ×
        </button>

        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: `${color}20`,
          color: color,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          margin: '0 auto 20px auto'
        }}>
          {icons[type] || icons.info}
        </div>
        
        <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: '650', color: 'white', letterSpacing: '0.2px' }}>{title}</h3>
        <p style={{ margin: '0 0 22px 0', color: 'rgba(255,255,255,0.72)', lineHeight: '1.55', fontSize: 14 }}>{message}</p>
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {action && (
            <button
              onClick={action.onClick}
              style={{
                background: color,
                color: '#111',
                border: 'none',
                padding: '12px 22px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.filter = 'brightness(1.05)'; }}
              onMouseOut={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
            >
              {action.label}
            </button>
          )}

          <button 
            onClick={onClose}
            style={{
              background: action ? 'rgba(255,255,255,0.08)' : color,
              color: action ? 'rgba(255,255,255,0.92)' : '#111',
              border: 'none',
              padding: '12px 22px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = action ? 'rgba(255,255,255,0.12)' : color }}
            onMouseOut={(e) => { e.currentTarget.style.background = action ? 'rgba(255,255,255,0.08)' : color }}
          >
            {closeLabel}
          </button>
        </div>
      </div>
      
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleUp {
            from { transform: scale(0.96); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
    </div>
  )
}

export default NotificationModal
