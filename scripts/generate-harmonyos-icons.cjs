const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, '../harmonyos/entry/src/main/resources/base/media/');

async function main() {
  fs.mkdirSync(out, { recursive: true });

  // Render SVG at high density to a transparent foreground
  const svg = fs.readFileSync(path.join(__dirname, '../public/icons/icon.svg'));
  const fg1024 = await sharp(svg, { density: 120 }).png().toBuffer();

  // startIcon_foreground.png : app glyph on transparent, 512x512 w/ margins (safety zone)
  await sharp(fg1024)
    .resize(320, 320, { fit: 'contain' })
    .extend({ top: 96, bottom: 96, left: 96, right: 96, background: '#00000000' })
    .png()
    .toFile(path.join(out, 'startIcon_foreground.png'));

  // startIcon_background.png : solid brand color
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 99, g: 102, b: 241, alpha: 1 }
    }
  }).png().toFile(path.join(out, 'startIcon_background.png'));

  // startIcon.png : full icon (brand background + glyph) for start window
  const bg = await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 99, g: 102, b: 241, alpha: 1 } }
  }).png().toBuffer();
  await sharp(bg)
    .composite([{ input: await sharp(fg1024).resize(300, 300, { fit: 'contain' }).png().toBuffer(), gravity: 'center' }])
    .png()
    .toFile(path.join(out, 'startIcon.png'));

  console.log('HarmonyOS media icons generated:', out);
}

main().catch((e) => { console.error(e); process.exit(1); });
