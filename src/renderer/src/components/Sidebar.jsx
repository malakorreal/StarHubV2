import React, { memo, useState } from 'react'

const SidebarItem = memo(({ instance, isSelected, onSelect, isExpanded }) => {
    return (
        <div 
        className="sidebar-item"
        onClick={() => onSelect(instance)}
        style={{
          padding: isExpanded ? '12px 16px' : '12px 0',
          cursor: 'pointer',
          background: isSelected ? 'linear-gradient(90deg, rgba(255, 215, 0, 0.15), rgba(255, 215, 0, 0.05))' : 'transparent',
          borderRadius: '12px',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isExpanded ? 'flex-start' : 'center',
          gap: isExpanded ? '14px' : '0',
          transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
          border: '1px solid transparent',
          borderLeft: isSelected ? '3px solid #ffd700' : '1px solid transparent',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseOver={(e) => { if (!isSelected) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = isExpanded ? 'translateX(5px)' : 'scale(1.05)'; } }}
        onMouseOut={(e) => { if (!isSelected) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = isExpanded ? 'translateX(0)' : 'scale(1)'; } }}
      >
         <div style={{ 
             width: 42, 
             height: 42, 
             background: 'rgba(0,0,0,0.3)', 
             borderRadius: '10px', 
             backgroundImage: (instance.icon || instance.image) ? `url(${instance.icon || instance.image})` : 'none',
             backgroundSize: 'cover',
             backgroundPosition: 'center',
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center',
             color: '#fff',
             fontSize: '1em',
             flexShrink: 0,
             boxShadow: isSelected ? '0 4px 12px rgba(255, 215, 0, 0.2)' : 'none',
             transition: 'all 0.3s'
         }}>
             {!(instance.icon || instance.image) && instance.name.charAt(0)}
         </div>
         <div style={{ 
             overflow: 'hidden', 
             flex: 1, 
             opacity: isExpanded ? 1 : 0, 
             width: isExpanded ? 'auto' : 0,
             transition: 'opacity 0.2s, width 0.2s',
             whiteSpace: 'nowrap',
             display: isExpanded ? 'block' : 'none'
         }}>
           <div style={{ 
               fontWeight: isSelected ? '700' : '500', 
               fontSize: '0.95em', 
               whiteSpace: 'nowrap', 
               overflow: 'hidden', 
               textOverflow: 'ellipsis',
               color: isSelected ? '#fff' : '#ccc',
               marginBottom: '2px'
            }}>{instance.name}</div>
           <div style={{ fontSize: '0.75em', color: isSelected ? 'rgba(255,255,255,0.7)' : '#666' }}>{instance.version}</div>
         </div>
      </div>
    )
}, (prevProps, nextProps) => {
    return prevProps.isSelected === nextProps.isSelected && 
           prevProps.isExpanded === nextProps.isExpanded &&
           prevProps.instance.id === nextProps.instance.id &&
           prevProps.instance.name === nextProps.instance.name &&
           prevProps.instance.icon === nextProps.instance.icon;
})

