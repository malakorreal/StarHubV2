import React, { useEffect, useState } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

const LaunchConfirmationModal = ({ isOpen, onConfirm, onCancel, type = 'launch' }) => {
  const { t } = useLanguage()
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setAnimate(true), 10)
    } else {
      setAnimate(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const title = type === 'repair' ? t('dialogs.repairSuccess') : t('dialogs.launchSuccess')
  const message = type === 'repair' ? t('dialogs.repairSuccessMessage') : t('dialogs.launchSuccessMessage')

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
      zIndex: 2000,
      opacity: animate ? 1 : 0,
      transition: 'opacity 0.3s ease'
    }}>
      <div style={{
        backgroundColor: '#1a1b26',
        borderRadius: '16px',
        padding: '32px',
        width: '450px',
        maxWidth: '90%',
        border: '1px solid rgba(111, 111, 247, 0.3)',
        transform: animate ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}>
        {/* Success Icon Animation */}
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: 'rgba(46, 204, 113, 0.1)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '24px',
          border: '2px solid #2ecc71'
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
               style={{
                 strokeDasharray: 100,
                 strokeDashoffset: animate ? 0 : 100,
                 transition: 'stroke-dashoffset 0.8s ease 0.2s'
               }}>
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>

        <h2 style={{
          color: 'white',
          fontSize: '24px',
          marginBottom: '12px',
          fontWeight: 'bold',
        }}>{title}</h2>

        <p style={{
          color: '#a9b1d6',
          fontSize: '16px',
          lineHeight: '1.5',
          marginBottom: '32px'
        }}>{message}</p>

        <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: '1px solid #414868',
              color: '#a9b1d6',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
                e.currentTarget.style.borderColor = '#565f89'
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.borderColor = '#414868'
            }}
          >
            {t('dialogs.cancel')}
          </button>
          
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6f6ff7 0%, #5b5bf7 100%)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              transform: 'scale(1)'
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            {t('dialogs.playNow')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default LaunchConfirmationModal
