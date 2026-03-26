import React from 'react'
import { useLanguage } from '../contexts/LanguageContext'

function NoInternetView({ onRetry }) {
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
        padding: '20px',
        animation: 'fadeIn 0.5s ease-out'
    }}>
      <div style={{ 
          fontSize: '5em', 
          marginBottom: '20px', 
          opacity: 0.3,
          color: 'var(--danger)'
      }}>
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
            <line x1="12" y1="20" x2="12.01" y2="20"></line>
        </svg>
      </div>
      
      <h2 style={{ marginBottom: '10px', color: '#fff' }}>{t('noInternet.title')}</h2>
      <p style={{ maxWidth: '400px', marginBottom: '30px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
        {t('noInternet.message')}
      </p>

      <button 
        onClick={onRetry}
        style={{ 
            padding: '12px 30px', 
            background: 'var(--accent)', 
            color: '#000', 
            border: 'none', 
            borderRadius: '8px', 
            fontWeight: 'bold', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'all 0.2s',
            boxShadow: '0 4px 15px rgba(var(--accent-rgb), 0.3)'
        }}
        onMouseOver={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(var(--accent-rgb), 0.4)';
        }}
        onMouseOut={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(var(--accent-rgb), 0.3)';
        }}
      >
         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6"></path>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
         </svg>
         <span>{t('noInternet.retry')}</span>
      </button>
    </div>
  )
}

export default NoInternetView
