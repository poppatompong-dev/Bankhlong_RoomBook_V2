/**
 * ตั้งค่า Google Calendar credentials ใน .env
 * รัน: node setup-google-calendar.js
 * (รันครั้งเดียว จากนั้นลบหรือเก็บไว้ใช้ซ้ำ)
 */
const fs   = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');

const SA_JSON = JSON.stringify({
  type: 'service_account',
  project_id: 'bk-booking-room',
  private_key_id: 'd096cac3ee879a092e523ba3e9e648e9794e0992',
  private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDDflC7z1flxhDz\n7c4cqJywcTUb0Itf7THgLTCiTlXqP/y1X3HyufTy5+g+ieq2H1Jbgy1mHja2WKhF\nfaMxD0K2s1yfRJbJ35gfwE7zhqLQwTZLy/jbdVbuAajXAyiQTCFQWMO3dx16alTE\nifUh8wwrGZyhMHAc+2dgidyp/hLzm/9/WdWcH/dYy3IGDP5HfjNr872LPeTPYG6P\nmmlKf0MNtFbnAWeTQ7DfIIB+UqZlkS8f30O7qspkPGXRiZ/V2qv9Tqka4GDr+JbD\nR8R8wkgBiDvfDNOwjZRfU1lBl04+6fB0I4XINNaiUUluY38+A/L0YwHkQcNexWDc\nPPyJFeB9AgMBAAECggEAGo8FGdbL6rfzYqhKiaMwkln27J3y6WfYkEujYVGCI45o\n3x0l5mN0DzIJX8Gt5OsxbaRPHSH6reAykCpG6unXVuncKfkQAUICsUGXmEcQxIqT\nPU3rM6ln03LfRMK1lpD5L6i3givJEfHzLTZO2rthylMy78UcXhubikaAd4nAel7Y\nytgwEZ7mtpZSLF/IL9gUfqvijrC6TjoY/4dMvO45hjGeqzAnSU8wYrgJk0EA7Ts2\nLXdFk6Z3hpwW2larowLbC1rJDewq6J3BymBtskm4YixSFM9uQbdEv74Vr844HnnI\nXEasjYEGz8qznNdYHhWplyTijDLdl89aC5d9ZD+98wKBgQDpWgfj3xngZcTiXtMo\nI6Y5A6qhhVNY8v9BseMTJ9MsRqpG2C4m3wUOGgBcN1mjgbKJ2OIjLryqxptE9Kv2\nljhFYyQdKtIvPCVhjd+etBCOFyw29K9aVJztM0x9iv8mlGsKCuHg0eHcL3Nc+syb\nHHOL9I+MRV2y/Cva+AaZZYR2iwKBgQDWd6PG7lmXpZufSgLF8tdhBMabzFD2tRPP\nPlh1iorlLm4VRIarqlNgFKhoJ3FsLQbuSi6JmdMTlJyzlw21KU7fW4/ft5uBF/3O\nxe0ZIGR6IW3wcJUjLtc1Nc64dy7SSyPb9TWaFqsuwVF/feYFFXN8hrwMmVC6AcMW\n2ZoHxS7uFwKBgQCjBq0gfAt+BFuKsyjekBlfF7qr4ZObPxkp8ndsOJSGCFCJ8ho8\nOe80LOI3isvrOX9cYtOKNOrGfL6ZbD5/pe9mOp9OaU4yhdiv0Qh7vd0bCAFx23xu\npVKFPSOhSex8LZCikXvBL6CVzejQ+r7bVwM6sf9fxk5x709MSZ+Cp7PlhQKBgFFv\namPeG2zmuFnaq4Toefnf6147Tb7v8Q6veL1hFu6BG9G9jHlgmnoQPgYWfA38ZvZS\neqtLGogD1SCoSc8xWT6csNvdBxIUvw4lv6rbzutFCE7VIPwUDCmrPcxzjPbTC1G5\nIVpaIzQEueJ0NsRVad2t93e9O5b1llN12vP6XqCPAoGAUeEwfWkRrtTw6Ttib2pe\ng95DI8z82CIkan0Y3bHUUKyBLz4A0n8WvhFB2QrVG5wkQDeVsYPHeLolVchBEpag\nc9F0SwmEB5XLYY25IwWEh3Nwmb4Nmp9Owc1npQYfwVf1dpkhB/v2lWGjCt1qaHrF\nzWdVQIgEQIVpwy70QlWWHPs=\n-----END PRIVATE KEY-----\n',
  client_email: 'bk-booking-room@bk-booking-room.iam.gserviceaccount.com',
  client_id: '109003827294535427360',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/bk-booking-room%40bk-booking-room.iam.gserviceaccount.com',
  universe_domain: 'googleapis.com'
});

const GCAL_LINES = [
  `GOOGLE_CALENDAR_ID=cvq6279kfec56nnmsa90sq16vc@group.calendar.google.com`,
  `GOOGLE_SERVICE_ACCOUNT_JSON=${SA_JSON}`,
  `APP_URL=http://localhost:5173`
];

// อ่าน .env เดิม (ถ้ามี) แล้วลบ key เก่าออกก่อน insert ใหม่
let existing = '';
if (fs.existsSync(envPath)) {
  existing = fs.readFileSync(envPath, 'utf8');
  existing = existing.split('\n')
    .filter(line => {
      const key = line.split('=')[0];
      return !['GOOGLE_CALENDAR_ID', 'GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_CLIENT_ID',
               'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'APP_URL'].includes(key);
    })
    .join('\n')
    .trimEnd();
}

const content = existing
  ? existing + '\n\n# ─── Google Calendar ───────────────────────\n' + GCAL_LINES.join('\n') + '\n'
  : GCAL_LINES.join('\n') + '\n';

fs.writeFileSync(envPath, content, 'utf8');
console.log('✅ .env updated with Google Calendar Service Account credentials');
console.log('📧 Service Account:', 'bk-booking-room@bk-booking-room.iam.gserviceaccount.com');
console.log('📅 Calendar ID    :', 'cvq6279kfec56nnmsa90sq16vc@group.calendar.google.com');
console.log('');
console.log('⚠️  ต้องแชร์ปฏิทินให้ Service Account มีสิทธิ์ "Make changes to events" ด้วย!');
console.log('   (ตอนนี้มีแค่ "See all event details" ซึ่งเป็น read-only)');
