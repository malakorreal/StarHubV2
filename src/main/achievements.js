/**
 * List of all available achievements in the launcher
 */
export const ACHIEVEMENTS = [
    {
        id: 'first_launch',
        title: 'ก้าวแรกสู่โลกกว้าง',
        description: 'เปิดเกมผ่าน StarHub Launcher เป็นครั้งแรก',
        icon: '🚀',
        color: '#4CAF50' // Green
    },
    {
        id: 'playtime_1h',
        title: 'นักสำรวจมือใหม่',
        description: 'เล่นเกมสะสมครบ 1 ชั่วโมง',
        icon: '⏱️',
        color: '#2196F3' // Light Blue
    },
    {
        id: 'playtime_24h',
        title: 'ผู้หลงใหลในบล็อก',
        description: 'เล่นเกมสะสมครบ 24 ชั่วโมง',
        icon: '⭐',
        color: '#FFC107' // Gold
    },
    {
        id: 'playtime_100h',
        title: 'ตำนานแห่ง StarHub',
        description: 'เล่นเกมสะสมครบ 100 ชั่วโมง',
        icon: '👑',
        color: '#9C27B0' // Purple
    },
    {
        id: 'night_owl',
        title: 'นกฮูกราตรี',
        description: 'เล่นเกมในช่วงเวลาเที่ยงคืนถึงตี 4',
        icon: '🦉',
        color: '#3F51B5' // Indigo
    }
]

export function getAchievementDetails(id) {
    return ACHIEVEMENTS.find(a => a.id === id) || null
}
