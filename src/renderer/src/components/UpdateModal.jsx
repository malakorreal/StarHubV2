import React, { useEffect, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

const UpdateModal = ({ status, progress, error, onInstall, onClose }) => {
  const { t } = useLanguage()
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
      setTimeout(() => setAnimate(true), 10)
  }, [])

  if (status === 'idle' || status === 'checking' || status === 'not-available') return null

  // Helper to determine content based on status
  const getContent = () => {
      switch(status) {
          case 'available':
          case 'downloading':
              return {
                  title: t('update.downloading'),
                  iconColor: '#3498db',
                  icon: (
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3498db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                    </svg>
                  ),
                  showProgress: true
              }
          case 'downloaded':
              return {
                  title: t('update.ready'),
                  message: t('update.restartMessage'),
                  iconColor: '#2ecc71',
                  icon: (
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                         <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ),
                  showButtons: true
              }
          case 'error':
              let errorMessage = error ? `${t('update.errorMessage')}\n(${error})` : t('update.errorMessage')
              // Add hint for 404/auth errors which usually mean private repo
              if (error && (error.includes('404') || error.includes('authentication token'))) {
                  errorMessage += '\n\n' + t('update.checkRepoVisibility')
              }
              
              return {
                  title: t('update.error'),
                  message: errorMessage,
                  iconColor: '#e74c3c',
                  icon: (
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                  ),
                  showClose: true
              }
          default:
              return {}
      }
  }

  const content = getContent()

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 3000, // Higher than other modals
      opacity: animate ? 1 : 0,
      transition: 'opacity 0.3s ease'
    }}>
      <div style={{
        backgroundColor: '#1a1b26',
        borderRadius: '16px',
        padding: '32px',
        width: '450px',
        maxWidth: '90%',
        border: `1px solid ${content.iconColor}4d`, // 30% opacity
        boxShadow: `0 0 30px ${content.iconColor}33`, // 20% opacity
        transform: animate ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}>
        {/* Icon */}
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: `${content.iconColor}1a`, // 10% opacity
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '24px',
          border: `2px solid ${content.iconColor}`,
          boxShadow: `0 0 20px ${content.iconColor}4d`
        }}>
           {content.icon}
        </div>

        <h2 style={{
          color: 'white',
          fontSize: '24px',
          marginBottom: '12px',
          fontWeight: 'bold'
        }}>{content.title}</h2>

        {content.message && (
            <p style={{
            color: '#a9b1d6',
            fontSize: '16px',
            lineHeight: '1.5',
            marginBottom: '32px'
            }}>{content.message}</p>
        )}

        {content.showProgress && (
            <div style={{ width: '100%', marginBottom: '20px' }}>
                <div style={{ 
                    width: '100%', 
                    height: '8px', 
                    background: '#24283b', 
                    borderRadius: '4px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: content.iconColor,
                        transition: 'width 0.3s ease'
                    }} />
                </div>
                <div style={{ marginTop: '8px', color: '#565f89', fontSize: '14px' }}>
                    {Math.round(progress)}%
                </div>
            </div>
        )}

        {content.showButtons && (
            <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
            <button
                onClick={onClose}
                style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: '1px solid #414868',
                color: '#a9b1d6',
                cursor: 'pointer',
                fontSize: '16px',
                transition: 'all 0.2s'
                }}
            >
                {t('update.later')}
            </button>
            <button
                onClick={onInstall}
                style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: content.iconColor,
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
                boxShadow: `0 4px 15px ${content.iconColor}66`
                }}
            >
                {t('update.restart')}
            </button>
            </div>
        )}
        
        {content.showClose && (
             <button
                onClick={onClose}
                style={{
                padding: '10px 24px',
                borderRadius: '8px',
                backgroundColor: '#414868',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px'
                }}
            >
                {t('common.close')}
            </button>
        )}

      </div>
      
      <style>{`
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .animate-spin {
            animation: spin 1.5s linear infinite;
        }
      `}</style>
    </div>
  )
}

export default UpdateModal