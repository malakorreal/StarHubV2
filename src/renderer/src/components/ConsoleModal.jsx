import React, { useEffect, useRef } from 'react'

function ConsoleModal({ logs = [], onClose, onClear }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const handleCopy = () => {
    const text = logs.join('\n')
    navigator.clipboard.writeText(text).then(() => {
      alert('Logs copied to clipboard!')
    })
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 9999,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backdropFilter: 'blur(5px)'
    }}>
      <div style={{
        width: '80%',
        height: '80%',
        backgroundColor: '#1e1e1e',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        border: '1px solid #333'
      }}>
        {/* Header */}
        <div style={{
          padding: '15px',
          backgroundColor: '#252526',
          borderBottom: '1px solid #333',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1em' }}>Game Output Console</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleCopy}
              style={{
                background: '#333',
                border: '1px solid #444',
                color: '#ddd',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Copy
            </button>
            <button
              onClick={onClear}
              style={{
                background: '#333',
                border: '1px solid #444',
                color: '#ddd',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
            <button
              onClick={onClose}
              style={{
                background: '#c00',
                border: 'none',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Logs Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '15px',
          fontFamily: 'Consolas, monospace',
          fontSize: '0.9em',
          color: '#d4d4d4',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all'
        }}>
          {logs.length === 0 ? (
            <div style={{ color: '#666', fontStyle: 'italic' }}>Waiting for logs...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} style={{ marginBottom: '2px' }}>
                {log}
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  )
}

export default ConsoleModal
