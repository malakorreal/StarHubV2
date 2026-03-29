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
        <div style={{ padding: '20px', animation: 'fadeIn 0.3s', position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, overflow: 'hidden' }}>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
                        gap: '12px',
                        maxHeight: '240px',
                        overflowY: 'auto',
                        padding: '5px'
                    }}>
                        {achievements.map(ach => {
                            const isUnlocked = unlocked.includes(ach.id)
                            const isSelected = selectedAch?.id === ach.id
                            return (
                                <div 
                                    key={ach.id} 
                                    onClick={() => setSelectedAch(ach)}
                                    style={{
                                        background: isSelected ? 'rgba(255,255,255,0.1)' : 'var(--card-bg)',
                                        border: `2px solid ${isSelected ? (ach.color || 'var(--accent)') : isUnlocked ? `${ach.color}40` : 'transparent'}`,
                                        borderRadius: '16px',
                                        aspectRatio: '1/1',
                                        cursor: 'pointer',
                                        opacity: isUnlocked ? 1 : 0.4,
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        filter: isUnlocked ? 'none' : 'grayscale(100%)',
                                        boxShadow: isSelected ? `0 0 15px ${(ach.color || 'var(--accent)')}44` : 'none',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                    onMouseOver={e => {
                                        if (!isSelected) {
                                            e.currentTarget.style.transform = 'translateY(-3px)'
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                                        }
                                    }}
                                    onMouseOut={e => {
                                        if (!isSelected) {
                                            e.currentTarget.style.transform = 'translateY(0)'
                                            e.currentTarget.style.background = 'var(--card-bg)'
                                        }
                                    }}
                                >
                                    {ach.is_limited && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '6px',
                                            right: '-18px',
                                            background: '#F44336',
                                            color: '#fff',
                                            fontSize: '0.45em',
                                            fontWeight: '900',
                                            padding: '1px 18px',
                                            transform: 'rotate(45deg)',
                                            zIndex: 1,
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                        }}>
                                            {t('settings.limited')}
                                        </div>
                                    )}

                                    <div style={{ fontSize: '2.2em', transition: 'transform 0.2s' }}>
                                        {ach.image ? (
                                            <img src={ach.image} style={{ width: '44px', height: '44px', objectFit: 'contain' }} alt={ach.title} />
                                        ) : (
                                            ach.icon || '🏆'
                                        )}
                                    </div>
                                    
                                    {isUnlocked && (
                                        <div style={{ 
                                            position: 'absolute',
                                            bottom: '6px',
                                            fontSize: '0.5em', 
                                            color: ach.color || 'var(--accent)', 
                                            fontWeight: '900', 
                                            textTransform: 'uppercase',
                                            background: `${ach.color}15`,
                                            padding: '1px 6px',
                                            borderRadius: '4px'
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
                        padding: '18px', 
                        background: 'rgba(255,255,255,0.03)', 
                        borderRadius: '20px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        gap: '18px',
                        alignItems: 'center',
                        minHeight: '90px',
                        transition: 'all 0.3s',
                        borderLeft: selectedAch ? `4px solid ${selectedAch.color || 'var(--accent)'}` : '1px solid var(--border-color)'
                    }}>
                        {selectedAch ? (
                            <>
                                <div style={{ 
                                    width: '56px', height: '56px', borderRadius: '14px', 
                                    background: `${selectedAch.color}10`, 
                                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                                    fontSize: '1.8em', border: `1px solid ${selectedAch.color}30`
                                }}>
                                    {selectedAch.image ? <img src={selectedAch.image} style={{ width: '36px' }} /> : selectedAch.icon}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1em' }}>{selectedAch.title}</h4>
                                        {selectedAch.is_limited && (
                                            <span style={{ 
                                                fontSize: '0.65em', 
                                                padding: '2px 8px', 
                                                background: '#F44336', 
                                                borderRadius: '5px', 
                                                fontWeight: '900',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>
                                                {t('settings.limited')}
                                            </span>
                                        )}
                                    </div>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85em', lineHeight: '1.5' }}>
                                        {selectedAch.description}
                                    </p>
                                </div>
                                {unlocked.includes(selectedAch.id) && (
                                    <div style={{ 
                                        color: selectedAch.color || 'var(--accent)', 
                                        fontWeight: '900', 
                                        fontSize: '0.75em',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        background: `${selectedAch.color}10`,
                                        padding: '5px 12px',
                                        borderRadius: '10px'
                                    }}>
                                        <span style={{ fontSize: '1.2em' }}>✓</span> {t('settings.unlocked')}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9em', textAlign: 'center', width: '100%' }}>
                                คลิกที่ไอคอนความสำเร็จเพื่อดูรายละเอียด
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
}

export default AchievementsView
