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
                    Loading achievements...
                </div>
            ) : achievements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', opacity: 0.6 }}>
                    No achievements available yet.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                    {achievements.map(ach => {
                        const isUnlocked = unlocked.includes(ach.id)
                        return (
                            <div key={ach.id} style={{
                                background: 'var(--card-bg)',
                                border: `1px solid ${isUnlocked ? (ach.color || 'var(--accent)') : 'var(--border-color)'}`,
                                borderRadius: '8px',
                                padding: '20px',
                                opacity: isUnlocked ? 1 : 0.5,
                                transition: 'all 0.3s',
                                filter: isUnlocked ? 'none' : 'grayscale(80%)',
                                boxShadow: isUnlocked ? `0 0 15px ${(ach.color || 'var(--accent)')}33` : 'none'
                            }}>
                                <div style={{ fontSize: '2em', marginBottom: '15px' }}>{ach.icon || '🏆'}</div>
                                <h4 style={{ margin: '0 0 5px 0', color: isUnlocked ? '#fff' : 'var(--text-secondary)' }}>{ach.title}</h4>
                                <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--text-secondary)' }}>{ach.description}</p>
                                {isUnlocked && (
                                    <div style={{ marginTop: '10px', fontSize: '0.75em', color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                        Unlocked!
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
