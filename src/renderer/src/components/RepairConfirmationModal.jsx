import React from 'react'

function RepairConfirmationModal({ onConfirm, onCancel, instanceName, actionName, t }) {
  const safeT = t || ((k) => k);
  
  const isRepair = actionName === 'Repair';
  const isUpdate = actionName === 'Update';
  const isUninstall = actionName === 'Uninstall';
  
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
  } else if (isUpdate) {
      const tTitle = safeT('dialogs.updateVerification');
      if (tTitle && tTitle !== 'dialogs.updateVerification') title = tTitle;
      
      const tConfirm = safeT('dialogs.updateNow');
      if (tConfirm && tConfirm !== 'dialogs.updateNow') confirmText = tConfirm;
      
      const tMsg = safeT('dialogs.updateConfirmMessage');
      if (tMsg && tMsg !== 'dialogs.updateConfirmMessage') {
          messageHtml = tMsg.replace('{instanceName}', instanceName);
      }
  } else if (isUninstall) {
      const tTitle = safeT('dialogs.uninstallVerification');
      if (tTitle && tTitle !== 'dialogs.uninstallVerification') title = tTitle;
      
      const tConfirm = safeT('dialogs.uninstallNow');
      if (tConfirm && tConfirm !== 'dialogs.uninstallNow') confirmText = tConfirm;
      
      const tMsg = safeT('dialogs.uninstallConfirmMessage');
      if (tMsg && tMsg !== 'dialogs.uninstallConfirmMessage') {
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
       }}>
          <h3 style={{ 
              color: '#fff', 
              marginBottom: '15px', 
              fontSize: '1.4em', 
              fontWeight: '600',
          }}>
              {title}
          </h3>
          
          <p style={{ 
              color: '#bbb', 
              marginBottom: '30px', 
              lineHeight: '1.6',
              fontSize: '1em',
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
