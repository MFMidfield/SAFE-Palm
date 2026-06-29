# SAFE-Palm

**Sound-based AI For Early Palm-theft Detection** — ระบบตรวจจับเสียงตัดปาล์มน้ำมันแบบ Real-time ด้วย AI เพื่อแจ้งเตือนการลักลอบขโมยผลปาล์มในสวนที่อยู่ห่างไกล/ไม่มีอินเทอร์เน็ต

> โครงงานสำหรับ Thailand New Gen Inventors Award (I-New Gen Award) ระดับมัธยมศึกษา — โรงเรียนเมืองสุราษฎร์ธานี

---

## ภาพรวมโครงงาน

เกษตรกรรายย่อยที่ปลูกปาล์มน้ำมันมักถูกขโมยผลปาล์ม โดยเฉพาะสวนที่อยู่ลึกและไม่มีคนเฝ้าตลอดเวลา กล้องวงจรปิดที่ใช้ได้จริงในพื้นที่ห่างไกล (4G/PoE) มีราคาแพงเกินงบของเกษตรกร

SAFE-Palm แก้ปัญหานี้ด้วยอุปกรณ์ราคาประหยัด (~725 บาท/จุด) ที่ใช้ **ไมโครโฟน + AI จำแนกเสียง** ตรวจจับเสียงตัดปาล์ม แล้วเทียบกับ **ช่วงเวลาที่อนุญาตให้เก็บเกี่ยว (รอบตัด)** ที่ตั้งไว้ — ถ้าพบเสียงตัดปาล์ม **นอกรอบตัด** จะถือว่าน่าสงสัยและแจ้งเตือนผ่าน LINE ทันที

### การทำงานโดยสรุป

```
ESP32 + ไมโครโฟน (Node)  ──LoRa──►  ESP32 Gateway (WiFi/4G)  ──►  Cloud (AI จำแนกเสียง)
                                                                      │
                                            ┌─────────────────────────┘
                                            ▼
                       เทียบกับ "รอบตัด" ของผู้ใช้ใน Supabase
                                            │
                  ┌─────────────────────────┴─────────────────────────┐
                  ▼ อยู่ในรอบตัด                          ▼ นอกรอบตัด
            บันทึกลงตารางเหตุการณ์                   บันทึก + แจ้งเตือนลง LINE
            (ไม่แจ้งเตือน)                          ("เสียงน่าสงสัยนอกเวลาเก็บเกี่ยว")
```

### ส่วนประกอบของระบบ

| ส่วน | เทคโนโลยี | หน้าที่ |
|---|---|---|
| **Web App** | Vite + React 19 + React Router | แดชบอร์ด, เหตุการณ์, แผนที่สวน, จัดการอุปกรณ์, **ตั้งค่ารอบตัดปาล์ม** |
| **Database / Auth** | Supabase (PostgreSQL + Auth + Storage) | เก็บข้อมูลผู้ใช้/อุปกรณ์/เหตุการณ์/รอบตัด แยกตาม user ด้วย RLS |
| **Automation** | n8n | จำลอง/รับเสียง → จำแนกด้วย AI → คำนวณรอบตัด → บันทึก → แจ้ง LINE |
| **แจ้งเตือน** | LINE Messaging API (LINE OA) | ส่งข้อความแจ้งเตือนถึงเจ้าของสวน |
| **Hardware** | ESP32 + INMP441 + LoRa SX1278 | ตรวจจับและส่งข้อมูลเสียงจากสวน |

---

## ฟีเจอร์หน้าเว็บ

- **แดชบอร์ด** — สรุปสถิติ, กราฟ, แผนที่สวน, ประวัติแจ้งเตือนล่าสุด (พร้อมป้าย "ในรอบตัด / นอกรอบตัด")
- **เหตุการณ์** — ตารางบันทึกการตรวจจับเสียงทั้งหมด ค้นหา/กรองตามประเภท แสดงทั้งแบบตารางและการ์ด
- **พื้นที่สวน** — กำหนดจุดกลางและขอบเขตสวนบนแผนที่ดาวเทียม (Leaflet)
- **อุปกรณ์** — จัดการ ESP32 Node / Gateway
- **ตั้งค่าเวลาตัดปาล์ม** — ปฏิทินรายเดือน + ตั้งรอบตัด (กี่เดือนต่อรอบ, วันที่ตัด, ช่วงเวลาตัด, จำนวนวันต่อรอบ)
- รองรับ Dark/Light mode และใช้งานได้บนมือถือ

