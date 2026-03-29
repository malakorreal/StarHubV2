import React, { memo, useState } from 'react'

const SidebarItem = memo(({ instance, isSelected, onSelect, isExpanded }) => {
    return (
        <div 
        className="sidebar-item"
        onClick={() => onSelect(instance)}
        style={{
          padding: isExpanded ? '12px 16px' : '12px 0',
          cursor: 'pointer',
          background: isSelected ? 'var(--input-bg)' : 'transparent',
          borderRadius: '12px',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isExpanded ? 'flex-start' : 'center',
          gap: isExpanded ? '14px' : '0',
          transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
          border: '1px solid transparent',
          borderLeft: isSelected ? '3px solid var(--accent)' : '1px solid transparent',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseOver={(e) => { if (!isSelected) { e.currentTarget.style.background = 'var(--card-bg)'; e.currentTarget.style.transform = isExpanded ? 'translateX(5px)' : 'scale(1.05)'; } }}
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
               color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
               marginBottom: '2px'
            }}>{instance.name}</div>
           <div style={{ fontSize: '0.75em', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', opacity: 0.7 }}>{instance.version}</div>
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
            background: 'var(--sidebar-bg)', 
            display: 'flex', 
            flexDirection: 'column', 
            paddingTop: '40px', 
            borderRight: '1px solid var(--border-color)',
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
              color: 'var(--text-primary)',
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
                background: 'var(--input-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isRefreshing ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: isRefreshing ? 'default' : 'pointer',
                fontSize: '1em',
                transition: 'all 0.3s',
                transform: isRefreshing ? 'rotate(360deg)' : 'rotate(0deg)',
                marginLeft: isExpanded ? 0 : 0
            }}
            onMouseOver={(e) => { if(!isRefreshing) { e.currentTarget.style.background = 'var(--card-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
            onMouseOut={(e) => { if(!isRefreshing) { e.currentTarget.style.background = 'var(--input-bg)'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
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
            color: 'var(--text-secondary)', 
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
            <div style={{ padding: '40px 20px', color: 'var(--text-secondary)', fontSize: '0.9em', textAlign: 'center', fontStyle: 'italic', display: isExpanded ? 'block' : 'none' }}>
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
          background: 'var(--card-bg)', 
          borderTop: '1px solid var(--border-color)', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          transition: 'padding 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
      }}>
          <div 
            onClick={onOpenSettings}
            title="User Settings"
            style={{ 
                padding: isExpanded ? '15px' : '10px', 
                borderRadius: '16px',
                display: 'flex', 
                alignItems: 'center', 
                gap: isExpanded ? '14px' : '0', 
                cursor: 'pointer',
                background: user?.account_type === 'admin' ? 'linear-gradient(135deg, rgba(255, 71, 87, 0.2) 0%, rgba(0,0,0,0.6) 100%)' : 
                            user?.account_type === 'support' ? 'linear-gradient(135deg, rgba(46, 213, 115, 0.2) 0%, rgba(0,0,0,0.6) 100%)' : 
                            'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.4) 100%)',
                border: user?.account_type === 'admin' ? '1.5px solid rgba(255, 71, 87, 0.4)' : 
                        user?.account_type === 'support' ? '1.5px solid rgba(46, 213, 115, 0.4)' : 
                        '1.5px solid var(--border-color)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                marginBottom: '15px',
                justifyContent: isExpanded ? 'flex-start' : 'center',
                width: isExpanded ? 'auto' : '52px',
                height: isExpanded ? 'auto' : '52px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: user?.account_type === 'admin' ? '0 4px 15px rgba(255, 71, 87, 0.15)' : 
                           user?.account_type === 'support' ? '0 4px 15px rgba(46, 213, 115, 0.15)' : 'none'
            }}
            onMouseOver={e => { 
                e.currentTarget.style.transform = isExpanded ? 'translateY(-3px)' : 'scale(1.05)';
                e.currentTarget.style.filter = 'brightness(1.2)';
            }}
            onMouseOut={e => { 
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
              {/* Animated Glow for Ranks */}
              {isExpanded && user?.account_type && user.account_type !== 'normal' && (
                  <div style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      background: user.account_type === 'admin' ? 
                                 'radial-gradient(circle at top right, rgba(255, 71, 87, 0.1), transparent)' : 
                                 'radial-gradient(circle at top right, rgba(46, 213, 115, 0.1), transparent)',
                      pointerEvents: 'none'
                  }}></div>
              )}

              <div style={{ 
                  width: '40px', height: '40px', borderRadius: '12px', 
                  backgroundImage: user ? `url(https://minotar.net/avatar/${user.name}/64.png)` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundColor: '#333',
                  flexShrink: 0,
                  border: user?.account_type === 'admin' ? '2.5px solid #ff4757' : 
                          user?.account_type === 'support' ? '2.5px solid #2ed573' : '2px solid rgba(255,255,255,0.2)',
                  boxShadow: user?.account_type === 'admin' ? '0 0 10px rgba(255, 71, 87, 0.4)' : 
                             user?.account_type === 'support' ? '0 0 10px rgba(46, 213, 115, 0.4)' : 'none'
              }}></div>
              <div style={{ 
                  flex: 1, 
                  overflow: 'hidden',
                  opacity: isExpanded ? 1 : 0,
                  width: isExpanded ? 'auto' : 0,
                  transition: 'opacity 0.2s, width 0.2s',
                  display: isExpanded ? 'flex' : 'none',
                  flexDirection: 'column',
                  zIndex: 1
              }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ fontSize: '1em', fontWeight: '800', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user ? user.name : 'Guest'}</div>
                  </div>
                  
                  {/* Cool Banner System for Admin/Support */}
                  {user?.account_type && (user.account_type === 'admin' || user.account_type === 'support') ? (
                      <div style={{ 
                          marginTop: '4px',
                          fontSize: '0.6em', 
                          padding: '3px 10px', 
                          borderRadius: '6px', 
                          background: user.account_type === 'admin' ? 
                                     'linear-gradient(90deg, #ff4757, #ff6b81, #ff4757)' : 
                                     'linear-gradient(90deg, #2ed573, #7bed9f, #2ed573)',
                          backgroundSize: '200% auto',
                          color: '#fff',
                          fontWeight: '900',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          width: 'fit-content',
                          boxShadow: user.account_type === 'admin' ? 
                                     '0 2px 10px rgba(255, 71, 87, 0.4)' : 
                                     '0 2px 10px rgba(46, 213, 115, 0.4)',
                          animation: 'shimmer 2s linear infinite'
                      }}>
                          <style>{`
                              @keyframes shimmer {
                                  0% { background-position: 0% center; }
                                  100% { background-position: 200% center; }
                              }
                              @keyframes pulse {
                                  0% { transform: scale(1); }
                                  50% { transform: scale(1.02); }
                                  100% { transform: scale(1); }
                              }
                          `}</style>
                          <span style={{ fontSize: '1.2em' }}>
                            {user.account_type === 'admin' ? '👑' : '🛡️'}
                          </span>
                          {user.account_type}
                      </div>
                  ) : (
                      <div style={{ fontSize: '0.75em', color: 'rgba(255,255,255,0.5)', fontWeight: '500', marginTop: '2px' }}>
                        {t ? t('sidebar.myAccount') : '👤 Player Member'}
                      </div>
                  )}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.2em', display: isExpanded ? 'block' : 'none', zIndex: 1 }}>⚙️</div>
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
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                justifyContent: isExpanded ? 'flex-start' : 'center',
                width: isExpanded ? 'auto' : '48px',
                height: isExpanded ? 'auto' : '48px'
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'var(--input-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
          >
              <div style={{ 
                  width: '36px', height: '36px', borderRadius: '50%', 
                  background: 'var(--input-bg)',
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