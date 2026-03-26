import React, { useEffect, useRef, useState } from 'react'

const ToastNotification = ({ message, type = 'info', onClose, duration = 2000, icon = null }) => {
    const [isVisible, setIsVisible] = useState(true)
    const timerRef = useRef(null)

    const colors = {
        info: '#4a90e2',
        success: '#7ed321',
        warning: '#f5a623',
        error: '#e81123',
        achievement: '#FFD700'
    }

    const color = colors[type] || colors.info

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => {
            setIsVisible(false)
            setTimeout(onClose, 300) // Wait for animation
        }, duration)

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [duration, onClose])

    const closeNow = () => {
        if (timerRef.current) clearTimeout(timerRef.current)
        setIsVisible(false)
        setTimeout(onClose, 250)
    }

    return (
        <>
            <style>
                {`
                    @keyframes toast-bounce-in {
                        0% { transform: translateX(120%) scale(0.8); opacity: 0; }
                        60% { transform: translateX(-15px) scale(1.05); opacity: 1; }
                        80% { transform: translateX(5px) scale(0.98); }
                        100% { transform: translateX(0) scale(1); }
                    }
                    @keyframes toast-bounce-out {
                        0% { transform: translateX(0) scale(1); opacity: 1; }
                        20% { transform: translateX(-10px) scale(0.95); }
                        100% { transform: translateX(120%) scale(0.8); opacity: 0; }
                    }
                `}
            </style>
            <div style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                background: 'rgba(30, 30, 40, 0.95)',
                borderLeft: `4px solid ${color}`,
                borderRadius: '12px',
                padding: '16px 24px',
                backdropFilter: 'blur(8px)',
                color: 'white',
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                animation: isVisible 
                    ? 'toast-bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' 
                    : 'toast-bounce-out 0.4s cubic-bezier(0.25, 1, 0.5, 1) forwards',
                maxWidth: '350px',
                paddingRight: '44px'
            }}>
                <button
                    onClick={closeNow}
                    style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        width: '26px',
                        height: '26px',
                        borderRadius: '999px',
                        border: '1px solid rgba(255,255,255,0.14)',
                        background: 'rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.85)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                        fontSize: '16px',
                        padding: 0
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                    aria-label="Close"
                >
                    ×
                </button>
                <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: `${color}20`,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: color,
                flexShrink: 0
            }}>
                {type === 'success' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                )}
                {type === 'achievement' && (
                    <div style={{ fontSize: '1.2em' }}>{icon}</div>
                )}
                {type === 'info' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                )}
                {type === 'warning' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                )}
                {type === 'error' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                )}
            </div>
            <div style={{ fontSize: '14px', fontWeight: '500' }}>
                {message}
            </div>
        </div>
        </>
    )
}

export default ToastNotification
