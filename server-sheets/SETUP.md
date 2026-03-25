# Google Sheets Backend – คู่มือติดตั้ง

## 1. สร้าง Google Cloud Project และ Service Account

### 1.1 สร้าง Project
1. ไปที่ [console.cloud.google.com](https://console.cloud.google.com)
2. คลิก **"Select a project"** → **"New Project"**
3. ตั้งชื่อ เช่น `meeting-room-booking` → **Create**

### 1.2 เปิด Google Sheets API
1. ไปที่ **APIs & Services → Library**
2. ค้นหา **"Google Sheets API"** → **Enable**
3. ค้นหา **"Google Calendar API"** → **Enable** (ถ้าต้องการ)

### 1.3 สร้าง Service Account
1. ไปที่ **APIs & Services → Credentials**
2. คลิก **"+ Create Credentials"** → **"Service account"**
3. ตั้งชื่อ เช่น `sheets-writer` → **Create and Continue** → **Done**
4. คลิกที่ Service Account ที่สร้างไว้
5. ไปที่แท็บ **"Keys"** → **"Add Key"** → **"Create new key"** → **JSON** → **Create**
6. ไฟล์ `*.json` จะดาวน์โหลดอัตโนมัติ

### 1.4 Rename และวางไฟล์
```
mv ~/Downloads/your-project-*.json  ./service-account.json
```

---

## 2. แชร์ Google Sheet ให้ Service Account

1. เปิด Google Sheet:  
   `https://docs.google.com/spreadsheets/d/1yFzyJeRQwp9gOaI00QGoLW3iIwQ3SZh02jhyeQtiinQ`
2. คลิก **Share** (มุมบนขวา)
3. วาง **email ของ Service Account** (ดูจากไฟล์ JSON → `"client_email"`)
4. ให้สิทธิ์ **Editor** → **Send**

> ตัวอย่าง email: `sheets-writer@your-project.iam.gserviceaccount.com`

---

## 3. ติดตั้งและรัน Backend

```bash
cd server-sheets
npm install
npm run dev
```

เมื่อสำเร็จจะเห็น:
```
✅ Google Sheets connection verified
🚀 Sheets Backend ready!
📡 API: http://localhost:5001/api
📊 Sheet: https://docs.google.com/spreadsheets/d/...
🔄 Cache refresh: every 7 seconds
```

---

## 4. ทดสอบ API

```bash
# Health check
curl http://localhost:5001/api/health

# ดูการจองทั้งหมด
curl http://localhost:5001/api/bookings

# ตรวจสอบห้องว่าง
curl "http://localhost:5001/api/bookings/check-availability?room=ห้องมณีจันทรา&date=2026-04-01&startTime=09:00&endTime=11:00"

# สร้างการจอง
curl -X POST http://localhost:5001/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "name": "สมชาย ใจดี",
    "phone": "081-234-5678",
    "room": "ห้องมณีจันทรา",
    "date": "2026-04-01",
    "startTime": "09:00",
    "endTime": "11:00",
    "purpose": "ประชุมแผนงาน"
  }'

# ยกเลิกการจอง
curl -X PATCH http://localhost:5001/api/bookings/bk_abc123/cancel
```

---

## 5. API Reference

| Method | Path | รายละเอียด |
|--------|------|------------|
| `GET` | `/api/health` | ตรวจสอบสถานะ |
| `GET` | `/api/rooms` | รายชื่อห้องทั้งหมด |
| `GET` | `/api/rooms/:id/availability?date=` | ช่วงเวลาว่างของห้อง |
| `GET` | `/api/bookings` | รายการจองทั้งหมด (รองรับ ?date, ?room, ?status) |
| `GET` | `/api/bookings/:id` | การจองรายการเดียว |
| `GET` | `/api/bookings/check-availability` | ตรวจก่อนจอง |
| `POST` | `/api/bookings` | สร้างการจองใหม่ |
| `PATCH` | `/api/bookings/:id/cancel` | ยกเลิกการจอง |

---

## 6. ตั้งค่า LINE Notify (ไม่บังคับ)

1. ไปที่ [notify-bot.line.me](https://notify-bot.line.me)
2. กด **"Log in"** → **"Generate token"**
3. ตั้งชื่อ Token และเลือก Chat
4. Copy token → วางใน `.env`:
```
LINE_NOTIFY_TOKEN=your_token_here
```

---

## 7. โครงสร้างไฟล์

```
server-sheets/
├── server.js                  # Entry point + cache scheduler
├── .env                       # Config (ต้องกรอก)
├── service-account.json       # Service Account key (ดาวน์โหลดจาก GCP)
├── routes/
│   ├── bookings.js            # Booking CRUD
│   └── rooms.js               # Room list + availability
├── services/
│   ├── sheets.js              # Google Sheets + cache + Calendar
│   └── lineNotify.js          # LINE Notify
└── utils/
    └── validation.js          # Input validation
```

---

## 8. Schema ใน Google Sheet

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| id | name | phone | room | date | startTime | endTime | purpose | status | createdAt |

> แถวที่ 1 = Headers (สร้างอัตโนมัติเมื่อ start server)  
> แถวที่ 2+ = ข้อมูลการจอง

---

## 9. ข้อควรระวัง

> [!WARNING]
> อย่า commit `service-account.json` หรือ `.env` ขึ้น Git  
> เพิ่มไว้ใน `.gitignore`:
> ```
> service-account.json
> .env
> ```

> [!NOTE]
> Google Sheets API quotas: 300 requests/minute per project  
> ระบบ cache 7 วินาทีช่วยลด API calls ได้มาก
