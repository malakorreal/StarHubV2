import React, { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'

function AchievementsView() {
    const { t } = useLanguage()
    const [achievements, setAchievements] = useState([])
    const [unlocked, setUnlocked] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch all available achievements from DB
                const allAchievements = await window.api.getAllAchievements()
                setAchievements(allAchievements)

                // Fetch user's unlocked achievements
                const unlockedData = await window.api.getUserAchievements()
                setUnlocked(unlockedData.map(u => u.achievement_id))
            } catch (e) {
                console.error("Failed to fetch achievements:", e)
            }
            setLoading(false)
        }
        fetchData()
    }, [])

    return (
        <div style={{ padding: '20px', animation: 'fadeIn 0.3s' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                    {achievements.map(ach => {
                        const isUnlocked = unlocked.includes(ach.id)
                        return (
                            <div key={ach.id} style={{
                                background: 'var(--card-bg)',
                                border: `1px solid ${isUnlocked ? (ach.color || 'var(--accent)') : 'var(--border-color)'}`,
                                borderRadius: '12px',
                                padding: '20px',
                                opacity: isUnlocked ? 1 : 0.4,
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                filter: isUnlocked ? 'none' : 'grayscale(100%)',
                                boxShadow: isUnlocked ? `0 8px 24px ${(ach.color || 'var(--accent)')}22` : 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {ach.is_limited && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '10px',
                                        right: '-25px',
                                        background: '#F44336',
                                        color: '#fff',
                                        fontSize: '0.65em',
                                        fontWeight: 'bold',
                                        padding: '2px 30px',
                                        transform: 'rotate(45deg)',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                        zIndex: 1
                                    }}>
                                        {t('settings.limited')}
                                    </div>
                                )}

                                <div style={{ 
                                    width: '64px', 
                                    height: '64px', 
                                    marginBottom: '15px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    background: isUnlocked ? `${ach.color}15` : 'rgba(255,255,255,0.05)',
                                    borderRadius: '16px',
                                    border: `1px solid ${isUnlocked ? `${ach.color}40` : 'rgba(255,255,255,0.1)'}`,
                                    fontSize: '2.5em'
                                }}>
                                    {ach.image ? (
                                        <img src={ach.image} style={{ width: '40px', height: '40px', objectFit: 'contain' }} alt={ach.title} />
                                    ) : (
                                        ach.icon || '🏆'
                                    )}
                                </div>

                                <h4 style={{ margin: '0 0 8px 0', color: isUnlocked ? '#fff' : 'var(--text-secondary)', fontSize: '1.1em' }}>{ach.title}</h4>
                                <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{ach.description}</p>
                                
                                {isUnlocked && (
                                    <div style={{ 
                                        marginTop: '15px', 
                                        fontSize: '0.7em', 
                                        color: ach.color || 'var(--accent)', 
                                        fontWeight: '800', 
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        padding: '4px 12px',
                                        background: `${ach.color}15`,
                                        borderRadius: '20px'
                                    }}>
                                        {t('settings.unlocked')}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default AchievementsView
