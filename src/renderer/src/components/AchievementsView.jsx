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

    return (
        <div style={{ padding: '20px', animation: 'fadeIn 0.3s', position: 'relative' }}>
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
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '15px' }}>
                        {achievements.map(ach => {
                            const isUnlocked = unlocked.includes(ach.id)
                            return (
                                <div 
                                    key={ach.id} 
                                    onClick={() => setSelectedAch(ach)}
                                    style={{
                                        background: selectedAch?.id === ach.id ? 'rgba(255,255,255,0.1)' : 'var(--card-bg)',
                                        border: `2px solid ${isUnlocked ? (ach.color || 'var(--accent)') : 'transparent'}`,
                                        borderRadius: '16px',
                                        aspectRatio: '1/1',
                                        cursor: 'pointer',
                                        opacity: isUnlocked ? 1 : 0.4,
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        filter: isUnlocked ? 'none' : 'grayscale(100%)',
                                        boxShadow: isUnlocked ? `0 4px 12px ${(ach.color || 'var(--accent)')}22` : 'none',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                    onMouseOver={e => {
                                        e.currentTarget.style.transform = 'translateY(-5px) scale(1.05)'
                                        if (isUnlocked) e.currentTarget.style.boxShadow = `0 8px 20px ${(ach.color || 'var(--accent)')}44`
                                    }}
                                    onMouseOut={e => {
                                        e.currentTarget.style.transform = 'translateY(0) scale(1)'
                                        if (isUnlocked) e.currentTarget.style.boxShadow = `0 4px 12px ${(ach.color || 'var(--accent)')}22`
                                    }}
                                >
                                    {ach.is_limited && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '8px',
                                            right: '-20px',
                                            background: '#F44336',
                                            color: '#fff',
                                            fontSize: '0.5em',
                                            fontWeight: '900',
                                            padding: '1px 20px',
                                            transform: 'rotate(45deg)',
                                            zIndex: 1
                                        }}>
                                            {t('settings.limited')}
                                        </div>
                                    )}

                                    <div style={{ fontSize: '2.5em' }}>
                                        {ach.image ? (
                                            <img src={ach.image} style={{ width: '50px', height: '50px', objectFit: 'contain' }} alt={ach.title} />
                                        ) : (
                                            ach.icon || '🏆'
                                        )}
                                    </div>
                                    
                                    {isUnlocked && (
                                        <div style={{ 
                                            position: 'absolute',
                                            bottom: '5px',
                                            fontSize: '0.5em', 
                                            color: ach.color || 'var(--accent)', 
                                            fontWeight: '900', 
                                            textTransform: 'uppercase'
                                        }}>
                                            {t('settings.unlocked')}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Achievement Details Panel */}
                    <div style={{ 
                        marginTop: '30px', 
                        padding: '20px', 
                        background: 'rgba(0,0,0,0.2)', 
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        gap: '20px',
                        alignItems: 'center',
                        minHeight: '100px',
                        transition: 'all 0.3s',
                        opacity: selectedAch ? 1 : 0.5
                    }}>
                        {selectedAch ? (
                            <>
                                <div style={{ 
                                    width: '60px', height: '60px', borderRadius: '12px', 
                                    background: 'rgba(255,255,255,0.05)', 
                                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                                    fontSize: '2em', border: `1px solid ${selectedAch.color || 'var(--border-color)'}`
                                }}>
                                    {selectedAch.image ? <img src={selectedAch.image} style={{ width: '40px' }} /> : selectedAch.icon}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <h4 style={{ margin: 0, color: '#fff' }}>{selectedAch.title}</h4>
                                        {selectedAch.is_limited && <span style={{ fontSize: '0.7em', padding: '2px 6px', background: '#F44336', borderRadius: '4px', fontWeight: 'bold' }}>{t('settings.limited')}</span>}
                                    </div>
                                    <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9em' }}>{selectedAch.description}</p>
                                </div>
                                {unlocked.includes(selectedAch.id) && (
                                    <div style={{ color: selectedAch.color || 'var(--accent)', fontWeight: 'bold', fontSize: '0.8em' }}>
                                        ✓ {t('settings.unlocked')}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                คลิกที่ไอคอนความสำเร็จเพื่อดูรายละเอียด
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

export default AchievementsView