---

## โครงสร้างโปรเจกต์

```
SAFE-Plam/
├── src/
│   ├── pages/              # หน้าเว็บ (Dashboard, Events, Plantation, Devices, Harvest, Settings, Login, Register)
│   ├── components/         # layout (Sidebar/BottomNav), dashboard widgets
│   ├── contexts/           # AuthContext, ThemeContext
│   ├── lib/supabase.js     # Supabase client
│   └── styles/             # design-system.css (ธีม glass)
├── claude/                 # เอกสาร + ไฟล์ SQL (ดูหมายเหตุด้านล่าง)
│   ├── SQL-*.sql           # สคริปต์สร้างตารางบน Supabase
│   └── *.md                # บริบทโครงงาน / log
├── n8n/                    # workflow สำหรับ import เข้า n8n
├── .env-example            # ตัวอย่างไฟล์ตั้งค่า
└── package.json
```

> หมายเหตุ: โฟลเดอร์ `claude/` และ `n8n/` ถูกตั้งไว้ใน `.gitignore` (เป็นไฟล์ทำงานภายใน) หากย้ายเครื่องให้คัดลอกไปด้วยเพื่อใช้สคริปต์ติดตั้ง

---

## ความต้องการของระบบ (Prerequisites)

- **Node.js** v20 ขึ้นไป (พัฒนาบน v24) + npm
- บัญชี **Supabase** (ฟรี) — https://supabase.com
- บัญชี **Google Cloud** สำหรับเปิด Google OAuth (ใช้ล็อกอิน)
- (ถ้าจะใช้แจ้งเตือน) **n8n** (cloud หรือ self-host) + **LINE Official Account** + Channel access token
- (ถ้าจะใช้ AI จำแนกเสียงใน n8n) คีย์ **OpenRouter** หรือ provider อื่นที่ใช้ได้

---

## วิธีติดตั้งแบบ Step by Step

### 1) ติดตั้งโค้ดฝั่งเว็บ

```bash
# clone โปรเจกต์ (หรือเข้าโฟลเดอร์ที่มีอยู่)
cd SAFE-Plam

# ติดตั้ง dependency
npm install
```

### 2) สร้างโปรเจกต์ Supabase

