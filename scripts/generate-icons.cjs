const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = {
  // PWA
  'icon-192.png': 192,
  'icon-512.png': 512,
  'icon-maskable-192.png': 192,
  'icon-maskable-512.png': 512,
  // Android
  'android-mdpi.png': 48,
  'android-hdpi.png': 72,
  'android-xhdpi.png': 96,
  'android-xxhdpi.png': 144,
  'android-xxxhdpi.png': 192,
  'android-playstore.png': 512,
  // iOS
  'ios-icon-20.png': 20,
  'ios-icon-29.png': 29,
  'ios-icon-40.png': 40,
  'ios-icon-58.png': 58,
  'ios-icon-60.png': 60,
  'ios-icon-76.png': 76,
  'ios-icon-80.png': 80,
  'ios-icon-87.png': 87,
  'ios-icon-120.png': 120,
  'ios-icon-152.png': 152,
  'ios-icon-167.png': 167,
  'ios-icon-180.png': 180,
  'ios-icon-1024.png': 1024,
  // Favicon
  'favicon-16.png': 16,
  'favicon-32.png': 32,
  'favicon-48.png': 48,
  'apple-touch-icon.png': 180,
  // Electron
  'electron-icon.png': 256,
  'electron-icon.ico': 256,
};

const outDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Single source of truth: icon.svg
const svgPath = path.join(outDir, 'icon.svg');
if (!fs.existsSync(svgPath)) {
  console.error(`Source icon not found: ${svgPath}`);
  process.exit(1);
}
const svg = fs.readFileSync(svgPath);

async function generate() {
  for (const [name, size] of Object.entries(sizes)) {
    const isIco = name.endsWith('.ico');
    const outPath = path.join(outDir, name);

    // Rasterize icon.svg at high density then downscale for crisp results.
    const png = await sharp(svg, { density: 288 })
      .resize(size, size, { fit: 'cover' })
      .png()
      .toBuffer();

    if (isIco) {
      const ico = await svgToIco(svg, [16, 32, 48, 64, 128, 256]);
      fs.writeFileSync(outPath, ico);
    } else {
      fs.writeFileSync(outPath, png);
    }
    console.log(`Generated: ${name} (${size}x${size})`);
  }

  console.log('\nAll icons generated from icon.svg!');
}

// Build a multi-size .ico from the SVG source.
async function svgToIco(svg, sizeList) {
  const sizesToRun = sizeList.filter((s) => s >= 16);
  const PNGs = [];
  for (const s of sizesToRun) {
    PNGs.push(await sharp(svg, { density: 288 }).resize(s, s, { fit: 'cover' }).png().toBuffer());
  }

  const numImages = PNGs.length;
  let headerSize = 6 + numImages * 16;
  let totalSize = headerSize;
  const offsets = [];
  const sizes_arr = [];

  for (const png of PNGs) {
    offsets.push(totalSize);
    sizes_arr.push(png.length);
    totalSize += png.length;
  }

  const ico = Buffer.alloc(totalSize);
  ico.writeUInt16LE(0, 0);
  ico.writeUInt16LE(1, 2);
  ico.writeUInt16LE(numImages, 4);

  for (let i = 0; i < numImages; i++) {
    const offset = 6 + i * 16;
    const dim = sizesToRun[i];
    ico.writeUInt8(dim > 255 ? 0 : dim, offset);
    ico.writeUInt8(dim > 255 ? 0 : dim, offset + 1);
    ico.writeUInt8(0, offset + 2);
    ico.writeUInt8(0, offset + 3);
    ico.writeUInt16LE(1, offset + 4);
    ico.writeUInt16LE(32, offset + 6);
    ico.writeUInt32LE(sizes_arr[i], offset + 8);
    ico.writeUInt32LE(offsets[i], offset + 12);
  }

  PNGs.forEach((png, i) => {
    png.copy(ico, offsets[i]);
  });

  return ico;
}

generate().catch((e) => {
  console.error('Icon generation failed:', e);
  process.exit(1);
});
