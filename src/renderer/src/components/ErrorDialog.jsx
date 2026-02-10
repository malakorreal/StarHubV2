import React from 'react'

function ErrorDialog({ message, onClose }) {
  return (
    <div style={{ 
        position: 'absolute', 
        inset: 0, 
        zIndex: 5000,
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease-out'
    }}>
       <div style={{ 
           background: '#1e1e24', 
           width: '400px', 
           borderRadius: '16px', 
           overflow: 'hidden',
           animation: 'scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
       }}>
          {/* Header */}
          <div style={{ 
              background: 'rgba(255, 99, 71, 0.1)', 
              padding: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '15px',
              borderBottom: '1px solid rgba(255, 99, 71, 0.1)'
          }}>
              <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  background: 'rgba(255, 99, 71, 0.2)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#ff6347'
              }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
              </div>
              <h3 style={{ margin: 0, color: '#ff6347', fontSize: '1.2em', fontWeight: '600' }}>Error Occurred</h3>
          </div>

          {/* Content */}
          <div style={{ padding: '25px', color: '#e0e0e0', lineHeight: '1.6', fontSize: '0.95em' }}>
              {message}
          </div>

          {/* Footer */}
          <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={onClose} 
                style={{ 
                    padding: '10px 24px', 
                    background: '#ff6347', 
                    border: 'none', 
                    color: 'white', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    fontSize: '0.95em',
                    fontWeight: '500',
                    transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = '#e5533d'}
                onMouseOut={(e) => e.target.style.background = '#ff6347'}
              >
                  Dismiss
              </button>
          </div>
       </div>
    </div>
  )
}
export default ErrorDialog
