import React, { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

function AchievementsView() {
    const { t } = useLanguage()
    const [achievements, setAchievements] = useState([])
    const [unlocked, setUnlocked] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedAch, setSelectedAch] = useState(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const allAchievements = await window.api.getAllAchievements()
                setAchievements(allAchievements)

                const unlockedData = await window.api.getUserAchievements()
                setUnlocked(unlockedData.map(u => u.achievement_id))
            } catch (e) {
                console.error("Failed to fetch achievements:", e)
            }
            setLoading(false)
        }
        fetchData()
    }, [])

    if (selectedAch) {
        const isUnlocked = unlocked.includes(selectedAch.id)
        return (
            <div className="fade-in" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <button 
                    onClick={() => setSelectedAch(null)}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        padding: '8px 15px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        width: 'fit-content',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '30px',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                    ← ย้อนกลับ
                </button>

                <div style={{ 
                    flex: 1,
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    textAlign: 'center',
                    gap: '20px',
                    padding: '0 20px'
                }}>
                    <div style={{ 
                        width: '120px', 
                        height: '120px', 
                        borderRadius: '30px', 
                        background: `${selectedAch.color}15`, 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        fontSize: '4em',
                        border: `2px solid ${selectedAch.color}40`,
                        boxShadow: isUnlocked ? `0 10px 30px ${selectedAch.color}33` : 'none',
                        filter: isUnlocked ? 'none' : 'grayscale(100%)',
                        marginBottom: '10px'
                    }}>
                        {selectedAch.image ? (
                            <img src={selectedAch.image} style={{ width: '80px', height: '80px', objectFit: 'contain' }} alt={selectedAch.title} />
                        ) : (
                            selectedAch.icon || '🏆'
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h2 style={{ margin: 0, color: '#fff', fontSize: '1.8em' }}>{selectedAch.title}</h2>
                            {selectedAch.is_limited && (
                                <span style={{ 
                                    fontSize: '0.6em', 
                                    padding: '4px 12px', 
                                    background: '#F44336', 
                                    borderRadius: '6px', 
                                    fontWeight: '900',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>
                                    {t('settings.limited')}
                                </span>
                            )}
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1.1em', maxWidth: '400px', lineHeight: '1.6' }}>
                            {selectedAch.description}
                        </p>
                    </div>

                    {isUnlocked ? (
                        <div style={{ 
                            marginTop: '15px',
                            color: selectedAch.color || 'var(--accent)', 
                            fontWeight: '800', 
                            fontSize: '0.75em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: `${selectedAch.color}12`,
                            padding: '6px 16px',
                            borderRadius: '10px',
                            border: `1px solid ${selectedAch.color}25`,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            <span style={{ fontSize: '1.2em' }}>✓</span> {t('settings.unlocked')}
                        </div>
                    ) : (
                        <div style={{ 
                            marginTop: '20px',
                            color: 'rgba(255,255,255,0.3)', 
                            fontWeight: '700', 
                            fontSize: '0.9em',
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                        }}>
                            🔒 ยังไม่ปลดล็อก
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="fade-in" style={{ padding: '20px', position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', flexShrink: 0 }}>
                {t('settings.achievements')}
            </h3>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    {t('settings.loadingAchievements')}
                </div>
            ) : achievements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', opacity: 0.6 }}>
                    {t('settings.noAchievements')}
                </div>
            ) : (
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
                    <div className="achievements-grid" style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', 
                        gap: '15px',
                        padding: '5px'
                    }}>
                        {achievements.map(ach => {
                            const isUnlocked = unlocked.includes(ach.id)
                            return (
                                <div 
                                    key={ach.id} 
                                    onClick={() => setSelectedAch(ach)}
                                    style={{
                                        background: 'var(--card-bg)',
                                        border: `2px solid ${isUnlocked ? `${ach.color}60` : 'rgba(255,255,255,0.05)'}`,
                                        borderRadius: '20px',
                                        aspectRatio: '1/1',
                                        cursor: 'pointer',
                                        opacity: isUnlocked ? 1 : 0.4,
                                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                        filter: isUnlocked ? 'none' : 'grayscale(100%)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        boxShadow: isUnlocked ? `0 4px 15px ${ach.color}15` : 'none'
                                    }}
                                    onMouseOver={e => {
                                        e.currentTarget.style.transform = 'translateY(-5px)'
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                                        if (isUnlocked) e.currentTarget.style.boxShadow = `0 8px 20px ${ach.color}33`
                                    }}
                                    onMouseOut={e => {
                                        e.currentTarget.style.transform = 'translateY(0)'
                                        e.currentTarget.style.background = 'var(--card-bg)'
                                        if (isUnlocked) e.currentTarget.style.boxShadow = `0 4px 15px ${ach.color}15`
                                        else e.currentTarget.style.boxShadow = 'none'
                                    }}
                                >
                                    {ach.is_limited && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '8px',
                                            right: '-22px',
                                            background: '#F44336',
                                            color: '#fff',
                                            fontSize: '0.5em',
                                            fontWeight: '900',
                                            padding: '2px 22px',
                                            transform: 'rotate(45deg)',
                                            zIndex: 1,
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                        }}>
                                            {t('settings.limited')}
                                        </div>
                                    )}

                                    <div style={{ fontSize: '2.5em', marginBottom: isUnlocked ? '10px' : '0' }}>
                                        {ach.image ? (
                                            <img src={ach.image} style={{ width: '50px', height: '50px', objectFit: 'contain' }} alt={ach.title} />
                                        ) : (
                                            ach.icon || '🏆'
                                        )}
                                    </div>
                                    
                                    {isUnlocked && (
                                        <div style={{ 
                                            position: 'absolute',
                                            bottom: '8px',
                                            fontSize: '0.45em', 
                                            color: ach.color || 'var(--accent)', 
                                            fontWeight: '900', 
                                            textTransform: 'uppercase',
                                            background: `${ach.color}15`,
                                            padding: '1px 6px',
                                            borderRadius: '4px',
                                            border: `1px solid ${ach.color}25`
                                        }}>
                                            {t('settings.unlocked')}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

export default AchievementsView
