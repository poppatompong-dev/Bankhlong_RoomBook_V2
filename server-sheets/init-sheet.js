/**
 * One-time script to initialize Google Sheet headers.
 * Run: node init-sheet.js
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');

const HEADERS = ['id', 'name', 'phone', 'room', 'date', 'startTime', 'endTime', 'purpose', 'status', 'createdAt'];

async function initSheet() {
  console.log('\n🚀 Sheet Initializer');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Sheet ID  : ${process.env.SHEET_ID}`);
  console.log(`📋 Sheet Name: ${process.env.SHEET_NAME}`);

  let credentials;

  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      console.log('🔑 Using inline JSON credentials');
    } catch (e) {
      console.error('❌ GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON');
      process.exit(1);
    }
  } else {
    const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || './service-account.json';
    if (!fs.existsSync(keyFile)) {
      console.error(`❌ Service account file not found: ${keyFile}`);
      console.error('\n💡 Please either:');
      console.error('   1. Place your service-account.json in server-sheets/');
      console.error('   2. Set GOOGLE_SERVICE_ACCOUNT_JSON in .env with the JSON content');
      process.exit(1);
    }
    credentials = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
    console.log(`🔑 Using key file: ${keyFile}`);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const range = `${process.env.SHEET_NAME}!A1:J1`;

  console.log('\n🔍 Checking existing headers...');

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range
  });

  const existing = res.data.values?.[0] || [];

  if (existing[0] === 'id') {
    console.log('✅ Headers already exist:', existing.join(' | '));
    console.log('\n✅ Sheet is ready to use!\n');
    return;
  }

  console.log('📝 Writing headers...');
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.SHEET_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: [HEADERS] }
  });

  console.log('✅ Headers written:', HEADERS.join(' | '));
  console.log('\n✅ Sheet initialized successfully!\n');
}

initSheet().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
