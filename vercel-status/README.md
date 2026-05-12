# StarHub Status API + Dashboard (Vercel)

โฟลเดอร์นี้เป็นชุด API + เว็บหน้าเดียว สำหรับเอาไป deploy บน Vercel เพื่อใช้:
- บอกว่า StarHub ปิดปรับปรุงไหม (true/false) + ข้อความประกาศ
- แสดงจำนวนผู้ใช้งานที่กำลังออนไลน์ (อาศัย heartbeat จาก Launcher)
- แจก manifest สำหรับตรวจ/ignore ไฟล์มอด/คอนฟิกให้แม่นขึ้น (อิง ignoreFiles จาก npoint)

## Deploy บน Vercel
1) สร้างโปรเจกต์ใหม่ใน Vercel และเลือก Root Directory เป็น `vercel-status`
2) ตั้ง Environment Variables (ถ้าต้องการ)
3) Deploy

## Environment Variables

### ดึงข้อมูล instances จาก npoint (เหมือนเดิม)
- `NPOINT_INSTANCES_URL` = URL JSON ของ instances (เช่น npoint raw)
  - ถ้าไม่ตั้งค่า จะ default ไปที่ `https://api.npoint.io/e941143771dfcea29992`

### สถานะปิดปรับปรุง
- `STARHUB_MAINTENANCE` = `true` | `false`
- `STARHUB_MAINTENANCE_MESSAGE` = ข้อความประกาศ (ไม่ใส่ก็ได้)

### เช็คสถานะเซิร์ฟ Minecraft (ไม่บังคับ)
- `STARHUB_SERVER_IP` = `host:port` (เช่น `example.com:25565`)
- `STARHUB_PRIMARY_INSTANCE_ID` = ถ้าไม่ตั้ง `STARHUB_SERVER_IP` ระบบจะพยายามอ่าน `serverIp` ของ instance ตัวนี้จาก npoint (default: `luminaevernight`)
- `STARHUB_MAX_SERVER_CHECKS` = จำกัดจำนวน instance ที่จะเช็ค `serverIp` ต่อ 1 ครั้ง (default: 12)

### Online Users (แนะนำ: Upstash Redis)
เพื่อให้จำนวนผู้ใช้ออนไลน์ “นับได้จริง” บน serverless แนะนำใช้ Upstash Redis (REST):
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

ถ้าไม่ตั้งค่า 2 ตัวนี้ `onlineUsers` จะเป็น `null`

## Endpoints
- `GET /api/status`
- `POST /api/heartbeat` body: `{ "deviceId": "xxx", "userId": "optional", "launcherVersion": "optional" }`
- `GET /api/instances`
- `GET /api/manifest/<instanceId>`
- `POST /api/check` body: `{ "instanceId": "optional", "missing": ["..."], "corrupt": ["..."] }`