1. เข้า https://supabase.com → **New project** ตั้งชื่อและรหัสผ่านฐานข้อมูล
2. ไปที่ **Project Settings → API** จดค่าไว้ 2 ค่า:
   - `Project URL` → ใช้เป็น `VITE_SUPABASE_URL`
   - `anon public` key → ใช้เป็น `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → เก็บไว้ใช้ใน n8n (อย่าใส่ในฝั่งเว็บ)

### 3) สร้างตารางในฐานข้อมูล (รัน SQL ตามลำดับ)

เปิด **Supabase → SQL Editor** แล้วรันไฟล์ในโฟลเดอร์ `claude/` **ตามลำดับนี้**:

1. **ตาราง `profiles`** (ข้อมูลผู้ใช้) — รันสคริปต์นี้ก่อน:
   ```sql
   CREATE TABLE public.profiles (
     id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
     first_name TEXT NOT NULL,
     last_name  TEXT NOT NULL,
     nickname   TEXT,
     phone      TEXT NOT NULL,
     role       TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users manage own profile" ON public.profiles
     FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
   ```
2. `claude/SQL-devices.sql` — เพิ่ม `avatar_url` ใน profiles + ตาราง devices (เวอร์ชันแรก)
3. `claude/SQL-devices-v2.sql` — ปรับ devices เป็นแบบ per-user + เพิ่ม `phone`
4. `claude/SQL-plantation.sql` — ตาราง `plantation_configs` (พื้นที่สวน)
5. `claude/SQL-events.sql` — ตาราง `events` (เหตุการณ์) **รวมคอลัมน์ `in_harvest_window` แล้ว**
6. `claude/SQL-harvest.sql` — ตาราง `harvest_schedules` (รอบตัดปาล์ม)

> ถ้าเคยรัน `SQL-events.sql` เวอร์ชันเก่าไปแล้ว ให้รันบรรทัด `ALTER TABLE public.events ADD COLUMN IF NOT EXISTS in_harvest_window ...` ในไฟล์เดิมซ้ำได้ (ปลอดภัย ไม่ทับข้อมูล)

### 4) สร้าง Storage bucket สำหรับรูปโปรไฟล์

1. ไปที่ **Supabase → Storage → New bucket** ตั้งชื่อ `avatars` และเลือก **Public bucket**
2. เพิ่ม policy ให้ผู้ใช้อัปโหลด/แก้/ลบไฟล์ของตัวเองได้ (อ่านสาธารณะ) — ตั้งใน Storage → Policies

### 5) เปิดการล็อกอินด้วย Google (OAuth)

1. **Supabase → Authentication → Providers → Google** เปิดใช้งาน แล้วใส่ Client ID/Secret จาก Google Cloud Console
2. ใน Google Cloud → OAuth credentials เพิ่ม **Authorized redirect URI** เป็นค่าจาก Supabase (รูปแบบ `https://<project>.supabase.co/auth/v1/callback`)
3. **Supabase → Authentication → URL Configuration** ใส่ Site URL เป็น `http://localhost:5173` (ตอนพัฒนา) และ URL ของ production เมื่อ deploy

### 6) ตั้งค่าไฟล์ Environment

คัดลอก `.env-example` เป็น `.env` แล้วเติมค่า:

```bash
cp .env-example .env
```

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co     # Project URL จากขั้นตอน 2
VITE_SUPABASE_ANON_KEY=xxx                      # anon public key
VITE_ADMIN_EMAIL=you@example.com                # อีเมลที่จะให้เป็น admin (อีเมลอื่นเป็น user ปกติ)
```

### 7) รันเว็บ

```bash
npm run dev
```

เปิดเบราว์เซอร์ที่ http://localhost:5173 → ล็อกอินด้วย Google → ครั้งแรกจะให้กรอกข้อมูลโปรไฟล์ → เข้าสู่แดชบอร์ด

ไปที่เมนู **เวลาตัดปาล์ม** เพื่อตั้งรอบตัด (กี่เดือนต่อรอบ / วันที่ตัด / ช่วงเวลา) — ค่านี้จะถูกใช้ตัดสินว่าเหตุการณ์ที่ตรวจจับได้อยู่ในรอบตัดหรือไม่

---

## ตั้งค่า n8n + LINE (ส่วนแจ้งเตือน — ไม่บังคับสำหรับทดสอบหน้าเว็บ)

1. เปิด n8n → **Import from File** นำเข้า workflow จากโฟลเดอร์ `n8n/`:
   - `events-mockup-insert.json` — สร้างเหตุการณ์จำลอง (ทดสอบ end-to-end เร็ว)
   - `events-ai-generate.json` — จำลอง audio metadata + จำแนกด้วย AI ผ่าน OpenRouter
   - `board-offline-alert.json` — แจ้งเตือนเมื่ออุปกรณ์ออฟไลน์
2. ในแต่ละ workflow เปิด node **Config** แล้วกรอกค่า:
   - `SUPABASE_URL`, `SERVICE_ROLE_KEY` (service_role จากขั้นตอน 2)
   - `USER_ID` — UUID ของผู้ใช้ (ดูได้ที่ Supabase → Authentication → Users)
   - `LINE_CHANNEL_TOKEN`, `LINE_USER_ID` — จาก LINE Developers Console (LINE OA + Messaging API)
   - `OPENROUTER_API_KEY`, `MODEL` (เฉพาะ `events-ai-generate`)
3. กด **Execute Workflow** เพื่อทดสอบ — ระบบจะ:
   - ดึงรอบตัดของ `USER_ID` จากตาราง `harvest_schedules`
   - คำนวณ `in_harvest_window` ของเหตุการณ์ (เทียบเวลา Asia/Bangkok)
   - บันทึกลงตาราง `events` เสมอ
   - แจ้ง LINE **เฉพาะเหตุการณ์ที่เกิดนอกรอบตัด** (และความแม่นยำ > 70%)

> หมายเหตุ: ระบบใช้ **LINE Messaging API** เท่านั้น (LINE Notify ปิดบริการแล้วตั้งแต่ 31 มี.ค. 2568)

---

## คำสั่งที่ใช้บ่อย

```bash
npm run dev       # รัน dev server (HMR)
npm run build     # build สำหรับ production → โฟลเดอร์ dist/
npm run preview   # ดูตัวอย่าง build
npm run lint      # ตรวจ ESLint
```

---

## Tech Stack

React 19 · Vite · React Router · Supabase JS · Leaflet / react-leaflet · Recharts · Bootstrap · react-image-crop
