import React from 'react'

function NotificationModal({ title, message, type = 'info', action, onClose }) {
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
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 5000,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: 'rgba(30, 30, 40, 0.95)',
        borderRadius: '16px',
        padding: '30px',
        width: '400px',
        maxWidth: '90%',
        boxShadow: `0 10px 40px rgba(0,0,0,0.5), 0 0 20px ${color}20`,
        textAlign: 'center',
        transform: 'scale(1)',
        animation: 'scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
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
        
        <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: '600', color: 'white' }}>{title}</h3>
        <p style={{ margin: '0 0 25px 0', color: '#aaa', lineHeight: '1.5' }}>{message}</p>
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {action && (
            <button
              onClick={action.onClick}
              style={{
                background: color,
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {action.label}
            </button>
          )}

          <button 
            onClick={onClose}
            style={{
              background: action ? 'rgba(255,255,255,0.1)' : color,
              color: '#fff',
              border: 'none',
              padding: '12px 30px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {action ? 'Close' : 'Got it'}
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
            from { transform: scale(0.9); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
    </div>
  )
}

export default NotificationModal