function Sidebar({ instances, selectedInstance, onSelectInstance, onRefresh, isRefreshing, user, onOpenSettings, onOpenAbout, t }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div 
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        style={{ 
            width: isExpanded ? '280px' : '84px', // Collapsed width just enough for icons + padding
            background: '#121218', 
            display: 'flex', 
            flexDirection: 'column', 
            paddingTop: '40px', 
            borderRight: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '10px 0 30px rgba(0,0,0,0.2)',
            zIndex: 100,
            transition: 'width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
        }}
    >
      <div style={{ 
          padding: isExpanded ? '0 24px 20px 24px' : '0 10px 20px 10px', 
          display: 'flex', 
          justifyContent: isExpanded ? 'space-between' : 'center', 
          alignItems: 'center', 
          height: '52px',
          transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
      }}>
          <div style={{ 
              fontWeight: '800', 
              fontSize: '1.4em', 
              letterSpacing: '-0.5px',
              color: '#fff',
              display: isExpanded ? 'block' : 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              opacity: isExpanded ? 1 : 0,
              transition: 'opacity 0.2s'
          }}>StarHub</div>
          
          <button 
            onClick={onRefresh}
            title="Refresh Instances"
            disabled={isRefreshing}
            style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isRefreshing ? 'var(--accent)' : '#888',
                cursor: isRefreshing ? 'default' : 'pointer',
                fontSize: '1em',
                transition: 'all 0.3s',
                transform: isRefreshing ? 'rotate(360deg)' : 'rotate(0deg)',
                marginLeft: isExpanded ? 0 : 0
            }}
            onMouseOver={(e) => { if(!isRefreshing) { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; } }}
            onMouseOut={(e) => { if(!isRefreshing) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#888'; } }}
          >
            ↻
          </button>
      </div>
      
      <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: isExpanded ? '10px 16px' : '10px 0', 
          overflowX: 'hidden',
          transition: 'padding 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
      }}>
        <div style={{ 
            fontSize: '0.75em', 
            fontWeight: '600', 
            color: '#555', 
            textTransform: 'uppercase', 
            letterSpacing: '1px',
            marginBottom: '15px',
            paddingLeft: isExpanded ? '10px' : '0',
            textAlign: isExpanded ? 'left' : 'center',
            opacity: isExpanded ? 1 : 0,
            height: isExpanded ? 'auto' : 0,
            transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
            overflow: 'hidden'
        }}>
            Library
        </div>
        {instances.length === 0 && (
            <div style={{ padding: '40px 20px', color: '#666', fontSize: '0.9em', textAlign: 'center', fontStyle: 'italic', display: isExpanded ? 'block' : 'none' }}>
                No instances found.
                <br/>
                <span style={{ fontSize: '0.8em', opacity: 0.7 }}>Check your connection</span>
            </div>
        )}
        {instances.map(inst => (
          <SidebarItem 
            key={inst.id}
            instance={inst}
            isSelected={selectedInstance?.id === inst.id}
            onSelect={onSelectInstance}
            isExpanded={isExpanded}
          />
        ))}
      </div>

      {/* User Profile Section */}
      <div style={{ 
          padding: isExpanded ? '20px 20px 20px 20px' : '20px 0', 
          background: 'rgba(0,0,0,0.2)', 
          borderTop: '1px solid rgba(255,255,255,0.05)', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          transition: 'padding 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
      }}>
         <div 
            onClick={onOpenSettings} // Keep this for user settings
            title="User Settings"
            style={{ 
                padding: '12px', 
                borderRadius: '12px',
                display: 'flex', 
                alignItems: 'center', 
                gap: isExpanded ? '14px' : '0', 
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                transition: 'all 0.2s',
                marginBottom: '12px',
                justifyContent: isExpanded ? 'flex-start' : 'center',
                width: isExpanded ? 'auto' : '48px',
                height: isExpanded ? 'auto' : '48px'
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = isExpanded ? 'translateY(-2px)' : 'scale(1.05)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = isExpanded ? 'translateY(0)' : 'scale(1)'; }}
          >
              <div style={{ 
                  width: '36px', height: '36px', borderRadius: '10px', 
                  backgroundImage: user ? `url(https://minotar.net/avatar/${user.name}/64.png)` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundColor: '#333',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  flexShrink: 0
              }}></div>
              <div style={{ 
                  flex: 1, 
                  overflow: 'hidden',
                  opacity: isExpanded ? 1 : 0,
                  width: isExpanded ? 'auto' : 0,
                  transition: 'opacity 0.2s, width 0.2s',
                  display: isExpanded ? 'block' : 'none'
              }}>
                  <div style={{ fontSize: '0.95em', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user ? user.name : 'Guest'}</div>
                  <div style={{ fontSize: '0.75em', color: '#888' }}>My Account</div>
              </div>
              <div style={{ color: '#666', fontSize: '1.2em', display: isExpanded ? 'block' : 'none' }}>⚙️</div>
          </div>
          
          {/* About Developer Button */}
          <div 
            onClick={onOpenAbout}
            title="About Developer"
            style={{ 
                padding: '12px', 
                borderRadius: '12px',
                display: 'flex', 
                alignItems: 'center', 
                gap: isExpanded ? '14px' : '0', 
                cursor: 'pointer',
                background: 'transparent',
                transition: 'all 0.2s',
                color: '#777',
                border: '1px solid rgba(255,255,255,0.05)',
                justifyContent: isExpanded ? 'flex-start' : 'center',
                width: isExpanded ? 'auto' : '48px',
                height: isExpanded ? 'auto' : '48px'
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#777'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
          >
              <div style={{ 
                  width: '36px', height: '36px', borderRadius: '50%', 
                  background: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'inherit', fontSize: '1em',
                  transition: 'color 0.2s',
                  flexShrink: 0
              }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
              </div>
              <div style={{ 
                  flex: 1, 
                  fontSize: '0.9em', 
                  fontWeight: '600',
                  opacity: isExpanded ? 1 : 0,
                  width: isExpanded ? 'auto' : 0,
                  transition: 'opacity 0.2s, width 0.2s',
                  whiteSpace: 'nowrap'
              }}>
                  {t ? t('sidebar.aboutDev') : 'About Dev'}
              </div>
              <div style={{ opacity: 0.5, display: isExpanded ? 'block' : 'none' }}>ⓘ</div>
          </div>
      </div>
    </div>
  )
}
export default memo(Sidebar)