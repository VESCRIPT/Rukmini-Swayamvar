'use strict';

const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const APP_DOWNLOAD_URL = 'https://rukminiswayamvar.com';
const outDir = path.join(__dirname, '..', 'public', 'store');
const outFile = path.join(outDir, 'app-download-qr.png');

async function main() {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  await QRCode.toFile(outFile, APP_DOWNLOAD_URL, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 280,
    color: {
      dark: '#1a1a1a',
      light: '#ffffff'
    }
  });

  console.log('Wrote', outFile);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
