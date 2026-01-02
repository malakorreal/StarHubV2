import React from 'react'

function LoginScreen({ onLogin, isLoggingIn }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
       {/* Background Animation */}
       <div className="bg-animation">
          <div className="cube"></div>
          <div className="cube"></div>
          <div className="cube"></div>
          <div className="cube"></div>
          <div className="cube"></div>
          <div className="cube"></div>
          <div className="cube"></div>
       </div>

       <div style={{ 
           textAlign: 'center', 
           zIndex: 1, 
           padding: '60px', 
           borderRadius: '24px', 
           backdropFilter: 'blur(12px)', 
           background: 'rgba(255, 255, 255, 0.03)',
           border: '1px solid rgba(255, 255, 255, 0.05)'
       }}>
          <h1 style={{ 
              marginBottom: '40px', 
              fontSize: '3em', 
              fontWeight: '200', 
              letterSpacing: '2px',
              color: '#fff'
          }}>
            STARHUB
          </h1>
          <button 
            onClick={onLogin}
            disabled={isLoggingIn}
            style={{
                padding: '16px 48px',
                fontSize: '1em',
                fontWeight: '500',
                background: isLoggingIn ? '#555' : '#00a4ef',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: isLoggingIn ? 'default' : 'pointer',
                transition: 'background 0.2s, transform 0.1s',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                margin: '0 auto',
                opacity: isLoggingIn ? 0.8 : 1
            }}
            onMouseOver={(e) => { if (!isLoggingIn) e.currentTarget.style.background = '#0086c3' }}
            onMouseOut={(e) => { if (!isLoggingIn) e.currentTarget.style.background = '#00a4ef' }}
            onMouseDown={(e) => { if (!isLoggingIn) e.currentTarget.style.transform = 'scale(0.98)' }}
            onMouseUp={(e) => { if (!isLoggingIn) e.currentTarget.style.transform = 'scale(1)' }}
          >
            {isLoggingIn ? (
                <>
                    <div className="spinner" style={{ 
                        width: '20px', 
                        height: '20px', 
                        border: '3px solid rgba(255,255,255,0.3)', 
                        borderTop: '3px solid white', 
                        borderRadius: '50%', 
                        animation: 'spin 1s linear infinite' 
                    }}></div>
                    Signing in...
                </>
            ) : (
                <>
                    <svg width="20" height="20" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 0H10.566V10.566H0V0Z" fill="white"/>
                        <path d="M12.434 0H23V10.566H12.434V0Z" fill="white"/>
                        <path d="M0 12.434H10.566V23H0V12.434Z" fill="white"/>
                        <path d="M12.434 12.434H23V23H12.434V12.434Z" fill="white"/>
                    </svg>
                    Sign in with Microsoft
                </>
            )}
          </button>
       </div>
    </div>
  )
}
export default LoginScreen
