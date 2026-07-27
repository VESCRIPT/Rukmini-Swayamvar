'use strict';

const path = require('path');
const sharp = require('sharp');

const input = path.join(__dirname, '..', 'src', 'assets', 'logo_navbar.png');
const output = path.join(__dirname, '..', 'public', 'navbar-logo.png');

function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Make near-white / light-pink pixels transparent; soften edges for anti-aliasing. */
function alphaForBackground(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const lum = luminance(r, g, b);

  if (lum > 228 && saturation < 0.12) {
    if (lum > 252) return 0;
    return Math.round(((252 - lum) / 24) * 255);
  }

  return 255;
}

function rowCounts(data, width, height, alphaThreshold = 20) {
  const counts = new Array(height).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > alphaThreshold) counts[y]++;
    }
  }
  return counts;
}

function findContentRows(counts, width, rowThreshold = 0.02) {
  const minCount = width * rowThreshold;
  const rows = [];
  for (let y = 0; y < counts.length; y++) {
    if (counts[y] > minCount) rows.push(y);
  }
  return rows;
}

function findSplitRow(counts, y0, y1, width) {
  const minCount = width * 0.02;
  const gaps = [];
  let inGap = false;
  let gapStart = 0;

  for (let y = y0; y <= y1; y++) {
    const empty = counts[y] <= minCount;
    if (empty && !inGap) {
      inGap = true;
      gapStart = y;
    } else if (!empty && inGap) {
      inGap = false;
      gaps.push({ start: gapStart, end: y - 1, size: y - gapStart });
    }
  }

  const gap = gaps.filter((g) => g.size > 5).sort((a, b) => b.size - a.size)[0];
  if (!gap) return Math.floor((y0 + y1) / 2);
  return Math.floor((gap.start + gap.end) / 2);
}

function bandStats(data, width, y0, y1, alphaThreshold = 20) {
  let minX = width;
  let maxX = 0;
  let sumX = 0;
  let count = 0;

  for (let y = y0; y <= y1; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] > alphaThreshold) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        sumX += x;
        count++;
      }
    }
  }

  if (!count) return null;

  return {
    minX,
    maxX,
    centerX: (minX + maxX) / 2,
    massCenterX: sumX / count,
  };
}


async function main() {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const bgAlpha = alphaForBackground(r, g, b);
    data[i + 3] = Math.min(data[i + 3], bgAlpha);
  }

  const counts = rowCounts(data, width, height);
  const contentRows = findContentRows(counts, width);
  const y0 = contentRows[0];
  const y1 = contentRows[contentRows.length - 1];
  const split = findSplitRow(counts, y0, y1, width);

  const topStats = bandStats(data, width, y0, split);
  const bottomStats = bandStats(data, width, split + 1, y1);

  if (!topStats || !bottomStats) {
    throw new Error('Could not detect logo text bands.');
  }

  const bottomShift = Math.round(topStats.massCenterX - bottomStats.massCenterX);
  const topHeight = split - y0 + 1;
  const bottomHeight = y1 - split;

  const topBand = Buffer.alloc(width * topHeight * 4);
  const bottomBand = Buffer.alloc(width * bottomHeight * 4);

  for (let y = y0; y <= split; y++) {
    data.copy(topBand, (y - y0) * width * 4, y * width * 4, (y + 1) * width * 4);
  }

  for (let y = split + 1; y <= y1; y++) {
    data.copy(bottomBand, (y - split - 1) * width * 4, y * width * 4, (y + 1) * width * 4);
  }

  const gap = 2;
  const canvasWidth = width + Math.abs(bottomShift) + 8;
  const canvasHeight = topHeight + gap + bottomHeight;
  const topLeft = Math.floor((canvasWidth - width) / 2);
  const bottomLeft = topLeft + bottomShift;

  const topPng = await sharp(topBand, {
    raw: { width, height: topHeight, channels: 4 },
  })
    .png()
    .toBuffer();

  const bottomPng = await sharp(bottomBand, {
    raw: { width, height: bottomHeight, channels: 4 },
  })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: topPng, left: topLeft, top: 0 },
      { input: bottomPng, left: bottomLeft, top: topHeight + gap },
    ])
    .trim({ threshold: 10 })
    .png({ compressionLevel: 9 })
    .toFile(output);

  console.log('Navbar logo saved:', output);
  console.log('Centered SWAYAMVAR under RUKMINI (shift:', bottomShift, 'px)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
