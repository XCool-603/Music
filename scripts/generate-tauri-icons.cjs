const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ICONS_DIR = path.join(ROOT, 'src-tauri', 'icons');
if (!fs.existsSync(ICONS_DIR)) fs.mkdirSync(ICONS_DIR, { recursive: true });

// Single source of truth: the same icon.svg used by the PWA / generate-icons.cjs
const svgPath = path.join(ROOT, 'public', 'icons', 'icon.svg');
if (!fs.existsSync(svgPath)) {
  console.error(`Source icon not found: ${svgPath}`);
  process.exit(1);
}
const svg = fs.readFileSync(svgPath);

// Tauri required icon sizes
const tauriIcons = {
  '32x32.png': 32,
  '128x128.png': 128,
  '128x128@2x.png': 256,
  'icon.png': 512,
  // Square icons for various platforms
  'Square30x30Logo.png': 30,
  'Square44x44Logo.png': 44,
  'Square71x71Logo.png': 71,
  'Square89x89Logo.png': 89,
  'Square107x107Logo.png': 107,
  'Square142x142Logo.png': 142,
  'Square150x150Logo.png': 150,
  'Square284x284Logo.png': 284,
  'Square310x310Logo.png': 310,
  'StoreLogo.png': 50,
  // Linux
  '128x128@2x.png': 256,
};

async function rasterize(size) {
  return sharp(svg, { density: 288 }).resize(size, size, { fit: 'cover' }).png().toBuffer();
}

async function generate() {
  for (const [name, size] of Object.entries(tauriIcons)) {
    const png = await rasterize(size);
    fs.writeFileSync(path.join(ICONS_DIR, name), png);
    console.log(`Generated: ${name} (${size}x${size})`);
  }

  // Generate .ico for Windows (multi-size) from icon.svg
  const ico = await svgToIco([16, 32, 48, 64, 128, 256]);
  fs.writeFileSync(path.join(ICONS_DIR, 'icon.ico'), ico);
  console.log('Generated: icon.ico');

  // Generate icon.icns for macOS (PNG, Tauri converts) from icon.svg
  const icnsPng = await rasterize(1024);
  fs.writeFileSync(path.join(ICONS_DIR, 'icon.icns'), icnsPng);
  console.log('Generated: icon.icns (1024x1024 PNG, Tauri converts)');

  await generateAndroidLauncherIcons();

  console.log('\nAll Tauri icons generated from icon.svg!');
}

// Android launcher icons (regenerate the Tauri-generated mipmaps from icon.svg).
async function generateAndroidLauncherIcons() {
  const resDir = path.join(ROOT, 'src-tauri', 'gen', 'android', 'app', 'src', 'main', 'res');
  const densities = [
    { dir: 'mipmap-mdpi', size: 48 },
    { dir: 'mipmap-hdpi', size: 72 },
    { dir: 'mipmap-xhdpi', size: 96 },
    { dir: 'mipmap-xxhdpi', size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 },
  ];

  for (const { dir, size } of densities) {
    const dirPath = path.join(resDir, dir);
    fs.mkdirSync(dirPath, { recursive: true });

    // Legacy launcher icons: full brand image.
    const full = await rasterize(size);
    fs.writeFileSync(path.join(dirPath, 'ic_launcher.png'), full);
    fs.writeFileSync(path.join(dirPath, 'ic_launcher_round.png'), full);

    // Adaptive icon foreground: brand image scaled to the safe zone (66/108) centered.
    const safe = Math.round(size * (66 / 108));
    const foreground = await composeCentered(safe, size);
    fs.writeFileSync(path.join(dirPath, 'ic_launcher_foreground.png'), foreground);
    console.log(`Generated android ${dir}: ic_launcher / ic_launcher_round / ic_launcher_foreground`);
  }

  // Brand gradient background for the adaptive icon (matches the icon.svg background).
  const bgXml = `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
  <path android:pathData="M0,0h108v108h-108z">
    <aapt:attr xmlns:aapt="http://schemas.android.com/aapt" name="android:fillColor">
      <gradient android:type="linear" android:startX="0" android:startY="0" android:endX="108" android:endY="108">
        <item android:color="#6366f1" android:offset="0.0" />
        <item android:color="#34d399" android:offset="1.0" />
      </gradient>
    </aapt:attr>
  </path>
</vector>
`;
  fs.writeFileSync(path.join(resDir, 'drawable', 'ic_launcher_background.xml'), bgXml);

  // Adaptive icon definitions (API 26+).
  const anyDpi = path.join(resDir, 'mipmap-anydpi-v26');
  fs.mkdirSync(anyDpi, { recursive: true });
  const adapt = (name, title) =>
    `<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@drawable/ic_launcher_background" />
  <foreground android:drawable="@mipmap/ic_launcher_foreground" />
  <monochrome android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;
  fs.writeFileSync(path.join(anyDpi, 'ic_launcher.xml'), adapt());
  fs.writeFileSync(path.join(anyDpi, 'ic_launcher_round.xml'), adapt());
  console.log('Generated android adaptive icon (mipmap-anydpi-v26)');
}

// Compose the brand image scaled to `inner` px centered on a `size` px transparent canvas.
async function composeCentered(inner, size) {
  const scaled = await sharp(svg, { density: 288 }).resize(inner, inner, { fit: 'cover' }).png().toBuffer();
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const img = await require('canvas').loadImage(scaled);
  ctx.drawImage(img, (size - inner) / 2, (size - inner) / 2, inner, inner);
  return canvas.toBuffer('image/png');
}

// Build a multi-size .ico from the SVG source.
async function svgToIco(sizeList) {
  const sizesToRun = sizeList.filter((s) => s >= 16);
  const PNGs = [];
  for (const s of sizesToRun) {
    PNGs.push(await rasterize(s));
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
  console.error('Tauri icon generation failed:', e);
  process.exit(1);
});
