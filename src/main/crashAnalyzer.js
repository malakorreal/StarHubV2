/**
 * Common Minecraft Crash Patterns and Solutions
 */
const CRASH_PATTERNS = [
    {
        id: 'oom',
        patterns: [
            'insufficient memory for the java runtime environment',
            'native memory allocation (mmap) failed',
            'java.lang.OutOfMemoryError'
        ],
        error: 'หน่วยความจำไม่เพียงพอ (Out of Memory)',
        solution: 'วิธีแก้ที่แนะนำ:\n- ลดค่า RAM ในหน้า Settings (แท็บ General)\n- หากเครื่องมี RAM 8GB แนะนำให้ตั้งไว้ที่ 3072-4096 MB\n- ปิดโปรแกรมอื่นที่ไม่ได้ใช้งานเพื่อคืน RAM ให้ระบบ'
    },
    {
        id: 'vlc',
        patterns: [
            'libvlc',
            'vlc'
        ],
        error: 'Video Mod Error (VLC)',
        solution: 'Mod ที่ใช้วิดีโอ (เช่น FancyMenu) ทำงานผิดพลาด\n\nวิธีแก้:\n- โปรดติดตั้ง Visual C++ Redistributable (x64)\n- หรือปิดการใช้งาน Video Background ในตัวเกม'
    },
    {
        id: 'session',
        patterns: [
            'failed to login: invalid session'
        ],
        error: 'Session หมดอายุ (Invalid Session)',
        solution: 'เซสชันการล็อกอินของคุณหมดอายุแล้ว\n\nวิธีแก้:\n- กรุณาเปิดหน้า Settings แล้วทำการ Log Out จากนั้น Log In ใหม่ เพื่อรีเฟรชเซสชัน'
    },
    {
        id: 'java_version',
        patterns: [
            'has been compiled by a more recent version of the Java Runtime',
            'UnsupportedClassVersionError'
        ],
        error: 'เวอร์ชัน Java ไม่ถูกต้อง',
        solution: 'Java ที่ใช้อยู่ไม่รองรับกับตัวเกมเวอร์ชันนี้\n\nวิธีแก้:\n- ไปที่หน้า Settings แล้วตรวจสอบว่า Java Path ถูกต้อง\n- แนะนำให้ใช้ Java 17 สำหรับ Minecraft 1.18 ขึ้นไป และ Java 8 สำหรับเวอร์ชันเก่ากว่า'
    },
    {
        id: 'opengl',
        patterns: [
            'GLFW error 65542',
            'pixel format not accelerated',
            'org.lwjgl.opengl.OpenGLException'
        ],
        error: 'ปัญหาไดรเวอร์การ์ดจอ (OpenGL)',
        solution: 'ตัวเกมไม่สามารถเริ่มระบบกราฟิกได้\n\nวิธีแก้:\n- อัปเดตไดรเวอร์การ์ดจอ (NVIDIA/AMD/Intel) ให้เป็นเวอร์ชันล่าสุด\n- หากใช้โน้ตบุ๊ก ตรวจสอบว่าเกมรันบนการ์ดจอแยกหรือไม่'
    },
    {
        id: 'zip_corrupt',
        patterns: [
            'java.util.zip.ZipException',
            'invalid distance too far back',
            'Unexpected end of ZLIB input stream'
        ],
        error: 'ไฟล์เกมเสียหาย (Corrupt Files)',
        solution: 'พบไฟล์ Mod หรือ Library บางตัวเสียหาย\n\nวิธีแก้:\n- กดปุ่ม "ซ่อมแซมไฟล์เกม" (Repair Game Files) ในหน้าเมนูเครื่องมือ เพื่อโหลดไฟล์ใหม่'
    },
    {
        id: 'mixin',
        patterns: [
            'Mixin transformation failed',
            'org.spongepowered.asm.mixin.transformer.throwables.MixinTransformerError'
        ],
        error: 'Mod ขัดแย้งกัน (Mod Conflict)',
        solution: 'เกิดความผิดพลาดในการรวมโค้ดของ Mod หลายตัวเข้าด้วยกัน\n\nวิธีแก้:\n- ตรวจสอบว่าได้เพิ่ม Mod อื่นเข้าไปเองหรือไม่\n- หากไม่ได้เพิ่มเอง ให้ลองกด "ซ่อมแซมไฟล์เกม" หรือแจ้งผู้ดูแลเซิร์ฟเวอร์'
    }
]

/**
 * Analyzes game logs to find common crash causes
 * @param {string} log Full session log text
 * @returns {object|null} Found error info or null
 */
export function analyzeCrash(log) {
    if (!log) return null
    
    const lowerLog = log.toLowerCase()
    
    for (const item of CRASH_PATTERNS) {
        if (item.patterns.some(p => lowerLog.includes(p.toLowerCase()))) {
            return {
                error: item.error,
                solution: item.solution
            }
        }
    }
    
    return null
}
