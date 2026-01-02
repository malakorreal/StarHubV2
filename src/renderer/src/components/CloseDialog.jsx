import React from 'react'
import { useLanguage } from '../contexts/LanguageContext'

function CloseDialog({ onCancel, onConfirm }) {
  const { t } = useLanguage()

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
       <div style={{ background: '#333', padding: '30px', borderRadius: '10px', width: '350px', textAlign: 'center' }}>
          <h3>{t('close.title')}</h3>
          <p style={{ color: '#aaa', marginBottom: '30px' }}>{t('close.message')}</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => onConfirm('tray')} style={{ padding: '12px', background: '#444', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>{t('close.minimize')}</button>
              <button onClick={() => onConfirm('quit')} style={{ padding: '12px', background: '#e81123', border: 'none', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>{t('close.quit')}</button>
              <button onClick={onCancel} style={{ padding: '12px', background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', marginTop: '10px' }}>{t('close.cancel')}</button>
          </div>
       </div>
    </div>
  )
}
export default CloseDialog
