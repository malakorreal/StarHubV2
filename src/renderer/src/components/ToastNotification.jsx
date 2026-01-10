import React, { useEffect, useState } from 'react'

const ToastNotification = ({ message, type = 'info', onClose, duration = 3000 }) => {
    const [isVisible, setIsVisible] = useState(true)

    const colors = {
        info: '#4a90e2',
        success: '#7ed321',
        warning: '#f5a623',
        error: '#e81123'
    }

    const color = colors[type] || colors.info

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false)
            setTimeout(onClose, 300) // Wait for animation
        }, duration)

        return () => clearTimeout(timer)
    }, [duration, onClose])

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'rgba(30, 30, 40, 0.95)',
            borderLeft: `4px solid ${color}`,
            borderRadius: '8px',
            padding: '16px 24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            color: 'white',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transform: isVisible ? 'translateX(0)' : 'translateX(120%)',
            opacity: isVisible ? 1 : 0,
            transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            maxWidth: '350px'
        }}>
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
    )
}

export default ToastNotification
