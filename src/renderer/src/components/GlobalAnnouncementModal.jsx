import React, { useEffect, useMemo, useState } from 'react'

const GlobalAnnouncementModal = ({ open, announcement, index, total, minCloseSeconds, onClose, onNext }) => {
  const [animateIn, setAnimateIn] = useState(false)
  const [closing, setClosing] = useState(false)
  const [now, setNow] = useState(Date.now())

  const lockUntil = useMemo(() => {
    const secs = Number.isFinite(Number(minCloseSeconds)) ? Math.max(0, Math.floor(Number(minCloseSeconds))) : 5
    return Date.now() + secs * 1000
  }, [announcement, minCloseSeconds])

  const secondsLeft = Math.max(0, Math.ceil((lockUntil - now) / 1000))
  const canClose = secondsLeft <= 0

  useEffect(() => {
    if (!open) return
    setAnimateIn(false)
    setClosing(false)
    const t = setTimeout(() => setAnimateIn(true), 10)
    return () => clearTimeout(t)
  }, [open, announcement])

  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(id)
  }, [open, announcement])

  if (!open || !announcement) return null

  const title = typeof announcement.title === 'string' ? announcement.title : ''
  const message = typeof announcement.message === 'string' ? announcement.message : (typeof announcement.text === 'string' ? announcement.text : '')
  const imageUrl = typeof announcement.imageUrl === 'string' ? announcement.imageUrl : (typeof announcement.image === 'string' ? announcement.image : '')

  const handleClose = () => {
    if (!canClose) return
    setClosing(true)
    setTimeout(() => {
      onClose && onClose()
    }, 260)
  }

  const handleNext = () => {
    if (!canClose) return
    setClosing(true)
    setTimeout(() => {
      onNext && onNext()
    }, 260)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '38px',
        background: 'rgba(0,0,0,0.62)',
        opacity: animateIn && !closing ? 1 : 0,
        transition: 'opacity 0.22s ease'
      }}
    >
      <div
        style={{
          width: '560px',
          maxWidth: '92vw',
          borderRadius: '18px',
          border: '1px solid rgba(255,215,0,0.25)',
          background: 'rgba(16,18,26,0.95)',
          overflow: 'hidden',
          transform: animateIn && !closing ? 'translateY(0)' : 'translateY(-18px)',
          transition: 'transform 0.26s cubic-bezier(0.2, 0.9, 0.2, 1)'
        }}
      >
        <div
          style={{
            padding: '16px 18px',
            borderBottom: '1px solid rgba(255,215,0,0.14)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: 999, background: '#ffd700' }} />
              <div style={{ fontWeight: 800, letterSpacing: 0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {title || 'Announcement'}
              </div>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
              {typeof index === 'number' && typeof total === 'number' && total > 1 ? `ประกาศ ${index + 1}/${total}` : 'ประกาศจากทีมงาน'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
            {typeof total === 'number' && total > 1 && (
              <button
                onClick={handleNext}
                disabled={!canClose}
                style={{
                  border: '1px solid rgba(255,215,0,0.22)',
                  background: 'rgba(0,0,0,0.22)',
                  color: canClose ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.42)',
                  borderRadius: 12,
                  padding: '10px 12px',
                  cursor: canClose ? 'pointer' : 'not-allowed',
                  fontWeight: 750,
                  fontSize: 13
                }}
              >
                ถัดไป
              </button>
            )}
            <button
              onClick={handleClose}
              disabled={!canClose}
              style={{
                border: '1px solid rgba(255,215,0,0.22)',
                background: canClose ? 'rgba(255,215,0,0.12)' : 'rgba(0,0,0,0.22)',
                color: canClose ? '#ffd700' : 'rgba(255,255,255,0.42)',
                borderRadius: 12,
                padding: '10px 12px',
                cursor: canClose ? 'pointer' : 'not-allowed',
                fontWeight: 800,
                fontSize: 13,
                minWidth: 110
              }}
            >
              {canClose ? 'ปิด' : `ปิดได้ใน ${secondsLeft}s`}
            </button>
          </div>
        </div>

        <div style={{ padding: '18px' }}>
          {imageUrl && (
            <div style={{ width: '100%', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,215,0,0.14)', marginBottom: 14 }}>
              <img src={imageUrl} alt="" style={{ width: '100%', display: 'block' }} />
            </div>
          )}
          {message && (
            <div style={{ color: 'rgba(255,255,255,0.88)', lineHeight: 1.55, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GlobalAnnouncementModal

