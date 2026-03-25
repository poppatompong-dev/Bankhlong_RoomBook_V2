# ระบบจองห้องประชุม — เทศบาลตำบลบ้านคลอง จ.พิษณุโลก

> *"เขียนโค้ดไม่ได้อยู่ใน JD แต่อยู่ในสายเลือด"*
>
> พัฒนาโดย **นักวิชาการคอมพิวเตอร์** · กองช่าง เทศบาลตำบลบ้านคลอง

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite + Tailwind CSS |
| **Backend** | Node.js + Express |
| **Database** | Google Sheets API (googleapis) |
| **Deploy** | Vercel (Serverless Functions + Static) |

---

## Quick Start (Local)

### 1. Clone & Install

```bash
git clone https://github.com/poppatompong-dev/Bankhlong_RoomBook_V2.git
cd Bankhlong_RoomBook_V2

# Backend
cd server-sheets && npm install && cd ..

# Frontend
cd client && npm install && cd ..
```

### 2. ตั้งค่า Google Service Account

1. เปิด [Google Cloud Console](https://console.cloud.google.com) → สร้าง Project
2. เปิดใช้ **Google Sheets API** + **Google Drive API**
3. สร้าง **Service Account** → ดาวน์โหลด JSON key
4. วางไฟล์ key ไว้ที่ `server-sheets/service-account.json`
5. แชร์ Google Sheet ให้ email ของ Service Account (สิทธิ์ **Editor**)

### 3. ตั้งค่า .env

Copy `.env.example` → `server-sheets/.env` แล้วแก้ไข:

```env
MOCK_DATABASE=false
SHEET_ID=your_google_sheet_id
SHEET_NAME=Booking-List3
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./service-account.json
ADMIN_PASSWORD=admin123
```

### 4. รันระบบ

```bash
# Terminal 1 — Backend
cd server-sheets && npm start

# Terminal 2 — Frontend
cd client && npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5001/api`

---

## Deploy to Vercel

### 1. Push ขึ้น GitHub

```bash
git push origin main
```

### 2. Import ใน Vercel

1. ไป [vercel.com/new](https://vercel.com/new) → Import repo
2. Vercel จะตรวจจับ `vercel.json` อัตโนมัติ

### 3. ตั้งค่า Environment Variables ใน Vercel

| Key | Value |
|-----|-------|
| `MOCK_DATABASE` | `false` |
| `SHEET_ID` | `your_google_sheet_id` |
| `SHEET_NAME` | `Booking-List3` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | `{ ... }` (วาง JSON ทั้งก้อนของ service account key) |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD` | `your_password` |

> **สำคัญ:** ใช้ `GOOGLE_SERVICE_ACCOUNT_JSON` (วาง JSON string ทั้งหมด) แทนการใช้ไฟล์

### 4. Deploy!

Vercel จะ build frontend (`client/dist`) + serverless API (`api/index.js`) อัตโนมัติ

---

## UX Flow

| หน้า | URL | คำอธิบาย |
|------|-----|-----------|
| Landing | `/` | หน้าหลัก · เทศบาลตำบลบ้านคลอง |
| จองห้องประชุม | `/dashboard` | ปฏิทิน + สถานะห้อง + ฟอร์มจอง (ไม่ต้อง Login) |
| ผู้ดูแลระบบ | `/admin` | Login → จัดการจอง / ห้อง / สถิติ / ผู้ใช้ / ตั้งค่า |

## Admin Login

- **Username:** `admin`
- **Password:** `admin123`

---

## Admin Capabilities

| Tab | ความสามารถ |
|-----|-----------|
| 📋 จัดการจอง | ดู / แก้ไข / ยกเลิก / ลบ การจอง + Export CSV |
| 🏢 จัดการห้อง | เพิ่ม / แก้ไข / ลบ ห้องประชุม (CRUD) |
| 📊 สถิติ | KPI · อัตราสำเร็จ · ห้องยอดนิยม · ช่วงเวลาพีค · Top bookers |
| 👥 จัดการผู้ใช้ | เพิ่ม / ลบ admin users |
| ⚙️ การตั้งค่า | Integrations · API Reference · Data model |

---

## ห้องประชุมเริ่มต้น (5 ห้อง)

| ห้อง | ที่นั่ง | ชั้น |
|------|---------|------|
| 💎 ห้องมณีจันทรา ชั้น 1 | 20 | 1 |
| 🏛️ ห้องพระพุทธสัมฤทธิ์โกสีย์ ชั้น 3 | 30 | 3 |
| ⚔️ ห้องชัยบุรี กองสาธารณสุข | 20 | 2 |
| 💻 ห้องประชุมสารสนเทศ (ศูนย์ข้อมูลข่าวสาร) | 10 | 2 |
| 🏟️ อาคารเอนกประสงค์ (โดม) | 200 | G |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/bookings` | ดึงรายการจองทั้งหมด |
| `POST` | `/api/bookings` | สร้างการจองใหม่ |
| `PUT` | `/api/bookings/:id` | แก้ไขการจอง |
| `DELETE` | `/api/bookings/:id` | ลบการจอง |
| `PATCH` | `/api/bookings/:id/cancel` | ยกเลิกการจอง |
| `GET` | `/api/rooms` | ดึงรายชื่อห้อง |
| `POST` | `/api/rooms` | เพิ่มห้องใหม่ |
| `PUT` | `/api/rooms/:id` | แก้ไขห้อง |
| `DELETE` | `/api/rooms/:id` | ลบห้อง |
| `POST` | `/api/auth/login` | เข้าสู่ระบบ Admin |
| `GET` | `/api/health` | ตรวจสอบสถานะระบบ |

---

## ฟีเจอร์หลัก

- ✅ Landing Page แสดงข้อมูลเทศบาลตำบลบ้านคลอง
- ✅ จองห้องประชุมได้ทันที ไม่ต้อง Login
- ✅ ปฏิทินเลือกวันที่ + hover ดูรายละเอียดการจอง
- ✅ แสดงสถานะห้องว่าง/ถูกจอง แบบ Real-time
- ✅ ป้องกันการจองซ้อนทับอัตโนมัติ
- ✅ Admin CRUD ครบทั้งการจอง + ห้องประชุม
- ✅ สถิติแบบ Dashboard พร้อม KPI และ Top bookers
- ✅ Export รายงาน CSV / Text
- ✅ Google Sheets เป็นฐานข้อมูล
- ✅ พร้อม Deploy บน Vercel
- ✅ ภาษาไทยครบถ้วน

---

*เทศบาลตำบลบ้านคลอง อ.เมือง จ.พิษณุโลก*
