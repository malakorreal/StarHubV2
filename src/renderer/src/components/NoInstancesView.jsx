import React from 'react'
import { useLanguage } from '../contexts/LanguageContext'

function NoInstancesView({ user, onOpenSettings }) {
  const { t } = useLanguage()

  return (
    <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        color: '#ccc',
        textAlign: 'center',
        padding: '20px'
    }}>
      <div style={{ 
          fontSize: '4em', 
          marginBottom: '20px', 
          opacity: 0.2 
      }}>
        🚫
      </div>
      
      <h2 style={{ marginBottom: '10px', color: '#fff' }}>{t('noInstances.title')}</h2>
      <p style={{ maxWidth: '400px', marginBottom: '30px', lineHeight: '1.6' }}>
        {t('noInstances.message').replace('{name}', user?.name || 'User')}
      </p>

      <div style={{ display: 'flex', gap: '15px' }}>
          <button 
            onClick={onOpenSettings}
            style={{ 
                padding: '12px 25px', 
                background: 'var(--accent)', 
                color: '#000', 
                border: 'none', 
                borderRadius: '8px', 
                fontWeight: 'bold', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'transform 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          >
             <span>{t('noInstances.settings')}</span>
             <span>⚙️</span>
          </button>
      </div>
    </div>
  )
}

export default NoInstancesView