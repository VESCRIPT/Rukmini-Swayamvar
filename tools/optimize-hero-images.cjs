'use strict';
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const heroDir = path.join(__dirname, '..', 'public', 'hero');

async function main() {
  if (!fs.existsSync(heroDir)) {
    console.error('Missing folder:', heroDir);
    process.exit(1);
  }
  const files = fs.readdirSync(heroDir).filter((f) => f.endsWith('.jpg'));
  for (const f of files) {
    const input = path.join(heroDir, f);
    const output = path.join(heroDir, f.replace(/\.jpg$/i, '.webp'));
    await sharp(input).webp({ quality: 82, effort: 4 }).toFile(output);
    const inStat = fs.statSync(input);
    const outStat = fs.statSync(output);
    console.log(`${f} → ${path.basename(output)} (${inStat.size} → ${outStat.size} bytes)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
