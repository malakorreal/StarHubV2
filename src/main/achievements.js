/**
 * List of all available achievements in the launcher
 */
export const ACHIEVEMENTS = [
    {
        id: 'first_launch',
        title: 'ก้าวแรกสู่โลกกว้าง',
        description: 'เปิดเกมผ่าน StarHub Launcher เป็นครั้งแรก',
        icon: '🚀',
        image: null,
        is_limited: false,
        color: '#4CAF50'
    },
    {
        id: 'playtime_1h',
        title: 'นักสำรวจมือใหม่',
        description: 'เล่นเกมสะสมครบ 1 ชั่วโมง',
        icon: '⏱️',
        image: null,
        is_limited: false,
        color: '#2196F3'
    },
    {
        id: 'playtime_24h',
        title: 'ผู้หลงใหลในบล็อก',
        description: 'เล่นเกมสะสมครบ 24 ชั่วโมง',
        icon: '⭐',
        image: null,
        is_limited: false,
        color: '#FFC107'
    },
    {
        id: 'playtime_100h',
        title: 'ตำนานแห่ง StarHub',
        description: 'เล่นเกมสะสมครบ 100 ชั่วโมง',
        icon: '👑',
        image: null,
        is_limited: false,
        color: '#9C27B0'
    },
    {
        id: 'night_owl',
        title: 'นกฮูกราตรี',
        description: 'เล่นเกมในช่วงเวลาเที่ยงคืนถึงตี 4',
        icon: '🦉',
        image: null,
        is_limited: false,
        color: '#3F51B5'
    },
    {
        id: 'limited_event',
        title: 'คนเร็วกว่าแสง',
        description: 'เข้าร่วมกิจกรรมพิเศษในช่วงเวลาจำกัด',
        icon: '⚡',
        image: 'https://img5.pic.in.th/file/secure-sv1/lip.png',
        is_limited: true,
        color: '#F44336'
    }
]

export function getAchievementDetails(id) {
    return ACHIEVEMENTS.find(a => a.id === id) || null
}
