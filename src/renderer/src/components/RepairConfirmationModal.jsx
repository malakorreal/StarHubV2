import React from 'react'

function RepairConfirmationModal({ onConfirm, onCancel, instanceName, actionName, t }) {
  const safeT = t || ((k) => k);
  
  const isRepair = actionName === 'Repair';
  
  let title = `${actionName} Verification`;
  let confirmText = `${actionName} Now`;
  let messageHtml = `Are you sure you want to ${actionName.toLowerCase()} <span style="color: var(--accent); font-weight: bold;">${instanceName}</span>? <br/><br/>This will re-download core files and verify integrity.`;

  if (isRepair) {
      const tTitle = safeT('dialogs.repairVerification');
      if (tTitle && tTitle !== 'dialogs.repairVerification') title = tTitle;
      
      const tConfirm = safeT('dialogs.repairNow');
      if (tConfirm && tConfirm !== 'dialogs.repairNow') confirmText = tConfirm;
      
      const tMsg = safeT('dialogs.repairConfirmMessage');
      if (tMsg && tMsg !== 'dialogs.repairConfirmMessage') {
          messageHtml = tMsg.replace('{instanceName}', instanceName);
      }
  }

  const cancelText = safeT('dialogs.cancel');
  const finalCancelText = (cancelText && cancelText !== 'dialogs.cancel') ? cancelText : 'Cancel';

  return (
    <div style={{ 
        position: 'absolute', 
        inset: 0, 
        background: 'rgba(0,0,0,0.85)', // Darker overlay
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        zIndex: 3000,
        backdropFilter: 'blur(5px)' // Modern touch without shadow
    }}>
       <div style={{ 
           background: '#1e1e1e', 
           padding: '40px', 
           borderRadius: '0px', // Flat corners or slight radius
           width: '400px', 
           textAlign: 'center',
           border: '1px solid #333',
           boxShadow: 'none', // EXPLICITLY NO SHADOW
           textShadow: 'none' // EXPLICITLY NO TEXT SHADOW
       }}>
          <h3 style={{ 
              color: '#fff', 
              marginBottom: '15px', 
              fontSize: '1.4em', 
              fontWeight: '600',
              textShadow: 'none'
          }}>
              {title}
          </h3>
          
          <p style={{ 
              color: '#bbb', 
              marginBottom: '30px', 
              lineHeight: '1.6',
              fontSize: '1em',
              textShadow: 'none'
          }} dangerouslySetInnerHTML={{ __html: messageHtml }} />
          
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button 
                onClick={onCancel} 
                style={{ 
                    padding: '12px 24px', 
                    background: '#333', 
                    border: 'none', 
                    color: '#ddd', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    fontSize: '1em',
                    transition: 'background 0.2s',
                    boxShadow: 'none',
                    textShadow: 'none',
                    fontWeight: '500'
                }}
                onMouseOver={(e) => e.target.style.background = '#444'}
                onMouseOut={(e) => e.target.style.background = '#333'}
              >
                  {finalCancelText}
              </button>
              
              <button 
                onClick={onConfirm} 
                style={{ 
                    padding: '12px 24px', 
                    background: 'var(--accent)', // Use theme accent
                    border: 'none', 
                    color: '#000', 
                    borderRadius: '4px', 
                    cursor: 'pointer',
                    fontSize: '1em',
                    fontWeight: 'bold',
                    transition: 'opacity 0.2s',
                    boxShadow: 'none',
                    textShadow: 'none'
                }}
                onMouseOver={(e) => e.target.style.opacity = '0.9'}
                onMouseOut={(e) => e.target.style.opacity = '1'}
              >
                  {confirmText}
              </button>
          </div>
       </div>
    </div>
  )
}

export default RepairConfirmationModal
