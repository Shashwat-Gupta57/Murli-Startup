const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'frontend', 'public', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

function generateIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Yellow background
  ctx.fillStyle = '#F8C200';
  ctx.fillRect(0, 0, size, size);

  // Rounded corners effect — draw a large rounded rect
  const r = size * 0.18;
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = '#F8C200';
  ctx.fill();

  // "M" letter in bold black
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${size * 0.52}px sans-serif`;
  ctx.fillText('M', size / 2, size / 2 + size * 0.02);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(iconsDir, filename), buffer);
  console.log(`Generated ${filename} (${size}x${size})`);
}

generateIcon(192, 'icon-192.png');
generateIcon(512, 'icon-512.png');
console.log('Done! Icons saved to frontend/public/icons/');
